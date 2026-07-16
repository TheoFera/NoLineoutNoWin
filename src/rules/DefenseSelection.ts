import type { FieldPlayer } from "../models/Player";
import type { DefenseMemory } from "../models/SaveGame";
import type { Team } from "../models/Team";

function buildLineoutPool(team: Team): FieldPlayer[] {
  return team.lineoutPlayers.slice();
}

export function getDefensiveLineoutPlayers(
  team: Team,
  defensivePriority: string[],
  defenseMemory: DefenseMemory,
  numberOfPlayers: number
): FieldPlayer[] {
  const pool = buildLineoutPool(team);
  const byId = new Map(pool.map((player) => [player.id, player]));
  const preferredOrder = (defenseMemory[numberOfPlayers] ?? defensivePriority)
    .filter((playerId): playerId is string => typeof playerId === "string");
  const selected: FieldPlayer[] = [];
  const used = new Set<string>();

  for (const playerId of preferredOrder) {
    const player = byId.get(playerId);
    if (!player || used.has(player.id)) {
      continue;
    }
    selected.push(player);
    used.add(player.id);
    if (selected.length === numberOfPlayers) {
      return selected;
    }
  }

  for (const player of pool) {
    if (used.has(player.id)) {
      continue;
    }
    selected.push(player);
    used.add(player.id);
    if (selected.length === numberOfPlayers) {
      return selected;
    }
  }

  return selected.slice(0, numberOfPlayers);
}

export function getDefensiveLineoutSlots(
  team: Team,
  defensivePriority: string[],
  defenseMemory: DefenseMemory,
  numberOfPlayers: number,
  defaultSlotIndices: number[]
): Array<FieldPlayer | null> {
  const rememberedSlots = defenseMemory[numberOfPlayers];
  const players = getDefensiveLineoutPlayers(team, defensivePriority, defenseMemory, numberOfPlayers);

  if (rememberedSlots?.length !== 7) {
    return placePlayersInSlots(players, defaultSlotIndices);
  }

  const byId = new Map(players.map((player) => [player.id, player]));
  const used = new Set<string>();
  const slots = rememberedSlots.map((playerId) => {
    const player = playerId ? byId.get(playerId) : undefined;
    if (!player || used.has(player.id)) {
      return null;
    }
    used.add(player.id);
    return player;
  });

  const missingPlayers = players.filter((player) => !used.has(player.id));
  const preferredEmptySlots = [
    ...defaultSlotIndices,
    ...slots.map((_, index) => index)
  ].filter((slotIndex, index, source) => (
    slotIndex >= 0
    && slotIndex < 7
    && source.indexOf(slotIndex) === index
    && slots[slotIndex] === null
  ));

  missingPlayers.forEach((player, index) => {
    const slotIndex = preferredEmptySlots[index];
    if (slotIndex !== undefined) slots[slotIndex] = player;
  });
  return slots;
}

function placePlayersInSlots(players: FieldPlayer[], slotIndices: number[]): Array<FieldPlayer | null> {
  const slots: Array<FieldPlayer | null> = Array(7).fill(null);
  players.slice(0, slotIndices.length).forEach((player, index) => {
    const slotIndex = slotIndices[index];
    if (slotIndex !== undefined) slots[slotIndex] = player;
  });
  return slots;
}

export function normalizeDefensivePriority(currentPriority: string[] | undefined, team: Team): string[] {
  const availableIds = new Set(team.lineoutPlayers.map((player) => player.id));
  const normalized: string[] = [];

  for (const playerId of currentPriority ?? []) {
    if (!availableIds.has(playerId) || normalized.includes(playerId)) {
      continue;
    }
    normalized.push(playerId);
  }

  for (const player of team.lineoutPlayers) {
    if (!normalized.includes(player.id)) {
      normalized.push(player.id);
    }
  }

  return normalized;
}

export function normalizeDefenseMemory(memory: DefenseMemory | undefined, team: Team): DefenseMemory {
  const normalized: DefenseMemory = {};
  const availableIds = new Set(team.lineoutPlayers.map((player) => player.id));

  for (const [key, ids] of Object.entries(memory ?? {})) {
    const count = Number(key);
    if (!Number.isInteger(count) || count < 2 || count > 7) {
      continue;
    }

    if (!Array.isArray(ids)) {
      continue;
    }

    if (ids.length === 7) {
      const used = new Set<string>();
      let keptPlayers = 0;
      const slots = ids.map((playerId) => {
        if (
          keptPlayers >= count
          || typeof playerId !== "string"
          || !availableIds.has(playerId)
          || used.has(playerId)
        ) {
          return null;
        }
        used.add(playerId);
        keptPlayers += 1;
        return playerId;
      });
      if (keptPlayers > 0) normalized[count] = slots;
      continue;
    }

    const filtered = ids
      .filter((playerId): playerId is string => typeof playerId === "string")
      .filter((playerId, index, source) => availableIds.has(playerId) && source.indexOf(playerId) === index)
      .slice(0, count);
    if (filtered.length > 0) {
      normalized[count] = filtered;
    }
  }

  return normalized;
}
