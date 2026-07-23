import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { PLAYER_NICKNAMES } from "../data/defaultNames.ts";
import type { DivisionId } from "../models/Division.ts";
import type { FieldPlayer, Hooker } from "../models/Player.ts";
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

type GenerationProfile = "lifter" | "reliableHybrid" | "weakHybrid" | "jumper";

export function deduceAerialRole(player: Pick<FieldPlayer, "jump" | "lift">): AerialRole {
  const canJump = player.jump >= GENERATION.roleThreshold;
  const canLift = player.lift >= GENERATION.roleThreshold;
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
  const fieldPlayers = PLAYER_NUMBERS.map((number, index) => createFieldPlayer(
    number,
    index,
    options.divisionId,
    options.prefix,
    options.clubModifier,
    corrections,
    options.rng
  ));
  const range = GENERATION.divisionStats[options.divisionId];
  const hooker: Hooker = {
    id: options.hookerId,
    role: "hooker",
    number: 2,
    nickname: options.hookerNickname,
    height: randomInt(168, 183, options.rng),
    width: randomInt(78, 92, options.rng),
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

  return {
    report: roster.report,
    team: {
      id: options.id,
      name: options.name,
      divisionId: options.divisionId,
      colors: options.colors,
      hooker: roster.hooker,
      fieldPlayers: roster.fieldPlayers,
      lineoutPlayers: roster.fieldPlayers.slice(0, 7),
      lineoutStyle: style,
      offensiveRepertoire: repertoire.repertoire,
      offensiveCombinations: repertoire.combinations
    }
  };
}

function createFieldPlayer(
  number: number,
  index: number,
  divisionId: DivisionId,
  prefix: string,
  clubModifier: -3 | 0 | 3,
  corrections: string[],
  rng: RandomSource
): FieldPlayer {
  const profile = getGenerationProfileForNumber(number);
  const stats = generateProfileStats(divisionId, profile, clubModifier, rng);
  const player: FieldPlayer = {
    id: `${prefix}${index + 1}`,
    role: "field",
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    height: randomInt(number <= 3 ? 176 : 184, number <= 3 ? 190 : 202, rng),
    width: randomInt(number <= 3 ? 92 : 82, number <= 3 ? 110 : 102, rng),
    ...stats
  };

  if (DIVISION_ORDER.indexOf(divisionId) >= DIVISION_ORDER.indexOf("federale_1")) {
    if (player.jump < GENERATION.roleThreshold) {
      player.jump = GENERATION.roleThreshold;
      corrections.push(`${player.id}:jump`);
    }
    if (player.lift < GENERATION.roleThreshold) {
      player.lift = GENERATION.roleThreshold;
      corrections.push(`${player.id}:lift`);
    }
  }
  return player;
}

function generateProfileStats(
  divisionId: DivisionId,
  profile: GenerationProfile,
  clubModifier: -3 | 0 | 3,
  rng: RandomSource
): Pick<FieldPlayer, "jump" | "lift" | "hands"> {
  const range = GENERATION.divisionStats[divisionId];
  const general = (minimumBonus = 0) => generateGeneralStat(
    Math.min(range.maximum, range.minimum + minimumBonus),
    range.maximum,
    clubModifier,
    rng
  );

  if (divisionId === "regionale_3") {
    const hands = generateGeneralStat(
      GENERATION.regionale3Hands.minimum,
      GENERATION.regionale3Hands.maximum,
      clubModifier,
      rng
    );
    if (profile === "lifter") {
      return { jump: randomInt(5, 25, rng), lift: randomInt(67, 78, rng), hands };
    }
    if (profile === "jumper") {
      return { jump: randomInt(65, 78, rng), lift: randomInt(44, 58, rng), hands };
    }
    if (profile === "weakHybrid") {
      return { jump: randomInt(60, 68, rng), lift: randomInt(61, 70, rng), hands };
    }
    return { jump: randomInt(64, 71, rng), lift: randomInt(64, 71, rng), hands };
  }

  const divisionIndex = DIVISION_ORDER.indexOf(divisionId);
  const secondaryMinimum = Math.min(range.maximum, 45 + divisionIndex * 3 + clubModifier);
  const secondaryMaximum = Math.min(range.maximum, 59 + divisionIndex + clubModifier);
  const secondary = () => randomInt(
    Math.max(0, Math.min(secondaryMinimum, secondaryMaximum)),
    Math.max(0, Math.max(secondaryMinimum, secondaryMaximum)),
    rng
  );
  const hands = general();
  if (profile === "lifter") return { jump: secondary(), lift: general(2), hands };
  if (profile === "jumper") return { jump: general(2), lift: secondary(), hands };
  if (profile === "weakHybrid") {
    const hybridGap = Math.max(1, 9 - divisionIndex);
    return {
      jump: clamp(general() - hybridGap, 0, 100),
      lift: general(1),
      hands
    };
  }
  return { jump: general(), lift: general(), hands };
}

function getGenerationProfileForNumber(number: number): GenerationProfile {
  if (number === 1 || number === 3) return "lifter";
  if (number === 6 || number === 7) return "jumper";
  if (number === 5) return "weakHybrid";
  return "reliableHybrid";
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
      player.jump >= GENERATION.roleThreshold && player.lift >= GENERATION.roleThreshold
    ));
  }
  return players.every((player) => deduceAerialRole(player) !== "none");
}
