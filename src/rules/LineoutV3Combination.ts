import type {
  Combination,
  CombinationPhaseAction,
  CombinationPlan
} from "../models/Combination";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";

export const LINEOUT_V3_MAX_PHASES = 4;

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
  return moveV3JumpsToFinalPhase(
    phases && phases.length > 0
      ? { phases }
      : buildDefaultV3CombinationPlan(combination)
  );
}

export function moveV3JumpsToFinalPhase(plan: CombinationPlan): CombinationPlan {
  const jumpByPlayerPosition = new Map<
    CombinationPhaseAction["playerPosition"],
    Extract<CombinationPhaseAction, { type: "jump" }>
  >();
  plan.phases.forEach((phase) => {
    phase.actions.forEach((action) => {
      if (action.type === "jump") {
        jumpByPlayerPosition.set(action.playerPosition, {
          ...action,
          lifterPositions: [...action.lifterPositions]
        });
      }
    });
  });
  const jumpPositions = new Set(jumpByPlayerPosition.keys());
  const finalPhaseIndex = plan.phases.length - 1;
  return {
    phases: plan.phases.map((phase, phaseIndex) => ({
      ...phase,
      actions: [
        ...phase.actions.filter((action) => (
          action.type !== "jump"
          && (phaseIndex !== finalPhaseIndex || !jumpPositions.has(action.playerPosition))
        )).map((action) => ({ ...action })),
        ...(phaseIndex === finalPhaseIndex ? [...jumpByPlayerPosition.values()] : [])
      ]
    }))
  };
}

function snapDepthToLineoutPosition(depthMeters: number): number {
  const depth = LINEOUT_BALANCE.gameplayV3.depth;
  const positionIndex = Math.max(0, Math.min(6, Math.round(
    (depthMeters - depth.minimumMeters) / depth.positionSpacingMeters
  )));
  return depth.minimumMeters + positionIndex * depth.positionSpacingMeters;
}
