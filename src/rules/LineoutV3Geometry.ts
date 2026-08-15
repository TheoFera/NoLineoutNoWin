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

export function getLineoutV3DepthForGestureDistance(distancePixels: number): number {
  const gestureRatio = clamp(
    (distancePixels - V3.gesture.minimumDistancePixels)
      / (V3.gesture.maximumDistancePixels - V3.gesture.minimumDistancePixels),
    0,
    1
  );
  // Une courbe supérieure à 1 agrandit la zone des lancers proches et espace les lancers longs.
  const depthRatio = Math.pow(gestureRatio, V3.gesture.depthResponseExponent);
  return V3.depth.minimumMeters
    + depthRatio * (V3.depth.maximumMeters - V3.depth.minimumMeters);
}

export function getLineoutV3GestureDistanceForDepth(depthMeters: number): number {
  const depthRatio = clamp(
    (depthMeters - V3.depth.minimumMeters)
      / (V3.depth.maximumMeters - V3.depth.minimumMeters),
    0,
    1
  );
  const gestureRatio = Math.pow(depthRatio, 1 / V3.gesture.depthResponseExponent);
  return V3.gesture.minimumDistancePixels
    + gestureRatio * (V3.gesture.maximumDistancePixels - V3.gesture.minimumDistancePixels);
}

export function getLineoutV3TargetPhaseIndex(
  combination: Combination,
  targetPosition: LineoutPosition
): number {
  const plan = getV3CombinationPlan(combination);
  const jumpPhaseIndex = plan.phases.findIndex((phase) => (
    phase.actions.some((action) => (
      action.type === "jump" && action.playerPosition === targetPosition
    ))
  ));
  return jumpPhaseIndex >= 0 ? jumpPhaseIndex : plan.phases.length - 1;
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
