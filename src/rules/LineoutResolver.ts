import type { LineoutResult, LineoutSetup } from "../models/Lineout";
import type { FieldPlayer } from "../models/Player";
import { clamp } from "../utils/Clamp";
import { randomInt } from "../utils/Random";

function averageLiftAround(players: FieldPlayer[], targetIndex: number): number {
  const left = players[targetIndex - 1]?.lift ?? 0;
  const right = players[targetIndex + 1]?.lift ?? 0;
  if (left && right) return (left + right) / 2;
  if (right) return right * 0.7;
  if (left) return left * 0.4;
  return 10;
}

function zonePressureModifier(zone: LineoutSetup["pitchZone"]): number {
  switch (zone) {
    case "our_22":
      return -12;
    case "our_half":
      return -6;
    case "middle":
      return 0;
    case "their_half":
      return 5;
    case "their_22":
      return 10;
  }
}

export function resolveLineout(setup: LineoutSetup, defensivePressure = 45): LineoutResult {
  if (!setup.targetPlayerId) {
    return {
      displayedResult: "lost",
      internalEvent: "stolen",
      possessionDelta: -10,
      occupationDelta: -8,
      explanationKey: "lineout.explanation.lost"
    };
  }

  const attackingPlayers = setup.attackingPlayers.slice(0, setup.numberOfPlayers);
  const targetIndex = attackingPlayers.findIndex((player) => player.id === setup.targetPlayerId);
  const target = attackingPlayers[targetIndex];

  if (!target) {
    return {
      displayedResult: "lost",
      internalEvent: "stolen",
      possessionDelta: -10,
      occupationDelta: -8,
      explanationKey: "lineout.explanation.lost"
    };
  }

  const position = targetIndex + 1;
  const distancePenalty = position >= 6 ? 10 : position >= 4 ? 5 : 0;
  const liftSupport = averageLiftAround(attackingPlayers, targetIndex);
  const throwQuality = setup.hooker.throwing - distancePenalty + randomInt(-12, 12);
  const jumpQuality = target.jump * 0.5 + liftSupport * 0.35 + target.hands * 0.15;
  const comboBonus = setup.combination ? 8 - setup.combination.risk * 0.05 : 0;

  const score = clamp(
    throwQuality * 0.45 + jumpQuality * 0.45 + comboBonus + zonePressureModifier(setup.pitchZone) - defensivePressure * 0.35,
    0,
    100
  );

  if (score >= 72) {
    return { displayedResult: "won", internalEvent: "clean_catch", possessionDelta: 10, occupationDelta: 10, explanationKey: "lineout.explanation.clean" };
  }

  if (score >= 52) {
    return { displayedResult: "won_dirty", internalEvent: "dirty_catch", possessionDelta: 5, occupationDelta: 3, explanationKey: "lineout.explanation.dirty" };
  }

  if (throwQuality < 25 && defensivePressure > 50) {
    return { displayedResult: "fault", internalEvent: "not_straight", possessionDelta: -12, occupationDelta: -10, explanationKey: "lineout.explanation.fault" };
  }

  return { displayedResult: "lost", internalEvent: "stolen", possessionDelta: -12, occupationDelta: -10, explanationKey: "lineout.explanation.lost" };
}
