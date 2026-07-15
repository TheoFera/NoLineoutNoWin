import { LINEOUT_COMBINATIONS } from "./LineoutCombinations.ts";
import type { Combination, LineoutPosition } from "../models/Combination.ts";

export const DEFAULT_COMBINATIONS: Combination[] = LINEOUT_COMBINATIONS.map((definition) => ({
  id: definition.id,
  nameKey: `combo.${definition.id}`,
  risk: 0,
  complexity: 0,
  slots: [1, 2, 3, 4, 5, 6, 7].map((position) => ({
    playerId: null,
    position: position as LineoutPosition
  })),
  targetOptions: definition.targetOptions.map((option) => ({
    ...option,
    roles: { ...option.roles }
  }))
}));
