import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type { Combination, LineoutPosition } from "../models/Combination";
import { clamp } from "../utils/Clamp";
import { getV3CombinationPlan } from "./LineoutV3Combination";

const V3 = LINEOUT_BALANCE.gameplayV3;

export function getLineoutV3DepthForPosition(position: LineoutPosition): number {
  return V3.depth.minimumMeters + (position - 1) * V3.depth.positionSpacingMeters;
}

export function getLineoutV3PositionForDepth(depthMeters: number): LineoutPosition {
  return clamp(
    Math.round((depthMeters - V3.depth.minimumMeters) / V3.depth.positionSpacingMeters) + 1,
    1,
    7
  ) as LineoutPosition;
}

export function getLineoutV3GestureDistanceForDepth(depthMeters: number): number {
  const ratio = clamp(
    (depthMeters - V3.depth.minimumMeters)
      / (V3.depth.maximumMeters - V3.depth.minimumMeters),
    0,
    1
  );
  return V3.gesture.minimumDistancePixels
    + ratio * (V3.gesture.maximumDistancePixels - V3.gesture.minimumDistancePixels);
}

export function getLineoutV3TargetPhaseIndex(
  combination: Combination,
  targetPosition: LineoutPosition
): number {
  const plan = getV3CombinationPlan(combination);
  return Math.max(0, plan.phases.findIndex((phase) => (
    phase.actions.some((action) => (
      action.type === "jump" && action.playerPosition === targetPosition
    ))
  )));
}

export function calculateAiLineoutV3ThrowReleaseMs(
  combination: Combination,
  targetPosition: LineoutPosition
): number {
  const phaseIndex = getLineoutV3TargetPhaseIndex(combination, targetPosition);
  const targetDepth = getLineoutV3DepthForPosition(targetPosition);
  const groundDepth = targetDepth + V3.depth.ballContinuationMeters;
  const totalFlight = clamp(
    V3.timing.baseFlightDurationMs + groundDepth * V3.timing.flightDurationPerMeterMs,
    V3.timing.minimumFlightDurationMs,
    V3.timing.maximumFlightDurationMs
  );
  const expectedArrival = totalFlight * targetDepth / groundDepth;
  const expectedApex = V3.timing.combinationLeadMs
    + phaseIndex * V3.timing.phaseDurationMs
    + (V3.jump.minimumDurationMs + V3.jump.maximumDurationMs) / 4;
  return Math.max(160, expectedApex - expectedArrival);
}
