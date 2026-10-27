// services/ai.js
// ----------------------------------------------------------------------------
// Adaptador de IA para el chat. Función principal: getAIReply(history).
//
// - Si existe VITE_AI_PROXY_URL, se llama a ese endpoint propio (una Cloud
//   Function de Firebase que a su vez habla con la API de Anthropic). La clave
//   de la API vive SOLO en el backend, NUNCA en el frontend.
// - Si no existe, se usa el modo fallback: respuestas empáticas variadas en
//   español, para que la app sea plenamente funcional sin backend.
// ----------------------------------------------------------------------------

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL;

// Prompt de sistema del acompañante (se envía al proxy; el proxy decide cómo
// usarlo con Anthropic). Se exporta por si el backend quiere reutilizarlo.
export const SYSTEM_PROMPT =
  "Eres el acompañante de Pausa, un diario personal. Hablas en español con " +
  "calidez, cercanía y contención, con la sensibilidad de alguien con formación " +
  "en escucha y apoyo emocional. Tu estilo: primero VALIDAS y reflejas lo que la " +
  "persona siente para que se sienta comprendida; después puedes ofrecer una " +
  "perspectiva amable, normalizar su experiencia o sugerir una herramienta " +
  "sencilla (una respiración, un reencuadre, un pequeño paso concreto). NO " +
  "respondas siempre con una pregunta: alterna reflexión, validación y apoyo, y " +
  "solo a veces cierra con UNA pregunta abierta. Responde en 2-4 frases, humanas " +
  "y concretas, sin tecnicismos. No das diagnósticos clínicos ni prescribes " +
  "tratamiento, y recuerdas con naturalidad que Pausa acompaña pero no sustituye " +
  "a un profesional de la salud mental. Si detectas crisis o riesgo, con " +
  "delicadeza animas a apoyarse en alguien de confianza o a llamar a la línea 024 " +
  "(España). Nunca juzgas.";

// Respuestas del modo fallback (sin IA conectada). No entienden el mensaje,
// pero sí su tono y su tema aproximados: así una buena noticia no recibe una
// respuesta de consuelo. Lenguaje inclusivo (nada de "solo/sola").
const REPLIES = {
  greeting: [
    "¡Hola! Me alegra verte por aquí. ¿Cómo ha ido tu día?",
    "Hola, qué bien que te des este momento. Cuéntame, ¿cómo estás hoy?",
  ],
  thanks: [
    "Gracias a ti por darte este rato. Aquí estaré cuando lo necesites.",
    "De nada. Cuidarte así, aunque sea un momento, ya cuenta mucho.",
  ],
  positive: [
    "¡Qué bien leer eso! Date un momento para saborearlo: los días buenos también merecen quedarse guardados.",
    "Me alegra mucho. ¿Qué crees que ha ayudado a que sea así? Saberlo puede servirte otros días.",
    "Eso suena muy bien. Quédate un instante con esa sensación; te la has ganado.",
    "Qué bonito que lo compartas. Celebrar lo que va bien también es cuidarte.",
  ],
  anxiety: [
    "Suena a que tu cabeza va a mil. Prueba a soltar el aire despacio, más largo de lo que lo coges: le dice a tu cuerpo que puede bajar el ritmo.",
    "La preocupación pesa mucho cuando todo parece urgente. ¿Qué parte de esto depende de ti hoy, y cuál puede esperar?",
    "Es comprensible sentirse así. Si te ayuda, en Relax tienes una respiración guiada para cuando el cuerpo va acelerado.",
    "No hace falta tener todas las respuestas ahora. Nombrar lo que te inquieta, como acabas de hacer, ya le quita algo de fuerza.",
  ],
  sadness: [
    "Siento que estés pasando por esto. La tristeza no necesita prisa; puedes darle su espacio sin juzgarte.",
    "Gracias por contarlo. Cuando algo duele, a veces lo más amable es no exigirse estar bien enseguida.",
    "Te leo. No tienes que llevarlo en soledad: hablarlo con alguien de confianza también puede aliviar.",
    "Lo que sientes es válido. Hoy quizá basta con cuidarte en lo pequeño: comer algo rico, descansar, una ducha caliente.",
  ],
  tired: [
    "Suena agotador. El cansancio también es una señal: quizá tu cuerpo te está pidiendo un poco de pausa.",
    "Cuando se duerme mal, todo pesa más. Esta noche, prueba a dejar el móvil un rato antes y a bajar las luces.",
    "Permítete parar un momento: no tienes que resolverlo todo hoy. Descansar también es avanzar.",
  ],
  anger: [
    "Es normal enfadarse cuando algo parece injusto o te sobrepasa. La rabia suele señalar algo que te importa.",
    "Tiene sentido que te sientas así. Antes de responder a nadie, a veces ayuda soltarlo aquí o salir a caminar un rato.",
    "Frustra mucho cuando las cosas no salen como esperabas. Date permiso para sentirlo sin culparte por ello.",
  ],
  difficult: [
    "Gracias por ponerlo en palabras. Lo que sientes tiene sentido; no estás exagerando.",
    "Es humano sentirse así. Intenta tratarte con la misma amabilidad con la que tratarías a alguien que quieres.",
    "Suena a que has cargado con mucho. No hace falta poder con todo a la vez; a veces basta un paso pequeño.",
    "Sentirte así no significa que estés fallando. Los días difíciles también forman parte del camino, y aquí estás.",
  ],
  neutral: [
    "Gracias por contármelo. ¿Y tú cómo te has sentido con eso?",
    "Te leo. Si te apetece, cuéntame un poco más: ¿qué es lo que más te ha marcado hoy?",
    "Reconocer cómo va tu día ya es un acto de cuidado. ¿Qué te gustaría llevarte de él?",
    "Aquí tienes espacio para lo que necesites: desahogarte, ordenar ideas o simplemente contar tu día.",
  ],
};

// Frases que activan un mensaje de contención (sin tildes: se comparan con el
// texto normalizado). Conservador: mejor ofrecer ayuda de más que de menos.
const CRISIS_HINTS = [
  "no quiero vivir",
  "quiero morir",
  "me quiero morir",
  "quitarme la vida",
  "suicid",
  "hacerme dano",
  "autolesion",
  "acabar con todo",
  "no puedo mas",
  "mejor sin mi",
];

const CRISIS_REPLY =
  "Siento mucho que estés pasando por algo tan difícil, y gracias por decirlo. " +
  "No tienes que pasar por esto en soledad: habla con alguien de confianza o " +
  "llama al 024, gratuito, confidencial y disponible las 24 horas. Si hay un " +
  "peligro inmediato, llama al 112. Aquí sigo contigo.";

// Palabras por tema (sin tildes). Las de "prefijos" valen al inicio de una
// palabra (ansie → ansiedad, ansiosa…); las "exactas", solo enteras.
const TOPICS = {
  anxiety: ["ansie", "nervios", "estres", "agobi", "preocup", "miedo", "angusti", "panico", "inquiet", "agobio"],
  sadness: ["triste", "llor", "deprim", "vacio", "soledad", "bajon", "pena", "echo de menos"],
  tired: ["cansad", "agotad", "insomnio", "agotamiento", "no he dormido", "no duermo", "no puedo dormir", "duermo mal", "dormido mal"],
  anger: ["enfad", "rabia", "cabre", "frustr", "harto", "harta", "injust", "odio"],
};
const POSITIVE = ["bien", "mejor", "feliz", "content", "alegr", "genial", "tranquil", "orgullos", "logr", "consegu", "disfrut", "ilusion", "relajad", "agradecid", "estupend", "fenomenal", "maravill", "encant", "descansad", "guay"];
const NEGATIVE_EXACT = ["mal", "malo", "mala", "peor", "fatal", "horrible", "roto", "rota", "dolor", "duele"];
const NEGATORS = ["no", "nada", "ni", "nunca", "tampoco", "sin"];

// Minúsculas y sin tildes. La ñ se protege: NFD la separaría en n + virgulilla.
const normalize = (s) =>
  s.toLowerCase().replace(/ñ/g, "\uE000").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\uE000/g, "ñ");

// Clasifica el último mensaje: crisis, saludo, gracias, positivo, un tema o
// "difícil"/"neutral". Un "no" hasta tres palabras antes invierte el sentido
// ("no estoy bien" no es una buena noticia; "no ha estado mal", sí).
// Exportada para los tests.
export function classify(text) {
  const t = normalize(text);
  if (CRISIS_HINTS.some((h) => t.includes(h))) return "crisis";
  const words = t.match(/[a-zñ]+/g) || [];
  if (words.length <= 4 && /^(hola|buenas|hey|ey|buenos)\b/.test(t)) return "greeting";
  if (words.includes("gracias") && words.length <= 6) return "thanks";

  let pos = 0;
  let neg = 0;
  words.forEach((w, i) => {
    const negated = words.slice(Math.max(0, i - 3), i).some((p) => NEGATORS.includes(p));
    if (POSITIVE.some((p) => w.startsWith(p))) negated ? neg++ : pos++;
    else if (NEGATIVE_EXACT.includes(w)) negated ? pos++ : neg++;
  });
  const topic = Object.keys(TOPICS).find((k) =>
    TOPICS[k].some((p) => (p.includes(" ") ? t.includes(p) : words.some((w) => w.startsWith(p))))
  );
  if (topic) neg++; // un tema difícil pesa como una palabra negativa

  if (pos > neg) return "positive";
  if (topic) return topic;
  return neg > 0 ? "difficult" : "neutral";
}

function pickFallback(history) {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const kind = classify(lastUser?.text || "");
  if (kind === "crisis") return CRISIS_REPLY;
  // Al azar, pero sin repetir frases ya dichas en esta conversación.
  const said = new Set(history.filter((m) => m.role === "ai").map((m) => m.text));
  const pool = REPLIES[kind];
  const fresh = pool.filter((r) => !said.has(r));
  const options = fresh.length ? fresh : pool;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Devuelve la respuesta de la IA para un historial de mensajes.
 * @param {{role: "user"|"ai", text: string}[]} history
 * @returns {Promise<string>}
 */
export async function getAIReply(history) {
  if (!PROXY_URL) {
    // Pequeña latencia simulada para que aparezca el indicador de escribiendo.
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
    return pickFallback(history);
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: SYSTEM_PROMPT, messages: history }),
    });
    if (!res.ok) throw new Error(`Proxy respondió ${res.status}`);
    const data = await res.json();
    // Se espera { reply: "..." }; si no, caemos al fallback.
    return data.reply || pickFallback(history);
  } catch (err) {
    console.warn("[Pausa] Error llamando al proxy de IA, usando fallback:", err);
    return pickFallback(history);
  }
}

/**
 * Genera un resumen breve del día a partir del historial del chat.
 * Sin proxy, produce un resumen local sencillo (primer mensaje del usuario).
 * @param {{role: "user"|"ai", text: string}[]} history
 * @returns {Promise<string>}
 */
export async function getChatSummary(history) {
  const firstUser = history.find((m) => m.role === "user");
  const base = firstUser?.text?.trim() || "";

  if (!PROXY_URL) {
    if (!base) return "";
    return base.length > 90 ? base.slice(0, 87) + "…" : base;
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system:
          "Resume en una sola frase breve, cálida y en español el tema principal " +
          "de esta conversación de diario. Sin comillas.",
        messages: history,
        mode: "summary",
      }),
    });
    if (!res.ok) throw new Error(`Proxy respondió ${res.status}`);
    const data = await res.json();
    return data.reply || (base ? base.slice(0, 90) : "");
  } catch {
    return base ? base.slice(0, 90) : "";
  }
}
