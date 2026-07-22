// utils/date.js
// ----------------------------------------------------------------------------
// Helpers de fecha compartidos por toda la app.
// ----------------------------------------------------------------------------

// Clave "YYYY-MM-DD" en hora LOCAL (no UTC), usada como id de doc en Firestore.
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Saludo dinámico según la hora del día.
export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

// Semana actual de lunes a domingo como array de objetos { key, label, num, date }.
export function currentWeek(base = new Date()) {
  const LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
  // getDay(): 0=domingo..6=sábado → índice lunes-based.
  const jsDay = base.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return LABELS.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return { key: dateKey(date), label, num: date.getDate(), date };
  });
}
