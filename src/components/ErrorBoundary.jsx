// components/ErrorBoundary.jsx
// ----------------------------------------------------------------------------
// Red de seguridad: si una pantalla lanza un error en render, en lugar de
// dejar la app en blanco (WKWebView no muestra nada), enseñamos un mensaje
// cuidado con opción de reintentar. Se re-monta al cambiar de ruta (key en App).
// ----------------------------------------------------------------------------
import { Component } from "react";
import Mascot from "./Mascot";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[Pausa] Error en pantalla:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="pt-safe pb-safe flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center">
          <Mascot state="sleeping" size={84} />
          <div>
            <h1 className="font-display mb-2 text-2xl font-bold tracking-[-0.5px]">
              Algo se ha pausado
            </h1>
            <p className="text-[15px] leading-relaxed text-neutral-400">
              Ha ocurrido un pequeño error. Respira hondo y volvemos a intentarlo.
            </p>
          </div>
          <button
            onClick={() => window.location.assign("/")}
            className="rounded-2xl bg-black px-6 py-3.5 text-[15px] font-bold text-white dark:bg-white dark:text-black"
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
