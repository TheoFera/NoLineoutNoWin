import type { DivisionId } from "./Division";
import type { PitchZone, ThrowingSide } from "./Lineout";
import type { Team } from "./Team";
import type { LineoutOutcome } from "./Lineout";
import type { LineoutPosition } from "./Combination";

export type MatchPlayerUsage = {
  jump: number;
  lift: number;
  hands: number;
  throwing: number;
};

export type MatchMaximumFatigue = Record<string, number>;

export type MatchBallOwner = "player" | "opponent";

export type TouchCause =
  | "carrierIntoTouch"
  | "openPlayKick"
  | "penaltyKick"
  | "fiftyTwenty"
  | "deflection";

export type MatchLineoutEvent = {
  id: string;
  minute: number;
  pitchZone: PitchZone;
  throwingSide: ThrowingSide;
  numberOfPlayers: number;
  cause: TouchCause;
  ballPositionMeters?: number;
  resolved: boolean;
};

export type MatchCombinationStat = {
  combinationId: string;
  combinationName: string;
  playerCount: number;
  played: number;
  won: number;
  lost: number;
};

export type MatchLineoutSummary = {
  minute: number;
  throwingSide: ThrowingSide;
  displayedResult: "won" | "won_dirty" | "lost" | "fault";
  success: boolean;
  combinationId?: string;
  combinationName?: string;
  targetOptionId?: string;
  targetPosition?: LineoutPosition;
  defensivePosition?: LineoutPosition;
  officialOutcome?: LineoutOutcome;
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
  possession: number; // 0 to 100
  occupation: number; // 0 to 100
  ballOwner: MatchBallOwner;
  ballPositionMeters: number;
  playerPossessionTimeMinutes: number;
  opponentPossessionTimeMinutes: number;
  playerOccupationTimeMinutes: number;
  opponentOccupationTimeMinutes: number;
  playerAttackingPressure: number;
  opponentAttackingPressure: number;
  lineouts: MatchLineoutEvent[];
  currentLineoutIndex: number;
  playerUsage: Record<string, MatchPlayerUsage>;
  combinationStats: Record<string, MatchCombinationStat>;
  opponentCombinationStats: Record<string, MatchCombinationStat>;
  lineoutHistory: MatchLineoutSummary[];
  maximumFatigueByPlayerId: MatchMaximumFatigue;
};
