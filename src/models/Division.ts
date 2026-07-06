export type DivisionId =
  | "regionale_3"
  | "regionale_2"
  | "regionale_1"
  | "federale_3"
  | "federale_2"
  | "federale_1"
  | "nationale_2"
  | "nationale"
  | "pro_d2"
  | "top_14";

export type Division = {
  id: DivisionId;
  label: string;
  minLineouts: number;
  maxLineouts: number;
  offensiveCombinations: number;
  opponentSkill: number;
  adaptationAfterRepeats: number;
};
