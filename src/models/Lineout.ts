import type { Combination, LineoutPosition } from "./Combination";
import type { CombinationTargetOption } from "./Combination";
import type { FieldPlayer, Hooker } from "./Player";
import type { RandomSource } from "../utils/Random";

export type PitchZone = "our_22" | "our_half" | "middle" | "their_half" | "their_22";
export type ThrowingSide = "us" | "opponent";
export type LineoutTeam = "us" | "opponent";
export type LineoutResolutionTeam = "throwingTeam" | "defendingTeam";
export type LineoutDisplayedResult = "won" | "won_dirty" | "lost" | "fault";
export type LineoutInternalEvent =
  | "clean_catch"
  | "dirty_catch"
  | "overthrow"
  | "underthrow"
  | "not_straight"
  | "stolen"
  | "knock_on";

export type LineoutTrajectory = "notStraight" | "precise" | "low" | "high";
export type LineoutOutcome =
  | "cleanWin"
  | "scrappyWin"
  | "deflectedTurnover"
  | "cleanSteal"
  | "knockOn"
  | "notStraight"
  | "looseBall";

export type LineoutResolution = {
  outcome: LineoutOutcome;
  ballTeam: LineoutResolutionTeam;
  restart: "continuousPlay" | "scrum";
  offendingTeam?: LineoutResolutionTeam;
  primaryReason: string;
  details: Record<string, number | string | boolean>;
};

export type LineoutAssignments = Partial<Record<LineoutPosition, FieldPlayer>>;

export type LineoutResolutionInput = {
  minute: number;
  throwingTeamId: string;
  defendingTeamId: string;
  throwingHooker: Hooker;
  targetPlayerId: string;
  targetOption: CombinationTargetOption;
  attackingAssignments: LineoutAssignments;
  defendingAssignments: LineoutAssignments;
  defensiveJumpPosition?: LineoutPosition;
  fatigueByPlayerId: Record<string, number>;
  rng: RandomSource;
};

export type LineoutSetup = {
  throwingSide: ThrowingSide;
  pitchZone: PitchZone;
  minute?: number;
  numberOfPlayers: number;
  hooker: Hooker;
  attackingPlayers: Array<FieldPlayer | null>;
  defendingPlayers: Array<FieldPlayer | null>;
  combination?: Combination;
  targetPlayerId?: string;
  targetPosition?: LineoutPosition;
  defensiveJumpPosition?: LineoutPosition;
  maximumFatigueByPlayerId?: Record<string, number>;
  fatigueByPlayerId?: Record<string, number>;
};

export type LineoutResult = {
  displayedResult: LineoutDisplayedResult;
  internalEvent: LineoutInternalEvent;
  possessionDelta: number;
  occupationDelta: number;
  explanationKey: string;
  calculationScore: number;
  calculationDetails: Array<{
    labelKey: string;
    value: number;
  }>;
  resolution?: LineoutResolution;
};
