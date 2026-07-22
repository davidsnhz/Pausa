// components/Page.jsx
// ----------------------------------------------------------------------------
// Envoltorio de página: ocupa toda la altura disponible. El cambio entre
// secciones es INSTANTÁNEO (como una tab bar nativa de iOS), sin fundido, para
// que no parezca que la pantalla "se refresca" al entrar.
// ----------------------------------------------------------------------------
export default function Page({ children, className = "" }) {
  return <div className={`flex h-full w-full flex-col ${className}`}>{children}</div>;
}
