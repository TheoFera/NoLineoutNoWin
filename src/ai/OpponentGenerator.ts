import type { Team } from "../models/Team";
import type { Division } from "../models/Division";
import type { OpponentClub } from "../models/OpponentClub";
import { OPPONENT_CLUB_CATALOG } from "../data/opponentClubCatalog";
import { createDefaultFieldPlayers, createDefaultHooker } from "../rules/TeamFactory";
import { randomInt } from "../utils/Random";

export function generateOpponent(index: number, division: Division): Team {
  const base = division.opponentSkill;
  const fieldPlayers = createDefaultFieldPlayers(base, `op${index}`);

  return {
    id: `opponent_${index}`,
    name: `Adversaire ${index}`,
    divisionId: division.id,
    colors: { primary: 0x7f1d1d, secondary: 0xfacc15 },
    hooker: createDefaultHooker("oh2", "Talonneur", randomInt(base - 8, base + 8)),
    fieldPlayers,
    lineoutPlayers: fieldPlayers.slice(0, 7)
  };
}

export function getOpponentClubById(opponentId: string): OpponentClub | null {
  return OPPONENT_CLUB_CATALOG.find((club) => club.id === opponentId) ?? null;
}

export function getOpponentCatalog(): OpponentClub[] {
  return OPPONENT_CLUB_CATALOG.slice();
}

export function generateOpponentFromClub(club: OpponentClub, division: Division): Team {
  const base = division.opponentSkill;
  const fieldPlayers = createDefaultFieldPlayers(base, `${club.id}_p`);

  return {
    id: club.id,
    name: club.name,
    divisionId: division.id,
    colors: club.colors,
    hooker: createDefaultHooker(`${club.id}_h2`, "Talonneur", randomInt(base - 8, base + 8)),
    fieldPlayers,
    lineoutPlayers: fieldPlayers.slice(0, 7)
  };
}

export function generateOpponentById(opponentId: string, division: Division): Team {
  const club = getOpponentClubById(opponentId);
  if (club) {
    return generateOpponentFromClub(club, division);
  }

  const opponentIndex = Number.parseInt(opponentId.replace("opponent_", ""), 10) || 1;
  return generateOpponent(opponentIndex, division);
}
