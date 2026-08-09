import type { CombinationTargetOption } from "../models/Combination";
import type { LineoutResult, LineoutTrajectory } from "../models/Lineout";
import type { RandomSource } from "../utils/Random";
import {
  getLineoutJumpAnimationMetrics,
  LINEOUT_LIFT_ANIMATION
} from "./LineoutLiftAnimation.ts";

export const LINEOUT_THROW_ANIMATION = {
  travelSpeedPixelsPerSecond: 900,
  minimumTravelDurationMs: 16,
  twistFrameDurationMs: 75,
  flightApexScale: 1.16,
  hookerBallSourceXRatio: 85 / 170,
  hookerBallHeightFromFeetRatio: 305 / 370,
  ballShadowApexPlayerHeightRatio: 1.15,
  ballShadowApexScale: 0.55,
  straightMaximumHorizontalOffsetPixels: 9.5,
  notStraightMinimumHorizontalOffsetPixels: 25.01,
  maximumHorizontalOffsetPixels: 150,
  gaussianMaximumStandardDeviations: 3,
  preciseCatchHeightRatio: 0.82,
  handPoseBallHeightRatio: 0.54,
  playerTokenSpriteFeetOffsetPixels: 4,
  lowCatchHeightRatio: 0.5,
  highClearancePixels: 18,
  clearNotStraightOffsetPixels: 80,
  looseBallContinuationPositions: 1,
  groundBallCenterOffsetPixels: 12,
  ballScreenMarginPixels: 10,
  highBallClearancePixels: 35,
  highBallExitY: -30,
  highBallExitDurationMs: 700,
  secondaryJumpHeightPixels: 6,
  secondaryAttemptDurationMs: 180,
  knockOnBouncePixels: 12,
  volleyMinimumHorizontalDistancePixels: 100,
  volleyMeanHorizontalDistancePixels: 130,
  volleyMaximumHorizontalDistancePixels: 160,
  volleyHorizontalDistanceStandardDeviationPixels: 10,
  flightDurationMs: 410,
  contactToCampDurationMs: 220,
  continuationDurationMs: 210,
  knockOnDropDurationMs: 260,
  knockOnBounceDurationMs: 90,
  caughtHoldDurationMs: 180,
  resultHoldDurationMs: 100
} as const;

export type BallAnimationTargetOffset = {
  x: number;
  y: number;
};

export type BallAnimationPhase = {
  x: number;
  y: number;
  angle: number;
  durationMs: number;
  ease: string;
};

export type BallAnimationWaypoint = {
  x: number;
  y: number;
};

export type LineoutBallAnimationPlan = {
  phases: BallAnimationPhase[];
  holdDurationMs: number;
  retainedBy?: "target" | "defending" | "recovery";
  leavesScreen?: boolean;
};

export type LineoutBallAnimationPlanInput = {
  result: LineoutResult;
  corridorX: number;
  throwingCampX: number;
  defendingCampX: number;
  targetHandsX: number;
  targetHandsY: number;
  targetGroundY: number;
  defendingHandsX?: number;
  defendingHandsY?: number;
  defendingGroundY?: number;
  recoveryHandsX?: number;
  recoveryHandsY?: number;
  recoveryGroundY?: number;
  secondaryPath?: readonly BallAnimationWaypoint[];
  groundPointX?: number;
  groundPointFeetY?: number;
  slotGap: number;
  horizontalOffset: number;
  volleyHorizontalDistance: number;
  volleyMinimumX: number;
  volleyMaximumX: number;
};

export function getLineoutAnimationTrajectory(result: LineoutResult): LineoutTrajectory {
  const trajectory = result.resolution?.details.trajectory;
  if (isLineoutTrajectory(trajectory)) {
    return trajectory;
  }

  if (result.internalEvent === "not_straight" || result.resolution?.outcome === "notStraight") {
    return "notStraight";
  }
  if (result.internalEvent === "overthrow") {
    return "high";
  }
  if (result.internalEvent === "underthrow") {
    return "low";
  }

  return "precise";
}

export function getLineoutAnimationTargetType(
  result: LineoutResult,
  fallback: CombinationTargetOption["type"]
): CombinationTargetOption["type"] {
  const targetOptionType = result.resolution?.details.targetOptionType;
  return targetOptionType === "jumpBlock" || targetOptionType === "directCatch"
    ? targetOptionType
    : fallback;
}

export function getLineoutAnimationThrowQuality(result: LineoutResult): number {
  const throwQuality = result.resolution?.details.throwQuality;
  if (typeof throwQuality === "number" && Number.isFinite(throwQuality)) {
    return clampScore(throwQuality);
  }

  return clampScore(result.calculationScore);
}

export function buildLineoutBallAnimationPlan(
  input: LineoutBallAnimationPlanInput
): LineoutBallAnimationPlan {
  const resolution = input.result.resolution;
  if (!resolution) {
    return groundPlan(
      [contactPhase(input.targetHandsX, input.targetHandsY)],
      input.targetHandsX,
      getGroundBallY(input.targetGroundY)
    );
  }

  if (resolution.outcome === "notStraight") {
    const direction = input.horizontalOffset < 0 ? -1 : 1;
    const missedBallX = input.corridorX
      + direction * Math.max(
        Math.abs(input.horizontalOffset),
        LINEOUT_THROW_ANIMATION.clearNotStraightOffsetPixels
      );
    return {
      phases: [
        {
          x: missedBallX,
          y: input.targetHandsY + 30,
          angle: 80 * direction,
          durationMs: LINEOUT_THROW_ANIMATION.flightDurationMs,
          ease: "Sine.easeOut"
        },
        groundPhase(missedBallX, getGroundBallY(input.targetGroundY))
      ],
      holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs
    };
  }

  const highTrajectory = resolution.details.trajectory === "high";
  const highRecovery = isHighBallRecovery(resolution.primaryReason);
  const recoveryKind = resolution.details.recoveryKind;
  const recoveryHandsX = input.recoveryHandsX ?? input.targetHandsX;
  const recoveryHandsY = input.recoveryHandsY ?? input.targetHandsY;
  const recoveryGroundY = input.recoveryGroundY ?? input.targetGroundY;
  const secondaryPhases = waypointPhases(input.secondaryPath);

  if (resolution.outcome === "knockOn") {
    const offendingHandsX = input.recoveryHandsX
      ?? (resolution.offendingTeam === "defendingTeam"
        ? input.defendingHandsX ?? input.targetHandsX
        : input.targetHandsX);
    const offendingHandsY = input.recoveryHandsY
      ?? (resolution.offendingTeam === "defendingTeam"
        ? input.defendingHandsY ?? input.targetHandsY
        : input.targetHandsY);
    const offendingGroundY = input.recoveryGroundY
      ?? (resolution.offendingTeam === "defendingTeam"
        ? input.defendingGroundY ?? input.targetGroundY
        : input.targetGroundY);
    const groundBallY = getGroundBallY(offendingGroundY);
    const opponentCampX = resolution.offendingTeam === "defendingTeam"
      ? input.throwingCampX
      : input.defendingCampX;
    const approach = secondaryPhases.length > 0
      ? recoveryKind === "secondary"
        ? secondaryPhases
        : [...secondaryPhases, contactPhase(offendingHandsX, offendingHandsY)]
      : highTrajectory && input.recoveryHandsY !== undefined
        ? highApproachPhases(input, offendingHandsX, offendingHandsY)
      : [contactPhase(offendingHandsX, offendingHandsY)];
    return {
      phases: [
        ...approach,
        {
          x: opponentCampX,
          y: groundBallY,
          angle: 90,
          durationMs: LINEOUT_THROW_ANIMATION.knockOnDropDurationMs,
          ease: "Quad.easeIn"
        },
        {
          x: opponentCampX,
          y: groundBallY - LINEOUT_THROW_ANIMATION.knockOnBouncePixels,
          angle: 205,
          durationMs: LINEOUT_THROW_ANIMATION.knockOnBounceDurationMs,
          ease: "Quad.easeOut"
        },
        {
          x: opponentCampX,
          y: groundBallY,
          angle: 90,
          durationMs: LINEOUT_THROW_ANIMATION.knockOnBounceDurationMs,
          ease: "Quad.easeIn"
        }
      ],
      holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs
    };
  }

  if (resolution.outcome === "looseBall") {
    if (
      recoveryKind === "out15m"
      || resolution.primaryReason === "lineout.reason.highBallLoose"
    ) {
      return {
        phases: [
          ...secondaryPhases,
          {
            x: input.corridorX + input.horizontalOffset,
            y: LINEOUT_THROW_ANIMATION.highBallExitY,
            angle: 90,
            durationMs: LINEOUT_THROW_ANIMATION.highBallExitDurationMs,
            ease: "Linear"
          }
        ],
        holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs,
        leavesScreen: true
      };
    }

    const winnerCampX = resolution.ballTeam === "throwingTeam"
      ? input.throwingCampX
      : input.defendingCampX;
    const continuedY = input.targetHandsY
      - input.slotGap * LINEOUT_THROW_ANIMATION.looseBallContinuationPositions;
    const continuedGroundY = getGroundBallY(
      input.targetGroundY
      - input.slotGap * LINEOUT_THROW_ANIMATION.looseBallContinuationPositions
    );
    return {
      phases: [
        contactPhase(input.targetHandsX, input.targetHandsY),
        {
          x: input.targetHandsX,
          y: continuedY,
          angle: 65,
          durationMs: LINEOUT_THROW_ANIMATION.continuationDurationMs,
          ease: "Sine.easeInOut"
        },
        {
          x: winnerCampX,
          y: continuedY,
          angle: 105,
          durationMs: LINEOUT_THROW_ANIMATION.contactToCampDurationMs,
          ease: "Sine.easeIn"
        },
        groundPhase(winnerCampX, continuedGroundY)
      ],
      holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs
    };
  }

  if (recoveryKind === "ground") {
    const groundX = input.groundPointX ?? input.corridorX;
    const groundY = getGroundBallY(input.groundPointFeetY ?? input.targetGroundY);
    return {
      phases: [
        ...secondaryPhases,
        groundPhase(groundX, groundY),
        contactPhase(recoveryHandsX, recoveryHandsY)
      ],
      holdDurationMs: LINEOUT_THROW_ANIMATION.caughtHoldDurationMs,
      retainedBy: "recovery"
    };
  }

  if (recoveryKind === "secondary") {
    return {
      phases: secondaryPhases.length > 0
        ? secondaryPhases
        : [contactPhase(recoveryHandsX, recoveryHandsY)],
      holdDurationMs: LINEOUT_THROW_ANIMATION.caughtHoldDurationMs,
      retainedBy: "recovery"
    };
  }

  if (resolution.outcome === "cleanWin") {
    return highRecovery
      ? highCaughtPlan(input, recoveryHandsX, recoveryHandsY, "recovery")
      : caughtFromPhases(
        [...secondaryPhases, contactPhase(input.targetHandsX, input.targetHandsY)],
        "target"
      );
  }

  if (resolution.outcome === "scrappyWin") {
    const wonInAir = resolution.details.targetOptionType === "jumpBlock"
      && (
        resolution.details.attackJumpSucceeded === true
        || resolution.details.duelOutcome === "attackScrappy"
      );
    if (!wonInAir) {
      return caughtFromPhases(
        [...secondaryPhases, contactPhase(input.targetHandsX, input.targetHandsY)],
        "target"
      );
    }

    const contactPhases = highRecovery
      ? highApproachPhases(input, recoveryHandsX, recoveryHandsY)
      : [...secondaryPhases, contactPhase(input.targetHandsX, input.targetHandsY)];
    const groundY = highRecovery ? recoveryGroundY : input.targetGroundY;
    const contactX = highRecovery ? recoveryHandsX : input.targetHandsX;
    return volleyPlan(
      contactPhases,
      getVolleyLandingX(
        contactX,
        input.throwingCampX,
        input.volleyHorizontalDistance,
        input.volleyMinimumX,
        input.volleyMaximumX
      ),
      recoveryHandsY,
      getGroundBallY(groundY)
    );
  }

  if (resolution.outcome === "cleanSteal") {
    const handsX = highRecovery
      ? recoveryHandsX
      : input.defendingHandsX ?? input.targetHandsX;
    const handsY = highRecovery
      ? recoveryHandsY
      : input.defendingHandsY ?? input.targetHandsY;
    return highRecovery
      ? highCaughtPlan(input, handsX, handsY, "recovery")
      : caughtPlan(handsX, handsY, "defending");
  }

  const defendingHandsX = highRecovery
    ? recoveryHandsX
    : input.defendingHandsX ?? input.targetHandsX;
  const defendingHandsY = highRecovery
    ? recoveryHandsY
    : input.defendingHandsY ?? input.targetHandsY;
  const defendingGroundY = highRecovery
    ? recoveryGroundY
    : input.defendingGroundY ?? input.targetGroundY;
  const contactPhases = highRecovery
    ? highApproachPhases(input, defendingHandsX, defendingHandsY)
    : [contactPhase(defendingHandsX, defendingHandsY)];
  return volleyPlan(
    contactPhases,
    getVolleyLandingX(
      defendingHandsX,
      input.defendingCampX,
      input.volleyHorizontalDistance,
      input.volleyMinimumX,
      input.volleyMaximumX
    ),
    defendingHandsY,
    getGroundBallY(defendingGroundY)
  );
}

export function sampleThrowHorizontalOffset(
  throwQuality: number,
  rng: RandomSource
): number {
  const quality = clampScore(throwQuality);
  if (quality === 100) {
    return 0;
  }

  const gaussian = sampleStandardGaussian(rng);
  if (quality >= 50) {
    const maximumOffset = LINEOUT_THROW_ANIMATION.straightMaximumHorizontalOffsetPixels
      * ((100 - quality) / 50);
    const standardDeviation = maximumOffset
      / LINEOUT_THROW_ANIMATION.gaussianMaximumStandardDeviations;

    return clamp(
      gaussian * standardDeviation,
      -maximumOffset,
      maximumOffset
    );
  }

  const notStraightProgress = (50 - quality) / 50;
  const maximumOffset = LINEOUT_THROW_ANIMATION.notStraightMinimumHorizontalOffsetPixels
    + (
      LINEOUT_THROW_ANIMATION.maximumHorizontalOffsetPixels
      - LINEOUT_THROW_ANIMATION.notStraightMinimumHorizontalOffsetPixels
    ) * notStraightProgress;
  const magnitudeProgress = Math.min(
    1,
    Math.abs(gaussian) / LINEOUT_THROW_ANIMATION.gaussianMaximumStandardDeviations
  );
  const magnitude = LINEOUT_THROW_ANIMATION.notStraightMinimumHorizontalOffsetPixels
    + (
      maximumOffset
      - LINEOUT_THROW_ANIMATION.notStraightMinimumHorizontalOffsetPixels
    ) * magnitudeProgress;

  return gaussian < 0 ? -magnitude : magnitude;
}

export function sampleVolleyHorizontalDistance(rng: RandomSource): number {
  const gaussian = sampleStandardGaussian(rng);
  return Math.round(clamp(
    LINEOUT_THROW_ANIMATION.volleyMeanHorizontalDistancePixels
      + gaussian
      * LINEOUT_THROW_ANIMATION.volleyHorizontalDistanceStandardDeviationPixels,
    LINEOUT_THROW_ANIMATION.volleyMinimumHorizontalDistancePixels,
    LINEOUT_THROW_ANIMATION.volleyMaximumHorizontalDistancePixels
  ));
}

export function applyConstantBallTravelSpeed(
  startX: number,
  startY: number,
  phases: readonly BallAnimationPhase[]
): BallAnimationPhase[] {
  let previousX = startX;
  let previousY = startY;

  return phases.map((phase) => {
    const timedPhase = {
      ...phase,
      durationMs: getBallTravelDurationMs(previousX, previousY, phase.x, phase.y),
      ease: "Linear"
    };
    previousX = phase.x;
    previousY = phase.y;
    return timedPhase;
  });
}

export function applyThrowCorridorFlight(
  corridorX: number,
  horizontalOffset: number,
  phases: readonly BallAnimationPhase[]
): BallAnimationPhase[] {
  const firstPhase = phases[0];
  if (!firstPhase) {
    return [...phases];
  }

  const flightX = corridorX + horizontalOffset;
  if (Math.abs(firstPhase.x - flightX) < 0.01) {
    return [...phases];
  }

  return [
    {
      x: flightX,
      y: firstPhase.y,
      angle: firstPhase.angle,
      durationMs: LINEOUT_THROW_ANIMATION.flightDurationMs,
      ease: "Linear"
    },
    ...phases
  ];
}

export function getBallTravelDurationMs(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): number {
  const distance = Math.hypot(endX - startX, endY - startY);
  return Math.max(
    LINEOUT_THROW_ANIMATION.minimumTravelDurationMs,
    Math.round(
      distance
      / LINEOUT_THROW_ANIMATION.travelSpeedPixelsPerSecond
      * 1000
    )
  );
}

export function getBallAnimationTargetOffset(
  trajectory: LineoutTrajectory,
  shouldJump: boolean,
  playerHeight: number,
  horizontalOffset: number,
  jumpHeightPixels = getLineoutJumpAnimationMetrics(
    LINEOUT_LIFT_ANIMATION.defaultJumpQuality
  ).heightPixels
): BallAnimationTargetOffset {
  const jumpHeight = shouldJump ? jumpHeightPixels : 0;
  const preciseY = -(jumpHeight + playerHeight * LINEOUT_THROW_ANIMATION.preciseCatchHeightRatio);

  if (trajectory === "notStraight") {
    return {
      x: horizontalOffset,
      y: preciseY
    };
  }
  if (trajectory === "low") {
    return {
      x: horizontalOffset,
      y: -(jumpHeight + playerHeight * LINEOUT_THROW_ANIMATION.lowCatchHeightRatio)
    };
  }
  if (trajectory === "high") {
    return {
      x: horizontalOffset,
      y: -(jumpHeight + playerHeight + LINEOUT_THROW_ANIMATION.highClearancePixels)
    };
  }

  return { x: horizontalOffset, y: preciseY };
}

export function getHandPoseBallOffset(
  playerHeight: number
): BallAnimationTargetOffset {
  return {
    x: 0,
    y: LINEOUT_THROW_ANIMATION.playerTokenSpriteFeetOffsetPixels
      - playerHeight * LINEOUT_THROW_ANIMATION.handPoseBallHeightRatio
  };
}

function isLineoutTrajectory(value: unknown): value is LineoutTrajectory {
  return value === "notStraight"
    || value === "precise"
    || value === "low"
    || value === "high";
}

function caughtPlan(
  x: number,
  y: number,
  retainedBy?: LineoutBallAnimationPlan["retainedBy"]
): LineoutBallAnimationPlan {
  return caughtFromPhases([contactPhase(x, y)], retainedBy);
}

function caughtFromPhases(
  phases: BallAnimationPhase[],
  retainedBy?: LineoutBallAnimationPlan["retainedBy"]
): LineoutBallAnimationPlan {
  return {
    phases,
    holdDurationMs: LINEOUT_THROW_ANIMATION.caughtHoldDurationMs,
    retainedBy
  };
}

function volleyPlan(
  contactPhases: BallAnimationPhase[],
  campX: number,
  contactY: number,
  groundY: number
): LineoutBallAnimationPlan {
  return {
    phases: [
      ...contactPhases,
      {
        x: campX,
        y: contactY,
        angle: 70,
        durationMs: LINEOUT_THROW_ANIMATION.contactToCampDurationMs,
        ease: "Sine.easeIn"
      },
      groundPhase(campX, groundY)
    ],
    holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs
  };
}

function getVolleyLandingX(
  contactX: number,
  campX: number,
  horizontalDistance: number,
  minimumX: number,
  maximumX: number
): number {
  const direction = campX < contactX ? -1 : 1;
  const distance = clamp(
    horizontalDistance,
    LINEOUT_THROW_ANIMATION.volleyMinimumHorizontalDistancePixels,
    LINEOUT_THROW_ANIMATION.volleyMaximumHorizontalDistancePixels
  );
  return clamp(contactX + direction * distance, minimumX, maximumX);
}

function groundPlan(
  approachPhases: BallAnimationPhase[],
  groundX: number,
  groundY: number
): LineoutBallAnimationPlan {
  return {
    phases: [
      ...approachPhases,
      groundPhase(groundX, groundY)
    ],
    holdDurationMs: LINEOUT_THROW_ANIMATION.resultHoldDurationMs
  };
}

function groundPhase(x: number, y: number): BallAnimationPhase {
  return {
    x,
    y,
    angle: 90,
    durationMs: LINEOUT_THROW_ANIMATION.knockOnDropDurationMs,
    ease: "Quad.easeIn"
  };
}

function getGroundBallY(playerFeetY: number): number {
  return playerFeetY - LINEOUT_THROW_ANIMATION.groundBallCenterOffsetPixels;
}

function highCaughtPlan(
  input: LineoutBallAnimationPlanInput,
  recoveryHandsX: number,
  recoveryHandsY: number,
  retainedBy: LineoutBallAnimationPlan["retainedBy"]
): LineoutBallAnimationPlan {
  return {
    phases: highApproachPhases(input, recoveryHandsX, recoveryHandsY),
    holdDurationMs: LINEOUT_THROW_ANIMATION.caughtHoldDurationMs,
    retainedBy
  };
}

function highApproachPhases(
  input: LineoutBallAnimationPlanInput,
  recoveryHandsX: number,
  recoveryHandsY: number
): BallAnimationPhase[] {
  return [
    {
      x: input.targetHandsX,
      y: input.targetHandsY - LINEOUT_THROW_ANIMATION.highBallClearancePixels,
      angle: 18,
      durationMs: LINEOUT_THROW_ANIMATION.flightDurationMs,
      ease: "Sine.easeOut"
    },
    {
      x: recoveryHandsX,
      y: recoveryHandsY,
      angle: 55,
      durationMs: LINEOUT_THROW_ANIMATION.continuationDurationMs,
      ease: "Sine.easeIn"
    }
  ];
}

function contactPhase(x: number, y: number): BallAnimationPhase {
  return {
    x,
    y,
    angle: 18,
    durationMs: LINEOUT_THROW_ANIMATION.flightDurationMs,
    ease: "Sine.easeOut"
  };
}

function waypointPhases(
  waypoints?: readonly BallAnimationWaypoint[]
): BallAnimationPhase[] {
  return (waypoints ?? []).map((waypoint) => contactPhase(waypoint.x, waypoint.y));
}

function isHighBallRecovery(reason: string): boolean {
  return reason === "lineout.reason.highBallRecoveredClean"
    || reason === "lineout.reason.highBallRecoveredScrappy"
    || reason === "lineout.reason.highBallStolenClean"
    || reason === "lineout.reason.highBallStolenScrappy";
}

function sampleStandardGaussian(rng: RandomSource): number {
  const first = Math.max(Number.EPSILON, nextUnit(rng));
  const second = nextUnit(rng);

  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function nextUnit(rng: RandomSource): number {
  const value = rng.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("RandomSource.next() must return a value in [0, 1)");
  }

  return value;
}

function clampScore(value: number): number {
  return clamp(value, 0, 100);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
