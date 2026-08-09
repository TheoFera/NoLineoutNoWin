import type { DivisionId } from "./Division";
import type { FfrLeagueId } from "./ClubLocation";

export type ChampionshipTeamRecord = {
  teamId: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  leaguePoints: number;
};

export type ChampionshipState = {
  season: number;
  divisionId: DivisionId;
  leagueId: FfrLeagueId | null;
  poolId: string;
  nextRound: number;
  totalRounds: number;
  schedule: string[];
  standings: ChampionshipTeamRecord[];
};

export type SeasonSummary = {
  season: number;
  previousDivisionId: DivisionId;
  nextDivisionId: DivisionId;
  promoted: boolean;
  rank: number;
  teamCount: number;
  playerRecord: ChampionshipTeamRecord;
};
