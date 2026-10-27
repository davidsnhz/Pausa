// components/Modal.jsx
// ----------------------------------------------------------------------------
// Modal propio (NUNCA window.confirm/alert/prompt: se ven fuera de lugar en
// WKWebView). Diálogo centrado con overlay, animado con Framer Motion.
// Se usa para confirmaciones (cerrar sesión, borrar cuenta, etc.).
// ----------------------------------------------------------------------------
import { AnimatePresence, motion } from "framer-motion";

export default function Modal({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pt-safe pb-safe fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay: toca fuera para cerrar */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
