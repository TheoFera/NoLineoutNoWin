import type {
  LineoutAssignments,
  LineoutResolution,
  LineoutResolutionInput,
  LineoutResult,
  LineoutSetup
} from "../models/Lineout.ts";
import type { CombinationTargetOption, LineoutPosition } from "../models/Combination.ts";
import type { FieldPlayer } from "../models/Player.ts";
import { MATH_RANDOM_SOURCE, type RandomSource } from "../utils/Random.ts";
import { calculateCurrentFatiguePercent } from "./LineoutThrowResolver.ts";
import { resolveLineoutV2 } from "./LineoutV2Resolver.ts";

export function resolveLineoutForThrowingTeam(
  setup: LineoutSetup,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): LineoutResult {
  const input = buildResolutionInputFromSetup(setup, randomSource);
  if (!input) {
    return invalidSetupResult();
  }

  const resolution = resolveLineoutV2(input);
  return adaptResolutionForPerspective(resolution, "throwing", input);
}

export function resolveLineout(
  setup: LineoutSetup,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): LineoutResult {
  return resolveLineoutForThrowingTeam(setup, randomSource);
}

export function buildResolutionInputFromSetup(
  setup: LineoutSetup,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): LineoutResolutionInput | null {
  if (!setup.targetPlayerId) return null;

  const attackingAssignments = toAssignments(setup.attackingPlayers);
  const defendingAssignments = toAssignments(setup.defendingPlayers);
  const targetPosition = setup.targetPosition
    ?? findPlayerPosition(attackingAssignments, setup.targetPlayerId);
  if (!targetPosition || attackingAssignments[targetPosition]?.id !== setup.targetPlayerId) {
    return null;
  }

  const targetOption = findTargetOption(setup, attackingAssignments, targetPosition)
    ?? createImplicitJumpOption(targetPosition, attackingAssignments);
  const minute = setup.minute ?? 0;

  return {
    minute,
    throwingTeamId: setup.throwingSide === "us" ? "us" : "opponent",
    defendingTeamId: setup.throwingSide === "us" ? "opponent" : "us",
    throwingHooker: setup.hooker,
    targetPlayerId: setup.targetPlayerId,
    targetOption,
    attackingAssignments,
    defendingAssignments,
    defensiveJumpPosition: setup.defensiveJumpPosition,
    fatigueByPlayerId: buildCurrentFatigueMap(setup, minute),
    rng: randomSource
  };
}

export function adaptResolutionForPerspective(
  resolution: LineoutResolution,
  perspective: "throwing" | "defending",
  input: LineoutResolutionInput
): LineoutResult {
  const ourResolutionTeam = perspective === "throwing" ? "throwingTeam" : "defendingTeam";
  const weHaveBall = resolution.ballTeam === ourResolutionTeam;
  const weOffended = resolution.offendingTeam === ourResolutionTeam;
  const targetPlayer = input.attackingAssignments[input.targetOption.targetPosition];
  const calculationDetails = buildCalculationDetails(resolution, targetPlayer);
  const calculationScore = getNumericDetail(
    resolution,
    "blockReceptionScore",
    "targetReceptionScore",
    "duelAttackScore",
    "throwQuality"
  );

  if (resolution.outcome === "notStraight") {
    return legacyResult(
      "fault",
      "not_straight",
      perspective === "throwing"
        ? "lineout.explanation.attackNotStraight"
        : "lineout.explanation.defenseNotStraight",
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  if (resolution.outcome === "knockOn") {
    if (resolution.details.recoveryKind === "secondary") {
      const explanationKeys = [
        getRecoveryCauseKey(perspective, input, resolution),
        getSecondaryKnockOnFinalKey(resolution, weOffended)
      ];
      return legacyResult(
        weOffended ? "fault" : "won_dirty",
        "knock_on",
        explanationKeys[0],
        calculationScore,
        calculationDetails,
        resolution,
        {
          explanationKeys,
          presentationTitleKey: weOffended
            ? "lineout.presentation.title.secondaryKnockOn"
            : "lineout.presentation.title.opponentKnockOn"
        }
      );
    }
    return legacyResult(
      weOffended ? "fault" : "won_dirty",
      "knock_on",
      getKnockOnExplanationKey(perspective, weOffended, input),
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  if (resolution.outcome === "looseBall") {
    if (resolution.details.recoveryKind === "out15m") {
      const explanationKeys = [
        getRecoveryCauseKey(perspective, input, resolution),
        weHaveBall
          ? "lineout.explanation.final.userOutFifteen"
          : "lineout.explanation.final.opponentOutFifteen"
      ];
      return legacyResult(
        weHaveBall ? "won_dirty" : "lost",
        weHaveBall ? "dirty_catch" : "stolen",
        explanationKeys[0],
        calculationScore,
        calculationDetails,
        resolution,
        {
          explanationKeys,
          presentationTitleKey: resolution.details.trajectory === "high"
            ? "lineout.presentation.title.highBall"
            : "lineout.presentation.title.beyondFifteen"
        }
      );
    }
    const highBallLoose = resolution.primaryReason === "lineout.reason.highBallLoose";
    return legacyResult(
      weHaveBall ? "won_dirty" : "lost",
      weHaveBall ? "dirty_catch" : "stolen",
      highBallLoose
        ? getHighBallExplanationKey(perspective, weHaveBall)
        : getLooseBallExplanationKey(perspective, weHaveBall, input),
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  if (
    resolution.details.recoveryKind === "secondary"
    || resolution.details.recoveryKind === "ground"
  ) {
    const groundRecovery = resolution.details.recoveryKind === "ground";
    const explanationKeys = [
      getRecoveryCauseKey(perspective, input, resolution),
      groundRecovery
        ? weHaveBall
          ? "lineout.explanation.final.userGround"
          : "lineout.explanation.final.opponentGround"
        : getSecondaryRecoveryFinalKey(resolution, weHaveBall)
    ];
    return legacyResult(
      weHaveBall ? "won_dirty" : "lost",
      weHaveBall ? "dirty_catch" : "stolen",
      explanationKeys[0],
      calculationScore,
      calculationDetails,
      resolution,
      {
        explanationKeys,
        presentationTitleKey: groundRecovery
          ? weHaveBall
            ? "lineout.presentation.title.groundRecovered"
            : "lineout.presentation.title.groundLost"
          : weHaveBall
            ? "lineout.presentation.title.recovered"
            : perspective === "throwing"
              ? "lineout.presentation.title.ballLost"
              : "lineout.presentation.title.lost"
      }
    );
  }

  const targetCatchKey = getContextualTargetCatchKey(perspective, input, resolution);
  if (targetCatchKey) {
    const clean = resolution.outcome === "cleanWin" || resolution.outcome === "cleanSteal";
    return legacyResult(
      weHaveBall ? clean ? "won" : "won_dirty" : "lost",
      weHaveBall ? clean ? "clean_catch" : "dirty_catch" : "stolen",
      targetCatchKey,
      calculationScore,
      calculationDetails,
      resolution,
      {
        explanationKeys: [targetCatchKey],
        presentationTitleKey: perspective === "throwing"
          ? clean
            ? "lineout.presentation.title.won"
            : "lineout.presentation.title.wonScrappy"
          : "lineout.presentation.title.lost"
      }
    );
  }

  if (weHaveBall) {
    const clean = resolution.outcome === "cleanWin" || resolution.outcome === "cleanSteal";
    return legacyResult(
      clean ? "won" : "won_dirty",
      clean ? "clean_catch" : "dirty_catch",
      perspective === "defending"
        ? clean
          ? "lineout.explanation.defenseStolen"
          : "lineout.explanation.defenseDeflected"
        : clean
          ? "lineout.explanation.attackClean"
          : "lineout.explanation.attackScrappy",
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  return legacyResult(
    "lost",
    "stolen",
    perspective === "defending"
      ? resolution.outcome === "cleanWin"
        ? "lineout.explanation.defenseCleanLost"
        : "lineout.explanation.defenseScrappyLost"
      : resolution.outcome === "cleanSteal"
        ? "lineout.explanation.attackStolen"
        : "lineout.explanation.attackDeflected",
    calculationScore,
    calculationDetails,
    resolution
  );
}

function getHighBallExplanationKey(
  perspective: "throwing" | "defending",
  weHaveBall: boolean
): string {
  if (perspective === "defending") {
    return weHaveBall
      ? "lineout.explanation.defenseHighBallWon"
      : "lineout.explanation.defenseHighBallLost";
  }
  return weHaveBall
    ? "lineout.explanation.attackHighBallWon"
    : "lineout.explanation.attackHighBallLost";
}

function getKnockOnExplanationKey(
  perspective: "throwing" | "defending",
  weOffended: boolean,
  input: LineoutResolutionInput
): string {
  if (perspective === "defending") {
    return weOffended
      ? "lineout.explanation.defenseOurKnockOn"
      : "lineout.explanation.defenseOpponentKnockOn";
  }

  if (!weOffended) {
    return "lineout.explanation.attackOpponentKnockOn";
  }

  return input.targetOption.type === "directCatch"
    ? "lineout.explanation.attackDirectKnockOn"
    : "lineout.explanation.attackJumperKnockOn";
}

function getLooseBallExplanationKey(
  perspective: "throwing" | "defending",
  weHaveBall: boolean,
  input: LineoutResolutionInput
): string {
  const directCatch = input.targetOption.type === "directCatch";
  if (perspective === "defending") {
    if (directCatch) {
      return weHaveBall
        ? "lineout.explanation.defenseDirectLooseWon"
        : "lineout.explanation.defenseDirectLooseLost";
    }
    return weHaveBall
      ? "lineout.explanation.defenseLooseWon"
      : "lineout.explanation.defenseLooseLost";
  }

  if (directCatch) {
    return weHaveBall
      ? "lineout.explanation.attackDirectLooseWon"
      : "lineout.explanation.attackDirectLooseLost";
  }
  return weHaveBall
    ? "lineout.explanation.attackLooseWon"
    : "lineout.explanation.attackLooseLost";
}

function getRecoveryCauseKey(
  perspective: "throwing" | "defending",
  input: LineoutResolutionInput,
  resolution: LineoutResolution
): string {
  const perspectiveKey = perspective === "throwing" ? "attack" : "defense";
  const trajectory = getResolvedTrajectory(resolution);
  if (input.targetOption.type === "directCatch") {
    return `lineout.explanation.cause.${perspectiveKey}.direct.${trajectory}`;
  }
  const jumpKey = resolution.details.attackJumpSucceeded === true ? "success" : "failed";
  return `lineout.explanation.cause.${perspectiveKey}.jump.${trajectory}.${jumpKey}`;
}

function getSecondaryRecoveryFinalKey(
  resolution: LineoutResolution,
  weHaveBall: boolean
): string {
  const positionKey = isRecoveryInFrontOfTarget(resolution) ? "Front" : "Behind";
  const receptionKey = resolution.details.cascadeReceptionType === "duel" ? "Duel" : "Solo";
  return `lineout.explanation.final.${weHaveBall ? "user" : "opponent"}${positionKey}${receptionKey}`;
}

function getSecondaryKnockOnFinalKey(
  resolution: LineoutResolution,
  weOffended: boolean
): string {
  const positionKey = isRecoveryInFrontOfTarget(resolution) ? "Front" : "Behind";
  const receptionKey = resolution.details.cascadeReceptionType === "duel" ? "Duel" : "Solo";
  return `lineout.explanation.final.${weOffended ? "user" : "opponent"}${positionKey}${receptionKey}KnockOn`;
}

function getContextualTargetCatchKey(
  perspective: "throwing" | "defending",
  input: LineoutResolutionInput,
  resolution: LineoutResolution
): string | null {
  const targetCatchReasons = new Set([
    "lineout.reason.blockReceptionClean",
    "lineout.reason.blockReceptionScrappy",
    "lineout.reason.directReceptionClean",
    "lineout.reason.directReceptionScrappy"
  ]);
  if (
    !targetCatchReasons.has(resolution.primaryReason)
    && resolution.details.recoveryKind !== "target"
  ) {
    return null;
  }

  const perspectiveKey = perspective === "throwing" ? "attack" : "defense";
  const trajectory = getResolvedTrajectory(resolution);
  if (input.targetOption.type === "directCatch") {
    return `lineout.explanation.target.${perspectiveKey}.direct.${trajectory}`;
  }
  if (trajectory === "low" && resolution.details.attackJumpSucceeded === false) {
    return `lineout.explanation.target.${perspectiveKey}.jump.low.failed`;
  }
  return `lineout.explanation.target.${perspectiveKey}.jump.${trajectory}.success`;
}

function isRecoveryInFrontOfTarget(resolution: LineoutResolution): boolean {
  const recoveryPosition = resolution.details.cascadeRecoveryPosition;
  const targetPosition = resolution.details.targetPosition;
  return typeof recoveryPosition === "number"
    && typeof targetPosition === "number"
    && recoveryPosition < targetPosition;
}

function getResolvedTrajectory(resolution: LineoutResolution): "precise" | "low" | "high" {
  const trajectory = resolution.details.trajectory;
  return trajectory === "low" || trajectory === "high" ? trajectory : "precise";
}

function toAssignments(players: Array<FieldPlayer | null>): LineoutAssignments {
  const assignments: LineoutAssignments = {};
  players.slice(0, 7).forEach((player, index) => {
    if (player) assignments[(index + 1) as LineoutPosition] = player;
  });
  return assignments;
}

function findPlayerPosition(
  assignments: LineoutAssignments,
  playerId: string
): LineoutPosition | undefined {
  for (let position = 1; position <= 7; position += 1) {
    if (assignments[position as LineoutPosition]?.id === playerId) {
      return position as LineoutPosition;
    }
  }
  return undefined;
}

function findTargetOption(
  setup: LineoutSetup,
  assignments: LineoutAssignments,
  selectedPosition: LineoutPosition
): CombinationTargetOption | undefined {
  return setup.combination?.targetOptions?.find((option) => {
    const rolePosition = option.type === "directCatch"
      ? option.roles.directCatcherPosition
      : option.roles.jumperPosition;
    const effectivePosition = rolePosition ?? option.targetPosition;
    return option.targetPosition === selectedPosition
      && assignments[effectivePosition]?.id === setup.targetPlayerId;
  });
}

function createImplicitJumpOption(
  targetPosition: LineoutPosition,
  assignments: LineoutAssignments
): CombinationTargetOption {
  const frontPosition = adjacentPosition(targetPosition, -1);
  const rearPosition = adjacentPosition(targetPosition, 1);
  return {
    id: `legacy-jump-${targetPosition}`,
    targetPosition,
    type: "jumpBlock",
    roles: {
      jumperPosition: targetPosition,
      ...(frontPosition && assignments[frontPosition]
        ? { frontLifterPosition: frontPosition }
        : {}),
      ...(rearPosition && assignments[rearPosition]
        ? { rearLifterPosition: rearPosition }
        : {})
    },
    defaultNaturalWeight: 1
  };
}

function buildCurrentFatigueMap(
  setup: LineoutSetup,
  minute: number
): Record<string, number> {
  const currentFatigue = { ...(setup.fatigueByPlayerId ?? {}) };
  for (const [playerId, maximumFatigue] of Object.entries(
    setup.maximumFatigueByPlayerId ?? {}
  )) {
    if (currentFatigue[playerId] === undefined) {
      currentFatigue[playerId] = calculateCurrentFatiguePercent(maximumFatigue, minute);
    }
  }
  return currentFatigue;
}

function buildCalculationDetails(
  resolution: LineoutResolution,
  targetPlayer?: FieldPlayer
): LineoutResult["calculationDetails"] {
  const details: LineoutResult["calculationDetails"] = [];
  pushDetail(details, "lineout.calc.throwing", resolution.details.throwQuality);
  pushDetail(details, "lineout.calc.jump", resolution.details.attackJumpQuality);
  if (targetPlayer) pushDetail(details, "lineout.calc.hands", targetPlayer.hands);
  pushDetail(
    details,
    "lineout.calc.pressure",
    resolution.details.counterScore ?? resolution.details.defenseJumpQuality
  );
  return details;
}

function pushDetail(
  details: LineoutResult["calculationDetails"],
  labelKey: string,
  value: number | string | boolean | undefined
): void {
  if (typeof value === "number") details.push({ labelKey, value });
}

function getNumericDetail(
  resolution: LineoutResolution,
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = resolution.details[key];
    if (typeof value === "number") return value;
  }
  return 0;
}

function legacyResult(
  displayedResult: LineoutResult["displayedResult"],
  internalEvent: LineoutResult["internalEvent"],
  explanationKey: string,
  calculationScore: number,
  calculationDetails: LineoutResult["calculationDetails"],
  resolution: LineoutResolution,
  presentation?: {
    explanationKeys?: string[];
    presentationTitleKey?: string;
  }
): LineoutResult {
  return {
    displayedResult,
    internalEvent,
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey,
    ...(presentation?.explanationKeys
      ? { explanationKeys: presentation.explanationKeys }
      : {}),
    ...(presentation?.presentationTitleKey
      ? { presentationTitleKey: presentation.presentationTitleKey }
      : {}),
    calculationScore,
    calculationDetails,
    resolution
  };
}

function invalidSetupResult(): LineoutResult {
  return {
    displayedResult: "lost",
    internalEvent: "stolen",
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey: "lineout.explanation.invalidSetup",
    calculationScore: 0,
    calculationDetails: []
  };
}

function adjacentPosition(
  position: LineoutPosition,
  offset: -1 | 1
): LineoutPosition | undefined {
  const adjacent = position + offset;
  return adjacent >= 1 && adjacent <= 7 ? adjacent as LineoutPosition : undefined;
}
