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
  resolveGroundRecovery,
  resolveLooseBall,
  resolveRecoverySequence,
  resolveSoloReception,
  testKnockOn,
  type RecoveryAttempt,
  type RecoverySequenceResult,
  type SoloReceptionResult
} from "./LineoutReceptionResolver.ts";
import { resolveLineoutThrow, type LineoutThrowResult } from "./LineoutThrowResolver.ts";

const JUMPING = LINEOUT_BALANCE.jumping;
const RECOVERY = LINEOUT_BALANCE.directCatch.secondaryRecovery;

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
    ? input.targetOption.roles.directCatcherPosition
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
  const directCatcherPosition = context.input.targetOption.roles.directCatcherPosition
    ?? context.input.targetOption.targetPosition;
  const trajectory = context.throwResult.trajectory.trajectory;
  context.details.directCatcherPosition = directCatcherPosition;
  context.details.receiverId = receiver.id;

  if (trajectory === "high") {
    return resolveHighRecoveryPath(context, directCatcherPosition);
  }

  if (trajectory === "low") {
    const frontRecovery = attemptSecondaryRecovery(
      context,
      lowFrontAttempts(directCatcherPosition, true)
    );
    if (frontRecovery) return frontRecovery;
    context.details.recoveryKind = "target";
  }

  const placements = getRecoveryPlacements(
    directCatcherPosition,
    context.input.defendingAssignments
  );
  const reception = resolveSoloReception(receiver, placements, context.input.rng);
  addSoloReceptionDetails(context.details, reception, "targetReception");
  context.details.receiverPlacements = placements.join(",");

  const directResult = resolveSuccessfulOffensiveReception(context, reception);
  if (directResult) return directResult;

  if (trajectory === "precise") {
    return resolvePreciseRecoveryPath(context, directCatcherPosition);
  }

  return resolveGroundBall(context, directCatcherPosition, false);
}

function resolveJumpBlock(
  context: ResolutionContext,
  attackingJumper: FieldPlayer,
  trajectory: ReachableThrowTrajectory
): LineoutResolution {
  const attackingJump = calculateAttackingJump(context.input, attackingJumper);
  addJumpDetails(context.details, attackingJump, "attackJump");
  const attackingJumpSucceeded = attackingJump.possible
    && attackingJump.quality >= JUMPING.successThreshold;
  context.details.attackJumpSucceeded = attackingJumpSucceeded;

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

  if (trajectory === "low") {
    const frontRecovery = attemptSecondaryRecovery(
      context,
      lowFrontAttempts(
        context.input.targetOption.targetPosition,
        attackingJumpSucceeded
      )
    );
    if (frontRecovery) return frontRecovery;
    context.details.recoveryKind = "target";
  }

  if (
    attackingJumpSucceeded
    && blockReception.score >= JUMPING.blockReceptionSuccessThreshold
  ) {
    const clean = isCleanReception(blockReception.score);
    return offensiveWin(
      context,
      clean,
      clean ? "lineout.reason.blockReceptionClean" : "lineout.reason.blockReceptionScrappy"
    );
  }

  if (trajectory === "precise") {
    return resolvePreciseRecoveryPath(context, context.input.targetOption.targetPosition);
  }

  if (trajectory === "high") {
    return resolveHighRecoveryPath(context, context.input.targetOption.targetPosition);
  }

  if (!attackingJumpSucceeded) {
    const placements = getRecoveryPlacements(
      context.input.targetOption.targetPosition,
      context.input.defendingAssignments
    );
    const individualRecovery = resolveSoloReception(
      attackingJumper,
      placements,
      context.input.rng
    );
    addSoloReceptionDetails(context.details, individualRecovery, "failedJumpRecovery");
    const recovered = resolveSuccessfulOffensiveReception(context, individualRecovery);
    if (recovered) return recovered;
  }

  return resolveGroundBall(
    context,
    context.input.targetOption.targetPosition,
    !attackingJumpSucceeded
  );
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

function resolveSuccessfulOffensiveReception(
  context: ResolutionContext,
  reception: SoloReceptionResult
): LineoutResolution | null {
  if (reception.outcome === "knockOn") {
    return knockOnResolution(context, "throwingTeam", "lineout.reason.attackingKnockOn");
  }
  if (reception.outcome === "missed") {
    return null;
  }
  const clean = isCleanReception(reception.score);
  return offensiveWin(
    context,
    clean,
    clean ? "lineout.reason.directReceptionClean" : "lineout.reason.directReceptionScrappy"
  );
}

function resolvePreciseRecoveryPath(
  context: ResolutionContext,
  targetPosition: LineoutPosition
): LineoutResolution {
  const recovery = attemptSecondaryRecovery(context, behindAttempts(targetPosition, false));
  if (recovery) return recovery;

  const finalRawPosition = targetPosition + RECOVERY.secondBehindOffset;
  if (finalRawPosition > LINEOUT_BALANCE.positions.maximum) {
    return resolveBallBeyondFifteenMetres(context);
  }

  return resolveGroundBall(context, finalRawPosition as LineoutPosition, false);
}

function resolveHighRecoveryPath(
  context: ResolutionContext,
  targetPosition: LineoutPosition
): LineoutResolution {
  const recovery = attemptSecondaryRecovery(context, behindAttempts(targetPosition, true));
  return recovery ?? resolveBallBeyondFifteenMetres(context);
}

function attemptSecondaryRecovery(
  context: ResolutionContext,
  attempts: readonly RecoveryAttempt[]
): LineoutResolution | null {
  const cascade = resolveRecoverySequence(
    attempts,
    availableSecondaryAssignments(context, "throwingTeam"),
    availableSecondaryAssignments(context, "defendingTeam"),
    context.input.rng
  );
  addRecoverySequenceDetails(context.details, cascade);
  context.details.recoveryKind = "secondary";

  if (cascade.outcome === "missed") {
    return null;
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
      clean
        ? "lineout.reason.secondaryRecoveredClean"
        : "lineout.reason.secondaryRecoveredScrappy"
    );
  }
  return defensiveTurnover(
    context,
    clean,
    clean
      ? "lineout.reason.secondaryStolenClean"
      : "lineout.reason.secondaryStolenScrappy"
  );
}

function getCascadeWinningScore(cascade: RecoverySequenceResult): number {
  const reception = cascade.reception;
  if (!reception) return JUMPING.blockReceptionSuccessThreshold;
  if ("score" in reception) return reception.score;
  return cascade.ballTeam === "throwingTeam"
    ? reception.throwingScore ?? JUMPING.blockReceptionSuccessThreshold
    : reception.defendingScore ?? JUMPING.blockReceptionSuccessThreshold;
}

function resolveGroundBall(
  context: ResolutionContext,
  groundPosition: LineoutPosition,
  useEqualTeamProbability: boolean
): LineoutResolution {
  const ground = resolveGroundRecovery(
    groundPosition,
    availableSecondaryAssignments(context, "throwingTeam"),
    availableSecondaryAssignments(context, "defendingTeam"),
    context.input.rng,
    useEqualTeamProbability
  );
  context.details.recoveryKind = "ground";
  context.details.groundPosition = groundPosition;
  context.details.groundEqualTeamProbability = useEqualTeamProbability;
  context.details.cascadeBallTeam = ground.ballTeam;
  if (ground.recoveryPosition) {
    context.details.cascadeRecoveryPosition = ground.recoveryPosition;
  }
  if (ground.recoveryPlayerId) {
    context.details.cascadeRecoveryPlayerId = ground.recoveryPlayerId;
  }
  if (ground.throwingCandidatePosition) {
    context.details.groundThrowingCandidatePosition = ground.throwingCandidatePosition;
  }
  if (ground.throwingCandidatePlayerId) {
    context.details.groundThrowingCandidatePlayerId = ground.throwingCandidatePlayerId;
  }
  if (ground.throwingScore !== null) {
    context.details.groundThrowingScore = ground.throwingScore;
  }
  if (ground.defendingCandidatePosition) {
    context.details.groundDefendingCandidatePosition = ground.defendingCandidatePosition;
  }
  if (ground.defendingCandidatePlayerId) {
    context.details.groundDefendingCandidatePlayerId = ground.defendingCandidatePlayerId;
  }
  if (ground.defendingScore !== null) {
    context.details.groundDefendingScore = ground.defendingScore;
  }

  return ground.ballTeam === "throwingTeam"
    ? offensiveWin(context, false, "lineout.reason.groundRecoveredByThrowingTeam")
    : defensiveTurnover(context, false, "lineout.reason.groundRecoveredByDefendingTeam");
}

function resolveBallBeyondFifteenMetres(context: ResolutionContext): LineoutResolution {
  context.details.recoveryKind = "out15m";
  context.details.ballExitedFifteenMetres = true;
  return createResolution(
    "looseBall",
    resolveLooseBall(context.input.rng),
    "continuousPlay",
    "lineout.reason.highBallLoose",
    context.details
  );
}

function lowFrontAttempts(
  targetPosition: LineoutPosition,
  penalizeTwoPositionsAhead: boolean
): RecoveryAttempt[] {
  const attempts: RecoveryAttempt[] = [];
  const twoAhead = targetPosition - 2;
  const oneAhead = targetPosition - 1;
  if (twoAhead >= LINEOUT_BALANCE.positions.minimum) {
    attempts.push({
      position: twoAhead as LineoutPosition,
      scoreModifier: penalizeTwoPositionsAhead
        ? RECOVERY.lowTwoAheadModifier
        : 0
    });
  }
  if (oneAhead >= LINEOUT_BALANCE.positions.minimum) {
    attempts.push({ position: oneAhead as LineoutPosition });
  }
  return attempts;
}

function behindAttempts(
  targetPosition: LineoutPosition,
  continueToEndOfLineout: boolean
): RecoveryAttempt[] {
  const lastRawPosition = continueToEndOfLineout
    ? LINEOUT_BALANCE.positions.maximum
    : targetPosition + RECOVERY.secondBehindOffset;
  const attempts: RecoveryAttempt[] = [];
  for (
    let rawPosition = targetPosition + RECOVERY.firstBehindOffset;
    rawPosition <= Math.min(lastRawPosition, LINEOUT_BALANCE.positions.maximum);
    rawPosition += 1
  ) {
    attempts.push({ position: rawPosition as LineoutPosition });
  }
  return attempts;
}

function availableSecondaryAssignments(
  context: ResolutionContext,
  team: LineoutResolutionTeam
): LineoutAssignments {
  const source = team === "throwingTeam"
    ? context.input.attackingAssignments
    : context.input.defendingAssignments;
  const excluded = new Set<LineoutPosition>();

  if (team === "throwingTeam") {
    const { frontLifterPosition, rearLifterPosition } = context.input.targetOption.roles;
    if (frontLifterPosition) excluded.add(frontLifterPosition);
    if (rearLifterPosition) excluded.add(rearLifterPosition);
  } else if (context.input.defensiveJumpPosition) {
    const front = adjacentPosition(context.input.defensiveJumpPosition, -1);
    const rear = adjacentPosition(context.input.defensiveJumpPosition, 1);
    if (front) excluded.add(front);
    if (rear) excluded.add(rear);
  }

  const available: LineoutAssignments = {};
  for (
    let rawPosition = LINEOUT_BALANCE.positions.minimum;
    rawPosition <= LINEOUT_BALANCE.positions.maximum;
    rawPosition += 1
  ) {
    const position = rawPosition as LineoutPosition;
    if (!excluded.has(position) && source[position]) {
      available[position] = source[position];
    }
  }
  return available;
}

function addRecoverySequenceDetails(
  details: ResolutionDetails,
  cascade: RecoverySequenceResult
): void {
  details.cascadeOutcome = cascade.outcome;
  details.cascadeVisitedPositions = cascade.visitedPositions.join(",");
  details.cascadeThrowingAttemptPositions = cascade.throwingAttemptPositions.join(",");
  details.cascadeDefendingAttemptPositions = cascade.defendingAttemptPositions.join(",");
  if (cascade.ballTeam) details.cascadeBallTeam = cascade.ballTeam;
  if (cascade.recoveryPosition) {
    details.cascadeRecoveryPosition = cascade.recoveryPosition;
  }
  if (cascade.recoveryPlayerId) {
    details.cascadeRecoveryPlayerId = cascade.recoveryPlayerId;
  }
  if (cascade.reception) {
    details.cascadeReceptionType = "score" in cascade.reception ? "solo" : "duel";
  }
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
  details[`${prefix}SituationalModifier`] = reception.situationalModifier;
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
