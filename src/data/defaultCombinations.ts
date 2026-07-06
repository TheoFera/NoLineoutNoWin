import type { Combination } from "../models/Combination";

export const DEFAULT_COMBINATIONS: Combination[] = [
  {
    id: "safe_front",
    nameKey: "combo.safe_front",
    risk: 15,
    complexity: 15,
    slots: [
      { playerId: null, position: 1 },
      { playerId: null, position: 2 },
      { playerId: null, position: 3 },
      { playerId: null, position: 4 },
      { playerId: null, position: 5 },
      { playerId: null, position: 6 },
      { playerId: null, position: 7 }
    ]
  },
  {
    id: "middle_block",
    nameKey: "combo.middle_block",
    risk: 35,
    complexity: 35,
    slots: [
      { playerId: null, position: 1 },
      { playerId: null, position: 2 },
      { playerId: null, position: 3 },
      { playerId: null, position: 4 },
      { playerId: null, position: 5 },
      { playerId: null, position: 6 },
      { playerId: null, position: 7 }
    ]
  },
  {
    id: "long_back",
    nameKey: "combo.long_back",
    risk: 50,
    complexity: 45,
    slots: [
      { playerId: null, position: 1 },
      { playerId: null, position: 2 },
      { playerId: null, position: 3 },
      { playerId: null, position: 4 },
      { playerId: null, position: 5 },
      { playerId: null, position: 6 },
      { playerId: null, position: 7 }
    ]
  },
  {
    id: "shift_4",
    nameKey: "combo.shift_4",
    risk: 60,
    complexity: 55,
    slots: [
      { playerId: null, position: 1 },
      { playerId: null, position: 2 },
      { playerId: null, position: 3 },
      { playerId: null, position: 4 },
      { playerId: null, position: 5 },
      { playerId: null, position: 6 },
      { playerId: null, position: 7 }
    ]
  },
  {
    id: "shift_5",
    nameKey: "combo.shift_5",
    risk: 70,
    complexity: 65,
    slots: [
      { playerId: null, position: 1 },
      { playerId: null, position: 2 },
      { playerId: null, position: 3 },
      { playerId: null, position: 4 },
      { playerId: null, position: 5 },
      { playerId: null, position: 6 },
      { playerId: null, position: 7 }
    ]
  }
];
