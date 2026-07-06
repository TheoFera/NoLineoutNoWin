import type { MatchPlayerUsage } from "../models/Match";
import type { Team } from "../models/Team";
import { clamp } from "../utils/Clamp";

function progressStat(current: number, usage: number, weight: number): number {
  const gain = Math.floor(usage / weight);
  return clamp(current + gain, 10, 99);
}

export function createEmptyUsage(): MatchPlayerUsage {
  return {
    jump: 0,
    lift: 0,
    hands: 0,
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

export function applyPlayerProgression(team: Team, usageMap: Record<string, MatchPlayerUsage>): Team {
  return {
    ...team,
    hooker: {
      ...team.hooker,
      throwing: progressStat(team.hooker.throwing, usageMap[team.hooker.id]?.throwing ?? 0, 3)
    },
    fieldPlayers: team.fieldPlayers.map((player) => {
      const usage = usageMap[player.id] ?? createEmptyUsage();
      return {
        ...player,
        jump: progressStat(player.jump, usage.jump, 2),
        lift: progressStat(player.lift, usage.lift, 2),
        hands: progressStat(player.hands, usage.hands, 3)
      };
    }),
    lineoutPlayers: team.lineoutPlayers.map((player) => {
      const usage = usageMap[player.id] ?? createEmptyUsage();
      return {
        ...player,
        jump: progressStat(player.jump, usage.jump, 2),
        lift: progressStat(player.lift, usage.lift, 2),
        hands: progressStat(player.hands, usage.hands, 3)
      };
    })
  };
}
