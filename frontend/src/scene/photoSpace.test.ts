import { describe, expect, it } from "vitest";
import { oldBridgeStandingAnchor } from "./oldBridge3d";
import { photoToStage } from "./photoSpace";

describe("photo cover coordinates", () => {
  for (const [width, height] of [[1920, 1080], [1366, 768], [1280, 720], [420, 900]]) {
    it(`preserves the source standing point at ${width}x${height}`, () => {
      const w = width!; const h = height!;
      const p = photoToStage(oldBridgeStandingAnchor.u, oldBridgeStandingAnchor.v, w, h, 1792, 1008);
      const cover = Math.max(w * 1.04 / 1792, h * 1.04 / 1008);
      const left = -.02 * w + (1.04 * w - 1792 * cover) * .22;
      const top = -.02 * h + (1.04 * h - 1008 * cover) * .62;
      expect((p.x - left) / (1792 * cover)).toBeCloseTo(oldBridgeStandingAnchor.u, 10);
      expect((p.y - top) / (1008 * cover)).toBeCloseTo(oldBridgeStandingAnchor.v, 10);
    });
  }
});
