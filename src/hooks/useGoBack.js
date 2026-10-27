// hooks/useGoBack.js
// ----------------------------------------------------------------------------
// "Volver" seguro: si hay una pantalla anterior dentro de la app, vuelve a
// ella; si se entró directamente (enlace, recarga en frío) va a `fallback` en
// lugar de sacar al usuario de la app.
// ----------------------------------------------------------------------------
import { useLocation, useNavigate } from "react-router";

export function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  // React Router marca con key "default" la primera entrada del historial.
  return () =>
    location.key === "default" ? navigate(fallback, { replace: true }) : navigate(-1);
}
