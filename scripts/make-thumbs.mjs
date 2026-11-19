// Makes 512px "*.s.webp" copies used for the framed photos inside the 3D hall (keeps GPU memory small).
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = new URL('../public/asset', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const f of walk(root)) {
  if (!f.endsWith('.webp') || f.endsWith('.s.webp')) continue;
  await sharp(f).resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, alphaQuality: 85 }).toFile(f.replace(/\.webp$/, '.s.webp'));
  n++;
}
console.log('thumbs:', n);
