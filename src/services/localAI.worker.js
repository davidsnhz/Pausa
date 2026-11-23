// Worker de la IA del móvil: el modelo (y la librería, de varios MB) viven
// aquí, fuera de la pantalla, para que la app no se congele.
// Protocolo con services/localAI.js: llega { id, op, args } y se responde
// { id, progress } / { id, delta } mientras dura y { id, done, result | error }.
import { createHost } from "./localAI.host";

const host = createHost();

self.onmessage = async ({ data }) => {
  const { id, op, args } = data || {};
  const reply = (msg) => self.postMessage({ id, ...msg });
  try {
    let result = null;
    if (op === "probe") {
      // Algunos navegadores tienen WebGPU en la página pero no en un worker.
      result = !!(await self.navigator.gpu?.requestAdapter());
    } else if (op === "cached") {
      result = await host.cached(args.ids);
    } else if (op === "remove") {
      await host.remove(args.id);
    } else if (op === "load") {
      await host.load(args.id, (progress) => reply({ progress }));
    } else if (op === "chat") {
      result = await host.chat(args.request, (delta) => reply({ delta }));
    } else if (op === "interrupt") {
      host.interrupt();
    } else if (op === "unload") {
      await host.unload();
    }
    reply({ done: true, result });
  } catch (err) {
    reply({ done: true, error: { name: err?.name || "Error", message: String(err?.message || err) } });
  }
};
