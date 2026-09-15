import { describe, expect, it } from "vitest";
import { Object3D, Vector3 } from "three";
import { LINE_FLOATS, lineToLocal, sampleLine } from "./fishingLine";

describe("line coordinate spaces", () => {
  it("keeps every world-space sample after a scaled, rotated and translated parent", () => {
    const parent = new Object3D();
    parent.position.set(1, .03, -.45);
    parent.rotation.set(.1, .6, -.1);
    parent.scale.setScalar(.24);
    const tip = new Vector3(.3, 1.3, -.2);
    const float = new Vector3(1.2, .1, .7);
    const world = new Float32Array(LINE_FLOATS);
    sampleLine(tip, float, .4, world);
    const local = world.slice();
    lineToLocal(local, parent);
    for (let i = 0; i < local.length; i += 3) {
      const actual = parent.localToWorld(new Vector3().fromArray(local, i));
      expect(actual.distanceTo(new Vector3().fromArray(world, i))).toBeLessThan(.000001);
    }
  });
});
