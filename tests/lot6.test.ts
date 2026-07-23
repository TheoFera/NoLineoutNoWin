import assert from "node:assert/strict";
import test from "node:test";
import {
  GENERATED_LINEOUT_COMBINATIONS,
  LINEOUT_COMBINATIONS
} from "../src/data/LineoutCombinations.ts";
import { translations } from "../src/data/defaultTranslations.ts";
import type { FieldPlayer, Hooker } from "../src/models/Player.ts";
import {
  assignPlayersToCombination,
  assignTeamLineoutRepertoire,
  calculateStraightThrowProbability
} from "../src/rules/LineoutCombinationAssignment.ts";
import { replaceFailedActiveCombinations } from "../src/rules/LineoutRepertoire.ts";
import {
  getLineoutCombinationStructuralSignature,
  isDirectCatchTargetAvailable,
  validateLineoutCombinationDefinition
} from "../src/rules/LineoutCombinationValidation.ts";
import { getTargetNaturalWeight } from "../src/rules/CombinationRules.ts";
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
  assert.equal(GENERATED_LINEOUT_COMBINATIONS.length, 99);
  assert.equal(LINEOUT_COMBINATIONS.length, 108);

  for (const definition of LINEOUT_COMBINATIONS) {
    const occupied = new Set(definition.occupiedPositions);
    assert.equal(occupied.size, definition.occupiedPositions.length);
    assert.ok(definition.occupiedPositions.length >= 3 && definition.occupiedPositions.length <= 7);
    for (const option of definition.targetOptions) {
      assert.ok(occupied.has(option.targetPosition));
      for (const position of Object.values(option.roles)) {
        assert.ok(position === undefined || occupied.has(position));
      }
    }
  }
});

test("generated library covers every position configuration from three to seven players", () => {
  const expectedCounts = new Map([
    [3, 35],
    [4, 35],
    [5, 21],
    [6, 7],
    [7, 1]
  ]);

  for (const [size, expectedCount] of expectedCounts) {
    assert.equal(
      GENERATED_LINEOUT_COMBINATIONS.filter(
        (definition) => definition.occupiedPositions.length === size
      ).length,
      expectedCount
    );
  }
});

test("every generated formation exposes all and only its legal targets", () => {
  for (const definition of GENERATED_LINEOUT_COMBINATIONS) {
    const occupied = new Set(definition.occupiedPositions);
    const expected = definition.occupiedPositions.flatMap((targetPosition) => {
      const optionTypes: string[] = [];
      if (isDirectCatchTargetAvailable(definition.occupiedPositions, targetPosition)) {
        optionTypes.push(`directCatch:${targetPosition}`);
      }
      if (
        occupied.has((targetPosition - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)
        && occupied.has((targetPosition + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)
      ) {
        optionTypes.push(`jumpBlock:${targetPosition}`);
      }
      return optionTypes;
    });
    const actual = definition.targetOptions.map(
      (option) => `${option.type}:${option.targetPosition}`
    );
    const totalWeight = definition.targetOptions.reduce(
      (total, option) => total + option.defaultNaturalWeight,
      0
    );

    assert.deepEqual(actual, expected, definition.id);
    assert.ok(Math.abs(totalWeight - 100) < 0.000001, definition.id);
  }
});

test("every generated formation has French and English display text", () => {
  for (const definition of GENERATED_LINEOUT_COMBINATIONS) {
    const translation = translations[`combo.${definition.id}`];
    assert.ok(translation?.fr.includes("Alignement à"), definition.id);
    assert.ok(translation?.en.includes("player lineout"), definition.id);
  }
});

test("analytic straight-throw compatibility matches reference endpoints", () => {
  assert.ok(Math.abs(calculateStraightThrowProbability(60, 1) - 0.666) < 0.002);
  assert.ok(Math.abs(calculateStraightThrowProbability(60, 7) - 0.367) < 0.002);
  assert.ok(calculateStraightThrowProbability(100, 7) >= 0.949);
});

test("an inaccessible long target is removed without rejecting the combination", () => {
  const definition = LINEOUT_COMBINATIONS.find((item) => item.id === "seven_triple");
  assert.ok(definition);
  const assigned = assignPlayersToCombination(definition, hooker(60), players);

  assert.ok(assigned);
  assert.ok(assigned.eligibleOptionIds.includes("seven-triple-front"));
  assert.ok(assigned.eligibleOptionIds.includes("seven-triple-middle"));
  assert.ok(!assigned.eligibleOptionIds.includes("seven-triple-back"));
});

test("direct-catch availability requires both positions in front to be empty", () => {
  assert.equal(isDirectCatchTargetAvailable([1, 2, 3], 1), true);
  assert.equal(isDirectCatchTargetAvailable([3], 3), true);
  assert.equal(isDirectCatchTargetAvailable([1, 3], 3), false);
  assert.equal(isDirectCatchTargetAvailable([2, 3], 3), false);
  assert.equal(isDirectCatchTargetAvailable([1, 2, 3], 3), false);
  assert.equal(isDirectCatchTargetAvailable([1, 2, 5], 5), true);
  assert.equal(isDirectCatchTargetAvailable([1, 3, 5], 5), false);
  assert.equal(isDirectCatchTargetAvailable([1, 4, 5], 5), false);
});

test("definition validation rejects invalid direct catches and missing roles", () => {
  assert.throws(() => validateLineoutCombinationDefinition({
    id: "blocked",
    occupiedPositions: [1, 2, 3],
    targetOptions: [{
      id: "blocked-direct",
      targetPosition: 3,
      type: "directCatch",
      roles: { directCatcherPosition: 3 },
      defaultNaturalWeight: 1
    }]
  }), /blocked.*blocked-direct/);

  assert.throws(() => validateLineoutCombinationDefinition({
    id: "missing-role",
    occupiedPositions: [1, 2],
    targetOptions: [{
      id: "missing-role-target",
      targetPosition: 2,
      type: "jumpBlock",
      roles: { frontLifterPosition: 1, jumperPosition: 2, rearLifterPosition: 3 },
      defaultNaturalWeight: 1
    }]
  }), /missing-role.*missing-role-target/);

  assert.throws(() => validateLineoutCombinationDefinition({
    id: "missing-target",
    occupiedPositions: [1, 2, 3],
    targetOptions: [{
      id: "absent-target",
      targetPosition: 4,
      type: "directCatch",
      roles: { directCatcherPosition: 4 },
      defaultNaturalWeight: 1
    }]
  }), /missing-target.*absent-target/);

  assert.doesNotThrow(() => validateLineoutCombinationDefinition({
    id: "jump-is-unaffected",
    occupiedPositions: [1, 2, 3, 4],
    targetOptions: [{
      id: "jump-target",
      targetPosition: 3,
      type: "jumpBlock",
      roles: { frontLifterPosition: 2, jumperPosition: 3, rearLifterPosition: 4 },
      defaultNaturalWeight: 1
    }]
  }));
});

test("team target weight replaces the default target tendency", () => {
  const option = LINEOUT_COMBINATIONS
    .find((definition) => definition.id === "middle_block")
    ?.targetOptions[0];
  assert.ok(option);
  assert.equal(getTargetNaturalWeight(option), option.defaultNaturalWeight);
  assert.equal(getTargetNaturalWeight(option, { [option.targetPosition]: 123 }), 123);
});

test("the final library has no structural duplicate", () => {
  const signatures = LINEOUT_COMBINATIONS.map(getLineoutCombinationStructuralSignature);
  assert.equal(new Set(signatures).size, signatures.length);
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
      sizeWeights: { 3: 0, 4: 100, 5: 0, 6: 0, 7: 0 },
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
