import assert from "node:assert/strict";
import test from "node:test";
import type { Division } from "../src/models/Division.ts";
import type { LineoutResolution } from "../src/models/Lineout.ts";
import type { MatchStateData } from "../src/models/Match.ts";
import type { Team } from "../src/models/Team.ts";
import {
  advanceMatchSimulation,
  advanceMatchSimulationWithTrace,
  advanceToNextScheduledLineoutWithTrace,
  applyLineoutResolutionToMatch,
  generateMatchSchedule,
  getPitchZoneFromPosition,
  getRealSecondsForSimulatedMinutes,
  getTurnoverProbability
} from "../src/rules/MatchSimulator.ts";
import type { RandomSource } from "../src/utils/Random.ts";
import { LINEOUT_BALANCE } from "../src/config/LineoutBalance.ts";

const constant = (value: number): RandomSource => ({ next: () => value });

function team(id: string): Team {
  const fieldPlayers = [1, 2, 3, 4, 5, 6, 7].map((number) => ({
    id: `${id}-p${number}`,
    role: "field" as const,
    number,
    nickname: `${id}-${number}`,
    height: 190,
    width: 90,
    jump: 70,
    lift: 70,
    hands: 70
  }));
  return {
    id,
    name: id,
    divisionId: "regionale_3",
    colors: { primary: 0, secondary: 0xffffff },
    hooker: {
      id: `${id}-h`,
      role: "hooker",
      number: 2,
      nickname: "Talonneur",
      height: 180,
      width: 90,
      throwing: 70
    },
    fieldPlayers,
    lineoutPlayers: fieldPlayers
  };
}

function match(overrides: Partial<MatchStateData> = {}): MatchStateData {
  return {
    id: "match",
    divisionId: "regionale_3",
    home: team("player"),
    away: team("opponent"),
    minute: 0,
    maxMinute: 80,
    ourScore: 0,
    opponentScore: 0,
    possession: 50,
    occupation: 50,
    ballOwner: "player",
    ballPositionMeters: 50,
    playerPossessionTimeMinutes: 0,
    opponentPossessionTimeMinutes: 0,
    playerOccupationTimeMinutes: 0,
    opponentOccupationTimeMinutes: 0,
    playerAttackingPressure: 0,
    opponentAttackingPressure: 0,
    lineouts: [],
    currentLineoutIndex: 0,
    playerUsage: {},
    combinationStats: {},
    opponentCombinationStats: {},
    lineoutHistory: [],
    maximumFatigueByPlayerId: {},
    ...overrides
  };
}

function resolution(
  outcome: LineoutResolution["outcome"],
  ballTeam: LineoutResolution["ballTeam"]
): LineoutResolution {
  return {
    outcome,
    ballTeam,
    restart: outcome === "knockOn" || outcome === "notStraight" ? "scrum" : "continuousPlay",
    primaryReason: "test",
    details: {}
  };
}

test("one quota is drawn and both teams receive exactly the same number of throws", () => {
  const division: Division = {
    id: "top_14",
    label: "Top 14",
    minLineouts: 10,
    maxLineouts: 14,
    offensiveCombinations: 5,
    opponentSkill: 94,
    adaptationAfterRepeats: 1
  };
  const schedule = generateMatchSchedule(division, constant(0.999));
  const playerThrows = schedule.lineouts.filter((event) => event.throwingSide === "us").length;
  const opponentThrows = schedule.lineouts.filter((event) => event.throwingSide === "opponent").length;

  assert.equal(schedule.quotaPerTeam, 14);
  assert.equal(schedule.maxMinute, 82);
  assert.equal(playerThrows, opponentThrows);
  assert.equal(playerThrows, 14);
  for (let index = 1; index < schedule.lineouts.length; index += 1) {
    assert.ok(schedule.lineouts[index].minute - schedule.lineouts[index - 1].minute >= 3);
  }
});

test("simulation accumulates real possession and occupation times", () => {
  const advanced = advanceMatchSimulation(match(), 1, constant(0.5));
  assert.equal(advanced.minute, 1);
  assert.equal(advanced.playerPossessionTimeMinutes, 1);
  assert.equal(advanced.opponentPossessionTimeMinutes, 0);
  assert.equal(advanced.possession, 100);
  assert.equal(advanced.ballPositionMeters, 55);
  assert.equal(advanced.playerOccupationTimeMinutes, 0.5);
  assert.equal(advanced.occupation, 50);
});

test("turnover probability scales exactly to the simulation step", () => {
  assert.ok(Math.abs(getTurnoverProbability(1) - 0.025) < 1e-12);
  assert.ok(Math.abs(getTurnoverProbability(0.5) - (1 - Math.sqrt(0.975))) < 1e-12);
});

test("random turnovers wait for a possession sequence to build", () => {
  const protectedPhase = advanceMatchSimulationWithTrace(
    match({ possessionDurationMinutes: 0 }),
    0.5,
    constant(0)
  );
  const exposedPhase = advanceMatchSimulationWithTrace(
    match({ possessionDurationMinutes: 2 }),
    0.5,
    constant(0)
  );
  assert.equal(protectedPhase.match.ballOwner, "player");
  assert.equal(exposedPhase.match.ballOwner, "opponent");
});

test("a lineout preserves its lateral side through the stoppage", () => {
  const scheduled = match({
    lineouts: [{
      id: "lineout-1",
      minute: 1,
      pitchZone: "middle",
      throwingSide: "us",
      numberOfPlayers: 7,
      cause: "carrierIntoTouch",
      resolved: false
    }]
  });
  const trace = advanceToNextScheduledLineoutWithTrace(scheduled, constant(0.5));
  const resumed = applyLineoutResolutionToMatch(
    trace.match,
    resolution("cleanWin", "throwingTeam"),
    "us",
    constant(0.5)
  );
  assert.equal(trace.match.ballLateralPosition, -0.92);
  assert.equal(resumed.ballLateralPosition, -0.92);
});

test("a score is followed by a kickoff into the scoring team's half", () => {
  const updated = applyLineoutResolutionToMatch(
    match({ ballPositionMeters: 90, ballOwner: "opponent" }),
    resolution("cleanWin", "throwingTeam"),
    "us",
    constant(0)
  );
  assert.equal(updated.ourScore, 7);
  assert.equal(updated.ballPositionMeters, 30);
  assert.equal(updated.ballOwner, "player");
  assert.equal(updated.playerAttackingPressure, 0);
});

test("simulation exposes every intermediate half-minute frame for animation", () => {
  const trace = advanceMatchSimulationWithTrace(match(), 1.5, constant(0.5));
  assert.equal(trace.frames.length, 3);
  assert.equal(trace.actions.length, 3);
  assert.deepEqual(trace.frames.map((frame) => frame.minute), [0.5, 1, 1.5]);
  assert.equal(trace.match, trace.frames[2]);
});

test("a low clearance roll from the 22 gives the ball to the receiver", () => {
  const trace = advanceMatchSimulationWithTrace(
    match({ ballPositionMeters: 10, ballOwner: "player" }),
    0.5,
    constant(0)
  );
  assert.equal(trace.actions[0].kind, "clearanceKick");
  assert.equal(trace.match.ballPositionMeters, 35);
  assert.equal(trace.match.ballOwner, "opponent");
});

test("clearance kicks from the 22 are occasional rather than automatic", () => {
  const trace = advanceMatchSimulationWithTrace(
    match({ ballPositionMeters: 10, ballOwner: "player" }),
    0.5,
    constant(0.2)
  );
  assert.notEqual(trace.actions[0].kind, "clearanceKick");
  assert.equal(trace.match.ballOwner, "player");
});

test("open play can create a breakthrough between 10 and 40 metres", () => {
  const trace = advanceMatchSimulationWithTrace(match(), 0.5, constant(0));
  assert.equal(trace.actions[0].kind, "breakthrough");
  assert.equal(trace.actions[0].distanceMeters, 10);
  assert.equal(trace.match.ballPositionMeters, 60);
});

test("missed immediate chance preserves possession and lineout pressure", () => {
  const updated = applyLineoutResolutionToMatch(
    match({ ballPositionMeters: 83, ballOwner: "opponent" }),
    resolution("scrappyWin", "throwingTeam"),
    "us",
    constant(0.3)
  );
  assert.equal(updated.ourScore, 0);
  assert.equal(updated.ballOwner, "player");
  assert.equal(updated.playerAttackingPressure, 6);
});

test("pitch zones and accelerated real duration use the exact field model", () => {
  assert.equal(getPitchZoneFromPosition(0), "our_22");
  assert.equal(getPitchZoneFromPosition(22), "our_22");
  assert.equal(getPitchZoneFromPosition(50), "middle");
  assert.equal(getPitchZoneFromPosition(78), "their_22");
  assert.equal(getPitchZoneFromPosition(100), "their_22");
  assert.ok(Math.abs(getRealSecondsForSimulatedMinutes(80) - 80 / 3) < 1e-12);
});

test("open-play lateral lanes favor the central area instead of alternating touchlines", () => {
  const lanes = LINEOUT_BALANCE.match.visualSimulation.passLateralLaneRatios;
  const centralLanes = lanes.filter((lane) => Math.abs(lane) <= 0.57);
  assert.ok(centralLanes.length / lanes.length >= 0.7);
  assert.ok(lanes.some((lane) => lane === 0));
  assert.ok(lanes.some((lane) => lane > 0.57));
  assert.ok(lanes.some((lane) => lane < -0.57));
});
