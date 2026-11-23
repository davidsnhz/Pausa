// IA del móvil (en pruebas): un modelo abierto que se descarga una vez y
// genera las respuestas del acompañante dentro del dispositivo, con WebLLM y
// WebGPU. Los mensajes no salen del móvil.
//
// - La librería (varios MB) corre en un worker (localAI.worker.js): la
//   pantalla nunca la carga, así que no da tirones. Solo si el navegador no
//   tiene WebGPU en workers se carga en la página (localAI.host.js).
// - Solo se carga sola si ya está descargada entera: nunca se pone a
//   descargar 1 GB sin que la persona lo pida.
// - Si la app se cierra mientras prepara el modelo (lo normal cuando el móvil
//   se queda sin memoria), no se vuelve a intentar sola: se avisa en Perfil →
//   IA en este móvil para que se pruebe el modelo ligero.
// - Si algo falla, devuelve null y el chat responde como siempre.
import { useSyncExternalStore } from "react";
import {
  MAX_SENTENCES,
  buildChatMessages,
  buildSummaryMessages,
  cleanReply,
  cleanSummary,
  dropRepeats,
  hasSentences,
  saidSentences,
} from "../utils/aiText";

export const LOCAL_MODELS = {
  natural: {
    name: "Natural",
    model: "Qwen 3.5 · 2B",
    license: "Apache 2.0",
    blurb: "Respuestas más naturales. Para móviles recientes.",
    size: "1 GB",
    ids: { f16: "Qwen3.5-2B-q4f16_1-MLC", f32: "Qwen3.5-2B-q4f32_1-MLC" },
    noThinking: true, // Qwen razona antes de responder si no se le dice lo contrario
  },
  ligera: {
    name: "Ligera",
    model: "Llama 3.2 · 1B",
    license: "Built with Llama",
    blurb: "Más rápida y ocupa menos. Para móviles con menos memoria.",
    size: "700 MB",
    ids: { f16: "Llama-3.2-1B-Instruct-q4f16_1-MLC", f32: "Llama-3.2-1B-Instruct-q4f32_1-MLC" },
  },
};

const SETTINGS_KEY = "pausa-ia-local";
const PREPARING_KEY = "pausa-ia-local-preparando";
// Dónde guarda el modelo este navegador ("opfs" si la Cache API no pudo).
const STORAGE_KEY = "pausa-ia-local-almacen";
const REPLY_TIMEOUT_MS = 90_000; // tope para una respuesta
const PREPARE_WAIT_MS = 60_000; // lo que espera una respuesta a que el modelo se prepare
const PROBE_TIMEOUT_MS = 20_000; // arrancar el worker (lee la librería)

// ---------------------------------------------------------------------------
// Estado (lo leen Perfil, la pantalla de la IA y el chat)

let state = {
  settings: { enabled: false, model: "natural" },
  support: null, // null = sin comprobar; { ok, f16 } o { ok: false }
  status: "off", // off | loading | ready | error
  phase: null, // "download" | "prepare" mientras carga
  progress: 0, // 0..1 de la fase actual
  error: null, // texto para la persona
  crashed: null, // modelo con el que la app se cerró al prepararlo
  cached: {}, // { natural: true, ligera: false } (sin clave = sin comprobar)
};
let initialized = false;
const listeners = new Set();

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: la preferencia dura lo que la sesión */
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  let settings = state.settings;
  try {
    const saved = JSON.parse(readStorage(SETTINGS_KEY) || "null");
    if (saved && LOCAL_MODELS[saved.model]) settings = { enabled: !!saved.enabled, model: saved.model };
  } catch {
    /* preferencia corrupta: valores por defecto */
  }
  const crashed = readStorage(PREPARING_KEY);
  writeStorage(PREPARING_KEY, null);
  state = { ...state, settings, crashed: LOCAL_MODELS[crashed] ? crashed : null };
}

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureInit();
  return state;
}

export function useLocalAI() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function saveSettings(settings) {
  writeStorage(SETTINGS_KEY, JSON.stringify(settings));
  set({ settings });
}

// ---------------------------------------------------------------------------
// Utilidades

function withTimeout(promise, ms, onTimeout) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        onTimeout?.();
        reject(new Error("timeout"));
      }, ms);
    }),
  ]);
}

// Las peticiones al modelo van de una en una.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

// ---------------------------------------------------------------------------
// Compatibilidad

let supportPromise = null;
export function checkSupport() {
  ensureInit();
  supportPromise ||= (async () => {
    let support = { ok: false };
    try {
      const adapter = await navigator.gpu?.requestAdapter();
      if (adapter && "caches" in window) support = { ok: true, f16: adapter.features.has("shader-f16") };
    } catch {
      /* sin WebGPU */
    }
    set({ support });
    return support;
  })();
  return supportPromise;
}

const modelId = (key) => LOCAL_MODELS[key].ids[state.support?.f16 ? "f16" : "f32"];

// ---------------------------------------------------------------------------
// Host: el worker (lo normal) o la propia página

// Cliente del worker: cada llamada lleva un id y espera su { done }.
function workerHost(w) {
  let seq = 0;
  const pending = new Map();
  const failAll = (err) => {
    for (const p of pending.values()) p.reject(err);
    pending.clear();
  };
  w.onmessage = ({ data }) => {
    const p = pending.get(data?.id);
    if (!p) return;
    if (data.progress) p.onProgress?.(data.progress);
    else if (data.delta) p.onDelta?.(data.delta);
    else if (data.done) {
      pending.delete(data.id);
      if (data.error) p.reject(Object.assign(new Error(data.error.message), { name: data.error.name }));
      else p.resolve(data.result);
    }
  };
  w.onerror = (e) => {
    e.preventDefault?.();
    failAll(new Error(e.message || "El worker de la IA falló"));
  };
  const call = (op, args, handlers) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, ...handlers });
      w.postMessage({ id, op, args });
    });
  return {
    probe: () => call("probe"),
    cached: (ids) => call("cached", { ids }),
    remove: (id) => call("remove", { id }),
    load: (id, onProgress, backend) => call("load", { id, backend }, { onProgress }),
    chat: (request, onDelta) => call("chat", { request }, { onDelta }),
    interrupt: () => call("interrupt").catch(() => {}),
    // Cerrar el worker libera de golpe toda la memoria del modelo.
    release: async () => {
      w.terminate();
      failAll(new Error("cancelado"));
    },
  };
}

let hostPromise = null;
function getHost() {
  hostPromise ||= (async () => {
    try {
      const w = new Worker(new URL("./localAI.worker.js", import.meta.url), { type: "module" });
      const host = workerHost(w);
      if (await withTimeout(host.probe(), PROBE_TIMEOUT_MS).catch(() => false)) return host;
      host.release();
    } catch {
      /* sin workers de módulo */
    }
    const { createHost } = await import("./localAI.host");
    const host = createHost();
    return {
      ...host,
      interrupt: async () => host.interrupt(),
      release: () => withTimeout(host.unload(), 3000).catch(() => {}),
    };
  })();
  return hostPromise;
}

async function releaseHost() {
  const pending = hostPromise;
  hostPromise = null;
  if (!pending) return;
  try {
    const host = await withTimeout(pending, 3000);
    await host.release();
  } catch {
    /* ya no estaba */
  }
}

// Al salir de la pantalla de la IA sin activarla: el worker no se queda abierto.
export function releaseIfIdle() {
  if (!loadedKey && !loadingKey) releaseHost();
}

// Comprueba qué modelos están descargados enteros.
export async function refreshCached() {
  const support = await checkSupport();
  if (!support.ok) return state.cached;
  const host = await getHost();
  const keys = Object.keys(LOCAL_MODELS);
  const byId = await host.cached(keys.map(modelId));
  const cached = Object.fromEntries(keys.map((k) => [k, !!byId[modelId(k)]]));
  set({ cached });
  return cached;
}

// ---------------------------------------------------------------------------
// Cargar y liberar el modelo

let loadedKey = null; // modelo listo para responder
let loadingKey = null;
let loadPromise = null;
let attempt = 0; // para ignorar una carga cancelada que termine después

function describeError(err, key) {
  const text = `${err?.name || ""} ${err?.message || ""}`;
  if (/quota|storage/i.test(text)) return "No hay espacio suficiente en el móvil para el modelo.";
  if (/device.*lost|memory|out of/i.test(text))
    return key === "ligera"
      ? "Tu móvil se ha quedado sin memoria preparando el modelo. Cierra otras apps y prueba otra vez."
      : "Tu móvil se ha quedado sin memoria preparando el modelo. Prueba con el ligero.";
  if (/network|fetch|load failed|offline/i.test(text))
    return "Se cortó la conexión durante la descarga. Lo ya descargado se guarda: puedes continuar.";
  return "No se pudo preparar la IA en este móvil.";
}

async function unloadModel() {
  attempt++;
  loadedKey = null;
  loadingKey = null;
  loadPromise = null;
  writeStorage(PREPARING_KEY, null);
  await releaseHost();
}

function load(key) {
  if (loadedKey === key) return Promise.resolve();
  if (loadPromise && loadingKey === key) return loadPromise;

  const mine = ++attempt;
  const current = () => mine === attempt;
  const stopIfCancelled = () => {
    if (!current()) throw new Error("cancelado");
  };
  loadedKey = null;
  loadingKey = key;
  const downloaded = !!state.cached[key];
  set({ status: "loading", phase: downloaded ? "prepare" : "download", progress: 0, error: null });

  loadPromise = (async () => {
    const support = await checkSupport();
    if (!support.ok) throw new Error("WebGPU no disponible");
    try {
      await navigator.storage?.persist?.(); // que el navegador no lo borre por falta de espacio
    } catch {
      /* opcional */
    }
    stopIfCancelled();
    const host = await getHost();
    stopIfCancelled();
    const preferred = readStorage(STORAGE_KEY) || "cache";
    await host.load(modelId(key), (report) => {
      // Aviso de cambio de almacén: solo se recuerda; la descarga sigue igual.
      if (report.backend) return writeStorage(STORAGE_KEY, report.backend);
      if (!current()) return;
      // "Start to fetch params" abre tanto una descarga como una carga desde
      // lo ya descargado; "Fetching param cache" es descarga; el resto, preparar.
      const text = report.text || "";
      const phase = /^fetching/i.test(text)
        ? "download"
        : /^start to fetch/i.test(text)
          ? downloaded
            ? "prepare"
            : "download"
          : "prepare";
      // Marca de "preparando": si la app se cierra ahora, suele ser por memoria.
      if (phase === "prepare" && state.phase !== "prepare") writeStorage(PREPARING_KEY, key);
      // Preparar llega al 90 %; el calentamiento (ver localAI.host.js) es el resto.
      const progress = Math.max(0, Math.min(1, report.progress || 0));
      set({ phase, progress: text === "warmup" ? 0.95 : phase === "prepare" ? progress * 0.9 : progress });
    }, preferred);
    stopIfCancelled();
    writeStorage(PREPARING_KEY, null);
    loadedKey = key;
    loadingKey = null;
    loadPromise = null;
    set({
      status: "ready",
      phase: null,
      progress: 1,
      crashed: state.crashed === key ? null : state.crashed,
      cached: { ...state.cached, [key]: true },
    });
  })().catch((err) => {
    if (current()) {
      writeStorage(PREPARING_KEY, null);
      loadingKey = null;
      loadPromise = null;
      releaseHost(); // un motor que falló no se reutiliza
      set({ status: "error", phase: null, error: describeError(err, key) });
      console.warn("[Pausa] IA del móvil no disponible:", err);
    }
    throw err;
  });
  return loadPromise;
}

// ---------------------------------------------------------------------------
// Acciones de la pantalla "IA en este móvil"

// Descarga (si hace falta) y activa un modelo.
export async function activate(key) {
  ensureInit();
  saveSettings({ enabled: true, model: key });
  if (state.crashed === key) set({ crashed: null });
  try {
    await load(key);
  } catch {
    /* el estado ya cuenta el error */
  }
}

// Desactiva la IA (y cancela una descarga o preparación en curso).
export async function disable() {
  ensureInit();
  saveSettings({ ...state.settings, enabled: false });
  set({ status: "off", phase: null, progress: 0, error: null });
  await unloadModel();
  refreshCached().catch(() => {});
}

// Borra un modelo descargado (y lo desactiva si era el que se usaba).
export async function removeModel(key) {
  await checkSupport(); // el nombre exacto del modelo depende del móvil
  if (loadedKey === key || loadingKey === key) await unloadModel();
  if (state.settings.model === key && state.settings.enabled) {
    saveSettings({ ...state.settings, enabled: false });
    set({ status: "off", phase: null, progress: 0, error: null });
  }
  const host = await getHost();
  await host.remove(modelId(key));
  await refreshCached();
}

// ---------------------------------------------------------------------------
// Uso desde el chat

// true si el modelo elegido está listo para responder; espera un poco si se
// está preparando, pero nunca a una descarga (pueden ser minutos).
async function readyForChat() {
  ensureInit();
  const { enabled, model } = state.settings;
  if (!enabled || state.crashed === model) return false;
  if (loadedKey === model) return true;
  if (state.status === "error") return false;
  try {
    if (!(loadPromise && loadingKey === model)) {
      const cached = await refreshCached();
      if (!cached[model]) return false;
    } else if (!state.cached[model]) {
      return false;
    }
    await withTimeout(load(model), PREPARE_WAIT_MS);
    return loadedKey === model;
  } catch {
    return false;
  }
}

// Al abrir el chat: prepara el modelo mientras la persona escribe.
export function warmUp() {
  readyForChat().catch(() => {});
}

const extraFor = (key) => (LOCAL_MODELS[key]?.noThinking ? { extra_body: { enable_thinking: false } } : {});

/**
 * Respuesta del acompañante generada en el móvil, o null si no se puede.
 * @param {{role: "user"|"ai", text: string}[]} history
 * @param {(text: string) => void} [onPartial] texto según se va escribiendo
 */
export async function localReply(history, onPartial) {
  if (!(await readyForChat())) return null;
  const key = loadedKey;
  try {
    const host = await getHost();
    // La respuesta no espera al resumen del mensaje anterior: se corta y se
    // descarta (el chat pide otro, más completo, después de esta respuesta).
    summaryTicket++;
    if (summaryRunning) host.interrupt();
    const said = saidSentences(history);
    let raw = "";
    let stopped = false;
    const res = await enqueue(() =>
      withTimeout(
        host.chat(
          {
            messages: buildChatMessages(history),
            stream: true,
            // Temperatura baja: con más, el modelo pequeño elige palabras
            // raras y se inventa frases sin sentido. Sin penalizar la
            // frecuencia: en español castiga "que", "de", "la"…; una
            // penalización suave de repetición basta.
            temperature: 0.3,
            top_p: 0.9,
            repetition_penalty: 1.05,
            max_tokens: 160,
            ...extraFor(key),
          },
          (delta) => {
            raw += delta;
            const clean = cleanReply(raw, { partial: true });
            const visible = dropRepeats(clean, said, { partial: true });
            if (visible) onPartial?.(visible);
            // Con las frases que caben ya escritas, no sigue generando.
            if (!stopped && hasSentences(clean, MAX_SENTENCES)) {
              stopped = true;
              host.interrupt();
            }
          }
        ),
        REPLY_TIMEOUT_MS,
        () => host.interrupt()
      )
    );
    // Si todo era repetido, null: el chat contesta como siempre.
    return dropRepeats(cleanReply(res.content, { truncated: res.finish !== "stop" }), said) || null;
  } catch (err) {
    console.warn("[Pausa] La IA del móvil no pudo responder:", err);
    if (/device.*lost/i.test(`${err?.name} ${err?.message}`)) {
      await unloadModel();
      set({ status: "error", phase: null, error: describeError(err, key) });
    }
    return null;
  }
}

let summaryTicket = 0;
let summaryRunning = false;

/**
 * Resumen del día generado en el móvil. null = no disponible (usar el de
 * siempre); "" = había otro más reciente en cola (no guardar nada).
 */
export async function localSummary(history) {
  ensureInit();
  if (!state.settings.enabled || loadedKey !== state.settings.model) return null;
  const key = loadedKey;
  const messages = buildSummaryMessages(history);
  if (!messages) return null;
  const ticket = ++summaryTicket;
  try {
    const host = await getHost();
    return await enqueue(async () => {
      if (ticket !== summaryTicket) return "";
      summaryRunning = true;
      try {
        const res = await withTimeout(
          host.chat({ messages, temperature: 0.3, max_tokens: 60, ...extraFor(key) }),
          REPLY_TIMEOUT_MS,
          () => host.interrupt()
        );
        if (ticket !== summaryTicket) return ""; // lo cortó una respuesta
        // Si no siguió el formato (a veces escribe en primera persona), el de siempre.
        const summary = cleanSummary(res.content);
        return /^hoy\b/i.test(summary) ? summary : null;
      } finally {
        summaryRunning = false;
      }
    });
  } catch {
    return null;
  }
}
