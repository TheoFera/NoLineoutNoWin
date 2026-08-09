import type { LineoutResolution, LineoutResult } from "../models/Lineout";

export function adaptV3ResolutionForPerspective(
  resolution: LineoutResolution,
  perspective: "throwing" | "defending"
): LineoutResult {
  const ourResolutionTeam = perspective === "throwing" ? "throwingTeam" : "defendingTeam";
  const won = resolution.ballTeam === ourResolutionTeam;
  const fault = resolution.outcome === "knockOn" || resolution.outcome === "notStraight";
  const faultByUs = fault && resolution.offendingTeam === ourResolutionTeam;
  const clean = resolution.outcome === "cleanWin" || resolution.outcome === "cleanSteal";
  const primaryReason = getV3ReasonKey(resolution, ourResolutionTeam, won);
  return {
    displayedResult: faultByUs
      ? "fault"
      : won
        ? clean ? "won" : "won_dirty"
        : "lost",
    internalEvent: resolution.outcome === "notStraight"
      ? "not_straight"
      : resolution.outcome === "knockOn"
        ? "knock_on"
        : resolution.outcome === "cleanSteal"
          ? "stolen"
          : resolution.outcome === "cleanWin"
            ? "clean_catch"
            : "dirty_catch",
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey: primaryReason,
    presentationTitleKey: resolution.outcome === "knockOn"
      ? "lineout.outcome.knockOn"
      : resolution.outcome === "notStraight"
        ? faultByUs ? "lineout.v3.title.fault" : "lineout.v3.title.cleanWin"
        : won
          ? clean ? "lineout.v3.title.cleanWin" : "lineout.v3.title.scrappyWin"
          : fault ? "lineout.v3.title.fault" : "lineout.v3.title.lost",
    calculationScore: numericDetail(resolution.details.contactScore),
    calculationDetails: [
      {
        labelKey: "lineout.v3.detail.requestedDepth",
        value: numericDetail(resolution.details.requestedDepthMeters)
      },
      {
        labelKey: "lineout.v3.detail.actualDepth",
        value: numericDetail(resolution.details.actualDepthMeters)
      },
      {
        labelKey: "lineout.v3.detail.contactScore",
        value: numericDetail(resolution.details.contactScore)
      }
    ],
    resolution: primaryReason === resolution.primaryReason
      ? resolution
      : { ...resolution, primaryReason }
  };
}

function getV3ReasonKey(
  resolution: LineoutResolution,
  ourResolutionTeam: "throwingTeam" | "defendingTeam",
  won: boolean
): string {
  if (resolution.primaryReason === "lineout.v3.reason.spatialContact") {
    return won
      ? "lineout.v3.reason.catchWonByUs"
      : "lineout.v3.reason.catchWonByOpponent";
  }
  if (resolution.outcome === "knockOn") {
    return resolution.offendingTeam === ourResolutionTeam
      ? "lineout.v3.reason.knockOnByUs"
      : "lineout.v3.reason.knockOnByOpponent";
  }
  if (resolution.outcome === "notStraight") {
    return resolution.offendingTeam === ourResolutionTeam
      ? "lineout.v3.reason.notStraightByUs"
      : "lineout.v3.reason.notStraightByOpponent";
  }
  if (resolution.primaryReason === "lineout.v3.reason.groundRecovery") {
    const trajectory = resolution.details.trajectory;
    const trajectoryKey = trajectory === "precise" || trajectory === "low" || trajectory === "high"
      ? trajectory
      : "unknown";
    const teamKey = won ? "ByUs" : "ByOpponent";
    return `lineout.v3.reason.groundRecovery.${trajectoryKey}${teamKey}`;
  }
  if (resolution.primaryReason === "lineout.v3.reason.untouched") {
    return won
      ? "lineout.v3.reason.untouchedByUs"
      : "lineout.v3.reason.untouchedByOpponent";
  }
  return resolution.primaryReason;
}

function numericDetail(value: number | string | boolean | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
