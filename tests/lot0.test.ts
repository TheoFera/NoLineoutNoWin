import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCombinationTargetOptions } from "../src/models/Combination.ts";
import { LINEOUT_BALANCE } from "../src/config/LineoutBalance.ts";
import { normalizeOffensiveRepertoire } from "../src/rules/LineoutRepertoire.ts";
import { pickOne, randomFloat, randomInt, type RandomSource } from "../src/utils/Random.ts";

function sequenceSource(values: number[]): RandomSource {
  let index = 0;
  return {
    next: () => {
      const value = values[index];
      index += 1;
      if (value === undefined) {
        throw new Error("Random sequence exhausted");
      }
      return value;
    }
  };
}

test("random helpers consume an injected deterministic source", () => {
  const source = sequenceSource([0, 0.999, 0.25, 0.75]);

  assert.equal(randomInt(4, 7, source), 4);
  assert.equal(randomInt(4, 7, source), 7);
  assert.equal(randomFloat(10, 20, source), 12.5);
  assert.equal(pickOne(["front", "middle", "back"], source), "back");
});

test("random helpers reject invalid sources and bounds", () => {
  assert.throws(() => randomInt(2, 1), RangeError);
  assert.throws(() => randomFloat(Number.NaN, 1), RangeError);
  assert.throws(() => randomInt(1, 2, { next: () => 1 }), RangeError);
  assert.throws(() => pickOne([], { next: () => 0 }), /empty array/);
});

test("a V1 combination order migrates to active and reserve lists", () => {
  const repertoire = normalizeOffensiveRepertoire(
    ["safe_front", "middle_block", "long_back", "shift_4"],
    2
  );

  assert.deepEqual(repertoire, {
    activeCombinationIds: ["safe_front", "middle_block"],
    reserveCombinationIds: ["long_back", "shift_4"]
  });
});

test("repertoire normalization preserves valid choices and repairs stale data", () => {
  const repertoire = normalizeOffensiveRepertoire(
    ["a", "b", "c", "d", "d"],
    3,
    {
      activeCombinationIds: ["c", "missing", "c"],
      reserveCombinationIds: ["d", "c", "missing", "d"]
    }
  );

  assert.deepEqual(repertoire, {
    activeCombinationIds: ["c", "a", "b"],
    reserveCombinationIds: ["d"]
  });
});

test("target options are cloned, normalized and deduplicated", () => {
  const options = normalizeCombinationTargetOptions([
    {
      id: " back ",
      targetPosition: 7,
      type: "jumpBlock",
      naturalWeight: 70,
      roles: {
        jumperPosition: 7,
        rearLifterPosition: 6
      }
    },
    {
      id: "back",
      targetPosition: 5,
      type: "directCatch",
      naturalWeight: 30,
      roles: {
        receiverPosition: 5
      }
    },
    {
      id: "invalid",
      targetPosition: 8 as 7,
      type: "jumpBlock",
      naturalWeight: 10,
      roles: { jumperPosition: 4 }
    }
  ]);

  assert.deepEqual(options, [
    {
      id: "back",
      targetPosition: 7,
      type: "jumpBlock",
      naturalWeight: 70,
      roles: {
        jumperPosition: 7,
        frontLifterPosition: undefined,
        rearLifterPosition: 6,
        receiverPosition: undefined
      }
    }
  ]);
});

test("the V2 balance configuration contains the source-of-truth anchors", () => {
  assert.deepEqual(LINEOUT_BALANCE.throwing.distanceCoefficients, [
    1, 0.99, 0.97, 0.94, 0.9, 0.85, 0.79, 0.72
  ]);
  assert.equal(LINEOUT_BALANCE.throwing.notStraightThreshold, 50);
  assert.equal(LINEOUT_BALANCE.jumping.rearLifterWeight, 0.3);
  assert.equal(LINEOUT_BALANCE.jumping.frontLifterWeight, 0.2);
  assert.equal(LINEOUT_BALANCE.match.simulationStepMinutes, 0.5);

  const movementProbability = Object.values(LINEOUT_BALANCE.match.movement)
    .reduce((sum, item) => sum + item.probability, 0);
  assert.ok(Math.abs(movementProbability - 1) < Number.EPSILON);
});
