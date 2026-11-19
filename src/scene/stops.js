import { HALL, journeyLayout } from './layout.js';

/**
 * One list drives everything: where the camera rests, how long the scroll lingers there, and which boards hang there.
 * Units are metres. The castle gate is at z = 0, the hall door at z = -32, the stage at z = -120. Hall walls are x = +-9.
 *
 * h     scroll length of the stop in svh (screen heights x 100). Kept short so the page scrolls as one smooth flow.
 *       The LAST stop must stay >= 100 so the rail can reach its centre (see rail.js).
 * pos   camera position, look = its target
 * hold  share of the way to the neighbouring stop during which the camera stays put (default 0.12 = a short pause so a
 *       board can be read; transit stops use a smaller value so the camera keeps moving through doors)
 * boards  HTML boards hanging here; hint  one-time toast
 */
const J = journeyLayout();
const jStop = (i) => ({
  id: 'j' + (i + 1), h: 70,
  pos: J[i].cam, look: J[i].look,
  hint: i === 0 ? 'Ketuk papan untuk memperbesar foto' : undefined,
  journey: i,
});

export const STOPS = [
  { id: 'cover',   h: 70,  pos: [0, 3.4, 88],       look: [0, 9, -10],      hold: 0.2 },
  { id: 'wof',     h: 80,  pos: [1.4, 3.3, 44.5],   look: [-3.4, 4.2, 36],   boards: ['wof'] },
  { id: 'bism',    h: 80,  pos: [0, 3.3, 9.6],      look: [0, 3.9, 0],       boards: ['bism'] },
  { id: 'gate',    h: 45,  pos: [0, 2.6, 5],        look: [0, 4.5, -18],     hold: 0.05 },
  { id: 'greet',   h: 85,  pos: [1.2, 3.0, -8.2],   look: [-4.8, 3.9, -14.5], boards: ['greet'] },
  { id: 'door',    h: 45,  pos: [0, 2.9, -26.5],    look: [0, 4.6, -46],     hold: 0.05 },

  // inside the hall: cards on the LEFT wall first
  { id: 'event',   h: 80,  pos: [1.4, 3.5, -39.5],  look: [-8, 4.4, -39],    boards: ['event'] },
  { id: 'count',   h: 75,  pos: [1.4, 3.5, -45.5],  look: [-8, 4.4, -45],    boards: ['count'] },
  { id: 'gift',    h: 85,  pos: [1.4, 3.5, -51.5],  look: [-8, 4.2, -51],    boards: ['gift'] },

  // out through the side door, along the garden path with the story signs, back in through the second side door
  { id: 'exit',    h: 35,  pos: [-3.2, 3.2, -57],   look: [-12, 2.4, -56.8], hold: 0.05 },
  { id: 'gdoor',   h: 30,  pos: [-10.2, 2.7, -57],  look: [-17, 2.6, -56.2], hold: 0.02 },
  ...J.map((_, i) => jStop(i)),
  { id: 'gdoor2',  h: 30,  pos: [-13, 2.7, -75],    look: [-5, 3, -75],      hold: 0.02 },
  { id: 'reenter', h: 35,  pos: [-4.5, 3.3, -75],   look: [3, 3.5, -79],     hold: 0.1 },

  // then the RIGHT wall: RSVP, wishes, photo gallery
  { id: 'rsvp',    h: 90,  pos: [-1.2, 3.5, -81],   look: [8, 3.9, -81],     boards: ['rsvp'] },
  { id: 'wish',    h: 90,  pos: [-1.2, 3.5, -87],   look: [8, 4.0, -87],     boards: ['wish'] },
  { id: 'tsight',  h: 80,  pos: [-1.2, 3.6, -93],   look: [8.6, 4.2, -93],   hint: 'Ketuk foto untuk memperbesar' },
  { id: 'tsight2', h: 75,  pos: [-1.2, 3.6, -99],   look: [8.6, 4.2, -99] },

  // finally the middle: the stage and the big thank-you text
  { id: 'end',     h: 65,  pos: [0, 3.3, -101],     look: [0, 4.0, -120] },
  { id: 'thanks',  h: 100, pos: [0, 4.3, -103],     look: [0, 4.3, -112],   boards: ['thanks'] },
];

/**
 * Boards: HTML blocks standing in the castle. `w` = width in metres (the HTML is 360 css px wide), `pos` = centre,
 * `rotY` = turn around the vertical axis (0 faces +z). `mount` = what it hangs on (poles / door / wall).
 */
export const BOARDS = {
  wof:   { w: 4.4, pos: [-3.4, 4.3, 36],     rotY: 0.3,           mount: 'poles' },
  bism:  { w: 4.0, pos: [0, 3.9, 0.16],      rotY: 0,             mount: 'door' },
  greet: { w: 4.2, pos: [-4.8, 3.9, -14.5],  rotY: 0.76,          mount: 'poles' },
  event: { w: 3.8, pos: [-7.9, 4.4, -39],    rotY: Math.PI / 2,   mount: 'wall' },
  count: { w: 3.4, pos: [-7.9, 4.4, -45],    rotY: Math.PI / 2,   mount: 'wall' },
  gift:  { w: 3.8, pos: [-7.9, 4.2, -51],    rotY: Math.PI / 2,   mount: 'wall' },
  rsvp:  { w: 3.8, pos: [7.9, 3.8, -81],     rotY: -Math.PI / 2,  mount: 'wall' },
  thanks:{ w: 4.2, pos: [0, 4.4, -112],       rotY: 0,             mount: 'poles' },
  wish:  { w: 3.8, pos: [7.9, 3.9, -87],     rotY: -Math.PI / 2,  mount: 'wall' },
};

export const BOARD_CSS_W = 360;
export const idx = (id) => STOPS.findIndex((s) => s.id === id);
export { HALL };
