import { generateOpponent } from "../ai/OpponentGenerator";
import type { ChampionshipState, ChampionshipTeamRecord } from "../models/Championship";
import type { DivisionId } from "../models/Division";
import { getDivision, getNextDivision } from "./DivisionRules";
import { randomInt } from "../utils/Random";

const PLAYER_TEAM_ID = "player_team";
const OPPONENT_COUNT = 7;
const WIN_POINTS = 4;
const DRAW_POINTS = 2;

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createRecord(teamId: string, name: string): ChampionshipTeamRecord {
  return {
    teamId,
    name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    leaguePoints: 0
  };
}

function updateRecord(record: ChampionshipTeamRecord, pointsFor: number, pointsAgainst: number): ChampionshipTeamRecord {
  const win = pointsFor > pointsAgainst;
  const draw = pointsFor === pointsAgainst;

  return {
    ...record,
    played: record.played + 1,
    wins: record.wins + (win ? 1 : 0),
    draws: record.draws + (draw ? 1 : 0),
    losses: record.losses + (!win && !draw ? 1 : 0),
    pointsFor: record.pointsFor + pointsFor,
    pointsAgainst: record.pointsAgainst + pointsAgainst,
    leaguePoints: record.leaguePoints + (win ? WIN_POINTS : draw ? DRAW_POINTS : 0)
  };
}

function updateStandings(standings: ChampionshipTeamRecord[], teamId: string, pointsFor: number, pointsAgainst: number): ChampionshipTeamRecord[] {
  return standings.map((record) => {
    if (record.teamId !== teamId) {
      return record;
    }

    return updateRecord(record, pointsFor, pointsAgainst);
  });
}

function simulateOtherTeams(standings: ChampionshipTeamRecord[], excludedIds: string[]): ChampionshipTeamRecord[] {
  const available = standings.filter((record) => !excludedIds.includes(record.teamId));
  const shuffled = shuffle(available.map((record) => record.teamId));
  let updated = standings.slice();

  for (let index = 0; index + 1 < shuffled.length; index += 2) {
    const homeId = shuffled[index];
    const awayId = shuffled[index + 1];
    const homeScore = randomInt(8, 28);
    const awayScore = randomInt(6, 26);
    updated = updateStandings(updated, homeId, homeScore, awayScore);
    updated = updateStandings(updated, awayId, awayScore, homeScore);
  }

  if (shuffled.length % 2 === 1) {
    const idleId = shuffled[shuffled.length - 1];
    updated = updateStandings(updated, idleId, 0, 0);
  }

  return updated;
}

export function sortStandings(standings: ChampionshipTeamRecord[]): ChampionshipTeamRecord[] {
  return standings.slice().sort((left, right) => {
    if (right.leaguePoints !== left.leaguePoints) {
      return right.leaguePoints - left.leaguePoints;
    }

    const leftDiff = left.pointsFor - left.pointsAgainst;
    const rightDiff = right.pointsFor - right.pointsAgainst;
    if (rightDiff !== leftDiff) {
      return rightDiff - leftDiff;
    }

    return right.pointsFor - left.pointsFor;
  });
}

export function createChampionshipState(divisionId: DivisionId, season: number, playerTeamName: string): ChampionshipState {
  const division = getDivision(divisionId);
  const opponentIds: string[] = [];
  const standings: ChampionshipTeamRecord[] = [createRecord(PLAYER_TEAM_ID, playerTeamName)];

  for (let index = 1; index <= OPPONENT_COUNT; index += 1) {
    const opponent = generateOpponent(index, division);
    opponentIds.push(opponent.id);
    standings.push(createRecord(opponent.id, opponent.name));
  }

  return {
    season,
    divisionId,
    nextRound: 1,
    totalRounds: opponentIds.length,
    schedule: shuffle(opponentIds),
    standings
  };
}

export function normalizeChampionshipState(
  championship: ChampionshipState | undefined,
  divisionId: DivisionId,
  season: number,
  playerTeamName: string
): ChampionshipState {
  if (!championship) {
    return createChampionshipState(divisionId, season, playerTeamName);
  }

  return {
    ...championship,
    standings: championship.standings.map((record) => ({
      ...record,
      name: record.teamId === PLAYER_TEAM_ID ? playerTeamName : record.name
    }))
  };
}

export function getCurrentOpponentId(championship: ChampionshipState): string | null {
  return championship.schedule[championship.nextRound - 1] ?? null;
}

export function getCurrentRoundLabel(championship: ChampionshipState): string {
  return `${championship.nextRound}/${championship.totalRounds}`;
}

export function getPlayerRank(championship: ChampionshipState): number {
  const sorted = sortStandings(championship.standings);
  return sorted.findIndex((record) => record.teamId === PLAYER_TEAM_ID) + 1;
}

export function applyMatchToChampionship(
  championship: ChampionshipState,
  ourScore: number,
  opponentScore: number,
  playerTeamName: string
): {
  championship: ChampionshipState;
  divisionId: DivisionId;
  season: number;
  promoted: boolean;
} {
  const opponentId = getCurrentOpponentId(championship);
  if (!opponentId) {
    return {
      championship,
      divisionId: championship.divisionId,
      season: championship.season,
      promoted: false
    };
  }

  let standings = updateStandings(championship.standings, PLAYER_TEAM_ID, ourScore, opponentScore);
  standings = updateStandings(standings, opponentId, opponentScore, ourScore);
  standings = simulateOtherTeams(standings, [PLAYER_TEAM_ID, opponentId]);

  const updated: ChampionshipState = {
    ...championship,
    standings,
    nextRound: championship.nextRound + 1
  };

  if (updated.nextRound <= updated.totalRounds) {
    return {
      championship: updated,
      divisionId: updated.divisionId,
      season: updated.season,
      promoted: false
    };
  }

  const promoted = getPlayerRank(updated) <= 2;
  const nextDivisionId = promoted ? getNextDivision(updated.divisionId) : updated.divisionId;
  const nextSeason = updated.season + 1;

  return {
    championship: createChampionshipState(nextDivisionId, nextSeason, playerTeamName),
    divisionId: nextDivisionId,
    season: nextSeason,
    promoted
  };
}
