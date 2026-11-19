import * as THREE from 'three';

/**
 * Shared geometry of the castle, so hall, garden, camera stops and lighting agree. Metres.
 * The gate is at z = 0, the hall door (facade) at z = -32, the hall interior runs from Z0 to Z1 (x = -W..W).
 */
export const HALL = {
  Z0: -33, Z1: -120, W: 9, H: 10, VAULT: 0.7,
  DOOR_W: 3.2, DOOR_SPRING: 2.8,
  EXIT_Z: -57,       // side door (left wall) leading out to the garden
  ENTER_Z: -75,      // side door (left wall) leading back in
};

/** Centre line of the garden path (x, z), from the exit door round the garden and back to the entry door. */
export const GARDEN_PATH = [
  [-9.6, -57], [-14, -56.4], [-19, -55], [-24, -56.2], [-28.5, -60], [-29.5, -65.5],
  [-27, -70.5], [-22, -73.6], [-16, -74.8], [-9.6, -75],
];
export const GARDEN_BOX = { x0: -46, x1: -8, z0: -92, z1: -40 };
export const inGarden = (x, z) => x > GARDEN_BOX.x0 && x < GARDEN_BOX.x1 && z > GARDEN_BOX.z0 && z < GARDEN_BOX.z1;

export function gardenCurve() {
  return new THREE.CatmullRomCurve3(GARDEN_PATH.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
}

/**
 * Where each of the five story signs stands (outside the bend of the path, facing the walker) and where the camera
 * stands to read it (on the path, ~6.5 m away).
 */
export const SIGN_U = [0.16, 0.33, 0.5, 0.67, 0.84];
export function journeyLayout() {
  const curve = gardenCurve();
  const c = new THREE.Vector3(-19, 0, -66);                 // centre of the loop
  return SIGN_U.map((u) => {
    const p = curve.getPointAt(u);
    const n = p.clone().sub(c).setY(0).normalize();         // outward
    const sign = p.clone().addScaledVector(n, 4.5);
    const cam = p.clone().addScaledVector(n, -2.7);
    return {
      u, path: p, normal: n,
      sign: [sign.x, 0, sign.z],
      signRotY: Math.atan2(-n.x, -n.z),
      cam: [cam.x, 2.7, cam.z],
      look: [sign.x, 3.2, sign.z],
    };
  });
}
