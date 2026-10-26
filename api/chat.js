// api/chat.js
// ----------------------------------------------------------------------------
// Función serverless de Vercel: el acompañante del chat, con Claude (Anthropic).
// La clave de la API vive SOLO aquí (variable ANTHROPIC_API_KEY en Vercel),
// nunca en el frontend.
//
//   POST /api/chat        Authorization: Bearer <ID token de Firebase>
//   { mode: "reply" | "summary", name?, messages: [{ role: "user"|"ai", text }] }
//   → 200 { reply }   |   401 / 400 / 429 / 502 / 503 { error }
//
// - Solo usuarios con sesión: el ID token de Firebase se verifica con las
//   claves públicas de Google (no hace falta una cuenta de servicio).
// - El prompt de sistema lo pone el servidor; el cliente no puede cambiarlo
//   (si pudiera, cualquiera usaría la clave como un chat genérico).
// - Límites de tamaño y de ritmo para acotar el coste.
// ----------------------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const GOOGLE_KEYS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);
// Solo en local con los emuladores (ver .env.emulators): sus tokens no van
// firmados. NUNCA definir FIREBASE_AUTH_EMULATOR_HOST en Vercel.
const AUTH_EMULATOR =
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.NODE_ENV !== "production";

const HISTORY_WINDOW = 30; // últimos mensajes que ve el modelo (contexto deslizante)
const MAX_CHARS = 4000; // por mensaje; el input del chat ya corta en 2000
const RATE_LIMIT = { requests: 60, windowMs: 10 * 60 * 1000 }; // por usuario e instancia

const SYSTEM_PROMPTS = {
  reply:
    "Eres el acompañante de Pausa, un diario personal. Hablas en español con " +
    "calidez, cercanía y contención, con la sensibilidad de alguien con formación " +
    "en escucha y apoyo emocional. Tu estilo: primero validas y reflejas lo que la " +
    "persona siente para que se sienta comprendida; después puedes ofrecer una " +
    "perspectiva amable, normalizar su experiencia o sugerir una herramienta " +
    "sencilla (una respiración, un reencuadre, un pequeño paso concreto). No " +
    "respondas siempre con una pregunta: alterna reflexión, validación y apoyo, y " +
    "solo a veces cierra con una pregunta abierta. Responde en 2-4 frases, humanas " +
    "y concretas, sin tecnicismos, en texto plano: sin Markdown, listas ni títulos, " +
    "porque se muestra en una burbuja de chat. No das diagnósticos clínicos ni " +
    "prescribes tratamiento, y recuerdas con naturalidad, cuando venga a cuento, que " +
    "Pausa acompaña pero no sustituye a un profesional de la salud mental. Si " +
    "detectas crisis o riesgo de hacerse daño, con delicadeza animas a apoyarse en " +
    "alguien de confianza y a llamar a la línea 024 (España, gratuita y " +
    "confidencial), o al 112 si hay peligro inmediato. Nunca juzgas.",
  summary:
    "Te paso la conversación de hoy del diario de una persona con su acompañante. " +
    "Resume en una sola frase breve (máximo 20 palabras), cálida y en segunda " +
    "persona, lo principal que la persona contó o sintió hoy. Por ejemplo: " +
    "\"Hoy hablaste del cansancio tras el examen y de lo bien que te sentó correr.\" " +
    "Texto plano, sin comillas.",
};

let client; // se crea en la primera petición, cuando ya se sabe que hay clave
const hits = new Map(); // uid → [timestamps] (límite de ritmo en memoria, por instancia)

function json(body, status = 200) {
  return Response.json(body, { status });
}

async function verifyUser(authorization) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token || !PROJECT_ID) return null;
  const issuer = `https://securetoken.google.com/${PROJECT_ID}`;
  try {
    if (AUTH_EMULATOR) {
      const p = decodeJwt(token);
      return p.iss === issuer && p.aud === PROJECT_ID ? p.sub || null : null;
    }
    const { payload } = await jwtVerify(token, GOOGLE_KEYS, { issuer, audience: PROJECT_ID });
    return payload.sub || null;
  } catch {
    return null;
  }
}

function rateLimited(uid, now = Date.now()) {
  const recent = (hits.get(uid) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(uid, recent);
  return recent.length > RATE_LIMIT.requests;
}

// Valida el historial del cliente. Devuelve null si no tiene la forma esperada.
export function sanitize(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const clean = [];
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "ai") || typeof m.text !== "string") return null;
    const text = m.text.trim();
    if (text.length > MAX_CHARS) return null;
    if (text) clean.push({ role: m.role, text });
  }
  return clean.length ? clean.slice(-HISTORY_WINDOW) : null;
}

// Historial → mensajes de la API. Debe empezar y acabar en "user" (sin prefill),
// así que se descartan los mensajes iniciales del acompañante (la bienvenida).
export function toMessages(history) {
  const start = history.findIndex((m) => m.role === "user");
  if (start === -1 || history[history.length - 1].role !== "user") return null;
  return history.slice(start).map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.text,
  }));
}

// Para el resumen, la conversación va como transcripción en un único mensaje.
export function toTranscript(history) {
  const lines = history.map((m) => `${m.role === "ai" ? "Acompañante" : "Persona"}: ${m.text}`);
  return [{ role: "user", content: lines.join("\n\n") }];
}

export async function POST(request) {
  const uid = await verifyUser(request.headers.get("authorization"));
  if (!uid) return json({ error: "unauthorized" }, 401);
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: "not_configured" }, 503);
  if (rateLimited(uid)) return json({ error: "rate_limited" }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const mode = body?.mode === "summary" ? "summary" : "reply";
  const history = sanitize(body?.messages);
  const messages = history && (mode === "summary" ? toTranscript(history) : toMessages(history));
  if (!messages) return json({ error: "bad_request" }, 400);

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  const system =
    mode === "reply" && name ? `${SYSTEM_PROMPTS.reply} La persona se llama ${name}.` : SYSTEM_PROMPTS[mode];

  try {
    // Lee ANTHROPIC_API_KEY del entorno. Tiempo y reintentos acotados para
    // responder antes del límite de la función (30 s, ver vercel.json).
    client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: mode === "summary" ? 1000 : 2000,
      // Chat breve y cálido: effort bajo = respuestas rápidas y más baratas.
      output_config: { effort: "low" },
      // Si un filtro de seguridad rechaza la petición, Anthropic la reintenta
      // con el modelo de respaldo recomendado en vez de devolver el rechazo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
    });

    if (response.stop_reason === "refusal") return json({ error: "refusal" }, 502);
    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!reply) return json({ error: "empty" }, 502);
    return json({ reply });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[api/chat] ANTHROPIC_API_KEY no válida");
      return json({ error: "not_configured" }, 503);
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[api/chat] Error de Anthropic ${err.status}:`, err.message);
      return json({ error: "upstream" }, 502);
    }
    console.error("[api/chat] Error inesperado:", err);
    return json({ error: "internal" }, 500);
  }
}
