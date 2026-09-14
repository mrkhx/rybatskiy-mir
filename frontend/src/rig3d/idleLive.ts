/**
 * READY→AIM arm raise. Rod is glued to the right hand — arms lift it.
 * No idle rocking. CAST composes on top of the AIM offsets — it does not
 * replace them, or the PRE-CAST → CAST switch snaps the elbows.
 */
import * as THREE from "three";

const DEG = Math.PI / 180;
const REST: Record<string, THREE.Quaternion> = {};
const _q = new THREE.Quaternion();
export const AXIS_X = new THREE.Vector3(1, 0, 0);
export const AXIS_Z = new THREE.Vector3(0, 0, 1);

export const AIM_ARM = {
  UpperArm_R: { axis: AXIS_Z, angle: 10 * DEG },
  LowerArm_R: { axis: AXIS_X, angle: 12 * DEG },
  UpperArm_L: { axis: AXIS_Z, angle: 9 * DEG },
  LowerArm_L: { axis: AXIS_X, angle: 11 * DEG },
} as const;

function getBone(man: THREE.Object3D, name: string): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  man.traverse((o) => {
    if (found) return;
    if ((o as THREE.Bone).isBone && o.name === name) found = o as THREE.Bone;
  });
  return found;
}

/** Mixer-pose rest, shared with CAST so overlays compose on the same bind. */
export function applyArmSpins(
  man: THREE.Object3D,
  name: string,
  spins: ReadonlyArray<{ axis: THREE.Vector3; angle: number }>,
): void {
  const b = getBone(man, name);
  if (!b) return;
  if (!REST[name]) REST[name] = b.quaternion.clone();
  b.quaternion.copy(REST[name]);
  for (const spin of spins) {
    if (spin.angle === 0) continue;
    _q.setFromAxisAngle(spin.axis, spin.angle);
    b.quaternion.multiply(_q);
  }
}

/** u=0 READY, u=1 AIM. Both arms raise the glued rod. */
export function applyAimArms(man: THREE.Object3D, u: number): void {
  const k = Math.max(0, Math.min(1, u));
  applyArmSpins(man, "UpperArm_R", [{ axis: AXIS_Z, angle: 10 * DEG * k }]);
  applyArmSpins(man, "LowerArm_R", [{ axis: AXIS_X, angle: 12 * DEG * k }]);
  applyArmSpins(man, "UpperArm_L", [{ axis: AXIS_Z, angle: 9 * DEG * k }]);
  applyArmSpins(man, "LowerArm_L", [{ axis: AXIS_X, angle: 11 * DEG * k }]);
}

export function liveArms(man: THREE.Object3D, _dt: number): void {
  applyAimArms(man, 0);
}
