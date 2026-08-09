import type { Combination } from "./Combination";
import type { LineoutResolution, LineoutResolutionTeam } from "./Lineout";
import type { FieldPlayer, Hooker } from "./Player";

export type LineoutV3Side = "throwingTeam" | "defendingTeam";

export type LineoutV3Point = {
  depthMeters: number;
  lateralMeters: number;
  heightMeters: number;
};

export type LineoutV3PlayerActivity =
  | "ready"
  | "moving"
  | "feinting"
  | "jumping"
  | "lifting"
  | "landing"
  | "unavailable";

export type LineoutV3Movement = {
  destinationDepthMeters: number;
  waypoints: Array<Pick<LineoutV3Point, "depthMeters" | "lateralMeters">>;
  waypointIndex: number;
};

export type LineoutV3Jump = {
  startedAtMs: number;
  durationMs: number;
  apexHoldDurationMs: number;
  maximumHandHeightMeters: number;
  lifterIds: string[];
  feint: boolean;
};

export type LineoutV3PlayerState = {
  player: FieldPlayer;
  side: LineoutV3Side;
  position: LineoutV3Point;
  standingLateralMeters: number;
  handHeightMeters: number;
  activity: LineoutV3PlayerActivity;
  movement?: LineoutV3Movement;
  jump?: LineoutV3Jump;
  lastJump?: Pick<LineoutV3Jump, "startedAtMs" | "durationMs">;
  fatiguePercent: number;
  hasJumped: boolean;
  hasLifted: boolean;
  engagedByPlayerId?: string;
  attemptedBall: boolean;
};

export type LineoutV3ThrowGesture = {
  distancePixels: number;
  durationMs: number;
};

export type LineoutV3ThrowValidation =
  | { valid: true }
  | { valid: false; reason: "tooShort" | "tooSlow" };

export type LineoutV3BallTrajectory = {
  requestedDepthMeters: number;
  actualDepthMeters: number;
  groundDepthMeters: number;
  controlHeightMeters: number;
  targetHeightMeters: number;
  lateralEndMeters: number;
  flightDurationMs: number;
  quality: number;
  classification: "precise" | "low" | "high" | "notStraight";
};

export type LineoutV3BallState = {
  releasedAtMs: number;
  position: LineoutV3Point;
  trajectory: LineoutV3BallTrajectory;
  completed: boolean;
};

export type LineoutV3Feedback =
  | "tooShort"
  | "tooLong"
  | "goodTiming"
  | "tooEarly"
  | "tooLate"
  | "slightlyNotStraight"
  | "tooHigh"
  | "tooLow"
  | "optimalCatch";

export type LineoutV3Event =
  | { type: "combinationStarted" }
  | { type: "phaseStarted"; phaseIndex: number }
  | { type: "throwReleased"; trajectory: LineoutV3BallTrajectory }
  | { type: "playerMoved"; playerId: string }
  | { type: "jumpStarted"; playerId: string; lifterIds: string[]; feint: boolean }
  | { type: "ballContact"; playerIds: string[] }
  | { type: "resolved"; resolution: LineoutResolution; feedback: LineoutV3Feedback[] };

export type LineoutV3Setup = {
  minute: number;
  throwingHooker: Hooker;
  attackingPlayers: FieldPlayer[];
  defendingPlayers: FieldPlayer[];
  attackingDepthsMeters: number[];
  defendingDepthsMeters: number[];
  combination: Combination;
  fatigueByPlayerId: Record<string, number>;
};

export type LineoutV3Snapshot = {
  elapsedMs: number;
  combinationStarted: boolean;
  defenseLocked: boolean;
  players: LineoutV3PlayerState[];
  ball: LineoutV3BallState | null;
  resolution: LineoutResolution | null;
  feedback: LineoutV3Feedback[];
};

export type LineoutV3ContactResult = {
  winner: LineoutResolutionTeam | null;
  outcome: LineoutResolution["outcome"] | null;
  offendingTeam?: LineoutResolutionTeam;
  playerId?: string;
  score?: number;
};
