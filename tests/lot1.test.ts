import assert from "node:assert/strict";
import test from "node:test";
import { LINEOUT_REFERENCE_RATES } from "../src/config/LineoutBalance.ts";
import {
  calculateCurrentFatiguePercent,
  calculateDistanceIndex,
  calculateExceptionalErrorProbability,
  calculateThrowQuality,
  calculateThrowRandomAmplitude,
  calculateThrowTrajectoryProbabilities,
  generateMaximumFatiguePercent,
  getDistanceCoefficient,
  resolveThrowTrajectory
} from "../src/rules/LineoutThrowResolver.ts";
import { createSeededRandom, type RandomSource } from "../src/utils/Random.ts";

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

function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("distance is normalized from 0 to 7 and coefficients are interpolated", () => {
  assert.equal(calculateDistanceIndex(1), 0);
  assert.equal(calculateDistanceIndex(7), 7);
  assertClose(calculateDistanceIndex(4), 3.5);
  assert.equal(getDistanceCoefficient(0), 1);
  assert.equal(getDistanceCoefficient(7), 0.72);
  assertClose(getDistanceCoefficient(3.5), 0.92);
});

test("throwing uncertainty follows stats 60, 70, 80, 90 and 100", () => {
  assert.equal(calculateThrowRandomAmplitude(60), 30);
  assert.equal(calculateThrowRandomAmplitude(70), 25);
  assert.equal(calculateThrowRandomAmplitude(80), 20);
  assert.equal(calculateThrowRandomAmplitude(90), 15);
  assert.equal(calculateThrowRandomAmplitude(100), 10);
});

test("fatigue generation and progression use the configured percentage scale", () => {
  assert.equal(generateMaximumFatiguePercent(sequenceSource([0])), 5);
  assertClose(generateMaximumFatiguePercent(sequenceSource([0.999])), 14.99, 0.001);
  assert.equal(calculateCurrentFatiguePercent(10, 0), 0);
  assert.equal(calculateCurrentFatiguePercent(10, 40), 5);
  assert.equal(calculateCurrentFatiguePercent(10, 80), 10);
  assertClose(calculateCurrentFatiguePercent(10, 82), 10.25);
});

test("normal throw quality combines distance, fatigue and centered uncertainty", () => {
  for (const throwing of [60, 70, 80, 90, 100]) {
    for (const fatiguePercent of [0, 5, 15]) {
      const shortThrow = calculateThrowQuality({
        throwing,
        targetPosition: 1,
        fatiguePercent,
        rng: sequenceSource([0.999, 0.5])
      });
      assertClose(shortThrow.quality, throwing * (1 - fatiguePercent / 100));
    }

    const longThrow = calculateThrowQuality({
      throwing,
      targetPosition: 7,
      fatiguePercent: 15,
      rng: sequenceSource([0.999, 0.5])
    });
    assertClose(longThrow.quality, throwing * 0.72 * 0.85);
    assert.ok(longThrow.quality >= 0 && longThrow.quality <= 100);
  }
});

test("exceptional error is checked first and forces quality between 0 and 25", () => {
  assertClose(calculateExceptionalErrorProbability(0), 0.001);
  assertClose(calculateExceptionalErrorProbability(7), 0.05);

  const result = calculateThrowQuality({
    throwing: 100,
    targetPosition: 7,
    fatiguePercent: 0,
    rng: sequenceSource([0, 0.5])
  });

  assert.equal(result.exceptionalError, true);
  assert.equal(result.normalVariation, null);
  assert.equal(result.quality, 12.5);
});

test("trajectory curve matches Q 50, 60, 70, 80, 90 and 100", () => {
  const expectedPrecise = new Map([
    [50, 1 / 3],
    [60, 0.403],
    [70, 0.568],
    [80, 0.765],
    [90, 0.931],
    [100, 1]
  ]);

  for (const [quality, expected] of expectedPrecise) {
    const probabilities = calculateThrowTrajectoryProbabilities(quality);
    assertClose(probabilities.precise, expected, 0.0005);
    assertClose(probabilities.low, (1 - probabilities.precise) / 2);
    assertClose(probabilities.high, probabilities.low);
  }
});

test("trajectory selection covers not straight, precise, low and high", () => {
  const neverUsed: RandomSource = { next: () => { throw new Error("RNG should not be consumed"); } };
  assert.equal(resolveThrowTrajectory(49.999, neverUsed).trajectory, "notStraight");
  assert.equal(resolveThrowTrajectory(50, sequenceSource([0.1])).trajectory, "precise");
  assert.equal(resolveThrowTrajectory(50, sequenceSource([0.5])).trajectory, "low");
  assert.equal(resolveThrowTrajectory(50, sequenceSource([0.9])).trajectory, "high");
});

test("Monte-Carlo straight-throw rates stay close to the reference table", () => {
  const iterations = 30_000;
  let seed = 100;

  for (const [distanceKey, byThrowing] of Object.entries(
    LINEOUT_REFERENCE_RATES.straightThrowWithoutFatigue
  )) {
    const distanceIndex = Number(distanceKey);
    for (const [throwingKey, expectedRate] of Object.entries(byThrowing)) {
      const throwing = Number(throwingKey);
      const rng = createSeededRandom(seed);
      seed += 1;
      let straight = 0;

      for (let index = 0; index < iterations; index += 1) {
        const result = calculateThrowQuality({
          throwing,
          targetPosition: 1,
          distanceIndex,
          fatiguePercent: 0,
          rng
        });
        if (result.quality >= 50) {
          straight += 1;
        }
      }

      const actualRate = straight / iterations;
      assertClose(actualRate, expectedRate, 0.018);
    }
  }
});
