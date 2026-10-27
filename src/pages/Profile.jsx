// pages/Profile.jsx
// ----------------------------------------------------------------------------
// 8. Perfil: lista tipo Ajustes de iOS. Email, toggle Modo Oscuro (clase `dark`
// + localStorage + StatusBar nativa), enlaces legales y contacto, Descargar mis
// datos (RGPD), Cerrar Sesión y Borrar Cuenta (modal propio que pide la
// contraseña y borra cuenta + datos). SIN navbar.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { useNavigate } from "react-router";
import { signOut, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
  ArrowLeft, ChevronRight, UserRound, Moon, Shield, FileText, Mail, Download, LogOut, Trash,
} from "lucide-react";

import { useAuth, displayNameOf } from "../context/AuthContext";
import { auth, db } from "../services/firebase";
import { deleteAccount, exportUserData } from "../services/account";
import { setTheme } from "../services/theme";
import { useGoBack } from "../hooks/useGoBack";
import { LEGAL } from "../utils/legal";
import Modal from "../components/Modal";
import Page from "../components/Page";

// Descarga directa de un archivo generado en la app.
function download(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
          {/* translate (no left/right) para que la bolita se deslice, no salte */}
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              checked ? "translate-x-5" : ""
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
  const goBack = useGoBack("/");

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Estado del modal de cambio de nombre.
  const [showName, setShowName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Descargar mis datos: se prepara el archivo y luego se guarda con un toque
  // (la hoja de compartir del móvil exige un toque reciente).
  const [exporting, setExporting] = useState(false);
  const [exportFile, setExportFile] = useState(null);
  const [exportError, setExportError] = useState("");
  const [showExport, setShowExport] = useState(false);

  const nombre = displayNameOf(user, profile) || "Tú";
  const inicial = nombre.charAt(0).toUpperCase();

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    try {
      setExportFile(await exportUserData(user));
    } catch (err) {
      setExportFile(null);
      setExportError(
        err.code === "unavailable"
          ? "Necesitas conexión para descargar tus datos."
          : "No se pudieron preparar tus datos. Inténtalo de nuevo."
      );
    } finally {
      setExporting(false);
      setShowExport(true);
    }
  }

  async function saveExport() {
    const file = exportFile;
    // En el móvil, la hoja de compartir permite guardarlo en Archivos (más
    // fiable que una descarga en una PWA de iPhone); en el ordenador, descarga.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Mis datos de Pausa" });
      } catch (err) {
        if (err.name !== "AbortError") download(file);
        else return; // cancelado: el modal sigue abierto
      }
    } else {
      download(file);
    }
    setShowExport(false);
  }

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
    setTheme(next);
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/login", { replace: true });
  }

  function openDelete() {
    setError("");
    setPassword("");
    setShowDelete(true);
  }

  async function handleDelete() {
    if (!password || busy) return;
    setError("");
    setBusy(true);
    try {
      await deleteAccount(password);
      // Firestore queda cerrado tras el borrado: recarga limpia hacia el login.
      window.location.replace("/login");
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Contraseña incorrecta.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos. Prueba de nuevo en un rato.");
      } else if (err.code === "auth/network-request-failed" || err.code === "unavailable") {
        setError("Sin conexión. Revisa tu red e inténtalo de nuevo.");
      } else {
        setError("No se pudo borrar la cuenta. Inténtalo de nuevo.");
      }
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex-1 overflow-y-auto px-5">
        <header className="mb-7 flex items-center gap-4">
          <button onClick={goBack} aria-label="Volver">
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
          <Row Icon={Shield} label="Política de Privacidad" chevron onClick={() => navigate("/privacy")} />
          <Row Icon={FileText} label="Términos y Condiciones" chevron onClick={() => navigate("/terms")} />
          <Row
            Icon={Mail}
            label="Contacto"
            chevron
            onClick={() => (window.location.href = `mailto:${LEGAL.email}?subject=Pausa`)}
          />
        </div>

        <p className="mb-3 text-sm font-semibold text-neutral-400">Cuenta</p>
        <div className="overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
          <Row
            Icon={Download}
            label="Descargar mis datos"
            value={exporting ? "Preparando…" : null}
            chevron={!exporting}
            onClick={handleExport}
          />
          <Row Icon={LogOut} label="Cerrar Sesión" onClick={() => setShowLogout(true)} />
          <Row Icon={Trash} label="Borrar Cuenta" danger onClick={openDelete} />
        </div>
      </div>

      {/* Modal: descargar mis datos */}
      <Modal open={showExport} onClose={() => setShowExport(false)}>
        <h3 className="mb-2 text-lg font-bold tracking-[-0.5px]">
          {exportFile ? "Tus datos están listos" : "No se pudo preparar"}
        </h3>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          {exportFile
            ? "Un archivo con tu cuenta, tu diario, tus registros de ánimo y tu racha. Guárdalo en un lugar seguro: contiene tus reflexiones."
            : exportError}
        </p>
        {exportFile && (
          <p className="mb-3 truncate rounded-2xl bg-neutral-100 px-5 py-3.5 text-sm font-medium dark:bg-neutral-800">
            {exportFile.name} · {Math.max(1, Math.round(exportFile.size / 1024))} KB
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setShowExport(false)}
            className={`flex-1 rounded-2xl py-3.5 text-sm font-bold ${
              exportFile ? "bg-neutral-100 dark:bg-neutral-800" : "bg-black text-white dark:bg-white dark:text-black"
            }`}
          >
            {exportFile ? "Cerrar" : "Entendido"}
          </button>
          {exportFile && (
            <button
              onClick={saveExport}
              className="flex-1 rounded-2xl bg-black py-3.5 text-sm font-bold text-white dark:bg-white dark:text-black"
            >
              Guardar archivo
            </button>
          )}
        </div>
      </Modal>

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
          className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3.5 text-sm outline-hidden focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-800 dark:focus:border-neutral-600"
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
          Esta acción es permanente: elimina tu cuenta y todos tus datos (reflexiones, registros
          de ánimo y racha). No se puede deshacer. Escribe tu contraseña para confirmar.
        </p>

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDelete()}
          className="mb-3 w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-5 py-3.5 text-sm outline-hidden dark:border-neutral-800 dark:bg-neutral-800"
        />
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
            disabled={busy || !password}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </Modal>
    </Page>
  );
}
