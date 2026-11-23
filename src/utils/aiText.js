// Texto para la IA del móvil: qué se le pasa al modelo y cómo se limpia lo que
// devuelve. Funciones puras (sin navegador), probadas en utils.test.js.

// Instrucciones del acompañante para un modelo pequeño: cortas y directas.
export const LOCAL_SYSTEM_PROMPT =
  "Eres el acompañante de Pausa, un diario personal. Respondes siempre en " +
  "español, con calidez y cercanía, como alguien que sabe escuchar. Primero " +
  "validas lo que la persona siente; después, si encaja, ofreces una perspectiva " +
  "amable o una idea sencilla, como respirar despacio o dar un paso pequeño. No " +
  "termines siempre con una pregunta: a veces basta con acompañar. Escribe dos o " +
  "tres frases cortas en texto plano, sin listas, sin títulos y sin emojis. Usa " +
  "un lenguaje que no dé por hecho el género de la persona. No haces " +
  "diagnósticos ni recomiendas medicamentos, y nunca juzgas. Si la persona habla " +
  "de hacerse daño, la animas con delicadeza a hablar con alguien de confianza y " +
  "a llamar al 024 (España), o al 112 si hay peligro inmediato.";

const SUMMARY_SYSTEM_PROMPT =
  "Resumes en español lo que una persona escribió en su diario. Contestas solo " +
  "con una frase.";

// El modelo tiene una ventana de 4096 tokens: instrucciones + historial +
// respuesta. Se estima por caracteres (en español, unos 3 por token).
const CHARS_PER_TOKEN = 3;
const HISTORY_TOKENS = 2600;
const SUMMARY_TOKENS = 2000;

// Historial del chat ({role: "user"|"ai", text}) → mensajes del modelo.
// Se quedan los más recientes que caben; dos seguidos del mismo rol (si una
// respuesta falló) se unen, porque los modelos esperan turnos alternos.
export function buildChatMessages(history) {
  const budget = HISTORY_TOKENS * CHARS_PER_TOKEN;
  const kept = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const text = (history[i].text || "").trim();
    if (!text) continue;
    if (used + text.length > budget && kept.length) break;
    kept.unshift({ role: history[i].role === "user" ? "user" : "assistant", content: text });
    used += text.length;
  }
  const merged = [];
  for (const m of kept) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }
  // La conversación debe empezar tras las instrucciones y acabar en la persona.
  while (merged.length && merged[merged.length - 1].role !== "user") merged.pop();
  return [{ role: "system", content: LOCAL_SYSTEM_PROMPT }, ...merged];
}

// Para el resumen solo cuenta lo que escribió la persona.
export function buildSummaryMessages(history) {
  const budget = SUMMARY_TOKENS * CHARS_PER_TOKEN;
  const lines = [];
  let used = 0;
  for (const m of history) {
    if (m.role !== "user") continue;
    const text = (m.text || "").trim().replace(/\s+/g, " ");
    if (!text) continue;
    if (used + text.length > budget) break;
    lines.push("- " + text);
    used += text.length;
  }
  if (!lines.length) return null;
  return [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    {
      role: "user",
      content:
        "Esto es lo que la persona escribió hoy en su diario:\n\n" +
        lines.join("\n") +
        "\n\nEscribe una sola frase breve (máximo 20 palabras), cálida y en " +
        "segunda persona, con lo principal que contó o sintió hoy. Por ejemplo: " +
        "Hoy hablaste del cansancio tras el examen y de lo bien que te sentó correr.",
    },
  ];
}

// Limpia la respuesta del modelo para mostrarla en una burbuja: sin bloque de
// razonamiento, sin Markdown ni etiquetas de rol y en un solo párrafo.
// `partial`: aún se está escribiendo (se muestra lo que hay hasta ahora).
// `truncated`: se cortó por longitud; se recorta a la última frase completa.
export function cleanReply(raw, { partial = false, truncated = false } = {}) {
  let t = String(raw || "");
  t = t.replace(/<think>[\s\S]*?<\/think>/g, "");
  const open = t.indexOf("<think>");
  if (open !== -1) t = t.slice(0, open); // sigue "pensando": aún no hay respuesta
  // Una etiqueta a medio escribir al final ("<thi") no se enseña.
  if (partial) t = t.replace(/<[a-z/]*$/i, "");
  t = t
    .replace(/^\s*(pausa|acompañante|asistente|assistant)\s*:\s*/i, "")
    .replace(/^\s*#+\s*/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*`]/g, "")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (truncated && !partial) {
    const whole = t.match(/^[\s\S]*[.!?…](?=\s|$)/);
    if (whole) t = whole[0].trim();
  }
  return t;
}

// Resumen: la primera frase, sin comillas, con un tope de longitud.
export function cleanSummary(raw) {
  const unquote = (s) => s.replace(/^["«“'”»]+|["«“'”»]+$/g, "").trim();
  let t = unquote(cleanReply(raw));
  const first = t.match(/^[\s\S]*?[.!?…]["«“'”»]*(?=\s|$)/);
  if (first) t = unquote(first[0]);
  if (t.length > 140) t = t.slice(0, 137).trimEnd() + "…";
  return t;
}
