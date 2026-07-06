import type { DivisionId } from "./Division";
import type { PitchZone, ThrowingSide } from "./Lineout";
import type { Team } from "./Team";

export type MatchLineoutEvent = {
  id: string;
  minute: number;
  pitchZone: PitchZone;
  throwingSide: ThrowingSide;
  resolved: boolean;
};

export type MatchStateData = {
  id: string;
  divisionId: DivisionId;
  home: Team;
  away: Team;
  minute: number;
  maxMinute: number;
  ourScore: number;
  opponentScore: number;
  possession: number; // 0 à 100
  occupation: number; // 0 à 100
  lineouts: MatchLineoutEvent[];
  currentLineoutIndex: number;
};
