import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { Division } from "../models/Division.ts";
import type { LineoutResolution } from "../models/Lineout.ts";
import type {
  MatchBallOwner,
  MatchLineoutEvent,
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
  let current = { ...match };
  const endMinute = Math.min(targetMinute, match.maxMinute);
  while (current.minute < endMinute) {
    const stepMinutes = Math.min(
      BALANCE.simulationStepMinutes,
      endMinute - current.minute
    );
    current = simulateStep(current, stepMinutes, randomSource);
  }
  return current;
}

export function advanceToNextScheduledLineout(
  match: MatchStateData,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): MatchStateData {
  const event = match.lineouts[match.currentLineoutIndex];
  if (!event) return advanceMatchSimulation(match, match.maxMinute, randomSource);
  const advanced = advanceMatchSimulation(match, event.minute, randomSource);
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
  return { ...advanced, ballPositionMeters, lineouts };
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
  let next = changePossession(match, nextOwner);
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
): MatchStateData {
  let next = accumulateTimes(match, stepMinutes);
  const ownerBeforeMovement = next.ballOwner;
  const movement = resolveMovement(next, randomSource);
  next = {
    ...next,
    minute: next.minute + stepMinutes,
    ballPositionMeters: clamp(
      next.ballPositionMeters + movement,
      0,
      BALANCE.pitchLengthMeters
    )
  };

  if (isProgressTowardLine(ownerBeforeMovement, movement)) {
    next = addPressureIfAttacking22(next, ownerBeforeMovement, BALANCE.pressure.progressTowardLine);
  } else {
    next = addPressureIfAttacking22(next, ownerBeforeMovement, BALANCE.pressure.normalRetention);
  }

  if (randomFloat(0, 1, randomSource) < getTurnoverProbability(stepMinutes)) {
    next = changePossession(next, oppositeOwner(next.ballOwner));
  }

  next = attemptPressureScore(next, stepMinutes, randomSource);
  return updateDerivedPercentages(next);
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
      + (match.ballPositionMeters < 50 ? stepMinutes : 0)
  };
}

function resolveMovement(match: MatchStateData, randomSource: RandomSource): number {
  const owner = match.ballOwner;
  const ownerTeam = owner === "player" ? match.home : match.away;
  const opponentTeam = owner === "player" ? match.away : match.home;
  const skillAdjustment = clamp(
    (getTeamSkill(ownerTeam) - getTeamSkill(opponentTeam)) / 100,
    -BALANCE.maximumSkillProbabilityAdjustment,
    BALANCE.maximumSkillProbabilityAdjustment
  );
  const strongProbability = BALANCE.movement.strongProgress.probability + skillAdjustment;
  const normalLimit = strongProbability + BALANCE.movement.normalProgress.probability;
  const stagnationLimit = normalLimit + BALANCE.movement.stagnation.probability;
  const roll = randomFloat(0, 1, randomSource);
  const ownerDirection = owner === "player" ? 1 : -1;

  if (roll < strongProbability) {
    return ownerDirection * randomFloat(
      BALANCE.movement.strongProgress.minimumMeters,
      BALANCE.movement.strongProgress.maximumMeters,
      randomSource
    );
  }
  if (roll < normalLimit) {
    return ownerDirection * randomFloat(
      BALANCE.movement.normalProgress.minimumMeters,
      BALANCE.movement.normalProgress.maximumMeters,
      randomSource
    );
  }
  if (roll < stagnationLimit) {
    return randomFloat(
      BALANCE.movement.stagnation.minimumMeters,
      BALANCE.movement.stagnation.maximumMeters,
      randomSource
    );
  }
  return -ownerDirection * randomFloat(
    BALANCE.movement.retreat.minimumMeters,
    BALANCE.movement.retreat.maximumMeters,
    randomSource
  );
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
  return {
    ...match,
    ourScore: match.ourScore + (scoringOwner === "player" ? points : 0),
    opponentScore: match.opponentScore + (scoringOwner === "opponent" ? points : 0),
    ballPositionMeters: BALANCE.restartPositionMeters,
    ballOwner: oppositeOwner(scoringOwner),
    playerAttackingPressure: 0,
    opponentAttackingPressure: 0
  };
}

function changePossession(match: MatchStateData, owner: MatchBallOwner): MatchStateData {
  if (owner === match.ballOwner) return match;
  return setPressure({ ...match, ballOwner: owner }, match.ballOwner, 0);
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
