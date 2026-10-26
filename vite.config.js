import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
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

// En desarrollo, /api/chat lo sirve la misma función que usa Vercel
// (api/chat.js), para probar el chat entero en local. Sin ANTHROPIC_API_KEY en
// .env.local responde 503 y el chat usa sus frases de respaldo.
function apiInDev() {
  return {
    name: "pausa-api-in-dev",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        try {
          const { POST } = await server.ssrLoadModule("/api/chat.js");
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const response = await POST(
            new Request("http://localhost/api/chat", {
              method: "POST",
              headers: {
                authorization: req.headers.authorization || "",
                "content-type": req.headers["content-type"] || "",
              },
              body: Buffer.concat(chunks),
            })
          );
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.config.logger.error(`[api/chat] ${err?.stack || err}`);
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // La función lee su configuración de process.env, como en Vercel.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [capacitorStubWhenAbsent(), apiInDev(), react()],
    server: {
      host: true,
      port: 5173,
    },
    build: {
      rollupOptions: {
        output: {
          // Separa las librerías grandes en trozos propios: se cachean aparte y
          // no se vuelven a descargar en cada despliegue si no cambian.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
            if (id.includes("framer-motion") || id.includes("popmotion") || id.includes("@motionone"))
              return "framer";
            if (id.includes("react")) return "react";
            return "vendor";
          },
        },
      },
    },
  };
});
