import {
  PLAYER_SKIN_TONE_IDS,
  type BodyShapeName,
  type PlayerAppearance,
  type PlayerSkinToneId
} from "../models/PlayerAppearance.ts";
import type { TeamPlayerDraft, TeamPlayerNumber } from "../models/TeamCreation.ts";
import { TEAM_PLAYER_NUMBERS } from "../models/TeamCreation.ts";
import { PLAYER_NICKNAMES } from "./defaultNames.ts";

export const AVAILABLE_PLAYER_BODY_SHAPES = [
  "medium_standard",
  "medium_large"
] as const satisfies readonly BodyShapeName[];

export function createDefaultPlayerAppearance(number: number): PlayerAppearance {
  return {
    bodyShape: number === 1 || number === 3 ? "medium_large" : "medium_standard",
    skinToneId: "base",
    headStyleId: "default"
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
