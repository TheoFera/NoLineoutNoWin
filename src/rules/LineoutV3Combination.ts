import type {
  Combination,
  CombinationPlan
} from "../models/Combination";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";

export const LINEOUT_V3_MAX_PHASES = 3;

export function buildDefaultV3CombinationPlan(_combination: Combination): CombinationPlan {
  return {
    phases: [{ id: "phase-1", actions: [] }]
  };
}

export function getV3CombinationPlan(combination: Combination): CombinationPlan {
  const phases = combination.plan?.phases
    .filter((phase) => phase.id.trim().length > 0)
    .slice(0, LINEOUT_V3_MAX_PHASES)
    .map((phase) => ({
      ...phase,
      actions: phase.actions.map((action) => {
        if (action.type === "jump") {
          return { ...action, lifterPositions: [...action.lifterPositions] };
        }
        if (action.type === "move") {
          return { ...action, destinationDepthMeters: snapDepthToLineoutPosition(action.destinationDepthMeters) };
        }
        return { ...action };
      })
    }));
  return phases && phases.length > 0
    ? { phases }
    : buildDefaultV3CombinationPlan(combination);
}

function snapDepthToLineoutPosition(depthMeters: number): number {
  const depth = LINEOUT_BALANCE.gameplayV3.depth;
  const positionIndex = Math.max(0, Math.min(6, Math.round(
    (depthMeters - depth.minimumMeters) / depth.positionSpacingMeters
  )));
  return depth.minimumMeters + positionIndex * depth.positionSpacingMeters;
}
