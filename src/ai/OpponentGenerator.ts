import type { Team } from "../models/Team";
import type { Division } from "../models/Division";
import { createDefaultHooker, createDefaultLineoutPlayers } from "../rules/TeamFactory";
import { randomInt } from "../utils/Random";

export function generateOpponent(index: number, division: Division): Team {
  const base = division.opponentSkill;
  return {
    id: `opponent_${index}`,
    name: `Adversaire ${index}`,
    divisionId: division.id,
    colors: { primary: 0x7f1d1d, secondary: 0xfacc15 },
    hooker: createDefaultHooker("oh2", "Talonneur", randomInt(base - 8, base + 8)),
    lineoutPlayers: createDefaultLineoutPlayers(base, `op${index}`)
  };
}
