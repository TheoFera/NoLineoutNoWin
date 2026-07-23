import type { DivisionId } from "./Division";
import type { FieldPlayer, Hooker } from "./Player";
import type { Combination, OffensiveRepertoire } from "./Combination";

export type JerseyColors = {
  primary: number;
  secondary: number;
};

export type TeamLineoutStyle = {
  sizeWeights: Partial<Record<3 | 4 | 5 | 6 | 7, number>>;
  naturalTargetWeights: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>>;
};

export type Team = {
  id: string;
  name: string;
  divisionId: DivisionId;
  colors: JerseyColors;
  hooker: Hooker;
  fieldPlayers: FieldPlayer[]; // effectif disponible pour préparer la touche
  lineoutPlayers: FieldPlayer[]; // exactement 7 joueurs retenus pour la touche en V1
  lineoutStyle?: TeamLineoutStyle;
  offensiveRepertoire?: OffensiveRepertoire;
  offensiveCombinations?: Combination[];
};
