import type { DivisionId } from "./Division.ts";
import type { JerseyColors } from "./Team.ts";
import type { FfrLeagueId } from "./ClubLocation.ts";

export type OpponentClub = {
  id: string;
  name: string;
  sourceDivisionId: DivisionId;
  sourceLeagueId: FfrLeagueId | null;
  sourcePoolId: string;
  colors: JerseyColors;
  colorKey: string;
};
