import type { PlayerAppearance } from "./PlayerAppearance";

export const TEAM_PLAYER_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type TeamPlayerNumber = typeof TEAM_PLAYER_NUMBERS[number];

export type TeamPlayerDraft = {
  number: TeamPlayerNumber;
  nickname: string;
  appearance: PlayerAppearance;
};

export type ClubDraft = {
  clubName: string;
  primaryColor: number;
  secondaryColor: number;
  players?: TeamPlayerDraft[];
};
