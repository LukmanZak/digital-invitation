// Impor daftar tamu dari CSV ke Supabase dan tulis links.csv berisi link siap kirim.
// Jalan LOKAL saja (memakai service_role key; jangan di-commit atau di-deploy):
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SITE_URL=https://undangan.contoh.com node scripts/import-guests.mjs tamu.csv
// Format tamu.csv (baris pertama header): nama,max_tamu     contoh baris:  Budi Santoso,2
import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SITE_URL } = process.env;
const file = process.argv[2];
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SITE_URL || !file) {
  console.error('Pakai: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SITE_URL=... node scripts/import-guests.mjs tamu.csv');
  process.exit(1);
}
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';            // tanpa karakter yang mirip (i, l, o, 0, 1)
const makeCode = () => Array.from({ length: 7 }, () => ALPHA[randomInt(ALPHA.length)]).join('');

const rows = readFileSync(file, 'utf8').split(/\r?\n/).slice(1).map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.lastIndexOf(',');
  const name = (i > 0 ? l.slice(0, i) : l).replace(/^"|"$/g, '').trim();
  const max = i > 0 ? parseInt(l.slice(i + 1), 10) : 2;
  return { name: name.slice(0, 60), max_guests: Math.min(10, Math.max(1, Number.isFinite(max) ? max : 2)) };
});
const used = new Set();
const guests = rows.map((r) => { let c; do { c = makeCode(); } while (used.has(c)); used.add(c); return { code: c, ...r }; });

const res = await fetch(`${SUPABASE_URL}/rest/v1/guests`, {
  method: 'POST',
  headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify(guests),
});
if (!res.ok) { console.error('Gagal:', res.status, await res.text()); process.exit(1); }

const base = SITE_URL.replace(/\/$/, '');
const csv = ['nama,max_tamu,link', ...guests.map((g) => `"${g.name}",${g.max_guests},${base}/?g=${g.code}`)].join('\n');
writeFileSync('links.csv', csv);
console.log(`${guests.length} tamu diimpor. Link ada di links.csv`);
