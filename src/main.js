import './legacy.css';
import './boards.css';
import './style.css';
import './legacy.js';                      // the original invitation behaviour (RSVP, countdown, gifts, sheets, toasts)
import { createRail } from './rail.js';
import { manager } from './scene/util.js';
import { STOPS } from './scene/stops.js';

const root = document.documentElement;
const loader = document.getElementById('loader');
const bar = document.getElementById('ldBar');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const legacy = () => window.__legacy;

function hideLoader() { loader.classList.add('done'); setTimeout(() => loader.remove(), 1000); }

function detectQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('mobile');   // ?mobile = test the phone profile on a desktop
  const low = mem <= 2 || (cores <= 4 && coarse && window.devicePixelRatio < 2);
  // phones / tablets ("coarse" pointer): smaller canvas, no multisampling, no real point lights, fewer particles
  const mobile = coarse || low;
  return { low, mobile, dpr: Math.min(window.devicePixelRatio || 1, low ? 1 : (coarse ? 1.25 : 1.5)), particles: reduce ? 0 : (low ? 70 : (coarse ? 110 : 220)) };
}

/** Without WebGL everything stacks as normal sections and still works. */
function fallback() {
  root.classList.add('no-gl');
  buildNoGlThumbs();
  hideLoader();
  const l = legacy();
  if (l) ['cover', 'wof', 'bism', 'greet', 'event', 'count', 'gift', 'rsvp', 'wish', 'thanks'].forEach((id) => l.reveal(id));
}

function buildNoGlThumbs() {
  const cfg = legacy().CONFIG;
  const fill = (id, list, kind) => {
    const box = document.getElementById(id);
    if (!box) return;
    list.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.sheet = kind; b.dataset.i = i; b.setAttribute('aria-label', it.cap);
      const im = document.createElement('img'); im.src = it.img; im.alt = ''; im.loading = 'lazy'; im.style.objectPosition = it.pos;
      if (it.fit === 'contain') im.className = 'fit';
      b.appendChild(im); box.appendChild(b);
    });
  };
  fill('noglStory', cfg.story, 'story');
  fill('noglGallery', cfg.gallery, 'photo');
}

async function boot() {
  let gl = null;
  try { gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); } catch (e) { /* ignore */ }
  if (!gl || new URLSearchParams(location.search).has('nogl')) { fallback(); return; }   // ?nogl forces the plain version (for testing)

  const quality = detectQuality();
  if (quality.low) root.classList.add('low');

  // names on the 3D signs are drawn on a canvas, so the font has to be ready first
  try { await Promise.race([document.fonts.load('48px Marelle'), new Promise((r) => setTimeout(r, 1800))]); } catch (e) { /* ignore */ }

  const { createScene } = await import('./scene/index.js');
  const canvas = document.getElementById('gl');
  let scene;
  try {
    scene = createScene(canvas, quality, {
      onBoardEnter: (id) => { const b = document.getElementById('bd-' + id); if (b) b.classList.add('is-active'); legacy().activate(id); if (id === 'wish') legacy().wishes(true); },
      onBoardLeave: (id) => { const b = document.getElementById('bd-' + id); if (b) b.classList.remove('is-active'); if (id === 'wish') legacy().wishes(false); },
    });
  } catch (e) { console.error(e); fallback(); return; }
  scene.setMotion(reduce ? 0 : 1);
  root.classList.add('gl');

  // the scroll length: one invisible track per camera stop
  const tracks = document.createElement('main');
  tracks.id = 'tracks';
  STOPS.forEach((s) => { const t = document.createElement('div'); t.className = 'track'; t.id = 'tr-' + s.id; t.style.height = s.h + 'svh'; tracks.appendChild(t); });
  document.body.appendChild(tracks);

  const stage = document.getElementById('stage');
  let lastW = 0, lastH = 0;
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === lastW && Math.abs(h - lastH) < 120) return;       // ignore mobile address-bar jitter
    lastW = w; lastH = h;
    scene.setSize(w, h);
    scene.boards.relayout();
  };
  resize();
  window.addEventListener('resize', resize);
  // opening the invitation unlocks the page and a desktop scrollbar appears: the stage gets narrower WITHOUT a window resize
  // event. Without this the WebGL "holes" and the CSS3D boards end up a few pixels apart (a pale strip at a board's edge).
  new ResizeObserver(resize).observe(stage);
  document.fonts.ready.then(() => scene.boards.relayout());

  // the keyboard opens when a form field is focused: the wishes board pauses its auto comments while typing
  document.addEventListener('focusin', (e) => { if (e.target.closest('input, textarea')) root.classList.add('typing'); });
  document.addEventListener('focusout', () => root.classList.remove('typing'));

  const rail = createRail(STOPS.map((s) => 'tr-' + s.id), STOPS.map((s) => s.hold));

  /* tap a frame on the wall; tell taps from scroll drags */
  const UI = '.board, .cover, .pcard, button, a, input, textarea, #toast';
  let down = null, lastMove = 0;
  window.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; }, { passive: true });
  window.addEventListener('pointerup', (e) => {
    const d = down; down = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || e.target.closest(UI)) return;
    const hit = scene.pick(e.clientX, e.clientY);
    if (hit) legacy().openPhoto(hit.kind, hit.i);
  });
  window.addEventListener('pointermove', (e) => {
    const n = performance.now(); if (n - lastMove < 80) return; lastMove = n;
    if (e.pointerType === 'touch') return;
    document.body.style.cursor = !e.target.closest(UI) && scene.pick(e.clientX, e.clientY) ? 'pointer' : '';
  }, { passive: true });

  const cover = document.getElementById('cover');
  const hinted = new Set();
  let sCur = rail.get(), last = performance.now(), shown = false;
  // battery / heat: while the guest is reading (no scrolling for a moment) only the ambient motion needs drawing, so 30 fps is plenty
  let lastScroll = performance.now(), lastDraw = 0;
  window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  let cvPrev = '';
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }
    if (shown && now - lastScroll > 1200 && Math.abs(rail.get() - sCur) < 0.002 && now - lastDraw < 30) return;
    lastDraw = now;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const target = rail.get();
    // the page scroll is already inertial: only a light follow so the camera never feels like it drags behind
    sCur += (target - sCur) * (reduce || window.__snap ? 1 : 1 - Math.exp(-dt * 14));
    if (Math.abs(target - sCur) < 0.0005) sCur = target;
    scene.render(sCur, now / 1000);

    // cover title card: on screen until the camera starts to move
    const cv = 1 - Math.min(1, Math.max(0, (sCur - 0.04) / 0.5));
    const cvKey = cv.toFixed(3);
    if (cvKey !== cvPrev) {
      cvPrev = cvKey;
      cover.style.opacity = cvKey;
      cover.style.visibility = cv < 0.01 ? 'hidden' : 'visible';
      cover.style.pointerEvents = cv > 0.6 ? 'auto' : 'none';
    }

    // one-time hints at stops where the wall frames are tappable
    const i = Math.round(sCur);
    const st = STOPS[i];
    if (st && st.hint && Math.abs(sCur - i) < 0.12 && !hinted.has(i) && shown) { hinted.add(i); legacy().showToast(st.hint); }

    if (!shown) {
      shown = true;
      requestAnimationFrame(() => { bar.style.width = '100%'; setTimeout(() => { hideLoader(); legacy().reveal('cover'); }, 250); });
    }
  }
  requestAnimationFrame(tick);

  manager.onProgress = (_u, loaded, total) => { if (!shown) bar.style.width = Math.round((loaded / total) * 90) + '%'; };
  window.__scene = scene;     // handy for debugging in the console
}

boot().catch((e) => { console.error(e); fallback(); });
