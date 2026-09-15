import { describe, expect, it } from "vitest";
import { Group, Matrix4, Vector3 } from "three";
import { MotionSpace } from "./motionSpace";
import { prepFishWorld, prepFloatWorld, PREP_DURATION } from "./landPrep";
import { landFishWorld, landFloatWorld, LAND_DURATION } from "./land";
import { holdFishWorld, holdFloatWorld } from "./landedHold";
import { keepFishWorld, keepFloatWorld, keepLeaderWorld, KEEP_DURATION } from "./keep";
import { releaseFishWorld, releaseFloatWorld, releaseLeaderWorld, RELEASE_DURATION } from "./release";

const phases = [
  [prepFishWorld, prepFloatWorld, PREP_DURATION],
  [landFishWorld, landFloatWorld, LAND_DURATION],
  [holdFishWorld, holdFloatWorld, 2],
  [keepFishWorld, keepFloatWorld, KEEP_DURATION],
  [releaseFishWorld, releaseFloatWorld, RELEASE_DURATION],
] as const;

describe("approved motion in the fisherman placement frame", () => {
  it("preserves every sampled phase after translation, yaw and scale, without changing input points", () => {
    const frame = new Group();
    frame.position.set(7, 3, -9);
    frame.rotation.y = .71;
    frame.scale.setScalar(.24);
    frame.updateMatrixWorld(true);
    const matrix = new Matrix4().copy(frame.matrixWorld);
    matrix.elements[13] = -.4;
    const motion = new MotionSpace(frame, -.4);
    const start = new Vector3(3, .5, 1);
    const float = new Vector3(3, .8, 1);
    const worldStart = start.clone().applyMatrix4(matrix);
    const worldFloat = float.clone().applyMatrix4(matrix);
    for (const [fishFn, floatFn, duration] of phases) {
      for (const t of [0, duration / 2, duration]) {
        const localFish = fishFn(start, t, new Vector3());
        const worldFish = motion.point(fishFn, worldStart, t, new Vector3());
        expect(worldFish.distanceTo(localFish.clone().applyMatrix4(matrix))).toBeLessThan(1e-10);
        const localFloat = floatFn(float, localFish, t, new Vector3());
        expect(motion.pair(floatFn, worldFloat, worldFish, t, new Vector3())
          .distanceTo(localFloat.applyMatrix4(matrix))).toBeLessThan(1e-10);
      }
    }
    expect(worldStart.distanceTo(start.clone().applyMatrix4(matrix))).toBe(0);
    expect(worldFloat.distanceTo(float.clone().applyMatrix4(matrix))).toBe(0);
  });

  it("preserves jaw attachment and scaled hanging leader after detach", () => {
    const frame = new Group();
    frame.position.set(4, 0, 2);
    frame.rotation.y = -.8;
    frame.scale.setScalar(.24);
    frame.updateMatrixWorld(true);
    const motion = new MotionSpace(frame);
    const fish = new Vector3(1, .4, 1), float = new Vector3(1, .8, 1), detach = fish.clone();
    for (const fn of [keepLeaderWorld, releaseLeaderWorld]) {
      for (const t of [0, 5]) {
        const expected = fn(fish, float, detach, t, new Vector3()).applyMatrix4(frame.matrixWorld);
        const actual = motion.leader(fn, frame.localToWorld(fish.clone()), frame.localToWorld(float.clone()),
          frame.localToWorld(detach.clone()), t, new Vector3());
        expect(actual.distanceTo(expected)).toBeLessThan(1e-10);
      }
    }
  });

  it("moves cached world points with a resized placement and scales bite offsets", () => {
    const frame = new Group();
    frame.position.set(4, 0, 2);
    frame.scale.setScalar(.24);
    frame.updateMatrixWorld(true);
    const motion = new MotionSpace(frame);
    const local = new Vector3(1, .3, 2);
    const cached = frame.localToWorld(local.clone());
    const unarmed = new Vector3();
    motion.rebase([cached, unarmed]);
    frame.position.set(-2, 0, 7);
    frame.rotation.y = .8;
    frame.updateMatrixWorld(true);
    motion.rebase([cached, unarmed]);
    expect(cached.distanceTo(frame.localToWorld(local.clone()))).toBeLessThan(1e-10);
    expect(unarmed.lengthSq()).toBe(0);
    const bite = motion.surface(cached, 0, -.1, 0, new Vector3());
    expect(bite.y).toBeCloseTo(-.024, 10);
    expect(bite.x).toBeCloseTo(cached.x, 10);
    expect(bite.z).toBeCloseTo(cached.z, 10);
  });

  it("leaves the standalone lab samplers unchanged", () => {
    const motion = new MotionSpace();
    const start = new Vector3(3, .5, 1);
    for (const [fn, , duration] of phases) {
      expect(motion.point(fn, start, duration, new Vector3()).toArray())
        .toEqual(fn(start, duration, new Vector3()).toArray());
    }
  });
});
