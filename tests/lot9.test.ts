import assert from "node:assert/strict";
import test from "node:test";
import type { Combination } from "../src/models/Combination.ts";
import {
  buildVideoTargetMemory,
  createEmptyOpponentAiMemory,
  estimateTargetFrequency,
  observePlayerDefense,
  observePlayerTarget,
  withVideoObservations
} from "../src/ai/LineoutMemory.ts";
import { createOpponentAiIdentity } from "../src/ai/LineoutAiIdentity.ts";
import { predictDefensiveTarget } from "../src/ai/LineoutAiSelection.ts";
import { createChampionshipState } from "../src/rules/ChampionshipRules.ts";

const combination: Combination = {
  id: "known-combination",
  nameKey: "combo.known",
  risk: 0,
  complexity: 0,
  slots: [1, 2, 3, 4, 5, 6, 7].map((position) => ({
    position: position as 1 | 2 | 3 | 4 | 5 | 6 | 7,
    playerId: position === 2 || position === 4 ? `p${position}` : null
  })),
  targetOptions: [2, 4].map((position) => ({
    id: `target-${position}`,
    targetPosition: position as 2 | 4,
    type: "directCatch" as const,
    roles: { receiverPosition: position as 2 | 4 },
    naturalWeight: 50
  }))
};

test("direct observations are isolated and reach full confidence after five uses", () => {
  let memory = createEmptyOpponentAiMemory();
  for (let index = 0; index < 5; index += 1) {
    memory = observePlayerTarget(memory, combination.id, 4);
  }
  const estimate = estimateTargetFrequency(
    memory.playerTargets.directObservations,
    memory.playerTargets.globalTargetCounts,
    combination.id,
    4
  );

  assert.equal(estimate.frequency, 1);
  assert.equal(estimate.confidence, 1);
  assert.equal(estimate.combinationObservations, 5);
});

test("frequency combines exact combination at 70 percent and global habits at 30 percent", () => {
  let memory = createEmptyOpponentAiMemory();
  memory = observePlayerTarget(memory, "set-a", 2);
  memory = observePlayerTarget(memory, "set-a", 2);
  memory = observePlayerTarget(memory, "set-a", 2);
  memory = observePlayerTarget(memory, "set-a", 4);
  memory = observePlayerTarget(memory, "set-b", 4);
  memory = observePlayerTarget(memory, "set-b", 4);
  const estimate = estimateTargetFrequency(
    memory.playerTargets.directObservations,
    memory.playerTargets.globalTargetCounts,
    "set-a",
    2
  );

  assert.equal(estimate.frequency, 0.75 * 0.7 + 0.5 * 0.3);
  assert.equal(estimate.confidence, 0.8);
});

test("video observations use recency weights 100, 80, 60, 40 then 20 percent", () => {
  const history = [2, 2, 2, 2, 2, 2].map((targetPosition, index) => ({
    opponentId: `opponent-${index}`,
    playedAt: String(index),
    observations: [{ combinationId: "set", targetPosition: targetPosition as 2 }]
  }));
  const video = buildVideoTargetMemory(history, 6);
  assert.equal(video.set?.[2], 1 + 0.8 + 0.6 + 0.4 + 0.2 + 0.2);
});

test("defensive AI predicts the exact learned target and direct memory dominates video", () => {
  let memory = createEmptyOpponentAiMemory();
  for (let index = 0; index < 5; index += 1) {
    memory = observePlayerTarget(memory, combination.id, 4);
  }
  memory = withVideoObservations(memory, [{
    opponentId: "old",
    playedAt: "old",
    observations: Array.from({ length: 5 }, () => ({
      combinationId: combination.id,
      targetPosition: 2 as const
    }))
  }], 1);
  const prediction = predictDefensiveTarget({
    combination,
    memory,
    identity: { aiIntelligence: 100, videoPreparation: 100, videoMatchesAnalyzed: 1 },
    divisionId: "top_14",
    rng: { next: () => 0 }
  });

  assert.equal(prediction.directConfidence, 1);
  assert.equal(prediction.predictedPosition, 4);
});

test("club intelligence and video preparation are fixed and stay in division ranges", () => {
  const first = createOpponentAiIdentity("club-a", "federale_2");
  const second = createOpponentAiIdentity("club-a", "federale_2");
  assert.deepEqual(first, second);
  assert.ok(first.aiIntelligence >= 49 && first.aiIntelligence <= 59);
  assert.ok(first.videoPreparation >= 30 && first.videoPreparation <= 50);
  assert.ok(first.videoMatchesAnalyzed >= 1 && first.videoMatchesAnalyzed <= 3);
});

test("player defensive outcomes are recorded independently from target observations", () => {
  const base = createEmptyOpponentAiMemory();
  const updated = observePlayerDefense(observePlayerDefense(base, 3, false), 3, true);
  assert.deepEqual(updated.playerDefense[3], { attempts: 2, successfulStops: 1 });
  assert.deepEqual(updated.playerTargets.directObservations, {});
});

test("championship schedules one first leg and one return leg against every opponent", () => {
  const championship = createChampionshipState("regionale_3", 1, "Club joueur");
  const counts = new Map<string, number>();
  championship.schedule.forEach((opponentId) => {
    counts.set(opponentId, (counts.get(opponentId) ?? 0) + 1);
  });
  assert.equal(championship.totalRounds, 10);
  assert.ok([...counts.values()].every((count) => count === 2));
});
