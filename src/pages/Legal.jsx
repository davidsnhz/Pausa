// pages/Legal.jsx
// ----------------------------------------------------------------------------
// Legal in-app (requisito de Apple 5.1.1). doc="privacy" | "terms".
// Los textos viven en components/LegalText.jsx (también se muestran en el
// registro). Los términos dejan claro que Pausa NO es un servicio médico ni
// sustituye ayuda profesional, y mencionan la línea 024 (España).
// ----------------------------------------------------------------------------
import { ArrowLeft } from "lucide-react";
import Page from "../components/Page";
import LegalText, { LEGAL_DOCS } from "../components/LegalText";
import { useGoBack } from "../hooks/useGoBack";

export default function Legal({ doc = "privacy" }) {
  // Se llega desde Perfil o la pantalla de consentimiento; sin sesión, /profile
  // acaba en el login.
  const goBack = useGoBack("/profile");
  const data = LEGAL_DOCS[doc] || LEGAL_DOCS.privacy;

  return (
    <Page>
      <div className="no-scrollbar pt-safe-14 pb-safe-6 flex-1 overflow-y-auto px-5">
        <header className="mb-6 flex items-center gap-4">
          <button onClick={goBack} aria-label="Volver">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[22px] font-bold tracking-[-0.5px]">{data.title}</h1>
        </header>

        <div className="pb-6">
          <LegalText doc={doc} />
        </div>
      </div>
    </Page>
  );
}
