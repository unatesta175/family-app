// Generates the Habits PWA icons (indigo, checklist mark) into public/icons.
// Run: node scripts/generate-habit-icons.mjs   (uses `sharp`, which ships with Next.js)
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

// 512x512 artwork. `inset` shrinks the mark so maskable icons keep it inside the safe zone.
function svg({ rounded, inset }) {
  const s = 512;
  const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7c7cff"/><stop offset="1" stop-color="#4747e0"/></linearGradient></defs>
    <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#g)"/>`;
  const k = 1 - inset * 2;
  const t = (s * inset).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${bg}
  <g transform="translate(${t} ${t}) scale(${k})" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 176l30 30 54-60" stroke-width="30"/>
    <path d="M120 276l30 30 54-60" stroke-width="30" opacity=".75"/>
    <path d="M120 376l30 30 54-60" stroke-width="30" opacity=".5"/>
    <path d="M256 190h150M256 290h150M256 390h150" stroke-width="30" opacity=".95"/>
  </g></svg>`;
}

const jobs = [
  ["habits-icon-192.png", 192, { rounded: true, inset: 0.08 }],
  ["habits-icon-512.png", 512, { rounded: true, inset: 0.08 }],
  ["habits-maskable-512.png", 512, { rounded: false, inset: 0.2 }],
  ["habits-apple-touch-icon.png", 180, { rounded: false, inset: 0.1 }],
];
for (const [name, size, opts] of jobs) {
  await sharp(Buffer.from(svg(opts))).resize(size, size).png().toFile(`${OUT}/${name}`);
  console.log("wrote", name);
}
