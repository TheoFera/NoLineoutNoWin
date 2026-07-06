export type LineoutHistoryEntry = {
  targetPlayerId: string;
  targetPosition: number;
  combinationId: string;
};

export function calculateRepeatPenalty(history: LineoutHistoryEntry[], nextTargetPlayerId: string, adaptationAfterRepeats: number): number {
  const recentSameTarget = history
    .slice(-Math.max(1, adaptationAfterRepeats))
    .filter((entry) => entry.targetPlayerId === nextTargetPlayerId).length;

  if (recentSameTarget >= adaptationAfterRepeats) {
    return 15;
  }

  return 0;
}
