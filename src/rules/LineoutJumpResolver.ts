import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutTrajectory } from "../models/Lineout.ts";
import type { FieldPlayer } from "../models/Player.ts";
import { clamp } from "../utils/Clamp.ts";
import { randomFloat, type RandomSource } from "../utils/Random.ts";

const SCORE = LINEOUT_BALANCE.score;
const JUMPING = LINEOUT_BALANCE.jumping;

export type ReachableThrowTrajectory = Exclude<LineoutTrajectory, "notStraight">;

export type JumpQualityInput = {
  jumper: FieldPlayer;
  rearLifter?: FieldPlayer;
  frontLifter?: FieldPlayer;
  fatigueByPlayerId: Record<string, number>;
  rng: RandomSource;
};

export type JumpQualityResult = {
  possible: boolean;
  quality: number;
  baseQuality: number;
  structure: "twoLifters" | "oneLifter" | "noLifter";
  structureModifier: number;
  randomAmplitude: number;
  randomVariation: number | null;
  effectiveStats: {
    jump: number;
    rearLift: number;
    frontLift: number;
  };
};

export type BlockReceptionResult = {
  score: number;
  jumpQuality: number;
  trajectoryModifier: number;
  hands: number;
  handsCorrection: number;
};

function effectiveStat(stat: number, fatiguePercent: number): number {
  const normalizedStat = clamp(stat, SCORE.minimum, SCORE.maximum);
  const normalizedFatigue = clamp(fatiguePercent, SCORE.minimum, SCORE.maximum);
  return normalizedStat * (1 - normalizedFatigue / SCORE.maximum);
}

export function calculateJumpRandomAmplitude(baseQuality: number): number {
  const qualityRange = JUMPING.randomQualityAnchorMaximum - JUMPING.randomQualityAnchorMinimum;
  const amplitudeRange = JUMPING.randomAmplitudeAtQualityMinimum
    - JUMPING.randomAmplitudeAtQualityMaximum;
  return clamp(
    JUMPING.randomAmplitudeAtQualityMinimum
      - ((baseQuality - JUMPING.randomQualityAnchorMinimum) / qualityRange) * amplitudeRange,
    JUMPING.randomAmplitudeAtQualityMaximum,
    JUMPING.randomAmplitudeAtQualityMinimum
  );
}

export function calculateJumpQuality(input: JumpQualityInput): JumpQualityResult {
  const effectiveJump = effectiveStat(
    input.jumper.jump,
    input.fatigueByPlayerId[input.jumper.id] ?? 0
  );
  const effectiveRearLift = input.rearLifter
    ? effectiveStat(
      input.rearLifter.lift,
      input.fatigueByPlayerId[input.rearLifter.id] ?? 0
    )
    : 0;
  const effectiveFrontLift = input.frontLifter
    ? effectiveStat(
      input.frontLifter.lift,
      input.fatigueByPlayerId[input.frontLifter.id] ?? 0
    )
    : 0;
  const baseQuality = effectiveJump * JUMPING.jumperWeight
    + effectiveRearLift * JUMPING.rearLifterWeight
    + effectiveFrontLift * JUMPING.frontLifterWeight;
  const lifterCount = Number(Boolean(input.rearLifter)) + Number(Boolean(input.frontLifter));
  const structure = lifterCount === 2
    ? "twoLifters"
    : lifterCount === 1
      ? "oneLifter"
      : "noLifter";
  const structureModifier = structure === "twoLifters"
    ? JUMPING.twoLiftersModifier
    : structure === "oneLifter"
      ? JUMPING.oneLifterModifier
      : 0;
  const randomAmplitude = calculateJumpRandomAmplitude(baseQuality);

  if (structure === "noLifter") {
    return {
      possible: false,
      quality: SCORE.minimum,
      baseQuality,
      structure,
      structureModifier,
      randomAmplitude,
      randomVariation: null,
      effectiveStats: {
        jump: effectiveJump,
        rearLift: effectiveRearLift,
        frontLift: effectiveFrontLift
      }
    };
  }

  const randomVariation = randomFloat(-randomAmplitude, randomAmplitude, input.rng);
  return {
    possible: true,
    quality: clamp(
      baseQuality + structureModifier + randomVariation,
      SCORE.minimum,
      SCORE.maximum
    ),
    baseQuality,
    structure,
    structureModifier,
    randomAmplitude,
    randomVariation,
    effectiveStats: {
      jump: effectiveJump,
      rearLift: effectiveRearLift,
      frontLift: effectiveFrontLift
    }
  };
}

export function calculateBlockReceptionScore(
  jumpQuality: number,
  trajectory: ReachableThrowTrajectory,
  hands: number
): BlockReceptionResult {
  const normalizedJumpQuality = clamp(jumpQuality, SCORE.minimum, SCORE.maximum);
  const normalizedHands = clamp(hands, SCORE.minimum, SCORE.maximum);
  const trajectoryModifier = JUMPING.trajectoryAccessibilityModifier[trajectory];
  const handsCorrection = (normalizedHands - JUMPING.handsCorrectionBaseline)
    * JUMPING.handsCorrectionWeight;

  return {
    score: clamp(
      normalizedJumpQuality + trajectoryModifier + handsCorrection,
      SCORE.minimum,
      SCORE.maximum
    ),
    jumpQuality: normalizedJumpQuality,
    trajectoryModifier,
    hands: normalizedHands,
    handsCorrection
  };
}
