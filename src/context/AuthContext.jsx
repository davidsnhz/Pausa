// context/AuthContext.jsx
// ----------------------------------------------------------------------------
// Fuente única de verdad de la sesión. Envuelve la app y expone
// { user, loading, profile }. `profile` es el documento users/{uid} en tiempo
// real (streak, displayName…), para que el nombre y la racha estén disponibles
// y reactivos en toda la app. Mientras `loading`, App muestra el Splash.
// ----------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext({ user: null, loading: true, profile: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // onAuthStateChanged dispara al arrancar (con user o null) y en cada cambio.
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Suscripción al documento del usuario (nombre, racha…) en tiempo real.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => setProfile(snap.exists() ? snap.data() : {}),
      () => setProfile({})
    );
    return unsub;
  }, [user]);

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
