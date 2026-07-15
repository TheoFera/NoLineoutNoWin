import assert from "node:assert/strict";
import test from "node:test";
import { LINEOUT_COMBINATIONS } from "../src/data/LineoutCombinations.ts";
import type { FieldPlayer, Hooker } from "../src/models/Player.ts";
import {
  assignPlayersToCombination,
  assignTeamLineoutRepertoire,
  calculateStraightThrowProbability
} from "../src/rules/LineoutCombinationAssignment.ts";
import { replaceFailedActiveCombinations } from "../src/rules/LineoutRepertoire.ts";
import { createSeededRandom } from "../src/utils/Random.ts";

function player(id: string, stat = 80): FieldPlayer {
  return {
    id,
    role: "field",
    number: 4,
    nickname: id,
    height: 190,
    width: 90,
    jump: stat,
    lift: stat,
    hands: stat
  };
}

function hooker(throwing: number): Hooker {
  return {
    id: "hooker",
    role: "hooker",
    number: 2,
    nickname: "hooker",
    height: 180,
    width: 90,
    throwing
  };
}

const players = [1, 2, 3, 4, 5, 6, 7].map((index) => player(`p${index}`));

test("global library exposes enough valid position-based combinations", () => {
  assert.ok(LINEOUT_COMBINATIONS.length >= 10);
  assert.ok(LINEOUT_COMBINATIONS.every((definition) => definition.targetOptions.length >= 2));

  for (const definition of LINEOUT_COMBINATIONS) {
    const occupied = new Set(definition.occupiedPositions);
    assert.equal(occupied.size, definition.occupiedPositions.length);
    assert.ok(definition.occupiedPositions.length >= 4 && definition.occupiedPositions.length <= 7);
    for (const option of definition.targetOptions) {
      assert.ok(occupied.has(option.targetPosition));
      for (const position of Object.values(option.roles)) {
        assert.ok(position === undefined || occupied.has(position));
      }
    }
  }
});

test("analytic straight-throw compatibility matches reference endpoints", () => {
  assert.ok(Math.abs(calculateStraightThrowProbability(60, 1) - 0.666) < 0.002);
  assert.ok(Math.abs(calculateStraightThrowProbability(60, 7) - 0.367) < 0.002);
  assert.ok(calculateStraightThrowProbability(100, 7) >= 0.949);
});

test("an inaccessible long target is removed without rejecting the combination", () => {
  const definition = LINEOUT_COMBINATIONS.find((item) => item.id === "long_back");
  assert.ok(definition);
  const assigned = assignPlayersToCombination(definition, hooker(60), players);

  assert.ok(assigned);
  assert.ok(assigned.eligibleOptionIds.includes("long-front"));
  assert.ok(assigned.eligibleOptionIds.includes("long-middle"));
  assert.ok(!assigned.eligibleOptionIds.includes("long-back"));
  assert.ok(!assigned.eligibleOptionIds.includes("long-direct"));
});

test("role assignment uses each player once and keeps only playable targets", () => {
  const definition = LINEOUT_COMBINATIONS.find((item) => item.id === "seven_triple");
  assert.ok(definition);
  const assigned = assignPlayersToCombination(definition, hooker(100), players);

  assert.ok(assigned);
  const assignedIds = assigned.combination.slots
    .map((slot) => slot.playerId)
    .filter((id): id is string => Boolean(id));
  assert.equal(new Set(assignedIds).size, 7);
  assert.equal(assigned.combination.targetOptions?.length, 3);
});

test("sizeWeights drive active and reserve selection without a preferredSizes field", () => {
  const assignment = assignTeamLineoutRepertoire({
    hooker: hooker(100),
    players,
    style: {
      sizeWeights: { 4: 100, 5: 0, 6: 0, 7: 0 },
      naturalTargetWeights: {}
    },
    activeCount: 2,
    reserveCount: 1,
    rng: createSeededRandom(42)
  });
  const definitionsById = new Map(LINEOUT_COMBINATIONS.map((item) => [item.id, item]));
  const selectedIds = [
    ...assignment.repertoire.activeCombinationIds,
    ...assignment.repertoire.reserveCombinationIds
  ];

  assert.equal(assignment.repertoire.activeCombinationIds.length, 2);
  assert.equal(assignment.repertoire.reserveCombinationIds.length, 1);
  assert.ok(selectedIds.every((id) => definitionsById.get(id)?.occupiedPositions.length === 4));
});

test("return match replaces only sufficiently used combinations above 50 percent failures", () => {
  const result = replaceFailedActiveCombinations(
    {
      activeCombinationIds: ["a", "b", "c"],
      reserveCombinationIds: ["r1", "r2"]
    },
    [
      { combinationId: "a", totalUses: 4, failedUses: 3 },
      { combinationId: "b", totalUses: 2, failedUses: 1 },
      { combinationId: "c", totalUses: 1, failedUses: 1 }
    ],
    2,
    0.5,
    2
  );

  assert.deepEqual(result.activeCombinationIds, ["r1", "b", "c"]);
  assert.deepEqual(result.reserveCombinationIds, ["a", "r2"]);
});
