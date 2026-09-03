import type { MatchPlayerUsage } from "../models/Match";
import type {
  PlayerProgressionUsage,
  PlayerProgressionSummary,
  PlayerStatProgression,
  ProgressedStatName,
  TeamProgressionResult
} from "../models/PlayerProgression";
import type { FieldPlayer, Hooker, Player } from "../models/Player";
import type { Team } from "../models/Team";
import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";

type StatProgressionResult = {
  value: number;
  remainingUsage: number;
};

function getRequiredUses(current: number, stat: ProgressedStatName): number {
  const balance = LINEOUT_BALANCE.progression;
  const difficultySteps = Math.floor(
    Math.max(0, current - balance.difficultyStartsAt) / balance.statPointsPerDifficultyStep
  );
  return balance.baseUsesPerLevel[stat]
    + difficultySteps * balance.additionalUsesPerDifficultyStep;
}

function progressStat(current: number, usage: number, stat: ProgressedStatName): StatProgressionResult {
  const maximum = LINEOUT_BALANCE.progression.statMaximum;
  let value = current;
  let remainingUsage = normalizeUsageValue(usage);

  while (value < maximum) {
    const requiredUses = getRequiredUses(value, stat);
    if (remainingUsage < requiredUses) {
      break;
    }
    remainingUsage -= requiredUses;
    value += 1;
  }

  return {
    value,
    remainingUsage: value >= maximum ? 0 : remainingUsage
  };
}

export function createEmptyUsage(): MatchPlayerUsage {
  return {
    speed: 0,
    strength: 0,
    technique: 0,
    throwing: 0
  };
}

export function addUsage(
  usageMap: Record<string, MatchPlayerUsage>,
  playerId: string,
  stat: keyof MatchPlayerUsage,
  amount = 1
): Record<string, MatchPlayerUsage> {
  const current = usageMap[playerId] ?? createEmptyUsage();
  return {
    ...usageMap,
    [playerId]: {
      ...current,
      [stat]: current[stat] + amount
    }
  };
}

export function resolvePlayerProgression(
  team: Team,
  matchUsage: Record<string, MatchPlayerUsage>,
  savedUsage: PlayerProgressionUsage = {}
): TeamProgressionResult {
  const combinedUsage = combineUsage(savedUsage, matchUsage);
  const hookerProgression = progressHooker(team.hooker, combinedUsage);
  const fieldPlayerProgressions = team.fieldPlayers.map((player) => (
    progressFieldPlayer(player, combinedUsage)
  ));
  const hooker = hookerProgression.player;
  const fieldPlayers = fieldPlayerProgressions.map((progression) => progression.player);
  const fieldPlayersById = new Map(fieldPlayers.map((player) => [player.id, player]));
  const progressedTeam: Team = {
    ...team,
    hooker,
    fieldPlayers,
    lineoutPlayers: team.lineoutPlayers.map((player) => fieldPlayersById.get(player.id) ?? player)
  };

  return {
    team: progressedTeam,
    progressedPlayers: [
      buildPlayerProgression(team.hooker, hooker),
      ...team.fieldPlayers.map((player, index) => buildPlayerProgression(player, fieldPlayers[index]))
    ].filter((summary): summary is PlayerProgressionSummary => summary !== null),
    remainingUsage: {
      [hooker.id]: hookerProgression.remainingUsage,
      ...Object.fromEntries(fieldPlayerProgressions.map((progression) => [
        progression.player.id,
        progression.remainingUsage
      ]))
    }
  };
}

export function normalizePlayerProgressionUsage(
  team: Team,
  usage: PlayerProgressionUsage | undefined
): PlayerProgressionUsage {
  return {
    [team.hooker.id]: normalizeUsage(usage?.[team.hooker.id]),
    ...Object.fromEntries(team.fieldPlayers.map((player) => [
      player.id,
      normalizeUsage(usage?.[player.id])
    ]))
  };
}

function progressHooker(
  hooker: Hooker,
  usageMap: PlayerProgressionUsage
): { player: Hooker; remainingUsage: MatchPlayerUsage } {
  const usage = usageMap[hooker.id] ?? createEmptyUsage();
  const throwing = progressStat(hooker.throwing, usage.throwing, "throwing");
  return {
    player: { ...hooker, throwing: throwing.value },
    remainingUsage: { ...createEmptyUsage(), throwing: throwing.remainingUsage }
  };
}

function progressFieldPlayer(
  player: FieldPlayer,
  usageMap: PlayerProgressionUsage
): { player: FieldPlayer; remainingUsage: MatchPlayerUsage } {
  const usage = usageMap[player.id] ?? createEmptyUsage();
  const speed = progressStat(player.speed, usage.speed, "speed");
  const strength = progressStat(player.strength, usage.strength, "strength");
  const technique = progressStat(player.technique, usage.technique, "technique");
  return {
    player: {
      ...player,
      speed: speed.value,
      strength: strength.value,
      technique: technique.value
    },
    remainingUsage: {
      speed: speed.remainingUsage,
      strength: strength.remainingUsage,
      technique: technique.remainingUsage,
      throwing: 0
    }
  };
}

function combineUsage(
  savedUsage: PlayerProgressionUsage,
  matchUsage: Record<string, MatchPlayerUsage>
): PlayerProgressionUsage {
  const playerIds = new Set([...Object.keys(savedUsage), ...Object.keys(matchUsage)]);
  return Object.fromEntries([...playerIds].map((playerId) => {
    const saved = normalizeUsage(savedUsage[playerId]);
    const currentMatch = normalizeUsage(matchUsage[playerId]);
    return [playerId, {
      speed: saved.speed + currentMatch.speed,
      strength: saved.strength + currentMatch.strength,
      technique: saved.technique + currentMatch.technique,
      throwing: saved.throwing + currentMatch.throwing
    }];
  }));
}

function normalizeUsage(usage: MatchPlayerUsage | undefined): MatchPlayerUsage {
  return {
    speed: normalizeUsageValue(usage?.speed),
    strength: normalizeUsageValue(usage?.strength),
    technique: normalizeUsageValue(usage?.technique),
    throwing: normalizeUsageValue(usage?.throwing)
  };
}

function normalizeUsageValue(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
}

function buildPlayerProgression(previous: Player, current: Player): PlayerProgressionSummary | null {
  const statNames: ProgressedStatName[] = current.role === "hooker"
    ? ["throwing"]
    : ["speed", "strength", "technique"];
  const changes = statNames
    .map((stat) => buildStatProgression(previous, current, stat))
    .filter((change): change is PlayerStatProgression => change !== null);

  return changes.length > 0 ? { player: current, changes } : null;
}

function buildStatProgression(
  previous: Player,
  current: Player,
  stat: ProgressedStatName
): PlayerStatProgression | null {
  const previousValue = getPlayerStat(previous, stat);
  const currentValue = getPlayerStat(current, stat);
  if (previousValue === null || currentValue === null || currentValue <= previousValue) {
    return null;
  }

  return { stat, previousValue, currentValue };
}

function getPlayerStat(player: Player, stat: ProgressedStatName): number | null {
  if (player.role === "hooker") {
    return stat === "throwing" ? player.throwing : null;
  }

  return stat === "throwing" ? null : player[stat];
}
