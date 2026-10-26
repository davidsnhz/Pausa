// services/theme.js
// ----------------------------------------------------------------------------
// Tema claro/oscuro. Sin elección guardada, sigue al del sistema (y sus
// cambios); el toggle de Perfil guarda la elección en localStorage.
// Además de la clase `dark` en <html>, sincroniza el theme-color (barra del
// navegador / PWA) y la StatusBar nativa para que no choquen con la app.
// ----------------------------------------------------------------------------
import { syncStatusBar } from "./native";

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#000000" : "#ffffff");
  syncStatusBar(dark);
}

// Se llama una vez al arrancar, ANTES de pintar (evita parpadeo claro/oscuro).
export function initTheme() {
  const saved = localStorage.getItem("theme");
  applyTheme(saved ? saved === "dark" : systemDark.matches);
  systemDark.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) applyTheme(e.matches);
  });
}

// Elección explícita del usuario (toggle de Perfil).
export function setTheme(dark) {
  localStorage.setItem("theme", dark ? "dark" : "light");
  applyTheme(dark);
}
