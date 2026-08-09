import type { LineoutOutcome, LineoutResult } from "../models/Lineout.ts";

export type LineoutResultDetail = {
  labelKey: string;
  value: number | string;
  valueKey?: string;
  format: "score" | "position" | "text";
};

export type LineoutResultPresentation = {
  titleKey: string;
  summaryKeys: string[];
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

const TITLE_BY_EXPLANATION_KEY: Record<string, string> = {
  "lineout.explanation.attackClean": "lineout.presentation.title.won",
  "lineout.explanation.attackScrappy": "lineout.presentation.title.wonScrappy",
  "lineout.explanation.attackDeflected": "lineout.presentation.title.deflected",
  "lineout.explanation.attackStolen": "lineout.presentation.title.lost",
  "lineout.explanation.defenseCleanLost": "lineout.presentation.title.lost",
  "lineout.explanation.defenseScrappyLost": "lineout.presentation.title.lost",
  "lineout.explanation.defenseDeflected": "lineout.presentation.title.deflected",
  "lineout.explanation.defenseStolen": "lineout.presentation.title.recovered",
  "lineout.explanation.attackJumperKnockOn": "lineout.presentation.title.jumperKnockOn",
  "lineout.explanation.attackDirectKnockOn": "lineout.presentation.title.targetKnockOn",
  "lineout.explanation.attackOpponentKnockOn": "lineout.presentation.title.opponentKnockOn",
  "lineout.explanation.defenseOurKnockOn": "lineout.presentation.title.jumperKnockOn",
  "lineout.explanation.defenseOpponentKnockOn": "lineout.presentation.title.opponentKnockOn",
  "lineout.explanation.attackNotStraight": "lineout.presentation.title.notStraight",
  "lineout.explanation.defenseNotStraight": "lineout.presentation.title.opponentNotStraight",
  "lineout.explanation.attackLooseWon": "lineout.presentation.title.recovered",
  "lineout.explanation.attackLooseLost": "lineout.presentation.title.ballLost",
  "lineout.explanation.attackDirectLooseWon": "lineout.presentation.title.recovered",
  "lineout.explanation.attackDirectLooseLost": "lineout.presentation.title.ballLost",
  "lineout.explanation.defenseLooseWon": "lineout.presentation.title.recovered",
  "lineout.explanation.defenseLooseLost": "lineout.presentation.title.lost",
  "lineout.explanation.defenseDirectLooseWon": "lineout.presentation.title.recovered",
  "lineout.explanation.defenseDirectLooseLost": "lineout.presentation.title.lost",
  "lineout.explanation.defenseReadWon": "lineout.presentation.title.recovered",
  "lineout.explanation.defenseReadLost": "lineout.presentation.title.lost",
  "lineout.explanation.attackReadBeaten": "lineout.presentation.title.won",
  "lineout.explanation.attackReadLost": "lineout.presentation.title.ballLost",
  "lineout.explanation.defenseReadOurKnockOn": "lineout.presentation.title.defenderKnockOn",
  "lineout.explanation.defenseReadOpponentKnockOn": "lineout.presentation.title.opponentKnockOn",
  "lineout.explanation.attackReadOpponentKnockOn": "lineout.presentation.title.opponentKnockOn",
  "lineout.explanation.attackHighBallWon": "lineout.presentation.title.highBall",
  "lineout.explanation.attackHighBallLost": "lineout.presentation.title.highBall",
  "lineout.explanation.defenseHighBallWon": "lineout.presentation.title.highBall",
  "lineout.explanation.defenseHighBallLost": "lineout.presentation.title.highBall"
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
  { detailKey: "defensiveReadBonus", labelKey: "lineout.detail.defensiveReadBonus" },
  { detailKey: "counterScore", labelKey: "lineout.detail.counter" }
];

export function buildLineoutResultPresentation(result: LineoutResult): LineoutResultPresentation {
  const resolution = result.resolution;
  if (!resolution) {
    return {
      titleKey: `lineout.result.${result.displayedResult}`,
      summaryKeys: result.explanationKeys ?? [result.explanationKey],
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
    titleKey: result.presentationTitleKey
      ?? TITLE_BY_EXPLANATION_KEY[result.explanationKey]
      ?? OUTCOME_TITLE_KEYS[resolution.outcome],
    summaryKeys: result.explanationKeys ?? [result.explanationKey],
    reasonKey: resolution.primaryReason,
    details
  };
}

function buildOfficialDetails(
  rawDetails: Record<string, number | string | boolean>
): LineoutResultDetail[] {
  const details: LineoutResultDetail[] = [];
  if (rawDetails.gameplayVersion === 3) {
    const requestedDepth = rawDetails.requestedDepthMeters;
    const actualDepth = rawDetails.actualDepthMeters;
    const contactScore = rawDetails.contactScore;
    const trajectory = rawDetails.trajectory;
    if (typeof requestedDepth === "number") {
      details.push({
        labelKey: "lineout.v3.detail.requestedDepth",
        value: `${requestedDepth.toFixed(1)} m`,
        format: "text"
      });
    }
    if (typeof actualDepth === "number") {
      details.push({
        labelKey: "lineout.v3.detail.actualDepth",
        value: `${actualDepth.toFixed(1)} m`,
        format: "text"
      });
    }
    if (typeof trajectory === "string") {
      details.push({
        labelKey: "lineout.v3.detail.trajectory",
        value: trajectory,
        valueKey: `lineout.v3.trajectory.${trajectory}`,
        format: "text"
      });
    }
    if (typeof contactScore === "number") {
      details.push({
        labelKey: "lineout.v3.detail.contactScore",
        value: contactScore,
        format: "score"
      });
    }
  }
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
