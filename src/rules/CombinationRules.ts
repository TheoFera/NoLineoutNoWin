import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import type { Combination } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";

function cloneCombination(combination: Combination): Combination {
  return {
    ...combination,
    slots: combination.slots.map((slot) => ({ ...slot }))
  };
}

export function normalizeOffensiveCombinations(combinations?: Combination[]): Combination[] {
  if (!combinations || combinations.length === 0) {
    return DEFAULT_COMBINATIONS.map(cloneCombination);
  }

  return combinations.map(cloneCombination);
}

export function getAvailableOffensiveCombinations(combinations: Combination[], maxAvailable: number): Combination[] {
  const normalized = normalizeOffensiveCombinations(combinations);
  return normalized.slice(0, Math.max(1, maxAvailable));
}

export function orderPlayersForCombination(players: FieldPlayer[], combination?: Combination): FieldPlayer[] {
  if (!combination) {
    return players.slice(0, 7);
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered: FieldPlayer[] = [];
  const used = new Set<string>();
  const sortedSlots = combination.slots.slice().sort((left, right) => left.position - right.position);

  for (const slot of sortedSlots) {
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

export function updateCombinationLayout(combination: Combination, orderedPlayers: FieldPlayer[]): Combination {
  return {
    ...combination,
    slots: orderedPlayers.slice(0, 7).map((player, index) => ({
      playerId: player.id,
      position: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7
    }))
  };
}

export function replaceCombinationLayout(combinations: Combination[], combinationId: string, orderedPlayers: FieldPlayer[]): Combination[] {
  return combinations.map((combination) => {
    if (combination.id !== combinationId) {
      return cloneCombination(combination);
    }

    return updateCombinationLayout(combination, orderedPlayers);
  });
}
