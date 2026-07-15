import assert from "node:assert/strict";
import test from "node:test";
import type { CombinationTargetOption, LineoutPosition } from "../src/models/Combination.ts";
import type {
  LineoutAssignments,
  LineoutResolutionInput
} from "../src/models/Lineout.ts";
import type { FieldPlayer, Hooker } from "../src/models/Player.ts";
import { resolveLineoutV2 } from "../src/rules/LineoutV2Resolver.ts";
import type { RandomSource } from "../src/utils/Random.ts";

function player(
  id: string,
  stats: Partial<Pick<FieldPlayer, "jump" | "lift" | "hands">> = {}
): FieldPlayer {
  return {
    id,
    role: "field",
    number: 4,
    nickname: id,
    height: 190,
    width: 90,
    jump: stats.jump ?? 70,
    lift: stats.lift ?? 70,
    hands: stats.hands ?? 70
  };
}

function hooker(throwing: number): Hooker {
  return {
    id: "hooker",
    role: "hooker",
    number: 2,
    nickname: "hooker",
    height: 180,
    width: 90,
    throwing
  };
}

function sequenceSource(values: number[]): RandomSource {
  let index = 0;
  return {
    next: () => {
      const value = values[index];
      index += 1;
      if (value === undefined) throw new Error(`Random sequence exhausted at index ${index - 1}`);
      return value;
    }
  };
}

function directOption(position: LineoutPosition): CombinationTargetOption {
  return {
    id: `direct-${position}`,
    targetPosition: position,
    type: "directCatch",
    roles: { receiverPosition: position },
    naturalWeight: 1
  };
}

function jumpOption(position: LineoutPosition): CombinationTargetOption {
  return {
    id: `jump-${position}`,
    targetPosition: position,
    type: "jumpBlock",
    roles: {
      jumperPosition: position,
      frontLifterPosition: (position - 1) as LineoutPosition,
      rearLifterPosition: (position + 1) as LineoutPosition
    },
    naturalWeight: 1
  };
}

function resolutionInput(options: {
  throwing?: number;
  targetOption: CombinationTargetOption;
  targetPlayer: FieldPlayer;
  attackingAssignments?: LineoutAssignments;
  defendingAssignments?: LineoutAssignments;
  defensiveJumpPosition?: LineoutPosition;
  randomValues: number[];
}): LineoutResolutionInput {
  return {
    minute: 40,
    throwingTeamId: "us",
    defendingTeamId: "them",
    throwingHooker: hooker(options.throwing ?? 100),
    targetPlayerId: options.targetPlayer.id,
    targetOption: options.targetOption,
    attackingAssignments: options.attackingAssignments ?? {
      [options.targetOption.targetPosition]: options.targetPlayer
    },
    defendingAssignments: options.defendingAssignments ?? {},
    defensiveJumpPosition: options.defensiveJumpPosition,
    fatigueByPlayerId: {},
    rng: sequenceSource(options.randomValues)
  };
}

test("not-straight throw immediately awards a defending scrum", () => {
  const target = player("target");
  const result = resolveLineoutV2(resolutionInput({
    throwing: 60,
    targetOption: directOption(1),
    targetPlayer: target,
    randomValues: [0.99, 0]
  }));

  assert.equal(result.outcome, "notStraight");
  assert.equal(result.ballTeam, "defendingTeam");
  assert.equal(result.restart, "scrum");
  assert.equal(result.offendingTeam, "throwingTeam");
});

test("direct reception can produce a clean throwing-team win", () => {
  const target = player("target", { hands: 100 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: directOption(1),
    targetPlayer: target,
    randomValues: [0.99, 0.5, 0, 0.999, 0.99]
  }));

  assert.equal(result.outcome, "cleanWin");
  assert.equal(result.ballTeam, "throwingTeam");
  assert.equal(result.restart, "continuousPlay");
});

test("an exact same-post duel tie is a scrappy attacking win", () => {
  const target = player("target", { jump: 60, hands: 60 });
  const front = player("front", { lift: 60 });
  const rear = player("rear", { lift: 60 });
  const defender = player("defender", { jump: 60, hands: 60 });
  const defensiveFront = player("def-front", { lift: 60 });
  const defensiveRear = player("def-rear", { lift: 60 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: jumpOption(4),
    targetPlayer: target,
    attackingAssignments: { 3: front, 4: target, 5: rear },
    defendingAssignments: { 3: defensiveFront, 4: defender, 5: defensiveRear },
    defensiveJumpPosition: 4,
    randomValues: [0.99, 0.5, 0, 0.5, 0.5, 0.99]
  }));

  assert.equal(result.details.duelGap, 0);
  assert.equal(result.outcome, "scrappyWin");
  assert.equal(result.ballTeam, "throwingTeam");
});

test("a small defending advantage creates an immediate deflected turnover", () => {
  const target = player("target", { jump: 60, hands: 60 });
  const defender = player("defender", { jump: 70, hands: 70 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: jumpOption(4),
    targetPlayer: target,
    attackingAssignments: {
      3: player("front", { lift: 60 }),
      4: target,
      5: player("rear", { lift: 60 })
    },
    defendingAssignments: {
      3: player("def-front", { lift: 70 }),
      4: defender,
      5: player("def-rear", { lift: 70 })
    },
    defensiveJumpPosition: 4,
    randomValues: [0.99, 0.5, 0, 0.5, 0.5]
  }));

  assert.equal(result.details.duelGap, -10);
  assert.equal(result.outcome, "deflectedTurnover");
  assert.equal(result.ballTeam, "defendingTeam");
});

test("a dominant defender can steal cleanly after the knock-on check", () => {
  const target = player("target", { jump: 0, hands: 0 });
  const defender = player("defender", { jump: 100, hands: 100 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: jumpOption(4),
    targetPlayer: target,
    attackingAssignments: {
      3: player("front", { lift: 0 }),
      4: target,
      5: player("rear", { lift: 0 })
    },
    defendingAssignments: {
      3: player("def-front", { lift: 100 }),
      4: defender,
      5: player("def-rear", { lift: 100 })
    },
    defensiveJumpPosition: 4,
    randomValues: [0.99, 0.5, 0, 0.5, 0.5, 0.99]
  }));

  assert.equal(result.outcome, "cleanSteal");
  assert.equal(result.ballTeam, "defendingTeam");
  assert.equal(result.restart, "continuousPlay");
});

test("a direct-catch knock-on gives the defending team a scrum", () => {
  const target = player("target", { hands: 100 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: directOption(1),
    targetPlayer: target,
    randomValues: [0.99, 0.5, 0, 0.999, 0]
  }));

  assert.equal(result.outcome, "knockOn");
  assert.equal(result.ballTeam, "defendingTeam");
  assert.equal(result.restart, "scrum");
  assert.equal(result.offendingTeam, "throwingTeam");
});

test("a missed direct catch becomes a reproducible loose ball", () => {
  const target = player("target", { hands: 0 });
  const result = resolveLineoutV2(resolutionInput({
    targetOption: directOption(1),
    targetPlayer: target,
    randomValues: [0.99, 0.5, 0, 0, 0.49]
  }));

  assert.equal(result.outcome, "looseBall");
  assert.equal(result.ballTeam, "throwingTeam");
  assert.equal(result.restart, "continuousPlay");
});

test("a missed high block starts the recovery cascade three positions behind", () => {
  const target = player("target", { jump: 0, hands: 0 });
  const recoveringDefender = player("recovering-defender", { hands: 100 });
  const result = resolveLineoutV2(resolutionInput({
    throwing: 50,
    targetOption: {
      ...jumpOption(1),
      roles: { jumperPosition: 1 }
    },
    targetPlayer: target,
    attackingAssignments: { 1: target },
    defendingAssignments: { 4: recoveringDefender },
    randomValues: [0.99, 0.5, 0.9, 0.999, 0.99]
  }));

  assert.equal(result.details.trajectory, "high");
  assert.equal(result.details.cascadeRecoveryPosition, 4);
  assert.equal(result.outcome, "cleanSteal");
  assert.equal(result.ballTeam, "defendingTeam");
});

test("an inconsistent target id is rejected before consuming randomness", () => {
  const target = player("target");
  const input = resolutionInput({
    targetOption: directOption(1),
    targetPlayer: target,
    randomValues: []
  });
  input.targetPlayerId = "missing";

  assert.throws(() => resolveLineoutV2(input), /missing/);
});
