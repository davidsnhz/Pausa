// PausaMockup.jsx
// ============================================================================
// MOCKUP DE REFERENCIA VISUAL — App "Pausa"
// Este archivo NO es la app real: es la maqueta estática de las 8 vistas
// clave, con el sistema de diseño exacto que debe seguir la implementación.
// Stack visual: React + Tailwind (dark mode con clase `dark:`) + Framer Motion
// + Lucide React. La mascota (SVG) y sus estados animados están incluidos.
// ============================================================================

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Flame, User, ChevronRight, MessageCircle, ArrowLeft, Send,
  AudioWaveform, Wind, Waves, Droplets, CloudRain, CloudRainWind,
  Trees, Flame as Fire, Pause, Home, BarChart3, Moon, Shield,
  FileText, LogOut, Trash2, Check,
} from "lucide-react";

/* ============================================================
   MASCOTA — logo vivo de la app (persona meditando abstracta)
   Estados: meditating | greeting | listening | sleeping
   ============================================================ */
const MASCOT_ANIM = {
  meditating: {
    group: { scale: [1, 1.06, 1], transition: { duration: 8, repeat: Infinity, ease: "easeInOut" } },
    head: { y: [0, -1.5, 0], transition: { duration: 8, repeat: Infinity, ease: "easeInOut" } },
  },
  greeting: {
    group: { y: [0, -4, 0], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 1.4 } },
    head: { rotate: [0, -10, 10, 0], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 1.4 } },
  },
  listening: {
    group: { scale: [1, 1.02, 1], transition: { duration: 2.4, repeat: Infinity } },
    head: { rotate: 8, x: 1 },
  },
  sleeping: {
    group: { opacity: 0.55, scale: [1, 1.03, 1], transition: { scale: { duration: 10, repeat: Infinity } } },
    head: { y: 4, rotate: -6 },
  },
};

function Mascot({ state = "meditating", size = 64 }) {
  const a = MASCOT_ANIM[state] ?? MASCOT_ANIM.meditating;
  return (
    <motion.svg viewBox="0 0 100 100" width={size} height={size} fill="currentColor" animate={a.group}>
      <motion.circle cx="50" cy="24" r="14" animate={a.head} style={{ originX: "50px", originY: "24px" }} />
      <rect x="14" y="46" width="72" height="16" rx="8" />
      <rect x="24" y="70" width="52" height="16" rx="8" />
    </motion.svg>
  );
}

/* ============================================================
   MARCO DE TELÉFONO — solo para presentar el mockup
   ============================================================ */
function Phone({ num, name, dark, children }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-extrabold text-neutral-400">{num}</span>
        <span className="text-xs font-bold uppercase tracking-widest">{name}</span>
      </div>
      <div className="rounded-[52px] bg-neutral-900 p-3 shadow-2xl">
        <div className={dark ? "dark" : ""}>
          <div className="relative flex h-[700px] w-[330px] flex-col overflow-hidden rounded-[40px] bg-white text-black dark:bg-black dark:text-white">
            <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Navbar inferior (visible SOLO en Dashboard, Relax y Stats) */
function BottomNav({ active }) {
  const items = [
    { id: "relax", label: "Relax", Icon: Wind },
    { id: "home", label: "Inicio", Icon: Home },
    { id: "stats", label: "Stats", Icon: BarChart3 },
  ];
  return (
    <nav className="absolute bottom-4 left-1/2 z-20 flex h-16 w-[calc(100%-2.5rem)] -translate-x-1/2 items-center justify-evenly rounded-full border border-neutral-200 bg-white/90 shadow-xl backdrop-blur-md dark:border-neutral-800 dark:bg-black/80">
      {items.map(({ id, label, Icon }) => (
        <div key={id} className={`flex flex-col items-center gap-0.5 ${active === id ? "" : "text-neutral-400 dark:text-neutral-600"}`}>
          <Icon size={22} strokeWidth={2.2} />
          <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </nav>
  );
}

/* ============================================================
   1. SPLASH — mascota + "Pausa." con fade-in mientras Firebase
   resuelve la sesión (onAuthStateChanged → Dashboard o Login)
   ============================================================ */
function SplashScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Mascot state="meditating" size={96} />
      <h1 className="text-4xl font-bold tracking-[-0.5px]" style={{ fontFamily: "Space Grotesk, Inter, sans-serif" }}>
        Pausa.
      </h1>
    </div>
  );
}

/* ============================================================
   2. LOGIN / SIGNUP — tabs pill, Firebase Auth email+contraseña
   ============================================================ */
function LoginScreen() {
  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-10 flex flex-col items-center text-center">
        <Mascot state="greeting" size={72} />
        <h1 className="mt-5 text-3xl font-bold tracking-[-0.5px]">Pausa.</h1>
        <p className="mt-2 text-[15px] text-neutral-400">Tu espacio para respirar y reflexionar.</p>
      </div>
      <div className="mb-6 flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
        <div className="flex-1 rounded-full bg-white py-2.5 text-center text-sm font-semibold shadow-sm dark:bg-black">Iniciar Sesión</div>
        <div className="flex-1 py-2.5 text-center text-sm font-semibold text-neutral-400">Crear Cuenta</div>
      </div>
      <div className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-4 text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">Correo electrónico</div>
      <div className="rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-4 text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">Contraseña</div>
      <div className="mt-5 rounded-2xl bg-black py-[18px] text-center text-[15px] font-bold text-white dark:bg-white dark:text-black">Iniciar Sesión</div>
    </div>
  );
}

/* ============================================================
   3. DASHBOARD — racha, saludo dinámico, calendario semanal
   (día pasado → BottomSheet con resumen desde Firestore) y CTA
   grande hacia el chat. CON navbar.
   ============================================================ */
function DashboardScreen() {
  const days = [["Lu", 20], ["Ma", 21], ["Mi", 22], ["Ju", 23], ["Vi", 24], ["Sa", 25], ["Do", 26]];
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-24 pt-14">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-bold dark:bg-neutral-900">
          <Flame size={16} /> 6
        </div>
        <div className="text-center tracking-[-0.5px]">
          <div className="text-lg font-bold">Buenas tardes,</div>
          <div className="text-lg font-semibold text-neutral-400">David</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800">
          <User size={20} />
        </div>
      </header>
      <div className="mb-8 flex justify-between">
        {days.map(([n, d], i) => (
          <div key={n} className={`flex w-10 flex-col items-center gap-2 rounded-xl px-2 py-3 ${i === 2 ? "border border-neutral-200 shadow-sm dark:border-neutral-800" : ""}`}>
            <span className={`text-[11px] font-semibold ${i === 2 ? "" : "text-neutral-400"}`}>{n}</span>
            <span className={`text-[15px] font-bold ${i === 2 ? "" : "text-neutral-400"}`}>{d}</span>
          </div>
        ))}
      </div>
      <div className="rounded-[36px] bg-neutral-900 p-8 text-center text-white dark:ring-1 dark:ring-neutral-800">
        <div className="mb-6 flex justify-center"><Mascot state="greeting" size={56} /></div>
        <div className="mb-3 text-[13px] font-medium uppercase tracking-widest text-neutral-500">Check-in diario</div>
        <div className="mb-8 text-[22px] font-bold leading-snug tracking-[-0.5px]">
          Hola David, ¿qué tal si reflexionamos sobre tu día?
        </div>
        <div className="flex items-center justify-center gap-2 rounded-full bg-white py-4 text-[15px] font-bold text-black">
          <MessageCircle size={18} /> Empezar <ChevronRight size={18} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   4. CHAT (Espacio Seguro) — pantalla completa SIN navbar,
   burbujas usuario oscuras dcha / IA claras izq con mascota
   "listening". Mensajes persistidos en Firestore.
   ============================================================ */
function ChatScreen() {
  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-14">
      <header className="mb-5 flex items-center">
        <ArrowLeft size={24} />
        <h2 className="flex-1 pr-6 text-center text-base font-bold tracking-[-0.5px]">Tu espacio seguro</h2>
      </header>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start gap-2.5">
          <div className="mt-1 shrink-0"><Mascot state="listening" size={28} /></div>
          <div className="max-w-[85%] rounded-[20px] rounded-bl-[4px] bg-neutral-100 p-4 text-sm leading-relaxed dark:bg-neutral-900">
            Hola David. Este es tu espacio, sin juicios. ¿Qué tienes en mente hoy?
          </div>
        </div>
        <div className="ml-auto max-w-[85%] rounded-[20px] rounded-br-[4px] bg-black p-4 text-sm leading-relaxed text-white dark:bg-white dark:text-black">
          Ha sido un día largo y me siento un poco agobiado por todo.
        </div>
        <div className="flex items-start gap-2.5">
          <div className="mt-1 shrink-0"><Mascot state="listening" size={28} /></div>
          <div className="max-w-[85%] rounded-[20px] rounded-bl-[4px] bg-neutral-100 p-4 text-sm leading-relaxed dark:bg-neutral-900">
            Es normal sentir ese peso después de un día intenso. Respira hondo. ¿Qué es lo que más te ha agobiado hoy?
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 rounded-full bg-neutral-100 px-5 py-3.5 text-sm text-neutral-400 dark:bg-neutral-900">Escribe lo que sientes...</div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
          <Send size={18} />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   5. RELAX / Sonidos — tabs superiores + los 8 sonidos EXACTOS.
   Tarjeta "reproduciendo" resaltada. CON navbar.
   ============================================================ */
const SOUNDS = [
  ["Ruido marrón", AudioWaveform, true],
  ["Ruido blanco", Wind, false],
  ["Playa", Waves, false],
  ["Arroyo", Droplets, false],
  ["Lluvia suave", CloudRain, false],
  ["Lluvia en el tejado", CloudRainWind, false],
  ["Bosque", Trees, false],
  ["Fuego de fogata", Fire, false],
];

function RelaxSoundsScreen() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-14">
      <h1 className="mb-5 text-[28px] font-bold tracking-[-0.5px]">Relax</h1>
      <div className="mb-5 flex gap-6 border-b border-neutral-200 pb-3 text-sm font-semibold dark:border-neutral-800">
        <span className="relative">Sonidos<span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-black dark:bg-white" /></span>
        <span className="text-neutral-400">Respiración</span>
        <span className="text-neutral-400">Ejercicios</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pb-24">
        {SOUNDS.map(([name, Icon, playing]) => (
          <div key={name} className={`flex items-center gap-4 rounded-[20px] p-3.5 ${playing ? "border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900" : "bg-neutral-100 dark:bg-neutral-900/60"}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${playing ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white dark:bg-neutral-800"}`}>
              <Icon size={20} />
            </span>
            <span className="flex-1 text-sm font-semibold">{name}</span>
            {playing && <Pause size={20} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   6. RELAX / Respiración — mascota GRANDE meditando, animación
   de crecer/encoger cíclica sincronizada con "Inhala / Exhala"
   ============================================================ */
function RelaxBreathingScreen() {
  const [phase, setPhase] = useState("Inhala");
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p === "Inhala" ? "Exhala" : "Inhala")), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-1 flex-col px-5 pt-14">
      <h1 className="mb-5 text-[28px] font-bold tracking-[-0.5px]">Relax</h1>
      <div className="mb-5 flex gap-6 border-b border-neutral-200 pb-3 text-sm font-semibold dark:border-neutral-800">
        <span className="text-neutral-400">Sonidos</span>
        <span className="relative">Respiración<span className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-black dark:bg-white" /></span>
        <span className="text-neutral-400">Ejercicios</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center pb-24">
        <Mascot state="meditating" size={190} />
        <AnimatePresence mode="wait">
          <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-8 text-2xl font-bold tracking-[-0.5px]">
            {phase}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 text-sm text-neutral-400">Sigue el ritmo de la mascota</p>
      </div>
    </div>
  );
}

/* ============================================================
   7. STATS — selector de ánimo (desaparece al registrar) +
   grid mensual de 7 columnas. Día registrado = círculo negro.
   Al tocar uno: FLIP 3D (rotateY) que revela el emoji 3s.
   El día 5 de la maqueta gira en bucle para enseñar el efecto.
   ============================================================ */
function StatsScreen() {
  const filled = [2, 4, 5, 7, 8, 11, 12, 13, 14, 17, 19];
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-24 pt-14">
      <h1 className="mb-6 text-[28px] font-bold tracking-[-0.5px]">Estadísticas</h1>
      <p className="mb-4 text-[15px] font-semibold text-neutral-400">¿Cómo te sientes hoy?</p>
      <div className="mb-9 flex justify-between">
        {["😢", "😟", "😐", "🙂", "😁"].map((e) => (
          <div key={e} className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-100 text-2xl dark:bg-neutral-900">{e}</div>
        ))}
      </div>
      <p className="mb-4 text-[15px] font-semibold text-neutral-400">Progresión mensual</p>
      <div className="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="mb-4 grid grid-cols-7 text-center text-[11px] font-bold text-neutral-400">
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-2.5">
          {Array.from({ length: 21 }, (_, i) => {
            const day = i + 1;
            const isFilled = filled.includes(day);
            const demo = day === 5; // este gira en bucle como demo del flip
            return (
              <div key={day} className="aspect-square" style={{ perspective: 600 }}>
                <motion.div
                  className="relative h-full w-full"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={demo ? { rotateY: [0, 180, 180, 0] } : {}}
                  transition={demo ? { duration: 4, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 } : {}}
                >
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-bold ${isFilled ? "bg-black text-white dark:bg-white dark:text-black" : "border border-neutral-200 text-neutral-400 dark:border-neutral-800"}`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {day}
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral-100 text-base dark:bg-neutral-800"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    🙂
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   8. PERFIL (en modo oscuro) — lista tipo Ajustes de iOS.
   Toggle dark mode, legal REAL (in-app, requisito de Apple) y
   borrado de cuenta con modal propio + reautenticación.
   ============================================================ */
function ProfileScreen() {
  const Row = ({ Icon, label, danger, chevron, toggle }) => (
    <div className={`flex items-center justify-between border-b border-neutral-200 px-5 py-4 text-[15px] font-medium last:border-b-0 dark:border-neutral-800 ${danger ? "text-red-500" : ""}`}>
      <span className="flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${danger ? "bg-red-500/10 text-red-500" : "bg-black text-white dark:bg-white dark:text-black"}`}>
          <Icon size={15} strokeWidth={2.5} />
        </span>
        {label}
      </span>
      {toggle && (
        <span className="relative h-6 w-11 rounded-full bg-green-500">
          <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
        </span>
      )}
      {chevron && <ChevronRight size={18} className="text-neutral-400" />}
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto px-5 pb-10 pt-14">
      <header className="mb-7 flex items-center gap-4">
        <ArrowLeft size={24} />
        <h1 className="text-[28px] font-bold tracking-[-0.5px]">Perfil</h1>
      </header>
      <div className="mb-7 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold dark:bg-neutral-900">D</div>
        <div>
          <h2 className="text-xl font-bold capitalize tracking-[-0.5px]">David</h2>
          <p className="text-sm text-neutral-400">david@ejemplo.com</p>
        </div>
      </div>
      <p className="mb-3 text-sm font-semibold text-neutral-400">Preferencias</p>
      <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        <Row Icon={Moon} label="Modo Oscuro" toggle />
      </div>
      <p className="mb-3 text-sm font-semibold text-neutral-400">Legal</p>
      <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        <Row Icon={Shield} label="Políticas de Privacidad" chevron />
        <Row Icon={FileText} label="Términos y Condiciones" chevron />
      </div>
      <p className="mb-3 text-sm font-semibold text-neutral-400">Cuenta</p>
      <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
        <Row Icon={LogOut} label="Cerrar Sesión" />
        <Row Icon={Trash2} label="Borrar Cuenta" danger />
      </div>
    </div>
  );
}

/* ============================================================
   GALERÍA — presenta las 8 vistas en marcos de teléfono
   ============================================================ */
export default function PausaMockup() {
  return (
    <div className="min-h-screen bg-neutral-100 px-6 py-14" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[4px] text-neutral-400">Pausa · Mockup de referencia</p>
        <h1 className="mb-3 text-3xl font-bold tracking-[-0.5px]" style={{ fontFamily: "Space Grotesk, Inter, sans-serif" }}>
          Flujo completo — 8 vistas
        </h1>
        <p className="text-[15px] leading-relaxed text-neutral-500">
          Minimalista premium estilo iOS. Blanco puro / negro puro, bordes muy
          redondeados, tipografía con tracking negativo. La mascota es el logo
          vivo de la app y respira con Framer Motion.
        </p>
      </div>
      <div className="flex gap-12 overflow-x-auto pb-8">
        <Phone num="01" name="Splash"><SplashScreen /></Phone>
        <Phone num="02" name="Login / Signup"><LoginScreen /></Phone>
        <Phone num="03" name="Dashboard"><DashboardScreen /><BottomNav active="home" /></Phone>
        <Phone num="04" name="Chat (sin navbar)"><ChatScreen /></Phone>
        <Phone num="05" name="Relax · Sonidos"><RelaxSoundsScreen /><BottomNav active="relax" /></Phone>
        <Phone num="06" name="Relax · Respiración"><RelaxBreathingScreen /><BottomNav active="relax" /></Phone>
        <Phone num="07" name="Stats · Flip 3D"><StatsScreen /><BottomNav active="stats" /></Phone>
        <Phone num="08" name="Perfil (modo oscuro)" dark><ProfileScreen /></Phone>
      </div>
    </div>
  );
}
