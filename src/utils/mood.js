// utils/mood.js
// ----------------------------------------------------------------------------
// Escala de ánimo compartida (Stats, Dashboard): 5 emojis de peor a mejor.
// La puntuación (1-5) solo se usa para medias y tendencias.
// ----------------------------------------------------------------------------
export const EMOJIS = ["😢", "😟", "😐", "🙂", "😁"];
export const MOOD_LABELS = ["Muy mal", "Mal", "Regular", "Bien", "Muy bien"];

// 1..5, o null si el valor guardado no es uno de los 5 emojis.
export function moodScore(emoji) {
  const i = EMOJIS.indexOf(emoji);
  return i === -1 ? null : i + 1;
}

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Resumen de un mes a partir de { "YYYY-MM-DD": emoji }.
//   days  → días registrados        counts → cuántas veces cada emoji (5 huecos)
//   avg   → media 1-5 (o null)
export function monthSummary(moods, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const counts = [0, 0, 0, 0, 0];
  let days = 0;
  let sum = 0;
  let scored = 0;
  for (const [key, emoji] of Object.entries(moods || {})) {
    if (!key.startsWith(prefix) || !emoji) continue;
    days++;
    const s = moodScore(emoji);
    if (s) {
      counts[s - 1]++;
      sum += s;
      scored++;
    }
  }
  return { days, counts, avg: scored ? sum / scored : null, scored };
}
