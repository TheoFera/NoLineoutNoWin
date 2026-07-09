import type { LineoutResult, LineoutSetup } from "../models/Lineout";
import { resolveLineoutForThrowingTeam } from "./LineoutResolver";

export function resolveDefensiveLineout(
  setup: LineoutSetup,
  selectedDefenderId: string | undefined
): LineoutResult {
  if (!selectedDefenderId || !setup.defensiveJumpPosition) {
    return {
      displayedResult: "lost",
      internalEvent: "clean_catch",
      possessionDelta: -8,
      occupationDelta: -6,
      explanationKey: "lineout.explanation.defenseMissed",
      calculationScore: 0,
      calculationDetails: []
    };
  }

  const selectedIndex = setup.defensiveJumpPosition - 1;
  const selectedPlayer = setup.defendingPlayers[selectedIndex];
  if (!selectedPlayer || selectedPlayer.id !== selectedDefenderId) {
    return {
      displayedResult: "lost",
      internalEvent: "clean_catch",
      possessionDelta: -8,
      occupationDelta: -6,
      explanationKey: "lineout.explanation.defenseMissed",
      calculationScore: 0,
      calculationDetails: []
    };
  }

  const throwingResult = resolveLineoutForThrowingTeam(setup);
  const relativeOffset = setup.targetPosition
    ? setup.targetPosition - setup.defensiveJumpPosition
    : -3;
  const possessionDelta = -throwingResult.possessionDelta;
  const occupationDelta = -throwingResult.occupationDelta;

  if (throwingResult.displayedResult === "fault") {
    return {
      ...throwingResult,
      possessionDelta,
      occupationDelta
    };
  }

  if (throwingResult.displayedResult === "lost") {
    const cleanCounter = relativeOffset === 1 || relativeOffset === 0;

    return {
      displayedResult: cleanCounter ? "won" : "won_dirty",
      internalEvent: cleanCounter ? "stolen" : "dirty_catch",
      possessionDelta,
      occupationDelta,
      explanationKey: cleanCounter ? "lineout.explanation.defenseStolen" : "lineout.explanation.defenseContested",
      calculationScore: throwingResult.calculationScore,
      calculationDetails: throwingResult.calculationDetails
    };
  }

  return {
    displayedResult: "lost",
    internalEvent: throwingResult.internalEvent,
    possessionDelta,
    occupationDelta,
    explanationKey: relativeOffset >= 2 || relativeOffset < 0
      ? "lineout.explanation.defenseLate"
      : "lineout.explanation.defenseBeaten",
    calculationScore: throwingResult.calculationScore,
    calculationDetails: throwingResult.calculationDetails
  };
}
