import * as THREE from "three";

/** Skinned blank: 8 bones. Tension 0..1 bends the tip toward -Y in rod local space. */
export function applyRodBend(rod: THREE.Object3D, tension: number) {
  const t = Math.max(0, Math.min(1, tension));
  const max = 0.22 * t;
  for (let i = 0; i < 8; i++) {
    const bone = rod.getObjectByName(`Blank_${i}`);
    if (!bone) continue;
    const along = (i + 1) / 8;
    bone.rotation.z = -max * along * along * 2.4;
    bone.rotation.y = 0;
    bone.rotation.x = 0;
  }
}

export function spinReel(rod: THREE.Object3D, dt: number, active: boolean) {
  const handle = rod.getObjectByName("ReelHandle");
  const rotor = rod.getObjectByName("ReelRotor");
  const speed = active ? 9.5 : 0;
  if (handle) handle.rotation.z -= speed * dt;
  if (rotor) rotor.rotation.z += speed * 0.85 * dt;
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
