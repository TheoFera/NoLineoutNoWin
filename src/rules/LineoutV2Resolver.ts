import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { LineoutPosition } from "../models/Combination.ts";
import type {
  LineoutAssignments,
  LineoutResolution,
  LineoutResolutionInput,
  LineoutResolutionTeam
} from "../models/Lineout.ts";
import type { FieldPlayer } from "../models/Player.ts";
import {
  resolveAheadCounter,
  resolveSamePositionDuel,
  type AheadCounterResult,
  type SamePositionDuelResult
} from "./LineoutCounterResolver.ts";
import {
  calculateBlockReceptionScore,
  calculateJumpQuality,
  type BlockReceptionResult,
  type JumpQualityResult,
  type ReachableThrowTrajectory
} from "./LineoutJumpResolver.ts";
import {
  getRecoveryPlacements,
  resolveHighBallCascade,
  resolveLooseBall,
  resolveSoloReception,
  testKnockOn,
  type HighBallCascadeResult,
  type SoloReceptionResult
} from "./LineoutReceptionResolver.ts";
import { resolveLineoutThrow, type LineoutThrowResult } from "./LineoutThrowResolver.ts";

const JUMPING = LINEOUT_BALANCE.jumping;

type ResolutionDetails = LineoutResolution["details"];

type ResolutionContext = {
  input: LineoutResolutionInput;
  throwResult: LineoutThrowResult;
  details: ResolutionDetails;
};

export function resolveLineoutV2(input: LineoutResolutionInput): LineoutResolution {
  const targetPlayer = getTargetPlayer(input);
  const throwResult = resolveLineoutThrow({
    throwing: input.throwingHooker.throwing,
    targetPosition: input.targetOption.targetPosition,
    fatiguePercent: input.fatigueByPlayerId[input.throwingHooker.id] ?? 0,
    rng: input.rng
  });
  const details = createThrowDetails(input, throwResult);
  const context = { input, throwResult, details };

  if (throwResult.trajectory.trajectory === "notStraight") {
    return createResolution(
      "notStraight",
      "defendingTeam",
      "scrum",
      "lineout.reason.notStraight",
      details,
      "throwingTeam"
    );
  }

  if (input.targetOption.type === "directCatch") {
    return resolveDirectCatch(context, targetPlayer);
  }

  return resolveJumpBlock(context, targetPlayer, throwResult.trajectory.trajectory);
}

function getTargetPlayer(input: LineoutResolutionInput): FieldPlayer {
  const rolePosition = input.targetOption.type === "directCatch"
    ? input.targetOption.roles.receiverPosition
    : input.targetOption.roles.jumperPosition;
  const targetPosition = rolePosition ?? input.targetOption.targetPosition;
  const targetPlayer = input.attackingAssignments[targetPosition];

  if (!targetPlayer || targetPlayer.id !== input.targetPlayerId) {
    throw new Error(
      `Target player ${input.targetPlayerId} is not assigned to position ${targetPosition}`
    );
  }

  return targetPlayer;
}

function resolveDirectCatch(
  context: ResolutionContext,
  receiver: FieldPlayer
): LineoutResolution {
  const receiverPosition = context.input.targetOption.roles.receiverPosition
    ?? context.input.targetOption.targetPosition;
  const placements = getRecoveryPlacements(
    receiverPosition,
    context.input.defendingAssignments
  );
  const reception = resolveSoloReception(receiver, placements, context.input.rng);
  addSoloReceptionDetails(context.details, reception, "targetReception");
  context.details.receiverPosition = receiverPosition;
  context.details.receiverId = receiver.id;
  context.details.receiverPlacements = placements.join(",");

  return resolveOffensiveReception(context, reception);
}

function resolveJumpBlock(
  context: ResolutionContext,
  attackingJumper: FieldPlayer,
  trajectory: ReachableThrowTrajectory
): LineoutResolution {
  const attackingJump = calculateAttackingJump(context.input, attackingJumper);
  addJumpDetails(context.details, attackingJump, "attackJump");

  const defensivePosition = context.input.defensiveJumpPosition;
  const defendingJumper = defensivePosition
    ? context.input.defendingAssignments[defensivePosition]
    : undefined;
  const defensiveJump = defendingJumper && defensivePosition
    ? calculateDefensiveJump(context.input, defendingJumper, defensivePosition)
    : undefined;

  if (defensivePosition) context.details.defensiveJumpPosition = defensivePosition;
  if (defendingJumper) context.details.defendingJumperId = defendingJumper.id;
  if (defensiveJump) addJumpDetails(context.details, defensiveJump, "defenseJump");

  if (defendingJumper && defensiveJump && defensivePosition) {
    const relativeOffset = context.input.targetOption.targetPosition - defensivePosition;
    context.details.defensiveRelativeOffset = relativeOffset;

    if (relativeOffset === 0) {
      return resolveSamePostContest(
        context,
        attackingJumper,
        attackingJump,
        defendingJumper,
        defensiveJump,
        trajectory
      );
    }

    const counter = resolveAheadCounter({
      targetPosition: context.input.targetOption.targetPosition,
      defensivePosition,
      throwQuality: context.throwResult.throwing.quality,
      defendingJumpQuality: defensiveJump.quality,
      defendingHands: defendingJumper.hands,
      trajectory
    });
    addAheadCounterDetails(context.details, counter);

    if (counter.outcome === "defenseDeflected") {
      return defensiveTurnover(context, false, "lineout.reason.counterDeflected");
    }
    if (counter.outcome === "defenseCleanSteal") {
      return resolveCleanDefensiveCatch(
        context,
        defendingJumper,
        "lineout.reason.counterCleanSteal"
      );
    }
  }

  const blockReception = calculateBlockReceptionScore(
    attackingJump.quality,
    trajectory,
    attackingJumper.hands
  );
  addBlockReceptionDetails(context.details, blockReception);

  if (attackingJump.possible && blockReception.score >= JUMPING.blockReceptionSuccessThreshold) {
    const clean = isCleanReception(blockReception.score);
    return offensiveWin(
      context,
      clean,
      clean ? "lineout.reason.blockReceptionClean" : "lineout.reason.blockReceptionScrappy"
    );
  }

  if (trajectory === "high") {
    const cascade = resolveHighBallCascade(
      context.input.targetOption.targetPosition,
      context.input.attackingAssignments,
      context.input.defendingAssignments,
      context.input.rng
    );
    return resolveCascade(context, cascade);
  }

  return looseBall(context, "lineout.reason.blockReceptionMissed");
}

function calculateAttackingJump(
  input: LineoutResolutionInput,
  jumper: FieldPlayer
): JumpQualityResult {
  return calculateJumpQuality({
    jumper,
    rearLifter: playerAt(input.attackingAssignments, input.targetOption.roles.rearLifterPosition),
    frontLifter: playerAt(input.attackingAssignments, input.targetOption.roles.frontLifterPosition),
    fatigueByPlayerId: input.fatigueByPlayerId,
    rng: input.rng
  });
}

function calculateDefensiveJump(
  input: LineoutResolutionInput,
  jumper: FieldPlayer,
  position: LineoutPosition
): JumpQualityResult {
  return calculateJumpQuality({
    jumper,
    frontLifter: playerAt(input.defendingAssignments, adjacentPosition(position, -1)),
    rearLifter: playerAt(input.defendingAssignments, adjacentPosition(position, 1)),
    fatigueByPlayerId: input.fatigueByPlayerId,
    rng: input.rng
  });
}

function resolveSamePostContest(
  context: ResolutionContext,
  attackingJumper: FieldPlayer,
  attackingJump: JumpQualityResult,
  defendingJumper: FieldPlayer,
  defensiveJump: JumpQualityResult,
  trajectory: ReachableThrowTrajectory
): LineoutResolution {
  const duel = resolveSamePositionDuel({
    attackingJumpQuality: attackingJump.quality,
    attackingHands: attackingJumper.hands,
    defendingJumpQuality: defensiveJump.quality,
    defendingHands: defendingJumper.hands,
    trajectory
  });
  addDuelDetails(context.details, duel);

  if (duel.outcome === "defenseDeflected") {
    return defensiveTurnover(context, false, "lineout.reason.duelDeflected");
  }
  if (duel.outcome === "defenseCleanSteal") {
    return resolveCleanDefensiveCatch(context, defendingJumper, "lineout.reason.duelCleanSteal");
  }

  const knockOn = testKnockOn(attackingJumper.hands, [], context.input.rng);
  addKnockOnDetails(context.details, knockOn, "attackKnockOn");
  if (knockOn.knockOn) {
    return knockOnResolution(context, "throwingTeam", "lineout.reason.attackingKnockOn");
  }

  return offensiveWin(
    context,
    duel.outcome === "attackClean",
    duel.outcome === "attackClean"
      ? "lineout.reason.duelWonClean"
      : "lineout.reason.duelWonScrappy"
  );
}

function resolveCleanDefensiveCatch(
  context: ResolutionContext,
  defender: FieldPlayer,
  reason: string
): LineoutResolution {
  const knockOn = testKnockOn(defender.hands, [], context.input.rng);
  addKnockOnDetails(context.details, knockOn, "defenseKnockOn");
  if (knockOn.knockOn) {
    return knockOnResolution(context, "defendingTeam", "lineout.reason.defendingKnockOn");
  }
  return defensiveTurnover(context, true, reason);
}

function resolveOffensiveReception(
  context: ResolutionContext,
  reception: SoloReceptionResult
): LineoutResolution {
  if (reception.outcome === "knockOn") {
    return knockOnResolution(context, "throwingTeam", "lineout.reason.attackingKnockOn");
  }
  if (reception.outcome === "missed") {
    return looseBall(context, "lineout.reason.directReceptionMissed");
  }
  const clean = isCleanReception(reception.score);
  return offensiveWin(
    context,
    clean,
    clean ? "lineout.reason.directReceptionClean" : "lineout.reason.directReceptionScrappy"
  );
}

function resolveCascade(
  context: ResolutionContext,
  cascade: HighBallCascadeResult
): LineoutResolution {
  context.details.cascadeOutcome = cascade.outcome;
  context.details.cascadeBallTeam = cascade.ballTeam;
  context.details.cascadeVisitedPositions = cascade.visitedPositions.join(",");
  if (cascade.recoveryPosition) context.details.cascadeRecoveryPosition = cascade.recoveryPosition;
  if (cascade.recoveryPlayerId) context.details.cascadeRecoveryPlayerId = cascade.recoveryPlayerId;

  if (cascade.outcome === "looseBall") {
    return createResolution(
      "looseBall",
      cascade.ballTeam,
      "continuousPlay",
      "lineout.reason.highBallLoose",
      context.details
    );
  }
  if (cascade.outcome === "knockOn") {
    return knockOnResolution(
      context,
      cascade.knockOnBy as LineoutResolutionTeam,
      cascade.knockOnBy === "throwingTeam"
        ? "lineout.reason.attackingKnockOn"
        : "lineout.reason.defendingKnockOn"
    );
  }

  const score = getCascadeWinningScore(cascade);
  context.details.cascadeReceptionScore = score;
  const clean = isCleanReception(score);
  if (cascade.ballTeam === "throwingTeam") {
    return offensiveWin(
      context,
      clean,
      clean ? "lineout.reason.highBallRecoveredClean" : "lineout.reason.highBallRecoveredScrappy"
    );
  }
  return defensiveTurnover(
    context,
    clean,
    clean ? "lineout.reason.highBallStolenClean" : "lineout.reason.highBallStolenScrappy"
  );
}

function getCascadeWinningScore(cascade: HighBallCascadeResult): number {
  const reception = cascade.reception;
  if (!reception) return JUMPING.blockReceptionSuccessThreshold;
  if ("score" in reception) return reception.score;
  return cascade.ballTeam === "throwingTeam"
    ? reception.throwingScore ?? JUMPING.blockReceptionSuccessThreshold
    : reception.defendingScore ?? JUMPING.blockReceptionSuccessThreshold;
}

function isCleanReception(score: number): boolean {
  return score - JUMPING.blockReceptionSuccessThreshold
    > JUMPING.blockReceptionCleanMarginExclusive;
}

function offensiveWin(
  context: ResolutionContext,
  clean: boolean,
  reason: string
): LineoutResolution {
  return createResolution(
    clean ? "cleanWin" : "scrappyWin",
    "throwingTeam",
    "continuousPlay",
    reason,
    context.details
  );
}

function defensiveTurnover(
  context: ResolutionContext,
  clean: boolean,
  reason: string
): LineoutResolution {
  return createResolution(
    clean ? "cleanSteal" : "deflectedTurnover",
    "defendingTeam",
    "continuousPlay",
    reason,
    context.details
  );
}

function knockOnResolution(
  context: ResolutionContext,
  offendingTeam: LineoutResolutionTeam,
  reason: string
): LineoutResolution {
  return createResolution(
    "knockOn",
    oppositeTeam(offendingTeam),
    "scrum",
    reason,
    context.details,
    offendingTeam
  );
}

function looseBall(context: ResolutionContext, reason: string): LineoutResolution {
  return createResolution(
    "looseBall",
    resolveLooseBall(context.input.rng),
    "continuousPlay",
    reason,
    context.details
  );
}

function createResolution(
  outcome: LineoutResolution["outcome"],
  ballTeam: LineoutResolutionTeam,
  restart: LineoutResolution["restart"],
  primaryReason: string,
  details: ResolutionDetails,
  offendingTeam?: LineoutResolutionTeam
): LineoutResolution {
  return {
    outcome,
    ballTeam,
    restart,
    ...(offendingTeam ? { offendingTeam } : {}),
    primaryReason,
    details
  };
}

function createThrowDetails(
  input: LineoutResolutionInput,
  result: LineoutThrowResult
): ResolutionDetails {
  return {
    targetOptionId: input.targetOption.id,
    targetOptionType: input.targetOption.type,
    targetPosition: input.targetOption.targetPosition,
    targetPlayerId: input.targetPlayerId,
    minute: input.minute,
    throwQuality: result.throwing.quality,
    throwBaseQuality: result.throwing.baseQuality,
    throwFatiguePercent: result.throwing.fatiguePercent,
    throwDistanceIndex: result.throwing.distanceIndex,
    throwDistanceCoefficient: result.throwing.distanceCoefficient,
    throwRandomAmplitude: result.throwing.randomAmplitude,
    throwExceptionalError: result.throwing.exceptionalError,
    throwExceptionalErrorProbability: result.throwing.exceptionalErrorProbability,
    trajectory: result.trajectory.trajectory,
    trajectoryPreciseProbability: result.trajectory.probabilities.precise,
    trajectoryLowProbability: result.trajectory.probabilities.low,
    trajectoryHighProbability: result.trajectory.probabilities.high
  };
}

function addJumpDetails(
  details: ResolutionDetails,
  jump: JumpQualityResult,
  prefix: string
): void {
  details[`${prefix}Possible`] = jump.possible;
  details[`${prefix}Quality`] = jump.quality;
  details[`${prefix}BaseQuality`] = jump.baseQuality;
  details[`${prefix}Structure`] = jump.structure;
  details[`${prefix}StructureModifier`] = jump.structureModifier;
  details[`${prefix}RandomAmplitude`] = jump.randomAmplitude;
}

function addDuelDetails(details: ResolutionDetails, duel: SamePositionDuelResult): void {
  details.duelOutcome = duel.outcome;
  details.duelAttackScore = duel.attackScore;
  details.duelDefenseScore = duel.defenseScore;
  details.duelGap = duel.gap;
}

function addAheadCounterDetails(details: ResolutionDetails, counter: AheadCounterResult): void {
  details.counterOutcome = counter.outcome;
  details.counterRelativeOffset = counter.relativeOffset;
  if (counter.counterScore !== null) details.counterScore = counter.counterScore;
  if (counter.difficulty !== null) details.counterDifficulty = counter.difficulty;
  if (counter.interceptionMargin !== null) {
    details.counterInterceptionMargin = counter.interceptionMargin;
  }
  details.counterHandsCorrection = counter.handsCorrection;
  if (counter.controlMargin !== null) details.counterControlMargin = counter.controlMargin;
}

function addBlockReceptionDetails(
  details: ResolutionDetails,
  reception: BlockReceptionResult
): void {
  details.blockReceptionScore = reception.score;
  details.blockReceptionTrajectoryModifier = reception.trajectoryModifier;
  details.blockReceptionHandsCorrection = reception.handsCorrection;
}

function addSoloReceptionDetails(
  details: ResolutionDetails,
  reception: SoloReceptionResult,
  prefix: string
): void {
  details[`${prefix}Outcome`] = reception.outcome;
  details[`${prefix}Score`] = reception.score;
  details[`${prefix}Hands`] = reception.hands;
  details[`${prefix}RandomScore`] = reception.randomScore;
  details[`${prefix}PlacementModifier`] = reception.placementModifier;
  if (reception.knockOnRisk) {
    addKnockOnDetails(details, reception.knockOnRisk, `${prefix}KnockOn`);
  }
}

function addKnockOnDetails(
  details: ResolutionDetails,
  knockOn: { baseProbability: number; finalProbability: number; roll: number; knockOn: boolean },
  prefix: string
): void {
  details[`${prefix}BaseProbability`] = knockOn.baseProbability;
  details[`${prefix}FinalProbability`] = knockOn.finalProbability;
  details[`${prefix}Roll`] = knockOn.roll;
  details[`${prefix}Result`] = knockOn.knockOn;
}

function playerAt(
  assignments: LineoutAssignments,
  position?: LineoutPosition
): FieldPlayer | undefined {
  return position ? assignments[position] : undefined;
}

function adjacentPosition(
  position: LineoutPosition,
  offset: -1 | 1
): LineoutPosition | undefined {
  const adjacent = position + offset;
  return adjacent >= 1 && adjacent <= 7 ? adjacent as LineoutPosition : undefined;
}

function oppositeTeam(team: LineoutResolutionTeam): LineoutResolutionTeam {
  return team === "throwingTeam" ? "defendingTeam" : "throwingTeam";
}
