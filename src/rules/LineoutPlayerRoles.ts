import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { FieldPlayer } from "../models/Player.ts";

export function canBeLineoutJumper(player: FieldPlayer): boolean {
  return player.technique >= LINEOUT_BALANCE.generation.roleThreshold;
}

export function canBeLineoutLifter(player: FieldPlayer): boolean {
  return player.strength >= LINEOUT_BALANCE.generation.roleThreshold;
}
