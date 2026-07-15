import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutPosition } from "../models/Combination.ts";
import type { ReachableThrowTrajectory } from "./LineoutJumpResolver.ts";
import { clamp } from "../utils/Clamp.ts";

const SCORE = LINEOUT_BALANCE.score;
const THROWING = LINEOUT_BALANCE.throwing;
const JUMPING = LINEOUT_BALANCE.jumping;
const DUEL = LINEOUT_BALANCE.aerialDuel;
const COUNTER = LINEOUT_BALANCE.counterAhead;

export type CounterOutcome =
  | "attackClean"
  | "attackScrappy"
  | "defenseDeflected"
  | "defenseCleanSteal"
  | "ballContinues"
  | "counterImpossible";

export type SamePositionDuelInput = {
  attackingJumpQuality: number;
  attackingHands: number;
  defendingJumpQuality: number;
  defendingHands: number;
  trajectory: ReachableThrowTrajectory;
};

export type SamePositionDuelResult = {
  outcome: Exclude<CounterOutcome, "ballContinues" | "counterImpossible">;
  attackScore: number;
  defenseScore: number;
  gap: number;
  trajectoryModifier: number;
};

export type AheadCounterInput = {
  targetPosition: LineoutPosition;
  defensivePosition: LineoutPosition;
  throwQuality: number;
  defendingJumpQuality: number;
  defendingHands: number;
  trajectory: ReachableThrowTrajectory;
};

export type AheadCounterResult = {
  outcome: "defenseDeflected" | "defenseCleanSteal" | "ballContinues" | "counterImpossible";
  relativeOffset: number;
  counterScore: number | null;
  difficulty: number | null;
  interceptionMargin: number | null;
  handsCorrection: number;
  controlMargin: number | null;
};

export function classifyAerialDuelGap(
  gap: number
): SamePositionDuelResult["outcome"] {
  if (gap > DUEL.cleanAttackMinimumExclusive) {
    return "attackClean";
  }
  if (gap >= DUEL.scrappyAttackMinimum) {
    return "attackScrappy";
  }
  if (gap >= DUEL.deflectedDefenseMinimum) {
    return "defenseDeflected";
  }
  return "defenseCleanSteal";
}

export function resolveSamePositionDuel(input: SamePositionDuelInput): SamePositionDuelResult {
  const attackingJumpQuality = clamp(input.attackingJumpQuality, SCORE.minimum, SCORE.maximum);
  const attackingHands = clamp(input.attackingHands, SCORE.minimum, SCORE.maximum);
  const defendingJumpQuality = clamp(input.defendingJumpQuality, SCORE.minimum, SCORE.maximum);
  const defendingHands = clamp(input.defendingHands, SCORE.minimum, SCORE.maximum);
  const trajectoryModifier = JUMPING.trajectoryAccessibilityModifier[input.trajectory];
  const attackScore = attackingJumpQuality * DUEL.jumpWeight
    + attackingHands * DUEL.handsWeight
    + trajectoryModifier;
  const defenseScore = defendingJumpQuality * DUEL.jumpWeight
    + defendingHands * DUEL.handsWeight;
  const gap = attackScore - defenseScore;

  return {
    outcome: classifyAerialDuelGap(gap),
    attackScore,
    defenseScore,
    gap,
    trajectoryModifier
  };
}

export function calculateInterceptionHandsCorrection(hands: number): number {
  const normalizedHands = clamp(hands, SCORE.minimum, SCORE.maximum);
  const handsAboveBaseline = Math.max(0, normalizedHands - COUNTER.interceptionHandsBaseline);
  const availableRange = SCORE.maximum - COUNTER.interceptionHandsBaseline;
  return COUNTER.interceptionHandsMaximumCorrection
    * Math.pow(handsAboveBaseline / availableRange, COUNTER.interceptionHandsExponent);
}

export function classifyInterceptionControlMargin(
  controlMargin: number
): "defenseDeflected" | "defenseCleanSteal" {
  return controlMargin > COUNTER.cleanStealControlMarginExclusive
    ? "defenseCleanSteal"
    : "defenseDeflected";
}

export function resolveAheadCounter(input: AheadCounterInput): AheadCounterResult {
  const relativeOffset = input.targetPosition - input.defensivePosition;
  const throwQuality = clamp(input.throwQuality, SCORE.minimum, SCORE.maximum);
  const defendingJumpQuality = clamp(input.defendingJumpQuality, SCORE.minimum, SCORE.maximum);

  let counterScore: number | null = null;
  let difficulty: number | null = null;

  if (relativeOffset === 1 && input.trajectory !== "high") {
    counterScore = defendingJumpQuality + COUNTER.oneAheadScoreModifier;
    difficulty = input.trajectory === "precise"
      ? COUNTER.preciseDifficultyBase
        + (throwQuality - THROWING.notStraightThreshold) * COUNTER.preciseThrowQualityWeight
      : COUNTER.lowDifficultyBase
        + (throwQuality - THROWING.notStraightThreshold) * COUNTER.lowThrowQualityWeight;
  } else if (relativeOffset === 2 && input.trajectory === "low") {
    counterScore = defendingJumpQuality + COUNTER.twoAheadScoreModifier;
    difficulty = COUNTER.twoAheadLowDifficultyBase
      + (throwQuality - THROWING.notStraightThreshold) * COUNTER.twoAheadLowThrowQualityWeight;
  }

  if (counterScore === null || difficulty === null) {
    return {
      outcome: "counterImpossible",
      relativeOffset,
      counterScore,
      difficulty,
      interceptionMargin: null,
      handsCorrection: 0,
      controlMargin: null
    };
  }

  const interceptionMargin = counterScore - difficulty;
  if (interceptionMargin < 0) {
    return {
      outcome: "ballContinues",
      relativeOffset,
      counterScore,
      difficulty,
      interceptionMargin,
      handsCorrection: 0,
      controlMargin: null
    };
  }

  const handsCorrection = calculateInterceptionHandsCorrection(input.defendingHands);
  const controlMargin = interceptionMargin + handsCorrection;
  return {
    outcome: classifyInterceptionControlMargin(controlMargin),
    relativeOffset,
    counterScore,
    difficulty,
    interceptionMargin,
    handsCorrection,
    controlMargin
  };
}
