import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { Division } from "../models/Division.ts";
import type { LineoutResolution } from "../models/Lineout.ts";
import type {
  MatchBallOwner,
  MatchLineoutEvent,
  MatchSimulationAction,
  MatchSimulationActionKind,
  MatchStateData,
  TouchCause
} from "../models/Match.ts";
import type { Team } from "../models/Team.ts";
import { generateMaximumFatiguePercent } from "./LineoutThrowResolver.ts";
import { clamp } from "../utils/Clamp.ts";
import {
  MATH_RANDOM_SOURCE,
  randomFloat,
  randomInt,
  type RandomSource
} from "../utils/Random.ts";

const BALANCE = LINEOUT_BALANCE.match;

export type MatchSimulationTrace = {
  match: MatchStateData;
  frames: MatchStateData[];
  actions: MatchSimulationAction[];
};

type MovementResolution = {
  meters: number;
  kind: "handPlay" | "ruck" | "clearanceKick" | "breakthrough";
};

const PLAYER_THROW_CAUSES: TouchCause[] = [
  "carrierIntoTouch",
  "openPlayKick",
  "penaltyKick",
  "fiftyTwenty",
  "deflection"
];
const OPPONENT_THROW_CAUSES: TouchCause[] = [
  "carrierIntoTouch",
  "openPlayKick",
  "penaltyKick",
  "fiftyTwenty",
  "deflection"
];

export function generateMatchLineouts(
  division: Division,
  maxMinute: number,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchLineoutEvent[] {
  const quotaPerTeam = randomInt(division.minLineouts, division.maxLineouts, randomSource);
  const total = quotaPerTeam * 2;
  const minimumRequiredEndMinute = 1 + (total - 1) * BALANCE.minimumMinutesBetweenLineouts;
  if (minimumRequiredEndMinute > maxMinute) {
    throw new RangeError(
      `${total} lineouts require match end minute ${minimumRequiredEndMinute} or later`
    );
  }
  const slack = maxMinute - minimumRequiredEndMinute;
  const offsets = Array.from(
    { length: total },
    () => randomInt(0, Math.max(0, slack), randomSource)
  ).sort((left, right) => left - right);
  const throwingSides = shuffle([
    ...Array.from({ length: quotaPerTeam }, () => "us" as const),
    ...Array.from({ length: quotaPerTeam }, () => "opponent" as const)
  ], randomSource);

  return throwingSides.map((throwingSide, index) => ({
    id: `lineout_${index + 1}`,
    minute: 1 + index * BALANCE.minimumMinutesBetweenLineouts + offsets[index],
    pitchZone: "middle",
    throwingSide,
    numberOfPlayers: 7,
    cause: randomCause(throwingSide, randomSource),
    resolved: false
  }));
}

export function generateMatchSchedule(
  division: Division,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): { maxMinute: number; quotaPerTeam: number; lineouts: MatchLineoutEvent[] } {
  const quotaPerTeam = randomInt(division.minLineouts, division.maxLineouts, randomSource);
  const maxMinute = chooseMatchEndMinute(quotaPerTeam, randomSource);
  return {
    maxMinute,
    quotaPerTeam,
    lineouts: generateLineoutsForQuota(quotaPerTeam, maxMinute, randomSource)
  };
}

export function chooseMatchEndMinute(
  quotaPerTeam: number,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): number {
  const minimumForQuota = 1
    + (quotaPerTeam * 2 - 1) * BALANCE.minimumMinutesBetweenLineouts;
  const minimum = Math.max(BALANCE.minimumEndMinute, minimumForQuota);
  if (minimum > BALANCE.maximumEndMinute) {
    throw new RangeError("Lineout quota cannot fit before the configured maximum match minute");
  }
  return randomInt(minimum, BALANCE.maximumEndMinute, randomSource);
}

export function advanceMatchSimulation(
  match: MatchStateData,
  targetMinute: number,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchStateData {
  return advanceMatchSimulationWithTrace(match, targetMinute, randomSource).match;
}

export function advanceMatchSimulationWithTrace(
  match: MatchStateData,
  targetMinute: number,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchSimulationTrace {
  let current = { ...match };
  const frames: MatchStateData[] = [];
  const actions: MatchSimulationAction[] = [];
  const endMinute = Math.min(targetMinute, match.maxMinute);
  while (current.minute < endMinute) {
    const stepMinutes = Math.min(
      BALANCE.simulationStepMinutes,
      endMinute - current.minute
    );
    const step = simulateStep(current, stepMinutes, randomSource);
    const ballLateralPosition = resolveActionLateralPosition(
      current.ballLateralPosition ?? 0,
      step.action.kind,
      actions.length
    );
    current = { ...step.state, ballLateralPosition };
    frames.push(current);
    actions.push({ ...step.action, state: current });
  }
  return { match: current, frames, actions };
}

export function advanceToNextScheduledLineout(
  match: MatchStateData,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchStateData {
  return advanceToNextScheduledLineoutWithTrace(match, randomSource).match;
}

export function advanceToNextScheduledLineoutWithTrace(
  match: MatchStateData,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchSimulationTrace {
  const event = match.lineouts[match.currentLineoutIndex];
  if (!event) return advanceMatchSimulationWithTrace(match, match.maxMinute, randomSource);
  const trace = advanceMatchSimulationWithTrace(match, event.minute, randomSource);
  const advanced = trace.match;
  const ballPositionMeters = clamp(
    advanced.ballPositionMeters + randomFloat(
      -BALANCE.lineoutPositionVariationMeters,
      BALANCE.lineoutPositionVariationMeters,
      randomSource
    ),
    0,
    BALANCE.pitchLengthMeters
  );
  const lineouts = advanced.lineouts.map((item, index) => (
    index === advanced.currentLineoutIndex
      ? {
        ...item,
        ballPositionMeters,
        pitchZone: getPitchZoneFromPosition(ballPositionMeters)
      }
      : item
  ));
  const currentLateralPosition = clamp(advanced.ballLateralPosition ?? 0, -1, 1);
  const lineoutSide = Math.abs(currentLateralPosition) >= 0.55
    ? Math.sign(currentLateralPosition)
    : advanced.currentLineoutIndex % 2 === 0 ? -1 : 1;
  const ballLateralPosition = lineoutSide * 0.92;
  const finalMatch = { ...advanced, ballPositionMeters, ballLateralPosition, lineouts };
  return {
    match: finalMatch,
    frames: [...trace.frames, finalMatch],
    actions: [
      ...trace.actions,
      {
        kind: "lineout",
        state: finalMatch,
        distanceMeters: Math.abs(finalMatch.ballPositionMeters - advanced.ballPositionMeters)
      }
    ]
  };
}

export function generateMatchMaximumFatigue(
  home: Team,
  away: Team,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Record<string, number> {
  const players = [
    home.hooker,
    ...home.lineoutPlayers,
    away.hooker,
    ...away.lineoutPlayers
  ];
  return Object.fromEntries(
    players.map((player) => [player.id, generateMaximumFatiguePercent(randomSource)])
  );
}

export function applyLineoutResolutionToMatch(
  match: MatchStateData,
  resolution: LineoutResolution,
  throwingSide: "us" | "opponent",
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchStateData {
  const throwingOwner: MatchBallOwner = throwingSide === "us" ? "player" : "opponent";
  const defendingOwner = oppositeOwner(throwingOwner);
  const nextOwner = resolution.ballTeam === "throwingTeam" ? throwingOwner : defendingOwner;
  let next: MatchStateData = {
    ...changePossession(match, nextOwner),
    possessionDurationMinutes: 0
  };
  const throwingLost = nextOwner !== throwingOwner;

  if (throwingLost || resolution.outcome === "knockOn" || resolution.outcome === "notStraight") {
    next = setPressure(next, throwingOwner, 0);
  }

  if (resolution.outcome === "cleanWin") {
    next = addPressureIfAttacking22(next, throwingOwner, BALANCE.pressure.cleanWin);
  } else if (resolution.outcome === "scrappyWin") {
    next = addPressureIfAttacking22(next, throwingOwner, BALANCE.pressure.scrappyWin);
  } else if (
    nextOwner === defendingOwner
    && (resolution.outcome === "cleanSteal" || resolution.outcome === "deflectedTurnover")
  ) {
    next = addPressureIfAttacking22(next, defendingOwner, BALANCE.pressure.steal);
  }

  if (
    nextOwner === throwingOwner
    && (resolution.outcome === "cleanWin" || resolution.outcome === "scrappyWin")
  ) {
    const scoreBefore = next.ourScore + next.opponentScore;
    next = attemptImmediateLineoutTry(next, throwingOwner, resolution.outcome, randomSource);
    const scoreAfter = next.ourScore + next.opponentScore;
    if (resolution.outcome === "cleanWin" && scoreAfter === scoreBefore) {
      next = moveTowardAttackingLine(next, throwingOwner, BALANCE.cleanLineoutProgressMeters);
    }
  }

  return updateDerivedPercentages(next);
}

/** @deprecated Use applyLineoutResolutionToMatch with the official resolution. */
export function updateMatchAfterLineout(match: MatchStateData): MatchStateData {
  return updateDerivedPercentages(match);
}

export function getPitchZoneFromPosition(positionMeters: number): MatchLineoutEvent["pitchZone"] {
  const position = clamp(positionMeters, 0, BALANCE.pitchLengthMeters);
  if (position <= 22) return "our_22";
  if (position < 50) return "our_half";
  if (position === 50) return "middle";
  if (position < 78) return "their_half";
  return "their_22";
}

export function getTurnoverProbability(stepMinutes: number): number {
  return 1 - Math.pow(1 - BALANCE.turnoverProbabilityPerMinute, stepMinutes);
}

export function getBreakthroughProbability(
  stepMinutes: number,
  lateralPosition: number
): number {
  const wingFactor = Math.abs(clamp(lateralPosition, -1, 1));
  const multiplier = BALANCE.breakthrough.centerProbabilityMultiplier
    + (BALANCE.breakthrough.wingProbabilityMultiplier
      - BALANCE.breakthrough.centerProbabilityMultiplier) * wingFactor;
  return 1 - Math.pow(
    1 - clamp(BALANCE.breakthrough.probabilityPerMinute * multiplier, 0, 1),
    stepMinutes
  );
}

export function getRealSecondsForSimulatedMinutes(simulatedMinutes: number): number {
  return simulatedMinutes / BALANCE.simulatedMinutesPerRealSecond;
}

export function getDistanceToNearestTryLine(positionMeters: number): number {
  const normalizedPosition = Math.min(100, Math.max(0, positionMeters));
  return Math.min(normalizedPosition, 100 - normalizedPosition);
}

function simulateStep(
  match: MatchStateData,
  stepMinutes: number,
  randomSource: RandomSource
): { state: MatchStateData; action: MatchSimulationAction } {
  let next = accumulateTimes(match, stepMinutes);
  const ownerBeforeMovement = next.ballOwner;
  const scoreBefore = next.ourScore + next.opponentScore;
  const movement = resolveMovement(next, stepMinutes, randomSource);
  next = {
    ...next,
    minute: next.minute + stepMinutes,
    ballPositionMeters: clamp(
      next.ballPositionMeters + movement.meters,
      0,
      BALANCE.pitchLengthMeters
    )
  };

  if (isProgressTowardLine(ownerBeforeMovement, movement.meters)) {
    next = addPressureIfAttacking22(next, ownerBeforeMovement, BALANCE.pressure.progressTowardLine);
  } else {
    next = addPressureIfAttacking22(next, ownerBeforeMovement, BALANCE.pressure.normalRetention);
  }

  if (movement.kind === "clearanceKick") {
    next = changePossession(next, oppositeOwner(ownerBeforeMovement));
  } else if (
    (next.possessionDurationMinutes ?? 0) >= BALANCE.minimumPossessionMinutesBeforeTurnover
    && randomFloat(0, 1, randomSource) < getTurnoverProbability(stepMinutes)
  ) {
    next = changePossession(next, oppositeOwner(next.ballOwner));
  }

  next = attemptPressureScore(next, stepMinutes, randomSource);
  next = updateDerivedPercentages(next);

  let kind: MatchSimulationActionKind = movement.kind;
  if (next.ourScore + next.opponentScore > scoreBefore) {
    kind = "score";
  } else if (
    next.ballOwner !== ownerBeforeMovement
    && movement.kind !== "clearanceKick"
    && movement.kind !== "breakthrough"
  ) {
    kind = "turnover";
  }
  return {
    state: next,
    action: {
      kind,
      state: next,
      distanceMeters: Math.abs(movement.meters)
    }
  };
}

function accumulateTimes(match: MatchStateData, stepMinutes: number): MatchStateData {
  return {
    ...match,
    playerPossessionTimeMinutes: match.playerPossessionTimeMinutes
      + (match.ballOwner === "player" ? stepMinutes : 0),
    opponentPossessionTimeMinutes: match.opponentPossessionTimeMinutes
      + (match.ballOwner === "opponent" ? stepMinutes : 0),
    playerOccupationTimeMinutes: match.playerOccupationTimeMinutes
      + (match.ballPositionMeters > 50 ? stepMinutes : 0),
    opponentOccupationTimeMinutes: match.opponentOccupationTimeMinutes
      + (match.ballPositionMeters < 50 ? stepMinutes : 0),
    possessionDurationMinutes: (match.possessionDurationMinutes ?? 0) + stepMinutes
  };
}

function resolveMovement(
  match: MatchStateData,
  stepMinutes: number,
  randomSource: RandomSource
): MovementResolution {
  const owner = match.ballOwner;
  const ownerTeam = owner === "player" ? match.home : match.away;
  const opponentTeam = owner === "player" ? match.away : match.home;
  const skillAdjustment = clamp(
    (getTeamSkill(ownerTeam) - getTeamSkill(opponentTeam)) / 100,
    -BALANCE.maximumSkillProbabilityAdjustment,
    BALANCE.maximumSkillProbabilityAdjustment
  );
  if (
    isInOwn22(match, owner)
    && randomFloat(0, 1, randomSource) < BALANCE.clearanceKick.probabilityFromOwn22
  ) {
    const landingPosition = owner === "player"
      ? randomFloat(
        BALANCE.clearanceKick.playerLandingMinimumMeters,
        BALANCE.clearanceKick.playerLandingMaximumMeters,
        randomSource
      )
      : randomFloat(
        BALANCE.clearanceKick.opponentLandingMinimumMeters,
        BALANCE.clearanceKick.opponentLandingMaximumMeters,
        randomSource
      );
    return { meters: landingPosition - match.ballPositionMeters, kind: "clearanceKick" };
  }

  const breakthroughProbability = getBreakthroughProbability(
    stepMinutes,
    match.ballLateralPosition ?? 0
  );
  if (randomFloat(0, 1, randomSource) < breakthroughProbability) {
    return {
      meters: (owner === "player" ? 1 : -1) * randomFloat(
        BALANCE.breakthrough.minimumMeters,
        BALANCE.breakthrough.maximumMeters,
        randomSource
      ),
      kind: "breakthrough"
    };
  }

  const strongProbability = BALANCE.movement.strongProgress.probability + skillAdjustment;
  const normalLimit = strongProbability + BALANCE.movement.normalProgress.probability;
  const stagnationLimit = normalLimit + BALANCE.movement.stagnation.probability;
  const roll = randomFloat(0, 1, randomSource);
  const ownerDirection = owner === "player" ? 1 : -1;

  if (roll < strongProbability) {
    return {
      meters: ownerDirection * randomFloat(
        BALANCE.movement.strongProgress.minimumMeters,
        BALANCE.movement.strongProgress.maximumMeters,
        randomSource
      ),
      kind: "handPlay"
    };
  }
  if (roll < normalLimit) {
    return {
      meters: ownerDirection * randomFloat(
        BALANCE.movement.normalProgress.minimumMeters,
        BALANCE.movement.normalProgress.maximumMeters,
        randomSource
      ),
      kind: "handPlay"
    };
  }
  if (roll < stagnationLimit) {
    return {
      meters: randomFloat(
        BALANCE.movement.stagnation.minimumMeters,
        BALANCE.movement.stagnation.maximumMeters,
        randomSource
      ),
      kind: "ruck"
    };
  }
  return {
    meters: -ownerDirection * randomFloat(
      BALANCE.movement.retreat.minimumMeters,
      BALANCE.movement.retreat.maximumMeters,
      randomSource
    ),
    kind: "ruck"
  };
}

function resolveActionLateralPosition(
  currentPosition: number,
  kind: MatchSimulationActionKind,
  actionIndex: number
): number {
  const current = clamp(currentPosition, -1, 1);
  if (kind === "breakthrough" || kind === "score") return current;
  if (kind === "ruck") return current * 0.55;
  if (kind === "clearanceKick") return actionIndex % 2 === 0 ? -0.4 : 0.4;
  const lanes = BALANCE.visualSimulation.passLateralLaneRatios;
  return lanes[actionIndex % lanes.length];
}

function isInOwn22(match: MatchStateData, owner: MatchBallOwner): boolean {
  return owner === "player"
    ? match.ballPositionMeters <= 22
    : match.ballPositionMeters >= 78;
}

function attemptPressureScore(
  match: MatchStateData,
  stepMinutes: number,
  randomSource: RandomSource
): MatchStateData {
  const owner = match.ballOwner;
  if (getPressure(match, owner) < BALANCE.attackingPressureThreshold) return match;
  const probability = 1 - Math.pow(
    1 - BALANCE.scoringOpportunityProbabilityPerMinute,
    stepMinutes
  );
  if (randomFloat(0, 1, randomSource) >= probability) return match;

  if (isInAttacking22(match, owner)) {
    return scoreTry(match, owner, randomSource);
  }
  if (randomFloat(0, 1, randomSource) < BALANCE.penaltyProbabilityOutsideAttacking22) {
    return applyScore(match, owner, BALANCE.points.penalty);
  }
  return match;
}

function attemptImmediateLineoutTry(
  match: MatchStateData,
  owner: MatchBallOwner,
  outcome: "cleanWin" | "scrappyWin",
  randomSource: RandomSource
): MatchStateData {
  const distance = distanceToAttackingLine(match, owner);
  if (distance > 22) return match;
  const bracket = distance <= 7
    ? BALANCE.immediateTryProbability.distance0To7
    : distance <= 15
      ? BALANCE.immediateTryProbability.distance8To15
      : BALANCE.immediateTryProbability.distance16To22;
  const probability = outcome === "cleanWin" ? bracket.cleanWin : bracket.scrappyWin;
  return randomFloat(0, 1, randomSource) < probability
    ? scoreTry(match, owner, randomSource)
    : match;
}

function scoreTry(
  match: MatchStateData,
  owner: MatchBallOwner,
  randomSource: RandomSource
): MatchStateData {
  const points = randomFloat(0, 1, randomSource) < BALANCE.conversionSuccessProbability
    ? BALANCE.points.convertedTry
    : BALANCE.points.unconvertedTry;
  return applyScore(match, owner, points);
}

function applyScore(
  match: MatchStateData,
  scoringOwner: MatchBallOwner,
  points: number
): MatchStateData {
  const receivingOwner = scoringOwner;
  const kickoffDirection = scoringOwner === "player" ? -1 : 1;
  return {
    ...match,
    ourScore: match.ourScore + (scoringOwner === "player" ? points : 0),
    opponentScore: match.opponentScore + (scoringOwner === "opponent" ? points : 0),
    ballPositionMeters: clamp(
      BALANCE.restartPositionMeters + kickoffDirection * BALANCE.restartKickDistanceMeters,
      0,
      BALANCE.pitchLengthMeters
    ),
    ballOwner: receivingOwner,
    possessionDurationMinutes: 0,
    playerAttackingPressure: 0,
    opponentAttackingPressure: 0
  };
}

function changePossession(match: MatchStateData, owner: MatchBallOwner): MatchStateData {
  if (owner === match.ballOwner) return match;
  return setPressure({ ...match, ballOwner: owner, possessionDurationMinutes: 0 }, match.ballOwner, 0);
}

function moveTowardAttackingLine(
  match: MatchStateData,
  owner: MatchBallOwner,
  meters: number
): MatchStateData {
  return {
    ...match,
    ballPositionMeters: clamp(
      match.ballPositionMeters + (owner === "player" ? meters : -meters),
      0,
      BALANCE.pitchLengthMeters
    )
  };
}

function addPressureIfAttacking22(
  match: MatchStateData,
  owner: MatchBallOwner,
  amount: number
): MatchStateData {
  return isInAttacking22(match, owner)
    ? setPressure(match, owner, getPressure(match, owner) + amount)
    : match;
}

function setPressure(match: MatchStateData, owner: MatchBallOwner, value: number): MatchStateData {
  return owner === "player"
    ? { ...match, playerAttackingPressure: Math.max(0, value) }
    : { ...match, opponentAttackingPressure: Math.max(0, value) };
}

function getPressure(match: MatchStateData, owner: MatchBallOwner): number {
  return owner === "player"
    ? match.playerAttackingPressure
    : match.opponentAttackingPressure;
}

function isInAttacking22(match: MatchStateData, owner: MatchBallOwner): boolean {
  return distanceToAttackingLine(match, owner) <= 22;
}

function distanceToAttackingLine(match: MatchStateData, owner: MatchBallOwner): number {
  return owner === "player"
    ? BALANCE.pitchLengthMeters - match.ballPositionMeters
    : match.ballPositionMeters;
}

function isProgressTowardLine(owner: MatchBallOwner, movement: number): boolean {
  return owner === "player" ? movement > 0 : movement < 0;
}

function updateDerivedPercentages(match: MatchStateData): MatchStateData {
  const elapsed = match.playerPossessionTimeMinutes + match.opponentPossessionTimeMinutes;
  return {
    ...match,
    possession: elapsed > 0 ? match.playerPossessionTimeMinutes / elapsed * 100 : 50,
    occupation: elapsed > 0 ? match.playerOccupationTimeMinutes / elapsed * 100 : 50
  };
}

function getTeamSkill(team: Team): number {
  const playerStats = team.lineoutPlayers.flatMap((player) => [
    player.jump,
    player.lift,
    player.hands
  ]);
  const allStats = [...playerStats, team.hooker.throwing];
  return allStats.reduce((sum, value) => sum + value, 0) / Math.max(1, allStats.length);
}

function oppositeOwner(owner: MatchBallOwner): MatchBallOwner {
  return owner === "player" ? "opponent" : "player";
}

function randomCause(
  throwingSide: "us" | "opponent",
  randomSource: RandomSource
): TouchCause {
  const causes = throwingSide === "us" ? PLAYER_THROW_CAUSES : OPPONENT_THROW_CAUSES;
  return causes[randomInt(0, causes.length - 1, randomSource)];
}

function generateLineoutsForQuota(
  quotaPerTeam: number,
  maxMinute: number,
  randomSource: RandomSource
): MatchLineoutEvent[] {
  const division = {
    minLineouts: quotaPerTeam,
    maxLineouts: quotaPerTeam
  } as Division;
  return generateMatchLineouts(division, maxMinute, randomSource);
}

function shuffle<T>(values: T[], randomSource: RandomSource): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, randomSource);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
