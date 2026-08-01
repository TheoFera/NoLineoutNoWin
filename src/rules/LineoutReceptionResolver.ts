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
  situationalModifier: number;
  knockOnRisk: KnockOnRiskResult | null;
};

export type HandsDuelResult = {
  outcome: "caught" | "knockOn" | "ballContinues";
  ballTeam: LineoutResolutionTeam | null;
  knockOnBy: LineoutResolutionTeam | null;
  throwingScore: number | null;
  defendingScore: number | null;
  throwingSituationalModifier: number;
  defendingSituationalModifier: number;
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

export type RecoveryAttempt = {
  position: LineoutPosition;
  scoreModifier?: number;
};

export type RecoverySequenceResult = {
  outcome: "caught" | "knockOn" | "missed";
  ballTeam: LineoutResolutionTeam | null;
  knockOnBy: LineoutResolutionTeam | null;
  recoveryPosition: LineoutPosition | null;
  recoveryPlayerId: string | null;
  visitedPositions: LineoutPosition[];
  throwingAttemptPositions: LineoutPosition[];
  defendingAttemptPositions: LineoutPosition[];
  reception: SoloReceptionResult | HandsDuelResult | null;
};

export type GroundRecoveryResult = {
  ballTeam: LineoutResolutionTeam;
  recoveryPosition: LineoutPosition | null;
  recoveryPlayerId: string | null;
  throwingCandidatePosition: LineoutPosition | null;
  throwingCandidatePlayerId: string | null;
  throwingScore: number | null;
  defendingCandidatePosition: LineoutPosition | null;
  defendingCandidatePlayerId: string | null;
  defendingScore: number | null;
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
  rng: RandomSource,
  situationalModifier = 0
): SoloReceptionResult {
  const hands = clamp(player.hands, SCORE.minimum, SCORE.maximum);
  const randomScore = randomFloat(SCORE.minimum, SCORE.maximum, rng);
  const placementModifier = calculatePlacementModifier(placements);
  const score = hands * CATCH.handsWeight
    + randomScore * CATCH.randomWeight
    + placementModifier
    + situationalModifier;

  if (score < CATCH.successThreshold) {
    return {
      outcome: "missed",
      score,
      hands,
      randomScore,
      placementModifier,
      situationalModifier,
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
    situationalModifier,
    knockOnRisk
  };
}

function calculateHandsDuelScore(
  player: FieldPlayer,
  rng: RandomSource,
  situationalModifier: number
): number {
  const hands = clamp(player.hands, SCORE.minimum, SCORE.maximum);
  return clamp(
    hands * CATCH.handsWeight
      + randomFloat(SCORE.minimum, SCORE.maximum, rng) * CATCH.randomWeight
      + situationalModifier,
    SCORE.minimum,
    SCORE.maximum
  );
}

export function resolveHandsDuel(
  throwingPlayer: FieldPlayer | undefined,
  defendingPlayer: FieldPlayer | undefined,
  rng: RandomSource,
  throwingSituationalModifier = 0,
  defendingSituationalModifier = throwingSituationalModifier
): HandsDuelResult {
  const throwingScore = throwingPlayer
    ? calculateHandsDuelScore(throwingPlayer, rng, throwingSituationalModifier)
    : null;
  const defendingScore = defendingPlayer
    ? calculateHandsDuelScore(defendingPlayer, rng, defendingSituationalModifier)
    : null;
  const throwingEligible = throwingScore !== null && throwingScore >= CATCH.successThreshold;
  const defendingEligible = defendingScore !== null && defendingScore >= CATCH.successThreshold;

  if (!throwingEligible && !defendingEligible) {
    return {
      outcome: "ballContinues",
      ballTeam: null,
      knockOnBy: null,
      throwingScore,
      defendingScore,
      throwingSituationalModifier,
      defendingSituationalModifier,
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
    throwingSituationalModifier,
    defendingSituationalModifier,
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
  directCatcherPosition: LineoutPosition,
  opponentAssignments: LineoutAssignments
): RecoveryPlacement[] {
  const opponentPositions = occupiedPositions(opponentAssignments);
  if (opponentPositions.length === 0) {
    return ["noNearbyOpponent"];
  }

  return opponentPositions.map((opponentPosition) => {
    const relativeOffset = directCatcherPosition - opponentPosition;
    if (relativeOffset === 1) return "oneAhead";
    if (relativeOffset === 2) return "twoAhead";
    if (relativeOffset === -1) return "oneBehind";
    return "furtherAway";
  });
}

export function resolveRecoverySequence(
  attempts: readonly RecoveryAttempt[],
  attackingAssignments: LineoutAssignments,
  defendingAssignments: LineoutAssignments,
  rng: RandomSource
): RecoverySequenceResult {
  const visitedPositions: LineoutPosition[] = [];
  const throwingAttemptPositions: LineoutPosition[] = [];
  const defendingAttemptPositions: LineoutPosition[] = [];

  for (const attempt of attempts) {
    const { position } = attempt;
    const throwingPlayer = attackingAssignments[position];
    const defendingPlayer = defendingAssignments[position];
    visitedPositions.push(position);
    if (throwingPlayer) throwingAttemptPositions.push(position);
    if (defendingPlayer) defendingAttemptPositions.push(position);

    if (!throwingPlayer && !defendingPlayer) {
      continue;
    }

    if (throwingPlayer && defendingPlayer) {
      const duel = resolveHandsDuel(
        throwingPlayer,
        defendingPlayer,
        rng,
        attempt.scoreModifier ?? 0
      );
      if (duel.outcome === "ballContinues") {
        continue;
      }
      return {
        outcome: duel.outcome,
        ballTeam: duel.ballTeam,
        knockOnBy: duel.knockOnBy,
        recoveryPosition: position,
        recoveryPlayerId: duel.winningPlayerId,
        visitedPositions,
        throwingAttemptPositions,
        defendingAttemptPositions,
        reception: duel
      };
    }

    const player = (throwingPlayer ?? defendingPlayer) as FieldPlayer;
    const ballTeam: LineoutResolutionTeam = throwingPlayer ? "throwingTeam" : "defendingTeam";
    const opponentAssignments = throwingPlayer ? defendingAssignments : attackingAssignments;
    const reception = resolveSoloReception(
      player,
      getRecoveryPlacements(position, opponentAssignments),
      rng,
      attempt.scoreModifier ?? 0
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
      throwingAttemptPositions,
      defendingAttemptPositions,
      reception
    };
  }

  return {
    outcome: "missed",
    ballTeam: null,
    knockOnBy: null,
    recoveryPosition: null,
    recoveryPlayerId: null,
    visitedPositions,
    throwingAttemptPositions,
    defendingAttemptPositions,
    reception: null
  };
}

export function resolveGroundRecovery(
  groundPosition: LineoutPosition,
  attackingAssignments: LineoutAssignments,
  defendingAssignments: LineoutAssignments,
  rng: RandomSource,
  useEqualTeamProbability: boolean
): GroundRecoveryResult {
  const throwingCandidate = nearestPlayerTo(groundPosition, attackingAssignments);
  const defendingCandidate = nearestPlayerTo(groundPosition, defendingAssignments);

  if (useEqualTeamProbability) {
    const preferredTeam = resolveLooseBall(rng);
    const winner = preferredTeam === "throwingTeam"
      ? throwingCandidate ?? defendingCandidate
      : defendingCandidate ?? throwingCandidate;
    const ballTeam = winner === throwingCandidate ? "throwingTeam" : "defendingTeam";
    return groundResult(
      ballTeam,
      winner,
      throwingCandidate,
      null,
      defendingCandidate,
      null
    );
  }

  const throwingScore = calculateGroundRecoveryScore(groundPosition, throwingCandidate, rng);
  const defendingScore = calculateGroundRecoveryScore(groundPosition, defendingCandidate, rng);
  const throwingWins = throwingScore !== null
    && (defendingScore === null || throwingScore >= defendingScore);
  const ballTeam: LineoutResolutionTeam = throwingWins ? "throwingTeam" : "defendingTeam";
  const winner = throwingWins ? throwingCandidate : defendingCandidate;

  return groundResult(
    ballTeam,
    winner,
    throwingCandidate,
    throwingScore,
    defendingCandidate,
    defendingScore
  );
}

function groundResult(
  ballTeam: LineoutResolutionTeam,
  winner: PositionedPlayer | null,
  throwingCandidate: PositionedPlayer | null,
  throwingScore: number | null,
  defendingCandidate: PositionedPlayer | null,
  defendingScore: number | null
): GroundRecoveryResult {
  return {
    ballTeam,
    recoveryPosition: winner?.position ?? null,
    recoveryPlayerId: winner?.player.id ?? null,
    throwingCandidatePosition: throwingCandidate?.position ?? null,
    throwingCandidatePlayerId: throwingCandidate?.player.id ?? null,
    throwingScore,
    defendingCandidatePosition: defendingCandidate?.position ?? null,
    defendingCandidatePlayerId: defendingCandidate?.player.id ?? null,
    defendingScore
  };
}

type PositionedPlayer = {
  position: LineoutPosition;
  player: FieldPlayer;
};

function nearestPlayerTo(
  groundPosition: LineoutPosition,
  assignments: LineoutAssignments
): PositionedPlayer | null {
  let nearest: PositionedPlayer | null = null;
  for (const position of occupiedPositions(assignments)) {
    const player = assignments[position];
    if (!player) continue;
    if (
      !nearest
      || Math.abs(position - groundPosition) < Math.abs(nearest.position - groundPosition)
    ) {
      nearest = { position, player };
    }
  }
  return nearest;
}

function calculateGroundRecoveryScore(
  groundPosition: LineoutPosition,
  candidate: PositionedPlayer | null,
  rng: RandomSource
): number | null {
  if (!candidate) return null;
  return candidate.player.hands * CATCH.handsWeight
    + randomFloat(SCORE.minimum, SCORE.maximum, rng) * CATCH.randomWeight
    - Math.abs(candidate.position - groundPosition)
      * CATCH.secondaryRecovery.groundDistancePenaltyPerPosition;
}

export function resolveHighBallCascade(
  targetPosition: LineoutPosition,
  attackingAssignments: LineoutAssignments,
  defendingAssignments: LineoutAssignments,
  rng: RandomSource
): HighBallCascadeResult {
  const visitedPositions: LineoutPosition[] = [];
  const startPosition = targetPosition + CATCH.secondaryRecovery.firstBehindOffset;

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
