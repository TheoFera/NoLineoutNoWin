import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";

export type DefensivePlan = {
  selectedPlayers: FieldPlayer[];
  likelyJumpPosition: LineoutPosition;
};

function averageLiftAround(players: FieldPlayer[], targetIndex: number): number {
  const left = players[targetIndex - 1]?.strength ?? 0;
  const right = players[targetIndex + 1]?.strength ?? 0;
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
    (player, index) => player.technique * 0.6 + averageLiftAround(selectedPlayers, index) * 0.25 + player.speed * 0.15
  );
  return { selectedPlayers, likelyJumpPosition };
}

