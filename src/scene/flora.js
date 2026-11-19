import * as THREE from 'three';
import { P, mat } from './materials.js';
import { rng } from './util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

/** Builds one InstancedMesh from a list of {p,s,r,c} placements. */
function instanced(geo, material, items) {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  items.forEach((it, i) => {
    _e.set(it.r?.[0] || 0, it.r?.[1] || 0, it.r?.[2] || 0);
    _q.setFromEuler(_e);
    const s = it.s; _s.set(s[0] ?? s, s[1] ?? s, s[2] ?? s);
    _p.set(it.p[0], it.p[1], it.p[2]);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
    if (it.c != null) mesh.setColorAt(i, _c.set(it.c));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}
export { instanced };

const BLOOM = [P.blush, P.rose, P.cream, P.blush, P.peach, P.cream, P.gold];
const LEAF = [P.sage, P.sageL, P.sageD, P.olive];
const pick = (r, a) => a[Math.floor(r() * a.length)];

/** Low-poly flower heads + leaves scattered on a list of anchor points. */
export function flowerCluster(points, { seed = 3, size = 0.22, leafSize = 0.5, bloom = BLOOM, leaves = true } = {}) {
  const r = rng(seed);
  const g = new THREE.Group();
  const heads = points.map((p) => ({ p, s: [size * (0.7 + r() * 0.7), size * (0.5 + r() * 0.4), size * (0.7 + r() * 0.7)], r: [r() * 3, r() * 3, r() * 3], c: pick(r, bloom) }));
  g.add(instanced(new THREE.IcosahedronGeometry(1, 0), mat(0xffffff), heads));
  if (leaves) {
    const lv = [];
    points.forEach((p) => { if (r() < 0.9) lv.push({ p: [p[0] + (r() - .5) * .3, p[1] + (r() - .5) * .3, p[2] + (r() - .5) * .3], s: [leafSize * .45, leafSize * .1, leafSize * (.9 + r() * .8)], r: [r() * 6, r() * 6, r() * 6], c: pick(r, LEAF) }); });
    g.add(instanced(new THREE.SphereGeometry(1, 5, 3), mat(0xffffff), lv));
  }
  return g;
}

/** Points along a semicircle arch (in the XY plane) with some thickness. */
export function archPoints(radius, count, { thick = 0.32, seed = 5, base = 0, spread = Math.PI } = {}) {
  const r = rng(seed), out = [];
  for (let i = 0; i < count; i++) {
    const a = (i / (count - 1)) * spread + (r() - .5) * .05;
    const rr = radius + (r() - .5) * thick * 2;
    out.push([Math.cos(a) * rr, base + Math.sin(a) * rr, (r() - .5) * thick * 1.6]);
  }
  return out;
}

export function lineOfPoints(a, b, count, jitter = 0.2, seed = 9) {
  const r = rng(seed), out = [];
  for (let i = 0; i < count; i++) { const t = i / (count - 1); out.push([a[0] + (b[0] - a[0]) * t + (r() - .5) * jitter, a[1] + (b[1] - a[1]) * t + (r() - .5) * jitter, a[2] + (b[2] - a[2]) * t + (r() - .5) * jitter]); }
  return out;
}

/** Trees: trunk + two blobs of canopy, all instanced. */
export function trees(spots, { seed = 21 } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const trunk = [], canopy = [], top = [];
  spots.forEach(([x, z, sc = 1]) => {
    const s = sc * (0.8 + r() * 0.6);
    const blossom = r() < 0.22;
    const col = blossom ? pick(r, [P.blush, P.rose, 0xf4d3d8]) : pick(r, [P.sage, P.sageL, P.sageD, P.olive, 0x9fb08a]);
    trunk.push({ p: [x, 1.1 * s, z], s: [s, s, s], c: P.woodD });
    canopy.push({ p: [x, 3.1 * s, z], s: [1.7 * s, 1.55 * s, 1.7 * s], r: [0, r() * 6, 0], c: col });
    top.push({ p: [x + (r() - .5) * .5 * s, 4.3 * s, z + (r() - .5) * .5 * s], s: [1.15 * s, 1.1 * s, 1.15 * s], r: [0, r() * 6, 0], c: new THREE.Color(col).offsetHSL(0, 0, 0.06).getHex() });
  });
  g.add(instanced(new THREE.CylinderGeometry(0.14, 0.24, 2.2, 5), mat(0xffffff), trunk));
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), canopy));
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff), top));
  return g;
}

/** Wild flowers dotted on the meadow. */
export function meadowFlowers(count, area, { seed = 33, avoid } = {}) {
  const r = rng(seed), pts = [];
  while (pts.length < count) {
    const x = area.x0 + r() * (area.x1 - area.x0), z = area.z0 + r() * (area.z1 - area.z0);
    if (avoid && avoid(x, z)) continue;
    pts.push([x, 0.28, z]);
  }
  return flowerCluster(pts, { seed, size: 0.2, leafSize: 0.45 });
}

/** A floral arch (columns + semicircle) standing on the ground, facing +z. Origin at the arch's ground center. */
export function flowerArch(R, colH, { count = 46, seed = 5, thick = 0.34, bloom } = {}) {
  const pts = [
    ...archPoints(R, count, { base: colH, thick, seed }),
    ...lineOfPoints([-R, 0.2, 0], [-R, colH, 0], Math.round(colH * 3.5), thick, seed + 1),
    ...lineOfPoints([R, 0.2, 0], [R, colH, 0], Math.round(colH * 3.5), thick, seed + 2),
  ];
  return flowerCluster(pts, { seed, size: 0.26, leafSize: 0.6, ...(bloom ? { bloom } : {}) });
}
