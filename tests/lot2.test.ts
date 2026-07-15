import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBlockReceptionScore,
  calculateJumpQuality,
  calculateJumpRandomAmplitude
} from "../src/rules/LineoutJumpResolver.ts";
import type { FieldPlayer } from "../src/models/Player.ts";
import type { RandomSource } from "../src/utils/Random.ts";

function player(id: string, jump: number, lift: number, hands = 70): FieldPlayer {
  return {
    id,
    role: "field",
    number: 4,
    nickname: id,
    height: 190,
    width: 90,
    jump,
    lift,
    hands
  };
}

function constantSource(value: number): RandomSource {
  return { next: () => value };
}

function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("two lifters use 50/30/20 weights and receive the +10 structure bonus", () => {
  const result = calculateJumpQuality({
    jumper: player("jumper", 80, 20),
    rearLifter: player("rear", 20, 70),
    frontLifter: player("front", 20, 60),
    fatigueByPlayerId: {},
    rng: constantSource(0.5)
  });

  assert.equal(result.possible, true);
  assert.equal(result.structure, "twoLifters");
  assert.equal(result.baseQuality, 73);
  assert.equal(result.structureModifier, 10);
  assert.equal(result.randomVariation, 0);
  assert.equal(result.quality, 83);
});

test("one lifter receives -20 and zero lifters make the jump impossible", () => {
  const oneLifter = calculateJumpQuality({
    jumper: player("jumper", 80, 20),
    rearLifter: player("rear", 20, 80),
    fatigueByPlayerId: {},
    rng: constantSource(0.5)
  });
  assert.equal(oneLifter.structure, "oneLifter");
  assert.equal(oneLifter.structureModifier, -20);
  assert.equal(oneLifter.quality, 44);

  const noLifter = calculateJumpQuality({
    jumper: player("jumper", 100, 20),
    fatigueByPlayerId: {},
    rng: { next: () => { throw new Error("RNG should not be consumed"); } }
  });
  assert.equal(noLifter.possible, false);
  assert.equal(noLifter.quality, 0);
  assert.equal(noLifter.randomVariation, null);
});

test("the rear lifter contributes more than the front lifter", () => {
  const strongRear = calculateJumpQuality({
    jumper: player("jumper", 70, 20),
    rearLifter: player("rear", 20, 90),
    frontLifter: player("front", 20, 60),
    fatigueByPlayerId: {},
    rng: constantSource(0.5)
  });
  const strongFront = calculateJumpQuality({
    jumper: player("jumper", 70, 20),
    rearLifter: player("rear", 20, 60),
    frontLifter: player("front", 20, 90),
    fatigueByPlayerId: {},
    rng: constantSource(0.5)
  });

  assert.equal(strongRear.quality - strongFront.quality, 3);
});

test("individual fatigue affects only the corresponding participant", () => {
  const result = calculateJumpQuality({
    jumper: player("jumper", 80, 20),
    rearLifter: player("rear", 20, 80),
    frontLifter: player("front", 20, 80),
    fatigueByPlayerId: {
      jumper: 10,
      rear: 20,
      front: 5
    },
    rng: constantSource(0.5)
  });

  assertClose(result.effectiveStats.jump, 72);
  assertClose(result.effectiveStats.rearLift, 64);
  assertClose(result.effectiveStats.frontLift, 76);
  assertClose(result.baseQuality, 70.4);
  assertClose(result.quality, 80.4);
});

test("jump uncertainty and final quality remain bounded between 0 and 100", () => {
  assert.equal(calculateJumpRandomAmplitude(60), 30);
  assert.equal(calculateJumpRandomAmplitude(80), 20);
  assert.equal(calculateJumpRandomAmplitude(100), 10);

  const minimum = calculateJumpQuality({
    jumper: player("jumper", 0, 0),
    rearLifter: player("rear", 0, 0),
    frontLifter: player("front", 0, 0),
    fatigueByPlayerId: {},
    rng: constantSource(0)
  });
  const maximum = calculateJumpQuality({
    jumper: player("jumper", 100, 0),
    rearLifter: player("rear", 0, 100),
    frontLifter: player("front", 0, 100),
    fatigueByPlayerId: {},
    rng: constantSource(0.999999)
  });

  assert.equal(minimum.quality, 0);
  assert.ok(maximum.quality <= 100);
  assert.ok(maximum.quality >= 0);
});

test("block reception applies trajectory accessibility and hands correction", () => {
  const precise = calculateBlockReceptionScore(70, "precise", 70);
  const low = calculateBlockReceptionScore(70, "low", 80);
  const high = calculateBlockReceptionScore(70, "high", 60);

  assert.equal(precise.score, 70);
  assert.equal(low.trajectoryModifier, -15);
  assert.equal(low.handsCorrection, 5);
  assert.equal(low.score, 60);
  assert.equal(high.trajectoryModifier, -25);
  assert.equal(high.handsCorrection, -5);
  assert.equal(high.score, 40);
});
