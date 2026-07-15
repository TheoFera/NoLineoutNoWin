import assert from "node:assert/strict";
import test from "node:test";
import {
  runGameplayV2Simulation,
  simulateAiPreparation,
  simulateDivisionLineouts,
  simulateMatchImpact,
  simulateThrowingMatrix
} from "../src/simulation/GameplayV2Simulation.ts";

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

function assertRate(value: number): void {
  assert.ok(value >= 0 && value <= 1, `expected a rate in [0, 1], received ${value}`);
}

test("the complete statistical report is exactly reproducible from one seed", () => {
  const options = {
    seed: 9182,
    throwIterationsPerCell: 5,
    lineoutsPerDivision: 5,
    aiPredictionsPerDivision: 5,
    matchesPerDivision: 1
  };
  assert.deepEqual(runGameplayV2Simulation(options), runGameplayV2Simulation(options));
});

test("throwing matrix covers five stats and seven positions with complete trajectory rates", () => {
  const rows = simulateThrowingMatrix(100, 42);
  assert.equal(rows.length, 35);
  for (const row of rows) {
    assert.ok(Math.abs(sum(row.trajectoryRates) - 1) < 1e-12);
    assert.ok(Math.abs(row.straightRate - (1 - row.trajectoryRates.notStraight)) < 1e-12);
    assertRate(row.straightRate);
  }
});

test("division reports expose every official outcome and position effectiveness", () => {
  const reports = simulateDivisionLineouts(30, 77);
  assert.equal(reports.length, 10);
  for (const report of reports) {
    assert.ok(Math.abs(sum(report.outcomeRates) - 1) < 1e-12);
    assert.ok(Math.abs(sum(report.trajectoryRates) - 1) < 1e-12);
    assert.equal(report.positionEffectiveness.length, 7);
    assert.equal(
      report.positionEffectiveness.reduce((total, position) => total + position.samples, 0),
      report.samples
    );
    assertRate(report.throwingRetentionRate);
  }
});

test("full video preparation improves exact-target prediction in every division", () => {
  const reports = simulateAiPreparation(300, 321);
  assert.equal(reports.length, 10);
  for (const report of reports) {
    assert.ok(report.fullPreparationAccuracy > report.noPreparationAccuracy);
    assert.ok(report.accuracyGain > 0);
  }
});

test("match impact reports stay bounded and account direct lineout points", () => {
  const reports = simulateMatchImpact(2, 991);
  assert.equal(reports.length, 10);
  for (const report of reports) {
    assert.ok(report.averageTotalPoints >= 0);
    assert.ok(report.averageDirectLineoutPoints >= 0);
    assert.ok(report.averageDirectLineoutPoints <= report.averageTotalPoints);
    assertRate(report.directLineoutPointShare);
    assertRate(report.matchesWithDirectLineoutPointsRate);
    assertRate(report.matchesDecidedWithinDirectLineoutPointsRate);
  }
});
