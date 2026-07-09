import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";

export type DefensivePlan = {
  selectedPlayers: FieldPlayer[];
  likelyJumpPosition: LineoutPosition;
};

export type OffensivePlan = {
  selectedPlayers: FieldPlayer[];
  targetPosition: LineoutPosition;
};

function averageLiftAround(players: FieldPlayer[], targetIndex: number): number {
  const left = players[targetIndex - 1]?.lift ?? 0;
  const right = players[targetIndex + 1]?.lift ?? 0;
  if (left && right) {
    return (left + right) / 2;
  }
  if (left || right) {
    return Math.max(left, right) * 0.65;
  }
  return 10;
}

function findBestPosition(players: FieldPlayer[], scoreAt: (player: FieldPlayer, index: number) => number): LineoutPosition {
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  players.forEach((player, index) => {
    const score = scoreAt(player, index);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return (bestIndex + 1) as LineoutPosition;
}

export function buildDefensivePlan(players: FieldPlayer[], numberOfPlayers: number): DefensivePlan {
  const selectedPlayers = players.slice(0, numberOfPlayers);
  const likelyJumpPosition = findBestPosition(
    selectedPlayers,
    (player, index) => player.jump * 0.6 + averageLiftAround(selectedPlayers, index) * 0.25 + player.hands * 0.15
  );
  return { selectedPlayers, likelyJumpPosition };
}

export function buildOffensivePlan(players: FieldPlayer[], numberOfPlayers: number): OffensivePlan {
  const selectedPlayers = players.slice(0, numberOfPlayers);
  const targetPosition = findBestPosition(selectedPlayers, (player, index) => {
    const position = index + 1;
    const distancePenalty = position >= 6 ? 8 : position >= 4 ? 4 : 0;
    return player.jump * 0.5 + averageLiftAround(selectedPlayers, index) * 0.35 + player.hands * 0.15 - distancePenalty;
  });
  return { selectedPlayers, targetPosition };
}
