import type { LineoutPosition } from "./Combination";

export type CombinationTargetMemory = Record<
  string,
  Partial<Record<LineoutPosition, number>>
>;

export type OpponentLineoutMemory = {
  directObservations: CombinationTargetMemory;
  videoObservations: CombinationTargetMemory;
  globalTargetCounts: Partial<Record<LineoutPosition, number>>;
};

export type DefensivePositionStat = {
  attempts: number;
  successfulStops: number;
};

export type PlayerDefenseMemory = Partial<Record<LineoutPosition, DefensivePositionStat>>;

export type OpponentAiMemory = {
  playerTargets: OpponentLineoutMemory;
  playerDefense: PlayerDefenseMemory;
};

export type LineoutVideoObservation = {
  combinationId: string;
  targetPosition: LineoutPosition;
};

export type LineoutVideoMatch = {
  opponentId: string;
  playedAt: string;
  observations: LineoutVideoObservation[];
};

export type OpponentAiIdentity = {
  aiIntelligence: number;
  videoPreparation: number;
  videoMatchesAnalyzed: number;
};
