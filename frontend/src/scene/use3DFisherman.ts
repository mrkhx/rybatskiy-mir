/** Feature flag for the Forest Lake 3D fisherman overlay. Default ON. */

const STORAGE_KEY = "rm-3d-fisherman";
const SPOT_OLD_BRIDGE = "old-bridge";

export function is3DFishermanEnabled(): boolean {
  try {
    const env = (import.meta.env as { VITE_ENABLE_3D_FISHERMAN?: string }).VITE_ENABLE_3D_FISHERMAN;
    if (env === "0" || env === "false") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
    const q = new URLSearchParams(window.location.search);
    if (q.get("2d") === "1" || q.get("3d") === "0") return false;
    if (q.get("3d") === "1") return true;
  } catch {
    /* private mode / SSR */
  }
  return true;
}

export function isOldBridgeSpot(spotId: string | null | undefined): boolean {
  return !spotId || spotId === SPOT_OLD_BRIDGE;
}

export function shouldShow3DFisherman(spotId: string | null | undefined): boolean {
  return is3DFishermanEnabled() && isOldBridgeSpot(spotId);
}
