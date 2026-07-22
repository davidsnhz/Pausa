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

// Respuestas del modo fallback: validan, normalizan y acompañan (no solo
// preguntan). Son frases fijas al azar; para respuestas realmente inteligentes
// hay que conectar un modelo real vía VITE_AI_PROXY_URL.
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
    // eslint-disable-next-line no-console
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
