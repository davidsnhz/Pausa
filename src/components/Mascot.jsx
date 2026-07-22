// components/Mascot.jsx
// ----------------------------------------------------------------------------
// La mascota: logo vivo de la app (persona meditando abstracta).
// SVG de 3 piezas: cabeza (círculo) + cuerpo (rect) + base (rect).
// Estados animados con Framer Motion: meditating | greeting | listening | sleeping
// (definición idéntica a la del mockup de referencia).
// ----------------------------------------------------------------------------
import { motion } from "framer-motion";

const MASCOT_ANIM = {
  // Respira en ciclo lento de 8s.
  meditating: {
    group: {
      scale: [1, 1.06, 1],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
    },
    head: {
      y: [0, -1.5, 0],
      transition: { duration: 8, repeat: Infinity, ease: "easeInOut" },
    },
  },
  // Saluda con un saltito y la cabeza ladeándose.
  greeting: {
    group: { y: [0, -4, 0], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 1.4 } },
    head: { rotate: [0, -10, 10, 0], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 1.4 } },
  },
  // Escucha: pulso sutil y cabeza ladeada.
  listening: {
    group: { scale: [1, 1.02, 1], transition: { duration: 2.4, repeat: Infinity } },
    head: { rotate: 8, x: 1 },
  },
  // Duerme: opacidad baja y cabeza caída.
  sleeping: {
    group: { opacity: 0.55, scale: [1, 1.03, 1], transition: { scale: { duration: 10, repeat: Infinity } } },
    head: { y: 4, rotate: -6 },
  },
};

export default function Mascot({ state = "meditating", size = 64 }) {
  const a = MASCOT_ANIM[state] ?? MASCOT_ANIM.meditating;
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="currentColor"
      animate={a.group}
      aria-hidden="true"
    >
      <motion.circle
        cx="50"
        cy="24"
        r="14"
        animate={a.head}
        style={{ originX: "50px", originY: "24px" }}
      />
      <rect x="14" y="46" width="72" height="16" rx="8" />
      <rect x="24" y="70" width="52" height="16" rx="8" />
    </motion.svg>
  );
}
