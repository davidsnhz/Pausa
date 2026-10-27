// pages/Dashboard.jsx
// ----------------------------------------------------------------------------
// 3. Dashboard: racha (fuego), saludo dinámico por hora, botón a Perfil,
// calendario semanal con un punto en los días con check-in (ánimo o chat; día
// pasado → BottomSheet con el resumen, ya precargado en DataContext, y botón
// para releer la conversación) y CTA grande oscura con mascota que lleva al
// Chat. CON navbar.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Flame, User, ChevronRight, MessageCircle } from "lucide-react";

import { useAuth, displayNameOf } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { currentStreak } from "../services/streak";
import { useNow } from "../hooks/useNow";
import { useEnterOnce } from "../hooks/useEnterOnce";
import { dateKey, greeting, currentWeek } from "../utils/date";

import Mascot from "../components/Mascot";
import Page from "../components/Page";
import BottomSheet from "../components/BottomSheet";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const { moods, weekChats } = useData();
  const navigate = useNavigate();
  const animateIn = useEnterOnce("dashboard");
  const nombre = displayNameOf(user, profile);
  const now = useNow();
  const streak = currentStreak(profile, now);
  const week = currentWeek(now);
  const todayKey = dateKey(now);

  // El día elegido se conserva al cerrar la hoja: así su contenido no
  // desaparece mientras baja animada.
  const [sheetDay, setSheetDay] = useState(null); // { key, label, num }
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetChat = sheetDay ? weekChats?.[sheetDay.key] : null;
  const sheetSummary = sheetChat?.summary || sheetChat?.lastMessage || null;
  const sheetMood = sheetDay ? moods?.[sheetDay.key] : null;

  // Al tocar un día (hoy o anterior): abre la hoja con el resumen de ese chat.
  function openDay(day) {
    if (day.key > todayKey) return; // futuros no
    setSheetDay(day);
    setSheetOpen(true);
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
            // Mismo criterio que la racha: registró su ánimo o escribió en el chat.
            const checkedIn = !!(moods?.[d.key] || weekChats?.[d.key]);
            return (
              <button
                key={d.key}
                onClick={() => openDay(d)}
                disabled={isFuture}
                className={`relative flex w-10 flex-col items-center gap-2 rounded-xl px-2 py-3 transition-transform active:scale-95 ${
                  isToday ? "border border-neutral-200 shadow-xs dark:border-neutral-800" : ""
                } ${isFuture ? "cursor-default" : ""}`}
              >
                <span className={`text-[11px] font-semibold ${isToday ? "" : "text-neutral-400"}`}>
                  {d.label}
                </span>
                <span className={`text-[15px] font-bold ${isToday ? "" : "text-neutral-400"}`}>
                  {d.num}
                </span>
                {/* En el hueco del padding inferior: no cambia el alto del día. */}
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full bg-black transition-opacity duration-300 dark:bg-white ${
                    checkedIn ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* CTA grande hacia el Chat */}
        <motion.button
          onClick={() => navigate("/chat")}
          initial={animateIn ? { opacity: 0, y: 12 } : false}
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
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {sheetDay && (
          <div>
            <h3 className="mb-1 flex items-center gap-2 text-xl font-bold tracking-[-0.5px]">
              {sheetDay.label} {sheetDay.num}
              {sheetMood && <span className="text-lg leading-none">{sheetMood}</span>}
            </h3>
            {weekChats === null ? (
              <p className="text-sm text-neutral-400">Cargando…</p>
            ) : sheetSummary ? (
              <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {sheetSummary}
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-neutral-400">
                {sheetDay.key === todayKey
                  ? "Aún no has reflexionado hoy. Cuando quieras, empieza tu check-in."
                  : "No reflexionaste este día. Cada pausa cuenta, sin presión."}
              </p>
            )}
            {/* Hoy: ir al chat. Días anteriores con conversación: releerla. */}
            {weekChats !== null && (sheetDay.key === todayKey || sheetChat) && (
              <button
                onClick={() => navigate(sheetDay.key === todayKey ? "/chat" : `/chat/${sheetDay.key}`)}
                className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-neutral-100 py-3.5 text-[15px] font-bold transition-transform active:scale-[0.98] dark:bg-neutral-800"
              >
                {sheetDay.key !== todayKey
                  ? "Leer conversación"
                  : sheetChat
                    ? "Seguir conversación"
                    : "Empezar check-in"}
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </Page>
  );
}
