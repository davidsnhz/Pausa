// services/ai.js
// ----------------------------------------------------------------------------
// Adaptador de IA para el chat: getAIReply(history, name) y getChatSummary(history).
//
// - Llama a /api/chat (función de Vercel, ver api/chat.js) con el ID token de
//   Firebase. La clave de Anthropic y el prompt de sistema viven allí, NUNCA en
//   el frontend. VITE_AI_PROXY_URL permite apuntar a otra URL (p. ej. desde la
//   app nativa, donde una ruta relativa no llega a Vercel).
// - Si no hay IA disponible (en local con `npm run dev`, sin clave configurada,
//   sin conexión…), modo fallback: respuestas empáticas fijas en español, para
//   que la app siga funcionando.
// ----------------------------------------------------------------------------
import { auth } from "./firebase";

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || "/api/chat";
const TIMEOUT_MS = 25000;

// Respuestas del modo fallback: validan, normalizan y acompañan (no solo
// preguntan). Son frases fijas al azar.
const FALLBACK_REPLIES = [
  "Gracias por ponerlo en palabras. Lo que sientes tiene sentido después de un día así; no estás exagerando.",
  "Te leo y quiero que lo sepas: no estás solo en esto. A veces nombrar lo que pesa ya alivia un poco.",
  "Eso que describes suena agotador. Permítete parar un momento: no tienes que resolverlo todo hoy.",
  "Es humano sentirse así. Intenta tratarte con la misma amabilidad con la que tratarías a un buen amigo.",
  "Reconocer cómo te sientes ya es un acto de cuidado. ¿Qué necesitas ahora: desahogarte, ordenar ideas o descansar?",
  "Respira hondo conmigo un momento. Lo que sientes es válido, y puede convivir con que mañana pese un poco menos.",
  "Suena a que has cargado con mucho. No hace falta poder con todo a la vez; a veces basta un paso pequeño.",
  "Lo que cuentas importa. Detrás del cansancio suele haber algo que te importa; siéntelo sin juzgarte.",
  "Gracias por confiar en este espacio. Si te sirve, suelta aquí lo que ronda tu cabeza sin filtrarlo.",
  "Sentirte así no significa que estés fallando. Los días difíciles también forman parte de cuidarte, y aquí estás.",
  "Te acompaño en esto. Cuando quieras, fíjate en una sola cosa, por pequeña que sea, que hoy te haya sostenido.",
  "Lo estás haciendo mejor de lo que crees. Ser tan duro contigo no ayuda; ¿podrías darte hoy un poco de margen?",
];

// Palabras que activan un mensaje de contención (muy conservador, sin alarmismo).
const CRISIS_HINTS = [
  "no quiero vivir",
  "no puedo más",
  "hacerme daño",
  "acabar con todo",
  "quitarme la vida",
  "suicid",
  "morir",
];

const CRISIS_REPLY =
  "Siento mucho que estés pasando por algo tan difícil. No estás solo en esto. " +
  "¿Podrías hablarlo con alguien de confianza? En España puedes llamar de forma " +
  "gratuita y confidencial a la línea 024. Estoy aquí contigo.";

function pickFallback(history) {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const text = (lastUser?.text || "").toLowerCase();
  if (CRISIS_HINTS.some((w) => text.includes(w))) return CRISIS_REPLY;
  // Elegir una respuesta al azar distinta cada vez.
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

// Llama a /api/chat. Devuelve el texto, o null si no hay IA disponible.
async function callAI(mode, messages, name) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, name, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Sin función desplegada (p. ej. `npm run dev` devuelve el HTML de la app)
    // o sin clave configurada (503): fallback sin más ruido.
    const isJson = res.headers.get("content-type")?.includes("application/json");
    if (!isJson || res.status === 503) return null;
    if (!res.ok) {
      console.warn(`[Pausa] La IA respondió ${res.status}, usando fallback.`);
      return null;
    }
    const data = await res.json();
    return typeof data.reply === "string" && data.reply.trim() ? data.reply.trim() : null;
  } catch (err) {
    console.warn("[Pausa] Error llamando a la IA, usando fallback:", err);
    return null;
  }
}

/**
 * Devuelve la respuesta del acompañante para un historial de mensajes.
 * @param {{role: "user"|"ai", text: string}[]} history
 * @param {string} [name] nombre con el que saludar
 * @returns {Promise<string>}
 */
export async function getAIReply(history, name = "") {
  const reply = await callAI("reply", history, name);
  if (reply) return reply;
  // Pequeña latencia simulada para que aparezca el indicador de escribiendo.
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  return pickFallback(history);
}

/**
 * Genera un resumen breve del día a partir del historial del chat.
 * Sin IA, el resumen es el primer mensaje de la persona (recortado).
 * @param {{role: "user"|"ai", text: string}[]} history
 * @returns {Promise<string>}
 */
export async function getChatSummary(history) {
  const summary = await callAI("summary", history);
  if (summary) return summary;
  const first = history.find((m) => m.role === "user")?.text?.trim() || "";
  return first.length > 90 ? first.slice(0, 87) + "…" : first;
}
