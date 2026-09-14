/**
 * Maps existing backend fishing FSM → approved 3D visual clips.
 * Server remains source of truth. PRE-CAST / FLOAT LANDING / LAND PREP /
 * LANDED HOLD / RETURN TO READY are client-only visual sub-phases.
 *
 * Do not put this mapping in Rig3DScene.
 */
import type { Session } from "../api/client";
import type { CatchChoice, CatchRarity, CatchResultData } from "./catchResult";
import type { CharClip } from "./types";

export type LabMode = "DEBUG" | "SERVER";

export type ServerFishingState =
  | "IDLE"
  | "READY"
  | "CAST"
  | "WAITING_BITE"
  | "BITE"
  | "HOOKED"
  | "FIGHTING"
  | "LANDED"
  | "LOST"
  | "BROKEN";

export type ServerEventName =
  | "—"
  | "SESSION_READY"
  | "CAST_CONFIRMED"
  | "BITE"
  | "HOOK_OK"
  | "HOOK_FAIL"
  | "FIGHT_TICK"
  | "LANDED"
  | "LOST"
  | "BROKEN"
  | "KEEP_OK"
  | "RELEASE_OK";

export type PendingAction = "none" | "auth" | "start" | "cast" | "hook" | "decide";

/** Server state → visual family. Sub-phases stay on the client. */
export const SERVER_TO_VISUAL: Record<ServerFishingState, string> = {
  IDLE: "READY",
  READY: "READY",
  CAST: "PRE-CAST → CAST → FLOAT LANDING",
  WAITING_BITE: "WAIT",
  BITE: "BITE",
  HOOKED: "HOOKSET",
  FIGHTING: "FIGHT_LIGHT / REEL",
  LANDED: "LAND PREP → LAND → HOLD → CATCH RESULT",
  LOST: "RETURN TO READY",
  BROKEN: "RETURN TO READY",
};

const TIER_RARITY: Record<string, CatchRarity> = {
  COMMON: "Обычная",
  LARGE: "Крупная",
  TROPHY: "Трофейная",
  RECORD: "Трофейная",
  LEGENDARY: "Легендарная",
};

export function eventFromSession(prev: Session | null, next: Session): ServerEventName {
  if (next.state === "WAITING_BITE" && prev?.state !== "WAITING_BITE") return "CAST_CONFIRMED";
  if (next.state === "BITE" && prev?.state !== "BITE") return "BITE";
  if (next.state === "HOOKED") return "HOOK_OK";
  if (next.state === "FIGHTING") return "FIGHT_TICK";
  if (next.state === "LANDED") return "LANDED";
  if (next.state === "LOST") return prev?.state === "BITE" ? "HOOK_FAIL" : "LOST";
  if (next.state === "BROKEN") return "BROKEN";
  if (next.state === "READY") return "SESSION_READY";
  return "—";
}

export function catchResultFromSession(
  session: Session | null,
  speciesNames: Record<string, string>,
): CatchResultData | null {
  if (!session?.speciesId || session.weightG == null || !session.tier) return null;
  return {
    fishName: speciesNames[session.speciesId] ?? session.speciesId,
    weightKg: session.weightG / 1000,
    rarity: TIER_RARITY[session.tier] ?? "Обычная",
    isRecord: session.tier === "RECORD" || session.tier === "LEGENDARY",
  };
}

export function bootstrapVisual(state: string | undefined): {
  clip: CharClip;
  result: boolean;
} {
  switch (state) {
    case "WAITING_BITE":
    case "CAST":
      return { clip: "WAIT", result: false };
    case "BITE":
      return { clip: "BITE_REACTION", result: false };
    case "HOOKED":
      return { clip: "HOOKSET", result: false };
    case "FIGHTING":
      return { clip: "FIGHT_LIGHT", result: false };
    case "LANDED":
      return { clip: "LANDED_HOLD", result: true };
    default:
      return { clip: "READY", result: false };
  }
}

export function canServerCast(
  server: string | undefined,
  visual: CharClip,
  pending: PendingAction,
): boolean {
  return pending === "none" && server === "READY" && (visual === "READY" || visual === "AIM");
}

export function canServerHook(
  server: string | undefined,
  visual: CharClip,
  pending: PendingAction,
): boolean {
  return pending === "none" && server === "BITE" && visual === "BITE_REACTION";
}

export function canServerReel(
  server: string | undefined,
  visual: CharClip,
): boolean {
  return server === "FIGHTING" && (visual === "FIGHT_LIGHT" || visual === "REEL");
}

export function canServerDecide(
  server: string | undefined,
  resultOpen: boolean,
  choice: CatchChoice | null,
  pending: PendingAction,
): boolean {
  return pending === "none" && server === "LANDED" && resultOpen && choice === null;
}

export function labelVisual(
  charClip: CharClip,
  resultOpen: boolean,
  catchChoice: CatchChoice | null,
  keepComplete: boolean,
  releaseComplete: boolean,
): string {
  if (charClip === "RELEASE") return releaseComplete ? "RELEASE COMPLETE" : "RELEASE";
  if (charClip === "KEEP") return keepComplete ? "KEEP COMPLETE" : "KEEP";
  if (charClip === "RETURN_TO_READY") return "RETURN TO READY";
  if (resultOpen) {
    if (catchChoice === "KEEP_SELECTED") return "KEEP SELECTED";
    if (catchChoice === "RELEASE_SELECTED") return "RELEASE SELECTED";
    return "CATCH RESULT";
  }
  if (charClip === "AIM") return "PRE-CAST";
  if (charClip.startsWith("CAST")) return "CAST";
  return charClip.replaceAll("_", " ");
}

export const SERVER_DOCK_ACTIONS = new Set<string>(["CAST", "HOOKSET", "REEL", "KEEP", "RELEASE", "READY"]);
