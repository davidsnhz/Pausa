// services/streak.js
// ----------------------------------------------------------------------------
// Lógica de la racha (streak). Se "toca" una vez al día cuando el usuario hace
// su check-in diario (envía un mensaje en el chat):
//   - Si ya se contó hoy → no cambia.
//   - Si el último check-in fue AYER → racha + 1.
//   - Si hubo un hueco (o es el primero) → racha = 1.
// Guarda `lastCheckIn` (YYYY-MM-DD) para poder calcularlo.
// ----------------------------------------------------------------------------
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { dateKey } from "../utils/date";

function yesterdayKey(base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// Racha a MOSTRAR. La guardada solo se reescribe en el siguiente check-in, así
// que si el último fue antes de ayer la racha ya está rota aunque el documento
// aún diga otra cosa.
export function currentStreak(profile, now = new Date()) {
  const last = profile?.lastCheckIn;
  if (last !== dateKey(now) && last !== yesterdayKey(now)) return 0;
  return profile.streak || 0;
}

// Registra la actividad de hoy. Devuelve { streak, incremented } o null si falla.
// `incremented` es true solo cuando la racha ha subido con este check-in.
export async function touchStreak(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const today = dateKey();

    if (data.lastCheckIn === today) {
      return { streak: data.streak || 0, incremented: false }; // ya contado hoy
    }

    const streak = data.lastCheckIn === yesterdayKey() ? (data.streak || 0) + 1 : 1;
    await setDoc(ref, { streak, lastCheckIn: today, updatedAt: serverTimestamp() }, { merge: true });
    return { streak, incremented: true };
  } catch {
    // No rompemos el flujo del chat si falla la actualización de la racha.
    return null;
  }
}
