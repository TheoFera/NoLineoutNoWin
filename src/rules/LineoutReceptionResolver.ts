import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutPosition } from "../models/Combination.ts";
import type { LineoutAssignments, LineoutResolutionTeam } from "../models/Lineout.ts";
import type { FieldPlayer } from "../models/Player.ts";
import { clamp } from "../utils/Clamp.ts";
import { randomFloat, type RandomSource } from "../utils/Random.ts";

const SCORE = LINEOUT_BALANCE.score;
const POSITIONS = LINEOUT_BALANCE.positions;
const KNOCK_ON = LINEOUT_BALANCE.knockOn;
const CATCH = LINEOUT_BALANCE.directCatch;

export type RecoveryPlacement =
  | "noNearbyOpponent"
  | "oneAhead"
  | "twoAhead"
  | "oneBehind"
  | "furtherAway";

export type KnockOnRiskResult = {
  baseProbability: number;
  finalProbability: number;
  roll: number;
  knockOn: boolean;
};

export type SoloReceptionResult = {
  outcome: "caught" | "knockOn" | "missed";
  score: number;
  hands: number;
  randomScore: number;
  placementModifier: number;
  knockOnRisk: KnockOnRiskResult | null;
};

export type HandsDuelResult = {
  outcome: "caught" | "knockOn" | "ballContinues";
  ballTeam: LineoutResolutionTeam | null;
  knockOnBy: LineoutResolutionTeam | null;
  throwingScore: number | null;
  defendingScore: number | null;
  winningPlayerId: string | null;
  knockOnRisk: KnockOnRiskResult | null;
};

export type HighBallCascadeResult = {
  outcome: "caught" | "knockOn" | "looseBall";
  ballTeam: LineoutResolutionTeam;
  knockOnBy: LineoutResolutionTeam | null;
  recoveryPosition: LineoutPosition | null;
  recoveryPlayerId: string | null;
  visitedPositions: LineoutPosition[];
  reception: SoloReceptionResult | HandsDuelResult | null;
};

export function resolveLooseBall(rng: RandomSource): LineoutResolutionTeam {
  return randomFloat(0, 1, rng) < CATCH.looseBallThrowingTeamProbability
    ? "throwingTeam"
    : "defendingTeam";
}

function interpolate(left: number, right: number, ratio: number): number {
  return left + (right - left) * ratio;
}

export function calculateBaseKnockOnProbability(hands: number): number {
  const normalizedHands = clamp(hands, SCORE.minimum, SCORE.maximum);
  const anchors = KNOCK_ON.riskByHands;

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const left = anchors[index];
    const right = anchors[index + 1];
    if (normalizedHands <= right.hands) {
      const ratio = (normalizedHands - left.hands) / (right.hands - left.hands);
      return interpolate(left.probability, right.probability, ratio);
    }
  }

  return anchors[anchors.length - 1].probability;
}

export function calculatePlacementModifier(placements: readonly RecoveryPlacement[]): number {
  const effectivePlacements: readonly RecoveryPlacement[] = placements.length > 0
    ? placements
    : ["noNearbyOpponent"];
  return Math.min(...effectivePlacements.map((placement) => CATCH.placementModifier[placement]));
}

export function calculatePressuredKnockOnProbability(
  baseProbability: number,
  placements: readonly RecoveryPlacement[]
): number {
  let probability = baseProbability;
  if (placements.includes("oneAhead")) {
    probability = baseProbability * KNOCK_ON.oneAheadPressureMultiplier
      + KNOCK_ON.oneAheadPressureBonusPercent / SCORE.maximum;
  } else if (placements.includes("twoAhead") || placements.includes("oneBehind")) {
    probability = baseProbability * KNOCK_ON.secondaryPressureMultiplier
      + KNOCK_ON.secondaryPressureBonusPercent / SCORE.maximum;
  }

  return clamp(
    probability,
    0,
    KNOCK_ON.maximumPressureRiskPercent / SCORE.maximum
  );
}

export function testKnockOn(
  hands: number,
  placements: readonly RecoveryPlacement[],
  rng: RandomSource
): KnockOnRiskResult {
  const baseProbability = calculateBaseKnockOnProbability(hands);
  const finalProbability = calculatePressuredKnockOnProbability(baseProbability, placements);
  const roll = randomFloat(0, 1, rng);
  return {
    baseProbability,
    finalProbability,
    roll,
    knockOn: roll < finalProbability
  };
}

export function resolveSoloReception(
  player: FieldPlayer,
  placements: readonly RecoveryPlacement[],
  rng: RandomSource
): SoloReceptionResult {
  const hands = clamp(player.hands, SCORE.minimum, SCORE.maximum);
  const randomScore = randomFloat(SCORE.minimum, SCORE.maximum, rng);
  const placementModifier = calculatePlacementModifier(placements);
  const score = hands * CATCH.handsWeight
    + randomScore * CATCH.randomWeight
    + placementModifier;

  if (score < CATCH.successThreshold) {
    return {
      outcome: "missed",
      score,
      hands,
      randomScore,
      placementModifier,
      knockOnRisk: null
    };
  }

  const knockOnRisk = testKnockOn(hands, placements, rng);
  return {
    outcome: knockOnRisk.knockOn ? "knockOn" : "caught",
    score,
    hands,
    randomScore,
    placementModifier,
    knockOnRisk
  };
}

function calculateHandsDuelScore(player: FieldPlayer, rng: RandomSource): number {
  const hands = clamp(player.hands, SCORE.minimum, SCORE.maximum);
  return hands * CATCH.handsWeight
    + randomFloat(SCORE.minimum, SCORE.maximum, rng) * CATCH.randomWeight;
}

export function resolveHandsDuel(
  throwingPlayer: FieldPlayer | undefined,
  defendingPlayer: FieldPlayer | undefined,
  rng: RandomSource
): HandsDuelResult {
  const throwingScore = throwingPlayer ? calculateHandsDuelScore(throwingPlayer, rng) : null;
  const defendingScore = defendingPlayer ? calculateHandsDuelScore(defendingPlayer, rng) : null;
  const throwingEligible = throwingScore !== null && throwingScore >= CATCH.successThreshold;
  const defendingEligible = defendingScore !== null && defendingScore >= CATCH.successThreshold;

  if (!throwingEligible && !defendingEligible) {
    return {
      outcome: "ballContinues",
      ballTeam: null,
      knockOnBy: null,
      throwingScore,
      defendingScore,
      winningPlayerId: null,
      knockOnRisk: null
    };
  }

  const throwingWins = throwingEligible
    && (!defendingEligible || (throwingScore as number) >= (defendingScore as number));
  const winner = throwingWins ? throwingPlayer as FieldPlayer : defendingPlayer as FieldPlayer;
  const ballTeam: LineoutResolutionTeam = throwingWins ? "throwingTeam" : "defendingTeam";
  const knockOnRisk = testKnockOn(winner.hands, [], rng);

  return {
    outcome: knockOnRisk.knockOn ? "knockOn" : "caught",
    ballTeam,
    knockOnBy: knockOnRisk.knockOn ? ballTeam : null,
    throwingScore,
    defendingScore,
    winningPlayerId: winner.id,
    knockOnRisk
  };
}

function occupiedPositions(assignments: LineoutAssignments): LineoutPosition[] {
  return Object.keys(assignments)
    .map(Number)
    .filter((position): position is LineoutPosition => (
      Number.isInteger(position)
      && position >= POSITIONS.minimum
      && position <= POSITIONS.maximum
      && Boolean(assignments[position as LineoutPosition])
    ));
}

export function getRecoveryPlacements(
  receiverPosition: LineoutPosition,
  opponentAssignments: LineoutAssignments
): RecoveryPlacement[] {
  const opponentPositions = occupiedPositions(opponentAssignments);
  if (opponentPositions.length === 0) {
    return ["noNearbyOpponent"];
  }

  return opponentPositions.map((opponentPosition) => {
    const relativeOffset = receiverPosition - opponentPosition;
    if (relativeOffset === 1) return "oneAhead";
    if (relativeOffset === 2) return "twoAhead";
    if (relativeOffset === -1) return "oneBehind";
    return "furtherAway";
  });
}

export function resolveHighBallCascade(
  targetPosition: LineoutPosition,
  attackingAssignments: LineoutAssignments,
  defendingAssignments: LineoutAssignments,
  rng: RandomSource
): HighBallCascadeResult {
  const visitedPositions: LineoutPosition[] = [];
  const startPosition = targetPosition + CATCH.highBallCascadeOffset;

  for (let rawPosition = startPosition; rawPosition <= POSITIONS.maximum; rawPosition += 1) {
    const position = rawPosition as LineoutPosition;
    visitedPositions.push(position);
    const throwingPlayer = attackingAssignments[position];
    const defendingPlayer = defendingAssignments[position];

    if (!throwingPlayer && !defendingPlayer) {
      continue;
    }

    if (throwingPlayer && defendingPlayer) {
      const duel = resolveHandsDuel(throwingPlayer, defendingPlayer, rng);
      if (duel.outcome === "ballContinues") {
        continue;
      }
      return {
        outcome: duel.outcome,
        ballTeam: duel.ballTeam as LineoutResolutionTeam,
        knockOnBy: duel.knockOnBy,
        recoveryPosition: position,
        recoveryPlayerId: duel.winningPlayerId,
        visitedPositions,
        reception: duel
      };
    }

    const player = (throwingPlayer ?? defendingPlayer) as FieldPlayer;
    const ballTeam: LineoutResolutionTeam = throwingPlayer ? "throwingTeam" : "defendingTeam";
    const opponentAssignments = throwingPlayer ? defendingAssignments : attackingAssignments;
    const reception = resolveSoloReception(
      player,
      getRecoveryPlacements(position, opponentAssignments),
      rng
    );
    if (reception.outcome === "missed") {
      continue;
    }
    return {
      outcome: reception.outcome,
      ballTeam,
      knockOnBy: reception.outcome === "knockOn" ? ballTeam : null,
      recoveryPosition: position,
      recoveryPlayerId: player.id,
      visitedPositions,
      reception
    };
  }

  const ballTeam = resolveLooseBall(rng);
  return {
    outcome: "looseBall",
    ballTeam,
    knockOnBy: null,
    recoveryPosition: null,
    recoveryPlayerId: null,
    visitedPositions,
    reception: null
  };
}
