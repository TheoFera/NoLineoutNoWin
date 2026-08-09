import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { PLAYER_NICKNAMES } from "../data/defaultNames.ts";
import {
  createDefaultPlayerAppearance,
  getGeneratedTeamPlayerAppearance
} from "../data/PlayerAppearanceOptions.ts";
import type { DivisionId } from "../models/Division.ts";
import type { FieldPlayer, FieldPlayerStatName, Hooker } from "../models/Player.ts";
import type { JerseyColors, Team, TeamLineoutStyle } from "../models/Team.ts";
import { clamp } from "../utils/Clamp.ts";
import { randomInt, type RandomSource } from "../utils/Random.ts";
import { assignTeamLineoutRepertoire } from "./LineoutCombinationAssignment.ts";

const GENERATION = LINEOUT_BALANCE.generation;
const PLAYER_NUMBERS = [1, 3, 4, 5, 6, 7, 8];
const DIVISION_ORDER: DivisionId[] = [
  "regionale_3",
  "regionale_2",
  "regionale_1",
  "federale_3",
  "federale_2",
  "federale_1",
  "nationale_2",
  "nationale",
  "pro_d2",
  "top_14"
];

export type AerialRole = "none" | "lifter" | "jumper" | "jumperLifter";

export type TeamGenerationReport = {
  divisionId: DivisionId;
  clubModifier: -3 | 0 | 3;
  valid: boolean;
  corrections: string[];
  rolesByPlayerId: Record<string, AerialRole>;
};

export type GeneratedRoster = {
  hooker: Hooker;
  fieldPlayers: FieldPlayer[];
  report: TeamGenerationReport;
};

type GenerationArchetype =
  | "lifter"
  | "techniqueHybrid"
  | "strengthHybrid"
  | "jumper"
  | "speedHybrid";

type FieldStats = Pick<FieldPlayer, FieldPlayerStatName>;

type StatRange = {
  minimum: number;
  maximum: number;
};

type StatBounds = Record<FieldPlayerStatName, StatRange>;

type PlayerStatPlan = {
  stats: FieldStats;
  bounds: StatBounds;
  strongStat: FieldPlayerStatName;
};

export function deduceAerialRole(player: Pick<FieldPlayer, "technique" | "strength">): AerialRole {
  const canJump = player.technique >= GENERATION.roleThreshold;
  const canLift = player.strength >= GENERATION.roleThreshold;
  if (canJump && canLift) return "jumperLifter";
  if (canJump) return "jumper";
  if (canLift) return "lifter";
  return "none";
}

export function getFixedClubModifier(clubId: string): -3 | 0 | 3 {
  let hash = 0;
  for (const character of clubId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return GENERATION.clubModifiers[hash % GENERATION.clubModifiers.length];
}

export function generateLineoutRoster(options: {
  divisionId: DivisionId;
  prefix: string;
  hookerId: string;
  hookerNickname: string;
  clubModifier: -3 | 0 | 3;
  rng: RandomSource;
}): GeneratedRoster {
  const corrections: string[] = [];
  const generatedStats = generateFieldPlayerStatsForRoster(
    options.divisionId,
    options.clubModifier,
    options.rng
  );
  const fieldPlayers = PLAYER_NUMBERS.map((number, index) => createFieldPlayer(
    number,
    index,
    options.prefix,
    generatedStats[index]
  ));
  const range = GENERATION.divisionStats[options.divisionId];
  const hooker: Hooker = {
    id: options.hookerId,
    role: "hooker",
    number: 2,
    nickname: options.hookerNickname,
    appearance: createDefaultPlayerAppearance(2),
    throwing: generateGeneralStat(range.minimum, range.maximum, options.clubModifier, options.rng)
  };
  const rolesByPlayerId = Object.fromEntries(
    fieldPlayers.map((player) => [player.id, deduceAerialRole(player)])
  );

  return {
    hooker,
    fieldPlayers,
    report: {
      divisionId: options.divisionId,
      clubModifier: options.clubModifier,
      valid: validateDivisionConstraints(options.divisionId, fieldPlayers),
      corrections,
      rolesByPlayerId
    }
  };
}

export function generateTeamForDivision(options: {
  id: string;
  name: string;
  divisionId: DivisionId;
  colors: JerseyColors;
  prefix: string;
  rng: RandomSource;
  clubModifier?: -3 | 0 | 3;
}): { team: Team; report: TeamGenerationReport } {
  const clubModifier = options.clubModifier ?? getFixedClubModifier(options.id);
  const roster = generateLineoutRoster({
    divisionId: options.divisionId,
    prefix: options.prefix,
    hookerId: `${options.prefix}h2`,
    hookerNickname: "Talonneur",
    clubModifier,
    rng: options.rng
  });
  const style = generateLineoutStyle(options.rng);
  const limits = LINEOUT_BALANCE.ai.repertoireByDivision[options.divisionId];
  const repertoire = assignTeamLineoutRepertoire({
    hooker: roster.hooker,
    players: roster.fieldPlayers,
    style,
    activeCount: limits.active,
    reserveCount: limits.reserve,
    rng: options.rng
  });
  const hooker: Hooker = {
    ...roster.hooker,
    appearance: getGeneratedTeamPlayerAppearance(options.id, 0, roster.hooker.appearance)
  };
  const fieldPlayers = roster.fieldPlayers.map((player, index) => ({
    ...player,
    appearance: getGeneratedTeamPlayerAppearance(options.id, index + 1, player.appearance)
  }));

  return {
    report: roster.report,
    team: {
      id: options.id,
      name: options.name,
      divisionId: options.divisionId,
      colors: options.colors,
      hooker,
      fieldPlayers,
      lineoutPlayers: fieldPlayers.slice(0, 7),
      lineoutStyle: style,
      offensiveRepertoire: repertoire.repertoire,
      offensiveCombinations: repertoire.combinations
    }
  };
}

function createFieldPlayer(
  number: number,
  index: number,
  prefix: string,
  stats: FieldStats
): FieldPlayer {
  return {
    id: `${prefix}${index + 1}`,
    role: "field",
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    appearance: createDefaultPlayerAppearance(number),
    ...stats
  };
}

function generateFieldPlayerStatsForRoster(
  divisionId: DivisionId,
  clubModifier: -3 | 0 | 3,
  rng: RandomSource
): FieldStats[] {
  const targetMean = clamp(
    GENERATION.divisionStats[divisionId].mean + clubModifier,
    0,
    100
  );
  const exceptionalPlayerIndex = getExceptionalRegionale3PlayerIndex(divisionId, rng);
  const qualityOffsets = shuffledQualityOffsets(rng);
  const plans = PLAYER_NUMBERS.map((number, index) => {
    const archetype = getGenerationArchetypeForNumber(number);
    if (divisionId === "regionale_3") {
      return createRegionale3StatPlan(archetype, index === exceptionalPlayerIndex, rng);
    }
    return createGenericStatPlan(
      divisionId,
      archetype,
      targetMean + qualityOffsets[index],
      rng
    );
  });

  rebalancePlansToTarget(
    plans,
    targetMean * PLAYER_NUMBERS.length * 3,
    GENERATION.pointStrengthMinimumGapByDivision[divisionId],
    rng
  );
  return plans.map((plan) => ({ ...plan.stats }));
}

function getGenerationArchetypeForNumber(number: number): GenerationArchetype {
  if (number === 1 || number === 3) return "lifter";
  if (number === 4) return "techniqueHybrid";
  if (number === 5) return "strengthHybrid";
  if (number === 6 || number === 7) return "jumper";
  return "speedHybrid";
}

function createRegionale3StatPlan(
  archetype: GenerationArchetype,
  exceptional: boolean,
  rng: RandomSource
): PlayerStatPlan {
  const configuredRanges = GENERATION.regionale3.ranges[archetype];
  const strongStat = getStrongStat(archetype);
  const bounds: StatBounds = {
    speed: withRegionale3UsualMaximum(configuredRanges.speed),
    strength: withRegionale3UsualMaximum(configuredRanges.strength),
    technique: withRegionale3UsualMaximum(configuredRanges.technique)
  };
  if (exceptional) {
    bounds[strongStat] = {
      minimum: GENERATION.regionale3.exceptionalMinimum,
      maximum: GENERATION.regionale3.exceptionalMaximum
    };
  }
  const stats: FieldStats = {
    speed: randomInRange(bounds.speed, rng),
    strength: randomInRange(bounds.strength, rng),
    technique: randomInRange(bounds.technique, rng)
  };
  ensurePointStrength(stats, bounds, strongStat, GENERATION.pointStrengthMinimumGapByDivision.regionale_3);
  return { stats, bounds, strongStat };
}

function createGenericStatPlan(
  divisionId: DivisionId,
  archetype: GenerationArchetype,
  playerMean: number,
  rng: RandomSource
): PlayerStatPlan {
  const offsets = GENERATION.profileOffsets[archetype];
  const minimums = getGenericMinimums(divisionId, archetype);
  const bounds: StatBounds = {
    speed: { minimum: minimums.speed, maximum: 100 },
    strength: { minimum: minimums.strength, maximum: 100 },
    technique: { minimum: minimums.technique, maximum: 100 }
  };
  const stats: FieldStats = {
    speed: generateOffsetStat(playerMean, offsets.speed, bounds.speed, rng),
    strength: generateOffsetStat(playerMean, offsets.strength, bounds.strength, rng),
    technique: generateOffsetStat(playerMean, offsets.technique, bounds.technique, rng)
  };
  const strongStat = getStrongStat(archetype);
  ensurePointStrength(
    stats,
    bounds,
    strongStat,
    GENERATION.pointStrengthMinimumGapByDivision[divisionId]
  );
  return { stats, bounds, strongStat };
}

function getGenericMinimums(
  divisionId: DivisionId,
  archetype: GenerationArchetype
): FieldStats {
  const fullyVersatile = DIVISION_ORDER.indexOf(divisionId)
    >= DIVISION_ORDER.indexOf(GENERATION.fullVersatilityFromDivision);
  const secondaryMinimum = fullyVersatile ? GENERATION.roleThreshold : 0;
  if (archetype === "lifter") {
    return { speed: 0, strength: GENERATION.roleThreshold, technique: secondaryMinimum };
  }
  if (archetype === "jumper") {
    return { speed: 0, strength: secondaryMinimum, technique: GENERATION.roleThreshold };
  }
  return { speed: 0, strength: GENERATION.roleThreshold, technique: GENERATION.roleThreshold };
}

function getStrongStat(archetype: GenerationArchetype): FieldPlayerStatName {
  if (archetype === "lifter" || archetype === "strengthHybrid") return "strength";
  if (archetype === "speedHybrid") return "speed";
  return "technique";
}

function generateOffsetStat(
  mean: number,
  offset: number,
  bounds: StatRange,
  rng: RandomSource
): number {
  const variation = randomInt(
    -GENERATION.genericRandomAmplitude,
    GENERATION.genericRandomAmplitude,
    rng
  );
  return clamp(Math.round(mean + offset + variation), bounds.minimum, bounds.maximum);
}

function randomInRange(range: StatRange, rng: RandomSource): number {
  return randomInt(range.minimum, range.maximum, rng);
}

function withRegionale3UsualMaximum(range: StatRange): StatRange {
  return {
    minimum: range.minimum,
    maximum: Math.min(range.maximum, GENERATION.regionale3.usualMaximum)
  };
}

function ensurePointStrength(
  stats: FieldStats,
  bounds: StatBounds,
  strongStat: FieldPlayerStatName,
  minimumGap: number
): void {
  const otherStats = getOtherStatNames(strongStat);
  const strongestAllowedOther = bounds[strongStat].maximum - minimumGap;
  for (const stat of otherStats) {
    if (bounds[stat].minimum > strongestAllowedOther) {
      throw new Error(`Impossible strong-point bounds for ${strongStat}`);
    }
    stats[stat] = Math.min(stats[stat], strongestAllowedOther);
  }
  const requiredStrongValue = Math.max(...otherStats.map((stat) => stats[stat])) + minimumGap;
  stats[strongStat] = clamp(
    Math.max(stats[strongStat], requiredStrongValue),
    bounds[strongStat].minimum,
    bounds[strongStat].maximum
  );
}

function rebalancePlansToTarget(
  plans: PlayerStatPlan[],
  targetTotal: number,
  minimumGap: number,
  rng: RandomSource
): void {
  let difference = targetTotal - getPlansTotal(plans);
  while (difference !== 0) {
    const candidates = getRebalanceCandidates(plans, difference > 0, minimumGap);
    if (candidates.length === 0) {
      throw new Error(`Unable to rebalance generated roster by ${difference} points`);
    }
    const candidate = candidates[randomInt(0, candidates.length - 1, rng)];
    candidate.plan.stats[candidate.stat] += difference > 0 ? 1 : -1;
    difference += difference > 0 ? -1 : 1;
  }
}

function getRebalanceCandidates(
  plans: PlayerStatPlan[],
  increment: boolean,
  minimumGap: number
): Array<{ plan: PlayerStatPlan; stat: FieldPlayerStatName }> {
  const candidates: Array<{ plan: PlayerStatPlan; stat: FieldPlayerStatName }> = [];
  for (const plan of plans) {
    for (const stat of ["speed", "strength", "technique"] as const) {
      if (increment
        ? canIncrementStat(plan, stat, minimumGap)
        : canDecrementStat(plan, stat, minimumGap)) {
        candidates.push({ plan, stat });
      }
    }
  }
  return candidates;
}

function canIncrementStat(
  plan: PlayerStatPlan,
  stat: FieldPlayerStatName,
  minimumGap: number
): boolean {
  if (plan.stats[stat] >= plan.bounds[stat].maximum) return false;
  if (stat === plan.strongStat) return true;
  return plan.stats[stat] + 1 <= plan.stats[plan.strongStat] - minimumGap;
}

function canDecrementStat(
  plan: PlayerStatPlan,
  stat: FieldPlayerStatName,
  minimumGap: number
): boolean {
  if (plan.stats[stat] <= plan.bounds[stat].minimum) return false;
  if (stat !== plan.strongStat) return true;
  const strongestOther = Math.max(...getOtherStatNames(stat).map((name) => plan.stats[name]));
  return plan.stats[stat] - 1 >= strongestOther + minimumGap;
}

function getPlansTotal(plans: readonly PlayerStatPlan[]): number {
  return plans.reduce((total, plan) => (
    total + plan.stats.speed + plan.stats.strength + plan.stats.technique
  ), 0);
}

function getOtherStatNames(strongStat: FieldPlayerStatName): FieldPlayerStatName[] {
  return (["speed", "strength", "technique"] as const).filter((stat) => stat !== strongStat);
}

function getExceptionalRegionale3PlayerIndex(
  divisionId: DivisionId,
  rng: RandomSource
): number | null {
  if (divisionId !== "regionale_3") return null;
  const exceptional = randomInt(1, 100, rng)
    <= GENERATION.regionale3.exceptionalRosterProbabilityPercent;
  return exceptional ? randomInt(0, PLAYER_NUMBERS.length - 1, rng) : null;
}

function shuffledQualityOffsets(rng: RandomSource): number[] {
  const offsets = [...GENERATION.qualityOffsets];
  for (let index = offsets.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, rng);
    [offsets[index], offsets[swapIndex]] = [offsets[swapIndex], offsets[index]];
  }
  return offsets;
}

function generateGeneralStat(
  minimum: number,
  maximum: number,
  clubModifier: -3 | 0 | 3,
  rng: RandomSource
): number {
  return clamp(randomInt(minimum, maximum, rng) + clubModifier, 0, 100);
}

function generateLineoutStyle(rng: RandomSource): TeamLineoutStyle {
  return {
    sizeWeights: {
      3: randomInt(20, 100, rng),
      4: randomInt(20, 100, rng),
      5: randomInt(20, 100, rng),
      6: randomInt(20, 100, rng),
      7: randomInt(20, 100, rng)
    },
    naturalTargetWeights: {
      1: randomInt(20, 100, rng),
      2: randomInt(20, 100, rng),
      3: randomInt(20, 100, rng),
      4: randomInt(20, 100, rng),
      5: randomInt(20, 100, rng),
      6: randomInt(20, 100, rng),
      7: randomInt(20, 100, rng)
    }
  };
}

function validateDivisionConstraints(
  divisionId: DivisionId,
  players: readonly FieldPlayer[]
): boolean {
  if (divisionId === "regionale_3") {
    const roles = players.map(deduceAerialRole);
    return roles.filter((role) => role === "lifter").length === 2
      && roles.filter((role) => role === "jumperLifter").length === 3
      && roles.filter((role) => role === "jumper").length === 2;
  }
  if (DIVISION_ORDER.indexOf(divisionId) >= DIVISION_ORDER.indexOf("federale_1")) {
    return players.every((player) => (
      player.technique >= GENERATION.roleThreshold && player.strength >= GENERATION.roleThreshold
    ));
  }
  return players.every((player) => deduceAerialRole(player) !== "none");
}
