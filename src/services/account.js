// services/account.js
// ----------------------------------------------------------------------------
// Operaciones sobre la cuenta ligadas al RGPD:
//  - acceptTerms: deja constancia del consentimiento (versión + fecha).
//  - exportUserData: derecho de portabilidad, todos los datos en un JSON.
//  - deleteAccount: borrado completo (también guideline 5.1.1v de Apple).
//    Orden: reautenticar → borrar datos de Firestore → borrar usuario de Auth.
//    Si se borrase antes el usuario, las reglas ya no dejarían tocar sus datos
//    y se quedarían huérfanos para siempre.
// ----------------------------------------------------------------------------
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { LEGAL } from "../utils/legal";
import { dateKey } from "../utils/date";

// Consentimiento a la versión vigente de Términos y Privacidad, incluido el
// consentimiento explícito para los datos de bienestar emocional.
export function acceptTerms(uid) {
  return setDoc(
    doc(db, "users", uid),
    { termsVersion: LEGAL.version, termsAcceptedAt: serverTimestamp() },
    { merge: true }
  );
}

// Todos los datos de la cuenta en un archivo JSON legible (art. 20 RGPD).
// Se lee del servidor para que esté completo, no de la caché local.
export async function exportUserData(user) {
  const iso = (ts) => (ts?.toDate ? ts.toDate().toISOString() : null);
  const userRef = doc(db, "users", user.uid);
  const [profileSnap, moods, chats] = await Promise.all([
    getDocFromServer(userRef),
    getDocsFromServer(collection(userRef, "moods")),
    getDocsFromServer(collection(userRef, "chats")),
  ]);
  const messages = await Promise.all(
    chats.docs.map((chat) =>
      getDocsFromServer(query(collection(chat.ref, "messages"), orderBy("createdAt")))
    )
  );
  const p = profileSnap.exists() ? profileSnap.data() : {};

  const data = {
    exportadoEl: new Date().toISOString(),
    cuenta: {
      correo: user.email,
      creadaEl: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
    },
    perfil: {
      nombre: p.displayName ?? null,
      racha: p.streak ?? 0,
      ultimoCheckIn: p.lastCheckIn ?? null,
      terminosAceptados: p.termsVersion ?? null,
      terminosAceptadosEl: iso(p.termsAcceptedAt),
    },
    animos: moods.docs.map((d) => ({ fecha: d.id, emoji: d.data().emoji })),
    diario: chats.docs.map((chat, i) => ({
      fecha: chat.id,
      resumen: chat.data().summary ?? null,
      mensajes: messages[i].docs.map((m) => ({
        de: m.data().role === "ai" ? "acompañante" : "tú",
        texto: m.data().text,
        hora: iso(m.data().createdAt),
      })),
    })),
  };

  return new File([JSON.stringify(data, null, 2)], `pausa-mis-datos-${dateKey()}.json`, {
    type: "application/json",
  });
}

// Firestore admite como máximo 500 operaciones por lote.
const BATCH_LIMIT = 500;

async function deleteRefs(refs) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// Borra todo el árbol users/{uid}: chats (con sus mensajes), moods y el propio
// documento. Se lee del servidor porque la caché local puede estar incompleta.
async function deleteUserData(uid) {
  const chats = await getDocsFromServer(collection(db, "users", uid, "chats"));
  const moods = await getDocsFromServer(collection(db, "users", uid, "moods"));
  const messages = await Promise.all(
    chats.docs.map((chat) => getDocsFromServer(collection(chat.ref, "messages")))
  );

  await deleteRefs([
    ...messages.flatMap((snap) => snap.docs.map((d) => d.ref)),
    ...chats.docs.map((d) => d.ref),
    ...moods.docs.map((d) => d.ref),
    doc(db, "users", uid),
  ]);
}

// Borra la cuenta y todos sus datos. Firebase exige un login reciente para
// borrar el usuario, así que siempre se reautentica con la contraseña.
// Tras esto la instancia de Firestore queda cerrada: hay que recargar la app.
export async function deleteAccount(password) {
  const user = auth.currentUser;
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await deleteUserData(user.uid);
  await deleteUser(user);

  // Las reflexiones también quedaban en la caché offline del dispositivo.
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    /* no crítico: la cuenta y los datos del servidor ya están borrados */
  }
}
