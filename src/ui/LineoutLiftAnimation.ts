import type { LineoutPosition } from "../models/Combination";
import type { PoseName } from "./RugbyPlayerTypes";

export const LINEOUT_LIFT_ANIMATION = {
  approachDurationMs: 70,
  approachDistancePixels: 16,
  frontLifterApproachDistancePixels: 35,
  frontLifterApproachDurationMs: 150,
  jumpAnticipationMs: 40,
  contestCenterShiftPixels: 8,
  contestJumperLeanDegrees: 5,
  defaultJumpQuality: 50,
  minimumJumperLiftHeightPixels: 0,
  maximumJumperLiftHeightPixels: 44,
  slowestJumperLiftDurationMs: 360,
  fastestJumperLiftDurationMs: 150,
  jumperHoldDurationMs: 120,
  jumperApexSuspensionDurationMs: 200,
  lifterReturnDurationMs: 120,
  ballFlightDurationMs: 410,
  hookerReleaseDelayMs: 70,
  hookerLiftPoseWidthScale: 1.16,
  resultDelayMs: 80
} as const;

export type LifterAnimationConfig = {
  pose: PoseName;
  approachOffsetY: number;
  approachDurationMs: number;
};

export type LineoutJumpAnimationMetrics = {
  heightPixels: number;
  liftDurationMs: number;
};

export function getLineoutJumpAnimationMetrics(
  jumpQuality: number
): LineoutJumpAnimationMetrics {
  const normalizedQuality = Math.min(100, Math.max(0, jumpQuality));
  const qualityRatio = normalizedQuality / 100;

  return {
    heightPixels: Math.round(
      LINEOUT_LIFT_ANIMATION.minimumJumperLiftHeightPixels
      + (
        LINEOUT_LIFT_ANIMATION.maximumJumperLiftHeightPixels
        - LINEOUT_LIFT_ANIMATION.minimumJumperLiftHeightPixels
      ) * qualityRatio
    ),
    liftDurationMs: Math.round(
      LINEOUT_LIFT_ANIMATION.slowestJumperLiftDurationMs
      - (
        LINEOUT_LIFT_ANIMATION.slowestJumperLiftDurationMs
        - LINEOUT_LIFT_ANIMATION.fastestJumperLiftDurationMs
      ) * qualityRatio
    )
  };
}

export function getLifterAnimationConfig(
  supportPosition: LineoutPosition,
  targetPosition: LineoutPosition
): LifterAnimationConfig | undefined {
  if (supportPosition === targetPosition - 1) {
    return {
      pose: "lifter_front",
      approachOffsetY: -LINEOUT_LIFT_ANIMATION.frontLifterApproachDistancePixels,
      approachDurationMs: LINEOUT_LIFT_ANIMATION.frontLifterApproachDurationMs
    };
  }

  if (supportPosition === targetPosition + 1) {
    return {
      pose: "hand",
      approachOffsetY: LINEOUT_LIFT_ANIMATION.approachDistancePixels,
      approachDurationMs: LINEOUT_LIFT_ANIMATION.approachDurationMs
    };
  }

  return undefined;
}

export function getLineoutLiftSequenceDurationMs(
  shouldJump = true,
  jumpQuality: number = LINEOUT_LIFT_ANIMATION.defaultJumpQuality
): number {
  const jumpMetrics = getLineoutJumpAnimationMetrics(jumpQuality);
  const jumperDuration = LINEOUT_LIFT_ANIMATION.approachDurationMs
    + jumpMetrics.liftDurationMs * 2
    + LINEOUT_LIFT_ANIMATION.jumperApexSuspensionDurationMs
    + LINEOUT_LIFT_ANIMATION.lifterReturnDurationMs;

  return Math.max(
    LINEOUT_LIFT_ANIMATION.ballFlightDurationMs,
    shouldJump ? jumperDuration : 0
  ) + LINEOUT_LIFT_ANIMATION.resultDelayMs;
}
