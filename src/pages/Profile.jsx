// pages/Profile.jsx
// ----------------------------------------------------------------------------
// 8. Perfil: lista tipo Ajustes de iOS. Email, toggle Modo Oscuro (clase `dark`
// + localStorage + StatusBar nativa), enlaces legales, Cerrar Sesión y Borrar
// Cuenta (modal propio + reautenticación si Firebase la exige). SIN navbar.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ArrowLeft, ChevronRight, UserRound, Moon, Shield, FileText, LogOut, Trash2 } from "lucide-react";

import { useAuth, displayNameOf } from "../context/AuthContext";
import { auth, db } from "../services/firebase";
import { syncStatusBar } from "../services/native";
import Modal from "../components/Modal";
import Page from "../components/Page";

// Fila reutilizable estilo Ajustes.
function Row({ Icon, label, value, danger, chevron, toggle, checked, onToggle, onClick }) {
  return (
    <button
      onClick={toggle ? onToggle : onClick}
      className={`flex w-full items-center justify-between border-b border-neutral-200 px-5 py-4 text-left text-[15px] font-medium last:border-b-0 transition-colors active:bg-neutral-200/60 dark:border-neutral-800 dark:active:bg-neutral-800/60 ${
        danger ? "text-red-500" : ""
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            danger ? "bg-red-500/10 text-red-500" : "bg-black text-white dark:bg-white dark:text-black"
          }`}
        >
          <Icon size={15} strokeWidth={2.5} />
        </span>
        {label}
      </span>
      {value && <span className="ml-auto mr-2 max-w-[45%] truncate text-neutral-400">{value}</span>}
      {toggle && (
        <span
          className={`relative h-6 w-11 rounded-full transition-colors ${
            checked ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              checked ? "right-0.5" : "left-0.5"
            }`}
          />
        </span>
      )}
      {chevron && <ChevronRight size={18} className="text-neutral-400" />}
    </button>
  );
}

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Estado del modal de cambio de nombre.
  const [showName, setShowName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  const nombre = displayNameOf(user, profile) || "Tú";
  const inicial = nombre.charAt(0).toUpperCase();

  function openName() {
    setNewName(displayNameOf(user, profile));
    setNameError("");
    setShowName(true);
  }

  async function handleSaveName() {
    const value = newName.trim();
    if (!value) {
      setNameError("Escribe un nombre.");
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      // Firestore es la fuente de verdad (AuthContext lo refleja en tiempo real).
      await setDoc(doc(db, "users", user.uid), { displayName: value }, { merge: true });
      // También en el perfil de Auth (por si se usa en otro sitio).
      try {
        await updateProfile(auth.currentUser, { displayName: value });
      } catch {
        /* no crítico */
      }
      setShowName(false);
    } catch {
      setNameError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSavingName(false);
    }
  }

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    syncStatusBar(next);
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/login", { replace: true });
  }

  function openDelete() {
    setError("");
    setPassword("");
    setNeedPassword(false);
    setShowDelete(true);
  }

  async function handleDelete() {
    setError("");
    setBusy(true);
    try {
      if (needPassword) {
        // Reautenticar con la contraseña antes de borrar.
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }
      await deleteUser(auth.currentUser);
      // AuthContext detectará la ausencia de sesión y App irá a /login.
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        // Pedir contraseña en el mismo modal y reintentar.
        setNeedPassword(true);
        setError("Por seguridad, confirma tu contraseña para borrar la cuenta.");
      } else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Contraseña incorrecta.");
      } else {
        setError("No se pudo borrar la cuenta. Inténtalo de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex-1 overflow-y-auto px-5">
        <header className="mb-7 flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[28px] font-bold tracking-[-0.5px]">Perfil</h1>
        </header>

        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold dark:bg-neutral-900">
            {inicial}
          </div>
          <div>
            <h2 className="text-xl font-bold capitalize tracking-[-0.5px]">{nombre}</h2>
            <p className="text-sm text-neutral-400">{user?.email}</p>
          </div>
        </div>

        <p className="mb-3 text-sm font-semibold text-neutral-400">Preferencias</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <Row Icon={UserRound} label="Nombre" value={nombre} chevron onClick={openName} />
          <Row Icon={Moon} label="Modo Oscuro" toggle checked={dark} onToggle={toggleDark} />
        </div>

        <p className="mb-3 text-sm font-semibold text-neutral-400">Legal</p>
        <div className="mb-6 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <Row Icon={Shield} label="Políticas de Privacidad" chevron onClick={() => navigate("/privacy")} />
          <Row Icon={FileText} label="Términos y Condiciones" chevron onClick={() => navigate("/terms")} />
        </div>

        <p className="mb-3 text-sm font-semibold text-neutral-400">Cuenta</p>
        <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <Row Icon={LogOut} label="Cerrar Sesión" onClick={() => setShowLogout(true)} />
          <Row Icon={Trash2} label="Borrar Cuenta" danger onClick={openDelete} />
        </div>
      </div>

      {/* Modal: cambiar nombre */}
      <Modal open={showName} onClose={() => !savingName && setShowName(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px]">Tu nombre</h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Así te saludará Pausa. Puedes cambiarlo cuando quieras.
        </p>
        <input
          autoFocus
          maxLength={24}
          placeholder="¿Cómo quieres que te llamemos?"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
          className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-800 dark:focus:border-neutral-600"
        />
        {nameError && <p className="mb-3 text-sm text-red-500">{nameError}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setShowName(false)}
            disabled={savingName}
            className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold disabled:opacity-50 dark:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveName}
            disabled={savingName || !newName.trim()}
            className="flex-1 rounded-2xl bg-black py-3.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {savingName ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </Modal>

      {/* Modal: cerrar sesión */}
      <Modal open={showLogout} onClose={() => setShowLogout(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px]">¿Cerrar sesión?</h3>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Podrás volver a entrar cuando quieras.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLogout(false)}
            className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold dark:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-2xl bg-black py-3.5 text-sm font-bold text-white dark:bg-white dark:text-black"
          >
            Cerrar sesión
          </button>
        </div>
      </Modal>

      {/* Modal: borrar cuenta (con reautenticación si hace falta) */}
      <Modal open={showDelete} onClose={() => !busy && setShowDelete(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px] text-red-500">Borrar cuenta</h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          Esta acción es permanente y elimina tu cuenta y tus datos. No se puede deshacer.
        </p>

        {needPassword && (
          <input
            type="password"
            autoFocus
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3.5 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-800"
          />
        )}
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => setShowDelete(false)}
            disabled={busy}
            className="flex-1 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold disabled:opacity-50 dark:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={busy || (needPassword && !password)}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </Modal>
    </Page>
  );
}
