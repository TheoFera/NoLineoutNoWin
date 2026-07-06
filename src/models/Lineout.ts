import type { Combination, LineoutPosition } from "./Combination";
import type { FieldPlayer, Hooker } from "./Player";

export type PitchZone = "our_22" | "our_half" | "middle" | "their_half" | "their_22";
export type ThrowingSide = "us" | "opponent";
export type LineoutDisplayedResult = "won" | "won_dirty" | "lost" | "fault";
export type LineoutInternalEvent =
  | "clean_catch"
  | "dirty_catch"
  | "overthrow"
  | "underthrow"
  | "not_straight"
  | "stolen"
  | "knock_on";

export type LineoutSetup = {
  throwingSide: ThrowingSide;
  pitchZone: PitchZone;
  numberOfPlayers: number;
  hooker: Hooker;
  attackingPlayers: FieldPlayer[];
  defendingPlayers: FieldPlayer[];
  combination?: Combination;
  targetPlayerId?: string;
  targetPosition?: LineoutPosition;
  defensiveJumpPosition?: LineoutPosition;
};

export type LineoutResult = {
  displayedResult: LineoutDisplayedResult;
  internalEvent: LineoutInternalEvent;
  possessionDelta: number;
  occupationDelta: number;
  explanationKey: string;
};
