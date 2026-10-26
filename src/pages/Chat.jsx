// pages/Chat.jsx
// ----------------------------------------------------------------------------
// 4. Chat "Tu espacio seguro": pantalla completa SIN navbar. Burbujas de
// usuario oscuras a la derecha, IA claras a la izquierda con mini-mascota
// "listening". Indicador de escribiendo. Mensajes persistidos en Firestore en
// tiempo real (onSnapshot). Tras cada respuesta se actualiza el resumen del día
// (alimenta el Dashboard), así está al día aunque se cierre la app sin "volver".
// ----------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ArrowLeft, Send } from "lucide-react";

import { useAuth, displayNameOf } from "../context/AuthContext";
import { db } from "../services/firebase";
import { getAIReply, getChatSummary } from "../services/ai";
import { touchStreak } from "../services/streak";
import { dateKey } from "../utils/date";
import { hideKeyboard } from "../services/native";
import { useGoBack } from "../hooks/useGoBack";

import Mascot from "../components/Mascot";
import Page from "../components/Page";

export default function Chat() {
  const { user, profile } = useAuth();
  const goBack = useGoBack("/");
  const today = dateKey();

  // Mensaje de bienvenida de la IA, personalizado con el nombre.
  const nombre = displayNameOf(user, profile);
  const WELCOME = `Hola${nombre ? ", " + nombre : ""}. Este es tu espacio, sin juicios. ¿Qué tienes en mente hoy?`;

  const [messages, setMessages] = useState(null); // null hasta la primera lectura
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef(null);
  const scrolledOnce = useRef(false);

  const chatDoc = user ? doc(db, "users", user.uid, "chats", today) : null;
  const messagesCol = user
    ? collection(db, "users", user.uid, "chats", today, "messages")
    : null;

  // Suscripción en tiempo real a los mensajes del día.
  useEffect(() => {
    if (!messagesCol) return;
    const q = query(messagesCol, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMessages([])
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Autoscroll al final cuando llegan mensajes o aparece el indicador. La
  // primera vez, directo y antes de pintar (sin verse el desplazamiento); luego, suave.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages === null) return;
    el.scrollTo({ top: el.scrollHeight, behavior: scrolledOnce.current ? "smooth" : "auto" });
    scrolledOnce.current = true;
  }, [messages, typing]);

  async function send() {
    const value = text.trim();
    if (!value || typing || !messagesCol) return;
    setText("");
    // "Escribiendo" desde el primer momento: así no se puede mandar otro mensaje
    // mientras este aún se guarda (con mala conexión puede tardar).
    setTyping(true);
    hideKeyboard();

    // Historial ANTES de guardar: el mensaje nuevo aún no ha llegado por
    // onSnapshot, así que va una sola vez (al final).
    const history = [
      { role: "ai", text: WELCOME },
      ...(messages || []).map((m) => ({ role: m.role, text: m.text })),
      { role: "user", text: value },
    ];

    try {
      // 1) Persistir el mensaje del usuario + contar el check-in del día (racha).
      //    lastMessage es siempre lo que escribe la persona (respaldo del resumen).
      await addDoc(messagesCol, { role: "user", text: value, createdAt: serverTimestamp() });
      await setDoc(chatDoc, { lastMessage: value, updatedAt: serverTimestamp() }, { merge: true });
      touchStreak(user.uid);

      // 2) Pedir respuesta a la IA.
      const reply = await getAIReply(history, nombre);
      await addDoc(messagesCol, { role: "ai", text: reply, createdAt: serverTimestamp() });

      // 3) Actualizar el resumen del día en segundo plano (no hace esperar).
      getChatSummary([...history, { role: "ai", text: reply }])
        .then((summary) => summary && setDoc(chatDoc, { summary }, { merge: true }))
        .catch(() => {});
    } catch {
      /* si falla la persistencia (Firebase sin configurar), no rompemos la UI */
    } finally {
      setTyping(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Page>
      {/* min-h-0: sin él, con muchos mensajes este bloque crece más que la
          pantalla y la barra de escribir queda fuera de la vista. */}
      <div className="pt-safe-14 pb-safe-6 flex min-h-0 flex-1 flex-col px-5">
        <header className="mb-5 flex items-center">
          <button onClick={goBack} aria-label="Volver">
            <ArrowLeft size={24} />
          </button>
          <h2 className="flex-1 pr-6 text-center text-base font-bold tracking-[-0.5px]">
            Tu espacio seguro
          </h2>
        </header>

        {/* Lista de mensajes */}
        <div ref={scrollRef} className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
          {/* La conversación aparece entera de una vez, no la bienvenida
              primero y los mensajes del día un instante después. */}
          {messages !== null && <AiBubble text={WELCOME} />}

          {messages?.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-[20px] rounded-br-[4px] bg-black p-4 text-sm leading-relaxed text-white dark:bg-white dark:text-black"
              >
                {m.text}
              </div>
            ) : (
              <AiBubble key={m.id} text={m.text} />
            )
          )}

          {typing && <TypingIndicator />}
        </div>

        {/* Barra de entrada */}
        <div className="flex items-center gap-2.5 pt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={2000}
            placeholder="Escribe lo que sientes..."
            className="flex-1 rounded-full bg-neutral-100 px-5 py-3.5 text-sm outline-none placeholder:text-neutral-400 dark:bg-neutral-900"
          />
          <button
            onClick={send}
            disabled={typing}
            aria-label="Enviar"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-90 disabled:opacity-40 dark:bg-white dark:text-black"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </Page>
  );
}

// Burbuja de IA con mini-mascota "listening".
function AiBubble({ text }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-1 shrink-0">
        <Mascot state="listening" size={28} />
      </div>
      <div className="max-w-[85%] rounded-[20px] rounded-bl-[4px] bg-neutral-100 p-4 text-sm leading-relaxed dark:bg-neutral-900">
        {text}
      </div>
    </div>
  );
}

// Indicador de "escribiendo" (3 puntos animados).
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-1 shrink-0">
        <Mascot state="listening" size={28} />
      </div>
      <div className="flex gap-1 rounded-[20px] rounded-bl-[4px] bg-neutral-100 px-4 py-4 dark:bg-neutral-900">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-neutral-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
