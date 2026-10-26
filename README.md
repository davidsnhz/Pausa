# Pausa

Un "botiquín de primeros auxilios emocionales" y diario inteligente: chat de
reflexión diaria, registro de ánimo, sonidos ambientales y respiración guiada.
PWA en React (Vite) con Firebase, pensada para instalarse en el móvil.

> Filosofía "Desinstalación Positiva": la app transmite calma, sin
> notificaciones agresivas ni patrones de retención. **No es un servicio médico.**

---

## Requisitos

- Node.js 18+ (probado con 24).

## Puesta en marcha (desarrollo)

```bash
npm install
npm run dev
```

Abre http://localhost:5173

### Configurar Firebase

1. Crea un proyecto en https://console.firebase.google.com
2. Activa **Authentication → Sign-in method → Correo electrónico/contraseña**.
   (NO actives Google/Apple: la app usa solo email/contraseña a propósito.)
3. Crea una base de datos **Firestore**.
4. Copia `.env.example` a `.env` y rellena tus credenciales (Configuración del
   proyecto → Tus apps → app Web). Reinicia `npm run dev` tras editar `.env`.
5. Publica las **reglas de seguridad**: Firestore → pestaña Reglas → pega el
   contenido de [`firestore.rules`](firestore.rules) → Publicar. (O por CLI:
   `firebase deploy --only firestore:rules`.)

### Probar sin tocar los datos reales (emuladores de Firebase)

Auth y Firestore corren en local con un proyecto ficticio (`demo-pausa`), con
las mismas reglas de `firestore.rules`. Requiere **Java 21+**.

```bash
npm run emulators   # terminal 1 — panel en http://localhost:4000
npm run dev:emu     # terminal 2 — app en http://localhost:5173
```

Los datos se borran al parar los emuladores.

### Sonidos ambientales

Coloca 8 archivos `.mp3` en `public/sounds/` con los nombres exactos que indica
[`public/sounds/README.md`](public/sounds/README.md). Sin ellos, la pantalla de
Relax funciona pero no suena nada. Fuentes libres: Pixabay, Freesound (CC0),
Mixkit.

### Chat con IA (Claude)

El acompañante responde con Claude a través de la función de Vercel
[`api/chat.js`](api/chat.js). **La clave de la API vive solo ahí, nunca en el
frontend**, y la función solo atiende a usuarios con sesión (verifica el token
de Firebase). Para activarla:

1. Crea una clave en https://console.anthropic.com → API Keys.
2. En Vercel → Settings → Environment Variables, añade `ANTHROPIC_API_KEY`
   (marca Production y Preview). Opcional: `ANTHROPIC_MODEL` para usar otro
   modelo (por defecto `claude-opus-5-5`; `claude-haiku-5-5` es mucho más barato).
3. Vuelve a desplegar. Recomendado: pon un límite de gasto mensual en la consola
   de Anthropic (Settings → Limits).

Sin clave (o en local con `npm run dev`, donde no corre la función), el chat
responde con frases empáticas de _fallback_ y la app sigue funcionando.
`VITE_AI_PROXY_URL` solo hace falta para apuntar a otra URL (p. ej. desde la
app nativa).

---

## Producción

```bash
npm run build      # genera dist/
npm run preview    # sirve dist/ en local para probar (http://localhost:4173)
```

### Desplegar en Vercel

1. Sube el repo a GitHub e impórtalo en https://vercel.com (framework: **Vite**,
   build `npm run build`, output `dist`). O usa la CLI: `npm i -g vercel && vercel`.
2. En **Settings → Environment Variables** del proyecto en Vercel, añade las
   mismas variables de tu `.env` (`VITE_FIREBASE_*`, y `VITE_AI_PROXY_URL` si la
   usas). Sin esto, la app desplegada no conecta con Firebase.
3. Deploy. El [`vercel.json`](vercel.json) ya reescribe las rutas para que React
   Router funcione al recargar (`/stats`, `/profile`, etc.).
4. En la consola de Firebase, añade el dominio de Vercel en **Authentication →
   Settings → Dominios autorizados**.

### Instalarla como app en el iPhone (gratis, sin App Store)

Con la app desplegada (HTTPS, p. ej. tu URL de Vercel):

1. Ábrela en **Safari** en el iPhone.
2. Toca **Compartir** (el cuadrado con la flecha) → **Añadir a pantalla de
   inicio**.
3. Aparece un icono de Pausa; al abrirlo va a **pantalla completa**, sin barras
   del navegador, como una app.

Esto es gratis y no necesita cuenta de desarrollador de Apple (los 99 $/año solo
hacen falta para publicar en la App Store). En Android/escritorio con Chrome
saldrá directamente el botón "Instalar".

Los iconos se generan desde la mascota con `node scripts/gen-icons.mjs`.

---

## App nativa iOS (Capacitor) — pendiente

El empaquetado para la App Store con Capacitor está preparado en el código
(`services/native.js` con carga dinámica de plugins), pero el build final
requiere **macOS + Xcode** (`npx cap add ios && npx cap sync && npx cap open ios`).
Se hará en una fase posterior sobre un Mac.

---

## Estructura

```
api/
└── chat.js      Función de Vercel: el acompañante con Claude (la clave vive aquí)
src/
├── components/  Mascot, BottomNav, Modal, BottomSheet, Page, ErrorBoundary
├── pages/       Splash, Login, Dashboard, Chat, Relax, Stats, Profile, Legal
├── context/     AuthContext (sesión + perfil), DataContext (ánimos y resúmenes precargados)
├── hooks/       useNow (fecha al volver a la app), useGoBack (volver seguro),
│                useEnterOnce (animaciones de entrada solo la primera vez)
├── services/    firebase, ai, native, streak, account, theme
└── utils/       date (dateKey, greeting, currentWeek)
```
