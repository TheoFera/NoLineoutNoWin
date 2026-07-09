import type { LineoutResult, LineoutSetup } from "../models/Lineout";
import type { FieldPlayer } from "../models/Player";
import { clamp } from "../utils/Clamp";
import { randomInt } from "../utils/Random";

const DISTANCE_FACTORS = [1, 0.96, 0.9, 0.8, 0.67, 0.52, 0.35] as const;
const PRODUCT_SCORE_MULTIPLIER = 4.5;

function averageLiftAround(players: Array<FieldPlayer | null>, targetIndex: number): number {
  const left = players[targetIndex - 1]?.lift ?? 0;
  const right = players[targetIndex + 1]?.lift ?? 0;
  if (left && right) return (left + right) / 2;
  if (right) return right * 0.7;
  if (left) return left * 0.4;
  return 10;
}

function getReceptionSupportProfile(players: Array<FieldPlayer | null>, targetIndex: number): {
  jumpMultiplier: number;
  liftSupport: number;
} {
  const leftLift = players[targetIndex - 1]?.lift ?? 0;
  const rightLift = players[targetIndex + 1]?.lift ?? 0;

  if (leftLift > 0 && rightLift > 0) {
    return {
      jumpMultiplier: 1,
      liftSupport: averageLiftAround(players, targetIndex)
    };
  }

  if (leftLift <= 0 && rightLift > 0) {
    return {
      jumpMultiplier: 0.6,
      liftSupport: rightLift * 0.6
    };
  }

  return {
    jumpMultiplier: 0,
    liftSupport: 0
  };
}

function getCounterBaseChance(relativeOffset: number): number {
  if (relativeOffset === 1) return 82;
  if (relativeOffset === 0) return 50;
  if (relativeOffset === 2) return 30;
  if (relativeOffset > 2) return 14;
  return 6;
}

function lostResult(): LineoutResult {
  return {
    displayedResult: "lost",
    internalEvent: "stolen",
    possessionDelta: -10,
    occupationDelta: -8,
    explanationKey: "lineout.explanation.lost",
    calculationScore: 0,
    calculationDetails: []
  };
}

function calculateDefensiveCounter(
  defendingPlayers: Array<FieldPlayer | null>,
  targetPosition: number,
  defensiveJumpPosition?: number
): number {
  const contestPosition = defensiveJumpPosition ?? targetPosition;
  const selectedDefender = defendingPlayers[contestPosition - 1];
  const relativeOffset = targetPosition - contestPosition;
  const baseChance = getCounterBaseChance(relativeOffset);

  if (!selectedDefender) {
    return clamp(baseChance * 0.35, 5, 30);
  }

  const supportProfile = getReceptionSupportProfile(defendingPlayers, contestPosition - 1);
  const jumpQuality = supportProfile.jumpMultiplier > 0
    ? clamp((selectedDefender.jump * 0.7 + supportProfile.liftSupport * 0.3) * supportProfile.jumpMultiplier, 0, 100)
    : 0;
  const handsImpact = (selectedDefender.hands - 50) * 0.25;
  const jumpImpact = (jumpQuality - 50) * 0.45;

  return clamp(baseChance + jumpImpact + handsImpact, 5, 95);
}

export function resolveLineoutForThrowingTeam(setup: LineoutSetup): LineoutResult {
  if (!setup.targetPlayerId) {
    return lostResult();
  }

  const attackingPlayers = setup.attackingPlayers.slice(0, 7);
  const targetIndex = setup.targetPosition
    ? setup.targetPosition - 1
    : attackingPlayers.findIndex((player) => player?.id === setup.targetPlayerId);
  const target = targetIndex >= 0 ? attackingPlayers[targetIndex] : null;

  if (!target) {
    return lostResult();
  }

  const position = targetIndex + 1;
  const distanceFactor = DISTANCE_FACTORS[targetIndex] ?? 0.35;
  const supportProfile = getReceptionSupportProfile(attackingPlayers, targetIndex);
  const canJumpOnReception = supportProfile.jumpMultiplier > 0;
  const liftSupport = supportProfile.liftSupport;
  const jumpQuality = canJumpOnReception
    ? clamp((target.jump * 0.7 + liftSupport * 0.3) * supportProfile.jumpMultiplier, 0, 100)
    : null;
  const throwQuality = clamp(setup.hooker.throwing * distanceFactor + randomInt(-8, 8), 0, 100);
  const handsQuality = target.hands;
  const defensiveCounter = calculateDefensiveCounter(
    setup.defendingPlayers.slice(0, 7),
    position,
    setup.defensiveJumpPosition
  );
  const counterResistance = clamp(100 - defensiveCounter, 5, 100);
  const scoreFactors = [
    throwQuality,
    handsQuality,
    counterResistance,
    ...(jumpQuality !== null ? [jumpQuality] : [])
  ];
  const factorProduct = scoreFactors.reduce((product, factor) => product * factor, 1);
  const normalizationBase = 100 ** (scoreFactors.length - 2);

  const score = clamp(
    (factorProduct / normalizationBase) * PRODUCT_SCORE_MULTIPLIER,
    5,
    95
  );
  const successRoll = randomInt(1, 100);
  const calculationDetails = [
    { labelKey: "lineout.calc.throwing", value: throwQuality },
    ...(jumpQuality !== null ? [{ labelKey: "lineout.calc.jump", value: jumpQuality }] : []),
    { labelKey: "lineout.calc.hands", value: handsQuality },
    { labelKey: "lineout.calc.pressure", value: defensiveCounter }
  ];

  if (successRoll <= score) {
    if (score - successRoll >= 18 || score >= 70) {
      return {
        displayedResult: "won",
        internalEvent: "clean_catch",
        possessionDelta: 10,
        occupationDelta: 10,
        explanationKey: "lineout.explanation.clean",
        calculationScore: score,
        calculationDetails
      };
    }

    return {
      displayedResult: "won_dirty",
      internalEvent: "dirty_catch",
      possessionDelta: 5,
      occupationDelta: 3,
      explanationKey: "lineout.explanation.dirty",
      calculationScore: score,
      calculationDetails
    };
  }

  if (throwQuality < 25 && defensiveCounter > 50 && successRoll >= score + 15) {
    return {
      displayedResult: "fault",
      internalEvent: "not_straight",
      possessionDelta: -12,
      occupationDelta: -10,
      explanationKey: "lineout.explanation.fault",
      calculationScore: score,
      calculationDetails
    };
  }

  return {
    displayedResult: "lost",
    internalEvent: "stolen",
    possessionDelta: -12,
    occupationDelta: -10,
    explanationKey: "lineout.explanation.lost",
    calculationScore: score,
    calculationDetails
  };
}

export function resolveLineout(setup: LineoutSetup): LineoutResult {
  return resolveLineoutForThrowingTeam(setup);
}
