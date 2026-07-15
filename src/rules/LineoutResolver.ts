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
        ? "lineout.explanation.fault"
        : "lineout.explanation.opponentNotStraight",
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  if (resolution.outcome === "knockOn") {
    return legacyResult(
      weOffended ? "fault" : "won_dirty",
      "knock_on",
      weOffended
        ? "lineout.explanation.ourKnockOn"
        : "lineout.explanation.opponentKnockOn",
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  if (resolution.outcome === "looseBall") {
    return legacyResult(
      weHaveBall ? "won_dirty" : "lost",
      weHaveBall ? "dirty_catch" : "stolen",
      weHaveBall
        ? "lineout.explanation.looseBallWon"
        : "lineout.explanation.looseBallLost",
      calculationScore,
      calculationDetails,
      resolution
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
          : "lineout.explanation.defenseContested"
        : clean
          ? "lineout.explanation.clean"
          : "lineout.explanation.dirty",
      calculationScore,
      calculationDetails,
      resolution
    );
  }

  return legacyResult(
    "lost",
    "stolen",
    perspective === "defending"
      ? "lineout.explanation.defenseBeaten"
      : "lineout.explanation.lost",
    calculationScore,
    calculationDetails,
    resolution
  );
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
      ? option.roles.receiverPosition
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
    naturalWeight: 1
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
  resolution: LineoutResolution
): LineoutResult {
  return {
    displayedResult,
    internalEvent,
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey,
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
