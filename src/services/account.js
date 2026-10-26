// services/account.js
// ----------------------------------------------------------------------------
// Borrado completo de la cuenta (guideline 5.1.1v de Apple y RGPD).
// Orden: reautenticar → borrar datos de Firestore → borrar usuario de Auth.
// Si se borrase antes el usuario, las reglas ya no dejarían tocar sus datos y
// se quedarían huérfanos para siempre.
// ----------------------------------------------------------------------------
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import {
  clearIndexedDbPersistence,
  collection,
  doc,
  getDocsFromServer,
  terminate,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";

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
