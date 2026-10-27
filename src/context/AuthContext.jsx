// context/AuthContext.jsx
// ----------------------------------------------------------------------------
// Fuente única de verdad de la sesión. Envuelve la app y expone
// { user, loading, profile }. `profile` es el documento users/{uid} en tiempo
// real (streak, displayName…), para que el nombre y la racha estén disponibles
// y reactivos en toda la app. `loading` sigue activo hasta tener también el
// perfil: así nunca se pinta un nombre o una racha provisional.
// ----------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext({ user: null, loading: true, profile: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  // Perfil junto a la cuenta a la que pertenece: si cambia la sesión, el de la
  // anterior deja de valer al instante, sin tener que vaciarlo a mano.
  const [loaded, setLoaded] = useState({ uid: null, profile: null });

  useEffect(() => {
    // onAuthStateChanged dispara al arrancar (con user o null) y en cada cambio.
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Suscripción al documento del usuario (nombre, racha…) en tiempo real.
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setLoaded({ uid, profile: snap.exists() ? snap.data() : {} }),
      () => setLoaded({ uid, profile: {} })
    );
  }, [uid]);

  const profileReady = !!uid && loaded.uid === uid;
  const profile = profileReady ? loaded.profile : null;
  const loading = !authReady || (!!uid && !profileReady);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Nombre a mostrar: displayName elegido por el usuario, o la parte del correo.
export function displayNameOf(user, profile) {
  const custom = profile?.displayName?.trim();
  if (custom) return custom;
  const base = (user?.email || "").split("@")[0] || "";
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}
