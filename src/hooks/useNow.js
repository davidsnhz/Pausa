// hooks/useNow.js
// ----------------------------------------------------------------------------
// Fecha actual que se refresca cada vez que la app vuelve a primer plano.
// Una PWA puede pasar días en segundo plano sin recargarse: sin esto, el
// calendario, el saludo y la racha seguirían en el día en que se abrió.
// ----------------------------------------------------------------------------
import { useEffect, useState } from "react";

export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") setNow(new Date());
    }
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  return now;
}
