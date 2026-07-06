import type { FieldPlayer, Hooker } from "../models/Player";
import type { Team } from "../models/Team";
import { PLAYER_NICKNAMES } from "../data/defaultNames";
import { randomInt } from "../utils/Random";
import { clamp } from "../utils/Clamp";

function statAround(base: number): number {
  return clamp(randomInt(base - 12, base + 12), 10, 95);
}

export function createDefaultHooker(id: string, nickname: string, base = 45): Hooker {
  return {
    id,
    role: "hooker",
    number: 2,
    nickname,
    height: randomInt(168, 183),
    width: randomInt(78, 92),
    throwing: statAround(base)
  };
}

export function createDefaultLineoutPlayers(base = 45, prefix = "p"): FieldPlayer[] {
  const numbers = [1, 3, 4, 5, 6, 7, 8];
  return numbers.map((number, index) => ({
    id: `${prefix}${index + 1}`,
    role: "field",
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    height: randomInt(number <= 3 ? 176 : 184, number <= 3 ? 190 : 202),
    width: randomInt(number <= 3 ? 92 : 82, number <= 3 ? 110 : 102),
    jump: statAround(base + (number === 4 || number === 5 ? 8 : 0)),
    lift: statAround(base + (number === 1 || number === 3 ? 8 : 0)),
    hands: statAround(base)
  }));
}

export function createDefaultPlayerTeam(name: string): Team {
  return {
    id: "player_team",
    name,
    divisionId: "regionale_3",
    colors: { primary: 0x2563eb, secondary: 0xffffff },
    hooker: createDefaultHooker("h2", "Dédé", 45),
    lineoutPlayers: createDefaultLineoutPlayers(45, "p")
  };
}
