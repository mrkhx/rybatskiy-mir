/**
 * FLOAT LANDING — after approved CAST follow-through.
 * Does not rewrite CAST. Continues the live float pos/vel from the last CAST frame.
 *
 * Fisherman stays in CAST follow-through. WAIT is not this clip.
 */
import { WATER_Y } from "./approvedTackle";

export const FLOAT_LANDING_CLIP = "FLOAT_LANDING" as const;

/** Same gravity as CAST fly so the arc does not kink at the handoff. */
export const LANDING_GRAVITY = 13.5;

/** FloatBottom is this far below the group origin / FloatWaterline. */
export const KEEL_BELOW = 0.075;

/** Tiny first dip after keel contact — light float, not a feeder. */
export const LANDING_DIP = 0.028;

export const LANDING_SETTLE = 0.58;
export const LANDING_FLY_TENSION = 0.4;
export const LANDING_REST_TENSION = 0.08;
export const SPLASH_LIFE = 0.5;

export const WATERLINE_Y = WATER_Y;

export function isFloatLanding(clip: string): boolean {
  return clip === FLOAT_LANDING_CLIP;
}

export function holdsCastPose(clip: string): boolean {
  return clip.startsWith("CAST") || clip === FLOAT_LANDING_CLIP;
}

export type LandingSim = {
  tension: number;
  splashStamp: number;
  splashX: number;
  splashZ: number;
};

export function makeLandingSim(): LandingSim {
  return { tension: LANDING_FLY_TENSION, splashStamp: 0, splashX: 0, splashZ: 0 };
}
