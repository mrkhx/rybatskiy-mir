/** Catch result payload. UI-only — not a 3D clip. No KEEP / RELEASE / backend. */

export type CatchRarity = "Обычная" | "Крупная" | "Трофейная" | "Легендарная";

export type CatchResultData = {
  fishName: string;
  weightKg: number;
  rarity: CatchRarity;
  isRecord: boolean;
};

export const DEBUG_CATCH_RESULT: CatchResultData = {
  fishName: "Щука",
  weightKg: 2.84,
  rarity: "Крупная",
  isRecord: false,
};

export function formatCatchWeight(kg: number): string {
  return `${kg.toFixed(2)} кг`;
}
