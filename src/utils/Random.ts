export type RandomSource = {
  next: () => number;
};

export const MATH_RANDOM_SOURCE: RandomSource = {
  next: () => Math.random()
};

export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }
  };
}

function nextUnit(source: RandomSource): number {
  const value = source.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("RandomSource.next() must return a value in [0, 1)");
  }
  return value;
}

export function randomInt(min: number, max: number, source: RandomSource = MATH_RANDOM_SOURCE): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError("randomInt requires integer bounds with max >= min");
  }
  return Math.floor(nextUnit(source) * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, source: RandomSource = MATH_RANDOM_SOURCE): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
    throw new RangeError("randomFloat requires finite bounds with max >= min");
  }
  return nextUnit(source) * (max - min) + min;
}

export function pickOne<T>(items: readonly T[], source: RandomSource = MATH_RANDOM_SOURCE): T {
  if (items.length === 0) {
    throw new Error("pickOne called with an empty array");
  }
  return items[randomInt(0, items.length - 1, source)];
}
