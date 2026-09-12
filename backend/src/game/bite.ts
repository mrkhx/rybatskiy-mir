import { playerHint } from "./hints";
import { fishInterest } from "./interest";
import { pickWeighted, type Rng } from "./rng";
import type { BiteContext, SpeciesForBite } from "./types";

export type BiteRoll = {
  delayMs: number;
  chance: number;
  species: SpeciesForBite | null;
  factors: Record<string, number>;
  hint: string | null;
  noBite: boolean;
};

export function biteChance(species: SpeciesForBite, ctx: BiteContext): { chance: number; factors: Record<string, number> } {
  const row = fishInterest(species, ctx);
  return { chance: row.score, factors: row.factors };
}

export function rollBite(rng: Rng, species: SpeciesForBite[], ctx: BiteContext): BiteRoll {
  const scored = species.map((s) => {
    const row = fishInterest(s, ctx);
    return { species: s, ...row, weight: row.score };
  });
  const alive = scored.filter((s) => !s.excluded && s.score > 0);
  const hint = playerHint(scored);

  if (alive.length === 0) {
    return {
      delayMs: 9000 + Math.round(rng.next() * 7000),
      chance: 0,
      species: null,
      factors: scored[0]?.factors ?? {},
      hint,
      noBite: true,
    };
  }

  const combined = 1 - alive.reduce((acc, s) => acc * (1 - s.score), 1);
  const delayMs = Math.round(4000 + rng.next() * 16000 * (1.25 - combined));
  if (rng.next() > combined) {
    return { delayMs, chance: combined, species: null, factors: alive[0]!.factors, hint: hint ?? "Сейчас пауза в клёве", noBite: false };
  }

  const picked = pickWeighted(rng, alive);
  return { delayMs, chance: combined, species: picked.species, factors: picked.factors, hint, noBite: false };
}
