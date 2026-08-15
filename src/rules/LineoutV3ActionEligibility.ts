import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type {
  Combination,
  CombinationPhaseAction,
  CombinationPlan,
  LineoutPosition
} from "../models/Combination";
import type { FieldPlayer } from "../models/Player";
import { getV3CombinationPlan, moveV3JumpsToFinalPhase } from "./LineoutV3Combination";
import { getLineoutV3PositionForDepth } from "./LineoutV3Geometry";

export type LineoutV3AerialActionEligibility = {
  eligible: boolean;
  lifterPositions: LineoutPosition[];
};

export function isLineoutV3AerialStructureEligible(
  jumper: FieldPlayer,
  frontLifter: FieldPlayer | undefined,
  rearLifter: FieldPlayer | undefined,
  allowSingleRearLifter = false
): boolean {
  if (!rearLifter) return false;
  if (frontLifter) return true;
  if (!allowSingleRearLifter) return false;
  return rearLifter.strength > JUMP.singleRearLifterMinimumStrengthExclusive
    && jumper.speed > JUMP.singleRearLifterMinimumJumperSpeedExclusive
    && jumper.technique > JUMP.singleRearLifterMinimumJumperTechniqueExclusive;
}

type PositionedPlayer = {
  playerPosition: LineoutPosition;
  player: FieldPlayer;
  depthMeters: number;
};

const DEPTH = LINEOUT_BALANCE.gameplayV3.depth;
const JUMP = LINEOUT_BALANCE.gameplayV3.jump;

export function evaluateLineoutV3AerialActionEligibility(
  combination: Combination,
  players: readonly FieldPlayer[],
  jumperPosition: LineoutPosition,
  phaseIndex: number,
  plan: CombinationPlan = getV3CombinationPlan(combination)
): LineoutV3AerialActionEligibility {
  const positionedPlayers = getPositionedPlayers(combination, players, plan, phaseIndex);
  const jumperIndex = positionedPlayers.findIndex((entry) => entry.playerPosition === jumperPosition);
  const jumper = positionedPlayers[jumperIndex];
  if (!jumper) return { eligible: false, lifterPositions: [] };

  const frontCandidate = positionedPlayers[jumperIndex - 1];
  const rearCandidate = positionedPlayers[jumperIndex + 1];
  const frontDistance = frontCandidate
    ? jumper.depthMeters - frontCandidate.depthMeters
    : Number.POSITIVE_INFINITY;
  const rearDistance = rearCandidate
    ? rearCandidate.depthMeters - jumper.depthMeters
    : Number.POSITIVE_INFINITY;
  const frontLifter = frontDistance > 0.01 && frontDistance <= JUMP.lifterReachMeters
    ? frontCandidate
    : undefined;
  const rearLifter = rearDistance > 0.01 && rearDistance <= JUMP.lifterReachMeters
    ? rearCandidate
    : undefined;
  const eligible = isLineoutV3AerialStructureEligible(
    jumper.player,
    frontLifter?.player,
    rearLifter?.player,
    false
  );
  if (!eligible) return { eligible: false, lifterPositions: [] };

  return {
    eligible: true,
    lifterPositions: [frontLifter?.playerPosition, rearLifter?.playerPosition]
      .filter((position): position is LineoutPosition => position !== undefined)
  };
}

export function removeInvalidLineoutV3AerialActions(
  combination: Combination,
  players: readonly FieldPlayer[],
  plan: CombinationPlan
): CombinationPlan {
  const normalizedPlan = moveV3JumpsToFinalPhase(plan);
  return {
    phases: normalizedPlan.phases.map((phase, phaseIndex) => ({
      ...phase,
      actions: phase.actions.reduce<CombinationPhaseAction[]>((validActions, action) => {
        if (action.type === "move") {
          validActions.push({ ...action });
          return validActions;
        }
        const actionPosition = getLineoutV3PositionForDepth(
          getPlayerDepthAtPhase(action.playerPosition, normalizedPlan, phaseIndex)
        );
        if (action.type === "jump" && actionPosition === 1) return validActions;
        const eligibility = evaluateLineoutV3AerialActionEligibility(
          combination,
          players,
          action.playerPosition,
          phaseIndex,
          normalizedPlan
        );
        if (!eligibility.eligible) return validActions;
        if (action.type === "jump") {
          validActions.push({ ...action, lifterPositions: eligibility.lifterPositions });
          return validActions;
        }
        validActions.push({ ...action });
        return validActions;
      }, [])
    }))
  };
}

function getPositionedPlayers(
  combination: Combination,
  players: readonly FieldPlayer[],
  plan: CombinationPlan,
  phaseIndex: number
): PositionedPlayer[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  return combination.slots
    .flatMap((slot): PositionedPlayer[] => {
      const player = slot.playerId ? playersById.get(slot.playerId) : undefined;
      if (!player) return [];
      return [{
        playerPosition: slot.position,
        player,
        depthMeters: getPlayerDepthAtPhase(slot.position, plan, phaseIndex)
      }];
    })
    .sort((left, right) => (
      left.depthMeters - right.depthMeters
      || left.playerPosition - right.playerPosition
    ));
}

function getPlayerDepthAtPhase(
  playerPosition: LineoutPosition,
  plan: CombinationPlan,
  phaseIndex: number
): number {
  let depthMeters = DEPTH.minimumMeters + (playerPosition - 1) * DEPTH.positionSpacingMeters;
  for (let index = 0; index <= Math.min(phaseIndex, plan.phases.length - 1); index += 1) {
    const movement = plan.phases[index].actions.find((action) => (
      action.type === "move" && action.playerPosition === playerPosition
    ));
    if (movement?.type === "move") depthMeters = movement.destinationDepthMeters;
  }
  return depthMeters;
}
