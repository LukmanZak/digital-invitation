import * as THREE from 'three';
import { P, mat } from './materials.js';
import { canvasTexture, rng } from './util.js';
import { instanced, flowerCluster, flowerArch, trees } from './flora.js';
import { HALL, gardenCurve, journeyLayout } from './layout.js';
import { CONFIG } from '../config.js';

const TITLE = "Marelle, 'Segoe Script', cursive";
const BODY = "Roboto, system-ui, sans-serif";
const SW = 1024, SH = 1450;                  // sign canvas

function wrap(c, text, maxW) {
  const words = text.split(' '), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws an image into a rounded box like CSS object-fit (cover | contain) with object-position. */
function drawFit(c, img, x, y, w, h, fit, pos) {
  const [px, py] = (pos || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
  const ia = img.width / img.height, ba = w / h;
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, 30); c.clip();
  c.fillStyle = '#f3ead6'; c.fillRect(x, y, w, h);
  if (fit === 'contain') {
    let dw, dh; if (ia > ba) { dw = w * 0.9; dh = dw / ia; } else { dh = h * 0.9; dw = dh * ia; }
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    let sw, sh, sx, sy;
    if (ia > ba) { sh = img.height; sw = sh * ba; sx = (img.width - sw) * px; sy = 0; } else { sw = img.width; sh = sw / ba; sx = 0; sy = (img.height - sh) * py; }
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  c.restore();
}

function drawSign(c, item, i, img) {
  c.clearRect(0, 0, SW, SH);
  c.fillStyle = '#fdf8ec'; c.beginPath(); c.roundRect(6, 6, SW - 12, SH - 12, 54); c.fill();
  c.strokeStyle = '#e2b04a'; c.lineWidth = 10; c.stroke();
  c.strokeStyle = 'rgba(226,176,74,.45)'; c.lineWidth = 3; c.beginPath(); c.roundRect(26, 26, SW - 52, SH - 52, 40); c.stroke();
  // the picture box is tall (close to the portrait illustrations) so little of the art is cropped
  if (img) drawFit(c, img, 56, 56, SW - 112, 900, item.fit || 'cover', item.pos);
  else { c.fillStyle = '#f3ead6'; c.beginPath(); c.roundRect(56, 56, SW - 112, 900, 30); c.fill(); }
  // number badge
  c.fillStyle = '#c9707f'; c.beginPath(); c.arc(130, 130, 52, 0, 7); c.fill();
  c.fillStyle = '#fdf8ec'; c.font = `500 58px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), 130, 133);
  // caption + text
  c.fillStyle = '#2f6178'; let ts = 100; c.font = `${ts}px ${TITLE}`;
  while (c.measureText(item.cap).width > SW - 230 && ts > 50) { ts -= 4; c.font = `${ts}px ${TITLE}`; }   // keeps a clear margin to the frame
  c.fillText(item.cap, SW / 2, 1045);
  c.fillStyle = '#e2b04a'; c.fillRect(SW / 2 - 90, 1112, 180, 5);
  c.fillStyle = '#4d5646'; c.font = `48px ${BODY}`;
  const lines = wrap(c, item.text || '', SW - 220);
  lines.slice(0, 4).forEach((ln, k) => c.fillText(ln, SW / 2, 1185 + k * 66));
}

function signMesh(item, i) {
  const tex = canvasTexture(SW, SH, (c) => drawSign(c, item, i, null));
  const img = new Image();
  img.onload = () => { drawSign(tex.image.getContext('2d'), item, i, img); tex.needsUpdate = true; };
  img.src = item.img.replace(/\.webp$/, '.s.webp');
  const w = 3.4, h = w * SH / SW;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.05 }));
}

function titleBanner(text, sub, w, h) {
  const t = canvasTexture(1024, Math.round(1024 * h / w), (c, cw, ch) => {
    c.fillStyle = '#fdf8ec'; c.beginPath(); c.roundRect(6, 6, cw - 12, ch - 12, 40); c.fill();
    c.strokeStyle = '#e2b04a'; c.lineWidth = 8; c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2f6178';
    c.font = `${ch * 0.5}px ${TITLE}`; c.fillText(text, cw / 2, ch * 0.42);
    c.fillStyle = '#c9707f'; c.font = `500 ${ch * 0.11}px ${BODY}`; c.fillText(sub.toUpperCase(), cw / 2, ch * 0.8);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
}

export function buildGarden(q) {
  const g = new THREE.Group();
  const r = rng(123);
  const curve = gardenCurve();
  const L = curve.getLength();
  const J = journeyLayout();
  const wood = mat(P.woodD), gold = mat(P.gold);

  /* ---- the path: a cream ribbon following the curve ---- */
  const N = 140, halfW = 1.5, pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const lx = -t.z, lz = t.x;
    pos.push(p.x + lx * halfW, 0.03, p.z + lz * halfW, p.x - lx * halfW, 0.03, p.z - lz * halfW);
    uv.push(0, u * L / 2, 1, u * L / 2);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  pg.setIndex(idx); pg.computeVertexNormals();
  const pathTex = canvasTexture(128, 256, (c, w, h) => {
    c.fillStyle = '#eadcc0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,248,230' : '190,165,125'},${0.12 + r() * 0.16})`; c.beginPath(); c.ellipse(r() * w, r() * h, 6 + r() * 12, 4 + r() * 8, r() * 3, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(160,130,90,.35)'; c.fillRect(0, 0, 5, h); c.fillRect(w - 5, 0, 5, h);
  });
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
  const ribbon = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ map: pathTex }));
  ribbon.renderOrder = 0; g.add(ribbon);

  /* ---- stepping stones that turn pink as the camera walks past ---- */
  const markers = [];
  for (let d = 2.4; d < L - 2.2; d += 1.7) markers.push({ u: d / L, on: false });
  const disc = new THREE.InstancedMesh(new THREE.CircleGeometry(0.3, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }), markers.length);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), col = new THREE.Color();
  markers.forEach((m, i) => {
    const p = curve.getPointAt(m.u);
    m4.compose(new THREE.Vector3(p.x, 0.06, p.z), q4, new THREE.Vector3(1, 1, 1)); disc.setMatrixAt(i, m4);
    disc.setColorAt(i, col.set(0xd9d6c9));
  });
  disc.instanceMatrix.needsUpdate = true; disc.instanceColor.needsUpdate = true; disc.frustumCulled = false;
  g.add(disc);
  const OFF = new THREE.Color(0xd9d6c9), ON = new THREE.Color(0xe39aa9);
  function setProgress(f) {
    let changed = false;
    markers.forEach((m, i) => {
      const on = m.u <= f;
      if (on !== m.on) { m.on = on; disc.setColorAt(i, on ? ON : OFF); changed = true; }
    });
    if (changed) disc.instanceColor.needsUpdate = true;
  }

  /* ---- the five story signs (photo + caption + sentence), in the order of CONFIG.story ---- */
  const hotspots = [];
  CONFIG.story.slice(0, 5).forEach((item, i) => {
    const sp = J[i];
    const grp = new THREE.Group(); grp.position.set(sp.sign[0], 0, sp.sign[2]); grp.rotation.y = sp.signRotY;
    const sign = signMesh(item, i);
    const h = 3.4 * SH / SW;
    sign.position.set(0, 0.9 + h / 2, 0);
    sign.userData = { kind: 'story', i };
    hotspots.push(sign);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9 + h + 0.35, 8), wood); post.position.set(sx * 1.45, (0.9 + h + 0.35) / 2, -0.08);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), gold); cap.position.set(sx * 1.45, 0.9 + h + 0.38, -0.08);
      grp.add(post, cap);
    }
    // flowers at the foot of the posts
    const foot = []; for (let k = 0; k < 26; k++) foot.push([(r() - 0.5) * 3.8, 0.25 + r() * 0.5, 0.2 + r() * 0.7]);
    grp.add(sign, flowerCluster(foot, { seed: 30 + i, size: 0.2, leafSize: 0.45 }));
    g.add(grp);
  });

  /* ---- path edges: flowers, lanterns (between signs), trees behind the signs ---- */
  const edge = [];
  for (let d = 1.5; d < L - 1.5; d += 0.85) {
    const u = d / L, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    for (const s of [-1, 1]) { const o = 1.95 + r() * 0.55; edge.push([p.x - t.z * o * s, 0.28, p.z + t.x * o * s]); }
  }
  g.add(flowerCluster(edge, { seed: 71, size: 0.22, leafSize: 0.5 }));

  const glow = new THREE.MeshBasicMaterial({ color: 0xffe3a0 });
  for (const u of [0.08, 0.25, 0.415, 0.585, 0.75, 0.92]) {
    const p = curve.getPointAt(u), n = p.clone().sub(new THREE.Vector3(-19, 0, -66)).setY(0).normalize();
    const lp = p.clone().addScaledVector(n, 2.5);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.9, 6), wood); post.position.set(lp.x, 1.45, lp.z);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), glow); lamp.position.set(lp.x, 3.05, lp.z);
    g.add(post, lamp);
  }

  const spots = [];
  for (let u = 0.12; u < 0.92; u += 0.1) {
    const p = curve.getPointAt(u), n = p.clone().sub(new THREE.Vector3(-19, 0, -66)).setY(0).normalize();
    for (const dist of [10, 15]) { const q2 = p.clone().addScaledVector(n, dist + r() * 3); if (q2.x < -14) spots.push([q2.x, q2.z, 1 + r() * 0.5]); }   // never towards the hall
  }
  // a few trees on the inner side too, close to the hall wall (kept clear of the path)
  for (const [x, z] of [[-14.5, -62], [-16, -68]]) spots.push([x, z, 0.9]);
  g.add(trees(spots, { seed: 88 }));

  /* ---- the entrance of the journey: a small pergola with a title banner ---- */
  const peg = new THREE.Group(); peg.position.set(-11.6, 0, HALL.EXIT_Z);
  for (const sz of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.9, 8), wood); post.position.set(0, 2.45, sz * 2.2); peg.add(post); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4.9), wood); beam.position.set(0, 4.95, 0); peg.add(beam);
  const banner = titleBanner('Our journey', 'Perjalanan kami', 3.4, 1.3); banner.position.set(0, 4.05, 0.02); banner.rotation.y = Math.PI / 2; peg.add(banner);
  const vine = []; for (let k = 0; k < 30; k++) vine.push([(r() - 0.5) * 0.5, 4.9 + (r() - 0.5) * 0.4, (r() - 0.5) * 4.6]); peg.add(flowerCluster(vine, { seed: 91, size: 0.2, leafSize: 0.5 }));
  g.add(peg);

  /* ---- flowered arches around both side doors (outside) ---- */
  for (const z of [HALL.EXIT_Z, HALL.ENTER_Z]) {
    const a = flowerArch(2.15, 2.7, { count: q.low ? 22 : 34, seed: 140 + Math.abs(z) }); a.rotation.y = Math.PI / 2; a.position.set(-HALL.W - 1.0, 0, z); g.add(a);
    for (const sz of [-1, 1]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glow); lamp.position.set(-HALL.W - 1.05, 3.4, z + sz * 2.6); g.add(lamp); }
  }

  return { group: g, hotspots, setProgress, curve };
}
