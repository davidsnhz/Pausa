// scripts/seed-emulators.mjs
// ----------------------------------------------------------------------------
// Rellena los emuladores de Firebase (`npm run emulators`) con una cuenta de
// prueba y datos de ejemplo: ánimos de los últimos dos meses (hoy no, para ver
// el selector) y algunos días de chat de esta semana. Borra antes todo lo que
// hubiera en los emuladores. Solo habla con 127.0.0.1: nunca con el Firebase real.
//
//   npm run seed:emu      → luego entra en `npm run dev:emu` con la cuenta de abajo
// ----------------------------------------------------------------------------
import { LEGAL } from "../src/utils/legal.js";

const PROJECT = "demo-pausa";
const AUTH = "http://127.0.0.1:9099";
const STORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

// Cuenta de prueba (solo existe en los emuladores).
const EMAIL = "demo@pausa.test";
const PASSWORD = "pausa-demo-1234";
const NAME = "Alex";

const EMOJIS = ["😢", "😟", "😐", "🙂", "😁"];

function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

// Objeto JS → campos del API REST de Firestore.
function fields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Date) out[k] = { timestampValue: v.toISOString() };
    else if (typeof v === "number") out[k] = { integerValue: String(v) };
    else out[k] = { stringValue: String(v) };
  }
  return { fields: out };
}

async function put(path, data) {
  const res = await fetch(`${STORE}/${path}`, {
    method: "PATCH",
    headers: OWNER,
    body: JSON.stringify(fields(data)),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
}

async function main() {
  // 1) Emuladores vacíos.
  await fetch(`${STORE.replace("/v1/", "/emulator/v1/")}`, { method: "DELETE" });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });

  // 2) Cuenta.
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  });
  const { localId: uid, error } = await res.json();
  if (!uid) throw new Error(`No se pudo crear la cuenta: ${error?.message}`);

  // 3) Perfil: racha de 3 días que sigue viva (último check-in ayer).
  const now = new Date();
  await put(`users/${uid}`, {
    displayName: NAME,
    streak: 3,
    lastCheckIn: dateKey(daysAgo(1)),
    createdAt: daysAgo(70),
    termsVersion: LEGAL.version,
    termsAcceptedAt: daysAgo(70),
  });

  // 4) Ánimos: casi todos los días de los últimos 60, con algún hueco.
  let moods = 0;
  for (let n = 1; n <= 60; n++) {
    if (n % 7 === 3 || n % 11 === 0) continue; // días sin registrar
    const score = [3, 4, 2, 4, 5, 3, 4, 1, 3, 4, 5, 4, 2][n % 13];
    await put(`users/${uid}/moods/${dateKey(daysAgo(n))}`, {
      emoji: EMOJIS[score - 1],
      createdAt: daysAgo(n),
    });
    moods++;
  }

  // 5) Chats de los días anteriores de esta semana (lunes = inicio).
  const monday = now.getDay() === 0 ? 6 : now.getDay() - 1; // días desde el lunes
  const lines = [
    ["Hoy ha sido un día largo en el trabajo.", "Suena agotador. ¿Qué ha sido lo más pesado?"],
    ["He salido a caminar y me ha sentado bien.", "Qué bien que te dieras ese momento para ti."],
    ["Me cuesta dormir últimamente.", "Gracias por contarlo. ¿Qué te ronda por la cabeza por la noche?"],
  ];
  for (let n = 1; n <= monday; n++) {
    const key = dateKey(daysAgo(n));
    const [user, ai] = lines[n % lines.length];
    await put(`users/${uid}/chats/${key}`, {
      summary: `Hablaste de cómo te sentías: "${user}"`,
      lastMessage: ai,
      updatedAt: daysAgo(n),
    });
    await put(`users/${uid}/chats/${key}/messages/m1`, { role: "user", text: user, createdAt: daysAgo(n) });
    await put(`users/${uid}/chats/${key}/messages/m2`, { role: "ai", text: ai, createdAt: daysAgo(n) });
  }

  console.log(`Listo: ${EMAIL} con ${moods} ánimos y ${monday} día(s) de chat esta semana.`);
}

main().catch((e) => {
  console.error("No se pudo rellenar los emuladores (¿están arrancados?):", e.message);
  process.exit(1);
});
