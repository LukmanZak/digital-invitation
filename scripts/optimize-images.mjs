// Converts public/asset/**/*.png to WebP (max 1000px on the long side) and removes the PNGs.
import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('../public/asset', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let before = 0, after = 0;
for (const f of walk(root)) {
  if (extname(f).toLowerCase() !== '.png') continue;
  const out = f.replace(/\.png$/i, '.webp');
  before += statSync(f).size;
  await sharp(f).resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(out);
  after += statSync(out).size;
  unlinkSync(f);
}
console.log(`PNG ${(before / 1e6).toFixed(1)} MB -> WebP ${(after / 1e6).toFixed(1)} MB`);
