// context/DataContext.jsx
// ----------------------------------------------------------------------------
// Datos que varias pantallas necesitan AL INSTANTE, suscritos en tiempo real
// desde que hay sesión (no al entrar en cada pantalla). Así, al volver a Stats
// o abrir un día en el Dashboard, todo está ya pintado, sin estados de
// "cargando" que parpadean.
//   moods     → { "YYYY-MM-DD": emoji }                    (users/{uid}/moods)
//   weekChats → { "YYYY-MM-DD": { summary, lastMessage } } de la semana actual
// Valen `null` hasta la primera lectura (desde la caché local suele ser inmediata).
// ----------------------------------------------------------------------------
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../services/firebase";
import { useAuth } from "./AuthContext";
import { useNow } from "../hooks/useNow";
import { currentWeek } from "../utils/date";

const DataContext = createContext({ moods: null, weekChats: null });

function toMap(snap, pick) {
  const map = {};
  snap.forEach((d) => {
    map[d.id] = pick(d.data());
  });
  return map;
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const week = currentWeek(useNow());
  const from = week[0].key;
  const to = week[6].key;

  // Cada lectura va con la clave de lo que se pidió (cuenta y semana): si
  // cambia la sesión o la semana, la anterior deja de valer al instante.
  const [moodsRead, setMoodsRead] = useState({ key: null, data: null });
  const [chatsRead, setChatsRead] = useState({ key: null, data: null });
  const moodsKey = uid || null;
  const chatsKey = uid ? `${uid}|${from}|${to}` : null;

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, "users", uid, "moods"),
      (snap) => setMoodsRead({ key: uid, data: toMap(snap, (d) => d.emoji) }),
      () => setMoodsRead({ key: uid, data: {} })
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const key = `${uid}|${from}|${to}`;
    const q = query(
      collection(db, "users", uid, "chats"),
      where(documentId(), ">=", from),
      where(documentId(), "<=", to)
    );
    return onSnapshot(
      q,
      (snap) => setChatsRead({ key, data: toMap(snap, (d) => d) }),
      () => setChatsRead({ key, data: {} })
    );
  }, [uid, from, to]);

  const moods = moodsKey && moodsRead.key === moodsKey ? moodsRead.data : null;
  const weekChats = chatsKey && chatsRead.key === chatsKey ? chatsRead.data : null;

  const value = useMemo(() => ({ moods, weekChats }), [moods, weekChats]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
