import type { LineoutResolution, LineoutResult } from "../models/Lineout";

export function adaptV3ResolutionForPerspective(
  resolution: LineoutResolution,
  perspective: "throwing" | "defending"
): LineoutResult {
  const ourResolutionTeam = perspective === "throwing" ? "throwingTeam" : "defendingTeam";
  const won = resolution.ballTeam === ourResolutionTeam;
  const fault = resolution.outcome === "knockOn" || resolution.outcome === "notStraight";
  const clean = resolution.outcome === "cleanWin" || resolution.outcome === "cleanSteal";
  return {
    displayedResult: fault && resolution.offendingTeam === ourResolutionTeam
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
    explanationKey: resolution.primaryReason,
    presentationTitleKey: won
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
    resolution
  };
}

function numericDetail(value: number | string | boolean | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
