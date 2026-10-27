// pages/Stats.jsx
// ----------------------------------------------------------------------------
// 7. Stats: selector "¿Cómo te sientes hoy?" con 5 emojis; al pulsar se guarda
// en Firestore y la sección hace fade-out dejando "Registro completado" (con
// opción de cambiarlo durante el día).
// Calendario mensual de 7 columnas con flechas (o deslizando) para ver meses
// anteriores; día registrado = círculo negro. Al tocar un día registrado: flip
// 3D (rotateY) que revela el emoji, se mantiene 3 s y vuelve. Debajo, el
// resumen del mes: días registrados, ánimo medio, reparto y comparación con el
// mes anterior.
// Los ánimos llegan ya cargados desde DataContext: al entrar se pinta el estado
// real directamente, sin mostrar el selector un instante.
// ----------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { db } from "../services/firebase";
import { touchStreak } from "../services/streak";
import { useNow } from "../hooks/useNow";
import { dateKey } from "../utils/date";
import { EMOJIS, MOOD_LABELS, MONTHS, monthSummary } from "../utils/mood";
import Page from "../components/Page";

const WEEK_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// Índice de columna (0=lunes..6=domingo) para un día concreto.
function mondayIndex(date) {
  const js = date.getDay(); // 0=domingo
  return js === 0 ? 6 : js - 1;
}

// Meses como número correlativo (año*12 + mes) para comparar y moverse.
const monthIndex = (y, m) => y * 12 + m;
const fromIndex = (i) => ({ year: Math.floor(i / 12), month: i % 12 });

export default function Stats() {
  const { user } = useAuth();
  const { moods } = useData(); // { "YYYY-MM-DD": emoji } | null mientras carga
  const now = useNow();
  const todayKey = dateKey(now);
  const currentIndex = monthIndex(now.getFullYear(), now.getMonth());

  const [picked, setPicked] = useState(null); // emoji recién pulsado (respuesta inmediata)
  const [editing, setEditing] = useState(false); // cambiando el ánimo de hoy
  const [celebrate, setCelebrate] = useState(0); // racha a celebrar tras registrar
  const [viewIndex, setViewIndex] = useState(currentIndex); // mes que se ve
  const [dir, setDir] = useState(0); // -1 / 1: hacia dónde entra el mes nuevo

  // Lo último que se ha elegido hoy manda sobre lo leído (respuesta inmediata).
  const moodOf = (key) => (key === todayKey && picked) || moods?.[key] || null;
  const todayMood = moodOf(todayKey);

  // El aviso de racha se muestra un momento y deja paso a "Cambiar".
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(0), 4000);
    return () => clearTimeout(t);
  }, [celebrate]);

  async function choose(emoji) {
    if (!user) return;
    const first = !todayMood;
    setEditing(false);
    if (emoji === todayMood) return;
    setPicked(emoji);
    try {
      await setDoc(
        doc(db, "users", user.uid, "moods", todayKey),
        first ? { emoji, createdAt: serverTimestamp() } : { emoji, updatedAt: serverTimestamp() },
        { merge: true }
      );
      // Registrar el ánimo también cuenta como check-in del día (racha).
      if (first) {
        const res = await touchStreak(user.uid);
        if (res?.incremented) setCelebrate(res.streak);
      }
    } catch {
      /* si falla la escritura, la UI ya refleja el registro */
    }
  }

  // Primer mes con algún registro: no se puede ir más atrás.
  const keys = Object.keys(moods || {});
  const firstKey = keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : todayKey;
  const minIndex = Math.min(
    currentIndex,
    monthIndex(Number(firstKey.slice(0, 4)), Number(firstKey.slice(5, 7)) - 1)
  );

  function go(step) {
    const next = viewIndex + step;
    if (next < minIndex || next > currentIndex) return;
    setDir(step);
    setViewIndex(next);
  }

  const showPicker = !todayMood || editing;

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
                {showPicker ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[15px] font-semibold text-neutral-400">¿Cómo te sientes hoy?</p>
                      {editing && (
                        <button
                          onClick={() => setEditing(false)}
                          className="text-[15px] font-semibold transition-opacity active:opacity-60"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => choose(e)}
                          aria-label={MOOD_LABELS[EMOJIS.indexOf(e)]}
                          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-100 text-2xl transition-transform active:scale-90 dark:bg-neutral-900 ${
                            e === todayMood ? "ring-2 ring-black dark:ring-white" : ""
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="flex min-h-8 items-center justify-between"
                  >
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-neutral-400">
                      Registro completado <span className="text-lg leading-none">{todayMood}</span>
                    </p>
                    <AnimatePresence mode="wait" initial={false}>
                      {celebrate > 0 ? (
                        <motion.div
                          key="streak"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.2 } }}
                          transition={{ type: "spring", stiffness: 380, damping: 18 }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 text-sm font-bold text-white dark:bg-white dark:text-black"
                        >
                          <Flame size={15} /> Racha de {celebrate} {celebrate === 1 ? "día" : "días"}
                        </motion.div>
                      ) : (
                        <motion.button
                          key="change"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setEditing(true)}
                          className="text-[15px] font-semibold transition-opacity active:opacity-60"
                        >
                          Cambiar
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* layout="position": al cambiar la altura de arriba, sube suave en vez de saltar. */}
            <motion.div layout="position" transition={{ duration: 0.35, ease: "easeInOut" }}>
              <p className="mb-4 text-[15px] font-semibold text-neutral-400">Progresión mensual</p>
              <MonthCalendar
                {...fromIndex(viewIndex)}
                dir={dir}
                moodOf={moodOf}
                canPrev={viewIndex > minIndex}
                canNext={viewIndex < currentIndex}
                onStep={go}
              />
              <MonthSummary moods={moods} picked={picked} todayKey={todayKey} now={now} viewIndex={viewIndex} />
            </motion.div>
          </>
        )}
      </motion.div>
    </Page>
  );
}

/* Calendario de un mes. Si el mes nuevo tiene otro número de semanas, la
   tarjeta cambia de alto con una transición (y lo de abajo la sigue). */
function MonthCalendar({ year, month, dir, moodOf, canPrev, canNext, onStep }) {
  const [flipped, setFlipped] = useState(null); // key del día girado
  const flipTimer = useRef(null);
  useEffect(() => () => clearTimeout(flipTimer.current), []);

  function flip(key) {
    if (!moodOf(key)) return; // solo días registrados
    clearTimeout(flipTimer.current);
    setFlipped(key);
    // Se mantiene 3 s y vuelve a girar al número.
    flipTimer.current = setTimeout(() => setFlipped(null), 3000);
  }

  // Construcción del grid del mes con huecos para alinear por semana.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstIndex = mondayIndex(new Date(year, month, 1));
  const cells = [
    ...Array.from({ length: firstIndex }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Deslizar en horizontal también cambia de mes.
  function onPanEnd(_, { offset }) {
    if (Math.abs(offset.x) < 50 || Math.abs(offset.x) < Math.abs(offset.y)) return;
    onStep(offset.x < 0 ? 1 : -1);
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="mb-4 flex items-center justify-between">
        <MonthArrow label="Mes anterior" disabled={!canPrev} onClick={() => onStep(-1)}>
          <ChevronLeft size={18} />
        </MonthArrow>
        <span className="text-[15px] font-bold tracking-[-0.3px]">
          {MONTHS[month]} {year}
        </span>
        <MonthArrow label="Mes siguiente" disabled={!canNext} onClick={() => onStep(1)}>
          <ChevronRight size={18} />
        </MonthArrow>
      </div>

      <motion.div onPanEnd={onPanEnd} style={{ touchAction: "pan-y" }}>
        <div className="mb-4 grid grid-cols-7 text-center text-[11px] font-bold text-neutral-400">
          {WEEK_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {/* El mes nuevo entra desde el lado hacia el que se avanza. */}
        <AutoHeight>
          <motion.div
            key={`${year}-${month}`}
            initial={dir ? { opacity: 0, x: dir * 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-7 gap-2.5"
          >
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
          </motion.div>
        </AutoHeight>
      </motion.div>
    </div>
  );
}

// Alto que sigue al contenido con una transición en vez de saltar. Solo
// recorta mientras anima (para no cortar el giro de los días el resto del tiempo).
function AutoHeight({ children }) {
  const inner = useRef(null);
  const [height, setHeight] = useState("auto");
  const [animating, setAnimating] = useState(false);

  useLayoutEffect(() => {
    const el = inner.current;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      style={{ overflow: animating ? "hidden" : "visible" }}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}

function MonthArrow({ label, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 transition-[opacity,transform] active:scale-90 disabled:opacity-0 dark:bg-neutral-900"
    >
      {children}
    </button>
  );
}

/* Resumen del mes que se está viendo. */
function MonthSummary({ moods, picked, todayKey, now, viewIndex }) {
  const { year, month } = fromIndex(viewIndex);
  const prev = fromIndex(viewIndex - 1);
  const isCurrent = viewIndex === monthIndex(now.getFullYear(), now.getMonth());
  // El ánimo recién elegido cuenta ya, aunque Firestore aún no lo haya devuelto.
  const all = picked ? { ...moods, [todayKey]: picked } : moods;

  const s = monthSummary(all, year, month);
  const p = monthSummary(all, prev.year, prev.month);
  const elapsed = isCurrent ? now.getDate() : new Date(year, month + 1, 0).getDate();
  const max = Math.max(...s.counts, 1);

  // Comparación con el mes anterior, solo con datos suficientes en ambos.
  let trend = null;
  if (s.scored >= 3 && p.scored >= 3) {
    const diff = s.avg - p.avg;
    const prevName = MONTHS[prev.month].toLowerCase();
    trend =
      diff >= 0.3
        ? `Algo mejor que en ${prevName}`
        : diff <= -0.3
          ? `Algo más difícil que ${prevName}`
          : `Parecido a ${prevName}`;
  }

  return (
    <div className="mt-9">
      <p className="mb-4 text-[15px] font-semibold text-neutral-400">
        Resumen de {MONTHS[month].toLowerCase()}
      </p>

      {s.days === 0 ? (
        <div className="rounded-3xl bg-neutral-100 p-5 text-[15px] leading-relaxed text-neutral-500 dark:bg-neutral-900/60 dark:text-neutral-400">
          {isCurrent
            ? "Aún no hay registros este mes. Cuando quieras, cuéntanos cómo estás."
            : "No hay registros de este mes."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Días registrados">
              {s.days}
              <span className="text-[15px] font-semibold text-neutral-400"> / {elapsed}</span>
            </Tile>
            <Tile label="Ánimo medio">
              {s.avg ? (
                <span className="flex items-center gap-2">
                  <span className="leading-none">{EMOJIS[Math.round(s.avg) - 1]}</span>
                  <span className="text-[15px] font-bold">{MOOD_LABELS[Math.round(s.avg) - 1]}</span>
                </span>
              ) : (
                "—"
              )}
            </Tile>
          </div>

          {/* Reparto: cuántos días con cada ánimo. */}
          <div className="mt-3 rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex items-end justify-between">
              {EMOJIS.map((e, i) => (
                <div key={e} className="flex w-11 flex-col items-center">
                  <span className="mb-1.5 text-[11px] font-bold text-neutral-400">{s.counts[i]}</span>
                  <div className="flex h-16 w-full items-end justify-center">
                    <motion.div
                      className={`w-7 rounded-lg ${
                        s.counts[i] ? "bg-black dark:bg-white" : "bg-neutral-200 dark:bg-neutral-800"
                      }`}
                      initial={false}
                      animate={{ height: s.counts[i] ? `${Math.max(12, (s.counts[i] / max) * 100)}%` : 4 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <span className="mt-2 text-xl leading-none">{e}</span>
                </div>
              ))}
            </div>
          </div>

          {trend && (
            <p className="mt-3 text-center text-sm font-semibold text-neutral-400">{trend}</p>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, children }) {
  return (
    <div className="rounded-3xl bg-neutral-100 p-5 dark:bg-neutral-900/60">
      <p className="text-[13px] font-semibold text-neutral-400">{label}</p>
      <div className="mt-2 text-[28px] font-bold tracking-[-0.5px]">{children}</div>
    </div>
  );
}
