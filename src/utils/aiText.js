// Texto para la IA del móvil: qué se le pasa al modelo y cómo se limpia lo que
// devuelve. Funciones puras (sin navegador), probadas en utils.test.js.

// Instrucciones del acompañante para un modelo pequeño: reglas cortas y unos
// pocos ejemplos de tono. Probado con Qwen 3.5 2B: con ejemplos responde más
// corto y a lo que se le cuenta; sin ellos se enrolla e inventa consejos. Los
// ejemplos los imita casi palabra por palabra, así que no deben parecerse a
// nada que la persona vaya a escribir a menudo.
export const LOCAL_SYSTEM_PROMPT = [
  "Eres el acompañante de Pausa, un diario personal. Hablas en español de España, sencillo y natural, como alguien cercano que sabe escuchar.",
  "",
  "Cómo respondes:",
  "- Respondes solo a lo último que ha escrito la persona, en una o dos frases cortas.",
  "- Si cuenta cómo se siente, dices con palabras sencillas lo que parece sentir y, si encaja, haces una pregunta abierta o propones algo pequeño y concreto.",
  "- Si solo saluda, saludas en pocas palabras y le preguntas qué tal está.",
  "- Si pregunta o escribe algo que no va de cómo se siente, contestas breve y con naturalidad, sin inventarle emociones.",
  "- No halagas ni exageras, no inventas detalles que no ha contado y no repites lo que ya dijiste.",
  "- Si la persona no ha dicho su género, no lo supones: evita palabras como cansado o cansada, tranquilo o tranquila.",
  "- No generalizas sobre hombres, mujeres ni ningún grupo. No haces diagnósticos ni recomiendas medicamentos. Nunca juzgas.",
  "- Si habla de hacerse daño, la animas con delicadeza a hablar con alguien de confianza y a llamar al 024, o al 112 si hay peligro inmediato.",
  "- Texto plano, sin listas ni emojis.",
  "",
  "Ejemplos de tu tono:",
  "Persona: Me han dado una buena noticia en el trabajo.",
  "Tú: ¡Qué alegría! ¿Cómo lo has celebrado?",
  "Persona: No dejo de darle vueltas a una discusión con mi hermano.",
  "Tú: Cuesta soltar algo así cuando te importa la otra persona. ¿Qué es lo que más te ronda de lo que pasó?",
  "Persona: buenas",
  "Tú: ¡Hola! ¿Qué tal va tu día?",
].join("\n");

// Como mucho, frases por respuesta (los modelos pequeños se enrollan).
export const MAX_SENTENCES = 3;

const SUMMARY_SYSTEM_PROMPT =
  "Resumes en español lo que una persona escribió en su diario. Contestas solo " +
  "con una frase.";

// El modelo tiene una ventana de 4096 tokens: instrucciones + historial +
// respuesta. Se estima por caracteres (en español, unos 3 por token).
const CHARS_PER_TOKEN = 3;
const SUMMARY_TOKENS = 2000;

// Un modelo pequeño se pierde con mucho contexto: copia sus respuestas
// anteriores o sigue con un tema viejo en vez de contestar al último mensaje.
// Por eso ve poco: los últimos turnos, y los anteriores al último, recortados.
const HISTORY_MESSAGES = 5;
const OLDER_MESSAGE_CHARS = 400;
const LAST_MESSAGE_CHARS = 2000;

const clip = (text, max) => (text.length > max ? text.slice(0, max).trimEnd() + "…" : text);

// Historial del chat ({role: "user"|"ai", text}) → mensajes del modelo.
// La bienvenida no se pasa (el modelo la imitaría saludando en cada respuesta)
// y dos mensajes seguidos del mismo rol se unen: los modelos esperan turnos
// alternos.
export function buildChatMessages(history) {
  const turns = [];
  for (const m of history) {
    const content = (m.text || "").trim();
    if (!content) continue;
    const role = m.role === "user" ? "user" : "assistant";
    const prev = turns[turns.length - 1];
    if (prev && prev.role === role) prev.content += "\n\n" + content;
    else turns.push({ role, content });
  }
  // Empieza en la persona y acaba en la persona.
  while (turns.length && turns[0].role !== "user") turns.shift();
  while (turns.length && turns[turns.length - 1].role !== "user") turns.pop();
  let recent = turns.slice(-HISTORY_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent = recent.slice(1);
  const last = recent.length - 1;
  const messages = recent.map((m, i) => ({
    role: m.role,
    content: clip(m.content, i === last ? LAST_MESSAGE_CHARS : OLDER_MESSAGE_CHARS),
  }));
  return [{ role: "system", content: LOCAL_SYSTEM_PROMPT }, ...messages];
}

// Fin de las primeras `n` frases de un texto, o -1 si aún no tiene tantas.
function sentenceEnd(text, n) {
  const re = /[.!?…]+["»”')]*(?=\s|$)/g;
  let count = 0;
  let match;
  while ((match = re.exec(text))) {
    if (++count === n) return match.index + match[0].length;
  }
  return -1;
}

// ¿Tiene ya `n` frases completas? (para dejar de generar)
export const hasSentences = (text, n = MAX_SENTENCES) => sentenceEnd(text, n) !== -1;

// Frases completas de un texto y lo que queda sin terminar.
function splitSentences(text) {
  const re = /[.!?…]+["»”')]*(?=\s|$)/g;
  const done = [];
  let start = 0;
  let match;
  while ((match = re.exec(text))) {
    const end = match.index + match[0].length;
    const sentence = text.slice(start, end).trim();
    if (sentence) done.push(sentence);
    start = end;
  }
  return { done, rest: text.slice(start).trim() };
}

// Para comparar frases: sin mayúsculas, signos ni espacios de más.
const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[¡¿!?.…,;:"«»“”'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Frases que el acompañante ya ha dicho en la conversación.
export function saidSentences(history) {
  const said = new Set();
  for (const m of history) {
    if (m.role === "user") continue;
    const { done, rest } = splitSentences(m.text || "");
    for (const s of [...done, rest]) if (normalize(s)) said.add(normalize(s));
  }
  return said;
}

// Quita las frases que ya se dijeron (un modelo pequeño copia sus respuestas
// anteriores). Mientras se escribe (`partial`), una frase a medias que va
// camino de ser una repetida no se enseña: así nada aparece y luego se borra.
export function dropRepeats(text, said, { partial = false } = {}) {
  if (!said.size) return text;
  const { done, rest } = splitSentences(text);
  const kept = done.filter((s) => !said.has(normalize(s)));
  let tail = rest;
  if (tail) {
    const n = normalize(tail);
    if (partial ? !n || [...said].some((s) => s.startsWith(n)) : said.has(n)) tail = "";
  }
  return [...kept, tail].filter(Boolean).join(" ");
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
        // Empezar por "Hoy hablaste de" obliga al modelo pequeño a escribir en
        // segunda persona y a contar, no a inventar cómo acabó el día.
        "\n\nEscribe una sola frase breve (máximo 20 palabras) que empiece por " +
        "«Hoy hablaste de», con lo principal que contó, sin añadir nada que no " +
        "haya escrito. Por ejemplo: Hoy hablaste del cansancio tras el examen y " +
        "de lo bien que te sentó correr.",
    },
  ];
}

// Limpia la respuesta del modelo para mostrarla en una burbuja: sin bloque de
// razonamiento, sin Markdown, etiquetas de rol ni saludo, en un solo párrafo y
// con MAX_SENTENCES frases como mucho (también mientras se escribe, para que
// el texto no se recorte de golpe al terminar).
// `partial`: aún se está escribiendo (se muestra lo que hay hasta ahora).
// `truncated`: se cortó; se recorta a la última frase completa.
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
  // "Hola, David." al empezar: la conversación ya está en marcha. Mientras
  // solo está el saludo no se enseña (si no, aparecería y se borraría).
  if (partial && /^(?:hola|buenas)\b[^.!?]{0,40}[.!?]*$/i.test(t)) return "";
  t = t.replace(/^(?:hola|buenas)\b[^.!?]{0,40}[.!?]+\s+(?=\S)/i, "");
  const end = sentenceEnd(t, MAX_SENTENCES);
  if (end !== -1) return t.slice(0, end).trim();
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
