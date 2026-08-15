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
  accessoryId: PlayerAccessoryId
): boolean {
  if (accessoryId === "none") return true;
  return bodyShape === "medium_standard" && (accessoryId === "helmet" || accessoryId === "strap");
}

export function createDefaultPlayerAppearance(number: number): PlayerAppearance {
  return {
    bodyShape: number === 1 || number === 3 ? "medium_large" : "medium_standard",
    skinToneId: "base",
    hairStyleId: "short",
    accessoryId: "none"
  };
}

export function createDefaultTeamPlayerDrafts(): TeamPlayerDraft[] {
  return TEAM_PLAYER_NUMBERS.map((number, index) => ({
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    appearance: createDefaultPlayerAppearance(number)
  }));
}

export function cloneTeamPlayerDrafts(players: readonly TeamPlayerDraft[]): TeamPlayerDraft[] {
  return players.map((player) => ({
    ...player,
    appearance: { ...player.appearance }
  }));
}

export function isTeamPlayerNumber(number: number): number is TeamPlayerNumber {
  return TEAM_PLAYER_NUMBERS.includes(number as TeamPlayerNumber);
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
  const accessories: PlayerAccessoryId[] = [
    "none",
    ...PLAYER_ACCESSORY_OPTIONS.filter((accessoryId) => (
      canUsePlayerAccessory(baseAppearance.bodyShape, accessoryId)
    ))
  ];

  return {
    ...baseAppearance,
    skinToneId: getGeneratedTeamSkinToneId(teamId, rosterIndex),
    hairStyleId: selectStableAppearanceOption(hairStyles, teamId, rosterIndex, "hair"),
    accessoryId: selectStableAppearanceOption(accessories, teamId, rosterIndex, "accessory")
  };
}

function selectStableAppearanceOption<T>(
  options: readonly T[],
  teamId: string,
  rosterIndex: number,
  category: string
): T {
  let hash = 0;
  for (const character of `${teamId}:${rosterIndex}:${category}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return options[hash % options.length];
}
