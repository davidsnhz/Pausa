// IA en este móvil (en pruebas), desde Perfil: elegir modelo, descargarlo y
// activarlo, ver el progreso, desactivarla y borrar lo descargado.
// La lógica está en services/localAI.js; esta pantalla solo la muestra.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CircleCheck, Lock, TriangleAlert } from "lucide-react";

import {
  LOCAL_MODELS,
  activate,
  disable,
  refreshCached,
  releaseIfIdle,
  removeModel,
  useLocalAI,
} from "../services/localAI";
import { useGoBack } from "../hooks/useGoBack";
import Modal from "../components/Modal";
import Page from "../components/Page";

const primary =
  "w-full rounded-2xl bg-black py-3.5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black";
const secondary =
  "w-full rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-neutral-900";

export default function LocalAI() {
  const ai = useLocalAI();
  const goBack = useGoBack("/profile");
  const navigate = useNavigate();
  const { settings, status, phase, progress, support, cached, crashed, error } = ai;

  const [selected, setSelected] = useState(settings.model);
  // Modal de borrar: el modelo se conserva al cerrar para que el texto no
  // cambie durante la animación de salida.
  const [showRemove, setShowRemove] = useState(false);
  const [removing, setRemoving] = useState("natural");
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  // Qué está descargado (y si el móvil puede usar la IA).
  useEffect(() => {
    refreshCached().catch(() => {});
    return releaseIfIdle;
  }, []);

  const loading = status === "loading";
  const active = settings.enabled && settings.model === selected;
  const pct = Math.floor(progress * 100);
  const model = LOCAL_MODELS[selected];
  const downloaded = Object.keys(LOCAL_MODELS).filter((k) => cached[k]);

  async function confirmRemove() {
    setRemoveBusy(true);
    setRemoveError("");
    try {
      await removeModel(removing);
      setShowRemove(false);
    } catch {
      setRemoveError("No se pudo borrar. Inténtalo de nuevo.");
    } finally {
      setRemoveBusy(false);
    }
  }

  // Zona de acción según el estado del modelo elegido.
  function renderAction() {
    if (!support) {
      return <p className="text-sm text-neutral-400">Comprobando si tu móvil puede usarla…</p>;
    }
    if (!support.ok) {
      return (
        <Notice Icon={TriangleAlert}>
          Este navegador no puede ejecutar la IA en el móvil: necesita WebGPU. En iPhone hace
          falta iOS 26 o posterior; en Android, Chrome actualizado. El acompañante seguirá
          respondiendo como hasta ahora.
        </Notice>
      );
    }
    if (active && loading) {
      const downloading = phase === "download";
      return (
        <>
          <div className="mb-2 flex items-baseline justify-between text-sm font-semibold">
            <span>{downloading ? "Descargando…" : "Preparando el modelo…"}</span>
            {/* tabular-nums: el porcentaje no baila al cambiar de cifra */}
            <span className="tabular-nums text-neutral-400">{pct} %</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-black transition-[width] duration-300 dark:bg-white"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {downloading
              ? "Puedes seguir usando Pausa mientras tanto. Si cierras la app, lo ya descargado se guarda."
              : "Tarda unos segundos cada vez que abres la app."}
          </p>
          <button onClick={disable} className={secondary}>
            Cancelar
          </button>
        </>
      );
    }
    if (active && status === "error") {
      return (
        <>
          <p className="mb-4 text-sm text-red-500">{error}</p>
          <div className="flex gap-3">
            <button onClick={disable} className={secondary}>
              Desactivar
            </button>
            <button onClick={() => activate(selected)} className={primary}>
              {cached[selected] ? "Reintentar" : "Continuar"}
            </button>
          </div>
        </>
      );
    }
    if (active && crashed === selected) {
      return (
        <>
          <Notice Icon={TriangleAlert}>
            {crashText(selected)}
          </Notice>
          <div className="mt-4 flex gap-3">
            <button onClick={disable} className={secondary}>
              Desactivar
            </button>
            <button onClick={() => activate(selected)} className={primary}>
              Probar otra vez
            </button>
          </div>
        </>
      );
    }
    if (active && (status === "ready" || cached[selected])) {
      return (
        <>
          <Notice Icon={CircleCheck}>
            {status === "ready"
              ? "Activada. Pruébala en el chat de hoy."
              : "Activada. Se prepara al abrir el chat."}
          </Notice>
          <div className="mt-4 flex gap-3">
            <button onClick={disable} className={secondary}>
              Desactivar
            </button>
            <button onClick={() => navigate("/chat")} className={primary}>
              Ir al chat
            </button>
          </div>
        </>
      );
    }
    if (active && cached[selected] === false) {
      return (
        <>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            La descarga no llegó a terminar. Lo ya descargado se ha guardado.
          </p>
          <div className="flex gap-3">
            <button onClick={disable} className={secondary}>
              Desactivar
            </button>
            <button onClick={() => activate(selected)} className={primary}>
              Continuar
            </button>
          </div>
        </>
      );
    }
    if (active) {
      return <p className="text-sm text-neutral-400">Comprobando lo descargado…</p>;
    }

    // Sin activar (o con el otro modelo activado).
    const switching = settings.enabled;
    const label = cached[selected]
      ? switching
        ? "Usar este modelo"
        : "Activar"
      : `${switching ? "Descargar y usar" : "Descargar y activar"} · ${model.size}`;
    return (
      <>
        {crashed === selected && (
          <div className="mb-4">
            <Notice Icon={TriangleAlert}>
              {crashText(selected)}
            </Notice>
          </div>
        )}
        <button onClick={() => activate(selected)} className={primary}>
          {label}
        </button>
        {!cached[selected] && (
          <p className="mt-3 text-center text-xs text-neutral-400">
            Se descarga una sola vez. Mejor con wifi.
          </p>
        )}
      </>
    );
  }

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex-1 overflow-y-auto px-5">
        <header className="mb-6 flex items-center gap-4">
          <button onClick={goBack} aria-label="Volver">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[22px] font-bold tracking-[-0.5px]">IA en este móvil</h1>
        </header>

        <span className="mb-3 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          En pruebas
        </span>
        <p className="mb-4 text-[15px] leading-relaxed">
          Con la IA activada, el acompañante lee lo que escribes y te contesta con sus propias
          palabras, en lugar de con respuestas preparadas.
        </p>
        <div className="mb-7">
          <Notice Icon={Lock}>
            Funciona dentro de tu móvil: tus mensajes no se envían a ningún servidor de IA.
          </Notice>
        </div>

        <p className="mb-3 text-sm font-semibold text-neutral-400">Modelo</p>
        <div className="mb-6 flex flex-col gap-3">
          {Object.entries(LOCAL_MODELS).map(([key, m]) => {
            const inUse = settings.enabled && settings.model === key && status === "ready";
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                disabled={loading}
                aria-pressed={isSelected}
                className={`rounded-2xl bg-neutral-100 p-4 text-left ring-2 transition-[box-shadow,opacity] dark:bg-neutral-900 ${
                  isSelected ? "ring-black dark:ring-white" : "ring-transparent"
                } ${loading && !isSelected ? "opacity-50" : ""}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-bold">{m.name}</span>
                  <span
                    className={`shrink-0 text-sm ${inUse ? "font-semibold text-green-500" : "text-neutral-400"}`}
                  >
                    {inUse ? "En uso" : cached[key] ? "Descargado" : m.size}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                  {m.blurb}
                </span>
                <span className="mt-2 block text-xs text-neutral-400">
                  {m.model} · {m.license}
                </span>
              </button>
            );
          })}
        </div>

        {renderAction()}

        {downloaded.length > 0 && (
          <>
            <p className="mb-3 mt-8 text-sm font-semibold text-neutral-400">Guardado en este móvil</p>
            <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
              {downloaded.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 last:border-b-0 dark:border-neutral-800"
                >
                  <span className="text-[15px] font-medium">
                    {LOCAL_MODELS[key].name}
                    <span className="text-neutral-400"> · {LOCAL_MODELS[key].size}</span>
                  </span>
                  <button
                    onClick={() => {
                      setRemoveError("");
                      setRemoving(key);
                      setShowRemove(true);
                    }}
                    disabled={loading}
                    className="text-sm font-semibold text-red-500 disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-6 text-xs leading-relaxed text-neutral-400">
          Si en algún momento la IA no puede responder, el acompañante contesta como siempre. Los
          mensajes que hablan de hacerse daño reciben siempre la respuesta con el 024 y el 112.
          Las respuestas son automáticas y pueden equivocarse.
        </p>
      </div>

      {/* Modal: borrar un modelo descargado */}
      <Modal open={showRemove} onClose={() => !removeBusy && setShowRemove(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px]">
          ¿Borrar el modelo {LOCAL_MODELS[removing].name.toLowerCase()}?
        </h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Liberarás unos {LOCAL_MODELS[removing].size}. Si lo estabas usando, la IA se desactiva.
          Puedes volver a descargarlo cuando quieras.
        </p>
        {removeError && <p className="mb-3 text-sm text-red-500">{removeError}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setShowRemove(false)}
            disabled={removeBusy}
            className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold disabled:opacity-50 dark:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={confirmRemove}
            disabled={removeBusy}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {removeBusy ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </Modal>
    </Page>
  );
}

// Aviso tras cerrarse la app preparando un modelo (casi siempre, por memoria).
function crashText(key) {
  return (
    "La última vez la app se cerró mientras preparaba este modelo. Suele pasar cuando el " +
    "móvil se queda sin memoria: " +
    (key === "ligera"
      ? "cierra otras apps y prueba otra vez."
      : "puedes probar otra vez o elegir el ligero.")
  );
}

function Notice({ Icon, children }) {
  return (
    <p className="flex gap-2.5 rounded-2xl bg-neutral-100 px-4 py-3.5 text-sm leading-relaxed dark:bg-neutral-900">
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
