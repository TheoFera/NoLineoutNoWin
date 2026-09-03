import {
  PLAYER_SKIN_TONE_IDS,
  type BodyShapeName,
  type PlayerAccessoryId,
  type PlayerAppearance,
  type PlayerHairStyleId,
  type PlayerSkinToneId
} from "../models/PlayerAppearance.ts";
import type { TeamPlayerDraft, TeamPlayerNumber } from "../models/TeamCreation.ts";
import { TEAM_PLAYER_NUMBERS } from "../models/TeamCreation.ts";
import {
  MATH_RANDOM_SOURCE,
  pickOne,
  randomInt,
  type RandomSource
} from "../utils/Random.ts";
import { PLAYER_NICKNAMES } from "./defaultNames.ts";

export const AVAILABLE_PLAYER_BODY_SHAPES = [
  "medium_standard",
  "medium_large"
] as const satisfies readonly BodyShapeName[];

export const PLAYER_HAIR_STYLE_OPTIONS = [
  "short",
  "bald",
  "mullet",
  "bun"
] as const satisfies readonly PlayerHairStyleId[];

export const PLAYER_ACCESSORY_OPTIONS = [
  "helmet",
  "strap",
  "moustache",
  "beard"
] as const satisfies readonly PlayerAccessoryId[];

export function canUsePlayerHairStyle(
  bodyShape: BodyShapeName,
  hairStyleId: PlayerHairStyleId
): boolean {
  return hairStyleId === "short"
    || (
      bodyShape === "medium_standard"
      && (hairStyleId === "bald" || hairStyleId === "mullet" || hairStyleId === "bun")
    );
}

export function canUsePlayerAccessory(
  bodyShape: BodyShapeName,
  _accessoryId: PlayerAccessoryId
): boolean {
  return bodyShape === "medium_standard";
}

export function createDefaultPlayerAppearance(number: number): PlayerAppearance {
  return {
    bodyShape: number === 1 || number === 3 ? "medium_large" : "medium_standard",
    skinToneId: "base",
    hairStyleId: "short",
    accessoryIds: []
  };
}

export function createDefaultTeamPlayerDrafts(
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): TeamPlayerDraft[] {
  const bodyShapes = TEAM_PLAYER_NUMBERS.map((number) => (
    createDefaultPlayerAppearance(number).bodyShape
  ));
  const skinToneIds = createDiverseAppearanceSequence(
    PLAYER_SKIN_TONE_IDS,
    TEAM_PLAYER_NUMBERS.length,
    randomSource
  );
  const standardPlayerIndexes = bodyShapes
    .map((bodyShape, index) => bodyShape === "medium_standard" ? index : -1)
    .filter((index) => index >= 0);
  const hairStyles = createDiverseAppearanceSequence(
    PLAYER_HAIR_STYLE_OPTIONS,
    standardPlayerIndexes.length,
    randomSource
  );
  const hairStyleByPlayerIndex = new Map(
    standardPlayerIndexes.map((playerIndex, index) => [playerIndex, hairStyles[index]])
  );
  const accessoryIdsByPlayer = createRandomAccessorySelections(
    standardPlayerIndexes,
    TEAM_PLAYER_NUMBERS.length,
    randomSource
  );

  return TEAM_PLAYER_NUMBERS.map((number, index) => ({
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    appearance: {
      bodyShape: bodyShapes[index],
      skinToneId: skinToneIds[index],
      hairStyleId: hairStyleByPlayerIndex.get(index) ?? "short",
      accessoryIds: accessoryIdsByPlayer[index]
    }
  }));
}

function createRandomAccessorySelections(
  eligiblePlayerIndexes: readonly number[],
  playerCount: number,
  randomSource: RandomSource
): PlayerAccessoryId[][] {
  const selections = Array.from({ length: playerCount }, () => [] as PlayerAccessoryId[]);
  if (eligiblePlayerIndexes.length === 0) return selections;

  for (const accessoryId of PLAYER_ACCESSORY_OPTIONS) {
    const playerIndex = pickOne(eligiblePlayerIndexes, randomSource);
    selections[playerIndex].push(accessoryId);
  }

  for (const playerIndex of eligiblePlayerIndexes) {
    for (const accessoryId of PLAYER_ACCESSORY_OPTIONS) {
      if (!selections[playerIndex].includes(accessoryId) && randomInt(0, 4, randomSource) === 0) {
        selections[playerIndex].push(accessoryId);
      }
    }
  }

  return selections;
}

function createDiverseAppearanceSequence<T>(
  options: readonly T[],
  count: number,
  randomSource: RandomSource
): T[] {
  const sequence: T[] = [];
  while (sequence.length < count) {
    sequence.push(...shuffleAppearanceOptions(options, randomSource));
  }
  return sequence.slice(0, count);
}

function shuffleAppearanceOptions<T>(
  options: readonly T[],
  randomSource: RandomSource
): T[] {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, randomSource);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function cloneTeamPlayerDrafts(players: readonly TeamPlayerDraft[]): TeamPlayerDraft[] {
  return players.map((player) => ({
    ...player,
    appearance: {
      ...player.appearance,
      accessoryIds: [...player.appearance.accessoryIds]
    }
  }));
}

export function getGeneratedTeamSkinToneId(teamId: string, rosterIndex: number): PlayerSkinToneId {
  let teamHash = 0;
  for (const character of teamId) {
    teamHash = (teamHash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return PLAYER_SKIN_TONE_IDS[(teamHash + rosterIndex) % PLAYER_SKIN_TONE_IDS.length];
}

export function getGeneratedTeamPlayerAppearance(
  teamId: string,
  rosterIndex: number,
  baseAppearance: PlayerAppearance
): PlayerAppearance {
  const hairStyles = PLAYER_HAIR_STYLE_OPTIONS.filter((hairStyleId) => (
    canUsePlayerHairStyle(baseAppearance.bodyShape, hairStyleId)
  ));
  const accessoryIds = PLAYER_ACCESSORY_OPTIONS
    .filter((accessoryId) => canUsePlayerAccessory(baseAppearance.bodyShape, accessoryId))
    .filter((accessoryId) => isStableAppearanceOptionEnabled(
      teamId,
      rosterIndex,
      `accessory:${accessoryId}`
    ));

  return {
    ...baseAppearance,
    skinToneId: getGeneratedTeamSkinToneId(teamId, rosterIndex),
    hairStyleId: selectStableAppearanceOption(hairStyles, teamId, rosterIndex, "hair"),
    accessoryIds
  };
}

function isStableAppearanceOptionEnabled(
  teamId: string,
  rosterIndex: number,
  category: string
): boolean {
  return getStableAppearanceHash(teamId, rosterIndex, category) % 3 === 0;
}

function selectStableAppearanceOption<T>(
  options: readonly T[],
  teamId: string,
  rosterIndex: number,
  category: string
): T {
  const hash = getStableAppearanceHash(teamId, rosterIndex, category);
  return options[hash % options.length];
}

function getStableAppearanceHash(
  teamId: string,
  rosterIndex: number,
  category: string
): number {
  let hash = 0;
  for (const character of `${teamId}:${rosterIndex}:${category}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}
