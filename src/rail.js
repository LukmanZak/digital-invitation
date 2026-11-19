import { clamp, smoothstep } from './scene/util.js';

/**
 * Maps the page scroll position to a fractional "stop" index along the list of anchor elements.
 * s = 2.0 means "exactly at the 3rd anchor", s = 2.5 means "halfway to the 4th".
 * `holds[i]` is the share of the way to a neighbour during which the camera still rests at stop i
 * (0.34 = camera is still for about two thirds of the scroll between two stops, so a board can be read).
 */
export function createRail(ids, holds = []) {
  const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
  let centers = [];
  const measure = () => { centers = els.map((el) => { const r = el.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; }); };
  measure();
  const ro = new ResizeObserver(measure);
  els.forEach((el) => ro.observe(el));
  window.addEventListener('load', measure);
  window.addEventListener('resize', measure);
  const hold = (i) => (holds[i] == null ? 0.34 : holds[i]);

  return {
    count: els.length,
    measure,
    /** Scroll position -> fractional anchor index. */
    get() {
      const focus = window.scrollY + window.innerHeight * 0.5;
      if (focus <= centers[0]) return 0;
      const last = centers.length - 1;
      if (focus >= centers[last]) return last;
      let i = 0;
      while (i < last - 1 && focus >= centers[i + 1]) i++;
      const t = clamp((focus - centers[i]) / (centers[i + 1] - centers[i]));
      const a = hold(i), b = 1 - hold(i + 1);
      return i + smoothstep(a, Math.max(a + 0.02, b), t);
    },
  };
}
