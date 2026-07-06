export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pickOne<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("pickOne called with an empty array");
  }
  return items[randomInt(0, items.length - 1)];
}
