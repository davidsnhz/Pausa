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
  const [profile, setProfile] = useState(null);
  const [profileUid, setProfileUid] = useState(null); // de quién es `profile`

  useEffect(() => {
    // onAuthStateChanged dispara al arrancar (con user o null) y en cada cambio.
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Suscripción al documento del usuario (nombre, racha…) en tiempo real.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileUid(null);
      return;
    }
    const uid = user.uid;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : {});
        setProfileUid(uid);
      },
      () => {
        setProfile({});
        setProfileUid(uid);
      }
    );
    return unsub;
  }, [user]);

  const loading = !authReady || (!!user && profileUid !== user.uid);

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
