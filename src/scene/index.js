import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { FOG, buildWorld } from './world.js';
import { buildCastle } from './castle.js';
import { buildHall } from './hall.js';
import { makeParticles } from './particles.js';
import { createBoards } from './boards.js';
import { buildGarden } from './garden.js';
import { HALL } from './layout.js';
import { STOPS, BOARDS, idx } from './stops.js';
import { smoothstep, lerp } from './util.js';

const I_BISM = idx('bism'), I_GREET = idx('greet'), I_DOOR = idx('door'), I_EXIT = idx('exit'), I_REENTER = idx('reenter'), I_END = idx('end'), I_THANKS = idx('thanks');

/** 1 inside the hall, 0 outside, smooth across the doors (distance to the interior box, shrunk a little). */
function insideness(p) {
  const m = 1.5, dx = Math.max(Math.abs(p.x) - (HALL.W - m), 0);
  const dz = p.z > HALL.Z0 - m ? p.z - (HALL.Z0 - m) : (p.z < HALL.Z1 + m ? (HALL.Z1 + m) - p.z : 0);
  return 1 - smoothstep(0, 5, Math.hypot(dx, dz));
}

export function createScene(canvas, quality, hooks = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !quality.mobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality.dpr);
  renderer.setClearColor(0x000000, 0);                 // transparent: the HTML boards show through the "holes"
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // HTML layer, rendered behind the canvas with the same camera
  const css = new CSS3DRenderer();
  css.domElement.id = 'css3d';
  canvas.parentElement.insertBefore(css.domElement, canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 30, 190);

  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 800);

  const hemi = new THREE.HemisphereLight(0xfff3e6, 0xdccdb0, 2.4);
  const sun = new THREE.DirectionalLight(0xffe0bd, 2.4); sun.position.set(-40, 50, 50);
  scene.add(hemi, sun);

  const world = buildWorld(quality);
  const castle = buildCastle(quality);
  const hall = buildHall(quality);
  const particles = makeParticles(quality.particles);
  const garden = buildGarden(quality);
  const boards = createBoards({ onEnter: hooks.onBoardEnter, onLeave: hooks.onBoardLeave });
  scene.add(world.group, castle.group, hall.group, garden.group, boards.glGroup, particles.object);
  const hotspots = [...hall.hotspots, ...garden.hotspots];

  const posCurve = new THREE.CatmullRomCurve3(STOPS.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(STOPS.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const N = STOPS.length - 1;

  const interiorFog = new THREE.Color(0xf3e6cf), outdoorHemi = new THREE.Color(0xfff3e6), indoorHemi = new THREE.Color(0xffe6c4);
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  const state = { s: 0, inside: 0, gate: 0, door: 0, w: 1, h: 1 };
  let motion = 1;

  function setSize(w, h) {
    state.w = w; state.h = h;
    renderer.setSize(w, h, false);
    css.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.75 ? 66 : (w / h < 1.2 ? 58 : 52);
    camera.updateProjectionMatrix();
    particles.resize(h * quality.dpr, camera.fov);
  }

  // lay the boards out once so their real heights are known (the browser measures them); then hide them until needed
  setSize(window.innerWidth, window.innerHeight);
  boards.measure();
  css.render(boards.cssScene, camera);
  boards.relayout();
  boards.items.forEach((it) => { it.css.visible = false; });

  /** s: fractional stop index. The camera follows the scroll curve only: no pointer parallax, so it stays steady. */
  function render(s, t) {
    state.s = s;
    const u = Math.min(1, Math.max(0, s / N));
    posCurve.getPoint(u, tmpP); lookCurve.getPoint(u, tmpL);
    camera.position.copy(tmpP); camera.lookAt(tmpL);
    camera.updateMatrixWorld();

    state.inside = insideness(tmpP);
    // the hall interior (hundreds of draw calls) only exists for the camera once it is at the hall door or beyond;
    // before that the door is shut and walls hide it anyway
    hall.interior.visible = tmpP.z < -18 || state.door > 0.02;
    state.gate = smoothstep(I_BISM + 0.1, I_BISM + 0.9, s);
    state.door = smoothstep(I_GREET + 0.3, I_DOOR, s);
    const k = state.inside;
    hemi.intensity = lerp(2.4, 2.1, k); hemi.color.copy(outdoorHemi).lerp(indoorHemi, k);
    sun.intensity = lerp(2.4, 0.05, k);
    scene.fog.color.copy(FOG).lerp(interiorFog, k);
    scene.fog.near = lerp(30, 18, k); scene.fog.far = lerp(190, 95, k);

    world.update(t, camera);
    castle.update(t, state.gate, state.door);
    hall.update(t, k);
    hall.thanks.material.opacity = smoothstep(I_END + 0.25, I_THANKS - 0.15, s);        // the closing text appears at the last stop
    particles.update(t, camera, k);
    boards.update(s, camera.position);
    garden.setProgress(smoothstep(I_EXIT + 0.4, I_REENTER - 0.6, s));
    renderer.render(scene, camera);
    css.render(boards.cssScene, camera);
  }

  /* tapping a framed photo in 3D */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hotspots, false).find((h) => { let o = h.object; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    return hit && hit.distance < 22 ? hit.object.userData : null;
  }

  /**
   * Dev check: from every stop, is the centre and each corner of its board / sign visible (no other object in the way)?
   * Returns the blocked ones with what blocks them. Used for QA; not called at runtime.
   */
  function checkVisibility() {
    scene.updateMatrixWorld(true);
    const rc = new THREE.Raycaster(), report = [];
    const solid = [];
    scene.traverse((o) => { if (o.isMesh && !o.isSprite && o.renderOrder >= 0 && o.material && o.material.fog !== false && !(o.parent === boards.glGroup)) solid.push(o); });
    const skip = new Set(); boards.glGroup.traverse((o) => skip.add(o));
    const blockers = solid.filter((o) => !skip.has(o));
    const test = (label, from, targets, ignore) => {
      const blocked = [];
      targets.forEach((t, k) => {
        const dir = t.clone().sub(from), dist = dir.length();
        rc.set(from, dir.normalize()); rc.far = dist - 0.25;
        const hit = rc.intersectObjects(blockers, false).find((h) => !(ignore && ignore(h.object)));
        if (hit) blocked.push({ point: ['centre', 'tl', 'tr', 'bl', 'br'][k], at: hit.point.toArray().map((v) => +v.toFixed(1)), by: hit.object.geometry.type + (hit.object.isInstancedMesh ? '[inst]' : ''), dist: +hit.distance.toFixed(1) });
      });
      report.push({ id: label, ok: !blocked.length, blocked });
    };
    // boards
    STOPS.forEach((st) => (st.boards || []).forEach((id) => {
      const it = boards.items.find((b) => b.id === id); if (!it) return;
      const d = BOARDS[id], w = d.w, h = it.h, c = new THREE.Vector3(...d.pos);
      const right = new THREE.Vector3(Math.cos(d.rotY), 0, -Math.sin(d.rotY));
      const pts = [c.clone()]; for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) pts.push(c.clone().addScaledVector(right, sx * w * 0.45).add(new THREE.Vector3(0, sy * h * 0.45, 0)));
      test('board:' + id, new THREE.Vector3(...st.pos), pts, (o) => o.userData && o.userData.allow);
    }));
    // story signs
    hotspots.filter((hs) => hs.userData.kind === 'story').forEach((hs) => {
      const st = STOPS.find((x) => x.journey === hs.userData.i); if (!st) return;
      const c = hs.getWorldPosition(new THREE.Vector3()), n = new THREE.Vector3(0, 0, 1).applyQuaternion(hs.getWorldQuaternion(new THREE.Quaternion()));
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(hs.getWorldQuaternion(new THREE.Quaternion())), h = 3.4 * 1450 / 1024;
      const pts = [c.clone()]; for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) pts.push(c.clone().addScaledVector(right, sx * 1.5).add(new THREE.Vector3(0, sy * h * 0.45, 0)));
      test('sign:' + hs.userData.i, new THREE.Vector3(...st.pos), pts, (o) => o === hs || o.parent === hs.parent);
    });
    return report;
  }

  /** Dev check: sample the camera path; list samples that sit inside a wall slab (outside a door opening). */
  function checkCameraPath(samples = 400) {
    const bad = [], p = new THREE.Vector3(), W = HALL.W;
    for (let i = 0; i <= samples; i++) {
      posCurve.getPoint(i / samples, p);
      const inLeftWall = p.x < -(W - 0.1) && p.x > -(W + 0.95) && p.z < HALL.Z0 && p.z > HALL.Z1;
      const inRightWall = Math.abs(p.x) > W - 0.1 && Math.abs(p.x) < W + 0.95 && p.x > 0 && p.z < HALL.Z0 && p.z > HALL.Z1;
      const atDoor = [HALL.EXIT_Z, HALL.ENTER_Z].some((z) => Math.abs(p.z - z) < HALL.DOOR_W / 2 - 0.15);
      if ((inLeftWall && !atDoor) || inRightWall) bad.push({ u: +(i / samples).toFixed(3), p: p.toArray().map((v) => +v.toFixed(1)) });
      if (p.y < 1.2 || p.y > 9) bad.push({ u: +(i / samples).toFixed(3), p: p.toArray().map((v) => +v.toFixed(1)), why: 'height' });
    }
    return bad;
  }

  /** Dev check: the inside factor along the camera path, to confirm it changes smoothly through the doors. */
  function insideProfile(samples = 200) {
    const p = new THREE.Vector3(), out = [];
    for (let i = 0; i <= samples; i++) { posCurve.getPoint(i / samples, p); out.push(+insideness(p).toFixed(2)); }
    return out;
  }

  return {
    renderer, camera, state, render, setSize, pick, boards, scene, hotspots, checkVisibility, checkCameraPath, insideProfile,
    setMotion(v) { motion = v; particles.setMotion(v); },
    dispose() { renderer.dispose(); },
  };
}
