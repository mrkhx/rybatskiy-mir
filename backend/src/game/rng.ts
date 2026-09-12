/** Injected RNG so fishing tests are deterministic. */

export type Rng = {
  next(): number;
};

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return {
    next(): number {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export const systemRng: Rng = {
  next: () => Math.random(),
};

export function pickWeighted<T extends { weight: number }>(rng: Rng, items: T[]): T {
  if (items.length === 0) {
    throw new Error("pickWeighted: empty list");
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

export function range(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}
