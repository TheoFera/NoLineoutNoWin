import type { Team } from "../models/Team.ts";
import type { Division } from "../models/Division.ts";
import type { OpponentClub } from "../models/OpponentClub.ts";
import { OPPONENT_CLUB_CATALOG } from "../data/opponentClubCatalog.ts";
import { generateTeamForDivision } from "../rules/TeamGeneration.ts";
import { MATH_RANDOM_SOURCE, type RandomSource } from "../utils/Random.ts";

export function generateOpponent(
  index: number,
  division: Division,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Team {
  return generateTeamForDivision({
    id: `opponent_${index}`,
    name: `Adversaire ${index}`,
    divisionId: division.id,
    colors: { primary: 0x7f1d1d, secondary: 0xfacc15 },
    prefix: `op${index}_p`,
    rng: randomSource
  }).team;
}

export function getOpponentClubById(opponentId: string): OpponentClub | null {
  return OPPONENT_CLUB_CATALOG.find((club) => club.id === opponentId) ?? null;
}

export function getOpponentCatalog(): OpponentClub[] {
  return OPPONENT_CLUB_CATALOG.slice();
}

export function generateOpponentFromClub(
  club: OpponentClub,
  division: Division,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Team {
  return generateTeamForDivision({
    id: club.id,
    name: club.name,
    divisionId: division.id,
    colors: club.colors,
    prefix: `${club.id}_p`,
    rng: randomSource
  }).team;
}

export function generateOpponentById(
  opponentId: string,
  division: Division,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): Team {
  const club = getOpponentClubById(opponentId);
  if (club) {
    return generateOpponentFromClub(club, division, randomSource);
  }

  const opponentIndex = Number.parseInt(opponentId.replace("opponent_", ""), 10) || 1;
  return generateOpponent(opponentIndex, division, randomSource);
}
