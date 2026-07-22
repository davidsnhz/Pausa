# PROMPT PARA CLAUDE CODE — Proyecto "Pausa"

> Cómo usarlo: crea una carpeta vacía, mete dentro este archivo y
> `PausaMockup.jsx`, abre la terminal en esa carpeta, ejecuta `claude` y
> pégale esto (o dile: "lee PROMPT-CLAUDE-CODE.md y PausaMockup.jsx y
> construye el proyecto").

---

Actúa como Tech Lead Full-Stack y diseñador UX/UI senior. Construye desde
cero la app "Pausa": una PWA en React empaquetada con Capacitor cuyo
destino principal es la **App Store de iOS**.

En la carpeta tienes `PausaMockup.jsx`: es la **referencia visual
canónica** de las 8 vistas (estructura, jerarquía, espaciados, clases
Tailwind, estados de la mascota, dark mode). La implementación real debe
verse exactamente así. Léelo antes de escribir código.

## 1. Contexto y filosofía

- Pausa es un "botiquín de primeros auxilios emocionales" y diario
  inteligente: chat de reflexión diaria, registro de ánimo, sonidos
  ambientales y respiración guiada.
- Regla de negocio crítica: NO hay botón de pánico ni llamadas de
  emergencia integradas.
- Filosofía "Desinstalación Positiva": la app debe transmitir paz, no
  generar adicción. Nada de notificaciones agresivas, badges rojos ni
  dark patterns de retención.
- La app NO es un servicio médico y no debe presentarse como tal en
  ningún texto (esto además es un requisito de revisión de Apple).

## 2. Stack (obligatorio)

- React 18 + Vite, JavaScript/JSX (no TypeScript).
- Tailwind CSS con `darkMode: "class"` (modo oscuro con `dark:`).
- Framer Motion para todas las animaciones.
- Firebase v10: Auth (email/contraseña) y Firestore.
- React Router DOM.
- Lucide React para iconos.
- Capacitor (@capacitor/core, ios, status-bar, keyboard, splash-screen)
  para el empaquetado iOS. `webDir: "dist"`.

## 3. Sistema de diseño

- Estética minimalista premium estilo iOS nativo. Fondo blanco puro en
  claro, negro puro en oscuro. Sin colores de acento salvo el verde del
  toggle y el rojo de acciones destructivas.
- Bordes muy redondeados: rounded-3xl, rounded-full, elementos pill.
- Tipografía: Inter (cuerpo) + Space Grotesk (títulos), tracking -0.5px
  en títulos. Cargar desde Google Fonts en index.html.
- La mascota (persona meditando abstracta, SVG de 3 piezas: cabeza
  círculo + cuerpo rect + base rect) es el logo vivo. Componente
  `<Mascot state="meditating|greeting|listening|sleeping" size={n} />`
  con animaciones por estado (ver mockup): meditating respira en ciclo
  de 8s, greeting saluda con saltito, listening ladea la cabeza con
  pulso sutil, sleeping baja opacidad y cabeza caída.

## 4. Arquitectura

```
src/
├── components/   (Mascot, BottomNav, modales reutilizables)
├── pages/        (Login, Dashboard, Chat, Relax, Stats, Profile, Legal)
├── context/      (AuthContext con onAuthStateChanged y loading)
├── services/     (firebase.js, native.js, ai.js)
```

- Rutas protegidas vía AuthContext; mientras `loading`, mostrar el
  Splash (mascota + "Pausa." con fade-in).
- Navbar inferior flotante tipo píldora (Relax / Inicio / Stats) visible
  SOLO en Dashboard, Relax y Stats. Chat, Perfil y Legal van sin navbar.
- Transiciones de página con AnimatePresence.

## 5. Pantallas (usar el mockup como referencia px a px)

1. **Splash**: mascota meditando + "Pausa." fade-in. Deriva a Dashboard
   o Login según sesión.
2. **Login/Signup**: tabs pill "Iniciar Sesión" / "Crear Cuenta", campos
   email y contraseña, errores de Firebase traducidos al español.
3. **Dashboard**: cabecera con racha (fuego), saludo dinámico por hora
   ("Buenas tardes, David"), botón circular a Perfil. Calendario semanal
   (lunes a domingo); al tocar un día ANTERIOR se abre un BottomSheet
   que lee `users/{uid}/chats/{fecha}` y muestra el resumen. Tarjeta CTA
   grande oscura con mascota que navega al Chat.
4. **Chat "Tu espacio seguro"**: pantalla completa, cabecera con volver.
   Burbujas usuario oscuras a la derecha, IA claras a la izquierda con
   mini-mascota "listening". Indicador de escribiendo (3 puntos).
   Mensajes persistidos en Firestore en tiempo real (onSnapshot).
5. **Relax**: 3 tabs. (a) Sonidos: exactamente estos 8 — Ruido marrón,
   Ruido blanco, Playa, Arroyo, Lluvia suave, Lluvia en el tejado,
   Bosque, Fuego de fogata — con reproducción REAL de audio en loop
   desde `/public/sounds/{id}.mp3` (un solo sonido a la vez, tarjeta
   activa resaltada con icono pausa). (b) Respiración: mascota grande
   meditando + texto "Inhala"/"Exhala" alternando cada 4s, sincronizado
   con su animación. (c) Ejercicios: tarjetas informativas (5-4-3-2-1,
   respiración en caja, escaneo corporal, descarga mental).
6. **Stats**: selector "¿Cómo te sientes hoy?" con 5 emojis
   (😢😟😐🙂😁); al pulsar se guarda y la sección hace fade-out dejando
   "Registro completado". Grid mensual de 7 columnas; día registrado =
   círculo negro relleno. Al tocar un día registrado: flip 3D con
   rotateY (Framer Motion, backfaceVisibility hidden) que revela el
   emoji, se mantiene 3 segundos y vuelve a girar al número.
7. **Perfil**: lista tipo Ajustes de iOS. Email del usuario, toggle Modo
   Oscuro (clase `dark` en `<html>` + localStorage + sincronizar
   StatusBar nativa), enlaces a Privacidad y Términos, Cerrar Sesión y
   Borrar Cuenta.
8. **Legal (/privacy y /terms)**: pantallas reales dentro de la app con
   política de privacidad y términos en español. Los términos deben
   incluir explícitamente que Pausa no es un servicio médico ni
   sustituye ayuda profesional, mencionando la línea 024 (España).

## 6. Modelo de datos Firestore

```
users/{uid}                          → { streak: number }
users/{uid}/chats/{YYYY-MM-DD}       → { lastMessage, summary?, updatedAt }
users/{uid}/chats/{YYYY-MM-DD}/messages/{id} → { role: "user"|"ai", text, createdAt }
users/{uid}/moods/{YYYY-MM-DD}       → { emoji, createdAt }
```

Helper `dateKey()` → "YYYY-MM-DD" en hora local, usado en toda la app.
Config de Firebase con placeholders claros para rellenar.

## 7. Requisitos de iOS / App Store (no negociables)

- `viewport-fit=cover` en index.html y utilidades `.pt-safe` /
  `.pb-safe` con `env(safe-area-inset-*)` en TODAS las pantallas y en el
  navbar flotante (notch, Dynamic Island y barra home).
- PROHIBIDO usar window.confirm / window.alert / window.prompt: siempre
  modales propios (se ven fuera de lugar en WKWebView).
- Borrar Cuenta debe funcionar de verdad (guideline 5.1.1v): modal
  propio de confirmación; si Firebase devuelve
  `auth/requires-recent-login`, pedir la contraseña en el mismo modal y
  reautenticar con EmailAuthProvider antes de borrar.
- Política de privacidad accesible DENTRO de la app (guideline 5.1.1).
- Solo login propio email/contraseña. NO añadir login de Google/Apple/
  Facebook (añadir login de terceros obligaría a implementar Sign in
  with Apple por la guideline 4.8).
- capacitor.config.json con appId placeholder tipo com.CAMBIAME.pausa,
  appName "Pausa", contentInset "never", Keyboard resize "native".
- Los plugins de Capacitor se importan con dynamic import y try/catch
  (servicio native.js) para que la app siga funcionando como web pura.
- overscroll-behavior none, sin tap-highlight, sin selección de texto
  accidental (feel nativo).

## 8. Chat con IA

- Crear `services/ai.js` con una función `getAIReply(history)` que
  encapsule la llamada al modelo (adapter). De inicio, implementarla
  contra la API de Anthropic con la clave leída de una variable de
  entorno `VITE_AI_PROXY_URL` apuntando a un endpoint propio (Cloud
  Function de Firebase), NUNCA la clave de la API en el frontend.
  Si la variable no existe, modo fallback: respuestas empáticas variadas
  aleatorias en español (mínimo 8 distintas) para que la app sea
  funcional sin backend.
- El sistema de la IA: acompañante empático de un diario, tono cálido y
  breve en español, hace preguntas abiertas, no da diagnósticos ni
  consejos médicos, y si detecta lenguaje de crisis debe sugerir con
  delicadeza hablar con alguien de confianza o con la línea 024.
- Al terminar una sesión de chat (al salir de la pantalla), generar un
  `summary` breve del día y guardarlo en el doc del chat (alimenta el
  BottomSheet del Dashboard).

## 9. Entrega

1. Proyecto Vite completo y funcional (`npm run dev` sin errores) con
   todos los archivos: configs de Tailwind/Capacitor, index.html con
   fuentes, index.css con safe areas, y las 8 vistas.
2. README.md con: setup, cómo rellenar Firebase, cómo añadir los mp3 de
   sonidos, y el flujo de build iOS (`npm run build && npx cap sync &&
   npx cap open ios`).
3. Añadir los scripts npm: `"ios": "npm run build && cap sync && cap open ios"`.
4. Código en español (textos de UI) con comentarios breves.
5. No inventes pantallas ni features extra: exactamente lo especificado.
