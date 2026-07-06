import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import type { Combination, CombinationPlayerSlot, LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";

function cloneCombination(combination: Combination): Combination {
  return {
    ...combination,
    slots: normalizeCombinationSlots(combination.slots).map((slot) => ({ ...slot }))
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

  const normalizedById = new Map(combinations.map((combination) => [combination.id, cloneCombination(combination)]));
  const orderedDefaults = DEFAULT_COMBINATIONS.map((combination) => normalizedById.get(combination.id) ?? cloneCombination(combination));
  const additionalCombinations = combinations
    .filter((combination) => !DEFAULT_COMBINATIONS.some((defaultCombination) => defaultCombination.id === combination.id))
    .map(cloneCombination);

  return [...orderedDefaults, ...additionalCombinations];
}

export function getAvailableOffensiveCombinations(combinations: Combination[], maxAvailable: number): Combination[] {
  const normalized = normalizeOffensiveCombinations(combinations);
  return normalized.slice(0, Math.max(1, maxAvailable));
}

export function getCombinationDisplayName(combination: Combination, translate: (key: string) => string): string {
  const customName = combination.customName?.trim();
  return customName && customName.length > 0 ? customName : translate(combination.nameKey);
}

export function orderPlayersForCombination(players: FieldPlayer[], combination?: Combination): FieldPlayer[] {
  if (!combination) {
    return players.slice(0, 7);
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered: FieldPlayer[] = [];
  const used = new Set<string>();
  const sortedSlots = normalizeCombinationSlots(combination.slots).slice().sort((left, right) => left.position - right.position);

  for (const slot of sortedSlots) {
    if (!slot.playerId) {
      continue;
    }

    const player = byId.get(slot.playerId);
    if (!player || used.has(player.id)) {
      continue;
    }
    ordered.push(player);
    used.add(player.id);
  }

  for (const player of players) {
    if (used.has(player.id)) {
      continue;
    }
    ordered.push(player);
    used.add(player.id);
  }

  return ordered.slice(0, 7);
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
