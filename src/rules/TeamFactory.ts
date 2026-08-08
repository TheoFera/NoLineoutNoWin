import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { createDefaultPlayerAppearance } from "../data/PlayerAppearanceOptions.ts";
import type { DivisionId } from "../models/Division.ts";
import type { FieldPlayer, Hooker } from "../models/Player.ts";
import {
  PLAYER_HEAD_STYLE_IDS,
  PLAYER_SKIN_TONE_IDS,
  RUGBY_PLAYER_BODY_SHAPE_NAMES,
  type BodyShapeName,
  type PlayerAppearance,
  type PlayerHeadStyleId,
  type PlayerSkinToneId
} from "../models/PlayerAppearance.ts";
import type { TeamPlayerDraft } from "../models/TeamCreation.ts";
import type { JerseyColors, Team } from "../models/Team.ts";
import {
  MATH_RANDOM_SOURCE,
  createSeededRandom,
  type RandomSource
} from "../utils/Random.ts";
import { generateLineoutRoster, generateTeamForDivision } from "./TeamGeneration.ts";
import { normalizeStoredOffensiveCombinations } from "./CombinationRules.ts";
import { normalizeOffensiveRepertoire } from "./LineoutRepertoire.ts";

const DEFAULT_TEAM_SIZE = 7;
const DIVISION_IDS = Object.keys(LINEOUT_BALANCE.generation.divisionStats) as DivisionId[];

export const DEFAULT_PRIMARY_COLOR = 0x2563eb;
export const DEFAULT_SECONDARY_COLOR = 0xffffff;

type StoredFieldPlayer = Omit<FieldPlayer, "appearance"> & {
  appearance?: Partial<PlayerAppearance>;
  height?: number;
  width?: number;
};

type StoredHooker = Omit<Hooker, "appearance"> & {
  appearance?: Partial<PlayerAppearance>;
  height?: number;
  width?: number;
};

type StoredTeamShape = Omit<Team, "hooker" | "fieldPlayers" | "lineoutPlayers"> & {
  hooker: StoredHooker;
  fieldPlayers?: StoredFieldPlayer[];
  lineoutPlayers?: StoredFieldPlayer[];
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
  randomSource: RandomSource = MATH_RANDOM_SOURCE,
  playerDrafts?: readonly TeamPlayerDraft[]
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
  const draftsByNumber = new Map<number, TeamPlayerDraft>(
    playerDrafts?.map((draft) => [draft.number, draft])
  );
  const hookerDraft = draftsByNumber.get(2);
  const hooker: Hooker = {
    ...generated.hooker,
    id: "h2",
    nickname: hookerDraft?.nickname ?? "Dédé",
    appearance: hookerDraft ? { ...hookerDraft.appearance } : createDefaultPlayerAppearance(2)
  };
  const fieldPlayers = generated.fieldPlayers.map((player) => {
    const draft = draftsByNumber.get(player.number);
    return draft
      ? { ...player, nickname: draft.nickname, appearance: { ...draft.appearance } }
      : { ...player, appearance: createDefaultPlayerAppearance(player.number) };
  });

  return {
    ...generated,
    hooker,
    fieldPlayers,
    lineoutPlayers: fieldPlayers.slice(0, DEFAULT_TEAM_SIZE)
  };
}

export function normalizeTeam(team: StoredTeamShape): Team {
  const fallback = createDefaultFieldPlayers(65, "p", createSeededRandom(1));
  const fieldPlayers = mergeFieldPlayers(team.fieldPlayers ?? team.lineoutPlayers ?? [], fallback);
  const lineoutPlayers = normalizeLineoutPlayers(fieldPlayers, team.lineoutPlayers);
  const hooker = normalizeStoredHooker(team.hooker);

  const offensiveCombinations = team.offensiveCombinations
    ? normalizeStoredOffensiveCombinations(team.offensiveCombinations)
    : undefined;
  const activeCount = team.offensiveRepertoire?.activeCombinationIds.length ?? 0;
  const reserveCount = team.offensiveRepertoire?.reserveCombinationIds.length ?? 0;

  return {
    ...team,
    hooker,
    colors: normalizeJerseyColors(team.colors),
    fieldPlayers,
    lineoutPlayers,
    offensiveCombinations,
    offensiveRepertoire: offensiveCombinations && team.offensiveRepertoire
      ? normalizeOffensiveRepertoire(
        offensiveCombinations.map((combination) => combination.id),
        activeCount,
        team.offensiveRepertoire,
        reserveCount
      )
      : team.offensiveRepertoire
  };
}

function mergeFieldPlayers(primary: StoredFieldPlayer[], fallback: FieldPlayer[]): FieldPlayer[] {
  const byId = new Map<string, FieldPlayer>();
  for (const player of primary) {
    if (!byId.has(player.id)) byId.set(player.id, normalizeStoredFieldPlayer(player));
  }
  for (const player of fallback) {
    if (!byId.has(player.id)) byId.set(player.id, player);
  }
  return [...byId.values()].slice(0, DEFAULT_TEAM_SIZE);
}

function normalizeLineoutPlayers(
  fieldPlayers: FieldPlayer[],
  currentLineoutPlayers?: StoredFieldPlayer[]
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

function normalizeStoredFieldPlayer(player: StoredFieldPlayer): FieldPlayer {
  const { height: _height, width: _width, appearance, ...current } = player;
  return {
    ...current,
    appearance: normalizePlayerAppearance(appearance, player.number)
  };
}

function normalizeStoredHooker(hooker: StoredHooker): Hooker {
  const { height: _height, width: _width, appearance, ...current } = hooker;
  return {
    ...current,
    appearance: normalizePlayerAppearance(appearance, hooker.number)
  };
}

function normalizePlayerAppearance(
  appearance: Partial<PlayerAppearance> | undefined,
  number: number
): PlayerAppearance {
  const fallback = createDefaultPlayerAppearance(number);
  const bodyShape = RUGBY_PLAYER_BODY_SHAPE_NAMES.includes(appearance?.bodyShape as BodyShapeName)
    ? appearance?.bodyShape as BodyShapeName
    : fallback.bodyShape;
  const skinToneId = PLAYER_SKIN_TONE_IDS.includes(appearance?.skinToneId as PlayerSkinToneId)
    ? appearance?.skinToneId as PlayerSkinToneId
    : fallback.skinToneId;
  const storedHeadStyleId = PLAYER_HEAD_STYLE_IDS.includes(appearance?.headStyleId as PlayerHeadStyleId)
    ? appearance?.headStyleId as PlayerHeadStyleId
    : fallback.headStyleId;
  const headStyleId = bodyShape === "medium_standard" ? storedHeadStyleId : "default";
  return {
    bodyShape,
    skinToneId,
    headStyleId
  };
}
