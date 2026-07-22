// scripts/gen-icons.mjs
// Genera los iconos PWA a partir de la mascota (SVG → PNG) con sharp.
// Uso:  node scripts/gen-icons.mjs
// Salida en public/: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

// Mascota blanca sobre fondo negro, con margen (zona segura "maskable").
function svg(size) {
  const scale = (size * 0.58) / 100; // viewBox 100x100 → ~58% del icono
  const off = size * 0.21; // centrado
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#000000"/>
    <g fill="#ffffff" transform="translate(${off} ${off}) scale(${scale})">
      <circle cx="50" cy="24" r="14"/>
      <rect x="14" y="46" width="72" height="16" rx="8"/>
      <rect x="24" y="70" width="52" height="16" rx="8"/>
    </g>
  </svg>`;
}

async function png(size, out) {
  await sharp(Buffer.from(svg(size))).png().toFile(`public/${out}`);
  console.log("✓", out, `(${size}x${size})`);
}

await png(192, "icon-192.png");
await png(512, "icon-512.png");
await png(180, "apple-touch-icon.png");
await png(64, "favicon.png");
console.log("Iconos generados en public/");
