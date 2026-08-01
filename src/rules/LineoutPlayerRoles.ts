import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { FieldPlayer } from "../models/Player.ts";

export function canBeLineoutJumper(player: FieldPlayer): boolean {
  return player.jump >= LINEOUT_BALANCE.generation.roleThreshold;
}

export function canBeLineoutLifter(player: FieldPlayer): boolean {
  return player.lift >= LINEOUT_BALANCE.generation.roleThreshold;
}
