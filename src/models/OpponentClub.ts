import type { DivisionId } from "./Division.ts";
import type { JerseyColors } from "./Team.ts";

export type OpponentClub = {
  id: string;
  name: string;
  sourceDivisionId: DivisionId;
  colors: JerseyColors;
  colorKey: string;
};
