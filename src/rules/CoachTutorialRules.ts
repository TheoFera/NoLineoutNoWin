import type { CoachTutorialProgress } from "../models/TutorialState";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { Team } from "../models/Team";
import type { LineoutV3Snapshot, LineoutV3PlayerState } from "../models/LineoutV3";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";

export function coachDefensiveJumpAt(snapshot: LineoutV3Snapshot, player: LineoutV3PlayerState): number | undefined {
  const ball = snapshot.ball;
  if (!ball) return undefined;
  const speed = Math.max(0, Math.min(100, player.player.speed * (1 - player.fatiguePercent / 100)));
  const jump = LINEOUT_BALANCE.gameplayV3.jump;
  const ascent = (jump.maximumDurationMs + (jump.minimumDurationMs - jump.maximumDurationMs) * speed / 100) / 2;
  const arrival = ball.releasedAtMs + ball.trajectory.flightDurationMs * player.position.depthMeters / ball.trajectory.groundDepthMeters;
  return Math.max(ball.releasedAtMs, arrival - ascent);
}

export function coachDefensiveTiming(snapshot: LineoutV3Snapshot): string | undefined {
  if (!snapshot.ball) return undefined;
  const ball = snapshot.ball;
  const defender = snapshot.players.filter((player) => player.side === "defendingTeam" && player.lastJump)
    .sort((a, b) => Math.abs(a.position.depthMeters - ball.trajectory.actualDepthMeters)
      - Math.abs(b.position.depthMeters - ball.trajectory.actualDepthMeters))[0];
  if (!defender?.lastJump) return undefined;
  const expected = coachDefensiveJumpAt(snapshot, defender);
  if (expected === undefined) return undefined;
  const delta = defender.lastJump.startedAtMs - expected;
  const tolerance = LINEOUT_BALANCE.tutorial.defensiveTimingToleranceMs;
  return Math.abs(delta) <= tolerance ? "goodTiming" : delta < 0 ? "tooEarly" : "tooLate";
}

export const COACH_SIMPLE_ID = "charles-simple";
export const COACH_SECOND_ID = "charles-profonde";

export function createCoachTutorialProgress(): CoachTutorialProgress {
  return { dialogueVersion: 2, matchesCompleted: 0, steps: {}, completed: [], prepared: [], recruitmentUsed: false };
}

export function normalizeCoachTutorialProgress(value?: CoachTutorialProgress): CoachTutorialProgress | undefined {
  if (!value || typeof value !== "object") return undefined;
  const steps = Object.fromEntries(Object.entries(value.steps ?? {}).filter(([, index]) => Number.isInteger(index) && index >= 0));
  // Conserver le dialogue atteint lorsque des explications sont insérées dans le début du cours.
  if ((value.dialogueVersion ?? 1) < 2) {
    const previousSteps: Record<string, number[]> = {
      "team.first": [0, 2, 3, 4],
      "editor.first": [0, 1, 3, 4, 6, 7, 8, 12],
    };
    for (const [lesson, indices] of Object.entries(previousSteps)) {
      if (steps[lesson] !== undefined) steps[lesson] = indices[steps[lesson]] ?? steps[lesson];
    }
  }
  return {
    dialogueVersion: 2,
    matchesCompleted: Number.isFinite(value.matchesCompleted) ? Math.max(0, Math.floor(value.matchesCompleted)) : 0,
    steps,
    completed: Array.isArray(value.completed) ? value.completed.filter((id) => typeof id === "string") : [],
    prepared: Array.isArray(value.prepared) ? value.prepared.filter((id) => typeof id === "string") : [],
    recruitmentUsed: value.recruitmentUsed === true,
    firstRecruitId: typeof value.firstRecruitId === "string" ? value.firstRecruitId : undefined,
    pendingComment: typeof value.pendingComment === "string" ? value.pendingComment : undefined,
  };
}

/** Choisir les rôles à partir des qualités réelles, sans changer les statistiques. */
export function createCoachCombination(team: Team, second = false, five = false): Combination {
  const players = [...team.lineoutPlayers];
  const jumper = players.sort((a, b) => b.technique - a.technique)[0];
  const lifters = players.filter((player) => player.id !== jumper.id).sort((a, b) => b.strength - a.strength);
  const front = (second ? 4 : 2) as LineoutPosition;
  const middle = (front + 1) as LineoutPosition;
  const rear = (front + 2) as LineoutPosition;
  const ids = new Map<number, string>([[front, lifters[0].id], [middle, jumper.id], [rear, lifters[1].id]]);
  if (five) {
    const extras = players.filter((player) => ![...ids.values()].includes(player.id));
    ids.set(1, extras[0].id);
    ids.set(2, extras[1].id);
  }
  return {
    id: second ? COACH_SECOND_ID : COACH_SIMPLE_ID,
    nameKey: second ? "coach.combo.deep" : "coach.combo.simple",
    risk: 0, complexity: 0,
    slots: ([1, 2, 3, 4, 5, 6, 7] as LineoutPosition[]).map((position) => ({ position, playerId: ids.get(position) ?? null })),
    plan: { phases: [{ id: "charles-saut", actions: [{ type: "jump", playerPosition: middle, lifterPositions: [front, rear] }] }] },
    targetOptions: [{ id: "charles-reception", type: "jumpBlock", targetPosition: middle,
      roles: { jumperPosition: middle, frontLifterPosition: front, rearLifterPosition: rear }, defaultNaturalWeight: 100 }],
  };
}
