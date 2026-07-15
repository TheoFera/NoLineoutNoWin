import type { LineoutResult, LineoutSetup } from "../models/Lineout.ts";
import { MATH_RANDOM_SOURCE, type RandomSource } from "../utils/Random.ts";
import {
  adaptResolutionForPerspective,
  buildResolutionInputFromSetup
} from "./LineoutResolver.ts";
import { resolveLineoutV2 } from "./LineoutV2Resolver.ts";

export function resolveDefensiveLineout(
  setup: LineoutSetup,
  selectedDefenderId: string | undefined,
  randomSource: RandomSource = MATH_RANDOM_SOURCE
): LineoutResult {
  if (!selectedDefenderId || !setup.defensiveJumpPosition) {
    return missedDefenseResult();
  }

  const selectedPlayer = setup.defendingPlayers[setup.defensiveJumpPosition - 1];
  if (!selectedPlayer || selectedPlayer.id !== selectedDefenderId) {
    return missedDefenseResult();
  }

  const input = buildResolutionInputFromSetup(setup, randomSource);
  if (!input) return missedDefenseResult();

  return adaptResolutionForPerspective(
    resolveLineoutV2(input),
    "defending",
    input
  );
}

function missedDefenseResult(): LineoutResult {
  return {
    displayedResult: "lost",
    internalEvent: "clean_catch",
    possessionDelta: 0,
    occupationDelta: 0,
    explanationKey: "lineout.explanation.defenseMissed",
    calculationScore: 0,
    calculationDetails: []
  };
}
