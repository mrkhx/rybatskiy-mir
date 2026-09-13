import * as THREE from "three";

const SEGMENTS = 22;
const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

/** Quadratic sag from RodTip → FloatAttach. tension 0 = sag, 1 = taut. */
export function sampleLine(
  tip: THREE.Vector3,
  attach: THREE.Vector3,
  tension: number,
  out: Float32Array,
): void {
  const t = Math.max(0, Math.min(1, tension));
  _p0.copy(tip);
  _p2.copy(attach);
  _mid.lerpVectors(_p0, _p2, 0.48);
  const span = _p0.distanceTo(_p2);
  const sag = (1 - t) * (1 - t) * Math.min(0.55, 0.18 + span * 0.12);
  _p1.copy(_mid).addScaledVector(_down, sag);
  let o = 0;
  for (let i = 0; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    const a = 1 - u;
    _mid
      .copy(_p0)
      .multiplyScalar(a * a)
      .addScaledVector(_p1, 2 * a * u)
      .addScaledVector(_p2, u * u);
    out[o++] = _mid.x;
    out[o++] = _mid.y;
    out[o++] = _mid.z;
  }
}

export const LINE_SEGMENTS = SEGMENTS;
export const LINE_FLOATS = (SEGMENTS + 1) * 3;

export function lineOpacity(tension: number): number {
  return 0.38 + Math.max(0, Math.min(1, tension)) * 0.18;
}
