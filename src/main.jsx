import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { initTheme } from "./services/theme";

// Tipografías servidas por la propia app (no Google Fonts): funcionan sin
// conexión y el Service Worker las cachea, así que no cambian de golpe al abrir.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./index.css";

// Aplica el tema (guardado o del sistema) ANTES de pintar, para evitar parpadeo.
initTheme();

// Si la app llevaba abierta desde antes de un deploy, los trozos de pantallas
// de la versión anterior ya no existen: se recarga una vez para coger la nueva
// en vez de mostrar la pantalla de error.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "pausa-reload-after-deploy";
  if (sessionStorage.getItem(KEY)) return; // ya se intentó: que actúe el ErrorBoundary
  sessionStorage.setItem(KEY, "1");
  event.preventDefault();
  window.location.reload();
});
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("pausa-reload-after-deploy"), 10000));

// Registra el Service Worker (PWA) solo en producción; en dev estorbaría al HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* si falla el registro, la app sigue funcionando como web normal */
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
