import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";
import type { Team } from "../models/Team";

export function getLineoutPlayerAtPosition(team: Team, position: LineoutPosition): FieldPlayer {
  return team.lineoutPlayers[position - 1];
}

export function getLineoutBenchPlayers(team: Team): FieldPlayer[] {
  const selectedIds = new Set(team.lineoutPlayers.map((player) => player.id));
  return team.fieldPlayers.filter((player) => !selectedIds.has(player.id));
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
