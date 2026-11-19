import * as THREE from 'three';
import { P, mat, marbleTexture } from './materials.js';
import { canvasTexture, rng, cutoutPlane, manager } from './util.js';
import { instanced, flowerCluster, flowerArch, archPoints } from './flora.js';
import { archWall, stoneMat, slab } from './castle.js';
import { HALL } from './layout.js';
import { CONFIG } from '../config.js';

const { Z0, Z1, W, H: WALL_H, VAULT, DOOR_W, DOOR_SPRING, EXIT_Z, ENTER_Z } = HALL;
const LEN = Z0 - Z1, ZC = (Z0 + Z1) / 2;
const SRGB = THREE.SRGBColorSpace;
const frameLoader = new THREE.TextureLoader(manager);

/** Framed photo: gold frame, cream matte, image fitted like CSS object-fit (cover | contain). */
function framedPhoto(item, w, h) {
  const grp = new THREE.Group();
  const gold = mat(P.gold);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, h + 0.34, 0.14), gold); back.position.z = 0.07;
  const matte = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.12, h + 0.12), new THREE.MeshBasicMaterial({ color: P.cream })); matte.position.z = 0.15;
  const pw = w - 0.1, ph = h - 0.1;
  const imgMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const img = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), imgMat); img.position.z = 0.17;
  const [px, py] = (item.pos || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
  frameLoader.load(item.img.replace(/\.webp$/, '.s.webp'), (tex) => {
    tex.colorSpace = SRGB; tex.anisotropy = 4;
    const fa = tex.image.width / tex.image.height, pa = pw / ph;
    if ((item.fit || 'cover') === 'cover') {
      if (fa > pa) { tex.repeat.x = pa / fa; tex.offset.x = (1 - tex.repeat.x) * px; } else { tex.repeat.y = fa / pa; tex.offset.y = (1 - tex.repeat.y) * (1 - py); }
    } else if (fa > pa) img.scale.y = pa / fa; else img.scale.x = fa / pa;
    imgMat.transparent = true; imgMat.alphaTest = 0.05;   // the illustrations have transparent corners
    imgMat.map = tex; imgMat.color.set(0xffffff); imgMat.needsUpdate = true;
  });
  grp.add(back, matte, img);
  return grp;
}

/** Small cream name plate under a frame (drawn on a canvas). */
function caption(text, w, h) {
  const t = canvasTexture(512, Math.round(512 * h / w), (c, cw, ch) => {
    c.fillStyle = 'rgba(251,247,234,.96)'; c.beginPath(); c.roundRect(4, 4, cw - 8, ch - 8, ch / 2.6); c.fill();
    c.strokeStyle = '#e2b04a'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#6f7f62'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = ch * 0.5; c.font = `${size}px Marelle, 'Segoe Script', cursive`;
    while (c.measureText(text).width > cw - 40 && size > 14) { size -= 2; c.font = `${size}px Marelle, 'Segoe Script', cursive`; }
    c.fillText(text, cw / 2, ch / 2 + 3);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

/** Big script title painted on the wall above a group of frames. */
function titlePlate(text, w, h) {
  const t = canvasTexture(1024, Math.round(1024 * h / w), (c, cw, ch) => {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2f6178';
    c.font = `${ch * 0.62}px Marelle, 'Segoe Script', cursive`; c.fillText(text, cw / 2, ch * 0.46);
    c.strokeStyle = '#e2b04a'; c.lineWidth = 5; c.beginPath(); c.moveTo(cw * 0.3, ch * 0.88); c.lineTo(cw * 0.7, ch * 0.88); c.stroke();
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

function curtain(w, h, color, seed) {
  const g = new THREE.PlaneGeometry(w, h, 22, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, Math.sin(x * 4.2 + seed) * 0.16 * (0.4 + 0.6 * (y / h + 0.5))); }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
}

function wallShape(len, h, doorsX) {
  const s = new THREE.Shape(), hw = DOOR_W / 2;
  s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, h); s.lineTo(0, 0);
  doorsX.forEach((x) => {
    const hole = new THREE.Path();
    hole.moveTo(x - hw, 0); hole.lineTo(x - hw, DOOR_SPRING); hole.absarc(x, DOOR_SPRING, hw, Math.PI, 0, true); hole.lineTo(x + hw, 0); hole.lineTo(x - hw, 0);
    s.holes.push(hole);
  });
  return s;
}

function wallTexture() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#f6eddc'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(217,196,160,.45)'; c.lineWidth = 2;
    for (let y = 0; y <= 2; y++) for (let x = 0; x <= 2; x++) { const cx = x * (w / 2), cy = y * (h / 2); c.beginPath(); c.moveTo(cx, cy - 30); c.lineTo(cx + 30, cy); c.lineTo(cx, cy + 30); c.lineTo(cx - 30, cy); c.closePath(); c.stroke(); }
    c.fillStyle = 'rgba(240,200,207,.25)';
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { c.beginPath(); c.arc(x * (w / 2) + w / 4, y * (h / 2) + h / 4, 9, 0, 7); c.fill(); }
  });
}

export function buildHall(q) {
  const g = new THREE.Group();
  const r = rng(99);
  const gold = mat(P.gold), cream = mat(P.cream), stone = mat(P.stone);
  const lights = [];

  /* ---- shell: floor, walls, barrel vault, end wall ---- */
  const floorTex = marbleTexture(); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(4.5, LEN / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, LEN), new THREE.MeshLambertMaterial({ map: floorTex, color: 0xf6ead4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.02, ZC); g.add(floor);

  const wt = wallTexture(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(LEN / 4, 2.5);
  const wallMat = new THREE.MeshLambertMaterial({ map: wt });
  const wtm = wallTexture(); wtm.wrapS = wtm.wrapT = THREE.RepeatWrapping; wtm.repeat.set(0.25, 0.25);   // ShapeGeometry uses metres as UV
  const wallMatM = new THREE.MeshLambertMaterial({ map: wtm });
  const dadoMat = new THREE.MeshLambertMaterial({ color: 0xead6c3 });
  const hw = DOOR_W / 2, doorsX = [Z0 - EXIT_Z, Z0 - ENTER_Z];                     // door positions along the left wall (local x)

  // right wall: plain
  {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(LEN, WALL_H), wallMat);
    wall.rotation.y = -Math.PI / 2; wall.position.set(W, WALL_H / 2, ZC); g.add(wall);
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 1.4), dadoMat); dado.rotation.y = -Math.PI / 2; dado.position.set(W - 0.02, 0.7, ZC); g.add(dado);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, LEN), gold); rail.position.set(W - 0.06, 1.45, ZC); g.add(rail);
  }
  // left wall: wallpaper with two arched side doors; dado and rail stop at the doors
  {
    const shape = wallShape(LEN, WALL_H, doorsX);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(shape), wallMatM);
    wall.rotation.y = Math.PI / 2; wall.position.set(-W, 0, Z0); g.add(wall);
    const spans = []; let from = 0;
    doorsX.forEach((x) => { spans.push([from, x - hw]); from = x + hw; }); spans.push([from, LEN]);
    spans.forEach(([a, b]) => {
      const len = b - a, zc = Z0 - (a + b) / 2;
      const dado = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.4), dadoMat); dado.rotation.y = Math.PI / 2; dado.position.set(-W + 0.02, 0.7, zc); g.add(dado);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, len), gold); rail.position.set(-W + 0.06, 1.45, zc); g.add(rail);
    });
    // door frames (inside and outside): gold arch + jambs
    [EXIT_Z, ENTER_Z].forEach((z) => {
      for (const xx of [-W + 0.05, -W - 0.88]) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(hw + 0.08, 0.1, 6, 18, Math.PI), gold); arch.rotation.y = Math.PI / 2; arch.position.set(xx, DOOR_SPRING, z); g.add(arch);
        for (const sz of [-1, 1]) { const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, DOOR_SPRING, 0.14), gold); jamb.position.set(xx, DOOR_SPRING / 2, z + sz * (hw + 0.08)); g.add(jamb); }
      }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, DOOR_W + 0.3), mat(P.stoneD)); sill.position.set(-W - 0.4, 0.03, z); g.add(sill);
    });
  }

  // outer shell (seen from the garden): stone walls, back wall, barrel roof. Kept in its own group: the interior is hidden
  // while the camera is nowhere near it (see `interior` below), the shell is always drawn.
  const shell = new THREE.Group();
  {
    const outer = new THREE.Mesh(new THREE.ExtrudeGeometry(wallShape(LEN, WALL_H, doorsX), { depth: 0.8, bevelEnabled: false }), stoneMat(0.25, 0.25));
    outer.rotation.y = Math.PI / 2; outer.position.set(-W - 0.85, 0, Z0); shell.add(outer);
    const right = new THREE.Mesh(slab(LEN, WALL_H, 0.8), stoneMat(0.25, 0.25)); right.rotation.y = Math.PI / 2; right.position.set(W + 0.45, 0, ZC); shell.add(right);
    const back = new THREE.Mesh(slab(W * 2 + 1.7, WALL_H + W * VAULT, 0.8), stoneMat(0.25, 0.25)); back.position.set(0, 0, Z1 - 0.45); shell.add(back);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(W + 0.95, W + 0.95, LEN + 0.2, 28, 1, true, Math.PI / 2, Math.PI), mat(0x8bb0b8));
    roof.scale.z = VAULT; roof.rotation.x = Math.PI / 2; roof.position.set(0, WALL_H, ZC); shell.add(roof);
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, LEN + 0.6, 8), gold); ridge.rotation.x = Math.PI / 2; ridge.position.set(0, WALL_H + (W + 0.95) * VAULT, ZC); shell.add(ridge);
  }
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(W, W, LEN, 24, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ color: 0xf5ecd9, side: THREE.BackSide }));
  vault.scale.z = VAULT; vault.rotation.x = Math.PI / 2; vault.position.set(0, WALL_H, ZC); g.add(vault);
  const endWall = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, WALL_H + W * VAULT + 0.2), wallMat); endWall.position.set(0, (WALL_H + W * VAULT) / 2, Z1); g.add(endWall);

  /* ---- ribs, pillars, curtains ---- */
  const ribZ = []; for (let z = -36; z >= Z1 + 4; z -= 6) ribZ.push(z);
  const ribGeo = new THREE.TorusGeometry(W - 0.15, 0.2, 5, 22, Math.PI);
  const pillarGeo = new THREE.CylinderGeometry(0.42, 0.5, WALL_H, 10);
  const capGeo = new THREE.BoxGeometry(1.2, 0.35, 1.2), baseGeo = new THREE.BoxGeometry(1.15, 0.45, 1.15);
  ribZ.forEach((z) => {
    const rib = new THREE.Mesh(ribGeo, gold); rib.scale.y = VAULT; rib.position.set(0, WALL_H, z); g.add(rib);
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(pillarGeo, stone); p.position.set(sx * (W - 0.5), WALL_H / 2, z);
      const cap = new THREE.Mesh(capGeo, gold); cap.position.set(sx * (W - 0.5), WALL_H - 0.1, z);
      const base = new THREE.Mesh(baseGeo, stone); base.position.set(sx * (W - 0.5), 0.22, z);
      g.add(p, cap, base);
    }
  });
  const curtainCols = [P.blush, P.cream];
  for (let i = 0; i < ribZ.length - 1; i++) {
    const zc = (ribZ[i] + ribZ[i + 1]) / 2;
    for (const sx of [-1, 1]) {
      if (sx < 0 && (Math.abs(zc - EXIT_Z) < 0.5 || Math.abs(zc - ENTER_Z) < 0.5)) continue;   // door bays
      const c = curtain(4.9, 8.4, curtainCols[(i + (sx > 0 ? 1 : 0)) % 2], i);
      c.rotation.y = -sx * Math.PI / 2; c.position.set(sx * (W - 0.18), 5.6, zc); g.add(c);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 5, 12), gold); tie.position.set(sx * (W - 0.3), 3.2, ribZ[i] - 0.5); tie.rotation.y = Math.PI / 2; // decorative tiebacks near pillars
      g.add(tie);
    }
  }

  /* ---- story frames (left wall) + gallery frames (right wall) ---- */
  // Frames sit on a grid (columns = the wall bays between pillars, two rows). Tapping a frame opens the story / photo sheet.
  const bays = ribZ.slice(0, -1).map((z, i) => (z + ribZ[i + 1]) / 2);       // -39, -45, ... -99
  const hotspots = [];
  const ROW_Y = [5.7, 2.75];
  const hang = (item, kind, i, w, h, x, y, z, rotY) => {
    const f = framedPhoto(item, w, h); f.position.set(x, y, z); f.rotation.y = rotY; g.add(f);
    const hit = f.children[0]; hit.userData = { kind, i }; hotspots.push(hit);
    const plate = caption(item.cap, w, 0.5); plate.position.set(x, y - h / 2 - 0.42, z); plate.rotation.y = rotY; g.add(plate);
  };
  const gal = CONFIG.gallery.slice(0, 8);
  // two columns x two rows in each of two bays on the RIGHT wall
  gal.forEach((s, i) => {
    const bayZ = [-93, -99][Math.floor(i / 4)], off = (i % 4) < 2 ? -1.2 : 1.2;
    hang(s, 'photo', i, 1.9, 2.4, W - 0.42, ROW_Y[i % 2], bayZ + off, -Math.PI / 2);
  });
  const title = (text, z, side) => {
    const t = titlePlate(text, 4.2, 1.2);
    t.position.set(side * (W - 0.4), 8.5, z); t.rotation.y = -side * Math.PI / 2; g.add(t);
  };
  title('True sight', -93, 1);

  /* ---- aisle carpet + petals ---- */
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, LEN - 1), new THREE.MeshLambertMaterial({ color: 0xe9b3bc }));
  carpet.rotation.x = -Math.PI / 2; carpet.position.set(0, 0.04, ZC); g.add(carpet);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.16, LEN - 1), new THREE.MeshBasicMaterial({ color: P.gold })); b.rotation.x = -Math.PI / 2; b.position.set(sx * 1.55, 0.05, ZC); g.add(b); }
  const petals = [];
  for (let i = 0; i < (q.low ? 140 : 260); i++) petals.push({ p: [(r() - 0.5) * 5.4, 0.06, Z0 - 2 - r() * (LEN - 8)], s: [0.1 + r() * 0.06, 1, 0.07 + r() * 0.05], r: [-Math.PI / 2, 0, r() * 6.3], c: [P.blush, P.rose, P.cream, P.peach][Math.floor(r() * 4)] });
  g.add(instanced(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), petals));

  /* ---- floral arches over the aisle ---- */
  for (const z of [-42, -54, -66, -78, -90, -102, -114]) { const a = flowerArch(3.1, 3.7, { count: q.low ? 30 : 44, seed: 70 + z }); a.position.set(0, 0, z); g.add(a); }

  /* ---- guest chairs (instanced) + aisle posies ---- */
  const seats = [], backs = [], posies = [];
  for (let row = 0; row < 7; row++) for (const sx of [-1, 1]) for (let c = 0; c < 4; c++) {
    const x = sx * (2.7 + c * 0.78), z = -37.5 - row * 1.6;
    seats.push({ p: [x, 0.5, z], s: [0.52, 0.07, 0.5], c: 0xfdf8ec });
    backs.push({ p: [x, 0.95, z - 0.23], s: [0.52, 0.8, 0.05], c: 0xfdf8ec });
    if (c === 0) posies.push([sx * 2.35, 0.95, z - 0.25]);
  }
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), seats));
  g.add(instanced(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), backs));
  g.add(flowerCluster(posies, { seed: 4, size: 0.2, leafSize: 0.4 }));

  /* ---- chandeliers + fairy lights ---- */
  const flame = new THREE.MeshBasicMaterial({ color: 0xffe3a0 }), candle = mat(P.cream);
  const chand = (z) => {
    const c = new THREE.Group(); c.position.set(0, 11.4, z);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4), gold); chain.position.y = 2.3; c.add(chain);
    for (const [rad, h] of [[1.7, 0], [0.95, 0.5]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.07, 6, 24), gold); ring.rotation.x = Math.PI / 2; ring.position.y = h; c.add(ring); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 6), candle); cd.position.set(Math.cos(a) * 1.7, 0.2, Math.sin(a) * 1.7); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), flame); fl.position.set(cd.position.x, 0.46, cd.position.z); c.add(cd, fl); }
    const ring = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ring.push([Math.cos(a) * 1.7, 0.02, Math.sin(a) * 1.7]); }
    c.add(flowerCluster(ring, { seed: Math.abs(z), size: 0.16, leafSize: 0.35 }));
    // real point lights make EVERY lit surface of the whole scene pay per light (a lot on phones): desktop only
    if (!q.mobile) { const pl = new THREE.PointLight(0xffd9a0, 0, 30, 1.6); pl.position.y = -0.5; c.add(pl); lights.push(pl); }
    return c;
  };
  [-48, -70, -92, -112].forEach((z) => g.add(chand(z)));

  const bulbs = [];
  const strand = (a, b, n, sag) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); bulbs.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t], s: 1 }); } };
  ribZ.forEach((z, i) => { if (!q.low || i % 2 === 0) strand([-W + 0.7, 9.4, z - 0.3], [W - 0.7, 9.4, z - 0.3], q.low ? 14 : 22, 1.6); });
  for (const sx of [-1, 1]) for (let i = 0; i < ribZ.length - 1; i++) strand([sx * (W - 0.7), 9.6, ribZ[i] - 0.4], [sx * (W - 0.7), 9.6, ribZ[i + 1] - 0.4], 9, 0.9);
  g.add(instanced(new THREE.SphereGeometry(0.075, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe3a0 }), bulbs));

  /* ---- gift table ---- */
  const table = new THREE.Group(); table.position.set(-4.4, 0, -51);
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.65, 0.95, 16), mat(P.cream)); cloth.position.y = 0.48;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 16), mat(P.cream)); top.position.y = 0.97;
  const runner = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.02, 16), mat(P.blush)); runner.position.y = 1.01;
  table.add(cloth, top, runner);
  const tp = []; for (let i = 0; i < 40; i++) { const a = r() * 6.28, rr = r() * 0.55, hh = 1.2 + r() * 0.6; tp.push([Math.cos(a) * rr, hh, Math.sin(a) * rr]); }
  table.add(flowerCluster(tp, { seed: 14, size: 0.2, leafSize: 0.4 }));
  for (const [x, z, col] of [[0.95, 0.2, P.cream], [-0.9, 0.5, P.blush], [0.5, -0.9, P.gold]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.24), mat(col)); b.position.set(x, 1.07, z); b.rotation.y = x; table.add(b); }
  const gb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.4), mat(P.rose)); gb.position.set(-0.4, 1.2, -0.85);
  const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.07), gold); rib1.position.copy(gb.position);
  const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 0.42), gold); rib2.position.copy(gb.position);
  table.add(gb, rib1, rib2);
  g.add(table);
  table.traverse((o) => { o.userData.allow = true; });   // the table stands in front of the gift board on purpose

  /* ---- pelaminan (stage) ---- */
  const stage = new THREE.Group(); stage.position.z = Z1;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(15, 0.6, 7), mat(P.cream)); plat.position.set(0, 0.3, 3.5);
  const step = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 1.2), mat(P.stoneD)); step.position.set(0, 0.15, 7.4);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.6), new THREE.MeshLambertMaterial({ color: 0xe9b3bc })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.61, 3.4);
  stage.add(plat, step, rug);
  const panelTex = canvasTexture(256, 256, (c, w, h) => { c.fillStyle = '#c9d4b8'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(111,127,98,.35)'; c.lineWidth = 3; c.strokeRect(14, 14, w - 28, h - 28); });
  const back = new THREE.Mesh(archWall(13, 10.6, 7.2, 3.8, 0.4), new THREE.MeshLambertMaterial({ color: 0xcfdac0, side: THREE.DoubleSide })); back.position.set(0, 0.6, 0.6);
  stage.add(back);
  const couple = cutoutPlane('/asset/new/cutout/couple_arch.webp', 3.9, 5.8, { y: 0.9 }); couple.position.set(0, 0.6, 0.25); stage.add(couple);
  const drape = curtain(7, 9, 0xfbf3e2, 2); drape.position.set(0, 5.1, 0.12); stage.add(drape);
  const arch = flowerArch(3.9, 3.7, { count: q.low ? 60 : 110, seed: 91, thick: 0.5 }); arch.position.set(0, 0.6, 0.9); stage.add(arch);
  const wallFlowers = [];
  for (const sx of [-1, 1]) for (let i = 0; i < (q.low ? 90 : 170); i++) wallFlowers.push([sx * (4.9 + r() * 2.3), 0.9 + r() * 7.4, 0.8 + r() * 0.5]);
  stage.add(flowerCluster(wallFlowers, { seed: 93, size: 0.3, leafSize: 0.7 }));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.3), new THREE.MeshBasicMaterial({ transparent: true, map: canvasTexture(1024, 222, (c, w, h) => {
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e2b04a'; c.shadowColor = 'rgba(255,214,120,.9)'; c.shadowBlur = 24;
    c.font = `${h * 0.72}px Marelle, 'Segoe Script', cursive`; c.fillText(`${CONFIG.bride} & ${CONFIG.groom}`, w / 2, h / 2 + 8);
  }) }));
  sign.position.set(0, 9.6, 0.7); stage.add(sign);
  for (const sx of [-1, 1]) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.1, 10), mat(P.cream)); ped.position.set(sx * 5.2, 1.15, 5.6); stage.add(ped);
    const pf = []; for (let i = 0; i < 60; i++) { const u = r() * 6.28, v = Math.acos(r() * 2 - 1), rr = 0.5 + r() * 0.35; pf.push([sx * 5.2 + Math.sin(v) * Math.cos(u) * rr, 2.1 + Math.cos(v) * rr * 0.9, 5.6 + Math.sin(v) * Math.sin(u) * rr]); }
    stage.add(flowerCluster(pf, { seed: 110 + sx, size: 0.24, leafSize: 0.5 }));
  }
  const sofa = (x) => {
    const s = new THREE.Group(); s.position.set(x, 0.6, 2.2);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.1), mat(P.blush)); seat.position.y = 0.3;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.25), mat(P.rose)); bk.position.set(0, 0.95, -0.45);
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 1.1), mat(P.rose)); arm1.position.set(-0.64, 0.7, 0);
    const arm2 = arm1.clone(); arm2.position.x = 0.64;
    s.add(seat, bk, arm1, arm2); return s;
  };
  stage.add(sofa(-1.0), sofa(1.0));
  g.add(stage);

  // everything except the outer shell is "interior": index.js hides it until the camera gets near the hall
  const interior = new THREE.Group();
  [...g.children].forEach((ch) => interior.add(ch));
  g.add(shell, interior);

  return {
    group: g,
    interior,
    hotspots,
    lights,
    update(t, inside) { lights.forEach((l, i) => { l.intensity = inside * (11 + Math.sin(t * 2.3 + i * 2) * 0.8); }); },
  };
}
