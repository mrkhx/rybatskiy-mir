import * as THREE from "three";
import type { CharClip } from "./types";

/** Skinned blank. Tension bends the tip toward the reel/guide underside. */
export function applyRodBend(rod: THREE.Object3D, tension: number) {
  const t = Math.max(0, Math.min(1, tension));
  const max = 0.22 * t;
  for (let i = 0; i < 12; i++) {
    const bone = rod.getObjectByName(`Blank_${i}`);
    if (!bone) continue;
    const along = (i + 1) / 10;
    bone.rotation.x = max * along * along * 2.2;
    bone.rotation.y = 0;
    bone.rotation.z = 0;
  }
}

export function seatReelHandle(rod: THREE.Object3D) {
  if (rod.userData.reelSeated) return;
  const handle = rod.getObjectByName("ReelHandle");
  const mesh = rod.getObjectByName("ReelHandleMesh");
  const target = rod.getObjectByName("ReelHandleTarget");
  if (!handle) return;
  if (mesh && mesh.parent !== handle) handle.attach(mesh);
  if (target) {
    if (target.parent !== handle) handle.attach(target);
    if (mesh) target.position.copy(mesh.position);
  }
  rod.userData.reelSeated = true;
}

export function spinReel(rod: THREE.Object3D, dt: number, active: boolean | number) {
  seatReelHandle(rod);
  const speed = typeof active === "number" ? active : active ? 8.4 : 0;
  const handle = rod.getObjectByName("ReelHandle");
  const rotor = rod.getObjectByName("ReelRotor");
  if (handle) handle.rotation.z -= speed * dt;
  if (rotor && Math.abs(speed) > 1e-4) rotor.rotation.z += speed * 0.85 * dt;
}

export const _tip = new THREE.Vector3();
export const _line = new THREE.Vector3();
export const _support = new THREE.Vector3();
export const _reel = new THREE.Vector3();

export function worldOf(root: THREE.Object3D, name: string, out: THREE.Vector3): THREE.Vector3 | null {
  const o = root.getObjectByName(name);
  if (!o) return null;
  o.updateWorldMatrix(true, false);
  return out.setFromMatrixPosition(o.matrixWorld);
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _cur = new THREE.Vector3();
const _qAim = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _rodWorldQ = new THREE.Quaternion();
const _worldQ = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _up = new THREE.Vector3(0, 1, 0);
const _reelOff = new THREE.Vector3();
const _from = new THREE.Vector3();
const _qRoll = new THREE.Quaternion();

const FISHING_AIM: Set<CharClip> = new Set([
  "READY",
  "AIM",
  "CAST_BACKSWING",
  "CAST_FORWARD",
  "CAST_FOLLOW",
  "WAIT",
  "BITE_REACTION",
  "HOOKSET",
  "REEL",
  "FIGHT_LIGHT",
  "FIGHT_HEAVY",
  "LAND",
]);

/**
 * Keep RodGrip in the right hand (parent) and rotate the rod so the blank
 * follows the two-hand line (fishing) or hangs from the forearm (idle/walk).
 */
export function aimRod(man: THREE.Object3D, rod: THREE.Object3D, clip: CharClip) {
  const parent = rod.parent;
  const grip = rod.getObjectByName("RodGrip");
  const tip = rod.getObjectByName("RodTip");
  const handR = man.getObjectByName("Hand_R");
  const handL = man.getObjectByName("Hand_L");
  if (!parent || !grip || !tip || !handR) return;

  man.updateWorldMatrix(true, false);
  _worldQ.setFromRotationMatrix(man.matrixWorld);

  if (clip === "READY") {
    // Do not aim down the camera axis: a metric rod through the lens
    // reads as a tree trunk. Send it right and slightly up so 0°/90°
    // see handle, reel and blank as a silhouette.
    man.getWorldDirection(_fwd);
    _from.crossVectors(_up, _fwd).normalize();
    _dir.copy(_fwd).multiplyScalar(0.2);
    _dir.addScaledVector(_from, 0.9);
    _dir.addScaledVector(_up, 0.28);
    _dir.normalize();
  } else if (FISHING_AIM.has(clip) && handL) {
    handR.getWorldPosition(_a);
    handL.getWorldPosition(_b);
    _dir.subVectors(_b, _a);
    if (_dir.lengthSq() < 4e-4) {
      _dir.set(0, 0.2, 1).applyQuaternion(_worldQ);
    } else {
      _dir.normalize();
      _fwd.set(0, 0.18, 1).applyQuaternion(_worldQ);
      const blend = clip.startsWith("CAST") || clip === "HOOKSET" ? 0.25 : 0.7;
      _dir.addScaledVector(_fwd, blend).normalize();
    }
  } else {
    _dir.set(0.52, -0.74, -0.28).applyQuaternion(_worldQ).normalize();
  }

  grip.updateWorldMatrix(true, false);
  tip.updateWorldMatrix(true, false);
  _a.setFromMatrixPosition(grip.matrixWorld);
  _b.setFromMatrixPosition(tip.matrixWorld);
  _cur.subVectors(_b, _a);
  if (_cur.lengthSq() < 1e-8) return;
  _cur.normalize();
  _qAim.setFromUnitVectors(_cur, _dir);

  parent.updateWorldMatrix(true, false);
  _parentQ.setFromRotationMatrix(parent.matrixWorld);
  _rodWorldQ.copy(_parentQ).multiply(rod.quaternion);
  _rodWorldQ.premultiply(_qAim);
  rod.quaternion.copy(_parentQ.invert().multiply(_rodWorldQ));
  rod.updateMatrixWorld(true);

  const reel = rod.getObjectByName("Reel");
  if (!reel) return;
  reel.updateWorldMatrix(true, false);
  grip.updateWorldMatrix(true, false);
  _a.setFromMatrixPosition(grip.matrixWorld);
  _reelOff.setFromMatrixPosition(reel.matrixWorld).sub(_a);
  _reelOff.projectOnPlane(_dir);
  if (_reelOff.lengthSq() < 1e-8) return;
  _reelOff.normalize();
  _from.copy(_down).projectOnPlane(_dir);
  if (_from.lengthSq() < 1e-8) return;
  _from.normalize();
  _qRoll.setFromUnitVectors(_reelOff, _from);
  _parentQ.setFromRotationMatrix(parent.matrixWorld);
  _rodWorldQ.copy(_parentQ).multiply(rod.quaternion);
  _rodWorldQ.premultiply(_qRoll);
  rod.quaternion.copy(_parentQ.invert().multiply(_rodWorldQ));
}
