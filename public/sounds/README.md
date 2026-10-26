# Sonidos ambientales

Coloca aquí los 8 archivos de audio en formato `.mp3` con estos nombres EXACTOS
(el `id` que usa la app en `src/pages/Relax.jsx`):

| Archivo                  | Sonido               |
| ------------------------ | -------------------- |
| `ruido-marron.mp3`       | Ruido marrón         |
| `ruido-blanco.mp3`       | Ruido blanco         |
| `playa.mp3`              | Playa                |
| `arroyo.mp3`             | Arroyo               |
| `lluvia-suave.mp3`       | Lluvia suave         |
| `lluvia-tejado.mp3`      | Lluvia en el tejado  |
| `bosque.mp3`             | Bosque               |
| `fogata.mp3`             | Fuego de fogata      |

Recomendación: pistas en loop de 3–5 min, estéreo, ~96 kbps (unos 2–4 MB) para
mantener la app ligera. Se reproducen en bucle (`loop`) y solo suena una a la vez.

Tienen que ser **mp3 de verdad**: un vídeo o un `.m4a` renombrado a `.mp3` puede
sonar en Chrome pero fallar en el iPhone.

Mientras no existan los archivos, la app no falla: la tarjeta muestra
"No disponible" en lugar de fingir que suena.
