import type { LineoutCombinationDefinition } from "../models/Combination.ts";

export const LINEOUT_COMBINATIONS: LineoutCombinationDefinition[] = [
  {
    id: "safe_front",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "safe-front-block", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 70 },
      { id: "safe-front-direct", targetPosition: 4, type: "directCatch", roles: { receiverPosition: 4 }, naturalWeight: 30 }
    ]
  },
  {
    id: "middle_block",
    occupiedPositions: [1, 2, 3, 4, 5],
    targetOptions: [
      { id: "middle-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 45 },
      { id: "middle-back", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, naturalWeight: 55 }
    ]
  },
  {
    id: "long_back",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "long-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 20 },
      { id: "long-middle", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, naturalWeight: 30 },
      { id: "long-back", targetPosition: 6, type: "jumpBlock", roles: { frontLifterPosition: 5, jumperPosition: 6, rearLifterPosition: 7 }, naturalWeight: 40 },
      { id: "long-direct", targetPosition: 7, type: "directCatch", roles: { receiverPosition: 7 }, naturalWeight: 10 }
    ]
  },
  {
    id: "shift_4",
    occupiedPositions: [1, 2, 3, 4, 5, 6],
    targetOptions: [
      { id: "shift-four-middle", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, naturalWeight: 60 },
      { id: "shift-four-back", targetPosition: 5, type: "jumpBlock", roles: { frontLifterPosition: 4, jumperPosition: 5, rearLifterPosition: 6 }, naturalWeight: 40 }
    ]
  },
  {
    id: "shift_5",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "shift-five-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 25 },
      { id: "shift-five-back", targetPosition: 5, type: "jumpBlock", roles: { frontLifterPosition: 4, jumperPosition: 5, rearLifterPosition: 6 }, naturalWeight: 60 },
      { id: "shift-five-direct", targetPosition: 7, type: "directCatch", roles: { receiverPosition: 7 }, naturalWeight: 15 }
    ]
  },
  {
    id: "quick_four",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "quick-four-direct", targetPosition: 1, type: "directCatch", roles: { receiverPosition: 1 }, naturalWeight: 55 },
      { id: "quick-four-back", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, naturalWeight: 45 }
    ]
  },
  {
    id: "four_double",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [
      { id: "four-double-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 50 },
      { id: "four-double-back", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, naturalWeight: 50 }
    ]
  },
  {
    id: "five_split",
    occupiedPositions: [1, 2, 3, 4, 5],
    targetOptions: [
      { id: "five-split-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 35 },
      { id: "five-split-back", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, naturalWeight: 45 },
      { id: "five-split-direct", targetPosition: 5, type: "directCatch", roles: { receiverPosition: 5 }, naturalWeight: 20 }
    ]
  },
  {
    id: "six_middle",
    occupiedPositions: [1, 2, 3, 4, 5, 6],
    targetOptions: [
      { id: "six-middle-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 30 },
      { id: "six-middle-center", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, naturalWeight: 50 },
      { id: "six-middle-direct", targetPosition: 6, type: "directCatch", roles: { receiverPosition: 6 }, naturalWeight: 20 }
    ]
  },
  {
    id: "six_long",
    occupiedPositions: [1, 2, 3, 4, 5, 6],
    targetOptions: [
      { id: "six-long-middle", targetPosition: 3, type: "jumpBlock", roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 }, naturalWeight: 35 },
      { id: "six-long-back", targetPosition: 5, type: "jumpBlock", roles: { frontLifterPosition: 4, jumperPosition: 5, rearLifterPosition: 6 }, naturalWeight: 65 }
    ]
  },
  {
    id: "seven_double",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "seven-double-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 40 },
      { id: "seven-double-back", targetPosition: 6, type: "jumpBlock", roles: { frontLifterPosition: 5, jumperPosition: 6, rearLifterPosition: 7 }, naturalWeight: 60 }
    ]
  },
  {
    id: "seven_triple",
    occupiedPositions: [1, 2, 3, 4, 5, 6, 7],
    targetOptions: [
      { id: "seven-triple-front", targetPosition: 2, type: "jumpBlock", roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 }, naturalWeight: 30 },
      { id: "seven-triple-middle", targetPosition: 4, type: "jumpBlock", roles: { frontLifterPosition: 3, jumperPosition: 4, rearLifterPosition: 5 }, naturalWeight: 40 },
      { id: "seven-triple-back", targetPosition: 6, type: "jumpBlock", roles: { frontLifterPosition: 5, jumperPosition: 6, rearLifterPosition: 7 }, naturalWeight: 30 }
    ]
  }
];
