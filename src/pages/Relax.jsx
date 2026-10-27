// pages/Relax.jsx
// ----------------------------------------------------------------------------
// 5/6. Relax con 3 tabs. CON navbar.
//  (a) Sonidos: los 8 exactos, reproducción REAL en loop desde
//      /public/sounds/{id}.mp3 (un solo sonido a la vez), con temporizador.
//  (b) Respiración: mascota grande meditando + "Inhala"/"Exhala" cada 4s. El
//      sonido sigue sonando al cambiar de tab y también se puede elegir aquí.
//  (c) Ejercicios: tarjetas informativas.
// El sonido vive en Relax (no en cada tab): solo se para al salir de Relax.
// ----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AudioWaveform, Wind, WavesHorizontal, Droplets, CloudRain, CloudRainWind,
  Trees, Flame, Play, LoaderCircle, EighthNotes, X,
} from "lucide-react";

import Mascot from "../components/Mascot";
import Page from "../components/Page";
import BottomSheet from "../components/BottomSheet";
import { useEnterOnce } from "../hooks/useEnterOnce";

// Los 8 sonidos EXACTOS. id = nombre del archivo en /public/sounds/{id}.mp3
const SOUNDS = [
  { id: "ruido-marron", name: "Ruido marrón", Icon: AudioWaveform },
  { id: "ruido-blanco", name: "Ruido blanco", Icon: Wind },
  { id: "playa", name: "Playa", Icon: WavesHorizontal },
  { id: "arroyo", name: "Arroyo", Icon: Droplets },
  { id: "lluvia-suave", name: "Lluvia suave", Icon: CloudRain },
  { id: "lluvia-tejado", name: "Lluvia en el tejado", Icon: CloudRainWind },
  { id: "bosque", name: "Bosque", Icon: Trees },
  { id: "fogata", name: "Fuego de fogata", Icon: Flame },
];

const TABS = ["Sonidos", "Respiración", "Ejercicios"];

// Opciones del temporizador, en minutos (null = sin límite).
const TIMER_OPTIONS = [null, 15, 30, 60];

export default function Relax() {
  const [tab, setTab] = useState("Sonidos");
  const ambient = useAmbient();

  return (
    <Page>
      {/* min-h-0: deja que la lista haga scroll en pantallas pequeñas en vez
          de crecer y quedar cortada. */}
      <div className="pt-safe-14 flex min-h-0 flex-1 flex-col px-5">
        <h1 className="mb-5 text-[28px] font-bold tracking-[-0.5px]">Relax</h1>

        {/* Tabs superiores */}
        <div className="mb-5 flex gap-6 border-b border-neutral-200 pb-3 text-sm font-semibold dark:border-neutral-800">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className="relative">
              <span className={tab === t ? "" : "text-neutral-400"}>{t}</span>
              {tab === t && (
                <motion.span
                  layoutId="relaxTab"
                  className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-black dark:bg-white"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "Sonidos" && <SoundsTab ambient={ambient} />}
        {tab === "Respiración" && <BreathingTab ambient={ambient} />}
        {tab === "Ejercicios" && <ExercisesTab />}
      </div>
    </Page>
  );
}

/* Reproductor del sonido ambiental (uno a la vez, en bucle) + temporizador.
   iOS no deja cambiar el volumen desde la web: se usan los botones del móvil. */
function useAmbient() {
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [unavailable, setUnavailable] = useState([]); // ids cuyo mp3 no carga
  const [timer, setTimerMinutes] = useState(null); // minutos elegidos (null = sin límite)
  const [endsAt, setEndsAt] = useState(null); // cuándo se apaga (ms) si hay temporizador
  const [, setTick] = useState(0); // refresca la cuenta atrás
  const audioRef = useRef(null);
  const fadeRef = useRef(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const stop = useCallback(() => {
    clearInterval(fadeRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
    setEndsAt(null);
  }, []);

  // Al salir de Relax, parar cualquier audio.
  useEffect(() => stop, [stop]);

  function toggle(sound) {
    // Si ya suena (o está cargando) este, parar.
    if (playingId === sound.id || loadingId === sound.id) {
      stop();
      return;
    }
    // Cambiar de sonido no reinicia el temporizador que ya corre.
    clearInterval(fadeRef.current);
    audioRef.current?.pause();
    const audio = new Audio(`/sounds/${sound.id}.mp3`);
    audio.loop = true;
    audioRef.current = audio;
    setPlayingId(null);
    setLoadingId(sound.id);
    // Solo se marca como "sonando" cuando de verdad empieza a sonar.
    audio
      .play()
      .then(() => {
        if (audioRef.current !== audio) return; // se pulsó otro mientras cargaba
        setLoadingId(null);
        setPlayingId(sound.id);
        setEndsAt((e) => e ?? (timerRef.current ? Date.now() + timerRef.current * 60000 : null));
      })
      .catch(() => {
        if (audioRef.current !== audio) return;
        // El mp3 aún no existe o no se puede reproducir (ver public/sounds/README.md).
        audioRef.current = null;
        setLoadingId(null);
        setEndsAt(null);
        setUnavailable((u) => (u.includes(sound.id) ? u : [...u, sound.id]));
      });
  }

  // Elegir temporizador: si ya suena algo, empieza a contar desde ahora.
  function setTimer(minutes) {
    setTimerMinutes(minutes);
    setEndsAt(minutes && audioRef.current ? Date.now() + minutes * 60000 : null);
  }

  // Cuenta atrás. Al llegar a cero baja el volumen poco a poco (donde el
  // navegador lo permite) y para.
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => {
      if (Date.now() < endsAt) {
        setTick((t) => t + 1);
        return;
      }
      clearInterval(id);
      setTimerMinutes(null);
      const audio = audioRef.current;
      if (!audio) return stop();
      let volume = 1;
      fadeRef.current = setInterval(() => {
        volume -= 0.05;
        try {
          audio.volume = Math.max(0, volume);
        } catch {
          /* iOS: volumen de solo lectura */
        }
        if (volume <= 0) stop();
      }, 150);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, stop]);

  const remaining = endsAt ? Math.max(0, endsAt - Date.now()) : null;
  return { playingId, loadingId, unavailable, toggle, stop, timer, setTimer, remaining };
}

/* (a) Sonidos con reproducción real */
function SoundsTab({ ambient }) {
  const animateIn = useEnterOnce("relax-sounds");

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
      <motion.div
        initial={animateIn ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <TimerControl ambient={ambient} />
      </motion.div>
      <div className="space-y-2">
        {SOUNDS.map((sound, i) => (
          <motion.div
            key={sound.id}
            initial={animateIn ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: (i + 1) * 0.04, ease: "easeOut" }}
          >
            <SoundButton sound={sound} ambient={ambient} onClick={() => ambient.toggle(sound)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Fila de un sonido (lista de Sonidos y hoja de Respiración).
function SoundButton({ sound, ambient, onClick }) {
  const playing = ambient.playingId === sound.id;
  const { Icon } = sound;
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-[20px] p-3.5 transition-[transform,background,border] active:scale-[0.98] ${
        playing
          ? "border border-neutral-200 bg-white shadow-xs dark:border-neutral-700 dark:bg-neutral-900"
          : "bg-neutral-100 dark:bg-neutral-900/60"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
          playing ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white dark:bg-neutral-800"
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="flex-1 text-left text-sm font-semibold">{sound.name}</span>
      {playing ? (
        <Equalizer />
      ) : ambient.loadingId === sound.id ? (
        <LoaderCircle size={18} className="animate-spin text-neutral-400" />
      ) : ambient.unavailable.includes(sound.id) ? (
        <span className="text-xs font-medium text-neutral-400">No disponible</span>
      ) : (
        <Play size={18} className="text-neutral-400" />
      )}
    </button>
  );
}

// "Apagar en": sin límite / 15 min / 30 min / 1 h. Con un sonido en marcha, el
// texto de la izquierda muestra cuánto falta.
function TimerControl({ ambient }) {
  const { timer, setTimer, remaining } = ambient;
  const minutesLeft = remaining === null ? null : Math.ceil(remaining / 60000);
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-[13px] font-semibold text-neutral-400">
        {minutesLeft === null ? "Apagar en" : minutesLeft > 0 ? `Quedan ${minutesLeft} min` : "Apagando…"}
      </span>
      <div className="flex shrink-0 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
        {TIMER_OPTIONS.map((m) => {
          const active = timer === m;
          return (
            <button
              key={m ?? "no"}
              onClick={() => setTimer(m)}
              className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                active ? "" : "text-neutral-400"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="relaxTimer"
                  className="absolute inset-0 rounded-full bg-white shadow-xs dark:bg-black"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative">{!m ? "No" : m < 60 ? `${m} min` : `${m / 60} h`}</span>
            </button>
          );
        })}
      </div>
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

function BreathingTab({ ambient }) {
  const [i, setI] = useState(0);
  const phase = BREATH_CYCLE[i];
  const [picker, setPicker] = useState(false); // hoja para elegir sonido
  const [chosenId, setChosenId] = useState(null); // elegido en la hoja

  useEffect(() => {
    // Cada fase dura lo suyo; al terminar, pasa a la siguiente (en bucle).
    const t = setTimeout(() => setI((p) => (p + 1) % BREATH_CYCLE.length), phase.secs * 1000);
    return () => clearTimeout(t);
  }, [i, phase.secs]);

  // La hoja se cierra cuando el sonido elegido empieza a sonar (si no está
  // disponible, sigue abierta mostrando "No disponible").
  useEffect(() => {
    if (chosenId && ambient.playingId === chosenId) {
      setPicker(false);
      setChosenId(null);
    }
  }, [chosenId, ambient.playingId]);

  function choose(sound) {
    if (ambient.playingId === sound.id) {
      setPicker(false);
      return;
    }
    setChosenId(sound.id);
    ambient.toggle(sound);
  }

  // my-auto centra en vertical, y si no cabe (pantallas bajas) se puede hacer
  // scroll sin que se corte la parte de arriba.
  return (
    <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto pb-24">
      <div className="my-auto flex flex-col items-center">
        {/* La mascota crece al inhalar, se mantiene y encoge al exhalar. En
            pantallas bajas (iPhone SE) el hueco es algo menor. */}
        <div className="flex h-64 items-center justify-center [@media(max-height:700px)]:h-52">
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

        <SoundChip ambient={ambient} onOpen={() => setPicker(true)} />
      </div>

      <BottomSheet open={picker} onClose={() => setPicker(false)}>
        <h3 className="mb-4 text-xl font-bold tracking-[-0.5px]">Sonido de fondo</h3>
        <div className="no-scrollbar max-h-[55vh] space-y-2 overflow-y-auto">
          {SOUNDS.map((sound) => (
            <SoundButton key={sound.id} sound={sound} ambient={ambient} onClick={() => choose(sound)} />
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

// Sonido de fondo durante la respiración. Mismo alto con y sin sonido.
function SoundChip({ ambient, onOpen }) {
  const id = ambient.playingId || ambient.loadingId;
  const sound = SOUNDS.find((s) => s.id === id);

  if (!sound) {
    return (
      <button
        onClick={onOpen}
        className="mt-8 flex h-10 items-center gap-2 rounded-full bg-neutral-100 px-4 text-sm font-semibold transition-transform active:scale-95 dark:bg-neutral-900"
      >
        <EighthNotes size={16} /> Añadir sonido de fondo
      </button>
    );
  }

  const { Icon } = sound;
  return (
    <div className="mt-8 flex h-10 items-center rounded-full bg-neutral-100 pl-1.5 pr-1 dark:bg-neutral-900">
      <button onClick={onOpen} className="flex items-center gap-2.5 pr-2 transition-transform active:scale-95">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
          <Icon size={15} />
        </span>
        <span className="text-sm font-semibold">{sound.name}</span>
        {ambient.playingId ? (
          <Equalizer />
        ) : (
          <LoaderCircle size={16} className="animate-spin text-neutral-400" />
        )}
      </button>
      <button
        onClick={ambient.stop}
        aria-label="Quitar sonido"
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-transform active:scale-90"
      >
        <X size={16} />
      </button>
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
  const animateIn = useEnterOnce("relax-exercises");
  return (
    <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto pb-24">
      {EXERCISES.map((ex, i) => (
        <motion.div
          key={ex.title}
          initial={animateIn ? { opacity: 0, y: 8 } : false}
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
