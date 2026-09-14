/** Catch result payload. DEBUG uses DEBUG_CATCH_RESULT; SERVER maps from the fishing session. */

export type CatchRarity = "Обычная" | "Крупная" | "Трофейная" | "Легендарная";

export type CatchResultData = {
  fishName: string;
  weightKg: number;
  rarity: CatchRarity;
  isRecord: boolean;
};

export type CatchChoice = "KEEP_SELECTED" | "RELEASE_SELECTED";

export const DEBUG_CATCH_RESULT: CatchResultData = {
  fishName: "Щука",
  weightKg: 2.84,
  rarity: "Крупная",
  isRecord: false,
};

export const KEEP_CONFIRM = "Улов оставлен";
export const RELEASE_CONFIRM = "Рыба отпущена";

export function formatCatchWeight(kg: number): string {
  return `${kg.toFixed(2)} кг`;
}
