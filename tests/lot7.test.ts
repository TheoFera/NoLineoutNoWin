import assert from "node:assert/strict";
import test from "node:test";
import { LINEOUT_BALANCE } from "../src/config/LineoutBalance.ts";
import type { DivisionId } from "../src/models/Division.ts";
import {
  deduceAerialRole,
  generateLineoutRoster,
  generateTeamForDivision,
  getFixedClubModifier
} from "../src/rules/TeamGeneration.ts";
import { createSeededRandom } from "../src/utils/Random.ts";

function roster(divisionId: DivisionId, seed: number, clubModifier: -3 | 0 | 3 = 0) {
  return generateLineoutRoster({
    divisionId,
    prefix: `${divisionId}_`,
    hookerId: `${divisionId}_h2`,
    hookerNickname: "Talonneur",
    clubModifier,
    rng: createSeededRandom(seed)
  });
}

test("Régionale 3 has exactly two lifters, three hybrids and two jumpers", () => {
  const generated = roster("regionale_3", 10);
  const roles = generated.fieldPlayers.map(deduceAerialRole);

  assert.equal(roles.filter((role) => role === "lifter").length, 2);
  assert.equal(roles.filter((role) => role === "jumperLifter").length, 3);
  assert.equal(roles.filter((role) => role === "jumper").length, 2);
  assert.equal(generated.hooker.throwing >= 60 && generated.hooker.throwing <= 70, true);
  assert.equal(generated.report.valid, true);
});

test("from Fédérale 1 every lineout player can jump and lift", () => {
  for (const divisionId of ["federale_1", "nationale_2", "nationale", "pro_d2", "top_14"] as const) {
    const generated = roster(divisionId, 20);
    assert.ok(generated.fieldPlayers.every((player) => player.jump >= 60 && player.lift >= 60));
    assert.equal(generated.report.valid, true);
  }
});

test("club modifier is fixed by id and creates only a small intra-division gap", () => {
  assert.equal(getFixedClubModifier("same_club"), getFixedClubModifier("same_club"));
  const weak = roster("nationale", 30, -3);
  const strong = roster("nationale", 30, 3);
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const weakAverage = average(weak.fieldPlayers.flatMap((player) => [player.jump, player.lift, player.hands]));
  const strongAverage = average(strong.fieldPlayers.flatMap((player) => [player.jump, player.lift, player.hands]));

  assert.ok(strongAverage > weakAverage);
  assert.ok(strongAverage - weakAverage <= 7);
});

test("generation is exactly reproducible from the same seed", () => {
  const first = roster("pro_d2", 1234, 3);
  const second = roster("pro_d2", 1234, 3);
  assert.deepEqual(first, second);
});

test("generated stats respect each division range and the 0 to 100 bounds", () => {
  for (const divisionId of Object.keys(LINEOUT_BALANCE.generation.divisionStats) as DivisionId[]) {
    const generated = roster(divisionId, 100);
    const values = [
      generated.hooker.throwing,
      ...generated.fieldPlayers.flatMap((player) => [player.jump, player.lift, player.hands])
    ];
    assert.ok(values.every((value) => value >= 0 && value <= 100));
  }
});

test("a generated team receives the configured active and reserve repertoire", () => {
  const generated = generateTeamForDivision({
    id: "club_test",
    name: "Club test",
    divisionId: "federale_2",
    colors: { primary: 0x000000, secondary: 0xffffff },
    prefix: "club_",
    rng: createSeededRandom(77)
  });
  const limits = LINEOUT_BALANCE.ai.repertoireByDivision.federale_2;

  assert.equal(generated.team.offensiveRepertoire?.activeCombinationIds.length, limits.active);
  assert.equal(generated.team.offensiveRepertoire?.reserveCombinationIds.length, limits.reserve);
  assert.equal(
    generated.team.offensiveCombinations?.length,
    limits.active + limits.reserve
  );
});
