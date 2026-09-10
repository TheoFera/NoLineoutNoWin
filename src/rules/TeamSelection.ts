import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer, Player } from "../models/Player";
import type { Team } from "../models/Team";

export function getLineoutBenchPlayers(team: Team): FieldPlayer[] {
  const selectedIds = new Set(team.lineoutPlayers.map((player) => player.id));
  return team.fieldPlayers.filter((player) => !selectedIds.has(player.id));
}

export function getTeamBenchPlayers(team: Team): Player[] {
  return [...getLineoutBenchPlayers(team), ...(team.reserveHookers ?? [])];
}

export const STARTER_FIELD_NUMBERS = [1, 3, 4, 5, 7, 8, 9] as const;

export function numberStartingPlayers(team: Team): Team {
  const selected = new Map(team.lineoutPlayers.map((player, index) => [player.id,
    { ...player, number: STARTER_FIELD_NUMBERS[index] }]));
  const fieldPlayers = team.fieldPlayers.map((player) => selected.get(player.id) ?? { ...player, number: 0 });
  const byId = new Map(fieldPlayers.map((player) => [player.id, player]));
  return { ...team, fieldPlayers, lineoutPlayers: team.lineoutPlayers.map((player) => byId.get(player.id)!) };
}

export function exchangeSquadPlayers(team: Team, firstId: string, secondId: string): Team {
  const first = team.lineoutPlayers.findIndex((player) => player.id === firstId);
  const second = team.lineoutPlayers.findIndex((player) => player.id === secondId);
  if (first >= 0 && second >= 0) {
    return numberStartingPlayers(assignPlayerToLineoutPosition(team, (first + 1) as LineoutPosition, secondId));
  }
  const firstStarts = first >= 0 || team.hooker.id === firstId;
  return numberStartingPlayers(swapStarterWithReserve(team,
    firstStarts ? firstId : secondId, firstStarts ? secondId : firstId));
}

export function swapStarterWithReserve(team: Team, starterId: string, reserveId: string): Team {
  const reserve = getTeamBenchPlayers(team).find((p) => p.id === reserveId);
  if (!reserve) return team;
  if (reserve.role === "hooker") {
    if (starterId !== team.hooker.id) return team;
    return { ...team, hooker: reserve, reserveHookers: (team.reserveHookers ?? [])
      .map((p) => p.id === reserveId ? team.hooker : p) };
  }
  const index = team.lineoutPlayers.findIndex((p) => p.id === starterId);
  return index < 0 ? team : assignPlayerToLineoutPosition(team, (index + 1) as LineoutPosition, reserveId);
}

export function isSelectedForLineout(team: Team, playerId: string): boolean {
  return team.lineoutPlayers.some((player) => player.id === playerId);
}

export function assignPlayerToLineoutPosition(team: Team, position: LineoutPosition, playerId: string): Team {
  const targetPlayer = team.fieldPlayers.find((player) => player.id === playerId);
  if (!targetPlayer) {
    return team;
  }

  const lineoutPlayers = [...team.lineoutPlayers];
  const targetIndex = position - 1;
  const existingIndex = lineoutPlayers.findIndex((player) => player.id === playerId);

  if (existingIndex >= 0) {
    [lineoutPlayers[targetIndex], lineoutPlayers[existingIndex]] = [lineoutPlayers[existingIndex], lineoutPlayers[targetIndex]];
  } else {
    lineoutPlayers[targetIndex] = targetPlayer;
  }

  return {
    ...team,
    lineoutPlayers
  };
}
