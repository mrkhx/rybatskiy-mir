export type Quality = "LOW" | "MEDIUM" | "HIGH";

export function sceneQuality(): Quality {
  try {
    const saved = localStorage.getItem("rm-quality");
    if (saved === "LOW" || saved === "MEDIUM" || saved === "HIGH") return saved;
  } catch {
    /* private mode */
  }
  if (typeof window === "undefined") return "MEDIUM";
  const mq = window.matchMedia?.("(pointer: coarse)");
  const coarse = Boolean(mq?.matches);
  const small = window.innerWidth < 480;
  if (coarse && small) return "LOW";
  if (coarse || window.innerWidth < 900) return "MEDIUM";
  return "HIGH";
}
