import * as THREE from 'three';
import { P, mat, plankTexture, marbleTexture } from './materials.js';
import { canvasTexture, rng, cutoutPlane } from './util.js';
import { instanced, flowerCluster, flowerArch, trees } from './flora.js';
import { CONFIG } from '../config.js';

/* ---------- small geometry helpers ---------- */
function stoneTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#f1e7d2'; g.fillRect(0, 0, w, h);
    const r = rng(3), rows = 6, rh = h / rows;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * (w / 8);
      for (let x = -1; x < 5; x++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,250,235' : '205,185,150'},${0.1 + r() * 0.14})`;
        g.fillRect(off + x * (w / 4) + 2, y * rh + 2, w / 4 - 3, rh - 3);
      }
    }
    g.strokeStyle = 'rgba(160,138,104,.38)'; g.lineWidth = 2;
    for (let y = 0; y <= rows; y++) { g.beginPath(); g.moveTo(0, y * rh); g.lineTo(w, y * rh); g.stroke(); }
    for (let y = 0; y < rows; y++) { const off = (y % 2) * (w / 8); for (let x = 0; x < 5; x++) { g.beginPath(); g.moveTo(off + x * (w / 4), y * rh); g.lineTo(off + x * (w / 4), (y + 1) * rh); g.stroke(); } }
  });
}
const STONE = stoneTexture();
export function stoneMat(rx, ry, tint = 0xffffff) {
  const t = STONE.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true;
  return new THREE.MeshLambertMaterial({ map: t, color: tint });
}
const METRIC = stoneMat(0.25, 0.25);

function rectShape(w, h) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0); return s; }
function extrude(shape, depth) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g; }
export const slab = (w, h, d) => extrude(rectShape(w, h), d);

/** Wall with an arched opening (rounded top). */
export function archWall(w, h, holeW, spring, depth) {
  const sh = rectShape(w, h), hw = holeW / 2, hole = new THREE.Path();
  hole.moveTo(-hw, 0); hole.lineTo(-hw, spring); hole.absarc(0, spring, hw, Math.PI, 0, true); hole.lineTo(hw, 0); hole.lineTo(-hw, 0);
  sh.holes.push(hole);
  return extrude(sh, depth);
}
/** One door leaf covering the right half of an arched opening, hinge at its outer edge (x=0 after translate). */
function leafGeometry(hw, spring, depth) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(hw, 0); s.lineTo(hw, spring); s.absarc(0, spring, hw, 0, Math.PI / 2, false); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(-hw, 0, -depth / 2);
  return g;
}
function pennant(color) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.7, 0.32); s.lineTo(0, 0.64); s.lineTo(0, 0);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  m.position.set(0.04, 0.5, 0);
  const grp = new THREE.Group(); grp.add(m); return grp;
}
function archWindow(w, h, y, x, z, face = 1) {
  const s = new THREE.Shape(); const hw = w / 2, sp = h - hw;
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, sp); s.absarc(0, sp, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: P.gold }));
  frame.scale.set(1.16, 1.07, 1);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: 0xffe6b0 }));
  glass.position.z = 0.02;
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.07, h * 0.95), new THREE.MeshBasicMaterial({ color: P.gold }));
  bar.position.set(0, h * 0.48, 0.04);
  const bar2 = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.07), new THREE.MeshBasicMaterial({ color: P.gold }));
  bar2.position.set(0, h * 0.45, 0.04);
  frame.position.set(0, -0.05 * h * 0, -0.01);
  grp.add(frame, glass, bar, bar2);
  grp.position.set(x, y, z); if (face < 0) grp.rotation.y = Math.PI;
  return grp;
}

function plaque(w, h, draw) {
  const t = canvasTexture(1024, Math.round(1024 * h / w), draw);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

/* ---------- castle ---------- */
export function buildCastle(q) {
  const g = new THREE.Group();
  const r = rng(12);
  const roof = mat(P.teal), roofD = mat(0x7aa0aa), gold = mat(P.gold), stoneD = mat(P.stoneD);
  const woodTex = plankTexture('#c2a37c'); woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(0.5, 0.3);
  const woodMat = new THREE.MeshLambertMaterial({ map: woodTex, side: THREE.DoubleSide });
  const woodTex2 = plankTexture('#dcc7a0'); woodTex2.wrapS = woodTex2.wrapT = THREE.RepeatWrapping; woodTex2.repeat.set(0.4, 0.2);
  const woodMat2 = new THREE.MeshLambertMaterial({ map: woodTex2, side: THREE.DoubleSide });

  const flags = [];
  const crenels = (x0, x1, y, z, axis = 'x', d = 2.6) => {
    const items = [], n = Math.floor(Math.abs(x1 - x0) / 1.6);
    for (let i = 0; i <= n; i++) { const t = x0 + (x1 - x0) * (i / n); items.push({ p: axis === 'x' ? [t, y + 0.35, z] : [z, y + 0.35, t], s: [axis === 'x' ? 0.55 : d / 2, 0.35, axis === 'x' ? d / 2 : 0.55] }); }
    return instanced(new THREE.BoxGeometry(1, 1, 1), mat(P.stone), items);
  };
  const tower = (x, z, rad, h, roofH, withFlag = true) => {
    const t = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.94, rad, h, 10), stoneMat(Math.round(rad * 2.2), Math.round(h / 4)));
    body.position.y = h / 2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.12, rad * 1.12, 0.6, 10), stoneD); band.position.y = h - 0.3;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.3, roofH, 10), roof); cone.position.y = h + roofH / 2;
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), gold); fin.position.y = h + roofH + 0.1;
    t.add(body, band, cone, fin);
    // slit windows
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + (k - 1) * 0.7; // faces +z mostly
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.5), new THREE.MeshBasicMaterial({ color: 0xffdf9e }));
      w.position.set(Math.cos(a) * (rad * 0.97), h * (0.45 + (k % 2) * 0.18), Math.sin(a) * (rad * 0.97)); w.lookAt(w.position.x * 2, w.position.y, w.position.z * 2);
      t.add(w);
    }
    if (withFlag) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5), gold); pole.position.y = h + roofH + 1;
      const f = pennant(r() < 0.5 ? P.blush : P.cream); f.position.y = h + roofH + 1.2;
      t.add(pole, f); flags.push(f);
    }
    t.position.set(x, 0, z);
    return t;
  };

  /* ===== front curtain wall + gatehouse (z = 0) ===== */
  const gatehouse = new THREE.Mesh(archWall(14, 13, 8, 4, 3), METRIC); g.add(gatehouse);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(slab(21, 8, 2.4), METRIC); wing.position.set(sx * 17.5, 0, 0); g.add(wing);
    g.add(crenels(sx * 7.5, sx * 27.5, 8, 0));
    g.add(tower(sx * 7.6, 0, 3.4, 16, 5.5));
    g.add(tower(sx * 28, 0, 3.0, 12, 4.6));
  }
  g.add(crenels(-4.3, 4.3, 13, 0));
  // gold trim on the arch
  const trim = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.16, 6, 20, Math.PI), gold); trim.position.set(0, 4, 1.55); g.add(trim);

  // gate leaves (hinged at the outer edge, swing inward)
  const leaf = leafGeometry(4, 4, 0.35);
  const gateR = new THREE.Group(), gateL = new THREE.Group();
  const lr = new THREE.Mesh(leaf, woodMat); gateR.add(lr); gateR.position.set(4, 0, -0.2);
  const ll = new THREE.Mesh(leaf, woodMat); ll.scale.x = -1; gateL.add(ll); gateL.position.set(-4, 0, -0.2);
  g.add(gateR, gateL);

  // name plaque above the gate
  const nm = plaque(8, 2, (c, w, h) => {
    c.fillStyle = 'rgba(251,247,234,.96)'; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 40); c.fill();
    c.strokeStyle = '#e2b04a'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#2f6178'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${Math.round(h * 0.4)}px Marelle, 'Segoe Script', cursive`;
    c.fillText(`${CONFIG.bride} & ${CONFIG.groom}`, w / 2, h / 2 + 6);
  });
  nm.position.set(0, 10.4, 1.56); g.add(nm);

  // floral dressing of the gate: arch, columns, plus watercolor garlands and flowers
  const ga = flowerArch(4.45, 4, { count: q.low ? 34 : 54, seed: 21 }); ga.position.set(0, 0, 1.7); g.add(ga);
  for (const sx of [-1, 1]) {
    const gar = cutoutPlane('/asset/new/cutout/garland.webp', 4.6, 4.6);
    gar.position.set(sx * 5.2, 8.1, 1.58); gar.scale.x = sx; g.add(gar);
    for (const [f, w, h, x, z] of [['WA0006', 2.8, 2.8, 6.2, 3.2], ['WA0005', 1.6, 3.3, 8.6, 3.4], ['WA0002', 1.4, 2.6, 5.4, 2.8], ['WA0007', 2, 2.8, 10.4, 3.0]]) {
      for (const ry of [0, Math.PI / 2.2]) { const m = cutoutPlane(`/asset/cutout/${f}.webp`, w, h); m.position.set(sx * x, 0, z); m.rotation.y = ry * sx; g.add(m); }
    }
  }

  /* ===== courtyard (z 0 .. -32) ===== */
  const cyFloorTex = marbleTexture(); cyFloorTex.wrapS = cyFloorTex.wrapT = THREE.RepeatWrapping; cyFloorTex.repeat.set(11, 8);
  const cyFloor = new THREE.Mesh(new THREE.PlaneGeometry(44, 32), new THREE.MeshLambertMaterial({ map: cyFloorTex, color: 0xf3e6d0 }));
  cyFloor.rotation.x = -Math.PI / 2; cyFloor.position.set(0, 0.015, -16); g.add(cyFloor);
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 32), new THREE.MeshLambertMaterial({ color: 0xeab8c0 }));
  aisle.rotation.x = -Math.PI / 2; aisle.position.set(0, 0.03, -16); g.add(aisle);
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(slab(32, 8, 2.4), METRIC); wall.rotation.y = Math.PI / 2; wall.position.set(sx * 22, 0, -16); g.add(wall);
    g.add(crenels(-1, -31, 8, sx * 22, 'z'));
  }

  /* ===== hall facade (z = -32) ===== */
  const facade = new THREE.Mesh(archWall(44, 19, 7, 5, 2.4), METRIC); facade.position.z = -32; g.add(facade);
  for (const sx of [-1, 1]) { g.add(tower(sx * 22, -32, 3.6, 21, 6.5)); g.add(tower(sx * 22, 0.0, 3.0, 12, 4.6, false)); }
  g.add(crenels(-19, 19, 19, -32));
  for (const sx of [-1, 1]) for (const wx of [8.4, 15]) g.add(archWindow(2.0, 5.2, 4.2, sx * wx, -30.78));
  const trim2 = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.15, 6, 20, Math.PI), gold); trim2.position.set(0, 5, -30.75); g.add(trim2);
  // medallion with the date above the hall door
  const med = new THREE.Mesh(new THREE.CircleGeometry(2, 28), new THREE.MeshBasicMaterial({ map: canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#fbf7ea'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, 7); c.fill();
    c.strokeStyle = '#e2b04a'; c.lineWidth = 14; c.stroke();
    c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 34, 0, 7); c.stroke();
    c.fillStyle = '#c9707f'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${h * 0.3}px Marelle, 'Segoe Script', cursive`; c.fillText(`${CONFIG.bride[0]} & ${CONFIG.groom[0]}`, w / 2, h * 0.42);
    c.fillStyle = '#6f7f62'; c.font = `500 ${h * 0.075}px Roboto, sans-serif`; c.fillText('29 . 05 . 2027', w / 2, h * 0.66);
  }) }));
  med.position.set(0, 13.2, -30.76); g.add(med);

  // hall door leaves
  const dleaf = leafGeometry(3.5, 5, 0.35);
  const doorR = new THREE.Group(), doorL = new THREE.Group();
  doorR.add(new THREE.Mesh(dleaf, woodMat2)); doorR.position.set(3.5, 0, -31.9);
  const dl = new THREE.Mesh(dleaf, woodMat2); dl.scale.x = -1; doorL.add(dl); doorL.position.set(-3.5, 0, -31.9);
  g.add(doorR, doorL);
  const da = flowerArch(3.95, 5, { count: q.low ? 30 : 48, seed: 61 }); da.position.set(0, 0, -30.6); g.add(da);

  /* courtyard decor: lantern posts, bunting, blossom trees, flower beds, two floral arches.
     The left side between z = -8 and z = -24 is kept clear: that is where the Assalamualaikum board stands. */
  const buntingFlags = [];
  const cols = [P.blush, P.cream, P.teal, P.gold, P.rose];
  const glowM = new THREE.MeshBasicMaterial({ color: 0xffe3a0 });
  const postAt = (x, z) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.2, 6), mat(P.woodD)); post.position.set(x, 2.1, z); g.add(post);
    const lan = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), glowM); lan.position.set(x, 4.35, z); g.add(lan);
  };
  for (const z of [-5, -30]) {
    postAt(-3.4, z); postAt(3.4, z);
    for (let i = 1; i < 12; i++) { const t = i / 12, x = -3.4 + 6.8 * t; buntingFlags.push({ p: [x, 4.05 - Math.sin(t * Math.PI) * 0.5, z], s: [1, 1, 1], r: [Math.PI, 0, 0], c: cols[(i + Math.abs(z)) % cols.length] }); }
  }
  for (const z of [-11, -17, -23]) postAt(3.4, z);          // right side only
  g.add(instanced(new THREE.ConeGeometry(0.13, 0.34, 3), mat(0xffffff, { side: THREE.DoubleSide }), buntingFlags));
  for (const z of [-8, -27]) { const a = flowerArch(3.5, 3.6, { count: q.low ? 28 : 42, seed: 40 + z }); a.position.set(0, 0, z); g.add(a); }
  const spots = [];
  for (const sx of [-1, 1]) for (const z of [-6, -12, -18, -24, -29]) spots.push([sx * (11 + r() * 5), z, 0.9 + r() * 0.25]);
  g.add(trees(spots, { seed: 52 }));
  const beds = [];
  for (const sx of [-1, 1]) for (let z = -3; z > -30; z -= 1.1) {
    if (sx < 0 && z < -8 && z > -24) continue;
    beds.push([sx * (6 + r() * 0.5), 0.32, z + r() * 0.4], [sx * (7 + r() * 0.5), 0.3, z + r() * 0.4]);
  }
  g.add(flowerCluster(beds, { seed: 17, size: 0.26, leafSize: 0.55 }));

  return {
    group: g,
    update(t, gateOpen, doorOpen) {
      gateR.rotation.y = -gateOpen * 1.75; gateL.rotation.y = gateOpen * 1.75;
      doorR.rotation.y = -doorOpen * 1.75; doorL.rotation.y = doorOpen * 1.75;
      flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 1.6 + i) * 0.35; f.children[0].rotation.z = Math.sin(t * 2.2 + i) * 0.08; });
    },
  };
}
