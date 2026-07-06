export type LineoutPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CombinationPlayerSlot = {
  playerId: string | null;
  position: LineoutPosition;
};

export type Combination = {
  id: string;
  nameKey: string;
  customName?: string;
  slots: CombinationPlayerSlot[];
  risk: number;
  complexity: number;
};

export function normalizePosition(value: number): LineoutPosition {
  const rounded = Math.round(value);
  const clamped = Math.min(7, Math.max(1, rounded));
  return clamped as LineoutPosition;
}
