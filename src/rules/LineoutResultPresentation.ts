import type { LineoutOutcome, LineoutResult } from "../models/Lineout.ts";

export type LineoutResultDetail = {
  labelKey: string;
  value: number | string;
  valueKey?: string;
  format: "score" | "position" | "text";
};

export type LineoutResultPresentation = {
  titleKey: string;
  summaryKey: string;
  reasonKey?: string;
  details: LineoutResultDetail[];
};

const OUTCOME_TITLE_KEYS: Record<LineoutOutcome, string> = {
  cleanWin: "lineout.outcome.cleanWin",
  scrappyWin: "lineout.outcome.scrappyWin",
  deflectedTurnover: "lineout.outcome.deflectedTurnover",
  cleanSteal: "lineout.outcome.cleanSteal",
  knockOn: "lineout.outcome.knockOn",
  notStraight: "lineout.outcome.notStraight",
  looseBall: "lineout.outcome.looseBall"
};

const SCORE_DETAILS: Array<{ detailKey: string; labelKey: string }> = [
  { detailKey: "throwQuality", labelKey: "lineout.detail.throwQuality" },
  { detailKey: "attackJumpQuality", labelKey: "lineout.detail.attackJump" },
  { detailKey: "defenseJumpQuality", labelKey: "lineout.detail.defenseJump" },
  { detailKey: "blockReceptionScore", labelKey: "lineout.detail.reception" },
  { detailKey: "targetReceptionScore", labelKey: "lineout.detail.reception" },
  { detailKey: "cascadeReceptionScore", labelKey: "lineout.detail.reception" },
  { detailKey: "duelAttackScore", labelKey: "lineout.detail.attackDuel" },
  { detailKey: "duelDefenseScore", labelKey: "lineout.detail.defenseDuel" },
  { detailKey: "counterScore", labelKey: "lineout.detail.counter" }
];

export function buildLineoutResultPresentation(result: LineoutResult): LineoutResultPresentation {
  const resolution = result.resolution;
  if (!resolution) {
    return {
      titleKey: `lineout.result.${result.displayedResult}`,
      summaryKey: result.explanationKey,
      details: result.calculationDetails.map((detail) => ({
        labelKey: detail.labelKey,
        value: detail.value,
        format: "score"
      }))
    };
  }

  const details = buildOfficialDetails(resolution.details);
  details.push({
    labelKey: "lineout.detail.possessionAfter",
    value: resolution.ballTeam,
    valueKey: `lineout.team.${resolution.ballTeam}`,
    format: "text"
  });

  return {
    titleKey: OUTCOME_TITLE_KEYS[resolution.outcome],
    summaryKey: result.explanationKey,
    reasonKey: resolution.primaryReason,
    details
  };
}

function buildOfficialDetails(
  rawDetails: Record<string, number | string | boolean>
): LineoutResultDetail[] {
  const details: LineoutResultDetail[] = [];
  const targetPosition = rawDetails.targetPosition;
  if (typeof targetPosition === "number") {
    details.push({
      labelKey: "lineout.detail.targetPosition",
      value: targetPosition,
      format: "position"
    });
  }

  const trajectory = rawDetails.trajectory;
  if (typeof trajectory === "string") {
    details.push({
      labelKey: "lineout.detail.trajectory",
      value: trajectory,
      valueKey: `lineout.trajectory.${trajectory}`,
      format: "text"
    });
  }

  const usedLabels = new Set<string>();
  for (const definition of SCORE_DETAILS) {
    const value = rawDetails[definition.detailKey];
    if (typeof value !== "number" || usedLabels.has(definition.labelKey)) {
      continue;
    }
    usedLabels.add(definition.labelKey);
    details.push({
      labelKey: definition.labelKey,
      value,
      format: "score"
    });
  }

  return details;
}
