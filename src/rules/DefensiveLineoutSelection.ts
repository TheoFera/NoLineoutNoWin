import type { LineoutPosition } from "../models/Combination.ts";
import type { LineoutAssignments } from "../models/Lineout.ts";
import { canBeLineoutJumper } from "./LineoutPlayerRoles.ts";

export type DefensiveSelectionMode = "aerialCounter" | "groundRead" | "unavailable";

export function getDefensiveSelectionMode(
  assignments: LineoutAssignments,
  selectedPosition: LineoutPosition
): DefensiveSelectionMode {
  const selectedPlayer = assignments[selectedPosition];
  if (!selectedPlayer) {
    return "unavailable";
  }

  const rearLifterPosition = selectedPosition + 1;
  const hasRearLifter = rearLifterPosition <= 7
    && Boolean(assignments[rearLifterPosition as LineoutPosition]);

  if (!hasRearLifter) {
    return "groundRead";
  }

  return canBeLineoutJumper(selectedPlayer) ? "aerialCounter" : "unavailable";
}
