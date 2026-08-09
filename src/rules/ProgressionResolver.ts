import type { FieldPlayer, Hooker } from "../models/Player";
import { clamp } from "../utils/Clamp.ts";

export function progressTargetPlayer(player: FieldPlayer, cleanWin: boolean): FieldPlayer {
  return {
    ...player,
    speed: clamp(player.speed + (cleanWin ? 2 : 1), 1, 99),
    technique: clamp(player.technique + (cleanWin ? 1 : 0), 1, 99)
  };
}

export function progressHooker(hooker: Hooker, cleanWin: boolean, targetPosition: number): Hooker {
  const difficultyBonus = targetPosition >= 6 ? 2 : targetPosition >= 4 ? 1 : 0;
  return {
    ...hooker,
    throwing: clamp(hooker.throwing + (cleanWin ? 1 + difficultyBonus : 0), 1, 99)
  };
}
