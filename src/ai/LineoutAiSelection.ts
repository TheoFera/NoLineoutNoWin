import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type {
  Combination,
  CombinationTargetOption,
  LineoutPosition,
  OffensiveRepertoire
} from "../models/Combination.ts";
import type { LineoutOutcome } from "../models/Lineout.ts";
import type {
  OpponentAiIdentity,
  OpponentAiMemory
} from "../models/LineoutAI.ts";
import type { TeamLineoutStyle } from "../models/Team.ts";
import { clamp } from "../utils/Clamp.ts";
import { randomFloat, type RandomSource } from "../utils/Random.ts";
import {
  estimateDefensiveWeakness,
  estimateTargetFrequency
} from "./LineoutMemory.ts";

const AI = LINEOUT_BALANCE.ai;
const SELECTION = AI.selection;

export type AiFieldZone = "own22" | "midfield" | "opponent22";

export type PreviousAiLineout = {
  combinationId: string;
  targetPosition: LineoutPosition;
  outcome: LineoutOutcome;
};

export type AiOffensiveDecision = {
  combination: Combination;
  targetOption: CombinationTargetOption;
  targetPlayerId: string;
  combinationScores: Record<string, number>;
  targetScores: Record<string, number>;
};

export type AiDefensivePrediction = {
  predictedPosition: LineoutPosition;
  optionScores: Record<string, number>;
  directConfidence: number;
  videoConfidence: number;
  bestTargetProbability: number;
};

export function chooseAiOffensiveLineout(options: {
  combinations: readonly Combination[];
  repertoire: OffensiveRepertoire;
  style: TeamLineoutStyle;
  zone: AiFieldZone;
  memory: OpponentAiMemory;
  identity: OpponentAiIdentity;
  previous?: PreviousAiLineout;
  rng: RandomSource;
}): AiOffensiveDecision {
  const activeIds = new Set(options.repertoire.activeCombinationIds);
  const candidates = options.combinations.filter((combination) => (
    activeIds.has(combination.id)
    && getPlayableOptions(combination).length > 0
  ));
  if (candidates.length === 0) {
    throw new Error("AI has no active lineout combination with a playable target");
  }

  const combinationScores = Object.fromEntries(candidates.map((combination) => [
    combination.id,
    calculateCombinationScore(combination, options)
  ]));
  const combination = weightedChoice(
    candidates,
    (item) => combinationScores[item.id],
    options.rng
  );
  const targetOptions = getPlayableOptions(combination);
  const targetScores = Object.fromEntries(targetOptions.map((targetOption) => [
    targetOption.id,
    calculateOffensiveTargetScore(combination, targetOption, options)
  ]));
  const targetOption = weightedChoice(
    targetOptions,
    (item) => targetScores[item.id],
    options.rng
  );
  const rolePosition = targetOption.type === "directCatch"
    ? targetOption.roles.receiverPosition
    : targetOption.roles.jumperPosition;
  const targetPlayerId = combination.slots.find(
    (slot) => slot.position === (rolePosition ?? targetOption.targetPosition)
  )?.playerId;
  if (!targetPlayerId) {
    throw new Error(`AI target ${targetOption.id} has no assigned player`);
  }

  return {
    combination,
    targetOption,
    targetPlayerId,
    combinationScores,
    targetScores
  };
}

export function predictDefensiveTarget(options: {
  combination: Combination;
  naturalTargetWeights?: Partial<Record<LineoutPosition, number>>;
  memory: OpponentAiMemory;
  identity: OpponentAiIdentity;
  divisionId: keyof typeof AI.intelligenceByDivision;
  rng: RandomSource;
}): AiDefensivePrediction {
  const targetOptions = getPlayableOptions(options.combination);
  if (targetOptions.length === 0) {
    throw new Error(`Combination ${options.combination.id} has no playable target`);
  }
  const directGlobal = options.memory.playerTargets.globalTargetCounts;
  const videoGlobal = buildGlobalCounts(options.memory.playerTargets.videoObservations);
  const naturalTotal = targetOptions.reduce(
    (sum, option) => sum + getNaturalTargetWeight(option, options.naturalTargetWeights),
    0
  );
  let maximumDirectConfidence = 0;
  let maximumVideoConfidence = 0;
  const optionScores: Record<string, number> = {};

  for (const targetOption of targetOptions) {
    const direct = estimateTargetFrequency(
      options.memory.playerTargets.directObservations,
      directGlobal,
      options.combination.id,
      targetOption.targetPosition
    );
    const video = estimateTargetFrequency(
      options.memory.playerTargets.videoObservations,
      videoGlobal,
      options.combination.id,
      targetOption.targetPosition
    );
    const directWeight = direct.confidence;
    const videoWeight = (1 - directWeight)
      * video.confidence
      * (options.identity.videoPreparation / SELECTION.videoPreparationScale);
    const naturalWeight = Math.max(0, 1 - directWeight - videoWeight);
    const naturalFrequency = naturalTotal > 0
      ? getNaturalTargetWeight(targetOption, options.naturalTargetWeights) / naturalTotal
      : 1 / targetOptions.length;
    optionScores[targetOption.id] = direct.frequency * directWeight
      + video.frequency * videoWeight
      + naturalFrequency * naturalWeight;
    maximumDirectConfidence = Math.max(maximumDirectConfidence, directWeight);
    maximumVideoConfidence = Math.max(maximumVideoConfidence, videoWeight);
  }

  const divisionIntelligence = AI.intelligenceByDivision[options.divisionId];
  const intelligenceAdjustment = (
    options.identity.aiIntelligence - divisionIntelligence.base
  ) / SELECTION.intelligenceScale;
  const bestTargetProbability = clamp(
    divisionIntelligence.learnedBestTargetProbability + intelligenceAdjustment,
    0,
    1
  );
  const evidenceConfidence = clamp(
    maximumDirectConfidence + maximumVideoConfidence,
    0,
    1
  );
  const chooseBest = randomFloat(0, 1, options.rng)
    < bestTargetProbability * evidenceConfidence;
  const selected = chooseBest
    ? targetOptions.reduce((best, item) => (
      optionScores[item.id] > optionScores[best.id] ? item : best
    ))
    : weightedChoice(targetOptions, (item) => optionScores[item.id], options.rng);

  return {
    predictedPosition: selected.targetPosition,
    optionScores,
    directConfidence: maximumDirectConfidence,
    videoConfidence: maximumVideoConfidence,
    bestTargetProbability
  };
}

function calculateCombinationScore(
  combination: Combination,
  options: Parameters<typeof chooseAiOffensiveLineout>[0]
): number {
  const size = combination.slots.filter((slot) => slot.playerId).length as 4 | 5 | 6 | 7;
  const naturalWeight = options.style.sizeWeights[size] ?? SELECTION.minimumWeight;
  const zone = AI.zoneSizeMultiplier[options.zone];
  const zoneMultiplier = size <= 5 ? zone.short : zone.long;
  const weaknesses = getPlayableOptions(combination).map((target) => (
    estimateDefensiveWeakness(options.memory.playerDefense, target.targetPosition)
  ));
  const knownWeaknesses = weaknesses.filter((entry) => entry.confidence > 0);
  const memoryBonus = knownWeaknesses.length > 0
    ? knownWeaknesses.reduce(
      (sum, entry) => sum + (entry.weakness - 0.5) * SELECTION.scoreScale * entry.confidence,
      0
    ) / knownWeaknesses.length
    : 0;
  const repetitionPenalty = options.previous?.combinationId === combination.id
    ? getRepetitionPenalty(options.previous.outcome).combination
    : 0;
  return naturalWeight * zoneMultiplier
    + memoryBonus
    + repetitionPenalty
    + randomAdjustment(options.rng);
}

function calculateOffensiveTargetScore(
  combination: Combination,
  targetOption: CombinationTargetOption,
  options: Parameters<typeof chooseAiOffensiveLineout>[0]
): number {
  const weakness = estimateDefensiveWeakness(
    options.memory.playerDefense,
    targetOption.targetPosition
  );
  const adaptationEffective = (
    options.identity.aiIntelligence / SELECTION.intelligenceScale
  ) * weakness.confidence;
  const usualWeight = targetOption.naturalWeight
    * (options.style.naturalTargetWeights[targetOption.targetPosition] ?? 1);
  const tacticalScore = weakness.weakness * SELECTION.scoreScale;
  const repetitionPenalty = options.previous?.combinationId === combination.id
    && options.previous.targetPosition === targetOption.targetPosition
    ? getRepetitionPenalty(options.previous.outcome).target
    : 0;
  return usualWeight * (1 - adaptationEffective)
    + tacticalScore * adaptationEffective
    + repetitionPenalty
    + randomAdjustment(options.rng);
}

export function getRepetitionPenalty(outcome: LineoutOutcome): {
  target: number;
  combination: number;
} {
  if (outcome === "cleanWin") return AI.repetitionPenalty.cleanWin;
  if (outcome === "scrappyWin") return AI.repetitionPenalty.scrappyWin;
  if (outcome === "knockOn" || outcome === "notStraight") {
    return AI.repetitionPenalty.fault;
  }
  return AI.repetitionPenalty.turnover;
}

function getPlayableOptions(combination: Combination): CombinationTargetOption[] {
  return (combination.targetOptions ?? []).filter((option) => {
    const rolePosition = option.type === "directCatch"
      ? option.roles.receiverPosition
      : option.roles.jumperPosition;
    return Boolean(combination.slots.find(
      (slot) => slot.position === (rolePosition ?? option.targetPosition)
    )?.playerId);
  });
}

function getNaturalTargetWeight(
  option: CombinationTargetOption,
  style?: Partial<Record<LineoutPosition, number>>
): number {
  return Math.max(0, option.naturalWeight * (style?.[option.targetPosition] ?? 1));
}

function randomAdjustment(rng: RandomSource): number {
  return randomFloat(
    SELECTION.randomAdjustmentMinimum,
    SELECTION.randomAdjustmentMaximum,
    rng
  );
}

function weightedChoice<T>(
  values: readonly T[],
  getScore: (value: T) => number,
  rng: RandomSource
): T {
  const weights = values.map((value) => Math.max(SELECTION.minimumWeight, getScore(value)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const roll = randomFloat(0, total, rng);
  let cumulative = 0;
  for (let index = 0; index < values.length; index += 1) {
    cumulative += weights[index];
    if (roll < cumulative) return values[index];
  }
  return values[values.length - 1];
}

function buildGlobalCounts(
  memory: Record<string, Partial<Record<LineoutPosition, number>>>
): Partial<Record<LineoutPosition, number>> {
  const result: Partial<Record<LineoutPosition, number>> = {};
  for (const counts of Object.values(memory)) {
    for (let position = 1; position <= 7; position += 1) {
      const lineoutPosition = position as LineoutPosition;
      result[lineoutPosition] = (result[lineoutPosition] ?? 0) + (counts[lineoutPosition] ?? 0);
    }
  }
  return result;
}
