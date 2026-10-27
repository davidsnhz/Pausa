// components/LegalText.jsx
// ----------------------------------------------------------------------------
// Textos de Privacidad y Términos (RGPD + guideline 5.1.1 de Apple). Se usan en
// su página (/privacy, /terms) y en una hoja dentro del registro, para poder
// leerlos sin perder lo escrito en el formulario. Al cambiarlos, sube
// LEGAL.version (utils/legal.js): se pedirá aceptarlos de nuevo.
// ----------------------------------------------------------------------------
import { LEGAL } from "../utils/legal";

const { owner, email, minAge } = LEGAL;

export const LEGAL_DOCS = {
  privacy: {
    title: "Política de Privacidad",
    blocks: [
      ["Quién es el responsable", `El responsable del tratamiento de tus datos es ${owner}, desarrollador de Pausa. Para cualquier cuestión sobre tu privacidad puedes escribir a ${email}.`],
      ["Qué datos tratamos", "Tu correo electrónico y tu contraseña (la gestiona Firebase cifrada; nunca la vemos), el nombre con el que quieres que te saludemos, tus reflexiones del chat y el resumen de cada día, tus registros de ánimo y tu racha. No accedemos a tu ubicación, tus contactos ni otros datos del dispositivo."],
      ["Datos sobre tu bienestar emocional", "Tus reflexiones y registros de ánimo pueden revelar cómo estás emocionalmente, una información que la ley protege de forma especial. Solo la tratamos con tu consentimiento explícito, que das al crear tu cuenta o al aceptar esta política, y únicamente para que la app funcione."],
      ["Para qué los usamos", "Para darte acceso a tu cuenta, guardar tu diario, mostrar tus estadísticas y tu racha, y generar las respuestas del acompañante y el resumen del día. No los usamos para publicidad, no hacemos perfiles sobre ti y no los vendemos."],
      ["Base legal", "La prestación del servicio que pides al crear tu cuenta (art. 6.1.b del RGPD) y, para los datos sobre tu bienestar emocional, tu consentimiento explícito (art. 9.2.a). Puedes retirarlo cuando quieras borrando tu cuenta."],
      ["Con quién se comparten", "Usamos Firebase (Google) para la cuenta y la base de datos, y Vercel para servir la app. Ambos actúan como encargados del tratamiento: solo procesan los datos para prestar ese servicio. Ahora mismo las respuestas del acompañante se generan dentro de la propia app; si en el futuro usamos un proveedor de inteligencia artificial, lo indicaremos aquí y te pediremos aceptar la nueva versión."],
      ["Dónde se guardan", "Los servidores de Google y Vercel pueden estar fuera del Espacio Económico Europeo. En ese caso, las transferencias se amparan en las garantías que prevé el RGPD, como las cláusulas contractuales tipo de la Comisión Europea o el Marco de Privacidad de Datos UE-EE. UU."],
      ["Cuánto tiempo", "Mientras tengas la cuenta. Si la borras desde Perfil → Borrar Cuenta, eliminamos en ese momento tu cuenta, tu diario, tus registros y la copia guardada en tu dispositivo; las copias de seguridad internas de Google desaparecen en sus plazos habituales."],
      ["Tus derechos", `Puedes acceder a tus datos, corregirlos, borrarlos, descargarlos en un archivo (Perfil → Descargar mis datos), oponerte a su uso o limitarlo y retirar tu consentimiento. Para cualquiera de ellos, escribe a ${email}. Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`],
      ["Edad mínima", `Pausa es para personas de ${minAge} años o más.`],
      ["Seguridad", "Las comunicaciones van cifradas (HTTPS) y las reglas de la base de datos impiden que nadie más que tú acceda a tu diario. Aun así, ningún sistema es infalible."],
      ["En tu dispositivo", "Guardamos en tu navegador tu preferencia de tema y una copia de tus datos para que la app funcione sin conexión. No usamos cookies de publicidad ni herramientas de analítica."],
      ["Cambios", "Si cambiamos esta política, te avisaremos en la app y te pediremos aceptarla de nuevo."],
    ],
  },
  terms: {
    title: "Términos y Condiciones",
    blocks: [
      ["Aviso importante", "Pausa NO es un servicio médico, sanitario ni psicológico, y NO sustituye la ayuda de un profesional. Es una herramienta de bienestar y reflexión personal."],
      ["Si necesitas ayuda", "Si estás en crisis o pensando en hacerte daño, por favor busca ayuda profesional. En España puedes llamar de forma gratuita y confidencial a la línea 024 (atención a la conducta suicida) o al 112 en una emergencia."],
      ["Quién puede usar Pausa", `Debes tener al menos ${minAge} años. Al crear tu cuenta confirmas que es así.`],
      ["Qué ofrece Pausa", "Un diario con un acompañante conversacional, registro de ánimo, sonidos ambientales y ejercicios de respiración. Su objetivo es acompañarte, no diagnosticarte ni tratarte."],
      ["El acompañante", "Las respuestas del acompañante son automáticas y pueden no ser precisas ni adecuadas a tu situación. No las tomes como consejo médico, psicológico, legal ni profesional."],
      ["Tu cuenta y tu contenido", "Lo que escribes es tuyo. Eres responsable de mantener tu contraseña en secreto. Puedes descargar tus datos o borrar tu cuenta cuando quieras desde Perfil."],
      ["Uso adecuado", "No uses Pausa para fines ilícitos ni intentes acceder a datos de otras personas o alterar el funcionamiento del servicio."],
      ["El servicio", "Pausa es gratuita y se ofrece tal cual. Intentamos que funcione siempre, pero puede haber interrupciones o cambios. Si algún día cerramos el servicio, te avisaremos con antelación para que puedas descargar tus datos."],
      ["Responsabilidad", "En la medida en que la ley lo permita, no respondemos de las decisiones que tomes a partir del uso de la app. Nada de esto limita los derechos que te reconoce la normativa de consumidores."],
      ["Cambios", "Si cambiamos estos términos, te avisaremos en la app y te pediremos aceptarlos de nuevo."],
      ["Ley aplicable y contacto", `Estos términos se rigen por la ley española. Para cualquier duda, escribe a ${email}.`],
    ],
  },
};

export default function LegalText({ doc = "privacy" }) {
  const data = LEGAL_DOCS[doc] || LEGAL_DOCS.privacy;
  return (
    <div className="space-y-6">
      <p className="text-[13px] text-neutral-400">Última actualización: {LEGAL.updated}</p>
      {data.blocks.map(([heading, body]) => (
        <section key={heading}>
          <h2 className="mb-1.5 text-base font-bold tracking-[-0.5px]">{heading}</h2>
          <p className="text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">{body}</p>
        </section>
      ))}
    </div>
  );
}
