import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations.ts";
import { toCanonicalLineoutCombinationId } from "../data/LineoutCombinations.ts";
import {
  normalizeCombinationTargetOptions,
  type Combination,
  type CombinationPlayerSlot,
  type CombinationTargetOption,
  type LineoutPosition,
  type OffensiveRepertoire
} from "../models/Combination.ts";
import type { FieldPlayer } from "../models/Player.ts";

function cloneCombination(combination: Combination): Combination {
  return {
    ...combination,
    slots: normalizeCombinationSlots(combination.slots).map((slot) => ({ ...slot })),
    targetOptions: normalizeCombinationTargetOptions(combination.targetOptions),
    plan: combination.plan ? {
      phases: combination.plan.phases.map((phase) => ({
        ...phase,
        actions: phase.actions.map((action) => (
          action.type === "jump"
            ? { ...action, lifterPositions: [...action.lifterPositions] }
            : { ...action }
        ))
      }))
    } : undefined
  };
}

function emptySlots(): CombinationPlayerSlot[] {
  return [1, 2, 3, 4, 5, 6, 7].map((position) => ({
    position: position as LineoutPosition,
    playerId: null
  }));
}

export function normalizeCombinationSlots(slots?: CombinationPlayerSlot[]): CombinationPlayerSlot[] {
  const result = emptySlots();
  if (!slots) {
    return result;
  }

  for (const slot of slots) {
    const index = slot.position - 1;
    if (index < 0 || index >= result.length) {
      continue;
    }

    result[index] = {
      position: slot.position,
      playerId: slot.playerId ?? null
    };
  }

  return result;
}

export function normalizeOffensiveCombinations(combinations?: Combination[]): Combination[] {
  if (!combinations || combinations.length === 0) {
    return DEFAULT_COMBINATIONS.map(cloneCombination);
  }

  const storedCombinations = normalizeStoredOffensiveCombinations(combinations);
  const normalizedById = new Map(
    storedCombinations.map((combination) => [combination.id, combination])
  );
  const orderedDefaults = DEFAULT_COMBINATIONS.map((combination) => (
    normalizedById.get(combination.id) ?? cloneCombination(combination)
  ));
  const additionalCombinations = storedCombinations.filter(
    (combination) => !DEFAULT_COMBINATIONS.some(
      (defaultCombination) => defaultCombination.id === combination.id
    )
  );

  return [...orderedDefaults, ...additionalCombinations];
}

export function normalizeStoredOffensiveCombinations(
  combinations?: readonly Combination[]
): Combination[] {
  const normalizedById = new Map<string, Combination>();
  for (const combination of combinations ?? []) {
    const canonicalId = toCanonicalLineoutCombinationId(combination.id);
    const current = normalizedById.get(canonicalId);
    if (!current || combination.id === canonicalId) {
      const defaultCombination = DEFAULT_COMBINATIONS.find((item) => item.id === canonicalId);
      const validOptionIds = new Set(defaultCombination?.targetOptions?.map((option) => option.id));
      const storedOptions = normalizeCombinationTargetOptions(combination.targetOptions)
        .filter((option) => !defaultCombination || validOptionIds.has(option.id));
      normalizedById.set(canonicalId, {
        ...cloneCombination(combination),
        id: canonicalId,
        nameKey: defaultCombination ? `combo.${canonicalId}` : combination.nameKey,
        targetOptions: storedOptions.length > 0
          ? storedOptions
          : normalizeCombinationTargetOptions(defaultCombination?.targetOptions)
      });
    }
  }
  return [...normalizedById.values()];
}

export function getActiveOffensiveCombinations(
  combinations: Combination[],
  repertoire: OffensiveRepertoire
): Combination[] {
  const byId = new Map(
    normalizeOffensiveCombinations(combinations).map((combination) => [combination.id, combination])
  );
  return repertoire.activeCombinationIds
    .map((id) => byId.get(id))
    .filter((combination): combination is Combination => Boolean(combination));
}

export function getAvailableOffensiveCombinations(combinations: Combination[], maxAvailable: number): Combination[] {
  const normalized = normalizeOffensiveCombinations(combinations);
  return normalized.slice(0, Math.max(1, maxAvailable));
}

export function countAssignedPlayers(combination?: Combination): number {
  return normalizeCombinationSlots(combination?.slots).filter((slot) => slot.playerId !== null).length;
}

export function isCombinationValidForMatch(combination?: Combination): boolean {
  return countAssignedPlayers(combination) >= 2;
}

export function hasValidCombinationForMatch(combinations: Combination[]): boolean {
  return combinations.some(isCombinationValidForMatch);
}

export function getTargetOptionPlayerPosition(option: CombinationTargetOption): LineoutPosition {
  return (option.type === "directCatch"
    ? option.roles.directCatcherPosition
    : option.roles.jumperPosition) ?? option.targetPosition;
}

export function isAerialOnlyCombination(combination: {
  targetOptions?: readonly CombinationTargetOption[];
}): boolean {
  const targetOptions = combination.targetOptions ?? [];
  return targetOptions.length > 0 && targetOptions.every((option) => (
    option.type === "jumpBlock"
    && option.roles.frontLifterPosition !== undefined
    && option.roles.rearLifterPosition !== undefined
  ));
}

export function constrainAiAerialRepertoire(
  combinations: readonly Combination[],
  repertoire: OffensiveRepertoire,
  maximumNonAerialRatio: number
): OffensiveRepertoire {
  const combinationsById = new Map(combinations.map((combination) => [
    combination.id,
    combination
  ]));
  const activeLimit = repertoire.activeCombinationIds.length;
  const maximumNonAerial = Math.floor(
    activeLimit * Math.max(0, maximumNonAerialRatio)
  );
  const activeCombinationIds: string[] = [];
  let nonAerialCount = 0;

  for (const id of repertoire.activeCombinationIds) {
    const combination = combinationsById.get(id);
    if (!combination) continue;
    if (isAerialOnlyCombination(combination)) {
      activeCombinationIds.push(id);
    } else if (nonAerialCount < maximumNonAerial) {
      activeCombinationIds.push(id);
      nonAerialCount += 1;
    }
  }

  const orderedCandidateIds = [
    ...repertoire.reserveCombinationIds,
    ...combinations.map((combination) => combination.id)
  ];
  for (const id of orderedCandidateIds) {
    if (activeCombinationIds.length >= activeLimit) break;
    if (activeCombinationIds.includes(id)) continue;
    const combination = combinationsById.get(id);
    if (combination && isAerialOnlyCombination(combination)) {
      activeCombinationIds.push(id);
    }
  }

  const activeIds = new Set(activeCombinationIds);
  const reserveCombinationIds = [
    ...repertoire.reserveCombinationIds,
    ...repertoire.activeCombinationIds
  ].filter((id, index, ids) => !activeIds.has(id) && ids.indexOf(id) === index);
  return { activeCombinationIds, reserveCombinationIds };
}

export function getTargetNaturalWeight(
  option: CombinationTargetOption,
  teamTargetWeights?: Partial<Record<LineoutPosition, number>>
): number {
  return Math.max(
    0,
    teamTargetWeights?.[option.targetPosition] ?? option.defaultNaturalWeight
  );
}

export function getCombinationTargetPositions(combination: Combination): LineoutPosition[] {
  return normalizeCombinationTargetOptions(combination.targetOptions)
    .map(getTargetOptionPlayerPosition);
}

export function findCombinationTargetOption(
  combination: Combination,
  playerPosition: LineoutPosition | null
): CombinationTargetOption | undefined {
  if (!playerPosition) {
    return undefined;
  }

  return normalizeCombinationTargetOptions(combination.targetOptions)
    .find((option) => getTargetOptionPlayerPosition(option) === playerPosition);
}

export function getCombinationDisplayName(
  combination: Combination,
  translate: (key: string) => string,
  defaultIndex?: number
): string {
  const customName = combination.customName?.trim();
  if (customName && customName.length > 0) return customName;
  if (defaultIndex !== undefined) {
    return translate("lineout.v3.defaultCombinationName")
      .replace("{number}", String(defaultIndex + 1));
  }
  return translate(combination.nameKey);
}

export function getPlayersAssignedToCombination(players: FieldPlayer[], combination?: Combination): Array<FieldPlayer | null> {
  const byId = new Map(players.map((player) => [player.id, player]));
  return normalizeCombinationSlots(combination?.slots).map((slot) => {
    if (!slot.playerId) {
      return null;
    }

    return byId.get(slot.playerId) ?? null;
  });
}

export function getUnassignedCombinationPlayers(players: FieldPlayer[], combination?: Combination): FieldPlayer[] {
  const assignedIds = new Set(
    getPlayersAssignedToCombination(players, combination)
      .filter((player): player is FieldPlayer => player !== null)
      .map((player) => player.id)
  );

  return players.filter((player) => !assignedIds.has(player.id));
}

export function updateCombinationLayout(combination: Combination, orderedPlayers: Array<FieldPlayer | null>): Combination {
  return {
    ...combination,
    slots: normalizeCombinationSlots(orderedPlayers.slice(0, 7).map((player, index) => ({
      playerId: player?.id ?? null,
      position: (index + 1) as LineoutPosition
    })))
  };
}

export function replaceCombinationLayout(combinations: Combination[], combinationId: string, orderedPlayers: Array<FieldPlayer | null>): Combination[] {
  return combinations.map((combination) => {
    if (combination.id !== combinationId) {
      return cloneCombination(combination);
    }

    return updateCombinationLayout(combination, orderedPlayers);
  });
}

export function renameCombination(combinations: Combination[], combinationId: string, customName: string): Combination[] {
  return combinations.map((combination) => {
    const cloned = cloneCombination(combination);
    if (cloned.id !== combinationId) {
      return cloned;
    }

    return {
      ...cloned,
      customName: customName.trim()
    };
  });
}

export function replaceCombinationPlan(
  combinations: Combination[],
  combinationId: string,
  plan: NonNullable<Combination["plan"]>
): Combination[] {
  return combinations.map((combination) => ({
    ...cloneCombination(combination),
    ...(combination.id === combinationId ? {
      plan: {
        phases: plan.phases.map((phase) => ({
          ...phase,
          actions: phase.actions.map((action) => (
            action.type === "jump"
              ? { ...action, lifterPositions: [...action.lifterPositions] }
              : { ...action }
          ))
        }))
      }
    } : {})
  }));
}
