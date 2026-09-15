/** Old Bridge hybrid overlay. Photo anchors are provisional until live acceptance. */
export const OLD_BRIDGE_SPOT_ID = "old-bridge";

/** Extra yaw on top of Rig3DScene's internal π. Small +Y turn faces open water. */
export const OLD_BRIDGE_SPOT_FACING_YAW = 0.06;

export const OLD_BRIDGE_SCALE = 0.24;

export const OLD_BRIDGE_CAMERA = {
  position: [1.66, 1.4, -6.35] as [number, number, number],
  lookAt: [1.66, 0.8, 0] as [number, number, number],
  fov: 32,
  near: 0.12,
  far: 40,
};

/** World water reference plane; projected photo UV determines the target X/Z. */
export const OLD_BRIDGE_WATERLINE_Y = 0;

export const OLD_BRIDGE_3D = {
  spotId: OLD_BRIDGE_SPOT_ID,
  spotFacingYaw: OLD_BRIDGE_SPOT_FACING_YAW,
  scale: OLD_BRIDGE_SCALE,
  camera: OLD_BRIDGE_CAMERA,
  waterlineWorldY: OLD_BRIDGE_WATERLINE_Y,
} as const;
/** Native stage.webp coordinates; initial target requires visual acceptance. */
export const oldBridgeStandingAnchor = { u: .34, v: .555 } as const;
export const OLD_BRIDGE_PHOTO = { width: 1792, height: 1008, objectX: .22, objectY: .62, overscan: 1.04 } as const;

export const oldBridgeCastAnchor = { u: .55, v: .65 } as const;
