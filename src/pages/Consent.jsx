// pages/Consent.jsx
// ----------------------------------------------------------------------------
// Pantalla de consentimiento: aparece cuando la cuenta no ha aceptado la versión
// vigente de Términos y Privacidad (cuentas anteriores a ellos o tras un cambio
// de LEGAL.version). Sin aceptar no se puede seguir: o aceptas o cierras sesión.
// Los textos se leen en /terms y /privacy, que siguen accesibles desde aquí.
// ----------------------------------------------------------------------------
import { useState } from "react";
import { useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { ChevronRight, FileText, Shield } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { acceptTerms } from "../services/account";
import { LEGAL } from "../utils/legal";
import Mascot from "../components/Mascot";
import Page from "../components/Page";

export default function Consent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      // En cuanto el perfil refleja la versión aceptada, App muestra la app.
      await acceptTerms(user.uid);
    } catch {
      setError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex flex-1 flex-col overflow-y-auto px-6">
        <div className="my-auto">
          <div className="mb-8 flex flex-col items-center text-center">
            <Mascot state="greeting" size={64} />
            <h1 className="font-display mt-5 text-2xl font-bold tracking-[-0.5px]">Antes de seguir</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Hemos actualizado los Términos y la Política de Privacidad de Pausa. Léelos con
              calma: para seguir usando la app necesitamos que los aceptes.
            </p>
          </div>

          <div className="mb-5 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900">
            {[
              [FileText, "Términos y Condiciones", "/terms"],
              [Shield, "Política de Privacidad", "/privacy"],
            ].map(([Icon, label, path]) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex w-full items-center justify-between border-b border-neutral-200 px-5 py-4 text-left text-[15px] font-medium transition-colors last:border-b-0 active:bg-neutral-200/60 dark:border-neutral-800 dark:active:bg-neutral-800/60"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                    <Icon size={15} strokeWidth={2.5} />
                  </span>
                  {label}
                </span>
                <ChevronRight size={18} className="text-neutral-400" />
              </button>
            ))}
          </div>

          <p className="text-[13px] leading-snug text-neutral-500 dark:text-neutral-400">
            Al aceptar confirmas que tienes {LEGAL.minAge} años o más y das tu consentimiento
            explícito para que Pausa trate tus reflexiones y registros de ánimo (datos sobre tu
            bienestar emocional) solo para que la app funcione. Puedes retirarlo cuando quieras
            borrando tu cuenta.
          </p>

          <p className="mt-2 min-h-5 text-center text-sm text-red-500">{error}</p>

          <button
            onClick={accept}
            disabled={busy}
            className="mt-4 w-full rounded-2xl bg-black py-[18px] text-center text-[15px] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Un momento…" : "Acepto y continúo"}
          </button>
          <button
            onClick={() => signOut(auth)}
            disabled={busy}
            className="mt-3 w-full py-3 text-center text-sm font-semibold text-neutral-400 disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </Page>
  );
}
