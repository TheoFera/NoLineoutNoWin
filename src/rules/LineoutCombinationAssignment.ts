import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import {
  createTargetOptionsForFormation,
  LINEOUT_COMBINATIONS
} from "../data/LineoutCombinations.ts";
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
import { canBeLineoutJumper, canBeLineoutLifter } from "./LineoutPlayerRoles.ts";
import {
  getTargetNaturalWeight,
  hasSupportedAerialTarget
} from "./CombinationRules.ts";

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
        isTargetOptionEligible(option, playersByPosition)
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
  const active = weightedSelectionWithoutReplacement(
    assigned,
    Math.min(assigned.length, Math.max(0, options.activeCount)),
    (item) => calculateCombinationStyleWeight(item, options.style),
    options.rng,
    maximumNonAerialSelection(options.activeCount)
  );
  const activeIds = new Set(active.map((item) => item.combination.id));
  const reserveCandidates = assigned.filter((item) => !activeIds.has(item.combination.id));
  const reserve = weightedSelectionWithoutReplacement(
    reserveCandidates,
    Math.min(reserveCandidates.length, Math.max(0, options.reserveCount)),
    (item) => calculateCombinationStyleWeight(item, options.style),
    options.rng,
    maximumNonAerialSelection(options.reserveCount)
  );
  const selected = [...active, ...reserve];
  const activeCombinationIds = active.map((item) => item.combination.id);
  const reserveCombinationIds = reserve.map((item) => item.combination.id);
  const selectedIds = new Set(selected.map((item) => item.combination.id));

  return {
    combinations: selected.map((item) => item.combination),
    repertoire: { activeCombinationIds, reserveCombinationIds },
    rejectedCombinationIds: library
      .map((definition) => definition.id)
      .filter((id) => !selectedIds.has(id))
  };
}

export function isTargetOptionEligible(
  option: CombinationTargetOption,
  playersByPosition: PlayerByPosition
): boolean {
  if (option.type === "directCatch") {
    return Boolean(playerAt(playersByPosition, option.roles.directCatcherPosition ?? option.targetPosition));
  }

  const jumper = playerAt(playersByPosition, option.roles.jumperPosition ?? option.targetPosition);
  const frontLifter = playerAt(playersByPosition, option.roles.frontLifterPosition);
  const rearLifter = playerAt(playersByPosition, option.roles.rearLifterPosition);
  if (
    !jumper
    || !frontLifter
    || !rearLifter
    || !canBeLineoutJumper(jumper)
    || !canBeLineoutLifter(frontLifter)
    || !canBeLineoutLifter(rearLifter)
  ) {
    return false;
  }

  return calculateExpectedJump(jumper, rearLifter, frontLifter)
    >= GENERATION.minimumExpectedJump;
}

export function rebuildPlayableCombinationTargets(
  combination: Combination,
  availablePlayers: readonly FieldPlayer[]
): Combination {
  const playersById = new Map(availablePlayers.map((player) => [player.id, player]));
  const playersByPosition: PlayerByPosition = {};
  const occupiedPositions: LineoutPosition[] = [];

  for (const slot of combination.slots) {
    if (!slot.playerId || playersByPosition[slot.position]) {
      continue;
    }
    const player = playersById.get(slot.playerId);
    if (!player) {
      continue;
    }
    playersByPosition[slot.position] = player;
    occupiedPositions.push(slot.position);
  }

  occupiedPositions.sort((left, right) => left - right);
  const storedOptions = combination.targetOptions ?? [];
  const playableOptions = createTargetOptionsForFormation(
    combination.id,
    occupiedPositions
  )
    .map((generatedOption) => {
      const storedOption = storedOptions.find((option) => (
        option.type === generatedOption.type
        && option.targetPosition === generatedOption.targetPosition
      ));
      return storedOption ? cloneOption(storedOption) : generatedOption;
    })
    .filter((option) => isTargetOptionEligible(option, playersByPosition));
  const totalNaturalWeight = playableOptions.reduce(
    (total, option) => total + Math.max(0, option.defaultNaturalWeight),
    0
  );

  return {
    ...combination,
    slots: combination.slots.map((slot) => ({ ...slot })),
    targetOptions: playableOptions.map((option) => ({
      ...cloneOption(option),
      defaultNaturalWeight: totalNaturalWeight > 0
        ? (Math.max(0, option.defaultNaturalWeight) / totalNaturalWeight) * 100
        : 100 / Math.max(1, playableOptions.length)
    }))
  };
}

export function calculateExpectedJump(
  jumper: FieldPlayer,
  rearLifter: FieldPlayer,
  frontLifter: FieldPlayer
): number {
  return jumper.technique * LINEOUT_BALANCE.jumping.jumperWeight
    + rearLifter.strength * LINEOUT_BALANCE.jumping.rearLifterWeight
    + frontLifter.strength * LINEOUT_BALANCE.jumping.frontLifterWeight
    + LINEOUT_BALANCE.jumping.twoLiftersModifier;
}

function calculateOptionAssignmentScore(
  option: CombinationTargetOption,
  playersByPosition: PlayerByPosition
): number {
  if (option.type === "directCatch") {
    return playerAt(playersByPosition, option.roles.directCatcherPosition ?? option.targetPosition)?.technique ?? 0;
  }

  const jumper = playerAt(playersByPosition, option.roles.jumperPosition ?? option.targetPosition);
  const rearLifter = playerAt(playersByPosition, option.roles.rearLifterPosition);
  const frontLifter = playerAt(playersByPosition, option.roles.frontLifterPosition);
  if (!jumper || !rearLifter || !frontLifter) return 0;
  const weights = GENERATION.assignmentWeights;
  return jumper.technique * weights.jumper.jump
    + jumper.technique * weights.jumper.hands
    + rearLifter.strength * weights.rearLifter.lift
    + rearLifter.technique * weights.rearLifter.jump
    + frontLifter.strength * weights.frontLifter.lift
    + frontLifter.technique * weights.frontLifter.jump;
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

function weightedSelectionWithoutReplacement(
  values: readonly AssignedLineoutCombination[],
  count: number,
  getWeight: (value: AssignedLineoutCombination) => number,
  rng: RandomSource,
  maximumNonAerial = Number.POSITIVE_INFINITY
): AssignedLineoutCombination[] {
  const remaining = [...values];
  const selected: AssignedLineoutCombination[] = [];
  let nonAerialCount = 0;

  while (selected.length < count && remaining.length > 0) {
    const candidates = remaining.filter((value) => (
      hasSupportedAerialTarget(value.combination)
      || nonAerialCount < maximumNonAerial
    ));
    if (candidates.length === 0) break;
    const weights = candidates.map((value) => Math.max(0, getWeight(value)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let selectedIndex = 0;

    if (total > 0) {
      const roll = randomFloat(0, total, rng);
      let cumulative = 0;
      selectedIndex = weights.findIndex((weight) => {
        cumulative += weight;
        return roll < cumulative;
      });
      if (selectedIndex < 0) selectedIndex = candidates.length - 1;
    } else {
      selectedIndex = Math.min(
        candidates.length - 1,
        Math.floor(randomFloat(0, candidates.length, rng))
      );
    }

    const selectedValue = candidates[selectedIndex];
    if (!hasSupportedAerialTarget(selectedValue.combination)) {
      nonAerialCount += 1;
    }
    selected.push(selectedValue);
    remaining.splice(remaining.indexOf(selectedValue), 1);
  }

  return selected;
}

function maximumNonAerialSelection(count: number): number {
  return Math.floor(
    Math.max(0, count) * LINEOUT_BALANCE.ai.maximumNonAerialCombinationRatio
  );
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
