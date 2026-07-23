import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutPosition } from "../models/Combination.ts";
import type {
  CombinationTargetMemory,
  LineoutVideoMatch,
  OpponentAiMemory,
  OpponentLineoutMemory,
  PlayerDefenseMemory
} from "../models/LineoutAI.ts";
import { clamp } from "../utils/Clamp.ts";
import { toCanonicalLineoutCombinationId } from "../data/LineoutCombinations.ts";

const MEMORY = LINEOUT_BALANCE.ai.memory;

export type TargetFrequencyEstimate = {
  frequency: number;
  confidence: number;
  combinationObservations: number;
  globalObservations: number;
};

export function createEmptyOpponentLineoutMemory(): OpponentLineoutMemory {
  return {
    directObservations: {},
    videoObservations: {},
    globalTargetCounts: {}
  };
}

export function createEmptyOpponentAiMemory(): OpponentAiMemory {
  return {
    playerTargets: createEmptyOpponentLineoutMemory(),
    playerDefense: {}
  };
}

export function normalizeOpponentAiMemory(
  memory?: Partial<OpponentAiMemory>
): OpponentAiMemory {
  return {
    playerTargets: {
      directObservations: cloneTargetMemory(memory?.playerTargets?.directObservations),
      videoObservations: cloneTargetMemory(memory?.playerTargets?.videoObservations),
      globalTargetCounts: normalizePositionCounts(memory?.playerTargets?.globalTargetCounts)
    },
    playerDefense: normalizeDefenseMemory(memory?.playerDefense)
  };
}

export function observePlayerTarget(
  memory: OpponentAiMemory,
  combinationId: string,
  targetPosition: LineoutPosition
): OpponentAiMemory {
  const normalized = normalizeOpponentAiMemory(memory);
  incrementTarget(
    normalized.playerTargets.directObservations,
    toCanonicalLineoutCombinationId(combinationId),
    targetPosition,
    1
  );
  normalized.playerTargets.globalTargetCounts[targetPosition] =
    (normalized.playerTargets.globalTargetCounts[targetPosition] ?? 0) + 1;
  return normalized;
}

export function observePlayerDefense(
  memory: OpponentAiMemory,
  defensivePosition: LineoutPosition,
  successfulStop: boolean
): OpponentAiMemory {
  const normalized = normalizeOpponentAiMemory(memory);
  const current = normalized.playerDefense[defensivePosition] ?? {
    attempts: 0,
    successfulStops: 0
  };
  normalized.playerDefense[defensivePosition] = {
    attempts: current.attempts + 1,
    successfulStops: current.successfulStops + Number(successfulStop)
  };
  return normalized;
}

export function buildVideoTargetMemory(
  history: readonly LineoutVideoMatch[],
  matchesAnalyzed: number
): CombinationTargetMemory {
  const result: CombinationTargetMemory = {};
  const selected = history.slice(-Math.max(0, matchesAnalyzed)).reverse();
  selected.forEach((match, matchIndex) => {
    const weights = LINEOUT_BALANCE.ai.videoRecencyWeights;
    const weight = weights[Math.min(matchIndex, weights.length - 1)];
    for (const observation of match.observations) {
      incrementTarget(
        result,
        toCanonicalLineoutCombinationId(observation.combinationId),
        observation.targetPosition,
        weight
      );
    }
  });
  return result;
}

export function withVideoObservations(
  memory: OpponentAiMemory,
  history: readonly LineoutVideoMatch[],
  matchesAnalyzed: number
): OpponentAiMemory {
  const normalized = normalizeOpponentAiMemory(memory);
  normalized.playerTargets.videoObservations = buildVideoTargetMemory(history, matchesAnalyzed);
  return normalized;
}

export function estimateTargetFrequency(
  observations: CombinationTargetMemory,
  globalTargetCounts: Partial<Record<LineoutPosition, number>>,
  combinationId: string,
  targetPosition: LineoutPosition
): TargetFrequencyEstimate {
  const combinationCounts = observations[toCanonicalLineoutCombinationId(combinationId)] ?? {};
  const combinationObservations = sumPositionCounts(combinationCounts);
  const globalObservations = sumPositionCounts(globalTargetCounts);
  const combinationFrequency = combinationObservations > 0
    ? (combinationCounts[targetPosition] ?? 0) / combinationObservations
    : 0;
  const globalFrequency = globalObservations > 0
    ? (globalTargetCounts[targetPosition] ?? 0) / globalObservations
    : 0;
  const confidence = Math.min(
    1,
    combinationObservations / MEMORY.fullConfidenceObservations
  );

  return {
    frequency: combinationFrequency * MEMORY.combinationFrequencyWeight
      + globalFrequency * MEMORY.globalFrequencyWeight,
    confidence,
    combinationObservations,
    globalObservations
  };
}

export function estimateDefensiveWeakness(
  memory: PlayerDefenseMemory,
  position: LineoutPosition
): { weakness: number; confidence: number } {
  const stat = memory[position];
  if (!stat || stat.attempts <= 0) return { weakness: 0.5, confidence: 0 };
  return {
    weakness: 1 - stat.successfulStops / stat.attempts,
    confidence: Math.min(1, stat.attempts / MEMORY.fullConfidenceObservations)
  };
}

function incrementTarget(
  memory: CombinationTargetMemory,
  combinationId: string,
  targetPosition: LineoutPosition,
  amount: number
): void {
  const current = memory[combinationId] ?? {};
  memory[combinationId] = {
    ...current,
    [targetPosition]: (current[targetPosition] ?? 0) + amount
  };
}

function cloneTargetMemory(memory?: CombinationTargetMemory): CombinationTargetMemory {
  if (!memory) return {};
  const result: CombinationTargetMemory = {};
  for (const [combinationId, counts] of Object.entries(memory)) {
    const canonicalId = toCanonicalLineoutCombinationId(combinationId);
    const normalizedCounts = normalizePositionCounts(counts);
    for (let position = 1; position <= 7; position += 1) {
      const lineoutPosition = position as LineoutPosition;
      const value = normalizedCounts[lineoutPosition];
      if (value !== undefined) {
        incrementTarget(result, canonicalId, lineoutPosition, value);
      }
    }
  }
  return result;
}

function normalizePositionCounts(
  counts?: Partial<Record<LineoutPosition, number>>
): Partial<Record<LineoutPosition, number>> {
  const result: Partial<Record<LineoutPosition, number>> = {};
  for (let position = 1; position <= 7; position += 1) {
    const value = counts?.[position as LineoutPosition];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      result[position as LineoutPosition] = value;
    }
  }
  return result;
}

function normalizeDefenseMemory(memory?: PlayerDefenseMemory): PlayerDefenseMemory {
  const result: PlayerDefenseMemory = {};
  for (let position = 1; position <= 7; position += 1) {
    const stat = memory?.[position as LineoutPosition];
    if (!stat) continue;
    const attempts = Math.max(0, Math.floor(stat.attempts));
    result[position as LineoutPosition] = {
      attempts,
      successfulStops: clamp(Math.floor(stat.successfulStops), 0, attempts)
    };
  }
  return result;
}

function sumPositionCounts(counts: Partial<Record<LineoutPosition, number>>): number {
  return Object.values(counts).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}
