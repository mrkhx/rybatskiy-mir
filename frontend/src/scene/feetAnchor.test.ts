// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { importHumanoid } from "../scene3d/assets/retarget";
import { measureReadyFeet } from "./feetAnchor";

// Geometry-only parsing of the actual production GLB. No textures are needed to
// evaluate skinning, and no production asset is modified by this test.
function geometryOnlyGlb() {
  const file = readFileSync(new URL("../../public/models/production/fisherman.glb", import.meta.url));
  const jsonLength = file.readUInt32LE(12);
  const document = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
  delete document.images;
  delete document.textures;
  delete document.materials;
  for (const mesh of document.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  const json = Buffer.from(JSON.stringify(document));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const bin = file.subarray(20 + jsonLength);
  const out = Buffer.alloc(20 + padded.length + bin.length);
  file.copy(out, 0, 0, 12);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(padded.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(out, 20);
  bin.copy(out, 20 + padded.length);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

describe("production feet", () => {
  it("measures both soles from READY without mutating the loaded rig", async () => {
    const gltf = await new GLTFLoader().parseAsync(geometryOnlyGlb(), "");
    importHumanoid(gltf);
    const before = gltf.scene.toJSON();
    const feet = measureReadyFeet(gltf.scene, gltf.animations);
    expect(feet).not.toBeNull();
    expect(feet!.left.every(Number.isFinite)).toBe(true);
    expect(feet!.right.every(Number.isFinite)).toBe(true);
    expect(Math.abs(feet!.left[0] - feet!.right[0])).toBeGreaterThan(.01);
    expect(gltf.scene.toJSON()).toEqual(before);
    console.info("Production READY sole coordinates:", JSON.stringify(feet));
  });
});
