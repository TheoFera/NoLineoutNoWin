import type { FieldPlayer } from "../models/Player";
import type { Team } from "../models/Team";

function buildLineoutPool(team: Team): FieldPlayer[] {
  return team.lineoutPlayers.slice();
}

export function getDefensiveLineoutPlayers(
  team: Team,
  defensivePriority: string[],
  defenseMemory: Record<number, string[]>,
  numberOfPlayers: number
): FieldPlayer[] {
  const pool = buildLineoutPool(team);
  const byId = new Map(pool.map((player) => [player.id, player]));
  const preferredOrder = defenseMemory[numberOfPlayers] ?? defensivePriority;
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

export function normalizeDefenseMemory(memory: Record<number, string[]> | undefined, team: Team): Record<number, string[]> {
  const normalized: Record<number, string[]> = {};
  const availableIds = new Set(team.lineoutPlayers.map((player) => player.id));

  for (const [key, ids] of Object.entries(memory ?? {})) {
    const count = Number(key);
    if (!Number.isInteger(count) || count < 2 || count > 7) {
      continue;
    }

    const filtered = ids.filter((playerId, index, source) => availableIds.has(playerId) && source.indexOf(playerId) === index).slice(0, count);
    if (filtered.length > 0) {
      normalized[count] = filtered;
    }
  }

  return normalized;
}
