import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { DivisionId } from "../models/Division.ts";
import type { FieldPlayer, Hooker } from "../models/Player.ts";
import type { JerseyColors, Team } from "../models/Team.ts";
import {
  MATH_RANDOM_SOURCE,
  createSeededRandom,
  type RandomSource
} from "../utils/Random.ts";
import { generateLineoutRoster, generateTeamForDivision } from "./TeamGeneration.ts";

const DEFAULT_TEAM_SIZE = 7;
const DIVISION_IDS = Object.keys(LINEOUT_BALANCE.generation.divisionStats) as DivisionId[];

export const DEFAULT_PRIMARY_COLOR = 0x2563eb;
export const DEFAULT_SECONDARY_COLOR = 0xffffff;

type StoredTeamShape = Omit<Team, "fieldPlayers" | "lineoutPlayers"> & {
  fieldPlayers?: FieldPlayer[];
  lineoutPlayers?: FieldPlayer[];
};

function normalizeJerseyColors(colors?: Partial<JerseyColors>): JerseyColors {
  return {
    primary: colors?.primary ?? DEFAULT_PRIMARY_COLOR,
    secondary: colors?.secondary ?? DEFAULT_SECONDARY_COLOR
  };
}

function inferDivisionFromLegacyBase(base: number): DivisionId {
  return DIVISION_IDS.reduce((best, divisionId) => {
    const bestDistance = Math.abs(
      LINEOUT_BALANCE.generation.divisionStats[best].mean - base
    );
    const distance = Math.abs(
      LINEOUT_BALANCE.generation.divisionStats[divisionId].mean - base
    );
    return distance < bestDistance ? divisionId : best;
  }, "regionale_3" as DivisionId);
}

export function createDefaultHooker(
  id: string,
  nickname: string,
  base = 65,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Hooker {
  return generateLineoutRoster({
    divisionId: inferDivisionFromLegacyBase(base),
    prefix: `${id}_fallback_`,
    hookerId: id,
    hookerNickname: nickname,
    clubModifier: 0,
    rng: randomSource
  }).hooker;
}

export function createDefaultFieldPlayers(
  base = 65,
  prefix = "p",
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): FieldPlayer[] {
  return generateLineoutRoster({
    divisionId: inferDivisionFromLegacyBase(base),
    prefix,
    hookerId: `${prefix}h2`,
    hookerNickname: "Talonneur",
    clubModifier: 0,
    rng: randomSource
  }).fieldPlayers;
}

export function createDefaultLineoutPlayers(
  base = 65,
  prefix = "p",
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): FieldPlayer[] {
  return createDefaultFieldPlayers(base, prefix, randomSource).slice(0, DEFAULT_TEAM_SIZE);
}

export function createDefaultPlayerTeam(
  name: string,
  colors?: Partial<JerseyColors>,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Team {
  const generated = generateTeamForDivision({
    id: "player_team",
    name,
    divisionId: "regionale_3",
    colors: normalizeJerseyColors(colors),
    prefix: "p",
    clubModifier: 0,
    rng: randomSource
  }).team;
  return {
    ...generated,
    hooker: { ...generated.hooker, id: "h2", nickname: "Dédé" }
  };
}

export function normalizeTeam(team: StoredTeamShape): Team {
  const fallback = createDefaultFieldPlayers(65, "p", createSeededRandom(1));
  const fieldPlayers = mergeFieldPlayers(team.fieldPlayers ?? team.lineoutPlayers ?? [], fallback);
  const lineoutPlayers = normalizeLineoutPlayers(fieldPlayers, team.lineoutPlayers);

  return {
    ...team,
    colors: normalizeJerseyColors(team.colors),
    fieldPlayers,
    lineoutPlayers
  };
}

function mergeFieldPlayers(primary: FieldPlayer[], fallback: FieldPlayer[]): FieldPlayer[] {
  const byId = new Map<string, FieldPlayer>();
  for (const player of [...primary, ...fallback]) {
    if (!byId.has(player.id)) byId.set(player.id, player);
  }
  return [...byId.values()].slice(0, DEFAULT_TEAM_SIZE);
}

function normalizeLineoutPlayers(
  fieldPlayers: FieldPlayer[],
  currentLineoutPlayers?: FieldPlayer[]
): FieldPlayer[] {
  const byId = new Map(fieldPlayers.map((player) => [player.id, player]));
  const selected: FieldPlayer[] = [];
  for (const player of currentLineoutPlayers ?? []) {
    const current = byId.get(player.id);
    if (current && !selected.some((item) => item.id === current.id)) selected.push(current);
  }
  for (const player of fieldPlayers) {
    if (!selected.some((item) => item.id === player.id)) selected.push(player);
  }
  return selected.slice(0, DEFAULT_TEAM_SIZE);
}
