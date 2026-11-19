import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Small deterministic RNG so the scene looks the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Shared loading manager so the loader screen can show real progress. */
export const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const cache = new Map();
export function loadTex(url) {
  if (cache.has(url)) return cache.get(url);
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(url, t);
  return t;
}

/** Cutout illustration as an upright billboard-ish plane (alpha cut, fog aware). */
export function cutoutPlane(url, width, height, { y = 0, lit = false, opacity = 1 } = {}) {
  const tex = loadTex(url);
  const mat = lit
    ? new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, opacity })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, opacity });
  const g = new THREE.PlaneGeometry(width, height);
  g.translate(0, y + height / 2, 0);
  return new THREE.Mesh(g, mat);
}

/** Soft round gradient sprite texture (glows, clouds). */
export function softDot(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTexture(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, inner); r.addColorStop(1, outer);
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
}
