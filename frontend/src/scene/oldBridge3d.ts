/**
 * Old Bridge (Старый мостик) — 3D overlay calibration.
 * 2.5D photo stays; this is the world pose of the R3F fisherman.
 *
 * Camera is shifted +X so the fisherman (origin) sits on the painted pier
 * at screen-left, and the float (world +X after internal π yaw) sits on
 * open water to the right.
 */
import { FLOAT_X, WATER_Y } from "../rig3d/approvedTackle";

export const OLD_BRIDGE_SPOT_ID = "old-bridge";

/** Extra yaw on top of Rig3DScene's internal π. Small +Y turn faces open water. */
export const OLD_BRIDGE_SPOT_FACING_YAW = 0.06;

/** Slight lift + toward camera so feet sit on the near pier boards. */
export const OLD_BRIDGE_POSITION: [number, number, number] = [0, 0.03, -0.45];

export const OLD_BRIDGE_SCALE = 0.24;

export const OLD_BRIDGE_CAMERA = {
  position: [1.66, 1.4, -6.35] as [number, number, number],
  lookAt: [1.66, 0.8, 0] as [number, number, number],
  fov: 32,
  near: 0.12,
  far: 40,
};

/** 3D waterline. Float rest Y. Maps onto the 2.5D water plane (~46% from top). */
export const OLD_BRIDGE_WATERLINE_Y = WATER_Y;

/**
 * World-space float rest after Rig3DScene's +π yaw, before extra spot yaw.
 * Local FLOAT_X = −4.15 → world +X.
 */
export const OLD_BRIDGE_CAST_TARGET: [number, number, number] = [-FLOAT_X, WATER_Y, 0];

export const OLD_BRIDGE_3D = {
  spotId: OLD_BRIDGE_SPOT_ID,
  spotFacingYaw: OLD_BRIDGE_SPOT_FACING_YAW,
  position: OLD_BRIDGE_POSITION,
  scale: OLD_BRIDGE_SCALE,
  camera: OLD_BRIDGE_CAMERA,
  waterlineWorldY: OLD_BRIDGE_WATERLINE_Y,
  castTargetWorld: OLD_BRIDGE_CAST_TARGET,
} as const;