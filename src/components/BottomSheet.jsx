// components/BottomSheet.jsx
// ----------------------------------------------------------------------------
// Hoja inferior deslizante (BottomSheet). En el Dashboard, al tocar un día
// anterior del calendario, muestra el resumen de ese día leído de Firestore.
// ----------------------------------------------------------------------------
import { AnimatePresence, motion } from "framer-motion";

export default function BottomSheet({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
          <motion.div
            className="pb-safe-6 relative w-full rounded-t-[32px] bg-white px-6 pt-3 dark:bg-neutral-900"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Tirador */}
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
