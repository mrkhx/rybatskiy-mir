import type { Rng } from "./rng";
import type { FightProfile, FightSnapshot, FightTick, LoseReason } from "./types";

export type FightConfig = {
  profile: FightProfile;
  lineStrength: number;
  rodPower: number;
  dragQuality: number;
  hookQuality: number;
  skill: number;
  cover: number;
  playerStamina: number;
};

export type FightResult =
  | { outcome: "continue"; snap: FightSnapshot }
  | { outcome: "landed"; snap: FightSnapshot }
  | { outcome: "lost"; reason: LoseReason; snap: FightSnapshot };

export function hookSuccess(
  rng: Rng,
  timingMs: number,
  windowMs: number,
  hookQuality: number,
  skill: number,
): boolean {
  const lateness = Math.abs(timingMs) / Math.max(windowMs, 80);
  const p = clamp(0.92 - lateness * 0.7 + hookQuality * 0.08 + skill * 0.1, 0.08, 0.97);
  return rng.next() < p;
}

export function stepFight(
  rng: Rng,
  snap: FightSnapshot,
  tick: FightTick,
  cfg: FightConfig,
  dt: number,
): FightResult {
  const surge = cfg.profile.pull * (0.35 + rng.next() * 0.9) * (0.6 + snap.fishStamina * 0.7);
  const dirPenalty = Math.abs(tick.rodDir) * cfg.profile.directionChange * 0.15;
  const coverThreat = cfg.cover * cfg.profile.coverSeek * (tick.reel > 0.75 ? 1.4 : 0.6);

  const input = clamp(tick.reel * 0.55 + tick.rodPressure * 0.35 + tick.drag * 0.2, 0, 1.4);
  const tension = clamp(
    snap.tension * 0.55 + surge * 0.5 + input * 0.45 + dirPenalty - cfg.dragQuality * tick.drag * 0.2,
    0,
    1.6,
  );

  const drain = (0.12 + input * 0.22 + cfg.skill * 0.05) * dt * (1 / Math.max(0.4, cfg.profile.stamina));
  const fishStamina = clamp(snap.fishStamina - drain + surge * 0.02, 0, 1);
  const progress = clamp(snap.progress + (input * 0.18 - surge * 0.06) * dt * (1.15 - fishStamina * 0.4), 0, 1);

  let lineIntegrity = snap.lineIntegrity;
  if (tension > cfg.lineStrength) {
    lineIntegrity -= (tension - cfg.lineStrength) * 0.55 * dt;
  }
  if (tick.reel > 0.9 && tension > 0.85) {
    lineIntegrity -= 0.08 * dt;
  }

  const next: FightSnapshot = { tension, fishStamina, lineIntegrity, progress, surge };

  if (lineIntegrity <= 0) {
    return { outcome: "lost", reason: tension > 1.15 ? "over_tension" : "line_broke", snap: next };
  }
  if (coverThreat > 0.85 && rng.next() < coverThreat * 0.04 * dt) {
    return { outcome: "lost", reason: "went_to_cover", snap: next };
  }
  if (tension < 0.08 && fishStamina > 0.55 && rng.next() < 0.08 * dt) {
    return { outcome: "lost", reason: "slack_line", snap: next };
  }
  if (cfg.hookQuality < 0.35 && rng.next() < 0.03 * dt) {
    return { outcome: "lost", reason: "hook_bent", snap: next };
  }
  if (progress >= 1 && fishStamina < 0.35) {
    return { outcome: "landed", snap: next };
  }
  return { outcome: "continue", snap: next };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
