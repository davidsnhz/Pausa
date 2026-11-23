// Operaciones de la IA del móvil sobre WebLLM. Lo normal es que corran en el
// worker (localAI.worker.js), fuera de la pantalla; si el navegador no tiene
// WebGPU en workers, services/localAI.js las carga en la propia página.
import { MLCEngine, deleteModelAllInfoInCache, hasModelInCache } from "@mlc-ai/web-llm";

export function createHost() {
  let engine = null;

  return {
    // { [modelId]: true si está descargado entero }
    async cached(ids) {
      const out = {};
      for (const id of ids) out[id] = await hasModelInCache(id).catch(() => false);
      return out;
    },

    async remove(id) {
      await deleteModelAllInfoInCache(id);
    },

    // Descarga (si hace falta) y prepara el modelo. onProgress({ text, progress }).
    async load(id, onProgress) {
      engine ||= new MLCEngine();
      engine.setInitProgressCallback((r) => onProgress({ text: r.text, progress: r.progress }));
      await engine.reload(id);
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
