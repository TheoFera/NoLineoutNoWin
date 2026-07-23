import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { LINEOUT_COMBINATIONS } from "../data/LineoutCombinations.ts";
import type {
  Combination,
  CombinationTargetOption,
  LineoutCombinationDefinition,
  LineoutPosition,
  OffensiveRepertoire
} from "../models/Combination.ts";
import type { FieldPlayer, Hooker } from "../models/Player.ts";
import type { TeamLineoutStyle } from "../models/Team.ts";
import { randomFloat, type RandomSource } from "../utils/Random.ts";
import {
  calculateExceptionalErrorProbability,
  calculateThrowRandomAmplitude,
  getDistanceCoefficient,
  calculateDistanceIndex
} from "./LineoutThrowResolver.ts";
import { getTargetNaturalWeight } from "./CombinationRules.ts";

const GENERATION = LINEOUT_BALANCE.generation;
const THROWING = LINEOUT_BALANCE.throwing;

type PlayerByPosition = Partial<Record<LineoutPosition, FieldPlayer>>;

export type AssignedLineoutCombination = {
  combination: Combination;
  definition: LineoutCombinationDefinition;
  eligibleOptionIds: string[];
  assignmentScore: number;
};

export type TeamRepertoireAssignment = {
  combinations: Combination[];
  repertoire: OffensiveRepertoire;
  rejectedCombinationIds: string[];
};

export function calculateStraightThrowProbability(
  throwing: number,
  targetPosition: LineoutPosition
): number {
  const distanceIndex = calculateDistanceIndex(targetPosition);
  const center = throwing * getDistanceCoefficient(distanceIndex);
  const amplitude = calculateThrowRandomAmplitude(throwing);
  const minimumStraightQuality = THROWING.notStraightThreshold;
  let normalStraightProbability: number;

  if (center - amplitude >= minimumStraightQuality) {
    normalStraightProbability = 1;
  } else if (center + amplitude < minimumStraightQuality) {
    normalStraightProbability = 0;
  } else {
    normalStraightProbability = (center + amplitude - minimumStraightQuality) / (2 * amplitude);
  }

  return (1 - calculateExceptionalErrorProbability(distanceIndex)) * normalStraightProbability;
}

export function assignPlayersToCombination(
  definition: LineoutCombinationDefinition,
  hooker: Hooker,
  availablePlayers: readonly FieldPlayer[]
): AssignedLineoutCombination | null {
  if (availablePlayers.length < definition.occupiedPositions.length) return null;

  const throwEligibleOptions = definition.targetOptions.filter((option) => (
    calculateStraightThrowProbability(hooker.throwing, option.targetPosition) >= 0.5
  ));
  if (throwEligibleOptions.length === 0) return null;

  let best:
    | { playersByPosition: PlayerByPosition; eligibleOptions: CombinationTargetOption[]; score: number }
    | undefined;

  visitAssignments(
    definition.occupiedPositions,
    availablePlayers,
    (playersByPosition) => {
      const eligibleOptions = throwEligibleOptions.filter((option) => (
        isOptionEligible(option, playersByPosition)
      ));
      if (eligibleOptions.length === 0) return;
      const score = eligibleOptions.reduce(
        (total, option) => total + calculateOptionAssignmentScore(option, playersByPosition),
        0
      );

      if (
        !best
        || eligibleOptions.length > best.eligibleOptions.length
        || (eligibleOptions.length === best.eligibleOptions.length && score > best.score)
      ) {
        best = {
          playersByPosition: { ...playersByPosition },
          eligibleOptions,
          score
        };
      }
    }
  );

  if (!best) return null;
  const selected = best as {
    playersByPosition: PlayerByPosition;
    eligibleOptions: CombinationTargetOption[];
    score: number;
  };
  return {
    definition,
    eligibleOptionIds: selected.eligibleOptions.map((option) => option.id),
    assignmentScore: selected.score,
    combination: {
      id: definition.id,
      nameKey: `combo.${definition.id}`,
      risk: 0,
      complexity: 0,
      slots: [1, 2, 3, 4, 5, 6, 7].map((position) => ({
        position: position as LineoutPosition,
        playerId: selected.playersByPosition[position as LineoutPosition]?.id ?? null
      })),
      targetOptions: selected.eligibleOptions.map(cloneOption)
    }
  };
}

export function assignTeamLineoutRepertoire(options: {
  hooker: Hooker;
  players: readonly FieldPlayer[];
  style: TeamLineoutStyle;
  activeCount: number;
  reserveCount: number;
  rng: RandomSource;
  library?: readonly LineoutCombinationDefinition[];
}): TeamRepertoireAssignment {
  const library = options.library ?? LINEOUT_COMBINATIONS;
  const assigned = library
    .map((definition) => assignPlayersToCombination(definition, options.hooker, options.players))
    .filter((item): item is AssignedLineoutCombination => Boolean(item));
  const selected = weightedSelectionWithoutReplacement(
    assigned,
    Math.min(assigned.length, Math.max(0, options.activeCount + options.reserveCount)),
    (item) => calculateCombinationStyleWeight(item, options.style),
    options.rng
  );
  const activeCount = Math.min(Math.max(0, options.activeCount), selected.length);
  const activeCombinationIds = selected.slice(0, activeCount).map((item) => item.combination.id);
  const reserveCombinationIds = selected
    .slice(activeCount, activeCount + Math.max(0, options.reserveCount))
    .map((item) => item.combination.id);
  const selectedIds = new Set(selected.map((item) => item.combination.id));

  return {
    combinations: selected.map((item) => item.combination),
    repertoire: { activeCombinationIds, reserveCombinationIds },
    rejectedCombinationIds: library
      .map((definition) => definition.id)
      .filter((id) => !selectedIds.has(id))
  };
}

function isOptionEligible(
  option: CombinationTargetOption,
  playersByPosition: PlayerByPosition
): boolean {
  if (option.type === "directCatch") {
    return Boolean(playerAt(playersByPosition, option.roles.directCatcherPosition ?? option.targetPosition));
  }

  const jumper = playerAt(playersByPosition, option.roles.jumperPosition ?? option.targetPosition);
  const frontLifter = playerAt(playersByPosition, option.roles.frontLifterPosition);
  const rearLifter = playerAt(playersByPosition, option.roles.rearLifterPosition);
  if (!jumper || !frontLifter || !rearLifter || jumper.jump < GENERATION.roleThreshold) {
    return false;
  }

  return calculateExpectedJump(jumper, rearLifter, frontLifter)
    >= GENERATION.minimumExpectedJump;
}

export function calculateExpectedJump(
  jumper: FieldPlayer,
  rearLifter: FieldPlayer,
  frontLifter: FieldPlayer
): number {
  return jumper.jump * LINEOUT_BALANCE.jumping.jumperWeight
    + rearLifter.lift * LINEOUT_BALANCE.jumping.rearLifterWeight
    + frontLifter.lift * LINEOUT_BALANCE.jumping.frontLifterWeight
    + LINEOUT_BALANCE.jumping.twoLiftersModifier;
}

function calculateOptionAssignmentScore(
  option: CombinationTargetOption,
  playersByPosition: PlayerByPosition
): number {
  if (option.type === "directCatch") {
    return playerAt(playersByPosition, option.roles.directCatcherPosition ?? option.targetPosition)?.hands ?? 0;
  }

  const jumper = playerAt(playersByPosition, option.roles.jumperPosition ?? option.targetPosition);
  const rearLifter = playerAt(playersByPosition, option.roles.rearLifterPosition);
  const frontLifter = playerAt(playersByPosition, option.roles.frontLifterPosition);
  if (!jumper || !rearLifter || !frontLifter) return 0;
  const weights = GENERATION.assignmentWeights;
  return jumper.jump * weights.jumper.jump
    + jumper.hands * weights.jumper.hands
    + rearLifter.lift * weights.rearLifter.lift
    + rearLifter.jump * weights.rearLifter.jump
    + frontLifter.lift * weights.frontLifter.lift
    + frontLifter.jump * weights.frontLifter.jump;
}

function calculateCombinationStyleWeight(
  item: AssignedLineoutCombination,
  style: TeamLineoutStyle
): number {
  const size = item.definition.occupiedPositions.length as 3 | 4 | 5 | 6 | 7;
  const sizeWeight = Math.max(0, style.sizeWeights[size] ?? 1);
  const targetWeight = (item.combination.targetOptions ?? []).reduce((total, option) => (
    total + getTargetNaturalWeight(option, style.naturalTargetWeights)
  ), 0);
  return sizeWeight * targetWeight;
}

function weightedSelectionWithoutReplacement<T>(
  values: readonly T[],
  count: number,
  getWeight: (value: T) => number,
  rng: RandomSource
): T[] {
  const remaining = [...values];
  const selected: T[] = [];

  while (selected.length < count && remaining.length > 0) {
    const weights = remaining.map((value) => Math.max(0, getWeight(value)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let selectedIndex = 0;

    if (total > 0) {
      const roll = randomFloat(0, total, rng);
      let cumulative = 0;
      selectedIndex = weights.findIndex((weight) => {
        cumulative += weight;
        return roll < cumulative;
      });
      if (selectedIndex < 0) selectedIndex = remaining.length - 1;
    } else {
      selectedIndex = Math.min(
        remaining.length - 1,
        Math.floor(randomFloat(0, remaining.length, rng))
      );
    }

    selected.push(remaining.splice(selectedIndex, 1)[0]);
  }

  return selected;
}

function visitAssignments(
  positions: readonly LineoutPosition[],
  players: readonly FieldPlayer[],
  visit: (playersByPosition: PlayerByPosition) => void
): void {
  const playersByPosition: PlayerByPosition = {};
  const usedPlayerIds = new Set<string>();

  function assign(positionIndex: number): void {
    if (positionIndex >= positions.length) {
      visit(playersByPosition);
      return;
    }

    const position = positions[positionIndex];
    for (const player of players) {
      if (usedPlayerIds.has(player.id)) continue;
      usedPlayerIds.add(player.id);
      playersByPosition[position] = player;
      assign(positionIndex + 1);
      delete playersByPosition[position];
      usedPlayerIds.delete(player.id);
    }
  }

  assign(0);
}

function playerAt(
  playersByPosition: PlayerByPosition,
  position?: LineoutPosition
): FieldPlayer | undefined {
  return position ? playersByPosition[position] : undefined;
}

function cloneOption(option: CombinationTargetOption): CombinationTargetOption {
  return { ...option, roles: { ...option.roles } };
}
