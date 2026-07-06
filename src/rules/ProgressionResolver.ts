import type { FieldPlayer, Hooker } from "../models/Player";
import { clamp } from "../utils/Clamp";

export function progressTargetPlayer(player: FieldPlayer, cleanWin: boolean): FieldPlayer {
  return {
    ...player,
    jump: clamp(player.jump + (cleanWin ? 2 : 1), 1, 99),
    hands: clamp(player.hands + (cleanWin ? 1 : 0), 1, 99)
  };
}

export function progressHooker(hooker: Hooker, cleanWin: boolean, targetPosition: number): Hooker {
  const difficultyBonus = targetPosition >= 6 ? 2 : targetPosition >= 4 ? 1 : 0;
  return {
    ...hooker,
    throwing: clamp(hooker.throwing + (cleanWin ? 1 + difficultyBonus : 0), 1, 99)
  };
}
