import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createRequire } from "module";

// Los plugins de Capacitor se cargan con dynamic import en services/native.js
// (envueltos en try/catch para funcionar como web pura). Mientras NO estén
// instalados (Fase iOS pendiente), este plugin los sustituye por un módulo
// vacío para que dev y build no fallen al resolverlos. Una vez instalados
// (`npm i @capacitor/core ...`), el plugin se desactiva solo y se empaquetan
// con normalidad.
const require = createRequire(import.meta.url);
function capacitorInstalled() {
  try {
    require.resolve("@capacitor/core");
    return true;
  } catch {
    return false;
  }
}

function capacitorStubWhenAbsent() {
  const installed = capacitorInstalled();
  const STUB_ID = "\0pausa:capacitor-stub";
  return {
    name: "pausa-capacitor-stub-when-absent",
    enforce: "pre",
    resolveId(id) {
      if (!installed && id.startsWith("@capacitor/")) return STUB_ID;
      return null;
    },
    load(id) {
      if (id === STUB_ID) {
        // Exports vacíos: native.js cae siempre en su catch (comportamiento web).
        return [
          "export const Capacitor = { isNativePlatform: () => false };",
          "export const StatusBar = {};",
          "export const Style = {};",
          "export const SplashScreen = {};",
          "export const Keyboard = {};",
          "export default {};",
        ].join("\n");
      }
      return null;
    },
  };
}

// Firestore (v12+) incluye re2js (~60 KB comprimidos) solo para evaluar en el
// cliente las consultas "pipeline" con LIKE / regex, que Pausa no usa. Se
// sustituye por un módulo que lanza error: Firestore lo captura y esa función
// devolvería "error". Si algún día se usan pipelines con regex, quitar esto.
function re2jsStub() {
  const STUB_ID = "\0pausa:re2js-stub";
  return {
    name: "pausa-re2js-stub",
    enforce: "pre",
    resolveId(id) {
      return id === "re2js" ? STUB_ID : null;
    },
    load(id) {
      if (id !== STUB_ID) return null;
      return 'export const RE2JS = { compile() { throw new Error("re2js no incluido en Pausa"); } };';
    },
  };
}

export default defineConfig({
  plugins: [capacitorStubWhenAbsent(), re2jsStub(), react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rolldownOptions: {
      output: {
        // Separa las librerías grandes en trozos propios: se cachean aparte y
        // no se vuelven a descargar en cada despliegue si no cambian.
        codeSplitting: {
          groups: [
            { name: "firebase", test: /node_modules[\\/]@?firebase[\\/]/, priority: 4 },
            { name: "framer", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 3 },
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/, priority: 2 },
            { name: "vendor", test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
  },
});
