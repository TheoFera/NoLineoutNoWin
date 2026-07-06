import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";
import { randomInt } from "../utils/Random";

export type DefensivePlan = {
  selectedPlayers: FieldPlayer[];
  likelyJumpPosition: LineoutPosition;
  pressure: number;
};

export function buildDefensivePlan(players: FieldPlayer[], numberOfPlayers: number, opponentSkill: number): DefensivePlan {
  const selectedPlayers = players.slice(0, numberOfPlayers);
  const likelyJumpPosition = randomInt(1, numberOfPlayers) as LineoutPosition;
  const bestJump = selectedPlayers.reduce((best, player) => Math.max(best, player.jump), 0);
  const pressure = Math.round((opponentSkill + bestJump) / 2);
  return { selectedPlayers, likelyJumpPosition, pressure };
}
