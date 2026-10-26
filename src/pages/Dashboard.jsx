// pages/Dashboard.jsx
// ----------------------------------------------------------------------------
// 3. Dashboard: racha (fuego), saludo dinámico por hora, botón a Perfil,
// calendario semanal (día pasado → BottomSheet con el resumen de Firestore) y
// CTA grande oscura con mascota que lleva al Chat. CON navbar.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { Flame, User, ChevronRight, MessageCircle } from "lucide-react";

import { useAuth, displayNameOf } from "../context/AuthContext";
import { db } from "../services/firebase";
import { currentStreak } from "../services/streak";
import { useNow } from "../hooks/useNow";
import { dateKey, greeting, currentWeek } from "../utils/date";

import Mascot from "../components/Mascot";
import Page from "../components/Page";
import BottomSheet from "../components/BottomSheet";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const nombre = displayNameOf(user, profile);
  const now = useNow();
  const streak = currentStreak(profile, now);
  const week = currentWeek(now);
  const todayKey = dateKey(now);

  const [sheet, setSheet] = useState(null); // { key, label, num, loading, summary, isToday }

  // Al tocar un día (hoy o anterior): abre la hoja con el resumen de ese chat.
  async function openDay(day) {
    if (day.key > todayKey) return; // futuros no
    const isToday = day.key === todayKey;
    setSheet({ ...day, isToday, loading: true, summary: null });
    try {
      const snap = await getDoc(doc(db, "users", user.uid, "chats", day.key));
      const data = snap.exists() ? snap.data() : null;
      setSheet({
        ...day,
        isToday,
        loading: false,
        summary: data?.summary || data?.lastMessage || null,
      });
    } catch {
      setSheet({ ...day, isToday, loading: false, summary: null });
    }
  }

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-24 flex-1 overflow-y-auto px-5">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-bold dark:bg-neutral-900">
            <Flame size={16} /> {streak}
          </div>
          <div className="text-center tracking-[-0.5px]">
            <div className="text-lg font-bold">{greeting(now)},</div>
            <div className="text-lg font-semibold text-neutral-400">{nombre}</div>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 transition-transform active:scale-95 dark:border-neutral-800"
          >
            <User size={20} />
          </button>
        </header>

        {/* Calendario semanal (lunes a domingo) */}
        <div className="mb-8 flex justify-between">
          {week.map((d) => {
            const isToday = d.key === todayKey;
            const isFuture = d.key > todayKey;
            return (
              <button
                key={d.key}
                onClick={() => openDay(d)}
                disabled={isFuture}
                className={`flex w-10 flex-col items-center gap-2 rounded-xl px-2 py-3 transition-transform active:scale-95 ${
                  isToday ? "border border-neutral-200 shadow-sm dark:border-neutral-800" : ""
                } ${isFuture ? "cursor-default" : ""}`}
              >
                <span className={`text-[11px] font-semibold ${isToday ? "" : "text-neutral-400"}`}>
                  {d.label}
                </span>
                <span className={`text-[15px] font-bold ${isToday ? "" : "text-neutral-400"}`}>
                  {d.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTA grande hacia el Chat */}
        <motion.button
          onClick={() => navigate("/chat")}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
          className="w-full rounded-[36px] bg-neutral-900 p-8 text-center text-white transition-transform active:scale-[0.98] dark:ring-1 dark:ring-neutral-800"
        >
          <div className="mb-6 flex justify-center">
            <Mascot state="greeting" size={56} />
          </div>
          <div className="mb-3 text-[13px] font-medium uppercase tracking-widest text-neutral-500">
            Check-in diario
          </div>
          <div className="mb-8 text-[22px] font-bold leading-snug tracking-[-0.5px]">
            Hola {nombre}, ¿qué tal si reflexionamos sobre tu día?
          </div>
          <div className="flex items-center justify-center gap-2 rounded-full bg-white py-4 text-[15px] font-bold text-black">
            <MessageCircle size={18} /> Empezar <ChevronRight size={18} strokeWidth={2.5} />
          </div>
        </motion.button>
      </div>

      {/* Hoja inferior con el resumen del día seleccionado */}
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)}>
        {sheet && (
          <div>
            <h3 className="mb-1 text-xl font-bold tracking-[-0.5px]">
              {sheet.label} {sheet.num}
            </h3>
            {sheet.loading ? (
              <p className="text-sm text-neutral-400">Cargando…</p>
            ) : sheet.summary ? (
              <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {sheet.summary}
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-neutral-400">
                {sheet.isToday
                  ? "Aún no has reflexionado hoy. Cuando quieras, empieza tu check-in."
                  : "No reflexionaste este día. Cada pausa cuenta, sin presión."}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </Page>
  );
}
