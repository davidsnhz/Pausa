// pages/Login.jsx
// ----------------------------------------------------------------------------
// 2. Login / Signup: tabs pill, Firebase Auth email+contraseña, errores
// traducidos al español. Al autenticar, AuthContext redirige al Dashboard.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import Mascot from "../components/Mascot";
import Page from "../components/Page";

// Traducción de los códigos de error de Firebase al español.
function traducirError(code) {
  const map = {
    "auth/invalid-email": "El correo no tiene un formato válido.",
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

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Crea el documento base del usuario con la racha a 0.
        await setDoc(
          doc(db, "users", cred.user.uid),
          { streak: 0, createdAt: serverTimestamp() },
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
                  className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-black"
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
            className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-4 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-neutral-600"
          />
          <input
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-4 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:border-neutral-600"
          />

          {/* Hueco reservado: el formulario no salta al aparecer un error. */}
          <p className="mt-3 min-h-5 text-center text-sm text-red-500">{error}</p>

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-2xl bg-black py-[18px] text-center text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Un momento…" : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </button>
        </motion.form>
      </div>
    </Page>
  );
}
