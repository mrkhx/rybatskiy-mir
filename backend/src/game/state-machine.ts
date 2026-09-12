import type { FishingState } from "./types";

const TRANSITIONS: Record<FishingState, FishingState[]> = {
  IDLE: ["READY"],
  READY: ["CAST", "IDLE"],
  CAST: ["WAITING_BITE", "READY"],
  WAITING_BITE: ["BITE", "READY", "LOST"],
  BITE: ["HOOKED", "LOST", "READY"],
  HOOKED: ["FIGHTING", "LOST", "BROKEN"],
  FIGHTING: ["FIGHTING", "LANDED", "LOST", "BROKEN"],
  LANDED: ["READY", "IDLE"],
  LOST: ["READY", "IDLE"],
  BROKEN: ["READY", "IDLE"],
};

export function canTransition(from: FishingState, to: FishingState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: FishingState, to: FishingState): void {
  if (!canTransition(from, to)) {
    throw Object.assign(new Error(`Illegal fishing transition ${from} → ${to}`), {
      code: "ILLEGAL_STATE",
    });
  }
}

export function isTerminal(state: FishingState): boolean {
  return state === "LANDED" || state === "LOST" || state === "BROKEN";
}

export function isActiveFight(state: FishingState): boolean {
  return state === "HOOKED" || state === "FIGHTING";
}
