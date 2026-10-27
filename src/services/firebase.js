// services/firebase.js
// ----------------------------------------------------------------------------
// Inicialización de Firebase (Auth + Firestore).
//
// Rellena estos valores con los de tu proyecto (Consola de Firebase →
// Configuración del proyecto → Tus apps → SDK setup and configuration).
// Puedes ponerlos como variables de entorno en un archivo .env (ver .env.example)
// o directamente en el objeto de abajo.
// ----------------------------------------------------------------------------
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "PEGA_AQUI_TU_API_KEY",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "PEGA_AQUI.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "PEGA_AQUI_PROJECT_ID",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "PEGA_AQUI.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PEGA_AQUI_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "PEGA_AQUI_APP_ID",
};

// Aviso claro en consola si aún no se ha configurado (evita confusión al probar).
export const isFirebaseConfigured =
  !!import.meta.env.VITE_FIREBASE_API_KEY &&
  !import.meta.env.VITE_FIREBASE_API_KEY.startsWith("PEGA_AQUI");

if (!isFirebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Pausa] Firebase no está configurado todavía. Rellena .env con tus " +
      "credenciales (ver .env.example). La UI arranca, pero el login y los " +
      "datos no funcionarán hasta configurarlo (Fase 2)."
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Correos de Firebase (p. ej. recuperar contraseña) en español.
auth.languageCode = "es";

// Firestore con caché local persistente (IndexedDB): al reentrar en una
// pantalla los datos salen al instante desde caché (sin "pop" de actualización)
// y la app sigue funcionando sin conexión. Un solo tab (suficiente para móvil).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
});

// Modo emuladores (`npm run dev:emu`, ver .env.emulators): Auth y Firestore en
// local, para probar sin tocar los datos reales.
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export default app;
