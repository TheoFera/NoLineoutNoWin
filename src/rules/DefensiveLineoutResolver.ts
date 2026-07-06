import type { FieldPlayer } from "../models/Player";
import type { LineoutPosition } from "../models/Combination";
import type { LineoutResult } from "../models/Lineout";
import { clamp } from "../utils/Clamp";
import { randomInt } from "../utils/Random";

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

export function resolveDefensiveLineout(
  defenders: FieldPlayer[],
  selectedDefenderId: string | undefined,
  likelyJumpPosition: LineoutPosition,
  opponentSkill: number
): LineoutResult {
  if (!selectedDefenderId) {
    return {
      displayedResult: "lost",
      internalEvent: "clean_catch",
      possessionDelta: -8,
      occupationDelta: -6,
      explanationKey: "lineout.explanation.defenseMissed"
    };
  }

  const selectedIndex = defenders.findIndex((player) => player.id === selectedDefenderId);
  const selectedPlayer = defenders[selectedIndex];
  if (!selectedPlayer) {
    return {
      displayedResult: "lost",
      internalEvent: "clean_catch",
      possessionDelta: -8,
      occupationDelta: -6,
      explanationKey: "lineout.explanation.defenseMissed"
    };
  }

  const selectedPosition = (selectedIndex + 1) as LineoutPosition;
  const positionGap = Math.abs(selectedPosition - likelyJumpPosition);
  const liftSupport = averageLiftAround(defenders, selectedIndex);
  const jumpScore = selectedPlayer.jump * 0.65 + liftSupport * 0.2 + selectedPlayer.hands * 0.15;
  const timingBonus = positionGap === 0 ? 18 : positionGap === 1 ? 4 : -14;
  const contestScore = clamp(jumpScore + timingBonus - opponentSkill * 0.45 + randomInt(-12, 12), 0, 100);

  if (contestScore >= 68) {
    return {
      displayedResult: "won",
      internalEvent: "stolen",
      possessionDelta: 10,
      occupationDelta: 8,
      explanationKey: "lineout.explanation.defenseStolen"
    };
  }

  if (contestScore >= 48) {
    return {
      displayedResult: "won_dirty",
      internalEvent: "dirty_catch",
      possessionDelta: 4,
      occupationDelta: 2,
      explanationKey: "lineout.explanation.defenseContested"
    };
  }

  if (positionGap >= 2) {
    return {
      displayedResult: "lost",
      internalEvent: "clean_catch",
      possessionDelta: -10,
      occupationDelta: -8,
      explanationKey: "lineout.explanation.defenseLate"
    };
  }

  return {
    displayedResult: "lost",
    internalEvent: "dirty_catch",
    possessionDelta: -6,
    occupationDelta: -4,
    explanationKey: "lineout.explanation.defenseBeaten"
  };
}
