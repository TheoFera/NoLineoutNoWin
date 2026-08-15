import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type {
  Combination,
  CombinationPhaseAction,
  CombinationTargetOption,
  LineoutPosition
} from "../models/Combination";
import type { DivisionId } from "../models/Division";
import { getLineoutV3DepthForPosition } from "../rules/LineoutV3Geometry";
import { randomFloat, randomInt, type RandomSource } from "../utils/Random";

type DecoyMovement = {
  outward: CombinationPhaseAction[];
  return: CombinationPhaseAction[];
};

export function buildAiLineoutCombinationPlan(options: {
  combination: Combination;
  targetOption: CombinationTargetOption;
  divisionId: DivisionId;
  rng: RandomSource;
}): Combination {
  const capability = LINEOUT_BALANCE.ai.offensivePlanByDivision[options.divisionId];
  const phaseCount = randomInt(
    capability.minimumPhases,
    capability.maximumPhases,
    options.rng
  );
  const phases = Array.from({ length: phaseCount }, (_item, index) => ({
    id: `phase-${index + 1}`,
    actions: [] as CombinationPhaseAction[]
  }));
  const finalPhase = phases[phases.length - 1];

  if (options.targetOption.type === "jumpBlock") {
    const jumperPosition = options.targetOption.roles.jumperPosition
      ?? options.targetOption.targetPosition;
    const lifterPositions = [
      options.targetOption.roles.frontLifterPosition,
      options.targetOption.roles.rearLifterPosition
    ].filter((position): position is LineoutPosition => position !== undefined);
    finalPhase.actions.push({ type: "jump", playerPosition: jumperPosition, lifterPositions });
  }

  const movement = phaseCount >= 3
    && randomFloat(0, 1, options.rng) < capability.movementProbability
    ? createDecoyMovement(options.combination, options.targetOption, options.rng)
    : null;
  if (movement) {
    phases[0].actions.push(...movement.outward);
    phases[1].actions.push(...movement.return);
  }

  const feintPositions = getFeintPositions(options.combination, options.targetOption);
  let feintCount = 0;
  let feintIndex = feintPositions.length > 0
    ? randomInt(0, feintPositions.length - 1, options.rng)
    : 0;
  for (let phaseIndex = 0; phaseIndex < phases.length - 1; phaseIndex += 1) {
    if (
      phases[phaseIndex].actions.length > 0
      || feintPositions.length === 0
      || feintCount >= capability.maximumFeints
    ) continue;
    phases[phaseIndex].actions.push({
      type: "feint",
      playerPosition: feintPositions[feintIndex % feintPositions.length]
    });
    feintIndex += 1;
    feintCount += 1;
  }

  return {
    ...options.combination,
    slots: options.combination.slots.map((slot) => ({ ...slot })),
    targetOptions: options.combination.targetOptions?.map((option) => ({
      ...option,
      roles: { ...option.roles }
    })),
    plan: { phases }
  };
}

function getFeintPositions(
  combination: Combination,
  targetOption: CombinationTargetOption
): LineoutPosition[] {
  const positions = (combination.targetOptions ?? [])
    .filter((option) => option.type === "jumpBlock")
    .map((option) => option.roles.jumperPosition ?? option.targetPosition);
  const targetPosition = targetOption.roles.jumperPosition ?? targetOption.targetPosition;
  return [...new Set([
    ...positions.filter((position) => position !== targetPosition),
    ...(targetOption.type === "jumpBlock" ? [targetPosition] : [])
  ])];
}

function createDecoyMovement(
  combination: Combination,
  targetOption: CombinationTargetOption,
  rng: RandomSource
): DecoyMovement | null {
  const occupiedPositions = combination.slots
    .filter((slot) => slot.playerId !== null)
    .map((slot) => slot.position);
  const protectedPositions = new Set<LineoutPosition>([
    targetOption.targetPosition,
    ...Object.values(targetOption.roles)
      .filter((position): position is LineoutPosition => position !== undefined)
  ]);
  const movablePositions = occupiedPositions.filter((position) => !protectedPositions.has(position));
  if (movablePositions.length === 0) return null;

  const occupied = new Set(occupiedPositions);
  const emptyPositions = ([1, 2, 3, 4, 5, 6, 7] as LineoutPosition[])
    .filter((position) => !occupied.has(position) && !protectedPositions.has(position));
  if (emptyPositions.length > 0) {
    const playerPosition = pick(movablePositions, rng);
    const destinationPosition = emptyPositions.reduce((nearest, position) => (
      Math.abs(position - playerPosition) < Math.abs(nearest - playerPosition)
        ? position
        : nearest
    ));
    return {
      outward: [{
        type: "move",
        playerPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(destinationPosition)
      }],
      return: [{
        type: "move",
        playerPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(playerPosition)
      }]
    };
  }

  if (movablePositions.length < 2) return null;
  const firstIndex = randomInt(0, movablePositions.length - 2, rng);
  const firstPosition = movablePositions[firstIndex];
  const secondPosition = movablePositions[firstIndex + 1];
  return {
    outward: [
      {
        type: "move",
        playerPosition: firstPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(secondPosition)
      },
      {
        type: "move",
        playerPosition: secondPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(firstPosition)
      }
    ],
    return: [
      {
        type: "move",
        playerPosition: firstPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(firstPosition)
      },
      {
        type: "move",
        playerPosition: secondPosition,
        destinationDepthMeters: getLineoutV3DepthForPosition(secondPosition)
      }
    ]
  };
}

function pick<T>(values: readonly T[], rng: RandomSource): T {
  return values[randomInt(0, values.length - 1, rng)];
}
