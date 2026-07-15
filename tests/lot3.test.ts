import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateInterceptionHandsCorrection,
  classifyAerialDuelGap,
  classifyInterceptionControlMargin,
  resolveAheadCounter,
  resolveSamePositionDuel
} from "../src/rules/LineoutCounterResolver.ts";

function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("same-position duel boundaries match -16, -15, -1, 0, 10 and 11", () => {
  assert.equal(classifyAerialDuelGap(-16), "defenseCleanSteal");
  assert.equal(classifyAerialDuelGap(-15), "defenseDeflected");
  assert.equal(classifyAerialDuelGap(-1), "defenseDeflected");
  assert.equal(classifyAerialDuelGap(0), "attackScrappy");
  assert.equal(classifyAerialDuelGap(10), "attackScrappy");
  assert.equal(classifyAerialDuelGap(11), "attackClean");
});

test("same-position duel combines jump, hands and attacking trajectory", () => {
  const precise = resolveSamePositionDuel({
    attackingJumpQuality: 80,
    attackingHands: 80,
    defendingJumpQuality: 70,
    defendingHands: 70,
    trajectory: "precise"
  });
  assert.equal(precise.attackScore, 80);
  assert.equal(precise.defenseScore, 70);
  assert.equal(precise.gap, 10);
  assert.equal(precise.outcome, "attackScrappy");

  const high = resolveSamePositionDuel({
    attackingJumpQuality: 80,
    attackingHands: 80,
    defendingJumpQuality: 70,
    defendingHands: 70,
    trajectory: "high"
  });
  assert.equal(high.gap, -15);
  assert.equal(high.outcome, "defenseDeflected");
});

test("one-position-ahead counter uses precise and low difficulties", () => {
  const precise = resolveAheadCounter({
    targetPosition: 5,
    defensivePosition: 4,
    throwQuality: 80,
    defendingJumpQuality: 90,
    defendingHands: 50,
    trajectory: "precise"
  });
  assert.equal(precise.counterScore, 85);
  assert.equal(precise.difficulty, 79);
  assert.equal(precise.interceptionMargin, 6);
  assert.equal(precise.outcome, "defenseDeflected");

  const low = resolveAheadCounter({
    targetPosition: 5,
    defensivePosition: 4,
    throwQuality: 80,
    defendingJumpQuality: 90,
    defendingHands: 100,
    trajectory: "low"
  });
  assert.equal(low.difficulty, 51);
  assert.equal(low.interceptionMargin, 34);
  assert.equal(low.outcome, "defenseCleanSteal");
});

test("two-position-ahead counter works only for a low throw", () => {
  const low = resolveAheadCounter({
    targetPosition: 6,
    defensivePosition: 4,
    throwQuality: 70,
    defendingJumpQuality: 100,
    defendingHands: 50,
    trajectory: "low"
  });
  assert.equal(low.counterScore, 70);
  assert.equal(low.difficulty, 54);
  assert.equal(low.interceptionMargin, 16);
  assert.equal(low.outcome, "defenseCleanSteal");

  for (const trajectory of ["precise", "high"] as const) {
    const impossible = resolveAheadCounter({
      targetPosition: 6,
      defensivePosition: 4,
      throwQuality: 70,
      defendingJumpQuality: 100,
      defendingHands: 100,
      trajectory
    });
    assert.equal(impossible.outcome, "counterImpossible");
  }
});

test("a defender behind the target cannot make the initial counter", () => {
  const result = resolveAheadCounter({
    targetPosition: 3,
    defensivePosition: 4,
    throwQuality: 60,
    defendingJumpQuality: 100,
    defendingHands: 100,
    trajectory: "low"
  });
  assert.equal(result.relativeOffset, -1);
  assert.equal(result.outcome, "counterImpossible");
});

test("a failed interception lets the ball continue to the target", () => {
  const result = resolveAheadCounter({
    targetPosition: 5,
    defensivePosition: 4,
    throwQuality: 100,
    defendingJumpQuality: 60,
    defendingHands: 100,
    trajectory: "precise"
  });
  assert.ok((result.interceptionMargin ?? 0) < 0);
  assert.equal(result.outcome, "ballContinues");
  assert.equal(result.handsCorrection, 0);
});

test("interception hands correction follows the quadratic curve", () => {
  assert.equal(calculateInterceptionHandsCorrection(50), 0);
  assertClose(calculateInterceptionHandsCorrection(60), 0.8);
  assertClose(calculateInterceptionHandsCorrection(70), 3.2);
  assertClose(calculateInterceptionHandsCorrection(80), 7.2);
  assertClose(calculateInterceptionHandsCorrection(90), 12.8);
  assertClose(calculateInterceptionHandsCorrection(100), 20);
});

test("interception control margin 15 is deflected and 16 is cleanly stolen", () => {
  assert.equal(classifyInterceptionControlMargin(15), "defenseDeflected");
  assert.equal(classifyInterceptionControlMargin(16), "defenseCleanSteal");
});
