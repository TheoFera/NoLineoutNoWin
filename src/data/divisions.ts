import type { Division } from "../models/Division.ts";

export const DIVISIONS: Division[] = [
  { id: "regionale_3", label: "Régionale 3", minimumMatchLineouts: 4, maximumMatchLineouts: 6, offensiveCombinations: 2, opponentSkill: 30, adaptationAfterRepeats: 2 },
  { id: "regionale_2", label: "Régionale 2", minimumMatchLineouts: 5, maximumMatchLineouts: 7, offensiveCombinations: 3, opponentSkill: 40, adaptationAfterRepeats: 2 },
  { id: "regionale_1", label: "Régionale 1", minimumMatchLineouts: 5, maximumMatchLineouts: 7, offensiveCombinations: 3, opponentSkill: 48, adaptationAfterRepeats: 2 },
  { id: "federale_3", label: "Fédérale 3", minimumMatchLineouts: 5, maximumMatchLineouts: 8, offensiveCombinations: 4, opponentSkill: 56, adaptationAfterRepeats: 1 },
  { id: "federale_2", label: "Fédérale 2", minimumMatchLineouts: 6, maximumMatchLineouts: 9, offensiveCombinations: 4, opponentSkill: 62, adaptationAfterRepeats: 1 },
  { id: "federale_1", label: "Fédérale 1", minimumMatchLineouts: 6, maximumMatchLineouts: 10, offensiveCombinations: 4, opponentSkill: 70, adaptationAfterRepeats: 1 },
  { id: "nationale_2", label: "Nationale 2", minimumMatchLineouts: 7, maximumMatchLineouts: 11, offensiveCombinations: 5, opponentSkill: 76, adaptationAfterRepeats: 1 },
  { id: "nationale", label: "Nationale", minimumMatchLineouts: 7, maximumMatchLineouts: 11, offensiveCombinations: 5, opponentSkill: 82, adaptationAfterRepeats: 1 },
  { id: "pro_d2", label: "Pro D2", minimumMatchLineouts: 7, maximumMatchLineouts: 12, offensiveCombinations: 5, opponentSkill: 88, adaptationAfterRepeats: 1 },
  { id: "top_14", label: "Top 14", minimumMatchLineouts: 7, maximumMatchLineouts: 12, offensiveCombinations: 5, opponentSkill: 94, adaptationAfterRepeats: 1 }
];
