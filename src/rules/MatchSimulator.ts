import type { MatchLineoutEvent, MatchStateData } from "../models/Match";
import type { Division } from "../models/Division";
import { randomInt } from "../utils/Random";
import { clamp } from "../utils/Clamp";

export function generateMatchLineouts(division: Division): MatchLineoutEvent[] {
  const count = randomInt(division.minLineouts, division.maxLineouts);
  const zones = ["our_22", "our_half", "middle", "their_half", "their_22"] as const;
  const lineouts: MatchLineoutEvent[] = [];

  for (let i = 0; i < count; i += 1) {
    const throwingSide = Math.random() > 0.45 ? "us" : "opponent";
    lineouts.push({
      id: `lineout_${i + 1}`,
      minute: randomInt(4, 78),
      pitchZone: zones[randomInt(0, zones.length - 1)],
      throwingSide,
      numberOfPlayers: throwingSide === "us" ? 7 : randomInt(4, 7),
      resolved: false
    });
  }

  return lineouts.sort((a, b) => a.minute - b.minute);
}

export function updateMatchAfterLineout(match: MatchStateData, possessionDelta: number, occupationDelta: number): MatchStateData {
  const possession = clamp(match.possession + possessionDelta, 0, 100);
  const occupation = clamp(match.occupation + occupationDelta, 0, 100);
  const scoringPower = possession * 0.45 + occupation * 0.55 + randomInt(-20, 20);
  let ourScore = match.ourScore;
  let opponentScore = match.opponentScore;

  if (scoringPower > 82) ourScore += Math.random() > 0.55 ? 7 : 3;
  if (scoringPower < 18) opponentScore += Math.random() > 0.55 ? 7 : 3;

  return { ...match, possession, occupation, ourScore, opponentScore };
}
