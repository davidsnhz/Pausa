// hooks/useEnterOnce.js
// ----------------------------------------------------------------------------
// Animaciones de entrada solo la PRIMERA vez que se ve algo en la sesión.
// Al volver a esa pantalla (p. ej. desde la navbar) aparece ya colocada, como
// en una app nativa, en lugar de dar la sensación de que se recarga.
// ----------------------------------------------------------------------------
import { useEffect, useState } from "react";

const seen = new Set();

export function useEnterOnce(key) {
  const [first] = useState(() => !seen.has(key));
  useEffect(() => {
    seen.add(key);
  }, [key]);
  return first;
}
