// Data undangan: ganti nama, tanggal, lokasi, hadiah, cerita, dan galeri di sini.
export const CONFIG = {
  bride: 'Nida',
  groom: 'Lukman',
  akad:   { at: '2027-05-29T08:00:00+07:00', time: 'Sabtu, 29 Mei 2027 · 08.00 WIB', place: 'Masjid Al-Ikhlas\nJl. Melati Raya No. 255, Jakarta Selatan', q: 'Jl Melati Raya No 255 Jakarta Selatan' },
  resepsi:{ time: '13.00 WIB', place: 'The Grand Ballroom\nJl. Melati Raya No. 255, Jakarta Selatan', q: 'Jl Melati Raya No 255 Jakarta Selatan' },
  // hadiah (dummy, ganti dengan data asli)
  gift: {
    bank:    { name: 'Mandiri', logo: 'asset/logo/mandiri.svg', no: '123 456 7899',   an: 'Nida (contoh)' },
    ewallet: { name: "Livin' by Mandiri", no: '0812 3456 7890', an: 'Lukman (contoh)' },
    address: { name: 'Nida & Lukman', phone: '0812 3456 7890', lines: ['Jl. Melati Raya No. 255', 'Jakarta Selatan 12345'], q: 'Jl Melati Raya No 255 Jakarta Selatan' }
  },
  map:   'asset/new/cutout/map.webp',
  photos: {
    nida:   'asset/new/cutout/portrait_nida.webp',
    lukman: 'asset/new/cutout/portrait_lukman.webp'
  },
  // stop perjalanan (urut). fit: cover = foto, contain = ikon/ilustrasi transparan
  story: [
    { img: 'asset/new/cutout/story_school.webp',  pos: '50% 40%', fit: 'cover',   cap: 'Pertama bertemu', text: 'Pertemuan pertama kami, awal yang sederhana namun tak terlupakan.' },
    { img: 'asset/new/cutout/story_picnic.webp',  pos: '50% 50%', fit: 'cover',   cap: 'Kencan pertama',  text: 'Kencan pertama yang penuh tawa dan cerita di bawah langit sore.' },
    { img: 'asset/new/cutout/rings.webp',         pos: '50% 50%', fit: 'contain', cap: 'Lamaran',         text: 'Hari ketika kami saling berjanji untuk melangkah bersama.' },
    { img: 'asset/new/cutout/couple_half.webp',   pos: '50% 30%', fit: 'cover',   cap: 'Melangkah bersama', text: 'Bergandengan tangan menyusuri hari-hari berikutnya.' },
    { img: 'asset/new/cutout/stage.webp',         pos: '50% 50%', fit: 'contain', cap: 'Resepsi',         text: 'Hari bahagia kami, bersama keluarga dan sahabat.' }
  ],
  // galeri (True sight): tambah/ganti foto di sini, jumlahnya bebas (sementara pakai ilustrasi)
  gallery: [
    { img: 'asset/new/cutout/story_school.webp',    pos: '50% 40%', cap: 'Awal cerita', fit: 'cover' },
    { img: 'asset/new/cutout/story_picnic.webp',    pos: '50% 50%', cap: 'Piknik sore', fit: 'cover' },
    { img: 'asset/new/cutout/gallery_hikers.webp',  pos: '50% 50%', cap: 'Mendaki bersama', fit: 'cover' },
    { img: 'asset/new/cutout/gallery_trail.webp',   pos: '50% 35%', cap: 'Jalur hijau', fit: 'cover' },
    { img: 'asset/new/cutout/gallery_noodles.webp', pos: '50% 50%', cap: 'Makan mie ayam', fit: 'cover' },
    { img: 'asset/new/cutout/couple_wave.webp',     pos: '50% 20%', cap: 'Sampai jumpa', fit: 'cover' },
    { img: 'asset/new/cutout/couple_half.webp',     pos: '50% 30%', cap: 'Bahagia bersama', fit: 'cover' },
    { img: 'asset/new/cutout/rings.webp',           pos: '50% 50%', cap: 'Cincin kami', fit: 'contain' },
    { img: 'asset/new/cutout/stage.webp',           pos: '50% 50%', cap: 'Pelaminan', fit: 'contain' }
  ],
  guestDefault: 'Nama Tamu'
};
