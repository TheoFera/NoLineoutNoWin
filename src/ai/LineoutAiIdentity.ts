import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import type { DivisionId } from "../models/Division.ts";
import type { OpponentAiIdentity } from "../models/LineoutAI.ts";
import { clamp } from "../utils/Clamp.ts";

export function createOpponentAiIdentity(
  clubId: string,
  divisionId: DivisionId
): OpponentAiIdentity {
  const intelligence = LINEOUT_BALANCE.ai.intelligenceByDivision[divisionId];
  const video = LINEOUT_BALANCE.ai.videoByDivision[divisionId];
  return {
    aiIntelligence: clamp(
      intelligence.base + fixedInteger(clubId, "intelligence", -5, 5),
      0,
      100
    ),
    videoPreparation: fixedInteger(
      clubId,
      "videoPreparation",
      video.preparationMinimum,
      video.preparationMaximum
    ),
    videoMatchesAnalyzed: fixedInteger(
      clubId,
      "videoMatches",
      video.matchesMinimum,
      video.matchesMaximum
    )
  };
}

function fixedInteger(id: string, salt: string, minimum: number, maximum: number): number {
  if (maximum <= minimum) return minimum;
  let hash = 2166136261;
  for (const character of `${salt}:${id}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return minimum + ((hash >>> 0) % (maximum - minimum + 1));
}
