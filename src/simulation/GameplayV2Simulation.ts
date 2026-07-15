import { chooseAiOffensiveLineout, predictDefensiveTarget, type AiFieldZone, type PreviousAiLineout } from "../ai/LineoutAiSelection.ts";
import { createEmptyOpponentAiMemory } from "../ai/LineoutMemory.ts";
import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { DIVISIONS } from "../data/divisions.ts";
import type { Combination, LineoutPosition } from "../models/Combination.ts";
import type { Division, DivisionId } from "../models/Division.ts";
import type { LineoutAssignments, LineoutOutcome, LineoutResolution, LineoutTrajectory } from "../models/Lineout.ts";
import type { OpponentAiIdentity, OpponentAiMemory } from "../models/LineoutAI.ts";
import type { MatchStateData } from "../models/Match.ts";
import type { Team } from "../models/Team.ts";
import { resolveLineoutV2 } from "../rules/LineoutV2Resolver.ts";
import {
  applyLineoutResolutionToMatch,
  advanceMatchSimulation,
  advanceToNextScheduledLineout,
  generateMatchMaximumFatigue,
  generateMatchSchedule
} from "../rules/MatchSimulator.ts";
import { calculateCurrentFatiguePercent, generateMaximumFatiguePercent, resolveLineoutThrow } from "../rules/LineoutThrowResolver.ts";
import { generateTeamForDivision } from "../rules/TeamGeneration.ts";
import { createSeededRandom, randomInt, type RandomSource } from "../utils/Random.ts";

const OUTCOMES: LineoutOutcome[] = [
  "cleanWin",
  "scrappyWin",
  "deflectedTurnover",
  "cleanSteal",
  "knockOn",
  "notStraight",
  "looseBall"
];
const TRAJECTORIES: LineoutTrajectory[] = ["notStraight", "precise", "low", "high"];

export type GameplayV2SimulationOptions = {
  seed?: number;
  throwIterationsPerCell?: number;
  lineoutsPerDivision?: number;
  aiPredictionsPerDivision?: number;
  matchesPerDivision?: number;
};

export type SimulateLineoutsOptions = {
  iterations: number;
  teams?: readonly [Team, Team];
  context: {
    division: Division;
    zone?: AiFieldZone;
    minute?: number;
  };
  seed: number;
};

export type SimulateMatchesOptions = {
  iterations: number;
  teams?: readonly [Team, Team];
  division: Division;
  seed: number;
};

export type ThrowingSimulationRow = {
  throwing: number;
  targetPosition: LineoutPosition;
  distanceIndex: number;
  samples: number;
  straightRate: number;
  trajectoryRates: Record<LineoutTrajectory, number>;
};

export type PositionEffectiveness = {
  targetPosition: LineoutPosition;
  samples: number;
  retentionRate: number;
  cleanWinRate: number;
  turnoverRate: number;
  knockOnRate: number;
};

export type DivisionLineoutSimulation = {
  divisionId: DivisionId;
  samples: number;
  outcomeRates: Record<LineoutOutcome, number>;
  trajectoryRates: Record<LineoutTrajectory, number>;
  throwingRetentionRate: number;
  positionEffectiveness: PositionEffectiveness[];
};

export type AiPreparationSimulation = {
  divisionId: DivisionId;
  samplesPerScenario: number;
  habitualTargetPosition: LineoutPosition;
  noPreparationAccuracy: number;
  fullPreparationAccuracy: number;
  accuracyGain: number;
};

export type MatchImpactSimulation = {
  divisionId: DivisionId;
  matches: number;
  averageTotalPoints: number;
  averageDirectLineoutPoints: number;
  directLineoutPointShare: number;
  matchesWithDirectLineoutPointsRate: number;
  matchesDecidedWithinDirectLineoutPointsRate: number;
};

export type GameplayV2SimulationReport = {
  seed: number;
  parameters: Required<Omit<GameplayV2SimulationOptions, "seed">>;
  throwingByStatAndDistance: ThrowingSimulationRow[];
  divisions: DivisionLineoutSimulation[];
  aiPreparation: AiPreparationSimulation[];
  matchImpact: MatchImpactSimulation[];
};

type MutablePositionCounter = {
  samples: number;
  retained: number;
  cleanWins: number;
  turnovers: number;
  knockOns: number;
};

type SimulatedLineout = {
  resolution: LineoutResolution;
  trajectory: LineoutTrajectory;
  targetPosition: LineoutPosition;
  combinationId: string;
};

export function runGameplayV2Simulation(
  options: GameplayV2SimulationOptions = {}
): GameplayV2SimulationReport {
  const seed = normalizePositiveInteger(options.seed, 20260715);
  const parameters = {
    throwIterationsPerCell: normalizePositiveInteger(options.throwIterationsPerCell, 5000),
    lineoutsPerDivision: normalizePositiveInteger(options.lineoutsPerDivision, 2000),
    aiPredictionsPerDivision: normalizePositiveInteger(options.aiPredictionsPerDivision, 1000),
    matchesPerDivision: normalizePositiveInteger(options.matchesPerDivision, 200)
  };

  return {
    seed,
    parameters,
    throwingByStatAndDistance: simulateThrowingMatrix(parameters.throwIterationsPerCell, seed + 1),
    divisions: simulateDivisionLineouts(parameters.lineoutsPerDivision, seed + 2),
    aiPreparation: simulateAiPreparation(parameters.aiPredictionsPerDivision, seed + 3),
    matchImpact: simulateMatchImpact(parameters.matchesPerDivision, seed + 4)
  };
}

export function simulateThrowingMatrix(
  iterationsPerCell: number,
  seed: number
): ThrowingSimulationRow[] {
  const samples = normalizePositiveInteger(iterationsPerCell, 1);
  const rng = createSeededRandom(seed);
  const rows: ThrowingSimulationRow[] = [];

  for (const throwing of [60, 70, 80, 90, 100]) {
    for (let position = 1; position <= 7; position += 1) {
      const targetPosition = position as LineoutPosition;
      const trajectoryCounts = createCountRecord(TRAJECTORIES);
      let distanceIndex = 0;
      for (let iteration = 0; iteration < samples; iteration += 1) {
        const result = resolveLineoutThrow({
          throwing,
          targetPosition,
          fatiguePercent: 0,
          rng
        });
        distanceIndex = result.throwing.distanceIndex;
        trajectoryCounts[result.trajectory.trajectory] += 1;
      }
      rows.push({
        throwing,
        targetPosition,
        distanceIndex,
        samples,
        straightRate: 1 - trajectoryCounts.notStraight / samples,
        trajectoryRates: toRates(trajectoryCounts, samples)
      });
    }
  }
  return rows;
}

export function simulateDivisionLineouts(
  lineoutsPerDivision: number,
  seed: number
): DivisionLineoutSimulation[] {
  const samples = normalizePositiveInteger(lineoutsPerDivision, 1);
  return DIVISIONS.map((division, divisionIndex) => simulateLineouts({
    iterations: samples,
    context: { division },
    seed: seed + divisionIndex * 1009
  }));
}

export function simulateLineouts(options: SimulateLineoutsOptions): DivisionLineoutSimulation {
  const samples = normalizePositiveInteger(options.iterations, 1);
  const rng = createSeededRandom(options.seed);
  const [home, away] = options.teams ?? createTeamPair(options.context.division, rng);
  const outcomeCounts = createCountRecord(OUTCOMES);
  const trajectoryCounts = createCountRecord(TRAJECTORIES);
  const positions = createPositionCounters();
  let retained = 0;
  let previousHome: PreviousAiLineout | undefined;
  let previousAway: PreviousAiLineout | undefined;

  for (let iteration = 0; iteration < samples; iteration += 1) {
    const throwingTeam = iteration % 2 === 0 ? home : away;
    const defendingTeam = iteration % 2 === 0 ? away : home;
    const previous = iteration % 2 === 0 ? previousHome : previousAway;
    const simulated = simulateTeamLineout(
      throwingTeam,
      defendingTeam,
      options.context.division,
      options.context.zone ?? getRotatingAiZone(iteration),
      previous,
      options.context.minute ?? randomInt(1, 80, rng),
      rng
    );
    outcomeCounts[simulated.resolution.outcome] += 1;
    trajectoryCounts[simulated.trajectory] += 1;
    const position = positions[simulated.targetPosition];
    position.samples += 1;
    if (simulated.resolution.ballTeam === "throwingTeam") {
      retained += 1;
      position.retained += 1;
    }
    if (simulated.resolution.outcome === "cleanWin") position.cleanWins += 1;
    if (simulated.resolution.outcome === "knockOn") position.knockOns += 1;
    if (
      simulated.resolution.outcome === "cleanSteal"
      || simulated.resolution.outcome === "deflectedTurnover"
    ) position.turnovers += 1;
    const nextPrevious = toPrevious(simulated);
    if (iteration % 2 === 0) previousHome = nextPrevious;
    else previousAway = nextPrevious;
  }

  return {
    divisionId: options.context.division.id,
    samples,
    outcomeRates: toRates(outcomeCounts, samples),
    trajectoryRates: toRates(trajectoryCounts, samples),
    throwingRetentionRate: retained / samples,
    positionEffectiveness: buildPositionEffectiveness(positions)
  };
}

export function simulateAiPreparation(
  predictionsPerDivision: number,
  seed: number
): AiPreparationSimulation[] {
  const samples = normalizePositiveInteger(predictionsPerDivision, 1);
  return DIVISIONS.map((division, divisionIndex) => {
    const teamRng = createSeededRandom(seed + divisionIndex * 1013);
    const [team] = createTeamPair(division, teamRng);
    const combination = getCombinationWithMostTargets(team);
    const target = combination.targetOptions?.[0];
    if (!target) throw new Error(`No target option available for ${division.id}`);
    const habitualTargetPosition = target.targetPosition;
    const memory = createPreparedMemory(combination.id, habitualTargetPosition);
    const baseIntelligence = getDivisionIntelligence(division.id);
    let noPreparationCorrect = 0;
    let fullPreparationCorrect = 0;

    for (let iteration = 0; iteration < samples; iteration += 1) {
      const scenarioSeed = seed + divisionIndex * 100_003 + iteration;
      const noPreparation = predictDefensiveTarget({
        combination,
        naturalTargetWeights: team.lineoutStyle?.naturalTargetWeights,
        memory,
        identity: { aiIntelligence: baseIntelligence, videoPreparation: 0, videoMatchesAnalyzed: 0 },
        divisionId: division.id,
        rng: createSeededRandom(scenarioSeed)
      });
      const fullPreparation = predictDefensiveTarget({
        combination,
        naturalTargetWeights: team.lineoutStyle?.naturalTargetWeights,
        memory,
        identity: { aiIntelligence: baseIntelligence, videoPreparation: 100, videoMatchesAnalyzed: 5 },
        divisionId: division.id,
        rng: createSeededRandom(scenarioSeed)
      });
      noPreparationCorrect += Number(noPreparation.predictedPosition === habitualTargetPosition);
      fullPreparationCorrect += Number(fullPreparation.predictedPosition === habitualTargetPosition);
    }

    const noPreparationAccuracy = noPreparationCorrect / samples;
    const fullPreparationAccuracy = fullPreparationCorrect / samples;
    return {
      divisionId: division.id,
      samplesPerScenario: samples,
      habitualTargetPosition,
      noPreparationAccuracy,
      fullPreparationAccuracy,
      accuracyGain: fullPreparationAccuracy - noPreparationAccuracy
    };
  });
}

export function simulateMatchImpact(
  matchesPerDivision: number,
  seed: number
): MatchImpactSimulation[] {
  const samples = normalizePositiveInteger(matchesPerDivision, 1);
  return DIVISIONS.map((division, divisionIndex) => simulateMatches({
    iterations: samples,
    division,
    seed: seed + divisionIndex * 1019
  }));
}

export function simulateMatches(options: SimulateMatchesOptions): MatchImpactSimulation {
  const samples = normalizePositiveInteger(options.iterations, 1);
  const rng = createSeededRandom(options.seed);
  const [home, away] = options.teams ?? createTeamPair(options.division, rng);
  let totalPoints = 0;
  let directLineoutPoints = 0;
  let matchesWithDirectPoints = 0;
  let matchesDecidedWithinDirectPoints = 0;

  for (let matchIndex = 0; matchIndex < samples; matchIndex += 1) {
    const result = simulateSingleMatch(options.division, home, away, rng, matchIndex);
    const matchPoints = result.match.ourScore + result.match.opponentScore;
    const matchDirectPoints = result.homeDirectPoints + result.awayDirectPoints;
    totalPoints += matchPoints;
    directLineoutPoints += matchDirectPoints;
    matchesWithDirectPoints += Number(matchDirectPoints > 0);
    const margin = Math.abs(result.match.ourScore - result.match.opponentScore);
    const winningDirectPoints = result.match.ourScore > result.match.opponentScore
      ? result.homeDirectPoints
      : result.match.opponentScore > result.match.ourScore
        ? result.awayDirectPoints
        : 0;
    matchesDecidedWithinDirectPoints += Number(margin > 0 && margin <= winningDirectPoints);
  }

  return {
    divisionId: options.division.id,
    matches: samples,
    averageTotalPoints: totalPoints / samples,
    averageDirectLineoutPoints: directLineoutPoints / samples,
    directLineoutPointShare: totalPoints > 0 ? directLineoutPoints / totalPoints : 0,
    matchesWithDirectLineoutPointsRate: matchesWithDirectPoints / samples,
    matchesDecidedWithinDirectLineoutPointsRate: matchesDecidedWithinDirectPoints / samples
  };
}

function simulateSingleMatch(
  division: Division,
  home: Team,
  away: Team,
  rng: RandomSource,
  matchIndex: number
): { match: MatchStateData; homeDirectPoints: number; awayDirectPoints: number } {
  const schedule = generateMatchSchedule(division, rng);
  let match = createMatchState(home, away, division, schedule, rng, matchIndex);
  let homeDirectPoints = 0;
  let awayDirectPoints = 0;
  let previousHome: PreviousAiLineout | undefined;
  let previousAway: PreviousAiLineout | undefined;

  while (match.currentLineoutIndex < match.lineouts.length) {
    match = advanceToNextScheduledLineout(match, rng);
    const event = match.lineouts[match.currentLineoutIndex];
    const throwingTeam = event.throwingSide === "us" ? home : away;
    const defendingTeam = event.throwingSide === "us" ? away : home;
    const previous = event.throwingSide === "us" ? previousHome : previousAway;
    const simulated = simulateTeamLineout(
      throwingTeam,
      defendingTeam,
      division,
      getAiZone(match.ballPositionMeters, event.throwingSide),
      previous,
      event.minute,
      rng,
      match.maximumFatigueByPlayerId
    );
    const scoreBefore = event.throwingSide === "us" ? match.ourScore : match.opponentScore;
    match = applyLineoutResolutionToMatch(match, simulated.resolution, event.throwingSide, rng);
    const scoreAfter = event.throwingSide === "us" ? match.ourScore : match.opponentScore;
    if (event.throwingSide === "us") {
      homeDirectPoints += scoreAfter - scoreBefore;
      previousHome = toPrevious(simulated);
    } else {
      awayDirectPoints += scoreAfter - scoreBefore;
      previousAway = toPrevious(simulated);
    }
    match = {
      ...match,
      currentLineoutIndex: match.currentLineoutIndex + 1,
      lineouts: match.lineouts.map((item, index) => (
        index === match.currentLineoutIndex ? { ...item, resolved: true } : item
      ))
    };
  }
  return {
    match: advanceMatchSimulation(match, match.maxMinute, rng),
    homeDirectPoints,
    awayDirectPoints
  };
}

function simulateTeamLineout(
  throwingTeam: Team,
  defendingTeam: Team,
  division: Division,
  zone: AiFieldZone,
  previous: PreviousAiLineout | undefined,
  minute: number,
  rng: RandomSource,
  maximumFatigueByPlayerId?: Record<string, number>
): SimulatedLineout {
  const memory = createEmptyOpponentAiMemory();
  const identity = createSimulationIdentity(division.id);
  const combinations = throwingTeam.offensiveCombinations ?? [];
  const repertoire = throwingTeam.offensiveRepertoire;
  const style = throwingTeam.lineoutStyle;
  if (!repertoire || !style || combinations.length === 0) {
    throw new Error(`Team ${throwingTeam.id} has no generated V2 repertoire`);
  }
  const decision = chooseAiOffensiveLineout({
    combinations,
    repertoire,
    style,
    zone,
    memory,
    identity,
    previous,
    rng
  });
  const defensePrediction = predictDefensiveTarget({
    combination: decision.combination,
    naturalTargetWeights: style.naturalTargetWeights,
    memory,
    identity,
    divisionId: division.id,
    rng
  });
  const attackingAssignments = buildAssignments(throwingTeam, decision.combination);
  const defendingAssignments = buildDefensiveAssignments(defendingTeam);
  const fatigueByPlayerId = buildFatigueMap(
    throwingTeam,
    defendingTeam,
    minute,
    rng,
    maximumFatigueByPlayerId
  );
  const resolution = resolveLineoutV2({
    minute,
    throwingTeamId: throwingTeam.id,
    defendingTeamId: defendingTeam.id,
    throwingHooker: throwingTeam.hooker,
    targetPlayerId: decision.targetPlayerId,
    targetOption: decision.targetOption,
    attackingAssignments,
    defendingAssignments,
    defensiveJumpPosition: defensePrediction.predictedPosition,
    fatigueByPlayerId,
    rng
  });
  return {
    resolution,
    trajectory: resolution.details.trajectory as LineoutTrajectory,
    targetPosition: decision.targetOption.targetPosition,
    combinationId: decision.combination.id
  };
}

function createMatchState(
  home: Team,
  away: Team,
  division: Division,
  schedule: ReturnType<typeof generateMatchSchedule>,
  rng: RandomSource,
  matchIndex: number
): MatchStateData {
  return {
    id: `simulation-${division.id}-${matchIndex}`,
    divisionId: division.id,
    home,
    away,
    minute: 0,
    maxMinute: schedule.maxMinute,
    ourScore: 0,
    opponentScore: 0,
    possession: 50,
    occupation: 50,
    ballOwner: "player",
    ballPositionMeters: 50,
    playerPossessionTimeMinutes: 0,
    opponentPossessionTimeMinutes: 0,
    playerOccupationTimeMinutes: 0,
    opponentOccupationTimeMinutes: 0,
    playerAttackingPressure: 0,
    opponentAttackingPressure: 0,
    lineouts: schedule.lineouts,
    currentLineoutIndex: 0,
    playerUsage: {},
    combinationStats: {},
    opponentCombinationStats: {},
    lineoutHistory: [],
    maximumFatigueByPlayerId: generateMatchMaximumFatigue(home, away, rng)
  };
}

function createTeamPair(division: Division, rng: RandomSource): [Team, Team] {
  const home = generateTeamForDivision({
    id: `simulation-home-${division.id}`,
    name: "Simulation domicile",
    divisionId: division.id,
    colors: { primary: 0x2563eb, secondary: 0xffffff },
    prefix: `sim-home-${division.id}-`,
    rng
  }).team;
  const away = generateTeamForDivision({
    id: `simulation-away-${division.id}`,
    name: "Simulation extérieur",
    divisionId: division.id,
    colors: { primary: 0xdc2626, secondary: 0xffffff },
    prefix: `sim-away-${division.id}-`,
    rng
  }).team;
  return [home, away];
}

function buildAssignments(team: Team, combination: Combination): LineoutAssignments {
  const byId = new Map(team.lineoutPlayers.map((player) => [player.id, player]));
  const assignments: LineoutAssignments = {};
  for (const slot of combination.slots) {
    const player = slot.playerId ? byId.get(slot.playerId) : undefined;
    if (player) assignments[slot.position] = player;
  }
  return assignments;
}

function buildDefensiveAssignments(team: Team): LineoutAssignments {
  return Object.fromEntries(team.lineoutPlayers.slice(0, 7).map((player, index) => [
    (index + 1) as LineoutPosition,
    player
  ])) as LineoutAssignments;
}

function buildFatigueMap(
  throwingTeam: Team,
  defendingTeam: Team,
  minute: number,
  rng: RandomSource,
  maximumFatigueByPlayerId?: Record<string, number>
): Record<string, number> {
  const players = [
    throwingTeam.hooker,
    ...throwingTeam.lineoutPlayers,
    defendingTeam.hooker,
    ...defendingTeam.lineoutPlayers
  ];
  return Object.fromEntries(players.map((player) => {
    const maximum = maximumFatigueByPlayerId?.[player.id] ?? generateMaximumFatiguePercent(rng);
    return [player.id, calculateCurrentFatiguePercent(maximum, minute)];
  }));
}

function getCombinationWithMostTargets(team: Team): Combination {
  const combinations = team.offensiveCombinations ?? [];
  const active = new Set(team.offensiveRepertoire?.activeCombinationIds ?? []);
  const candidates = combinations.filter((combination) => active.has(combination.id));
  const selected = candidates.reduce<Combination | undefined>((best, combination) => (
    !best || (combination.targetOptions?.length ?? 0) > (best.targetOptions?.length ?? 0)
      ? combination
      : best
  ), undefined);
  if (!selected) throw new Error(`Team ${team.id} has no active combination`);
  return selected;
}

function createPreparedMemory(
  combinationId: string,
  targetPosition: LineoutPosition
): OpponentAiMemory {
  const memory = createEmptyOpponentAiMemory();
  memory.playerTargets.videoObservations[combinationId] = { [targetPosition]: 5 };
  return memory;
}

function createSimulationIdentity(divisionId: DivisionId): OpponentAiIdentity {
  return {
    aiIntelligence: getDivisionIntelligence(divisionId),
    videoPreparation: 0,
    videoMatchesAnalyzed: 0
  };
}

function getDivisionIntelligence(divisionId: DivisionId): number {
  return LINEOUT_BALANCE.ai.intelligenceByDivision[divisionId].base;
}

function getAiZone(positionMeters: number, throwingSide: "us" | "opponent"): AiFieldZone {
  const attackingPosition = throwingSide === "us" ? positionMeters : 100 - positionMeters;
  if (attackingPosition <= 22) return "own22";
  if (attackingPosition >= 78) return "opponent22";
  return "midfield";
}

function getRotatingAiZone(iteration: number): AiFieldZone {
  if (iteration % 3 === 0) return "own22";
  if (iteration % 3 === 1) return "midfield";
  return "opponent22";
}

function toPrevious(simulated: SimulatedLineout): PreviousAiLineout {
  return {
    combinationId: simulated.combinationId,
    targetPosition: simulated.targetPosition,
    outcome: simulated.resolution.outcome
  };
}

function createPositionCounters(): Record<LineoutPosition, MutablePositionCounter> {
  return Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((position) => [position, {
    samples: 0,
    retained: 0,
    cleanWins: 0,
    turnovers: 0,
    knockOns: 0
  }])) as Record<LineoutPosition, MutablePositionCounter>;
}

function buildPositionEffectiveness(
  counters: Record<LineoutPosition, MutablePositionCounter>
): PositionEffectiveness[] {
  return ([1, 2, 3, 4, 5, 6, 7] as LineoutPosition[]).map((targetPosition) => {
    const counter = counters[targetPosition];
    const divisor = Math.max(1, counter.samples);
    return {
      targetPosition,
      samples: counter.samples,
      retentionRate: counter.retained / divisor,
      cleanWinRate: counter.cleanWins / divisor,
      turnoverRate: counter.turnovers / divisor,
      knockOnRate: counter.knockOns / divisor
    };
  });
}

function createCountRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

function toRates<T extends string>(counts: Record<T, number>, samples: number): Record<T, number> {
  return Object.fromEntries(
    Object.entries<number>(counts).map(([key, count]) => [key, count / samples])
  ) as Record<T, number>;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}
