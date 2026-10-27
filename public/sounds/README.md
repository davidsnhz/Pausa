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

Mientras falte un archivo, su tarjeta sale al final como "Próximamente" y no se
puede pulsar. En cuanto se añade el `.mp3` aparece disponible (en desarrollo,
reinicia `npm run dev`).

`ruido-blanco.mp3` es ruido blanco generado (2 min en bucle, estéreo, 128 kbps):

```bash
ffmpeg -f lavfi -i "anoisesrc=d=120:c=white:r=44100:a=0.14:s=11" -f lavfi -i "anoisesrc=d=120:c=white:r=44100:a=0.14:s=29" -filter_complex "[0][1]amerge=inputs=2,lowpass=f=14000" -ac 2 -c:a libmp3lame -b:a 128k ruido-blanco.mp3
```
