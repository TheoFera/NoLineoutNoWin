import type { FfrLeagueId } from "../models/ClubLocation.ts";
import type { DivisionId } from "../models/Division.ts";
import type { OpponentClub } from "../models/OpponentClub.ts";
import rawOpponentClubs from "./opponentClubs.generated.json";

type RawOpponentClub = [
  id: string,
  name: string,
  divisionId: DivisionId,
  leagueId: FfrLeagueId | null,
  poolId: string,
  primaryColor: number,
  secondaryColor: number
];

// Données générées depuis clubs_rugby_FFR_tableau_unique_2026_2027.xlsx.
// Les couleurs absentes sont attribuées de façon déterministe lors de l'import.
export const OPPONENT_CLUB_CATALOG: OpponentClub[] = (rawOpponentClubs as RawOpponentClub[]).map(([
  id,
  name,
  sourceDivisionId,
  sourceLeagueId,
  sourcePoolId,
  primary,
  secondary
]) => ({
  id,
  name,
  sourceDivisionId,
  sourceLeagueId,
  sourcePoolId,
  colors: { primary, secondary },
  colorKey: `${primary.toString(16)}-${secondary.toString(16)}`
}));
