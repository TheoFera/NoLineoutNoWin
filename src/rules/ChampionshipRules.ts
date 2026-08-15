import { getOpponentCatalog } from "../ai/OpponentGenerator.ts";
import type { ChampionshipState, ChampionshipTeamRecord, SeasonSummary } from "../models/Championship.ts";
import type { DivisionId } from "../models/Division.ts";
import type { OpponentClub } from "../models/OpponentClub.ts";
import type { FfrLeagueId } from "../models/ClubLocation.ts";
import { DEFAULT_FFR_LEAGUE_ID } from "../data/frenchRugbyLeagues.ts";
import { getNextDivision } from "./DivisionRules.ts";
import { MATH_RANDOM_SOURCE, randomInt, type RandomSource } from "../utils/Random.ts";

const PLAYER_TEAM_ID = "player_team";
const OPPONENT_COUNT = 5;
const WIN_POINTS = 4;
const DRAW_POINTS = 2;
const REGIONAL_DIVISIONS: DivisionId[] = ["regionale_3", "regionale_2", "regionale_1"];

function shuffle<T>(items: T[], randomSource: RandomSource = MATH_RANDOM_SOURCE): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, randomSource);
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

function selectClubsWithVariedColors(
  clubs: OpponentClub[],
  count: number,
  randomSource: RandomSource
): OpponentClub[] {
  const ordered = shuffle(clubs, randomSource);
  const selected: OpponentClub[] = [];
  const seenColorKeys = new Set<string>();

  for (const club of ordered) {
    if (!seenColorKeys.has(club.colorKey)) {
      selected.push(club);
      seenColorKeys.add(club.colorKey);
    }
    if (selected.length === count) return selected;
  }

  for (const club of ordered) {
    if (!selected.some((item) => item.id === club.id)) selected.push(club);
    if (selected.length === count) return selected;
  }

  return selected;
}

function pickChampionshipOpponents(
  divisionId: DivisionId,
  count: number,
  leagueId: FfrLeagueId,
  randomSource: RandomSource
): { clubs: OpponentClub[]; poolId: string } {
  const catalog = getOpponentCatalog();
  if (REGIONAL_DIVISIONS.includes(divisionId)) {
    const sameDivision = catalog.filter((club) => (
      club.sourceDivisionId === divisionId && club.sourceLeagueId === leagueId
    ));
    const otherRegionalClubs = catalog.filter((club) => (
      REGIONAL_DIVISIONS.includes(club.sourceDivisionId)
      && club.sourceLeagueId === leagueId
      && club.sourceDivisionId !== divisionId
    ));
    const candidates = sameDivision.length >= count
      ? sameDivision
      : [...sameDivision, ...otherRegionalClubs];
    if (candidates.length === 0) {
      throw new Error(`No regional opponent club is available for league ${leagueId}.`);
    }
    return {
      clubs: selectClubsWithVariedColors(candidates, count, randomSource),
      poolId: `regional_${leagueId}`
    };
  }

  const divisionClubs = catalog.filter((club) => club.sourceDivisionId === divisionId);
  const pools = new Map<string, OpponentClub[]>();
  divisionClubs.forEach((club) => {
    const clubs = pools.get(club.sourcePoolId) ?? [];
    clubs.push(club);
    pools.set(club.sourcePoolId, clubs);
  });
  const selectedPool = shuffle([...pools.entries()], randomSource)[0];
  if (!selectedPool) {
    throw new Error(`No opponent pool is available for division ${divisionId}.`);
  }
  return {
    clubs: selectClubsWithVariedColors(selectedPool[1], count, randomSource),
    poolId: selectedPool[0]
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

    const leftDiff = getGoalAverage(left);
    const rightDiff = getGoalAverage(right);
    if (rightDiff !== leftDiff) {
      return rightDiff - leftDiff;
    }

    return right.pointsFor - left.pointsFor;
  });
}

export function getGoalAverage(record: ChampionshipTeamRecord): number {
  return record.pointsFor - record.pointsAgainst;
}

export function createChampionshipState(
  divisionId: DivisionId,
  season: number,
  playerTeamName: string,
  leagueId: FfrLeagueId = DEFAULT_FFR_LEAGUE_ID,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): ChampionshipState {
  const selection = pickChampionshipOpponents(divisionId, OPPONENT_COUNT, leagueId, randomSource);
  const opponentIds: string[] = [];
  const standings: ChampionshipTeamRecord[] = [createRecord(PLAYER_TEAM_ID, playerTeamName)];

  selection.clubs.forEach((club) => {
    opponentIds.push(club.id);
    standings.push(createRecord(club.id, club.name));
  });
  const firstLeg = shuffle(opponentIds, randomSource);
  const returnLeg = shuffle(opponentIds, randomSource);

  return {
    season,
    divisionId,
    leagueId: REGIONAL_DIVISIONS.includes(divisionId) ? leagueId : null,
    poolId: selection.poolId,
    nextRound: 1,
    totalRounds: firstLeg.length + returnLeg.length,
    schedule: [...firstLeg, ...returnLeg],
    standings
  };
}

export function normalizeChampionshipState(
  championship: ChampionshipState | undefined,
  divisionId: DivisionId,
  season: number,
  playerTeamName: string,
  leagueId: FfrLeagueId = DEFAULT_FFR_LEAGUE_ID
): ChampionshipState {
  if (!championship) {
    return createChampionshipState(divisionId, season, playerTeamName, leagueId);
  }

  const uniqueOpponentIds = Array.from(new Set(championship.schedule));
  const schedule = championship.schedule.length === uniqueOpponentIds.length
    ? [...championship.schedule, ...uniqueOpponentIds]
    : championship.schedule;
  return {
    ...championship,
    leagueId: championship.leagueId ?? (REGIONAL_DIVISIONS.includes(divisionId) ? leagueId : null),
    poolId: championship.poolId ?? "historique",
    schedule,
    totalRounds: schedule.length,
    standings: championship.standings.map((record) => ({
      ...record,
      name: record.teamId === PLAYER_TEAM_ID ? playerTeamName : record.name
    }))
  };
}

export function getCurrentOpponentId(championship: ChampionshipState): string | null {
  return championship.schedule[championship.nextRound - 1] ?? null;
}

export function isCurrentMatchAtHome(championship: ChampionshipState): boolean {
  const currentIndex = championship.nextRound - 1;
  const opponentId = championship.schedule[currentIndex];
  if (!opponentId) return true;

  const previousMeetings = championship.schedule
    .slice(0, currentIndex)
    .filter((scheduledOpponentId) => scheduledOpponentId === opponentId)
    .length;
  const firstMeetingIndex = championship.schedule.indexOf(opponentId);
  const firstMeetingAtHome = firstMeetingIndex % 2 === 0;
  return previousMeetings % 2 === 0 ? firstMeetingAtHome : !firstMeetingAtHome;
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
  playerTeamName: string,
  leagueId: FfrLeagueId = DEFAULT_FFR_LEAGUE_ID
): {
  championship: ChampionshipState;
  divisionId: DivisionId;
  season: number;
  promoted: boolean;
  completedSeason?: SeasonSummary;
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

  const rank = getPlayerRank(updated);
  const promotionDivisionId = getNextDivision(updated.divisionId);
  const promoted = rank <= 2 && promotionDivisionId !== updated.divisionId;
  const nextDivisionId = promoted ? promotionDivisionId : updated.divisionId;
  const nextSeason = updated.season + 1;
  const playerRecord = updated.standings.find((record) => record.teamId === PLAYER_TEAM_ID);

  if (!playerRecord) {
    throw new Error("Player team is missing from championship standings.");
  }

  return {
    championship: createChampionshipState(nextDivisionId, nextSeason, playerTeamName, leagueId),
    divisionId: nextDivisionId,
    season: nextSeason,
    promoted,
    completedSeason: {
      season: updated.season,
      previousDivisionId: updated.divisionId,
      nextDivisionId,
      promoted,
      rank,
      teamCount: updated.standings.length,
      playerRecord: { ...playerRecord }
    }
  };
}
