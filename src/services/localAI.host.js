// Operaciones de la IA del móvil sobre WebLLM. Lo normal es que corran en el
// worker (localAI.worker.js), fuera de la pantalla; si el navegador no tiene
// WebGPU en workers, services/localAI.js las carga en la propia página.
import {
  MLCEngine,
  deleteModelAllInfoInCache,
  hasModelInCache,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";

// Dónde se guarda el modelo. Lo normal es la Cache API, pero hay navegadores
// que no admiten en ella archivos tan grandes (el primer trozo del modelo
// natural pesa 242 MB); entonces se usa OPFS, el sistema de archivos privado de
// la web, que no tiene ese límite. (IndexedDB tampoco sirve: en Chromium no
// admite valores de más de 127 MB.)
const BACKENDS = ["cache", "opfs"];
const appConfig = (cacheBackend) => ({ ...prebuiltAppConfig, cacheBackend });
const hasOPFS = () => typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
const isStorageWriteError = (err) =>
  /on 'Cache'|unexpected internal error|too large/i.test(`${err?.name || ""} ${err?.message || ""}`);

// Texto de progreso del calentamiento (services/localAI.js lo reconoce; no lo
// importa para no meter la librería en la página).
const WARMUP = "warmup";

// Almacén donde el modelo está descargado entero, o null.
async function storedIn(id) {
  for (const backend of BACKENDS) {
    if (backend === "opfs" && !hasOPFS()) continue;
    if (await hasModelInCache(id, appConfig(backend)).catch(() => false)) return backend;
  }
  return null;
}

export function createHost() {
  let engine = null;

  return {
    // { [modelId]: true si está descargado entero }
    async cached(ids) {
      const out = {};
      for (const id of ids) out[id] = !!(await storedIn(id));
      return out;
    },

    async remove(id) {
      for (const backend of BACKENDS) {
        if (backend === "opfs" && !hasOPFS()) continue;
        await deleteModelAllInfoInCache(id, appConfig(backend)).catch(() => {});
      }
    },

    // Descarga (si hace falta) y prepara el modelo. onProgress({ text, progress })
    // y, si hay que pasar a OPFS, onProgress({ backend: "opfs" }) para que la
    // página lo recuerde (preferred) y no vuelva a probar la Cache API.
    async load(id, onProgress, preferred = "cache") {
      engine ||= new MLCEngine();
      engine.setInitProgressCallback((r) => onProgress({ text: r.text, progress: r.progress }));
      const stored = await storedIn(id);
      const backend = stored || (preferred === "opfs" && hasOPFS() ? "opfs" : "cache");
      engine.setAppConfig(appConfig(backend));
      try {
        await engine.reload(id);
      } catch (err) {
        if (stored || backend !== "cache" || !hasOPFS() || !isStorageWriteError(err)) throw err;
        // Lo bajado a medias en la Cache API se libera y se sigue en OPFS.
        onProgress({ backend: "opfs", text: "", progress: 0 });
        await deleteModelAllInfoInCache(id, appConfig("cache")).catch(() => {});
        engine.setAppConfig(appConfig("opfs"));
        await engine.reload(id);
      }
      // La primera generación tras cargar compila los programas de la GPU
      // (medio minuto en un portátil, aunque sea una palabra). Se hace aquí,
      // dentro de "Preparando", para que no la espere la primera respuesta.
      // Unos pocos tokens: el primero compila la lectura del mensaje y los
      // siguientes, la escritura.
      onProgress({ text: WARMUP, progress: 1 });
      await engine.chat.completions.create({ messages: [{ role: "user", content: "hola" }], max_tokens: 4 });
    },

    // Petición tipo OpenAI. Con stream, onDelta recibe cada trozo de texto.
    async chat(request, onDelta) {
      if (!engine) throw new Error("No hay ningún modelo cargado");
      if (!request.stream) {
        const res = await engine.chat.completions.create(request);
        const choice = res.choices?.[0];
        return { content: choice?.message?.content || "", finish: choice?.finish_reason || null };
      }
      const stream = await engine.chat.completions.create(request);
      let content = "";
      let finish = null;
      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        const delta = choice?.delta?.content || "";
        if (delta) {
          content += delta;
          onDelta(delta);
        }
        if (choice?.finish_reason) finish = choice.finish_reason;
      }
      return { content, finish };
    },

    interrupt() {
      engine?.interruptGenerate();
    },

    async unload() {
      const old = engine;
      engine = null;
      await old?.unload();
    },
  };
}
