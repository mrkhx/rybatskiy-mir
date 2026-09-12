export type MixStats = {
  id: string;
  targetSpecies: string[];
  nutritionalValue: number;
  attraction: number;
  particle: number;
};

export type FeedingState = {
  mixItemId: string;
  intensity: number;
  nutritionalValue: number;
  attraction: number;
  saturation: number;
  createdAt: number;
  peakAt: number;
  expiresAt: number;
  current: number;
};

export const MIXES: Record<string, MixStats> = {
  groundbait: {
    id: "groundbait",
    targetSpecies: ["crucian", "roach", "bream", "rudd", "tench", "ide"],
    nutritionalValue: 0.55,
    attraction: 0.7,
    particle: 0.5,
  },
  "groundbait-bream": {
    id: "groundbait-bream",
    targetSpecies: ["bream", "roach", "ruffe", "ide"],
    nutritionalValue: 0.72,
    attraction: 0.88,
    particle: 0.35,
  },
  "groundbait-carp": {
    id: "groundbait-carp",
    targetSpecies: ["carp", "crucian", "tench"],
    nutritionalValue: 0.92,
    attraction: 0.8,
    particle: 0.42,
  },
};

export function mixFor(itemId: string, stats?: Partial<MixStats>): MixStats {
  if (MIXES[itemId]) return MIXES[itemId]!;
  return {
    id: itemId,
    targetSpecies: stats?.targetSpecies ?? [],
    nutritionalValue: stats?.nutritionalValue ?? 0.5,
    attraction: stats?.attraction ?? 0.5,
    particle: stats?.particle ?? 0.5,
  };
}

export function applyFeed(prev: FeedingState | null, mix: MixStats, amount: number, current: number, now: number): FeedingState {
  const qty = clamp(amount, 0.2, 4);
  const duration = 40 + mix.particle * 25;
  const peakIn = 8 + (1 - mix.particle) * 10;
  const addedSat = mix.nutritionalValue * qty * 0.22;
  const addedAttr = mix.attraction * qty * (current > 0.15 ? 0.7 : 1);
  if (!prev || now > prev.expiresAt) {
    return {
      mixItemId: mix.id,
      intensity: qty,
      nutritionalValue: mix.nutritionalValue,
      attraction: clamp(addedAttr, 0, 1.6),
      saturation: clamp(addedSat, 0, 1.4),
      createdAt: now,
      peakAt: now + peakIn * 60_000,
      expiresAt: now + duration * 60_000,
      current,
    };
  }
  return {
    ...prev,
    mixItemId: mix.id,
    intensity: prev.intensity + qty,
    attraction: clamp(prev.attraction * 0.85 + addedAttr, 0, 1.8),
    saturation: clamp(prev.saturation + addedSat, 0, 1.6),
    peakAt: Math.min(prev.peakAt, now + peakIn * 60_000),
    expiresAt: Math.max(prev.expiresAt, now + duration * 60_000),
    current,
  };
}

export function sampleFeeding(
  state: FeedingState,
  now: number,
  speciesId: string,
  mixTargets: string[],
): {
  attraction: number;
  saturation: number;
  fit: number;
} {
  if (now >= state.expiresAt) return { attraction: 0, saturation: state.saturation * 0.3, fit: 0 };
  const life = (now - state.createdAt) / Math.max(1, state.expiresAt - state.createdAt);
  const peak = (now - state.createdAt) / Math.max(1, state.peakAt - state.createdAt);
  const envelope = peak < 1 ? 0.35 + peak * 0.65 : Math.max(0, 1 - (life - 0.35) * 1.4);
  const spread = 1 / (1 + state.current * 3);
  const fit = mixTargets.includes(speciesId) ? 1 : mixTargets.length ? 0.25 : 0.4;
  return {
    attraction: state.attraction * envelope * spread,
    saturation: state.saturation * (0.7 + envelope * 0.3),
    fit,
  };
}

export function overfeedPenalty(saturation: number): number {
  if (saturation < 0.55) return 1;
  if (saturation < 0.85) return 0.68;
  return 0.3;
}

export function feedingLabel(saturation: number, attraction: number, now: number, expiresAt: number, peakAt: number): string {
  if (saturation >= 0.8) return "перекорм";
  if (now < peakAt) return "пятно набирает силу";
  if (attraction < 0.2 || now > expiresAt - 8 * 60_000) return "пятно слабеет";
  return "пятно работает";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
