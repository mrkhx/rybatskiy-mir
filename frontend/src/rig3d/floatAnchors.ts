import { Matrix4, Object3D, Vector3 } from "three";

/** Named production anchors, expressed in the float group's local space. */
export function readFloatAnchors(model: Object3D) {
  model.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(model.matrixWorld).invert();
  const point = (name: string) => {
    const node = model.getObjectByName(name);
    if (!node) return null;
    return node.getWorldPosition(new Vector3()).applyMatrix4(inverse).applyMatrix4(model.matrix);
  };
  return { waterline: point("FloatWaterline"), bottom: point("FloatBottom") };
}

/** Offset includes actual float tilt, model scale and embedding transforms. */
export function anchorWorldY(group: Object3D, anchor: Vector3) {
  group.updateWorldMatrix(true, false);
  const e = group.matrixWorld.elements;
  return e[1]! * anchor.x + e[5]! * anchor.y + e[9]! * anchor.z;
}
