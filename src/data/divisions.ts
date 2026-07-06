import type { Division } from "../models/Division";

export const DIVISIONS: Division[] = [
  { id: "regionale_3", label: "Régionale 3", minLineouts: 4, maxLineouts: 6, offensiveCombinations: 2, opponentSkill: 30, adaptationAfterRepeats: 2 },
  { id: "regionale_2", label: "Régionale 2", minLineouts: 6, maxLineouts: 9, offensiveCombinations: 3, opponentSkill: 40, adaptationAfterRepeats: 2 },
  { id: "regionale_1", label: "Régionale 1", minLineouts: 6, maxLineouts: 9, offensiveCombinations: 3, opponentSkill: 48, adaptationAfterRepeats: 2 },
  { id: "federale_3", label: "Fédérale 3", minLineouts: 7, maxLineouts: 10, offensiveCombinations: 4, opponentSkill: 56, adaptationAfterRepeats: 1 },
  { id: "federale_2", label: "Fédérale 2", minLineouts: 8, maxLineouts: 11, offensiveCombinations: 4, opponentSkill: 62, adaptationAfterRepeats: 1 },
  { id: "federale_1", label: "Fédérale 1", minLineouts: 8, maxLineouts: 12, offensiveCombinations: 4, opponentSkill: 70, adaptationAfterRepeats: 1 },
  { id: "nationale_2", label: "Nationale 2", minLineouts: 9, maxLineouts: 13, offensiveCombinations: 5, opponentSkill: 76, adaptationAfterRepeats: 1 },
  { id: "nationale", label: "Nationale", minLineouts: 9, maxLineouts: 13, offensiveCombinations: 5, opponentSkill: 82, adaptationAfterRepeats: 1 },
  { id: "pro_d2", label: "Pro D2", minLineouts: 10, maxLineouts: 14, offensiveCombinations: 5, opponentSkill: 88, adaptationAfterRepeats: 1 },
  { id: "top_14", label: "Top 14", minLineouts: 10, maxLineouts: 14, offensiveCombinations: 5, opponentSkill: 94, adaptationAfterRepeats: 1 }
];
