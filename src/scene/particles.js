import * as THREE from 'three';
import { rng } from './util.js';

const VERT = /* glsl */`
uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform float uScale; uniform float uInside; uniform float uMotion;
attribute vec4 aRand; attribute vec3 aColor; attribute float aKind;
varying vec3 vC; varying float vA; varying float vKind; varying float vRot;
void main(){
  vec3 p = position;
  float fall = aKind < 0.5 ? aRand.y : (aKind < 1.5 ? aRand.y * 0.12 : aRand.y * 0.05);
  p.y -= uTime * fall * uMotion;
  p.x += sin(uTime * 0.6 + aRand.z * 6.28) * (aKind < 0.5 ? 1.4 : 0.6) * uMotion;
  p.z += cos(uTime * 0.5 + aRand.z * 6.28) * (aKind < 0.5 ? 1.4 : 0.6) * uMotion;
  vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(uCam + rel, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(-mv.z, 0.1);
  gl_PointSize = clamp(aRand.x * uScale / d, 1.0, 64.0);
  float edge = 1.0 - smoothstep(0.30, 0.5, length(rel / uBox));
  float near = smoothstep(0.6, 2.2, d);
  float vis = aKind < 0.5 ? 1.0 : (aKind < 1.5 ? uInside : 1.0 - uInside);
  vC = aColor; vKind = aKind; vA = edge * near * vis;
  vRot = aRand.w * 6.28 + uTime * aRand.z * 0.8 * uMotion;
}`;
const FRAG = /* glsl */`
varying vec3 vC; varying float vA; varying float vKind; varying float vRot;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float a;
  vec3 col = vC;
  if (vKind < 0.5) {
    float c = cos(vRot), s = sin(vRot);
    vec2 q = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    a = 1.0 - smoothstep(0.26, 0.31, length(q * vec2(1.0, 2.2)));
    col *= 0.88 + 0.12 * (q.x * 3.0 + 0.5);
  } else {
    float r = length(uv);
    a = pow(smoothstep(0.5, 0.0, r), 1.8);
  }
  float o = a * vA * (vKind < 0.5 ? 0.92 : 0.8);
  if (o < 0.01) discard;
  gl_FragColor = vec4(col, o);
}`;

/** Petals (kind 0), warm lights (kind 1, only inside the hall) and pollen (kind 2, only outside). Wrapped around the camera. */
export function makeParticles(count) {
  const r = rng(77), box = new THREE.Vector3(34, 20, 34);
  const pos = new Float32Array(count * 3), rand = new Float32Array(count * 4), col = new Float32Array(count * 3), kind = new Float32Array(count);
  const petal = [new THREE.Color(0xf0c8cf), new THREE.Color(0xe39aa9), new THREE.Color(0xfbf7ea), new THREE.Color(0xf7d6b4)];
  for (let i = 0; i < count; i++) {
    pos.set([r() * box.x, r() * box.y, r() * box.z], i * 3);
    const k = r() < 0.5 ? 0 : (r() < 0.55 ? 1 : 2);
    kind[i] = k;
    const c = k === 0 ? petal[Math.floor(r() * 4)] : (k === 1 ? new THREE.Color(0xffd98a) : new THREE.Color(0xfff6d8));
    col.set([c.r, c.g, c.b], i * 3);
    rand.set([k === 0 ? 0.16 + r() * 0.12 : (k === 1 ? 0.35 + r() * 0.25 : 0.08 + r() * 0.06), 0.35 + r() * 0.6, r(), r()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: box }, uScale: { value: 600 }, uInside: { value: 0 }, uMotion: { value: 1 } },
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  return {
    object: pts,
    update(t, cam, inside) { m.uniforms.uTime.value = t; m.uniforms.uCam.value.copy(cam.position); m.uniforms.uInside.value = inside; },
    resize(h, fov) { m.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)); },
    setMotion(v) { m.uniforms.uMotion.value = v; },
  };
}
