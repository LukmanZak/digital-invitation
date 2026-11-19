import sharp from 'sharp';
const files = process.argv.slice(3);
const cell = 260;
const tiles = await Promise.all(files.map(async (f) => sharp(f).resize(cell, cell, { fit: 'contain', background: { r: 200, g: 200, b: 200, alpha: 1 } }).flatten({ background: '#c8c8c8' }).png().toBuffer()));
const cols = 4, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#c8c8c8' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cell, top: Math.floor(i / cols) * cell })))
  .png().toFile(process.argv[2]);
