import { describe, expect, it } from 'vitest';
import { Bone, Group, Vector3 } from 'three';
import { twoBoneIK } from './ik';

describe('retrieve wrist in transformed scene', () => {
  for (const scale of [0.24, 0.6, 1]) {
    it(`follows a moving handle at scale ${scale}`, () => {
      const root = new Group();
      root.scale.setScalar(scale);
      root.rotation.y = 1.8;
      root.position.set(2, 0, -3);
      const upper = new Bone(); upper.name = 'UpperArm_L';
      const lower = new Bone(); lower.name = 'LowerArm_L'; lower.position.y = 0.4;
      const hand = new Bone(); hand.name = 'Hand_L'; hand.position.y = 0.35;
      root.add(upper); upper.add(lower); lower.add(hand);
      for (let frame = 0; frame < 24; frame++) {
        const angle = frame * Math.PI / 12;
        const target = root.localToWorld(new Vector3(0.3 + Math.cos(angle) * 0.04, 0.45, Math.sin(angle) * 0.04));
        twoBoneIK(root, ['UpperArm_L', 'LowerArm_L', 'Hand_L'], target, 32);
        expect(hand.getWorldPosition(new Vector3()).distanceTo(target)).toBeLessThan(0.002 * scale);
      }
    });
  }
});
