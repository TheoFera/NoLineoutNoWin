import type { OffensiveRepertoire } from "../models/Combination";
import { toCanonicalLineoutCombinationId } from "../data/LineoutCombinations.ts";

function uniqueKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  return ids.map(toCanonicalLineoutCombinationId).filter((id) => {
    if (!knownIds.has(id) || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function normalizeOffensiveRepertoire(
  combinationIds: readonly string[],
  maxActive: number,
  current?: Partial<OffensiveRepertoire>,
  maxReserve = Number.POSITIVE_INFINITY
): OffensiveRepertoire {
  const orderedIds = Array.from(new Set(combinationIds.map(toCanonicalLineoutCombinationId)));
  const knownIds = new Set(orderedIds);
  const activeLimit = Math.max(0, Math.min(Math.floor(maxActive), orderedIds.length));
  const preferredActive = uniqueKnownIds(current?.activeCombinationIds ?? [], knownIds);
  const activeCombinationIds = preferredActive.slice(0, activeLimit);

  for (const id of orderedIds) {
    if (activeCombinationIds.length >= activeLimit) {
      break;
    }
    if (!activeCombinationIds.includes(id)) {
      activeCombinationIds.push(id);
    }
  }

  const activeIds = new Set(activeCombinationIds);
  const preferredReserve = uniqueKnownIds(current?.reserveCombinationIds ?? [], knownIds)
    .filter((id) => !activeIds.has(id));
  const reserveIds = new Set(preferredReserve);

  for (const id of orderedIds) {
    if (!activeIds.has(id) && !reserveIds.has(id)) {
      preferredReserve.push(id);
      reserveIds.add(id);
    }
  }

  return {
    activeCombinationIds,
    reserveCombinationIds: preferredReserve.slice(0, Math.max(0, Math.floor(maxReserve)))
  };
}

export type CombinationUseStat = {
  combinationId: string;
  totalUses: number;
  failedUses: number;
};

export function replaceFailedActiveCombinations(
  repertoire: OffensiveRepertoire,
  usage: readonly CombinationUseStat[],
  minimumUses: number,
  failureRateExclusive: number,
  maximumReplacements: number
): OffensiveRepertoire {
  const usageById = new Map(usage.map((entry) => [entry.combinationId, entry]));
  const eligible = repertoire.activeCombinationIds
    .map((combinationId, activeIndex) => ({
      combinationId,
      activeIndex,
      stat: usageById.get(combinationId)
    }))
    .filter((entry): entry is typeof entry & { stat: CombinationUseStat } => (
      Boolean(entry.stat)
      && (entry.stat?.totalUses ?? 0) >= minimumUses
      && (entry.stat?.failedUses ?? 0) / (entry.stat?.totalUses ?? 1) > failureRateExclusive
    ))
    .sort((left, right) => (
      right.stat.failedUses / right.stat.totalUses
      - left.stat.failedUses / left.stat.totalUses
    ));
  const replacementCount = Math.min(
    eligible.length,
    repertoire.reserveCombinationIds.length,
    Math.max(0, Math.floor(maximumReplacements))
  );
  const activeCombinationIds = [...repertoire.activeCombinationIds];
  const reserveCombinationIds = [...repertoire.reserveCombinationIds];

  for (let index = 0; index < replacementCount; index += 1) {
    const outgoing = eligible[index];
    const incomingId = reserveCombinationIds[index];
    activeCombinationIds[outgoing.activeIndex] = incomingId;
    reserveCombinationIds[index] = outgoing.combinationId;
  }

  return { activeCombinationIds, reserveCombinationIds };
}
