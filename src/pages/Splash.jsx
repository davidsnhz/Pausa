// pages/Splash.jsx
// ----------------------------------------------------------------------------
// 1. Splash: mascota meditando + "Pausa." con fade-in mientras se resuelve la
// sesión. App decide después si va a Dashboard o Login.
// `still`: sin fade-in, para cuando continúa a otro Splash ya visible.
// ----------------------------------------------------------------------------
import { motion } from "framer-motion";
import Mascot from "../components/Mascot";

export default function Splash({ still = false }) {
  return (
    <div className="pt-safe pb-safe flex flex-1 flex-col items-center justify-center gap-6">
      <motion.div
        initial={still ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Mascot state="meditating" size={96} />
      </motion.div>
      <motion.h1
        className="font-display text-4xl font-bold tracking-[-0.5px]"
        initial={still ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Pausa.
      </motion.h1>
    </div>
  );
}
