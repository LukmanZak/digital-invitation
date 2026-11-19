import * as THREE from 'three';
import { mat } from './materials.js';
import { canvasTexture, rng, softDot, cutoutPlane } from './util.js';
import { trees, meadowFlowers, flowerCluster } from './flora.js';
import { inGarden } from './layout.js';

export const FOG = new THREE.Color(0xf4e3d6);

export function buildWorld(q) {
  const g = new THREE.Group();
  const r = rng(5);

  /* sky: soft morning gradient dome, follows the camera */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0xa9cde0) }, mid: { value: new THREE.Color(0xf1e2dc) }, low: { value: new THREE.Color(0xf9e0cc) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(low, mid, smoothstep(0.0,0.25,h)); c = mix(c, top, smoothstep(0.2,0.85,h)); gl_FragColor = vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 16, 10), skyMat);
  sky.renderOrder = -10;
  g.add(sky);

  /* sun glow behind the castle */
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,226,180,1)', 'rgba(255,226,180,0)'), transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  sun.scale.set(260, 260, 1); sun.position.set(-70, 42, -300);
  g.add(sun);

  /* soft clouds */
  const cloudTex = softDot('rgba(255,255,255,.9)', 'rgba(255,255,255,0)');
  const clouds = [];
  const nC = q.low ? 8 : 16;
  for (let i = 0; i < nC; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5 + r() * 0.25, depthWrite: false, fog: false }));
    const w = 60 + r() * 80;
    s.scale.set(w, w * 0.28, 1);
    s.position.set((r() - 0.5) * 520, 48 + r() * 40, 120 - r() * 480);
    clouds.push(s); g.add(s);
  }

  /* ground with a painted speckle texture */
  const gt = canvasTexture(512, 512, (c, w, h) => {
    c.fillStyle = '#bccaa6'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const a = r(); c.fillStyle = a < 0.5 ? 'rgba(160,184,128,.16)' : (a < 0.8 ? 'rgba(236,230,190,.14)' : 'rgba(240,200,207,.1)'); c.beginPath(); c.arc(r() * w, r() * h, 6 + r() * 22, 0, 7); c.fill(); }
  });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(36, 36);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, -120);
  g.add(ground);

  /* approach path (cream stone) */
  const pathTex = canvasTexture(128, 512, (c, w, h) => {
    c.fillStyle = '#eadcc0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,248,230' : '190,165,125'},${0.12 + r() * 0.16})`; c.beginPath(); c.ellipse(r() * w, r() * h, 6 + r() * 14, 4 + r() * 8, r() * 3, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(160,130,90,.35)'; c.fillRect(0, 0, 6, h); c.fillRect(w - 6, 0, 6, h);
  });
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping; pathTex.repeat.set(1, 16);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 120), new THREE.MeshLambertMaterial({ map: pathTex }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 60);
  g.add(path);

  /* distant hills, layered for depth */
  const hills = new THREE.Group();
  const hillCols = [0xa9bf9a, 0xb7c9a6, 0x9db8a2, 0xc3d0b0, 0xa3bdb4];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, d = 190 + r() * 90;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(hillCols[i % 5]));
    const sc = 50 + r() * 50;
    h.scale.set(sc * 1.6, sc * (0.35 + r() * 0.25), sc);
    h.position.set(Math.sin(a) * d, -1, -100 + Math.cos(a) * d);
    hills.add(h);
  }
  g.add(hills);

  /* trees along the approach (two avenues) + a loose grove */
  const spots = [];
  for (let z = 66; z > 6; z -= 5.2) {
    spots.push([-8.5 - r() * 1.2, z + r() * 2, 1.0 + r() * 0.3], [8.5 + r() * 1.2, z + r() * 2, 1.0 + r() * 0.3]);
    if (!q.low || z % 2 > 1) spots.push([-14 - r() * 14, z + r() * 3, 1.1 + r() * 0.6], [14 + r() * 14, z + r() * 3, 1.1 + r() * 0.6]);
  }
  for (let i = 0; i < (q.low ? 14 : 30); i++) { const t = [(r() < 0.5 ? -1 : 1) * (32 + r() * 60), 60 - r() * 160, 1.3 + r() * 0.9]; if (!inGarden(t[0], t[1])) spots.push(t); }
  g.add(trees(spots));

  /* meadow flowers + flower beds hugging the path */
  g.add(meadowFlowers(q.low ? 160 : 340, { x0: -26, x1: 26, z0: 4, z1: 70 }, { avoid: (x) => Math.abs(x) < 3.6 }));
  const bed = [];
  for (let z = 70; z > 6; z -= 1.6) for (const sx of [-1, 1]) bed.push([sx * (3.7 + r() * 0.5), 0.3, z + r()]);
  g.add(flowerCluster(bed, { seed: 8, size: 0.26, leafSize: 0.55 }));

  /* illustrated plants (existing watercolor cutouts) as crossed planes at the path edge */
  const plants = new THREE.Group();
  const spec = ['WA0005', 'WA0006', 'WA0002', 'WA0003', 'WA0007'];
  for (let z = 62, i = 0; z > 8; z -= 9, i++) {
    for (const sx of [-1, 1]) {
      const f = spec[(i + (sx > 0 ? 2 : 0)) % spec.length];
      const w = 1.8 + r() * 0.8, hgt = w * (f === 'WA0006' ? 1 : 1.5);
      for (const ry of [0, Math.PI / 2]) {
        const m = cutoutPlane(`/asset/cutout/${f}.webp`, w, hgt);
        m.position.set(sx * (4.6 + r() * 0.7), 0, z); m.rotation.y = ry + r() * 0.5;
        plants.add(m);
      }
    }
  }
  g.add(plants);

  return {
    group: g,
    sky,
    update(t, cam) {
      sky.position.copy(cam.position);
      clouds.forEach((c, i) => { c.position.x += 0.004 * (1 + (i % 3)); if (c.position.x > 280) c.position.x = -280; });
      sun.position.x = -70 + cam.position.x * 0.9;
    },
  };
}
