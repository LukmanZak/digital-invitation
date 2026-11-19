import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { BOARDS, BOARD_CSS_W, STOPS } from './stops.js';
import { P, mat } from './materials.js';
import { smoothstep } from './util.js';

/**
 * Hangs the invitation blocks (real HTML) in the castle.
 * - The HTML lives in a CSS3D scene rendered BEHIND the (transparent) WebGL canvas.
 * - Where a board hangs, a "hole" plane in the WebGL scene erases the canvas, so the HTML shows through, and anything
 *   that is nearer than the board (arches, door leaves, petals) still draws over it.
 * - The hole fades the canvas (dst *= 1 - weight), which cross-fades scene and board without touching the HTML.
 */
const holeMat = () => new THREE.MeshBasicMaterial({
  color: 0x000000, transparent: true, opacity: 1, depthWrite: true, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
});

export function createBoards({ onEnter, onLeave } = {}) {
  const cssScene = new THREE.Scene();
  const glGroup = new THREE.Group();
  const items = [];
  const gold = mat(P.gold), wood = mat(P.woodD), backing = mat(0xcdb48f);

  for (const [id, def] of Object.entries(BOARDS)) {
    const el = document.getElementById('bd-' + id);
    if (!el) continue;
    const stop = STOPS.findIndex((s) => s.boards && s.boards.includes(id));
    el.style.width = BOARD_CSS_W + 'px';

    const css = new CSS3DObject(el);
    css.scale.setScalar(def.w / BOARD_CSS_W);
    css.position.set(...def.pos); css.rotation.y = def.rotY;
    el.style.userSelect = ''; el.style.webkitUserSelect = '';
    cssScene.add(css);

    const holeM = holeMat();
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), holeM);
    hole.position.set(...def.pos); hole.rotation.y = def.rotY;
    hole.renderOrder = 1;
    glGroup.add(hole);

    const mount = new THREE.Group();            // physical things the board hangs on, in board-local space
    mount.position.set(...def.pos); mount.rotation.y = def.rotY;
    glGroup.add(mount);

    const item = { id, def, el, css, hole, holeM, mount, stop, h: 1, weight: 0, active: false, built: false };
    items.push(item);
    // content that changes height (RSVP -> thank-you message, a new wish, fonts arriving) resizes the hole with it
    // one rebuild per frame at most, however many times the HTML resizes in that frame
    let queued = false;
    new ResizeObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; layout(item); }); }).observe(el);
  }

  /** Measure the HTML (after fonts/images) and (re)build the hole and mounts to match. */
  function layout(it) {
    const hpx = it.el.offsetHeight;
    if (!hpx) return;                      // not displayed right now (display:none): keep the last known size
    const k = it.def.w / BOARD_CSS_W, hw = hpx * k, w = it.def.w;
    if (Math.abs(hw - it.h) < 0.02 && it.built) return;
    it.h = hw; it.built = true;
    it.hole.scale.set(w * 0.992, hw * 0.992, 1);   // a hair smaller than the HTML so no backdrop shows at the edges
    it.mount.children.forEach((c) => { if (c.geometry) c.geometry.dispose(); });   // shared materials stay; only the old geometries go
    it.mount.clear();
    const m = it.def.mount;
    if (m === 'poles') {
      const top = it.def.pos[1] + hw / 2 + 0.35;
      for (const sx of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, top + 0.1, 8), wood);
        pole.position.set(sx * (w / 2 + 0.2), top / 2 - it.def.pos[1], 0);   // from the ground (local y = -pos.y) up to `top`
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), gold); cap.position.set(sx * (w / 2 + 0.2), top - it.def.pos[1] + 0.05, 0);
        it.mount.add(pole, cap);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w + 0.5, 8), gold);
      bar.rotation.z = Math.PI / 2; bar.position.set(0, hw / 2 + 0.12, 0);
      it.mount.add(bar);
      for (const sx of [-1, 1]) { const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 5), wood); rope.position.set(sx * (w / 2 - 0.25), hw / 2 + 0.05, 0); it.mount.add(rope); }
    } else if (m === 'door') {
      for (const sy of [-1, 1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w + 0.55, 10), wood);
        rod.rotation.z = Math.PI / 2; rod.position.set(0, sy * (hw / 2 + 0.02), 0.02);
        it.mount.add(rod);
        for (const sx of [-1, 1]) { const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), gold); knob.position.set(sx * (w / 2 + 0.3), sy * (hw / 2 + 0.02), 0.02); it.mount.add(knob); }
      }
    } else if (m === 'wall') {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, hw + 0.34, 0.1), backing);
      plate.position.z = -0.07; it.mount.add(plate);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, hw + 0.5, 0.06), gold);
      rim.position.z = -0.12; it.mount.add(rim);
    }
  }

  function measure() { items.forEach((it) => { it.css.visible = true; }); }
  function relayout() { items.forEach(layout); }

  const tmp = new THREE.Vector3();
  function update(s, camPos) {
    for (const it of items) {
      const d = Math.abs(s - it.stop);
      let wgt = 1 - smoothstep(0.15, 0.5, d);
      tmp.set(...it.def.pos);
      wgt *= smoothstep(1.6, 3.4, camPos.distanceTo(tmp));
      it.weight = wgt;
      const vis = wgt > 0.02;
      it.css.visible = vis; it.hole.visible = vis; it.mount.visible = d < 2.2;
      it.holeM.opacity = wgt;
      if (vis) {
        const live = wgt > 0.7;
        it.el.style.pointerEvents = live ? 'auto' : 'none';
        if (live && !it.active) { it.active = true; layout(it); onEnter && onEnter(it.id); }
        else if (!live && it.active && wgt < 0.35) { it.active = false; onLeave && onLeave(it.id); }
      } else if (it.active) { it.active = false; onLeave && onLeave(it.id); }
    }
  }

  return { cssScene, glGroup, items, update, measure, relayout };
}
