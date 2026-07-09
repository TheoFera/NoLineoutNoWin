import type { DivisionId } from "./Division";
import type { JerseyColors } from "./Team";

export type OpponentClub = {
  id: string;
  name: string;
  sourceDivisionId: DivisionId;
  colors: JerseyColors;
  colorKey: string;
};
