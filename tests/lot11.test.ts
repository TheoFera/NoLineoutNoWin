import assert from "node:assert/strict";
import test from "node:test";
import { LINEOUT_COMBINATIONS } from "../src/data/LineoutCombinations.ts";
import type { Combination } from "../src/models/Combination.ts";
import type { LineoutOutcome, LineoutResult } from "../src/models/Lineout.ts";
import {
  findCombinationTargetOption,
  getCombinationTargetPositions,
  hasValidCombinationForMatch,
  isCombinationValidForMatch
} from "../src/rules/CombinationRules.ts";
import { buildLineoutResultPresentation } from "../src/rules/LineoutResultPresentation.ts";
import {
  getDefensiveLineoutSlots,
  normalizeDefenseMemory,
  normalizeDefensiveLayout
} from "../src/rules/DefenseSelection.ts";
import { getDistanceToNearestTryLine } from "../src/rules/MatchSimulator.ts";
import { createDefaultPlayerTeam } from "../src/rules/TeamFactory.ts";
import { loadGame, saveGame } from "../src/systems/SaveSystem.ts";
import { resolveRugbyPlayerAssetSet } from "../src/ui/RugbyPlayerAssetResolver.ts";

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
  const definition = LINEOUT_COMBINATIONS.find((item) => item.id === "seven_triple");
  assert.ok(definition);
  const combination: Combination = {
    ...definition,
    nameKey: "combo.seven_triple",
    slots: definition.occupiedPositions.map((position) => ({
      position,
      playerId: `player-${position}`
    }))
  };

  assert.deepEqual(getCombinationTargetPositions(combination), [2, 4, 6]);
  assert.equal(findCombinationTargetOption(combination, 6)?.id, "seven-triple-back");
  assert.equal(findCombinationTargetOption(combination, 5), undefined);
});

test("a match requires at least one combination containing two players", () => {
  const definition = LINEOUT_COMBINATIONS[0];
  assert.ok(definition);
  const combination = (playerIds: Array<string | null>): Combination => ({
    ...definition,
    nameKey: `combo.${definition.id}`,
    slots: playerIds.map((playerId, index) => ({
      position: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      playerId
    }))
  });
  const empty = combination([]);
  const incomplete = combination(["player-1"]);
  const valid = combination(["player-1", "player-2"]);

  assert.equal(isCombinationValidForMatch(empty), false);
  assert.equal(isCombinationValidForMatch(incomplete), false);
  assert.equal(isCombinationValidForMatch(valid), true);
  assert.equal(hasValidCombinationForMatch([empty, incomplete]), false);
  assert.equal(hasValidCombinationForMatch([empty, valid]), true);
});

test("distance to the nearest try line is symmetric and clamped to the pitch", () => {
  assert.equal(getDistanceToNearestTryLine(-8), 0);
  assert.equal(getDistanceToNearestTryLine(18), 18);
  assert.equal(getDistanceToNearestTryLine(50), 50);
  assert.equal(getDistanceToNearestTryLine(82), 18);
  assert.equal(getDistanceToNearestTryLine(112), 0);
});

test("defensive layouts remember exact players and free slots for each lineout size", () => {
  const team = createDefaultPlayerTeam("Mémoire défensive");
  const ids = team.lineoutPlayers.map((player) => player.id);
  const memory = normalizeDefenseMemory({
    4: [ids[3], null, ids[0], null, ids[2], ids[1], null],
    5: [ids[4], ids[3], null, ids[2], ids[1], null, ids[0]]
  }, team);

  const fourPlayerSlots = getDefensiveLineoutSlots(team, ids, memory, 4, [1, 2, 3, 4]);
  const fivePlayerSlots = getDefensiveLineoutSlots(team, ids, memory, 5, [1, 2, 3, 4, 5]);

  assert.deepEqual(fourPlayerSlots.map((player) => player?.id ?? null), memory[4]);
  assert.deepEqual(fivePlayerSlots.map((player) => player?.id ?? null), memory[5]);
});

test("compact defensive memories from older saves still use the default spread", () => {
  const team = createDefaultPlayerTeam("Ancienne sauvegarde");
  const ids = team.lineoutPlayers.map((player) => player.id);
  const memory = normalizeDefenseMemory({ 4: ids.slice(0, 4) }, team);

  const slots = getDefensiveLineoutSlots(team, ids, memory, 4, [1, 2, 3, 4]);

  assert.deepEqual(slots.map((player) => player?.id ?? null), [
    null,
    ids[0],
    ids[1],
    ids[2],
    ids[3],
    null,
    null
  ]);
});

test("every defensive lineout size keeps an independent seven-slot layout", () => {
  const team = createDefaultPlayerTeam("Toutes les tailles");
  const ids = team.lineoutPlayers.map((player) => player.id);
  const layouts = Object.fromEntries(
    [2, 3, 4, 5, 6, 7].map((size) => [
      size,
      Array.from({ length: 7 }, (_, slot) => slot < size ? ids[(slot + size) % ids.length] : null)
    ])
  );
  const memory = normalizeDefenseMemory(layouts, team);

  for (const size of [2, 3, 4, 5, 6, 7]) {
    assert.deepEqual(memory[size as 2 | 3 | 4 | 5 | 6 | 7], layouts[size]);
  }
});

test("new defensive layouts are always stored with all seven positions", () => {
  assert.deepEqual(normalizeDefensiveLayout(["avant", null, "fond"]), [
    "avant",
    null,
    "fond",
    null,
    null,
    null,
    null
  ]);
});

test("defensive layouts survive a complete local save reload", () => {
  const previousStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  } as Storage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });

  try {
    const team = createDefaultPlayerTeam("Persistance défensive");
    const ids = team.lineoutPlayers.map((player) => player.id);
    const defenseMemory = normalizeDefenseMemory({
      2: [ids[1], null, null, null, ids[0], null, null],
      3: [null, ids[2], null, ids[1], null, ids[0], null],
      4: [ids[3], null, ids[2], null, ids[1], null, ids[0]],
      5: [ids[4], ids[3], null, ids[2], null, ids[1], ids[0]],
      6: [ids[5], ids[4], ids[3], null, ids[2], ids[1], ids[0]],
      7: [ids[6], ids[5], ids[4], ids[3], ids[2], ids[1], ids[0]]
    }, team);

    saveGame({ version: 3, defenseMemory } as Parameters<typeof saveGame>[0]);

    assert.deepEqual(loadGame()?.defenseMemory, defenseMemory);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousStorage });
  }
});

test("rugby player poses fall back through medium_standard before stand_front", () => {
  assert.deepEqual(resolveRugbyPlayerAssetSet("small_large", "hand"), {
    bodyShape: "medium_standard",
    pose: "hand"
  });
  assert.deepEqual(resolveRugbyPlayerAssetSet("large_large", "hooker_throw_back"), {
    bodyShape: "medium_standard",
    pose: "hooker_throw_back"
  });
  assert.deepEqual(resolveRugbyPlayerAssetSet("small_slim", "lifter_front"), {
    bodyShape: "medium_standard",
    pose: "lifter_front"
  });
  assert.deepEqual(resolveRugbyPlayerAssetSet("large_large", "hooker_ready_back"), {
    bodyShape: "medium_standard",
    pose: "stand_front"
  });
});
