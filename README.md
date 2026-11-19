# Undangan 3D: Nida & Lukman

Perjalanan 3D mengikuti scroll: padang, gerbang kastil, halaman depan, aula pernikahan (kartu di dinding kiri), pintu samping ke taman journey (foto + cerita), kembali masuk, dinding kanan (RSVP, ucapan, galeri), lalu tulisan Thank you di tengah pelaminan. Dirancang untuk HP (portrait) dulu.
Vite + three.js (tanpa React). Isi undangan (ayat, sapaan, akad/resepsi, countdown, hadiah, RSVP, ucapan, penutup) adalah
**papan HTML yang digantung di dunia 3D** (CSS3DRenderer + "lubang" di kanvas WebGL), jadi ikut perspektif dan tertutup
benda yang ada di depannya. Foto cerita dan galeri adalah bingkai di dinding aula; ketuk untuk memperbesar.

```bash
bun install        # atau: npm install
bun run dev        # http://localhost:5173
bun run build      # hasil di dist/
bun run preview
```

Uji tampilan tanpa WebGL: tambahkan `?nogl` ke URL.

Pengecekan dev di console (saat `bun run dev`): `__scene.checkVisibility()` (papan atau papan foto yang tertutup benda), `__scene.checkCameraPath()` (kamera menembus dinding), `__scene.insideProfile()`.

"Tertahan": kamera diam sekitar 2/3 jarak scroll di tiap papan (`hold` di `stops.js`), dan scroll-snap CSS menarik ke posisi baca bila jari berhenti dekat papan. Snap mati saat kolom isian fokus atau dialog terbuka.

## Struktur
- `src/scene/layout.js`: ukuran aula, pintu samping, dan lintasan taman; `src/scene/garden.js`: taman, papan foto journey, penanda jejak
- `src/scene/stops.js`: **satu daftar** untuk titik kamera, panjang scroll tiap titik, dan papan yang tergantung di sana (posisi, ukuran, penyangga)
- `src/scene/boards.js`: menggantung papan HTML di dunia 3D; `src/boards.css`: kulit papan (spanduk, gulungan, plakat)
- `src/scene/` lainnya: `world` (padang), `castle` (gerbang, halaman), `hall` (aula, bingkai), `particles`
- `src/config.js`: data undangan (nama, tanggal, lokasi, rekening, cerita, galeri)
- `src/legacy.js`: perilaku undangan lama (countdown, kartu amplop, RSVP, ucapan, sheet) yang dipindahkan apa adanya
- `src/api.js`: Supabase lewat `fetch` (tanpa SDK)

## Supabase (RSVP dan ucapan)
1. Buat proyek Supabase, jalankan `supabase/schema.sql` di SQL Editor.
2. Salin `.env.example` ke `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (anon/public key saja). Isi juga di Vercel > Settings > Environment Variables.
3. Daftar tamu: buat `tamu.csv` (`nama,max_tamu`), lalu jalankan lokal:
   `SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SITE_URL=https://domain-kamu node scripts/import-guests.mjs tamu.csv`
   Hasilnya `links.csv` berisi link personal `https://domain-kamu/?g=<kode>` untuk dikirim lewat WhatsApp. Service key hanya dipakai di komputer kamu, jangan masuk repo atau Vercel.
4. Tabel tidak bisa dibaca langsung dari browser; semua lewat fungsi (`get_guest`, `submit_rsvp`, `submit_wish`, `list_wishes`). Satu RSVP per tamu (bisa diubah), maksimal 3 ucapan per tamu. Ucapan yang tidak pantas disembunyikan dengan `hidden = true` di dashboard.
5. Supabase gratis menjeda proyek setelah 7 hari tanpa aktivitas. `.github/workflows/keepalive.yml` memanggil fungsi ringan 2x seminggu (isi secrets `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di GitHub), atau pakai Supabase Pro.

Tanpa `?g=` atau tanpa env Supabase, form tetap jalan tetapi hanya tersimpan di browser (untuk uji coba). `?to=Nama` hanya mengganti nama tampilan.

## Deploy ke Vercel
Framework preset **Vite**, Install `bun install`, Build `bun run build`, Output `dist`.
Jika repo-nya lebih besar dari folder ini, isi **Root Directory** dengan `Digital_invitation/web_invitation_4`.
`vercel.json` sudah mengatur cache panjang untuk aset.

Kapasitas (satu pernikahan, ±1000 tamu): satu deployment melayani semua link. Paket gratis Vercel Hobby (100 GB transfer dan 1 juta request CDN per bulan) dan Supabase Free (500 MB database, 5 GB egress) cukup. Hobby hanya untuk pemakaian pribadi non-komersial.

## Gambar
`bun scripts/optimize-images.mjs` (PNG ke WebP) dan `bun scripts/make-thumbs.mjs` (versi 512 px untuk bingkai foto).
