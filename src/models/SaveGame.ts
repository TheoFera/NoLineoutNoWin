import type { ChampionshipState } from "./Championship";
import type { Combination, OffensiveRepertoire } from "./Combination";
import type { DivisionId } from "./Division";
import type { Team } from "./Team";
import type { LineoutVideoMatch, OpponentAiMemory } from "./LineoutAI";

export const DEFENSIVE_LINEOUT_SIZES = [2, 3, 4, 5, 6, 7] as const;

export type DefensiveLineoutSize = typeof DEFENSIVE_LINEOUT_SIZES[number];
export type DefensiveLayout = Array<string | null>;

// Une entrée compacte issue d'une ancienne sauvegarde contient seulement les identifiants.
// Les nouvelles entrées contiennent toujours 7 cases afin de conserver aussi les espaces libres.
export type DefenseMemory = Partial<Record<DefensiveLineoutSize, DefensiveLayout>>;

type SaveGameBase = {
  language: "fr" | "en";
  currentDivisionId: DivisionId;
  season: number;
  playerTeam: Team;
  championship: ChampionshipState;
  offensiveCombinations: Combination[];
  defensivePriority: string[];
  defenseMemory: DefenseMemory;
  createdAt: string;
  updatedAt: string;
};

export type SaveGameV1 = SaveGameBase & {
  version: 1;
};

export type SaveGameV2 = SaveGameBase & {
  version: 2;
  offensiveRepertoire: OffensiveRepertoire;
};

export type SaveGame = SaveGameBase & {
  version: 3;
  offensiveRepertoire: OffensiveRepertoire;
  opponentAiMemories: Record<string, OpponentAiMemory>;
  playerLineoutVideoHistory: LineoutVideoMatch[];
  opponentTeams: Record<string, Team>;
};

export type StoredSaveGame = SaveGameV1 | SaveGameV2 | SaveGame;
