import type { SeasonSummary } from "./Championship";
import type { MatchPlayerUsage } from "./Match";
import type { Player } from "./Player";
import type { Team } from "./Team";

export type ProgressedStatName = "speed" | "strength" | "technique" | "throwing";

export type PlayerStatProgression = {
  stat: ProgressedStatName;
  previousValue: number;
  currentValue: number;
};

export type PlayerProgressionSummary = {
  player: Player;
  changes: PlayerStatProgression[];
};

export type PlayerProgressionUsage = Record<string, MatchPlayerUsage>;

export type TeamProgressionResult = {
  team: Team;
  progressedPlayers: PlayerProgressionSummary[];
  remainingUsage: PlayerProgressionUsage;
};

export type MatchCompletionSummary = {
  seasonSummary: SeasonSummary | null;
  playerProgressions: PlayerProgressionSummary[];
};
