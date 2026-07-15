import assert from "node:assert/strict";
import test from "node:test";
import { LINEOUT_COMBINATIONS } from "../src/data/LineoutCombinations.ts";
import type { Combination } from "../src/models/Combination.ts";
import type { LineoutOutcome, LineoutResult } from "../src/models/Lineout.ts";
import {
  findCombinationTargetOption,
  getCombinationTargetPositions
} from "../src/rules/CombinationRules.ts";
import { buildLineoutResultPresentation } from "../src/rules/LineoutResultPresentation.ts";
import { getDistanceToNearestTryLine } from "../src/rules/MatchSimulator.ts";

const outcomeTitleKeys: Record<LineoutOutcome, string> = {
  cleanWin: "lineout.outcome.cleanWin",
  scrappyWin: "lineout.outcome.scrappyWin",
  deflectedTurnover: "lineout.outcome.deflectedTurnover",
  cleanSteal: "lineout.outcome.cleanSteal",
  knockOn: "lineout.outcome.knockOn",
  notStraight: "lineout.outcome.notStraight",
  looseBall: "lineout.outcome.looseBall"
};

function result(outcome: LineoutOutcome): LineoutResult {
  return {
    displayedResult: "won",
    internalEvent: "clean_catch",
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey: "lineout.explanation.clean",
    calculationScore: 0,
    calculationDetails: [],
    resolution: {
      outcome,
      ballTeam: "throwingTeam",
      restart: outcome === "knockOn" || outcome === "notStraight" ? "scrum" : "continuousPlay",
      primaryReason: "lineout.reason.blockReceptionClean",
      details: {
        targetPosition: 4,
        trajectory: "precise",
        throwQuality: 73.4,
        attackJumpQuality: 68.8,
        blockReceptionScore: 71.2
      }
    }
  };
}

test("the result presentation exposes all seven official outcomes", () => {
  for (const [outcome, titleKey] of Object.entries(outcomeTitleKeys)) {
    assert.equal(
      buildLineoutResultPresentation(result(outcome as LineoutOutcome)).titleKey,
      titleKey
    );
  }
});

test("the detailed result keeps trajectory, useful scores and final possession", () => {
  const presentation = buildLineoutResultPresentation(result("cleanWin"));
  assert.equal(presentation.reasonKey, "lineout.reason.blockReceptionClean");
  assert.deepEqual(
    presentation.details.map((detail) => detail.labelKey),
    [
      "lineout.detail.targetPosition",
      "lineout.detail.trajectory",
      "lineout.detail.throwQuality",
      "lineout.detail.attackJump",
      "lineout.detail.reception",
      "lineout.detail.possessionAfter"
    ]
  );
  assert.equal(presentation.details[1].valueKey, "lineout.trajectory.precise");
  assert.equal(presentation.details.at(-1)?.valueKey, "lineout.team.throwingTeam");
});

test("only declared target options are exposed for the selected combination", () => {
  const definition = LINEOUT_COMBINATIONS.find((item) => item.id === "long_back");
  assert.ok(definition);
  const combination: Combination = {
    ...definition,
    nameKey: "combo.long_back",
    slots: definition.occupiedPositions.map((position) => ({
      position,
      playerId: `player-${position}`
    }))
  };

  assert.deepEqual(getCombinationTargetPositions(combination), [2, 4, 6, 7]);
  assert.equal(findCombinationTargetOption(combination, 6)?.id, "long-back");
  assert.equal(findCombinationTargetOption(combination, 5), undefined);
});

test("distance to the nearest try line is symmetric and clamped to the pitch", () => {
  assert.equal(getDistanceToNearestTryLine(-8), 0);
  assert.equal(getDistanceToNearestTryLine(18), 18);
  assert.equal(getDistanceToNearestTryLine(50), 50);
  assert.equal(getDistanceToNearestTryLine(82), 18);
  assert.equal(getDistanceToNearestTryLine(112), 0);
});
