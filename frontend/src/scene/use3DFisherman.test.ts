import { afterEach, expect, it, vi } from "vitest";
import { shouldShow3DFisherman } from "./use3DFisherman";

afterEach(() => {
  localStorage.removeItem("rm-3d-fisherman");
  window.history.replaceState({}, "", "/");
  vi.unstubAllEnvs();
});
it("preserves URL, storage and env switches and scopes 3D to Old Bridge", () => {
  expect(shouldShow3DFisherman("old-bridge")).toBe(true);
  for (const spot of ["deep-hole", "reed-bank", "snags", "sand-spit"]) expect(shouldShow3DFisherman(spot)).toBe(false);
  for (const query of ["?2d=1", "?3d=0"]) {
    window.history.replaceState({}, "", query);
    expect(shouldShow3DFisherman("old-bridge")).toBe(false);
  }
  window.history.replaceState({}, "", "/");
  localStorage.setItem("rm-3d-fisherman", "0");
  expect(shouldShow3DFisherman("old-bridge")).toBe(false);
  localStorage.removeItem("rm-3d-fisherman");
  vi.stubEnv("VITE_ENABLE_3D_FISHERMAN", "0");
  expect(shouldShow3DFisherman("old-bridge")).toBe(false);
});
