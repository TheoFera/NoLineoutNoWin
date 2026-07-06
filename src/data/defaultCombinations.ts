import type { Combination } from "../models/Combination";

export const DEFAULT_COMBINATIONS: Combination[] = [
  {
    id: "safe_front",
    nameKey: "combo.safe_front",
    risk: 15,
    complexity: 15,
    slots: [
      { playerId: "p1", position: 1 },
      { playerId: "p2", position: 2 },
      { playerId: "p3", position: 3 },
      { playerId: "p4", position: 4 },
      { playerId: "p5", position: 5 },
      { playerId: "p6", position: 6 },
      { playerId: "p7", position: 7 }
    ]
  },
  {
    id: "middle_block",
    nameKey: "combo.middle_block",
    risk: 35,
    complexity: 35,
    slots: [
      { playerId: "p3", position: 1 },
      { playerId: "p1", position: 2 },
      { playerId: "p2", position: 3 },
      { playerId: "p4", position: 4 },
      { playerId: "p5", position: 5 },
      { playerId: "p6", position: 6 },
      { playerId: "p7", position: 7 }
    ]
  }
];
