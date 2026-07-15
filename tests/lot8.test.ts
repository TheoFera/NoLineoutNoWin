import assert from "node:assert/strict";
import test from "node:test";
import type { Combination, LineoutPosition } from "../src/models/Combination.ts";
import type { FieldPlayer } from "../src/models/Player.ts";
import {
  chooseAiOffensiveLineout,
  getRepetitionPenalty
} from "../src/ai/LineoutAiSelection.ts";
import { createEmptyOpponentAiMemory } from "../src/ai/LineoutMemory.ts";
import type { RandomSource } from "../src/utils/Random.ts";

function player(id: string): FieldPlayer {
  return {
    id,
    role: "field",
    number: 4,
    nickname: id,
    height: 190,
    width: 90,
    jump: 20,
    lift: 20,
    hands: 20
  };
}

function combination(id: string, size: 4 | 7, targets: LineoutPosition[]): Combination {
  const players = Array.from({ length: size }, (_, index) => player(`${id}-p${index + 1}`));
  return {
    id,
    nameKey: `combo.${id}`,
    risk: 999,
    complexity: 999,
    slots: Array.from({ length: 7 }, (_, index) => ({
      position: (index + 1) as LineoutPosition,
      playerId: players[index]?.id ?? null
    })),
    targetOptions: targets.map((position) => ({
      id: `${id}-target-${position}`,
      targetPosition: position,
      type: "directCatch" as const,
      roles: { receiverPosition: position },
      naturalWeight: 50
    }))
  };
}

const middle: RandomSource = { next: () => 0.5 };

test("zone multiplier favors short lineouts only in midfield", () => {
  const short = combination("short", 4, [2]);
  const long = combination("long", 7, [6]);
  const common = {
    combinations: [short, long],
    repertoire: { activeCombinationIds: ["short", "long"], reserveCombinationIds: [] },
    style: {
      sizeWeights: { 4: 50, 7: 50 },
      naturalTargetWeights: {}
    },
    memory: createEmptyOpponentAiMemory(),
    identity: { aiIntelligence: 50, videoPreparation: 0, videoMatchesAnalyzed: 0 },
    rng: middle
  };
  const midfield = chooseAiOffensiveLineout({ ...common, zone: "midfield" });
  const own22 = chooseAiOffensiveLineout({ ...common, zone: "own22" });

  assert.ok(midfield.combinationScores.short > midfield.combinationScores.long);
  assert.ok(own22.combinationScores.long > own22.combinationScores.short);
});

test("offensive AI adapts toward a position where player defense fails", () => {
  const set = combination("adaptive", 4, [2, 4]);
  const memory = createEmptyOpponentAiMemory();
  memory.playerDefense[2] = { attempts: 5, successfulStops: 5 };
  memory.playerDefense[4] = { attempts: 5, successfulStops: 0 };
  const decision = chooseAiOffensiveLineout({
    combinations: [set],
    repertoire: { activeCombinationIds: [set.id], reserveCombinationIds: [] },
    style: { sizeWeights: { 4: 1 }, naturalTargetWeights: {} },
    zone: "midfield",
    memory,
    identity: { aiIntelligence: 100, videoPreparation: 0, videoMatchesAnalyzed: 0 },
    rng: middle
  });

  assert.ok(decision.targetScores["adaptive-target-4"] > decision.targetScores["adaptive-target-2"]);
  assert.equal(decision.targetOption.targetPosition, 4);
});

test("targets already in the repertoire are not rechecked against player stats", () => {
  const set = combination("feasible", 4, [2]);
  const decision = chooseAiOffensiveLineout({
    combinations: [set],
    repertoire: { activeCombinationIds: [set.id], reserveCombinationIds: [] },
    style: { sizeWeights: { 4: 1 }, naturalTargetWeights: {} },
    zone: "midfield",
    memory: createEmptyOpponentAiMemory(),
    identity: { aiIntelligence: 20, videoPreparation: 0, videoMatchesAnalyzed: 0 },
    rng: middle
  });
  assert.equal(decision.targetPlayerId, "feasible-p2");
});

test("repetition penalties exactly classify clean, scrappy, turnover and fault outcomes", () => {
  assert.deepEqual(getRepetitionPenalty("cleanWin"), { target: 0, combination: 0 });
  assert.deepEqual(getRepetitionPenalty("scrappyWin"), { target: -5, combination: 0 });
  assert.deepEqual(getRepetitionPenalty("cleanSteal"), { target: -15, combination: -5 });
  assert.deepEqual(getRepetitionPenalty("knockOn"), { target: -25, combination: -10 });
  assert.deepEqual(getRepetitionPenalty("notStraight"), { target: -25, combination: -10 });
});
