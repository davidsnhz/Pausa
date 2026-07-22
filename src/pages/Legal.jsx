// pages/Legal.jsx
// ----------------------------------------------------------------------------
// Legal in-app (requisito de Apple 5.1.1). doc="privacy" | "terms".
// Los términos dejan claro que Pausa NO es un servicio médico ni sustituye
// ayuda profesional, y mencionan la línea 024 (España).
// ----------------------------------------------------------------------------
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Page from "../components/Page";

const CONTENT = {
  privacy: {
    title: "Política de Privacidad",
    blocks: [
      ["Tu privacidad", "Pausa está pensada para ser tu espacio íntimo. Tratamos tus datos con el mínimo imprescindible para que la app funcione."],
      ["Qué guardamos", "Tu correo electrónico (para iniciar sesión), tus reflexiones del chat, tus registros de ánimo y tu racha. Todo se almacena de forma asociada a tu cuenta."],
      ["Dónde se guardan", "Los datos se guardan en los servidores de Firebase (Google Cloud). No vendemos ni compartimos tu información con terceros con fines publicitarios."],
      ["Tus reflexiones", "El contenido de tu diario es tuyo. Puede procesarse para generar respuestas del acompañante y un breve resumen del día, pero no se usa para perfilarte ni para publicidad."],
      ["Tus derechos", "Puedes borrar tu cuenta y tus datos en cualquier momento desde Perfil → Borrar Cuenta. La eliminación es permanente."],
      ["Contacto", "Si tienes dudas sobre tus datos, escríbenos desde los ajustes de la app."],
    ],
  },
  terms: {
    title: "Términos y Condiciones",
    blocks: [
      ["Aviso importante", "Pausa NO es un servicio médico, sanitario ni psicológico, y NO sustituye la ayuda de un profesional. Es una herramienta de bienestar y reflexión personal."],
      ["Si necesitas ayuda", "Si estás en crisis o pensando en hacerte daño, por favor busca ayuda profesional. En España puedes llamar de forma gratuita y confidencial a la línea 024 (atención a la conducta suicida) o al 112 en una emergencia."],
      ["Uso de la app", "Pausa te ofrece un diario con un acompañante conversacional, registro de ánimo, sonidos ambientales y ejercicios de respiración. Su objetivo es acompañarte, no diagnosticarte ni tratarte."],
      ["El acompañante", "Las respuestas del acompañante se generan automáticamente y pueden no ser siempre precisas. No las tomes como consejo médico, legal ni profesional."],
      ["Tu cuenta", "Eres responsable de mantener la confidencialidad de tu contraseña. Usa la app de forma respetuosa contigo mismo y con su propósito."],
      ["Cambios", "Podemos actualizar estos términos para mejorar el servicio. El uso continuado de la app implica la aceptación de la versión vigente."],
    ],
  },
};

export default function Legal({ doc = "privacy" }) {
  const navigate = useNavigate();
  const data = CONTENT[doc] || CONTENT.privacy;

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex-1 overflow-y-auto px-5">
        <header className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[22px] font-bold tracking-[-0.5px]">{data.title}</h1>
        </header>

        <div className="space-y-6 pb-6">
          {data.blocks.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="mb-1.5 text-base font-bold tracking-[-0.5px]">{heading}</h2>
              <p className="text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                {body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </Page>
  );
}
