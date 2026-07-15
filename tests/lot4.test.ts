import assert from "node:assert/strict";
import test from "node:test";
import type { FieldPlayer } from "../src/models/Player.ts";
import {
  calculateBaseKnockOnProbability,
  calculatePlacementModifier,
  calculatePressuredKnockOnProbability,
  getRecoveryPlacements,
  resolveHandsDuel,
  resolveHighBallCascade,
  resolveSoloReception,
  testKnockOn
} from "../src/rules/LineoutReceptionResolver.ts";
import type { RandomSource } from "../src/utils/Random.ts";

function player(id: string, hands: number): FieldPlayer {
  return {
    id,
    role: "field",
    number: 4,
    nickname: id,
    height: 190,
    width: 90,
    jump: 70,
    lift: 70,
    hands
  };
}

function sequenceSource(values: number[]): RandomSource {
  let index = 0;
  return {
    next: () => {
      const value = values[index];
      index += 1;
      if (value === undefined) throw new Error("Random sequence exhausted");
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

test("knock-on risk matches every hands anchor and interpolates linearly", () => {
  const anchors = new Map([
    [0, 0.5],
    [20, 0.3],
    [40, 0.15],
    [50, 0.1],
    [60, 0.075],
    [70, 0.05],
    [80, 0.025],
    [90, 0.013],
    [100, 0.001]
  ]);
  for (const [hands, probability] of anchors) {
    assertClose(calculateBaseKnockOnProbability(hands), probability);
  }
  assertClose(calculateBaseKnockOnProbability(30), 0.225);
  assertClose(calculateBaseKnockOnProbability(95), 0.007);
});

test("placement applies only the most penalizing reception modifier", () => {
  assert.equal(calculatePlacementModifier([]), 5);
  assert.equal(calculatePlacementModifier(["furtherAway"]), 0);
  assert.equal(calculatePlacementModifier(["oneBehind", "twoAhead"]), -15);
  assert.equal(calculatePlacementModifier(["oneBehind", "oneAhead"]), -30);
});

test("pressure increases knock-on risk and caps it at 60 percent", () => {
  assertClose(calculatePressuredKnockOnProbability(0.1, ["oneAhead"]), 0.3);
  assertClose(calculatePressuredKnockOnProbability(0.1, ["twoAhead"]), 0.2);
  assertClose(calculatePressuredKnockOnProbability(0.1, ["oneBehind"]), 0.2);
  assertClose(calculatePressuredKnockOnProbability(0.5, ["oneAhead"]), 0.6);
});

test("solo reception can miss, catch or knock on", () => {
  const missed = resolveSoloReception(player("receiver", 50), [], sequenceSource([0]));
  assert.equal(missed.score, 40);
  assert.equal(missed.outcome, "missed");

  const caught = resolveSoloReception(player("receiver", 70), [], sequenceSource([0, 0.99]));
  assert.equal(caught.score, 54);
  assert.equal(caught.outcome, "caught");

  const knockOn = resolveSoloReception(
    player("receiver", 100),
    ["oneAhead"],
    sequenceSource([0.999, 0])
  );
  assert.equal(knockOn.outcome, "knockOn");
  assert.equal(knockOn.knockOnRisk?.knockOn, true);
});

test("the knock-on roll uses a strict probability comparison", () => {
  assert.equal(testKnockOn(0, [], sequenceSource([0.499])).knockOn, true);
  assert.equal(testKnockOn(0, [], sequenceSource([0.5])).knockOn, false);
});

test("same-position hands duel favors the throwing team on an exact tie", () => {
  const result = resolveHandsDuel(
    player("throwing", 50),
    player("defending", 50),
    sequenceSource([0.5, 0.5, 0.99])
  );
  assert.equal(result.throwingScore, 50);
  assert.equal(result.defendingScore, 50);
  assert.equal(result.ballTeam, "throwingTeam");
  assert.equal(result.winningPlayerId, "throwing");
  assert.equal(result.outcome, "caught");
});

test("recovery placement is derived from exact relative positions", () => {
  const opponents = {
    3: player("ahead", 70),
    6: player("behind", 70)
  };
  assert.deepEqual(getRecoveryPlacements(5, opponents), ["twoAhead", "oneBehind"]);
});

test("high-ball cascade checks target plus three through position seven", () => {
  const result = resolveHighBallCascade(
    2,
    {},
    { 7: player("defender", 100) },
    sequenceSource([0, 0.99])
  );
  assert.deepEqual(result.visitedPositions, [5, 6, 7]);
  assert.equal(result.outcome, "caught");
  assert.equal(result.ballTeam, "defendingTeam");
  assert.equal(result.recoveryPosition, 7);
});

test("unrecovered high ball becomes a reproducible 50/50 loose ball", () => {
  const throwingBall = resolveHighBallCascade(5, {}, {}, sequenceSource([0.49]));
  const defendingBall = resolveHighBallCascade(5, {}, {}, sequenceSource([0.5]));
  assert.equal(throwingBall.outcome, "looseBall");
  assert.equal(throwingBall.ballTeam, "throwingTeam");
  assert.equal(defendingBall.ballTeam, "defendingTeam");
});
