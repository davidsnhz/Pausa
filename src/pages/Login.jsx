// pages/Login.jsx
// ----------------------------------------------------------------------------
// 2. Login / Signup: tabs pill, Firebase Auth email+contraseña, errores
// traducidos al español. Al autenticar, AuthContext redirige al Dashboard.
// - Iniciar sesión: "¿Olvidaste tu contraseña?" → enlace de recuperación.
// - Crear cuenta: hay que aceptar Términos y Privacidad (consentimiento
//   explícito, RGPD); se guarda la versión aceptada en users/{uid}.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { LEGAL } from "../utils/legal";
import Mascot from "../components/Mascot";
import Page from "../components/Page";
import Modal from "../components/Modal";
import BottomSheet from "../components/BottomSheet";
import LegalText, { LEGAL_DOCS } from "../components/LegalText";

// Traducción de los códigos de error de Firebase al español.
function traducirError(code) {
  const map = {
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/missing-email": "Escribe tu correo.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Prueba de nuevo en un rato.",
    "auth/network-request-failed": "Sin conexión. Revisa tu red.",
  };
  return map[code] || "Algo no ha ido bien. Inténtalo de nuevo.";
}

const INPUT =
  "w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-4 text-sm outline-hidden placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-neutral-600";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Hoja con un texto legal. El doc se conserva al cerrar (animación de salida).
  const [legalDoc, setLegalDoc] = useState(null); // "terms" | "privacy"
  const [legalOpen, setLegalOpen] = useState(false);

  // Recuperar contraseña.
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isLogin && !accepted) return;
    setError("");
    setBusy(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Documento base: racha a 0 y constancia del consentimiento.
        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            streak: 0,
            createdAt: serverTimestamp(),
            termsVersion: LEGAL.version,
            termsAcceptedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      // El redirect lo hace AuthContext + App al detectar la sesión; hasta
      // entonces el botón sigue en "Un momento…".
    } catch (err) {
      setError(traducirError(err.code));
      setBusy(false);
    }
  }

  function openLegal(e, docName) {
    e.preventDefault(); // dentro del <label>: que no marque/desmarque la casilla
    setLegalDoc(docName);
    setLegalOpen(true);
  }

  function openReset() {
    setResetEmail(email.trim());
    setResetSent(false);
    setResetError("");
    setShowReset(true);
  }

  async function handleReset() {
    if (resetBusy) return;
    setResetError("");
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      // No revelamos si hay una cuenta con ese correo.
      if (err.code === "auth/user-not-found") setResetSent(true);
      else setResetError(traducirError(err.code));
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <Page>
      <div className="pt-safe pb-safe flex flex-1 flex-col justify-center px-6">
        <motion.div
          className="mb-10 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Mascot state="greeting" size={72} />
          <h1 className="font-display mt-5 text-3xl font-bold tracking-[-0.5px]">Pausa.</h1>
          <p className="mt-2 text-[15px] text-neutral-400">
            Tu espacio para respirar y reflexionar.
          </p>
        </motion.div>

        {/* Tabs pill con indicador deslizante */}
        <motion.div
          className="mb-6 flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
        >
          {[["login", "Iniciar Sesión"], ["signup", "Crear Cuenta"]].map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className="relative flex-1 rounded-full py-2.5 text-center text-sm font-semibold"
            >
              {mode === m && (
                <motion.span
                  layoutId="authPill"
                  className="absolute inset-0 rounded-full bg-white shadow-xs dark:bg-black"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 ${mode === m ? "" : "text-neutral-400"}`}>{label}</span>
            </button>
          ))}
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: "easeOut" }}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mb-3 ${INPUT}`}
          />
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />

          {/* Mismo hueco en las dos pestañas (recuperar contraseña / aceptar
              términos): el formulario no salta al cambiar de una a otra. */}
          <div className="mt-3 min-h-[54px]">
            {isLogin ? (
              <button
                type="button"
                onClick={openReset}
                className="ml-auto block text-[13px] font-semibold text-neutral-400"
              >
                ¿Olvidaste tu contraseña?
              </button>
            ) : (
              <label className="flex items-start gap-3 text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-black dark:accent-white"
                />
                <span>
                  Tengo {LEGAL.minAge} años o más y acepto los{" "}
                  <button type="button" onClick={(e) => openLegal(e, "terms")} className="font-semibold text-black underline dark:text-white">
                    Términos
                  </button>{" "}
                  y la{" "}
                  <button type="button" onClick={(e) => openLegal(e, "privacy")} className="font-semibold text-black underline dark:text-white">
                    Privacidad
                  </button>
                  , incluido el tratamiento de mis reflexiones y mi ánimo.
                </span>
              </label>
            )}
          </div>

          {/* Hueco reservado: el formulario no salta al aparecer un error. */}
          <p className="mt-2 min-h-5 text-center text-sm text-red-500">{error}</p>

          <button
            type="submit"
            disabled={busy || (!isLogin && !accepted)}
            className="mt-4 w-full rounded-2xl bg-black py-[18px] text-center text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Un momento…" : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </button>
        </motion.form>
      </div>

      {/* Hoja con Términos / Privacidad (sin salir del registro) */}
      <BottomSheet open={legalOpen} onClose={() => setLegalOpen(false)}>
        {legalDoc && (
          <div className="no-scrollbar max-h-[75vh] overflow-y-auto pb-2">
            <h3 className="mb-4 text-xl font-bold tracking-[-0.5px]">{LEGAL_DOCS[legalDoc].title}</h3>
            <LegalText doc={legalDoc} />
          </div>
        )}
      </BottomSheet>

      {/* Modal: recuperar contraseña. Las dos fases tienen la misma altura. */}
      <Modal open={showReset} onClose={() => !resetBusy && setShowReset(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px]">
          {resetSent ? "Revisa tu correo" : "Recuperar contraseña"}
        </h3>
        {/* Los dos textos ocupan la misma celda (la altura del más largo): el
            modal no cambia de tamaño al pasar a "Revisa tu correo". */}
        <div className="mb-4 grid text-sm text-neutral-500 dark:text-neutral-400">
          <p className={`[grid-area:1/1] ${resetSent ? "invisible" : ""}`}>
            Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
          </p>
          <p className={`[grid-area:1/1] ${resetSent ? "" : "invisible"}`}>
            Si hay una cuenta con ese correo, te llegará un enlace para crear una contraseña nueva.
            Mira también en spam.
          </p>
        </div>
        {resetSent ? (
          <p className="mb-3 truncate rounded-2xl border border-transparent bg-neutral-100 px-5 py-3.5 text-sm font-medium dark:bg-neutral-800">
            {resetEmail.trim()}
          </p>
        ) : (
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Correo electrónico"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReset()}
            className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3.5 text-sm outline-hidden focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-800 dark:focus:border-neutral-600"
          />
        )}
        <p className="mb-3 min-h-5 text-sm text-red-500">{resetError}</p>
        <div className="flex gap-3">
          {resetSent ? (
            <button
              onClick={() => setShowReset(false)}
              className="flex-1 rounded-2xl bg-black py-3.5 text-sm font-bold text-white dark:bg-white dark:text-black"
            >
              Entendido
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowReset(false)}
                disabled={resetBusy}
                className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold disabled:opacity-50 dark:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetBusy || !resetEmail.trim()}
                className="flex-1 rounded-2xl bg-black py-3.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {resetBusy ? "Enviando…" : "Enviar enlace"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </Page>
  );
}
