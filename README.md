# Pausa

Un botiquín de primeros auxilios emocionales y un diario: chat para reflexionar cada día, registro de ánimo, sonidos de fondo y respiración guiada. Es una PWA en React (Vite) con Firebase, pensada para instalarla en el móvil.

La idea es que transmita calma: nada de notificaciones pesadas ni trucos para que vuelvas. Y ojo, **no es un servicio médico.**

**Pruébala:** https://pausa-chi.vercel.app

## Arrancarlo en local

Hace falta Node 20.19 o más (yo uso la 24).

```bash
npm install
npm run dev
```

Se abre en http://localhost:5173

```bash
npm run lint
npm test       # racha, fechas, resumen del mes y respuestas del chat
```

### Firebase

1. Crear un proyecto en https://console.firebase.google.com
2. En Authentication activar solo correo y contraseña (Google y Apple no, es a propósito).
3. Crear una base de datos de Firestore.
4. Copiar `.env.example` a `.env` y poner las credenciales de la app web. Después hay que reiniciar `npm run dev`.
5. Subir las reglas de [`firestore.rules`](firestore.rules), desde la consola o con `firebase deploy --only firestore:rules`.

### Emuladores

Para probar sin tocar datos reales uso los emuladores de Auth y Firestore, con un proyecto de mentira (`demo-pausa`) y las mismas reglas. Necesitan Java 21 o más.

```bash
npm run emulators   # en una terminal (panel en http://localhost:4000)
npm run dev:emu     # en otra
npm run seed:emu    # si quieres una cuenta de prueba con dos meses de datos
```

Al parar los emuladores se borra todo. La cuenta de prueba está en [`scripts/seed-emulators.mjs`](scripts/seed-emulators.mjs).

### Textos legales

Privacidad y términos están en `src/components/LegalText.jsx`, y los datos (responsable, correo, edad mínima y versión) en `src/utils/legal.js`. Al registrarse hay que aceptarlos y se guarda qué versión se aceptó en `users/{uid}`.

Si cambio los textos tengo que subir `LEGAL.version`, así a todo el mundo se le vuelve a pedir que los acepte.

El correo de recuperar contraseña lo manda Firebase en español, y se puede cambiar en Authentication → Templates.

### Sonidos

Son 8 `.mp3` en `public/sounds/`, con los nombres que pone en [`public/sounds/README.md`](public/sounds/README.md). De momento están el ruido marrón y el blanco; los demás salen en Relax como "Próximamente". Los saco de Pixabay, Freesound (CC0) y Mixkit.

### Chat con IA

Sin configurar nada, el chat contesta con frases preparadas según el tono del mensaje. Para usar un modelo de verdad hay que poner `VITE_AI_PROXY_URL` apuntando a un backend propio (por ejemplo una Cloud Function). La clave de la API va en ese backend, nunca en el frontend.

## Producción

```bash
npm run build
npm run preview    # para probar la build en http://localhost:4173
```

Está desplegada en Vercel (Vite, build `npm run build`, salida `dist`). Cosas a tener en cuenta:

- Las variables del `.env` (`VITE_FIREBASE_*` y `VITE_AI_PROXY_URL` si se usa) hay que ponerlas también en Vercel, si no la app no conecta con Firebase.
- [`vercel.json`](vercel.json) reescribe las rutas para que al recargar en `/stats` o `/profile` no dé 404.
- El dominio de Vercel tiene que estar en los dominios autorizados de Firebase Authentication.

### Instalarla en el iPhone

Abrirla en Safari, Compartir → Añadir a pantalla de inicio. Se abre a pantalla completa como una app y no hace falta pasar por la App Store. En Android o en el ordenador con Chrome sale directamente el botón de instalar.

Los iconos se generan desde la mascota con `node scripts/gen-icons.mjs`.

## App nativa para iOS (pendiente)

El código ya está preparado para Capacitor (`services/native.js` carga los plugins solo si existen), pero para compilarla hace falta un Mac con Xcode:

```bash
npx cap add ios && npx cap sync && npx cap open ios
```

## Carpetas

```
src/
  components/  Mascot, BottomNav, Modal, BottomSheet, Page, ErrorBoundary
  pages/       Splash, Login, Dashboard, Chat, Relax, Stats, Profile, Legal
  context/     AuthContext (sesión y perfil) y DataContext (ánimos y resúmenes)
  hooks/       useNow, useGoBack, useEnterOnce
  services/    firebase, ai, native, streak, account, theme
  utils/       date, mood, legal
```
