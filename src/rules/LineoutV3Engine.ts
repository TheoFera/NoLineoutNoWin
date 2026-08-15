import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type { CombinationPhaseAction, LineoutPosition } from "../models/Combination";
import type { LineoutResolution, LineoutResolutionTeam } from "../models/Lineout";
import type {
  LineoutV3BallState,
  LineoutV3BallTrajectory,
  LineoutV3ContactResult,
  LineoutV3Event,
  LineoutV3Feedback,
  LineoutV3Movement,
  LineoutV3PlayerState,
  LineoutV3Setup,
  LineoutV3Snapshot,
  LineoutV3ThrowGesture,
  LineoutV3ThrowValidation
} from "../models/LineoutV3";
import type { FieldPlayer } from "../models/Player";
import { clamp } from "../utils/Clamp";
import { MATH_RANDOM_SOURCE, randomFloat, type RandomSource } from "../utils/Random";
import { calculateBaseKnockOnProbability } from "./LineoutReceptionResolver";
import { isLineoutV3AerialStructureEligible } from "./LineoutV3ActionEligibility";
import { getV3CombinationPlan } from "./LineoutV3Combination";
import {
  getLineoutV3DepthForGestureDistance,
  getLineoutV3DepthForPosition,
  getLineoutV3PositionForDepth
} from "./LineoutV3Geometry";

const V3 = LINEOUT_BALANCE.gameplayV3;

type TimedContact = {
  player: LineoutV3PlayerState;
  reachScore: number;
  ballPosition: LineoutV3BallState["position"];
  movingAtContact: boolean;
};

type PhaseMovementDestinations = ReadonlyMap<string, number>;

export class LineoutV3Engine {
  private readonly setup: LineoutV3Setup;
  private readonly rng: RandomSource;
  private readonly playersById = new Map<string, LineoutV3PlayerState>();
  private readonly playerIdByAttackingPosition = new Map<LineoutPosition, string>();
  private elapsedMs = 0;
  private combinationStartedAtMs: number | null = null;
  private nextPhaseIndex = 0;
  private lastPhaseStartedAtMs: number | null = null;
  private defenseLocked = false;
  private ball: LineoutV3BallState | null = null;
  private resolution: LineoutResolution | null = null;
  private feedback: LineoutV3Feedback[] = [];
  private contactWindowStartedAtMs: number | null = null;
  private readonly bestContactByPlayerId = new Map<string, TimedContact>();
  private contestContactAnnounced = false;

  constructor(setup: LineoutV3Setup, rng: RandomSource = MATH_RANDOM_SOURCE) {
    this.setup = setup;
    this.rng = rng;
    this.createPlayers("throwingTeam", setup.attackingPlayers, setup.attackingDepthsMeters, -0.72);
    this.createPlayers("defendingTeam", setup.defendingPlayers, setup.defendingDepthsMeters, 0.72);
    setup.combination.slots.forEach((slot) => {
      if (slot.playerId) this.playerIdByAttackingPosition.set(slot.position, slot.playerId);
    });
  }

  getSnapshot(): LineoutV3Snapshot {
    return {
      elapsedMs: this.elapsedMs,
      combinationStarted: this.combinationStartedAtMs !== null,
      defenseLocked: this.defenseLocked,
      players: [...this.playersById.values()],
      ball: this.ball,
      resolution: this.resolution,
      feedback: [...this.feedback]
    };
  }

  canTargetAerialCatchAtPosition(position: LineoutPosition): boolean {
    const plan = getV3CombinationPlan(this.setup.combination);
    return plan.phases.some((phase) => phase.actions.some((action) => {
      if (action.type !== "jump") return false;
      const jumperId = this.playerIdByAttackingPosition.get(action.playerPosition);
      const jumper = jumperId ? this.playersById.get(jumperId) : undefined;
      if (!jumper || this.getReservedPosition(jumper) !== position) return false;
      const lifters = action.lifterPositions
        .map((lifterPosition) => this.playerIdByAttackingPosition.get(lifterPosition))
        .map((lifterId) => lifterId ? this.playersById.get(lifterId) : undefined)
        .filter((lifter): lifter is LineoutV3PlayerState => Boolean(lifter));
      return this.selectEligibleLifters(jumper, lifters).length > 0;
    }));
  }

  startCombination(): LineoutV3Event[] {
    if (this.combinationStartedAtMs !== null || this.resolution) return [];
    this.combinationStartedAtMs = this.elapsedMs;
    return [{ type: "combinationStarted" }];
  }

  hasStartedCombinationPhase(phaseIndex: number): boolean {
    return phaseIndex >= 0 && this.nextPhaseIndex > phaseIndex;
  }

  validateThrowGesture(gesture: LineoutV3ThrowGesture): LineoutV3ThrowValidation {
    if (gesture.distancePixels < V3.gesture.minimumDistancePixels) {
      return { valid: false, reason: "tooShort" };
    }
    const requestedPosition = getLineoutV3PositionForDepth(
      getLineoutV3DepthForGestureDistance(gesture.distancePixels)
    );
    if (requestedPosition === 1) {
      return { valid: true };
    }
    const durationSeconds = Math.max(1, gesture.durationMs) / 1_000;
    const gestureRatio = clamp(
      (gesture.distancePixels - V3.gesture.minimumDistancePixels)
        / (V3.gesture.maximumDistancePixels - V3.gesture.minimumDistancePixels),
      0,
      1
    );
    const minimumSpeed = this.interpolate(
      V3.gesture.shortThrowMinimumSpeedPixelsPerSecond,
      V3.gesture.longThrowMinimumSpeedPixelsPerSecond,
      gestureRatio
    );
    if (gesture.distancePixels / durationSeconds < minimumSpeed) {
      return { valid: false, reason: "tooSlow" };
    }
    return { valid: true };
  }

  releaseThrow(gesture: LineoutV3ThrowGesture): {
    validation: LineoutV3ThrowValidation;
    events: LineoutV3Event[];
  } {
    const validation = this.validateThrowGesture(gesture);
    if (!validation.valid || this.ball || this.resolution || this.combinationStartedAtMs === null) {
      return { validation, events: [] };
    }

    const trajectory = this.createTrajectory(gesture);
    this.ball = {
      releasedAtMs: this.elapsedMs,
      position: { depthMeters: 0, lateralMeters: 0, heightMeters: V3.trajectory.startHeightMeters },
      trajectory,
      completed: false
    };
    this.defenseLocked = true;
    return { validation, events: [{ type: "throwReleased", trajectory }] };
  }

  moveDefender(playerId: string, destinationDepthMeters: number): LineoutV3Event[] {
    if (this.defenseLocked || this.resolution) return [];
    const player = this.playersById.get(playerId);
    if (!player || player.side !== "defendingTeam" || !this.canMove(player)) return [];
    this.assignMovement(player, destinationDepthMeters);
    return [{ type: "playerMoved", playerId }];
  }

  getCompatibleLifterIds(jumperId: string): string[] {
    const jumper = this.playersById.get(jumperId);
    if (!jumper || jumper.side !== "defendingTeam" || !this.canMove(jumper)) return [];
    return this.findMovableGroupLifters(jumper).map((player) => player.player.id);
  }

  moveDefensiveGroup(
    jumperId: string,
    destinationDepthMeters: number,
    frozenLifterIds?: readonly string[]
  ): LineoutV3Event[] {
    if (this.defenseLocked || this.resolution) return [];
    const jumper = this.playersById.get(jumperId);
    if (!jumper || jumper.side !== "defendingTeam" || !this.canMove(jumper)) return [];
    const lifters = frozenLifterIds
      ? frozenLifterIds
        .map((playerId) => this.playersById.get(playerId))
        .filter((player): player is LineoutV3PlayerState => Boolean(player))
        .filter((player) => this.isMovableGroupLifter(player, jumper))
        .slice(0, 2)
      : this.findMovableGroupLifters(jumper);
    const group = [jumper, ...lifters];
    const groupPlayerIds = new Set(group.map((player) => player.player.id));
    const groupSpeed = Math.min(...group.map((player) => this.baseMovementSpeed(player)));
    const destinations = this.findFreeGroupDestinations(
      group,
      jumper,
      destinationDepthMeters,
      groupPlayerIds
    );
    if (!destinations) return [];
    const events: LineoutV3Event[] = [];
    group.forEach((player) => {
      if (!this.canMove(player)) return;
      this.assignMovement(
        player,
        destinations.get(player.player.id) ?? player.position.depthMeters,
        groupPlayerIds,
        groupSpeed
      );
      events.push({ type: "playerMoved", playerId: player.player.id });
    });
    return events;
  }

  jumpDefender(playerId: string): LineoutV3Event[] {
    if (!this.defenseLocked || !this.ball || this.resolution) return [];
    const player = this.playersById.get(playerId);
    if (
      !player
      || player.side !== "defendingTeam"
      || player.engagedByPlayerId
      || player.hasJumped
      || !["ready", "moving"].includes(player.activity)
    ) return [];
    const lifters = this.findEligibleDefensiveJumpLifters(player);
    if (lifters.length === 0) return [];
    this.stopMovementForJump(player);
    lifters.forEach((lifter) => this.stopMovementForJump(lifter));
    return this.startJump(player, lifters, false);
  }

  update(deltaMs: number): LineoutV3Event[] {
    if (deltaMs <= 0 || this.resolution) return [];
    const events: LineoutV3Event[] = [];
    let remainingMs = Math.min(deltaMs, 100);
    while (remainingMs > 0 && !this.resolution) {
      const stepMs = Math.min(remainingMs, V3.reach.maximumSimulationStepMs);
      this.elapsedMs += stepMs;
      this.updatePlayers(stepMs);
      events.push(...this.startDueCombinationPhase());
      if (this.ball) events.push(...this.updateBall());
      remainingMs -= stepMs;
    }
    return events;
  }

  private createPlayers(
    side: LineoutResolutionTeam,
    players: FieldPlayer[],
    depths: number[],
    lateralMeters: number
  ): void {
    players.forEach((player, index) => {
      const state: LineoutV3PlayerState = {
        player,
        side,
        position: {
          depthMeters: clamp(
            depths[index] ?? this.depthForPosition((index + 1) as LineoutPosition),
            V3.depth.minimumMeters,
            V3.depth.maximumMeters
          ),
          lateralMeters,
          heightMeters: 0
        },
        standingLateralMeters: lateralMeters,
        handHeightMeters: V3.jump.standingHandHeightMeters,
        activity: "ready",
        fatiguePercent: this.setup.fatigueByPlayerId[player.id] ?? 0,
        hasJumped: false,
        hasLifted: false,
        attemptedBall: false
      };
      this.playersById.set(player.id, state);
    });
  }

  private startDueCombinationPhase(): LineoutV3Event[] {
    if (this.combinationStartedAtMs === null) return [];
    const plan = getV3CombinationPlan(this.setup.combination);
    if (this.nextPhaseIndex >= plan.phases.length) return [];

    const firstPhaseDueAt = this.combinationStartedAtMs + V3.timing.combinationLeadMs;
    if (this.nextPhaseIndex === 0 && this.elapsedMs < firstPhaseDueAt) return [];
    if (
      this.lastPhaseStartedAtMs !== null
      && this.elapsedMs < this.lastPhaseStartedAtMs + V3.timing.phaseDurationMs
    ) return [];
    if (this.hasPendingOffensivePhaseAction()) return [];

    const phaseIndex = this.nextPhaseIndex;
    this.nextPhaseIndex += 1;
    this.lastPhaseStartedAtMs = this.elapsedMs;
    const events: LineoutV3Event[] = [{ type: "phaseStarted", phaseIndex }];
    const phaseActions = plan.phases[phaseIndex].actions;
    const phaseMovementDestinations = this.getPhaseMovementDestinations(phaseActions);
    phaseActions.forEach((action) => {
      events.push(...this.executeOffensiveAction(action, phaseMovementDestinations));
    });
    return events;
  }

  private getPhaseMovementDestinations(
    actions: readonly CombinationPhaseAction[]
  ): PhaseMovementDestinations {
    const destinations = new Map<string, number>();
    actions.forEach((action) => {
      if (action.type !== "move") return;
      const playerId = this.playerIdByAttackingPosition.get(action.playerPosition);
      if (playerId) destinations.set(playerId, action.destinationDepthMeters);
    });
    return destinations;
  }

  private hasPendingOffensivePhaseAction(): boolean {
    return [...this.playersById.values()].some((player) => (
      player.side === "throwingTeam"
      && (
        (player.activity === "moving" && player.movement !== undefined)
        || player.jump !== undefined
      )
    ));
  }

  private executeOffensiveAction(
    action: CombinationPhaseAction,
    phaseMovementDestinations: PhaseMovementDestinations
  ): LineoutV3Event[] {
    const playerId = this.playerIdByAttackingPosition.get(action.playerPosition);
    const player = playerId ? this.playersById.get(playerId) : undefined;
    if (!player || player.side !== "throwingTeam") return [];

    if (action.type === "move") {
      if (!this.canMove(player)) return [];
      this.assignMovement(
        player,
        action.destinationDepthMeters,
        new Set(),
        undefined,
        phaseMovementDestinations
      );
      return [{ type: "playerMoved", playerId: player.player.id }];
    }
    if (action.type === "feint") {
      return this.startJump(player, this.findEligibleLifters(player), true);
    }
    const lifters = action.lifterPositions
      .map((position) => this.playerIdByAttackingPosition.get(position))
      .map((id) => id ? this.playersById.get(id) : undefined)
      .filter((candidate): candidate is LineoutV3PlayerState => Boolean(candidate))
      .filter((candidate) => this.isAvailableLifter(candidate, player));
    return this.startJump(player, lifters.slice(0, 2), false);
  }

  private startJump(
    jumper: LineoutV3PlayerState,
    lifters: LineoutV3PlayerState[],
    feint: boolean
  ): LineoutV3Event[] {
    if ((!feint && jumper.hasJumped) || jumper.activity !== "ready") return [];
    if (!feint && this.getReservedPosition(jumper) === 1) return [];
    const eligibleLifters = this.selectEligibleLifters(jumper, lifters);
    if (eligibleLifters.length === 0) return [];
    jumper.movement = undefined;
    if (!feint) jumper.hasJumped = true;
    const effectiveSpeed = this.effectiveStat(jumper, jumper.player.speed);
    const movementDurationMs = feint
      ? V3.jump.feintDurationMs
      : this.interpolateByStat(
        effectiveSpeed,
        V3.jump.maximumDurationMs,
        V3.jump.minimumDurationMs
      );
    const liftStrength = eligibleLifters.reduce(
      (total, lifter) => total + this.effectiveStat(lifter, lifter.player.strength),
      0
    ) / eligibleLifters.length;
    const soloElevation = this.interpolateByStat(
      this.effectiveStat(jumper, jumper.player.technique),
      V3.jump.minimumSoloElevationMeters,
      V3.jump.maximumSoloElevationMeters
    );
    const liftElevation = eligibleLifters.length === 2
      ? V3.jump.twoLifterElevationMeters * liftStrength / 100
      : eligibleLifters.length === 1
        ? V3.jump.oneLifterElevationMeters * liftStrength / 100
        : 0;
    const apexHoldDurationMs = feint
      ? 0
      : this.calculateApexHoldDurationMs(jumper, eligibleLifters, liftStrength);
    const durationMs = movementDurationMs + apexHoldDurationMs;
    jumper.activity = feint ? "feinting" : "jumping";
    jumper.jump = {
      startedAtMs: this.elapsedMs,
      durationMs,
      apexHoldDurationMs,
      maximumHandHeightMeters: V3.jump.standingHandHeightMeters + (
        feint ? V3.jump.feintElevationMeters : soloElevation + liftElevation
      ),
      lifterIds: eligibleLifters.map((lifter) => lifter.player.id),
      feint
    };
    if (!feint) jumper.lastJump = { startedAtMs: this.elapsedMs, durationMs };
    eligibleLifters.forEach((lifter) => {
      lifter.movement = undefined;
      lifter.activity = "lifting";
      lifter.engagedByPlayerId = jumper.player.id;
      lifter.hasLifted = true;
    });
    return [{
      type: "jumpStarted",
      playerId: jumper.player.id,
      lifterIds: eligibleLifters.map((lifter) => lifter.player.id),
      feint
    }];
  }

  private updatePlayers(deltaMs: number): void {
    this.playersById.forEach((player) => {
      if (player.movement && player.activity === "moving") {
        this.updateMovement(player, deltaMs);
      }
      if (player.jump) this.updateJump(player);
    });
  }

  private updateMovement(player: LineoutV3PlayerState, deltaMs: number): void {
    const movement = player.movement as LineoutV3Movement;
    const waypoint = movement.waypoints[movement.waypointIndex];
    if (!waypoint) {
      player.movement = undefined;
      player.activity = "ready";
      return;
    }
    const depthDelta = waypoint.depthMeters - player.position.depthMeters;
    const lateralDelta = waypoint.lateralMeters - player.position.lateralMeters;
    const distance = Math.hypot(depthDelta, lateralDelta);
    const distanceStep = this.movementSpeed(player) * deltaMs / 1_000;
    if (distance <= Math.max(distanceStep, V3.movement.arrivalToleranceMeters)) {
      player.position.depthMeters = waypoint.depthMeters;
      player.position.lateralMeters = waypoint.lateralMeters;
      movement.waypointIndex += 1;
      if (movement.waypointIndex >= movement.waypoints.length) {
        player.movement = undefined;
        player.activity = "ready";
      }
      return;
    }
    player.position.depthMeters += depthDelta / distance * distanceStep;
    player.position.lateralMeters += lateralDelta / distance * distanceStep;
  }

  private updateJump(player: LineoutV3PlayerState): void {
    const jump = player.jump;
    if (!jump) return;
    const elapsedMs = this.elapsedMs - jump.startedAtMs;
    const movementDurationMs = jump.durationMs - jump.apexHoldDurationMs;
    const ascentDurationMs = movementDurationMs / 2;
    const descentStartedAtMs = ascentDurationMs + jump.apexHoldDurationMs;
    const maximumElevation = jump.maximumHandHeightMeters - V3.jump.standingHandHeightMeters;
    let elevation: number;
    if (elapsedMs < ascentDurationMs) {
      const ascentProgress = clamp(elapsedMs / ascentDurationMs, 0, 1);
      elevation = Math.sin(ascentProgress * Math.PI / 2) * maximumElevation;
    } else if (elapsedMs < descentStartedAtMs) {
      elevation = maximumElevation;
    } else {
      const descentProgress = clamp(
        (elapsedMs - descentStartedAtMs) / ascentDurationMs,
        0,
        1
      );
      elevation = Math.cos(descentProgress * Math.PI / 2) * maximumElevation;
    }
    player.position.heightMeters = elevation;
    player.handHeightMeters = V3.jump.standingHandHeightMeters + elevation;
    if (elapsedMs < jump.durationMs) return;

    player.position.heightMeters = 0;
    player.handHeightMeters = V3.jump.standingHandHeightMeters;
    player.activity = jump.feint ? "ready" : "unavailable";
    jump.lifterIds.forEach((lifterId) => {
      const lifter = this.playersById.get(lifterId);
      if (lifter?.engagedByPlayerId === player.player.id) {
        lifter.engagedByPlayerId = undefined;
        lifter.activity = "ready";
      }
    });
    player.jump = undefined;
  }

  private calculateApexHoldDurationMs(
    jumper: LineoutV3PlayerState,
    lifters: readonly LineoutV3PlayerState[],
    averageLifterStrength: number
  ): number {
    if (lifters.length === 0) return 0;
    const effectiveTechnique = this.effectiveStat(jumper, jumper.player.technique);
    const holdQuality = clamp(
      averageLifterStrength * V3.jump.lifterStrengthHoldWeight
      + effectiveTechnique * V3.jump.jumperTechniqueHoldWeight,
      0,
      100
    );
    const lifterCountMultiplier = lifters.length === 1
      ? V3.jump.oneLifterHoldDurationMultiplier
      : 1;
    return Math.round(
      this.interpolate(
        V3.jump.minimumApexHoldDurationMs,
        V3.jump.maximumApexHoldDurationMs,
        holdQuality / 100
      ) * lifterCountMultiplier
    );
  }

  private updateBall(): LineoutV3Event[] {
    const ball = this.ball;
    if (!ball || ball.completed || this.resolution) return [];
    const events: LineoutV3Event[] = [];
    const flightElapsed = this.elapsedMs - ball.releasedAtMs;
    const progress = clamp(flightElapsed / ball.trajectory.flightDurationMs, 0, 1);
    ball.position = this.sampleBallPosition(ball.trajectory, progress);
    const contacts = this.findBallContacts(ball);
    if (contacts.length > 0) this.collectBallContacts(contacts);
    if (!this.contestContactAnnounced) {
      const collectedContacts = [...this.bestContactByPlayerId.values()];
      const attackingContact = this.bestContact(collectedContacts, "throwingTeam");
      const defendingContact = this.bestContact(collectedContacts, "defendingTeam");
      if (attackingContact && defendingContact) {
        this.contestContactAnnounced = true;
        events.push({
          type: "ballContact",
          playerIds: [
            attackingContact.player.player.id,
            defendingContact.player.player.id
          ]
        });
      }
    }
    const contactWindowComplete = this.contactWindowStartedAtMs !== null
      && (
        this.elapsedMs - this.contactWindowStartedAtMs >= V3.reach.simultaneousWindowMs
        || progress >= 1
      );
    if (contactWindowComplete) {
      const bestContacts = [...this.bestContactByPlayerId.values()];
      this.contactWindowStartedAtMs = null;
      this.bestContactByPlayerId.clear();
      const result = this.resolveContacts(bestContacts);
      if (result.outcome && result.winner) {
        const winningContact = bestContacts.find((contact) => (
          contact.player.player.id === result.playerId
        ));
        if (winningContact) ball.position = { ...winningContact.ballPosition };
        this.completeWithContact(result);
        const resolution = this.resolution;
        if (!resolution) return events;
        events.push({
          type: "resolved",
          resolution,
          feedback: [...this.feedback]
        });
        return events;
      }
      bestContacts.forEach((contact) => {
        contact.player.attemptedBall = true;
      });
      this.contestContactAnnounced = false;
    }
    if (this.contactWindowStartedAtMs !== null && this.bestContactByPlayerId.size > 0) {
      const closestContact = [...this.bestContactByPlayerId.values()]
        .sort((left, right) => right.reachScore - left.reachScore)[0];
      ball.position = { ...closestContact.ballPosition };
    }
    if (progress >= 1) return [...events, ...this.completeUncaughtBall()];
    return events;
  }

  private collectBallContacts(contacts: readonly TimedContact[]): void {
    if (this.contactWindowStartedAtMs === null) {
      this.contactWindowStartedAtMs = this.elapsedMs;
    }
    contacts.forEach((contact) => {
      const previous = this.bestContactByPlayerId.get(contact.player.player.id);
      if (!previous || contact.reachScore > previous.reachScore) {
        this.bestContactByPlayerId.set(contact.player.player.id, contact);
      }
    });
  }

  private findBallContacts(ball: LineoutV3BallState): TimedContact[] {
    const contacts: TimedContact[] = [];
    this.playersById.forEach((player) => {
      if (player.attemptedBall || player.activity === "lifting" || player.activity === "unavailable") return;
      const depthDistance = Math.abs(ball.position.depthMeters - player.position.depthMeters);
      const lateralDistance = Math.abs(ball.position.lateralMeters - player.position.lateralMeters);
      const heightDistance = Math.abs(ball.position.heightMeters - player.handHeightMeters);
      if (
        depthDistance > V3.reach.depthMeters
        || lateralDistance > V3.reach.lateralMeters
        || heightDistance > V3.reach.heightMeters
      ) return;
      const reachScore = clamp(100 - (
        depthDistance / V3.reach.depthMeters
        + lateralDistance / V3.reach.lateralMeters
        + heightDistance / V3.reach.heightMeters
      ) / 3 * 100, 0, 100);
      contacts.push({
        player,
        reachScore,
        ballPosition: { ...ball.position },
        movingAtContact: player.activity === "moving" && player.movement !== undefined
      });
    });
    return contacts;
  }

  private resolveContacts(contacts: TimedContact[]): LineoutV3ContactResult {
    const bestAttack = this.bestContact(contacts, "throwingTeam");
    const bestDefense = this.bestContact(contacts, "defendingTeam");
    if (bestAttack && bestDefense) return this.resolveDuel(bestAttack, bestDefense);
    const only = bestAttack ?? bestDefense;
    if (!only) return { winner: null, outcome: null };
    const score = this.contactScore(only, only.player.side === "throwingTeam")
      - this.ballDifficultyPenalty();
    return this.caughtBallResult(only, score, score >= V3.resolution.cleanCatchThreshold);
  }

  private resolveDuel(attack: TimedContact, defense: TimedContact): LineoutV3ContactResult {
    const attackScore = this.contactScore(attack, true) - this.ballDifficultyPenalty();
    const defenseScore = this.contactScore(defense, false);
    const attackWins = attackScore >= defenseScore;
    const winner = attackWins ? attack : defense;
    const margin = Math.abs(attackScore - defenseScore);
    return this.caughtBallResult(
      winner,
      attackWins ? attackScore : defenseScore,
      margin >= V3.resolution.cleanDuelMargin
    );
  }

  private caughtBallResult(
    contact: TimedContact,
    score: number,
    clean: boolean
  ): LineoutV3ContactResult {
    const player = contact.player;
    const knockOnRisk = clamp(
      calculateBaseKnockOnProbability(player.player.technique)
        + (contact.movingAtContact ? V3.resolution.movingKnockOnProbabilityBonus : 0),
      0,
      1
    );
    if (this.rng.next() < knockOnRisk) {
      return {
        winner: player.side === "throwingTeam" ? "defendingTeam" : "throwingTeam",
        outcome: "knockOn",
        offendingTeam: player.side,
        playerId: player.player.id,
        score
      };
    }
    return {
      winner: player.side,
      outcome: player.side === "throwingTeam"
        ? clean ? "cleanWin" : "scrappyWin"
        : clean ? "cleanSteal" : "deflectedTurnover",
      playerId: player.player.id,
      score
    };
  }

  private completeWithContact(result: LineoutV3ContactResult): void {
    const offendingTeam = result.offendingTeam;
    this.feedback = this.buildFeedback(result.playerId);
    this.resolution = {
      outcome: result.outcome as LineoutResolution["outcome"],
      ballTeam: result.winner as LineoutResolutionTeam,
      restart: result.outcome === "knockOn" ? "scrum" : "continuousPlay",
      ...(offendingTeam ? { offendingTeam } : {}),
      primaryReason: result.outcome === "knockOn"
        ? "lineout.v3.reason.knockOn"
        : "lineout.v3.reason.spatialContact",
      details: {
        gameplayVersion: 3,
        catcherId: result.playerId ?? "",
        contactScore: Math.round(result.score ?? 0),
        requestedDepthMeters: this.ball?.trajectory.requestedDepthMeters ?? 0,
        actualDepthMeters: this.ball?.trajectory.actualDepthMeters ?? 0,
        trajectory: this.ball?.trajectory.classification ?? "precise"
      }
    };
    if (this.ball) this.ball.completed = true;
  }

  private completeUncaughtBall(): LineoutV3Event[] {
    const trajectory = (this.ball as LineoutV3BallState).trajectory;
    const notStraight = trajectory.classification === "notStraight";
    const nearest = this.nearestAvailablePlayer(trajectory.groundDepthMeters);
    const beyondLineout = trajectory.groundDepthMeters > V3.depth.maximumMeters + 0.8;
    const ballTeam: LineoutResolutionTeam = notStraight
      ? "defendingTeam"
      : beyondLineout
        ? (this.rng.next() < 0.5 ? "throwingTeam" : "defendingTeam")
        : nearest?.side ?? (this.rng.next() < 0.5 ? "throwingTeam" : "defendingTeam");
    const outcome: LineoutResolution["outcome"] = notStraight
      ? "notStraight"
      : beyondLineout
        ? "looseBall"
        : ballTeam === "throwingTeam" ? "scrappyWin" : "deflectedTurnover";
    this.feedback = this.buildFeedback(nearest?.player.id);
    this.resolution = {
      outcome,
      ballTeam,
      restart: notStraight ? "scrum" : "continuousPlay",
      ...(notStraight ? { offendingTeam: "throwingTeam" as const } : {}),
      primaryReason: notStraight
        ? "lineout.v3.reason.notStraight"
        : beyondLineout
          ? "lineout.v3.reason.untouched"
          : "lineout.v3.reason.groundRecovery",
      details: {
        gameplayVersion: 3,
        groundDepthMeters: trajectory.groundDepthMeters,
        requestedDepthMeters: trajectory.requestedDepthMeters,
        actualDepthMeters: trajectory.actualDepthMeters,
        recoveryPlayerId: beyondLineout ? "" : nearest?.player.id ?? "",
        trajectory: trajectory.classification
      }
    };
    if (this.ball) this.ball.completed = true;
    return [{ type: "resolved", resolution: this.resolution, feedback: [...this.feedback] }];
  }

  private buildFeedback(catcherId?: string): LineoutV3Feedback[] {
    const trajectory = this.ball?.trajectory;
    if (!trajectory) return [];
    const feedback = new Set<LineoutV3Feedback>();
    const catcher = catcherId ? this.playersById.get(catcherId) : undefined;
    const plan = getV3CombinationPlan(this.setup.combination);
    const plannedJumpers = plan.phases.flatMap((phase, phaseIndex) => (
      phase.actions
        .filter((action) => action.type === "jump")
        .map((action) => ({
          phaseIndex,
          player: this.playersById.get(
            this.playerIdByAttackingPosition.get(action.playerPosition) ?? ""
          )
        }))
    )).filter((entry): entry is { phaseIndex: number; player: LineoutV3PlayerState } => (
      Boolean(entry.player)
    ));
    const nearestEntry = plannedJumpers.sort((left, right) => (
      Math.abs(left.player.position.depthMeters - trajectory.actualDepthMeters)
      - Math.abs(right.player.position.depthMeters - trajectory.actualDepthMeters)
    ))[0];
    const nearest = nearestEntry?.player;
    const depthDelta = nearest
      ? trajectory.actualDepthMeters - nearest.position.depthMeters
      : 0;
    if (depthDelta < -V3.reach.depthMeters) feedback.add("tooShort");
    if (depthDelta > V3.reach.depthMeters) feedback.add("tooLong");
    if (nearest) {
      const arrivalAtTargetMs = (this.ball?.releasedAtMs ?? 0)
        + trajectory.flightDurationMs * trajectory.actualDepthMeters / trajectory.groundDepthMeters;
      const expectedStartMs = (this.combinationStartedAtMs ?? 0)
        + V3.timing.combinationLeadMs
        + (nearestEntry?.phaseIndex ?? 0) * V3.timing.phaseDurationMs;
      const expectedDurationMs = this.interpolateByStat(
        this.effectiveStat(nearest, nearest.player.speed),
        V3.jump.maximumDurationMs,
        V3.jump.minimumDurationMs
      );
      const timing = nearest.lastJump ?? {
        startedAtMs: expectedStartMs,
        durationMs: expectedDurationMs
      };
      const apexMs = timing.startedAtMs + timing.durationMs / 2;
      const timingDelta = arrivalAtTargetMs - apexMs;
      if (Math.abs(timingDelta) <= 140) feedback.add("goodTiming");
      else if (timingDelta < 0) feedback.add("tooEarly");
      else feedback.add("tooLate");
    }
    if (trajectory.classification === "low") feedback.add("tooLow");
    if (trajectory.classification === "high") feedback.add("tooHigh");
    if (Math.abs(trajectory.lateralEndMeters) > V3.trajectory.notStraightLateralMeters * 0.5) {
      feedback.add("slightlyNotStraight");
    }
    if (catcher?.side === "throwingTeam" && feedback.size === 0) feedback.add("optimalCatch");
    return [...feedback];
  }

  private createTrajectory(gesture: LineoutV3ThrowGesture): LineoutV3BallTrajectory {
    const requestedDepthMeters = getLineoutV3DepthForGestureDistance(gesture.distancePixels);
    const requestedPosition = getLineoutV3PositionForDepth(requestedDepthMeters);
    const directCatch = requestedPosition === 1
      || !this.canTargetAerialCatchAtPosition(requestedPosition);
    const hookerFatigue = this.setup.fatigueByPlayerId[this.setup.throwingHooker.id] ?? 0;
    const effectiveThrowing = this.setup.throwingHooker.throwing * (1 - hookerFatigue / 100);
    const imprecision = clamp((100 - effectiveThrowing) / 40, 0, 1);
    const distanceRatio = requestedDepthMeters / V3.depth.maximumMeters;
    const depthAmplitude = this.interpolate(
      V3.throwing.minimumDepthErrorMeters,
      V3.throwing.maximumDepthErrorMeters,
      imprecision * (0.55 + distanceRatio * 0.45)
    );
    const lateralAmplitude = this.interpolate(
      V3.throwing.minimumLateralErrorMeters,
      V3.throwing.maximumLateralErrorMeters,
      imprecision * (0.4 + distanceRatio * 0.6)
    );
    const heightAmplitude = this.interpolate(
      V3.throwing.minimumHeightErrorMeters,
      V3.throwing.maximumHeightErrorMeters,
      imprecision
    );
    const actualDepthMeters = clamp(
      requestedDepthMeters + randomFloat(-depthAmplitude, depthAmplitude, this.rng),
      0.6,
      V3.depth.maximumMeters + 1.5
    );
    const lateralEndMeters = randomFloat(-lateralAmplitude, lateralAmplitude, this.rng);
    const heightError = randomFloat(-heightAmplitude, heightAmplitude, this.rng);
    const classification = Math.abs(lateralEndMeters) >= V3.trajectory.notStraightLateralMeters
      ? "notStraight" as const
      : heightError < -0.22
        ? "low" as const
        : heightError > 0.22
          ? "high" as const
          : "precise" as const;
    const preciseTargetHeight = directCatch
      ? V3.jump.standingHandHeightMeters
      : V3.trajectory.preciseTargetHeightMeters;
    const baseTargetHeight = classification === "low"
      ? directCatch
        ? Math.min(V3.trajectory.lowTargetHeightMeters, V3.jump.standingHandHeightMeters)
        : V3.trajectory.lowTargetHeightMeters
      : classification === "high"
        ? V3.trajectory.highTargetHeightMeters
        : preciseTargetHeight;
    const targetHeightMeters = clamp(baseTargetHeight + heightError, 1.9, 4.3);
    const groundDepthMeters = actualDepthMeters + V3.depth.ballContinuationMeters;
    const targetProgress = actualDepthMeters / groundDepthMeters;
    const controlHeightMeters = clamp(
      this.solveQuadraticControlHeight(targetProgress, targetHeightMeters),
      V3.trajectory.minimumControlHeightMeters,
      V3.trajectory.maximumControlHeightMeters
    );
    const flightDurationMs = clamp(
      V3.timing.baseFlightDurationMs + groundDepthMeters * V3.timing.flightDurationPerMeterMs,
      V3.timing.minimumFlightDurationMs,
      V3.timing.maximumFlightDurationMs
    );
    const quality = clamp(
      effectiveThrowing - distanceRatio * 8 - imprecision * Math.abs(heightError) * 12,
      0,
      100
    );
    return {
      requestedDepthMeters,
      actualDepthMeters,
      groundDepthMeters,
      controlHeightMeters,
      targetHeightMeters,
      lateralEndMeters,
      flightDurationMs,
      quality,
      classification
    };
  }

  private sampleBallPosition(trajectory: LineoutV3BallTrajectory, progress: number) {
    const inverse = 1 - progress;
    return {
      depthMeters: trajectory.groundDepthMeters * progress,
      lateralMeters: trajectory.lateralEndMeters * progress,
      heightMeters: inverse * inverse * V3.trajectory.startHeightMeters
        + 2 * inverse * progress * trajectory.controlHeightMeters
    };
  }

  private solveQuadraticControlHeight(progress: number, desiredHeight: number): number {
    const inverse = 1 - progress;
    const denominator = Math.max(0.001, 2 * inverse * progress);
    return (desiredHeight - inverse * inverse * V3.trajectory.startHeightMeters) / denominator;
  }

  private contactScore(contact: TimedContact, throwingTeam: boolean): number {
    const player = contact.player;
    const fatiguePenalty = player.fatiguePercent / 100 * V3.resolution.fatigueMaximumPenalty;
    const movementPenalty = contact.movingAtContact
      ? V3.resolution.movingCatchScorePenalty
      : 0;
    return this.effectiveStat(player, player.player.technique) * V3.resolution.techniqueWeight
      + contact.reachScore * V3.resolution.reachWeight
      + this.effectiveStat(player, player.player.speed) * V3.resolution.speedWeight
      + (throwingTeam ? V3.resolution.throwingTeamInitiative : 0)
      - fatiguePenalty
      - movementPenalty
      + randomFloat(-V3.resolution.randomAmplitude, V3.resolution.randomAmplitude, this.rng);
  }

  private ballDifficultyPenalty(): number {
    const classification = this.ball?.trajectory.classification;
    if (classification === "low") return 8;
    if (classification === "high") return 12;
    if (classification === "notStraight") return 6;
    return 0;
  }

  private bestContact(contacts: TimedContact[], side: LineoutResolutionTeam): TimedContact | undefined {
    return contacts
      .filter((contact) => contact.player.side === side)
      .sort((left, right) => right.reachScore - left.reachScore)[0];
  }

  private nearestAvailablePlayer(depthMeters: number): LineoutV3PlayerState | undefined {
    return [...this.playersById.values()]
      .filter((player) => player.activity !== "lifting")
      .sort((left, right) => (
        Math.abs(left.position.depthMeters - depthMeters)
        - Math.abs(right.position.depthMeters - depthMeters)
      ))[0];
  }

  private isAvailableLifter(candidate: LineoutV3PlayerState, jumper: LineoutV3PlayerState): boolean {
    return candidate.player.id !== jumper.player.id
      && candidate.side === jumper.side
      && !candidate.engagedByPlayerId
      && !candidate.hasJumped
      && candidate.activity === "ready"
      && Math.abs(candidate.position.depthMeters - jumper.position.depthMeters) <= V3.jump.lifterReachMeters;
  }

  private isMovableGroupLifter(
    candidate: LineoutV3PlayerState,
    jumper: LineoutV3PlayerState
  ): boolean {
    return candidate.player.id !== jumper.player.id
      && candidate.side === jumper.side
      && !candidate.engagedByPlayerId
      && !candidate.hasJumped
      && ["ready", "moving"].includes(candidate.activity)
      && Math.abs(this.getReservedDepth(candidate) - this.getReservedDepth(jumper))
        <= V3.jump.lifterReachMeters;
  }

  private findMovableGroupLifters(
    jumper: LineoutV3PlayerState
  ): LineoutV3PlayerState[] {
    const candidates = [...this.playersById.values()]
      .filter((candidate) => this.isMovableGroupLifter(candidate, jumper));
    return this.selectEligibleLifters(jumper, candidates);
  }

  private findEligibleLifters(jumper: LineoutV3PlayerState): LineoutV3PlayerState[] {
    const candidates = [...this.playersById.values()]
      .filter((candidate) => this.isAvailableLifter(candidate, jumper));
    return this.selectEligibleLifters(jumper, candidates);
  }

  private findEligibleDefensiveJumpLifters(
    jumper: LineoutV3PlayerState
  ): LineoutV3PlayerState[] {
    const candidates = [...this.playersById.values()]
      .filter((candidate) => (
        candidate.player.id !== jumper.player.id
        && candidate.side === jumper.side
        && !candidate.engagedByPlayerId
        && !candidate.hasJumped
        && ["ready", "moving"].includes(candidate.activity)
        && Math.abs(candidate.position.depthMeters - jumper.position.depthMeters)
          <= V3.jump.lifterReachMeters
      ));
    return this.selectEligibleLifters(jumper, candidates, true);
  }

  private selectEligibleLifters(
    jumper: LineoutV3PlayerState,
    candidates: readonly LineoutV3PlayerState[],
    useCurrentDepth = false
  ): LineoutV3PlayerState[] {
    const getDepth = (player: LineoutV3PlayerState): number => (
      useCurrentDepth ? player.position.depthMeters : this.getReservedDepth(player)
    );
    const jumperDepth = getDepth(jumper);
    const frontLifter = candidates
      .filter((candidate) => getDepth(candidate) < jumperDepth)
      .sort((left, right) => getDepth(right) - getDepth(left))[0];
    const rearLifter = candidates
      .filter((candidate) => getDepth(candidate) > jumperDepth)
      .sort((left, right) => getDepth(left) - getDepth(right))[0];
    if (!isLineoutV3AerialStructureEligible(
      jumper.player,
      frontLifter?.player,
      rearLifter?.player,
      jumper.side === "defendingTeam"
    )) return [];
    return [frontLifter, rearLifter]
      .filter((player): player is LineoutV3PlayerState => player !== undefined);
  }

  private stopMovementForJump(player: LineoutV3PlayerState): void {
    if (player.activity !== "moving") return;
    player.movement = undefined;
    player.activity = "ready";
  }

  private assignMovement(
    player: LineoutV3PlayerState,
    destinationDepthMeters: number,
    ignoredPlayerIds: ReadonlySet<string> = new Set(),
    speedMetersPerSecond?: number,
    phaseMovementDestinations: PhaseMovementDestinations = new Map()
  ): void {
    const requestedDestination = clamp(
      destinationDepthMeters,
      V3.depth.minimumMeters,
      V3.depth.maximumMeters
    );
    const destination = this.findFreeDestination(player, requestedDestination, ignoredPlayerIds);
    const waypoints = this.buildMovementWaypoints(
      player,
      destination,
      ignoredPlayerIds,
      phaseMovementDestinations
    );
    player.movement = {
      destinationDepthMeters: destination,
      waypoints,
      waypointIndex: 0,
      ...(speedMetersPerSecond === undefined ? {} : { speedMetersPerSecond })
    };
    player.activity = "moving";
  }

  private findFreeDestination(
    player: LineoutV3PlayerState,
    requestedDestination: number,
    ignoredPlayerIds: ReadonlySet<string>
  ): number {
    const requestedPosition = getLineoutV3PositionForDepth(requestedDestination);
    const currentPosition = this.getReservedPosition(player);
    const direction = Math.sign(requestedPosition - currentPosition);
    const occupiedPositions = new Set([...this.playersById.values()]
      .filter((candidate) => (
        candidate.player.id !== player.player.id
        && candidate.side === player.side
        && !ignoredPlayerIds.has(candidate.player.id)
      ))
      .map((candidate) => this.getReservedPosition(candidate)));
    const destinationPosition = this.sortedLineoutPositions(requestedPosition, direction)
      .find((position) => !occupiedPositions.has(position))
      ?? currentPosition;
    return this.depthForPosition(destinationPosition);
  }

  private findFreeGroupDestinations(
    group: readonly LineoutV3PlayerState[],
    jumper: LineoutV3PlayerState,
    requestedDepthMeters: number,
    groupPlayerIds: ReadonlySet<string>
  ): Map<string, number> | null {
    const jumperPosition = this.getReservedPosition(jumper);
    const requestedPosition = getLineoutV3PositionForDepth(requestedDepthMeters);
    const direction = Math.sign(requestedPosition - jumperPosition);
    const relativePositions = group.map((player) => ({
      player,
      offset: this.getReservedPosition(player) - jumperPosition
    }));
    const occupiedPositions = new Set([...this.playersById.values()]
      .filter((candidate) => (
        candidate.side === jumper.side
        && !groupPlayerIds.has(candidate.player.id)
      ))
      .map((candidate) => this.getReservedPosition(candidate)));

    const destinationJumperPosition = this.sortedLineoutPositions(requestedPosition, direction)
      .find((candidatePosition) => {
        const groupPositions = relativePositions.map(({ offset }) => candidatePosition + offset);
        return groupPositions.every((position) => (
          position >= 1
          && position <= 7
          && !occupiedPositions.has(position as LineoutPosition)
        )) && new Set(groupPositions).size === groupPositions.length;
      });
    if (!destinationJumperPosition) return null;

    return new Map(relativePositions.map(({ player, offset }) => [
      player.player.id,
      this.depthForPosition((destinationJumperPosition + offset) as LineoutPosition)
    ]));
  }

  private getReservedPosition(player: LineoutV3PlayerState): LineoutPosition {
    return getLineoutV3PositionForDepth(this.getReservedDepth(player));
  }

  private getReservedDepth(player: LineoutV3PlayerState): number {
    return player.movement?.destinationDepthMeters ?? player.position.depthMeters;
  }

  private sortedLineoutPositions(
    requestedPosition: LineoutPosition,
    direction: number
  ): LineoutPosition[] {
    return ([1, 2, 3, 4, 5, 6, 7] as LineoutPosition[]).sort((left, right) => {
      const distanceDifference = Math.abs(left - requestedPosition) - Math.abs(right - requestedPosition);
      if (distanceDifference !== 0) return distanceDifference;
      if (direction > 0) return left - right;
      if (direction < 0) return right - left;
      return left - right;
    });
  }

  private buildMovementWaypoints(
    player: LineoutV3PlayerState,
    destinationDepthMeters: number,
    ignoredPlayerIds: ReadonlySet<string>,
    phaseMovementDestinations: PhaseMovementDestinations
  ) {
    const movingTowardHooker = destinationDepthMeters < player.position.depthMeters;
    const movementDirection = Math.sign(destinationDepthMeters - player.position.depthMeters);
    const blockingPlayer = [...this.playersById.values()]
      .filter((candidate) => (
        candidate.player.id !== player.player.id
        && candidate.side === player.side
        && !ignoredPlayerIds.has(candidate.player.id)
      ))
      .filter((candidate) => {
        const liesBetween = movingTowardHooker
          ? candidate.position.depthMeters < player.position.depthMeters
            && candidate.position.depthMeters > destinationDepthMeters
          : candidate.position.depthMeters > player.position.depthMeters
            && candidate.position.depthMeters < destinationDepthMeters;
        const candidateDestination = phaseMovementDestinations.get(candidate.player.id)
          ?? candidate.movement?.destinationDepthMeters;
        const candidateDirection = candidateDestination === undefined
          ? 0
          : Math.sign(candidateDestination - candidate.position.depthMeters);
        return liesBetween
          && candidateDirection !== movementDirection
          && Math.abs(candidate.position.lateralMeters - player.position.lateralMeters)
            < V3.movement.avoidanceClearanceMeters;
      })
      .sort((left, right) => (
        Math.abs(left.position.depthMeters - player.position.depthMeters)
        - Math.abs(right.position.depthMeters - player.position.depthMeters)
      ))[0];
    if (!blockingPlayer) {
      return [{ depthMeters: destinationDepthMeters, lateralMeters: player.standingLateralMeters }];
    }
    const exteriorDirection = Math.sign(player.standingLateralMeters) || 1;
    const exteriorLateral = player.standingLateralMeters
      + exteriorDirection * V3.movement.avoidanceLateralMeters;
    return [
      {
        depthMeters: blockingPlayer.position.depthMeters
          + (movingTowardHooker ? 1 : -1) * V3.movement.avoidanceClearanceMeters,
        lateralMeters: exteriorLateral
      },
      {
        depthMeters: blockingPlayer.position.depthMeters
          + (movingTowardHooker ? -1 : 1) * V3.movement.avoidanceClearanceMeters,
        lateralMeters: exteriorLateral
      },
      { depthMeters: destinationDepthMeters, lateralMeters: player.standingLateralMeters }
    ];
  }

  private canMove(player: LineoutV3PlayerState): boolean {
    return !player.engagedByPlayerId && !player.hasJumped && ["ready", "moving"].includes(player.activity);
  }

  private movementSpeed(player: LineoutV3PlayerState): number {
    const ownSpeed = player.movement?.speedMetersPerSecond ?? this.baseMovementSpeed(player);
    const destination = player.movement?.destinationDepthMeters;
    if (destination === undefined) return ownSpeed;
    const direction = Math.sign(destination - player.position.depthMeters);
    if (direction === 0) return ownSpeed;
    const maximumAheadDistance = Math.abs(destination - player.position.depthMeters)
      + V3.movement.minimumPlayerSeparationMeters;
    const leader = [...this.playersById.values()]
      .filter((candidate) => (
        candidate.player.id !== player.player.id
        && candidate.side === player.side
        && candidate.activity === "moving"
        && candidate.movement !== undefined
      ))
      .filter((candidate) => {
        const aheadDistance = (candidate.position.depthMeters - player.position.depthMeters) * direction;
        const candidateDirection = Math.sign(
          (candidate.movement?.destinationDepthMeters ?? candidate.position.depthMeters)
            - candidate.position.depthMeters
        );
        return aheadDistance > 0
          && aheadDistance <= maximumAheadDistance
          && candidateDirection === direction
          && Math.abs(candidate.position.lateralMeters - player.position.lateralMeters)
            < V3.movement.avoidanceClearanceMeters;
      })
      .sort((left, right) => (
        Math.abs(left.position.depthMeters - player.position.depthMeters)
        - Math.abs(right.position.depthMeters - player.position.depthMeters)
      ))[0];
    const leaderSpeed = leader
      ? leader.movement?.speedMetersPerSecond ?? this.baseMovementSpeed(leader)
      : ownSpeed;
    return Math.min(ownSpeed, leaderSpeed);
  }

  private baseMovementSpeed(player: LineoutV3PlayerState): number {
    const effectiveSpeed = this.effectiveStat(player, player.player.speed);
    if (effectiveSpeed <= 50) {
      return this.interpolate(
        V3.movement.minimumMetersPerSecond,
        V3.movement.middleMetersPerSecond,
        effectiveSpeed / 50
      );
    }
    return this.interpolate(
      V3.movement.middleMetersPerSecond,
      V3.movement.maximumMetersPerSecond,
      (effectiveSpeed - 50) / 50
    );
  }

  private effectiveStat(player: LineoutV3PlayerState, stat: number): number {
    return clamp(stat * (1 - player.fatiguePercent / 100), 0, 100);
  }

  private depthForPosition(position: LineoutPosition): number {
    return getLineoutV3DepthForPosition(position);
  }

  private interpolateByStat(stat: number, minimum: number, maximum: number): number {
    return this.interpolate(minimum, maximum, clamp(stat, 0, 100) / 100);
  }

  private interpolate(minimum: number, maximum: number, ratio: number): number {
    return minimum + (maximum - minimum) * ratio;
  }
}
