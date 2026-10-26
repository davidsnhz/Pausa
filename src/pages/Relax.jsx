// pages/Relax.jsx
// ----------------------------------------------------------------------------
// 5/6. Relax con 3 tabs. CON navbar.
//  (a) Sonidos: los 8 exactos, reproducción REAL en loop desde
//      /public/sounds/{id}.mp3 (un solo sonido a la vez).
//  (b) Respiración: mascota grande meditando + "Inhala"/"Exhala" cada 4s.
//  (c) Ejercicios: tarjetas informativas.
// ----------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AudioWaveform, Wind, Waves, Droplets, CloudRain, CloudRainWind,
  Trees, Flame, Play, Loader2,
} from "lucide-react";

import Mascot from "../components/Mascot";
import Page from "../components/Page";

// Los 8 sonidos EXACTOS. id = nombre del archivo en /public/sounds/{id}.mp3
const SOUNDS = [
  { id: "ruido-marron", name: "Ruido marrón", Icon: AudioWaveform },
  { id: "ruido-blanco", name: "Ruido blanco", Icon: Wind },
  { id: "playa", name: "Playa", Icon: Waves },
  { id: "arroyo", name: "Arroyo", Icon: Droplets },
  { id: "lluvia-suave", name: "Lluvia suave", Icon: CloudRain },
  { id: "lluvia-tejado", name: "Lluvia en el tejado", Icon: CloudRainWind },
  { id: "bosque", name: "Bosque", Icon: Trees },
  { id: "fogata", name: "Fuego de fogata", Icon: Flame },
];

const TABS = ["Sonidos", "Respiración", "Ejercicios"];

export default function Relax() {
  const [tab, setTab] = useState("Sonidos");

  return (
    <Page>
      <div className="pt-safe-14 flex flex-1 flex-col px-5">
        <h1 className="mb-5 text-[28px] font-bold tracking-[-0.5px]">Relax</h1>

        {/* Tabs superiores */}
        <div className="mb-5 flex gap-6 border-b border-neutral-200 pb-3 text-sm font-semibold dark:border-neutral-800">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="relative">
              <span className={tab === t ? "" : "text-neutral-400"}>{t}</span>
              {tab === t && (
                <motion.span
                  layoutId="relaxTab"
                  className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-black dark:bg-white"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "Sonidos" && <SoundsTab />}
        {tab === "Respiración" && <BreathingTab />}
        {tab === "Ejercicios" && <ExercisesTab />}
      </div>
    </Page>
  );
}

/* (a) Sonidos con reproducción real */
function SoundsTab() {
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [unavailable, setUnavailable] = useState([]); // ids cuyo mp3 no carga
  const audioRef = useRef(null);

  // Al desmontar, parar cualquier audio.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function stop() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  }

  function toggle(sound) {
    // Si ya suena (o está cargando) este, parar.
    if (playingId === sound.id || loadingId === sound.id) {
      stop();
      return;
    }
    // Parar el anterior y reproducir el nuevo (uno a la vez).
    stop();
    const audio = new Audio(`/sounds/${sound.id}.mp3`);
    audio.loop = true;
    audioRef.current = audio;
    setLoadingId(sound.id);
    // Solo se marca como "sonando" cuando de verdad empieza a sonar.
    audio
      .play()
      .then(() => {
        if (audioRef.current !== audio) return; // se pulsó otro mientras cargaba
        setLoadingId(null);
        setPlayingId(sound.id);
      })
      .catch(() => {
        if (audioRef.current !== audio) return;
        // El mp3 aún no existe o no se puede reproducir (ver public/sounds/README.md).
        audioRef.current = null;
        setLoadingId(null);
        setUnavailable((u) => (u.includes(sound.id) ? u : [...u, sound.id]));
      });
  }

  return (
    <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pb-24">
      {SOUNDS.map((sound, i) => {
        const playing = playingId === sound.id;
        const { Icon } = sound;
        return (
          <motion.button
            key={sound.id}
            onClick={() => toggle(sound)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.04, ease: "easeOut" }}
            className={`flex w-full items-center gap-4 rounded-[20px] p-3.5 transition-[transform,background,border] active:scale-[0.98] ${
              playing
                ? "border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-900/60"
            }`}
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                playing
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white dark:bg-neutral-800"
              }`}
            >
              <Icon size={20} />
            </span>
            <span className="flex-1 text-left text-sm font-semibold">{sound.name}</span>
            {playing ? (
              <Equalizer />
            ) : loadingId === sound.id ? (
              <Loader2 size={18} className="animate-spin text-neutral-400" />
            ) : unavailable.includes(sound.id) ? (
              <span className="text-xs font-medium text-neutral-400">No disponible</span>
            ) : (
              <Play size={18} className="text-neutral-400" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// Barras de ecualizador animadas para el sonido en reproducción.
function Equalizer() {
  return (
    <div className="flex h-4 items-end gap-[3px] pr-0.5">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-current"
          animate={{ height: [5, 15, 7, 13, 5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* (b) Respiración — ciclo guiado y pausado para relajar de verdad.
   Inhala (4s, crecer) → Sostén (4s) → Exhala (6s, encoger) → Sostén (2s).
   Cadencia lenta (~3-4 respiraciones/min), estilo respiración de calma. */
const BREATH_CYCLE = [
  { label: "Inhala", secs: 4, scale: 1.18 },
  { label: "Sostén", secs: 4, scale: 1.18 },
  { label: "Exhala", secs: 6, scale: 0.82 },
  { label: "Sostén", secs: 2, scale: 0.82 },
];

function BreathingTab() {
  const [i, setI] = useState(0);
  const phase = BREATH_CYCLE[i];

  useEffect(() => {
    // Cada fase dura lo suyo; al terminar, pasa a la siguiente (en bucle).
    const t = setTimeout(() => setI((p) => (p + 1) % BREATH_CYCLE.length), phase.secs * 1000);
    return () => clearTimeout(t);
  }, [i, phase.secs]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-24">
      {/* La mascota crece al inhalar, se mantiene y encoge al exhalar. */}
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ scale: phase.scale }}
          transition={{ duration: phase.secs, ease: "easeInOut" }}
        >
          <Mascot state="meditating" size={160} />
        </motion.div>
      </div>
      {/* El texto se re-monta con cada fase (key) y hace un fade suave. */}
      <motion.p
        key={i}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8 text-2xl font-bold tracking-[-0.5px]"
      >
        {phase.label}
      </motion.p>
      <p className="mt-2 text-sm text-neutral-400">Sigue el ritmo de la mascota</p>
    </div>
  );
}

/* (c) Ejercicios */
const EXERCISES = [
  {
    title: "5-4-3-2-1",
    body: "Nombra 5 cosas que ves, 4 que oyes, 3 que tocas, 2 que hueles y 1 que saboreas. Vuelve al presente.",
  },
  {
    title: "Respiración en caja",
    body: "Inhala 4 s, retén 4 s, exhala 4 s, retén 4 s. Repite varias veces con calma.",
  },
  {
    title: "Escaneo corporal",
    body: "Recorre tu cuerpo de los pies a la cabeza, notando cada zona sin intentar cambiar nada.",
  },
  {
    title: "Descarga mental",
    body: "Escribe todo lo que ronda tu cabeza, sin filtrar. Sacarlo fuera aligera la mente.",
  },
];

function ExercisesTab() {
  return (
    <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto pb-24">
      {EXERCISES.map((ex, i) => (
        <motion.div
          key={ex.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: i * 0.05, ease: "easeOut" }}
          className="rounded-3xl bg-neutral-100 p-5 dark:bg-neutral-900/60"
        >
          <h3 className="mb-1.5 text-base font-bold tracking-[-0.5px]">{ex.title}</h3>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {ex.body}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
