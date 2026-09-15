import { AnimationMixer, Group, Vector3, type AnimationClip, type Object3D, type SkinnedMesh } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

export type FeetAnchor = { left: [number, number, number]; right: [number, number, number]; center: [number, number, number] };

/** Evaluate the existing READY clip on a detached clone, never the live rig. */
export function measureReadyFeet(root: Object3D, clips: AnimationClip[]): FeetAnchor | null {
  const ready = clips.find((clip) => clip.name === "READY");
  if (!ready) return null;
  const model = clone(root);
  const space = new Group();
  const facing = new Group();
  facing.rotation.y = Math.PI; // Rig3DScene's fixed internal facing
  space.add(facing);
  facing.add(model);
  const mixer = new AnimationMixer(model);
  mixer.clipAction(ready).play();
  mixer.update(0);
  space.updateMatrixWorld(true);
  const soles: [Vector3 | null, Vector3 | null] = [null, null];
  model.traverse((obj) => {
    const mesh = obj as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const indices = mesh.geometry.getAttribute("skinIndex");
    const weights = mesh.geometry.getAttribute("skinWeight");
    const vertices = mesh.geometry.getAttribute("position");
    if (!indices || !weights || !vertices) return;
    const sides = mesh.skeleton.bones.map((bone) => {
      let node: Object3D | null = bone;
      while (node) {
        if (node.name === "Foot_L") return 0;
        if (node.name === "Foot_R") return 1;
        node = node.parent;
      }
      return -1;
    });
    const vertex = new Vector3();
    for (let i = 0; i < vertices.count; i++) {
      const influence = [0, 0];
      for (let j = 0; j < 4; j++) {
        const side = sides[indices.getComponent(i, j)];
        if (side === 0 || side === 1) influence[side] = (influence[side] ?? 0) + weights.getComponent(i, j);
      }
      for (const side of [0, 1] as const) {
        if ((influence[side] ?? 0) < .5) continue;
        mesh.getVertexPosition(i, vertex);
        mesh.localToWorld(vertex);
        const lowest = soles[side];
        if (!lowest || vertex.y < lowest.y) soles[side] = vertex.clone();
      }
    }
  });
  mixer.stopAllAction();
  mixer.uncacheRoot(model);
  const [left, right] = soles;
  if (!left || !right) return null;
  return { left: left.toArray(), right: right.toArray(), center: left.clone().add(right).multiplyScalar(.5).toArray() };
}
