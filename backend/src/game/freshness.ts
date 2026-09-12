export function baitFreshness(harvestedAt: Date | null | undefined, spoilHours: number, now: number, storageMul = 1): number {
  if (!harvestedAt) return 0.75;
  const hours = (now - harvestedAt.getTime()) / 3_600_000;
  const life = Math.max(1, spoilHours * storageMul);
  return clamp(1 - hours / life, 0.18, 1);
}

export function freshnessQuality(freshness: number): string {
  if (freshness >= 0.85) return "fresh";
  if (freshness >= 0.45) return "normal";
  return "stale";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
