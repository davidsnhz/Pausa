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

Recomendación: pistas en loop de 1–3 min, mono o estéreo, ~128 kbps para
mantener la app ligera. Se reproducen en bucle (`loop`) y solo suena una a la vez.

Mientras no existan los archivos, la app no falla: al pulsar una tarjeta la
reproducción simplemente no arranca (se captura el error).
