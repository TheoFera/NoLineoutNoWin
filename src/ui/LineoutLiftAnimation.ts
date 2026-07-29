import type { LineoutPosition } from "../models/Combination";
import type { PoseName } from "./RugbyPlayerTypes";

export const LINEOUT_LIFT_ANIMATION = {
  approachDurationMs: 70,
  approachDistancePixels: 10,
  jumperLiftDurationMs: 220,
  jumperHoldDurationMs: 120,
  jumperLiftHeightPixels: 28,
  ballFlightDurationMs: 320,
  hookerReleaseDelayMs: 70,
  resultDelayMs: 80
} as const;

export type LifterAnimationConfig = {
  pose: PoseName;
  approachOffsetY: number;
};

export function getLifterAnimationConfig(
  supportPosition: LineoutPosition,
  targetPosition: LineoutPosition
): LifterAnimationConfig | undefined {
  if (supportPosition === targetPosition - 1) {
    return {
      pose: "lifter_front",
      approachOffsetY: -LINEOUT_LIFT_ANIMATION.approachDistancePixels
    };
  }

  if (supportPosition === targetPosition + 1) {
    return {
      pose: "hand",
      approachOffsetY: LINEOUT_LIFT_ANIMATION.approachDistancePixels
    };
  }

  return undefined;
}

export function getLineoutLiftSequenceDurationMs(): number {
  const jumperDuration = LINEOUT_LIFT_ANIMATION.approachDurationMs
    + LINEOUT_LIFT_ANIMATION.jumperLiftDurationMs * 2
    + LINEOUT_LIFT_ANIMATION.jumperHoldDurationMs;

  return Math.max(
    LINEOUT_LIFT_ANIMATION.ballFlightDurationMs,
    jumperDuration
  ) + LINEOUT_LIFT_ANIMATION.resultDelayMs;
}
