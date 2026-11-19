import * as THREE from 'three';
import { canvasTexture, rng } from './util.js';

/** Palette taken from the existing watercolor design (sage, cream, blush, ochre, teal). */
export const P = {
  sage: 0x8a9a7b, sageL: 0xb7c3a6, sageD: 0x6f7f62, olive: 0x7c8a5e,
  cream: 0xfbf7ea, stone: 0xf1e7d2, stoneD: 0xdccfb5, beige: 0xd9c4a0, wood: 0xb99a73, woodD: 0x8d7152,
  ochre: 0xd9a24a, gold: 0xe2b04a, blush: 0xf0c8cf, rose: 0xe39aa9, roseD: 0xc9707f, peach: 0xf7d6b4,
  teal: 0x8bb0b8, tealD: 0x5b9bb5, white: 0xffffff,
};

const cache = new Map();
/** Cheap lit material (Lambert: no per-pixel specular, friendly to phones). */
export function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
  cache.set(key, m);
  return m;
}
export const glow = (color, intensity = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), fog: false });

/** Painted-plank wood and stone textures drawn once on a canvas (no image files). */
export function plankTexture(base = '#b99a73') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(7);
    const n = 6, pw = w / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${r() < .5 ? '255,240,215' : '90,60,35'},${0.05 + r() * 0.08})`;
      g.fillRect(i * pw, 0, pw, h);
      g.fillStyle = 'rgba(70,45,25,.35)'; g.fillRect(i * pw, 0, 2, h);
      for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(70,45,25,${r() * 0.12})`; g.fillRect(i * pw + r() * pw, r() * h, 1.5, 30 + r() * 80); }
    }
    g.fillStyle = 'rgba(70,45,25,.4)'; g.fillRect(0, h * 0.28, w, 5); g.fillRect(0, h * 0.72, w, 5);
    g.fillStyle = '#e2b04a';
    for (let i = 0; i < n; i++) for (const y of [h * 0.28 + 2.5, h * 0.72 + 2.5]) { g.beginPath(); g.arc(i * pw + pw / 2, y, 3.2, 0, 7); g.fill(); }
  });
}

export function marbleTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(190,170,140,${0.05 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(r() * w, r() * h); g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h); g.stroke(); }
    g.strokeStyle = 'rgba(180,160,130,.5)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
}
