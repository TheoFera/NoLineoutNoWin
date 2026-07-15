export type LineoutPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CombinationPlayerSlot = {
  playerId: string | null;
  position: LineoutPosition;
};

export type CombinationTargetRoles = {
  jumperPosition?: LineoutPosition;
  frontLifterPosition?: LineoutPosition;
  rearLifterPosition?: LineoutPosition;
  receiverPosition?: LineoutPosition;
};

export type CombinationTargetOption = {
  id: string;
  targetPosition: LineoutPosition;
  type: "jumpBlock" | "directCatch";
  roles: CombinationTargetRoles;
  naturalWeight: number;
};

export type LineoutCombinationDefinition = {
  id: string;
  occupiedPositions: LineoutPosition[];
  targetOptions: CombinationTargetOption[];
};

export type Combination = {
  id: string;
  nameKey: string;
  customName?: string;
  slots: CombinationPlayerSlot[];
  targetOptions?: CombinationTargetOption[];
  /** @deprecated Kept only until the V2 combination library replaces legacy saves. */
  risk: number;
  /** @deprecated Kept only until the V2 combination library replaces legacy saves. */
  complexity: number;
};

export type OffensiveRepertoire = {
  activeCombinationIds: string[];
  reserveCombinationIds: string[];
};

export function normalizeCombinationTargetOptions(
  options?: readonly CombinationTargetOption[]
): CombinationTargetOption[] {
  const seen = new Set<string>();
  const normalized: CombinationTargetOption[] = [];

  for (const option of options ?? []) {
    const id = option.id.trim();
    if (!id || !isLineoutPosition(option.targetPosition) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push({
      ...option,
      id,
      naturalWeight: Math.max(0, option.naturalWeight),
      roles: {
        jumperPosition: normalizeOptionalPosition(option.roles.jumperPosition),
        frontLifterPosition: normalizeOptionalPosition(option.roles.frontLifterPosition),
        rearLifterPosition: normalizeOptionalPosition(option.roles.rearLifterPosition),
        receiverPosition: normalizeOptionalPosition(option.roles.receiverPosition)
      }
    });
  }

  return normalized;
}

function normalizeOptionalPosition(value?: number): LineoutPosition | undefined {
  return value === undefined || !isLineoutPosition(value) ? undefined : value;
}

export function isLineoutPosition(value: number): value is LineoutPosition {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

export function normalizePosition(value: number): LineoutPosition {
  const rounded = Math.round(value);
  const clamped = Math.min(7, Math.max(1, rounded));
  return clamped as LineoutPosition;
}
