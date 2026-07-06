import type { Combination } from "./Combination";
import type { DivisionId } from "./Division";
import type { Team } from "./Team";

export type DefenseMemory = Record<number, string[]>; // clé 2..7 = ordre de joueurs mémorisé

export type SaveGame = {
  version: 1;
  language: "fr" | "en";
  currentDivisionId: DivisionId;
  season: number;
  playerTeam: Team;
  offensiveCombinations: Combination[];
  defensivePriority: string[];
  defenseMemory: DefenseMemory;
  createdAt: string;
  updatedAt: string;
};
