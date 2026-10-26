// pages/Stats.jsx
// ----------------------------------------------------------------------------
// 7. Stats: selector "¿Cómo te sientes hoy?" con 5 emojis; al pulsar se guarda
// en Firestore y la sección hace fade-out dejando "Registro completado".
// Grid mensual de 7 columnas; día registrado = círculo negro. Al tocar un día
// registrado: flip 3D (rotateY) que revela el emoji, se mantiene 3 s y vuelve.
// Los ánimos llegan ya cargados desde DataContext: al entrar se pinta el estado
// real directamente, sin mostrar el selector un instante.
// ----------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Flame } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { db } from "../services/firebase";
import { touchStreak } from "../services/streak";
import { useNow } from "../hooks/useNow";
import { dateKey } from "../utils/date";
import Page from "../components/Page";

const EMOJIS = ["😢", "😟", "😐", "🙂", "😁"];
const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Índice de columna (0=lunes..6=domingo) para un día concreto.
function mondayIndex(date) {
  const js = date.getDay(); // 0=domingo
  return js === 0 ? 6 : js - 1;
}

export default function Stats() {
  const { user } = useAuth();
  const { moods } = useData(); // { "YYYY-MM-DD": emoji } | null mientras carga
  const now = useNow();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayKey = dateKey(now);

  const [picked, setPicked] = useState(null); // emoji recién pulsado (respuesta inmediata)
  const [flipped, setFlipped] = useState(null); // key del día girado
  const [celebrate, setCelebrate] = useState(0); // racha a celebrar tras registrar
  const flipTimer = useRef(null);

  const moodOf = (key) => moods?.[key] || (key === todayKey ? picked : null);
  const registeredToday = !!moodOf(todayKey);

  async function registrar(emoji) {
    if (!user || registeredToday) return;
    setPicked(emoji);
    try {
      await setDoc(doc(db, "users", user.uid, "moods", todayKey), {
        emoji,
        createdAt: serverTimestamp(),
      });
      // Registrar el ánimo también cuenta como check-in del día (racha).
      const res = await touchStreak(user.uid);
      if (res?.incremented) setCelebrate(res.streak);
    } catch {
      /* si falla la escritura, la UI ya refleja el registro */
    }
  }

  function flip(key) {
    if (!moodOf(key)) return; // solo días registrados
    clearTimeout(flipTimer.current);
    setFlipped(key);
    // Se mantiene 3 s y vuelve a girar al número.
    flipTimer.current = setTimeout(() => setFlipped(null), 3000);
  }

  useEffect(() => () => clearTimeout(flipTimer.current), []);

  // Construcción del grid del mes con huecos iniciales para alinear por semana.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstIndex = mondayIndex(new Date(year, month, 1));
  const cells = [
    ...Array.from({ length: firstIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Page>
      <motion.div
        layoutScroll
        className="no-scrollbar pt-safe-14 pb-safe-24 flex-1 overflow-y-auto px-5"
      >
        <h1 className="mb-6 text-[28px] font-bold tracking-[-0.5px]">Estadísticas</h1>

        {/* Hasta tener los ánimos no se pinta nada: nunca un estado provisional. */}
        {moods !== null && (
          <>
            {/* Selector de ánimo (desaparece al registrar). initial={false}: al
                volver a la pantalla aparece ya colocado, sin animar. */}
            <div className="relative mb-9">
              <AnimatePresence mode="popLayout" initial={false}>
                {registeredToday ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="flex min-h-8 items-center justify-between"
                  >
                    <p className="text-[15px] font-semibold text-neutral-400">Registro completado</p>
                    {celebrate > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18 }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 text-sm font-bold text-white dark:bg-white dark:text-black"
                      >
                        <Flame size={15} /> Racha de {celebrate} {celebrate === 1 ? "día" : "días"}
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="selector" exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                    <p className="mb-4 text-[15px] font-semibold text-neutral-400">
                      ¿Cómo te sientes hoy?
                    </p>
                    <div className="flex justify-between">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => registrar(e)}
                          className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-100 text-2xl transition-transform active:scale-90 dark:bg-neutral-900"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* layout="position": al cambiar la altura de arriba, sube suave en vez de saltar. */}
            <motion.div layout="position" transition={{ duration: 0.35, ease: "easeInOut" }}>
              <p className="mb-4 text-[15px] font-semibold text-neutral-400">Progresión mensual</p>
              <div className="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
                <div className="mb-4 grid grid-cols-7 text-center text-[11px] font-bold text-neutral-400">
                  {WEEK_LABELS.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2.5">
                  {cells.map((day, i) => {
                    if (day === null) return <div key={`e${i}`} className="aspect-square" />;
                    const key = dateKey(new Date(year, month, day));
                    const emoji = moodOf(key);
                    const isFilled = !!emoji;
                    const isFlipped = flipped === key;
                    return (
                      <div key={key} className="aspect-square" style={{ perspective: 600 }}>
                        <motion.button
                          onClick={() => flip(key)}
                          disabled={!isFilled}
                          className="relative h-full w-full"
                          style={{ transformStyle: "preserve-3d" }}
                          initial={false}
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          {/* Cara frontal: número */}
                          <div
                            className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-bold ${
                              isFilled
                                ? "bg-black text-white dark:bg-white dark:text-black"
                                : "border border-neutral-200 text-neutral-400 dark:border-neutral-800"
                            }`}
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            {day}
                          </div>
                          {/* Cara trasera: emoji */}
                          <div
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral-100 text-base dark:bg-neutral-800"
                            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                          >
                            {emoji}
                          </div>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </Page>
  );
}
