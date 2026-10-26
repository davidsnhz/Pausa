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
  const week = currentWeek(useNow());
  const from = week[0].key;
  const to = week[6].key;

  const [moods, setMoods] = useState(null);
  const [weekChats, setWeekChats] = useState(null);

  useEffect(() => {
    setMoods(null);
    if (!user) return;
    return onSnapshot(
      collection(db, "users", user.uid, "moods"),
      (snap) => setMoods(toMap(snap, (d) => d.emoji)),
      () => setMoods({})
    );
  }, [user]);

  useEffect(() => {
    setWeekChats(null);
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "chats"),
      where(documentId(), ">=", from),
      where(documentId(), "<=", to)
    );
    return onSnapshot(
      q,
      (snap) => setWeekChats(toMap(snap, (d) => d)),
      () => setWeekChats({})
    );
  }, [user, from, to]);

  const value = useMemo(() => ({ moods, weekChats }), [moods, weekChats]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
