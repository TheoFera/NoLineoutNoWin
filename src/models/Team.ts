import type { DivisionId } from "./Division";
import type { FieldPlayer, Hooker } from "./Player";

export type JerseyColors = {
  primary: number;
  secondary: number;
};

export type Team = {
  id: string;
  name: string;
  divisionId: DivisionId;
  colors: JerseyColors;
  hooker: Hooker;
  fieldPlayers: FieldPlayer[]; // effectif disponible pour préparer la touche
  lineoutPlayers: FieldPlayer[]; // exactement 7 joueurs retenus pour la touche en V1
};
