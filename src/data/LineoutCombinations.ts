import type {
  CombinationTargetOption,
  LineoutCombinationDefinition,
  LineoutPosition
} from "../models/Combination.ts";
import {
  isDirectCatchTargetAvailable,
  validateLineoutCombinationLibrary
} from "../rules/LineoutCombinationValidation.ts";

export const LINEOUT_COMBINATION_ID_ALIASES = {
  shift_4: "six_long",
  five_split: "middle_block",
  long_back: "seven_triple"
} as const;

export function toCanonicalLineoutCombinationId(id: string): string {
  return LINEOUT_COMBINATION_ID_ALIASES[
    id as keyof typeof LINEOUT_COMBINATION_ID_ALIASES
  ] ?? id;
}

const EXISTING_DEFINITIONS: LineoutCombinationDefinition[] = [
  {
    id: "safe_front",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "safe-front-block", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 70 }
    ]
  },
  {
    id: "middle_block",
    occupiedPositions: [1, 2, 3, 4, 5],
    targetOptions: [
      { id: "middle-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 45 },
      { id: "middle-back", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, defaultNaturalWeight: 55 }
    ]
  },
  {
    id: "shift_5",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "shift-five-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 25 },
      { id: "shift-five-back", targetPosition: 5, type: "jumpBlock", roles: { frontLifterPosition: 4, jumperPosition: 5, rearLifterPosition: 6 }, defaultNaturalWeight: 60 }
    ]
  },
  {
    id: "quick_four",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "quick-four-direct", targetPosition: 1, type: "directCatch", roles: { directCatcherPosition: 1 }, defaultNaturalWeight: 55 },
      { id: "quick-four-back", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, defaultNaturalWeight: 45 }
    ]
  },
  {
    id: "four_double",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "four-double-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 50 },
      { id: "four-double-back", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, defaultNaturalWeight: 50 }
    ]
  },
  {
    id: "six_middle",
    occupiedPositions: [1, 2, 3, 4, 5, 6],
    targetOptions: [
      { id: "six-middle-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 30 },
      { id: "six-middle-center", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, defaultNaturalWeight: 50 }
    ]
  },
  {
    id: "six_long",
    occupiedPositions: [1, 2, 3, 4, 5, 6],
    targetOptions: [
      { id: "six-long-middle", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, defaultNaturalWeight: 35 },
      { id: "six-long-back", targetPosition: 5, type: "jumpBlock", roles: { frontLifterPosition: 4, jumperPosition: 5, rearLifterPosition: 6 }, defaultNaturalWeight: 65 }
    ]
  },
  {
    id: "seven_double",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "seven-double-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 40 },
      { id: "seven-double-back", targetPosition: 6, type: "jumpBlock", roles: { frontLifterPosition: 5, jumperPosition: 6, rearLifterPosition: 7 }, defaultNaturalWeight: 60 }
    ]
  },
  {
    id: "seven_triple",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "seven-triple-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, defaultNaturalWeight: 30 },
      { id: "seven-triple-middle", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, defaultNaturalWeight: 40 },
      { id: "seven-triple-back", targetPosition: 6, type: "jumpBlock", roles: { frontLifterPosition: 5, jumperPosition: 6, rearLifterPosition: 7 }, defaultNaturalWeight: 30 }
    ]
  }
];

const ALL_POSITIONS: LineoutPosition[] = [1, 2, 3, 4, 5, 6, 7];

export const GENERATED_LINEOUT_COMBINATIONS: LineoutCombinationDefinition[] =
  [3, 4, 5, 6, 7].flatMap((size) => (
    getPositionConfigurations(size).map(createGeneratedDefinition)
  ));

export const LINEOUT_COMBINATIONS: LineoutCombinationDefinition[] =
  validateLineoutCombinationLibrary([
    ...EXISTING_DEFINITIONS,
    ...GENERATED_LINEOUT_COMBINATIONS
  ]);

function getPositionConfigurations(size: number): LineoutPosition[][] {
  const configurations: LineoutPosition[][] = [];

  function visit(startIndex: number, selected: LineoutPosition[]): void {
    if (selected.length === size) {
      configurations.push([...selected]);
      return;
    }

    const remaining = size - selected.length;
    for (
      let index = startIndex;
      index <= ALL_POSITIONS.length - remaining;
      index += 1
    ) {
      selected.push(ALL_POSITIONS[index]);
      visit(index + 1, selected);
      selected.pop();
    }
  }

  visit(0, []);
  return configurations;
}

function createGeneratedDefinition(
  occupiedPositions: LineoutPosition[]
): LineoutCombinationDefinition {
  const id = `formation_${occupiedPositions.length}_${occupiedPositions.join("")}`;
  const occupied = new Set(occupiedPositions);
  const targetDescriptions = occupiedPositions.flatMap((targetPosition) => {
    const descriptions: Array<{
      targetPosition: LineoutPosition;
      type: CombinationTargetOption["type"];
    }> = [];

    if (isDirectCatchTargetAvailable(occupiedPositions, targetPosition)) {
      descriptions.push({ targetPosition, type: "directCatch" });
    }
    if (
      occupied.has((targetPosition - 1) as LineoutPosition)
      && occupied.has((targetPosition + 1) as LineoutPosition)
    ) {
      descriptions.push({ targetPosition, type: "jumpBlock" });
    }
    return descriptions;
  });
  const defaultNaturalWeight = 100 / targetDescriptions.length;

  return {
    id,
    occupiedPositions,
    targetOptions: targetDescriptions.map(({ targetPosition, type }) => ({
      id: `${id}-${type === "jumpBlock" ? "jump" : "direct"}-${targetPosition}`,
      targetPosition,
      type,
      roles: type === "jumpBlock"
        ? {
          frontLifterPosition: (targetPosition - 1) as LineoutPosition,
          jumperPosition: targetPosition,
          rearLifterPosition: (targetPosition + 1) as LineoutPosition
        }
        : { directCatcherPosition: targetPosition },
      defaultNaturalWeight
    }))
  };
}
