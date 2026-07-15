import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutPosition } from "../models/Combination.ts";
import type { LineoutTrajectory } from "../models/Lineout.ts";
import { clamp } from "../utils/Clamp.ts";
import { randomFloat, type RandomSource } from "../utils/Random.ts";

const SCORE = LINEOUT_BALANCE.score;
const POSITIONS = LINEOUT_BALANCE.positions;
const THROWING = LINEOUT_BALANCE.throwing;
const FATIGUE = LINEOUT_BALANCE.fatigue;

export type ThrowQualityInput = {
  throwing: number;
  targetPosition: LineoutPosition;
  fatiguePercent: number;
  rng: RandomSource;
  distanceIndex?: number;
};

export type ThrowQualityResult = {
  quality: number;
  throwing: number;
  distanceIndex: number;
  distanceCoefficient: number;
  baseQuality: number;
  fatiguePercent: number;
  fatiguedQuality: number;
  randomAmplitude: number;
  normalVariation: number | null;
  exceptionalErrorProbability: number;
  exceptionalErrorRoll: number;
  exceptionalError: boolean;
};

export type ThrowTrajectoryProbabilities = {
  precise: number;
  low: number;
  high: number;
};

export type ThrowTrajectoryResult = {
  trajectory: LineoutTrajectory;
  probabilities: ThrowTrajectoryProbabilities;
  roll: number | null;
};

export type LineoutThrowResult = {
  throwing: ThrowQualityResult;
  trajectory: ThrowTrajectoryResult;
};

export function calculateDistanceIndex(targetPosition: LineoutPosition): number {
  return (
    (targetPosition - POSITIONS.minimum) / (POSITIONS.maximum - POSITIONS.minimum)
  ) * THROWING.distanceMaximum;
}

export function getDistanceCoefficient(distanceIndex: number): number {
  const normalizedDistance = clamp(distanceIndex, 0, THROWING.distanceMaximum);
  const lowerIndex = Math.floor(normalizedDistance);
  const upperIndex = Math.ceil(normalizedDistance);
  const lowerCoefficient = THROWING.distanceCoefficients[lowerIndex];
  const upperCoefficient = THROWING.distanceCoefficients[upperIndex];

  if (lowerIndex === upperIndex) {
    return lowerCoefficient;
  }

  const interpolation = normalizedDistance - lowerIndex;
  return lowerCoefficient + (upperCoefficient - lowerCoefficient) * interpolation;
}

export function calculateCurrentFatiguePercent(maximumFatiguePercent: number, minute: number): number {
  const maximumFatigue = Math.max(0, maximumFatiguePercent);
  const elapsedMinute = Math.max(0, minute);
  return maximumFatigue * (elapsedMinute / FATIGUE.referenceMatchMinutes);
}

export function generateMaximumFatiguePercent(rng: RandomSource): number {
  return randomFloat(FATIGUE.minimumMaximumPercent, FATIGUE.maximumMaximumPercent, rng);
}

export function calculateThrowRandomAmplitude(throwing: number): number {
  const statRange = THROWING.playableStatMaximum - THROWING.playableStatMinimum;
  const amplitudeRange = THROWING.randomAmplitudeAtStatMinimum - THROWING.randomAmplitudeAtStatMaximum;
  return clamp(
    THROWING.randomAmplitudeAtStatMinimum
      - ((throwing - THROWING.playableStatMinimum) / statRange) * amplitudeRange,
    THROWING.randomAmplitudeAtStatMaximum,
    THROWING.randomAmplitudeAtStatMinimum
  );
}

export function calculateExceptionalErrorProbability(distanceIndex: number): number {
  const normalizedDistance = clamp(distanceIndex, 0, THROWING.distanceMaximum);
  return THROWING.exceptionalErrorBaseProbability
    + THROWING.exceptionalErrorDistanceProbability
      * Math.pow(
        normalizedDistance / THROWING.distanceMaximum,
        THROWING.exceptionalErrorDistanceExponent
      );
}

export function calculateThrowQuality(input: ThrowQualityInput): ThrowQualityResult {
  const throwing = clamp(input.throwing, SCORE.minimum, SCORE.maximum);
  const distanceIndex = clamp(
    input.distanceIndex ?? calculateDistanceIndex(input.targetPosition),
    0,
    THROWING.distanceMaximum
  );
  const distanceCoefficient = getDistanceCoefficient(distanceIndex);
  const fatiguePercent = clamp(input.fatiguePercent, SCORE.minimum, SCORE.maximum);
  const baseQuality = throwing * distanceCoefficient;
  const fatiguedQuality = baseQuality * (1 - fatiguePercent / SCORE.maximum);
  const randomAmplitude = calculateThrowRandomAmplitude(throwing);
  const exceptionalErrorProbability = calculateExceptionalErrorProbability(distanceIndex);
  const exceptionalErrorRoll = randomFloat(0, 1, input.rng);
  const exceptionalError = exceptionalErrorRoll < exceptionalErrorProbability;

  if (exceptionalError) {
    return {
      quality: randomFloat(
        THROWING.exceptionalErrorQualityMinimum,
        THROWING.exceptionalErrorQualityMaximum,
        input.rng
      ),
      throwing,
      distanceIndex,
      distanceCoefficient,
      baseQuality,
      fatiguePercent,
      fatiguedQuality,
      randomAmplitude,
      normalVariation: null,
      exceptionalErrorProbability,
      exceptionalErrorRoll,
      exceptionalError
    };
  }

  const normalVariation = randomFloat(-randomAmplitude, randomAmplitude, input.rng);
  return {
    quality: clamp(fatiguedQuality + normalVariation, SCORE.minimum, SCORE.maximum),
    throwing,
    distanceIndex,
    distanceCoefficient,
    baseQuality,
    fatiguePercent,
    fatiguedQuality,
    randomAmplitude,
    normalVariation,
    exceptionalErrorProbability,
    exceptionalErrorRoll,
    exceptionalError
  };
}

export function calculateThrowTrajectoryProbabilities(quality: number): ThrowTrajectoryProbabilities {
  if (quality < THROWING.notStraightThreshold) {
    return { precise: 0, low: 0, high: 0 };
  }

  const normalizedQuality = clamp(
    (quality - THROWING.notStraightThreshold)
      / (SCORE.maximum - THROWING.notStraightThreshold),
    0,
    1
  );
  const smooth = 3 * normalizedQuality ** 2 - 2 * normalizedQuality ** 3;
  const precise = THROWING.preciseProbabilityAtThreshold
    + (1 - THROWING.preciseProbabilityAtThreshold) * smooth;
  const impreciseShare = (1 - precise) / 2;
  return {
    precise,
    low: impreciseShare,
    high: impreciseShare
  };
}

export function resolveThrowTrajectory(quality: number, rng: RandomSource): ThrowTrajectoryResult {
  const probabilities = calculateThrowTrajectoryProbabilities(quality);
  if (quality < THROWING.notStraightThreshold) {
    return {
      trajectory: "notStraight",
      probabilities,
      roll: null
    };
  }

  const roll = randomFloat(0, 1, rng);
  if (roll < probabilities.precise) {
    return { trajectory: "precise", probabilities, roll };
  }
  if (roll < probabilities.precise + probabilities.low) {
    return { trajectory: "low", probabilities, roll };
  }
  return { trajectory: "high", probabilities, roll };
}

export function resolveLineoutThrow(input: ThrowQualityInput): LineoutThrowResult {
  const throwing = calculateThrowQuality(input);
  return {
    throwing,
    trajectory: resolveThrowTrajectory(throwing.quality, input.rng)
  };
}
