// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Group, Object3D, Vector3 } from "three";
import { FLOAT_SCALE } from "./approvedTackle";
import { anchorWorldY, readFloatAnchors } from "./floatAnchors";

/** Read the real GLB node hierarchy; geometry/textures aren't needed for named anchors. */
function productionFloatNodes() {
  const bytes = readFileSync(new URL("../../public/models/production/float.glb", import.meta.url));
  const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const nodes: Object3D[] = data.nodes.map((node: { name?: string; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] }) => {
    const obj = new Object3D();
    obj.name = node.name ?? "";
    if (node.translation) obj.position.fromArray(node.translation);
    if (node.rotation) obj.quaternion.fromArray(node.rotation);
    if (node.scale) obj.scale.fromArray(node.scale);
    if (node.matrix) { obj.matrix.fromArray(node.matrix); obj.matrix.decompose(obj.position, obj.quaternion, obj.scale); }
    return obj;
  });
  data.nodes.forEach((node: { children?: number[] }, index: number) => {
    for (const child of node.children ?? []) nodes[index]!.add(nodes[child]!);
  });
  const model = new Group();
  for (const index of data.scenes[data.scene ?? 0].nodes) model.add(nodes[index]!);
  model.scale.setScalar(FLOAT_SCALE);
  return model;
}

describe("production float anchors", () => {
  it("measures real GLB anchors and keeps water contact under translation, scale and tilt", () => {
    const model = productionFloatNodes();
    const anchors = readFloatAnchors(model);
    expect(anchors.waterline).not.toBeNull();
    expect(anchors.bottom).not.toBeNull();
    expect(anchors.bottom!.y).toBeCloseTo(-.056 * FLOAT_SCALE, 8);
    const group = new Group();
    group.add(model);
    const placement = new Group();
    placement.position.set(5, 2, -3);
    placement.rotation.y = .7;
    placement.scale.setScalar(.24);
    placement.add(group);
    group.rotation.set(.12, 0, -.08);
    group.position.set(1, 3, 2);
    placement.updateMatrixWorld(true);
    for (const [name, anchor] of [["FloatWaterline", anchors.waterline!], ["FloatBottom", anchors.bottom!]] as const) {
      const origin = group.getWorldPosition(new Vector3());
      const actual = model.getObjectByName(name)!.getWorldPosition(new Vector3());
      expect(origin.y + anchorWorldY(group, anchor)).toBeCloseTo(actual.y, 10);
    }
    // Re-reading after attachment must not bake the embedding transform into model-local anchors.
    expect(readFloatAnchors(model).bottom!.distanceTo(anchors.bottom!)).toBeLessThan(1e-10);
  });

  it("reports missing anchors explicitly", () => {
    expect(readFloatAnchors(new Group())).toEqual({ waterline: null, bottom: null });
  });
});
