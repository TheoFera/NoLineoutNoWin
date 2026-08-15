import Phaser from "phaser";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { GameStore } from "../state/GameStore";
import { getDivision } from "../rules/DivisionRules";
import { getCurrentOpponentId, isCurrentMatchAtHome } from "../rules/ChampionshipRules";
import { generateOpponentById } from "../ai/OpponentGenerator";
import {
  advanceMatchSimulationWithTrace,
  advanceToNextScheduledLineoutWithTrace,
  generateMatchSchedule,
  generateMatchMaximumFatigue,
  getKickoffReceptionLateralPosition,
  getKickoffReceptionPosition,
  getPitchZoneFromPosition,
  getRealSecondsForSimulatedMinutes,
  startSecondHalf
} from "../rules/MatchSimulator";
import {
  getActiveOffensiveCombinations,
  hasValidCombinationForMatch,
  isCombinationValidForMatch,
  normalizeOffensiveCombinations
} from "../rules/CombinationRules";
import { rebuildPlayableCombinationTargets } from "../rules/LineoutCombinationAssignment";
import { createEmptyUsage } from "../rules/PlayerProgression";
import type { MatchSimulationAction, MatchStateData } from "../models/Match";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { getContrastingOpponentColors } from "../ui/JerseyColorContrast";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { MatchScoreOverlay } from "../ui/MatchScoreOverlay";
import { formatMatchMinute } from "../ui/MatchScoreOverlayLayout";
import { MatchStatsOverlay } from "../ui/MatchStatsOverlay";
import {
  preloadMatchPitchBackdrop,
  getMatchPitchAppearance,
  renderMatchPitchBackdrop,
  renderPitchSurface
} from "../ui/MatchPitchBackdrop";

type MatchLineoutEvent = MatchStateData["lineouts"][number];
type BallOrientation = "vertical" | "trajectory" | "horizontal";

const SIMULATION_FIELD = {
  left: 46,
  right: 344,
  top: 296,
  bottom: 724,
  tryLineTop: 320,
  tryLineBottom: 700,
  centerX: 195,
  centerY: 510,
  width: 298,
  height: 428,
  playingHeight: 380,
  lateralRange: 139
} as const;

const SIMULATION_DEPTH = {
  ball: 20,
  goalPosts: 30,
  halfTimePanel: 40,
  tryCelebration: 50
} as const;

export class MatchScene extends Phaser.Scene {
  private scoreOverlay?: MatchScoreOverlay;
  private simulationBall?: Phaser.GameObjects.Image;
  private ballPositionText?: Phaser.GameObjects.Text;
  private simulationActionText?: Phaser.GameObjects.Text;

  constructor() {
    super("MatchScene");
  }

  preload(): void {
    preloadMatchPitchBackdrop(this);
    if (!this.textures.exists("lineout-ball")) {
      this.load.image("lineout-ball", "assets/sprites/ball.png");
    }
  }

  create(): void {
    const save = GameStore.getSave();
    let match = GameStore.getMatch();

    const playableActiveCombinations = getActiveOffensiveCombinations(
      normalizeOffensiveCombinations(save.offensiveCombinations),
      save.offensiveRepertoire
    )
      .filter(isCombinationValidForMatch)
      .map((combination) => rebuildPlayableCombinationTargets(
        combination,
        save.playerTeam.lineoutPlayers
      ))
      .filter((combination) => (combination.targetOptions?.length ?? 0) > 0);
    if (!hasValidCombinationForMatch(playableActiveCombinations)) {
      this.renderMissingValidCombination();
      return;
    }

    const division = getDivision(save.currentDivisionId);
    const scheduledOpponentId = getCurrentOpponentId(save.championship) ?? "opponent_1";
    const opponent = GameStore.getOrStoreOpponentTeam(
      generateOpponentById(scheduledOpponentId, division)
    );
    if (!match) {
      const schedule = generateMatchSchedule(division);
      const firstHalfReceivingTeam = schedule.firstHalfKickoffTeam === "player"
        ? "opponent"
        : "player";
      match = {
        id: `match_${Date.now()}`,
        divisionId: division.id,
        home: save.playerTeam,
        away: opponent,
        minute: 0,
        maxMinute: schedule.maxMinute,
        halfTimeMinute: schedule.halfTimeMinute,
        halfTimeCompleted: false,
        firstHalfKickoffTeam: schedule.firstHalfKickoffTeam,
        ourScore: 0,
        opponentScore: 0,
        possession: 50,
        occupation: 50,
        ballOwner: firstHalfReceivingTeam,
        ballPositionMeters: getKickoffReceptionPosition(firstHalfReceivingTeam),
        ballLateralPosition: getKickoffReceptionLateralPosition(),
        ballLateralDirection: 0,
        possessionDurationMinutes: 0,
        playerPossessionTimeMinutes: 0,
        opponentPossessionTimeMinutes: 0,
        playerOccupationTimeMinutes: 0,
        opponentOccupationTimeMinutes: 0,
        playerAttackingPressure: 0,
        opponentAttackingPressure: 0,
        lineouts: schedule.lineouts,
        currentLineoutIndex: 0,
        playerUsage: {
          [save.playerTeam.hooker.id]: createEmptyUsage()
        },
        combinationStats: {},
        opponentCombinationStats: {},
        lineoutHistory: [],
        maximumFatigueByPlayerId: generateMatchMaximumFatigue(save.playerTeam, opponent)
      } satisfies MatchStateData;
      GameStore.setMatch(match);
    }

    this.render(match);
  }

  private renderMissingValidCombination(): void {
    renderMenuBackdrop(this);
    this.add.text(195, 330, t("match.cannotStartTitle"), {
      font: UI.font.title,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);
    this.add.text(195, 410, t("match.cannotStartCombination"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    new UIButton(this, 195, 500, 280, 52, t("button.combinations"), () => {
      navigateTo(this, "CombinationListScene");
    });
  }

  private render(match: MatchStateData): void {
    const save = GameStore.getSave();
    const isHomeMatch = isCurrentMatchAtHome(save.championship);
    const pitchAppearance = getMatchPitchAppearance(
      isHomeMatch ? match.home.id : match.away.id,
      match.id,
      isHomeMatch
    );
    renderMatchPitchBackdrop(this, 0.5, pitchAppearance);

    const next = match.lineouts[match.currentLineoutIndex];
    const simulationPending = next
      ? match.minute < next.minute
      : match.minute < match.maxMinute;

    if (match.pendingTryCelebration) {
      this.renderScoreboard(match);
      this.renderSimulationBoard(match);
      this.startPendingTryCelebration(match);
      return;
    }

    if (!match.halfTimeCompleted && match.minute >= match.halfTimeMinute) {
      this.renderScoreboard(match);
      this.renderSimulationBoard(match);
      this.startHalfTimePause(match);
      return;
    }

    if (!simulationPending && next) {
      navigateTo(this, "LineoutScene", { mode: "match" });
      return;
    }

    this.renderScoreboard(match, simulationPending ? undefined : next);

    if (simulationPending) {
      this.renderSimulationBoard(match);
      this.startAcceleratedSimulation(match);
      return;
    }

    if (!next) {
      this.renderFullTimePanel();
      return;
    }

  }

  private renderScoreboard(match: MatchStateData, next?: MatchLineoutEvent): void {
    const minute = next?.minute ?? match.minute;
    const roundedPossession = Math.round(match.possession);
    const roundedOccupation = Math.round(match.occupation);
    const opponentColors = getContrastingOpponentColors(match.home.colors, match.away.colors);
    const pitchZone = next?.pitchZone ?? getPitchZoneFromPosition(match.ballPositionMeters);

    this.scoreOverlay = new MatchScoreOverlay(this, {
      homeName: match.home.name,
      awayName: match.away.name,
      homeScore: match.ourScore,
      awayScore: match.opponentScore,
      minuteLabel: formatMatchMinute(minute),
      homeColors: match.home.colors,
      awayColors: opponentColors
    });

    new MatchStatsOverlay(this, {
      possessionLabel: t("match.possession"),
      occupationLabel: t("match.occupation"),
      zoneLabel: t("match.zone"),
      zoneValue: t(`match.zone.${pitchZone}`),
      possession: roundedPossession,
      occupation: roundedOccupation,
      homeColors: match.home.colors,
      awayColors: opponentColors
    });
  }

  private renderSimulationBoard(match: MatchStateData): void {
    const field = SIMULATION_FIELD;
    const save = GameStore.getSave();
    const isHomeMatch = isCurrentMatchAtHome(save.championship);
    const pitchAppearance = getMatchPitchAppearance(
      isHomeMatch ? match.home.id : match.away.id,
      match.id,
      isHomeMatch
    );
    renderPitchSurface(this, field.centerX, field.centerY, field.width, field.height, pitchAppearance);
    this.add.rectangle(field.centerX, field.centerY, field.width, field.height, 0x052e16, 0.18)
      .setStrokeStyle(3, 0xf8fafc, 0.9);
    this.renderInGoalAreas();
    this.renderPixelGoalPosts();
    this.renderLongitudinalPitchMarkings();
    for (const meter of [22, 50, 78]) {
      const y = this.getPitchY(meter);
      this.add.rectangle(
        field.centerX,
        y,
        field.width - 4,
        meter === 50 ? 3 : 2,
        0xffffff,
        meter === 50 ? 0.8 : 0.45
      );
      this.add.text(field.left + 18, y - 10, String(meter), {
        font: "bold 10px Arial",
        color: "#e2e8f0"
      }).setOrigin(0.5);
    }
    for (const meter of [5, 40, 60, 95]) {
      this.renderDashedTransverseLine(this.getPitchY(meter));
    }
    this.add.text(195, 236, t("match.simulationInProgress"), {
      font: "bold 22px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.rectangle(195, 266, 270, 26, 0x07111a, 0.9)
      .setStrokeStyle(1, 0x64748b, 0.8);
    const initialActionKey = match.minute === 0
      ? "match.action.restart"
      : "match.action.handPlay";
    this.simulationActionText = this.add.text(195, 266, t(initialActionKey), {
      font: "bold 12px Arial",
      color: "#fde68a"
    }).setOrigin(0.5);
    const pendingTry = match.pendingTryCelebration;
    const displayedOwner = pendingTry?.scoringOwner ?? match.ballOwner;
    const ownerColors = this.getDisplayedTeamColors(match, displayedOwner);
    const isInitialKickoff = match.minute === 0;
    const ballX = pendingTry
      ? this.getPitchX(pendingTry.lateralPosition)
      : isInitialKickoff
      ? SIMULATION_FIELD.centerX
      : this.getPitchX(match.ballLateralPosition);
    const displayedBallPosition = pendingTry
      ? pendingTry.scoringOwner === "player" ? 100 : 0
      : isInitialKickoff
        ? LINEOUT_BALANCE.match.restartPositionMeters
        : match.ballPositionMeters;
    const ballY = this.getPitchY(displayedBallPosition);
    this.simulationBall = this.add.image(ballX, ballY, "lineout-ball")
      .setDisplaySize(16, 23)
      .setDepth(SIMULATION_DEPTH.ball);
    if (isInitialKickoff && !pendingTry) {
      this.setSimulationBallLooseStyle();
    } else {
      this.simulationBall.setTint(ownerColors.primary);
    }
    this.ballPositionText = this.add.text(195, 754, t("match.ballPosition")
      .replace(
        "{meters}",
        String(Math.round(
          displayedBallPosition
        ))
      ), {
      font: UI.font.body,
      color: UI.colors.text
    }).setOrigin(0.5);
  }

  private startAcceleratedSimulation(match: MatchStateData): void {
    const nextLineout = match.lineouts[match.currentLineoutIndex];
    const normalTargetMinute = nextLineout?.minute ?? match.maxMinute;
    const mustStopForHalfTime = !match.halfTimeCompleted
      && match.minute < match.halfTimeMinute
      && normalTargetMinute >= match.halfTimeMinute;
    const trace = mustStopForHalfTime
      ? advanceMatchSimulationWithTrace(match, match.halfTimeMinute)
      : advanceToNextScheduledLineoutWithTrace(match);
    const target = trace.match;
    const simulatedMinutes = Math.max(0, target.minute - match.minute);
    const tryCount = this.getTryActionIndexes(match, trace.actions).size;
    const duration = getRealSecondsForSimulatedMinutes(simulatedMinutes) * 1000
      + tryCount * LINEOUT_BALANCE.match.visualSimulation.tryCelebrationExtraDurationMs;
    if (duration <= 0) {
      GameStore.setMatch(target);
      this.scene.restart();
      return;
    }
    this.playSimulationActions(match, trace.actions, duration);
    this.tweens.addCounter({
      from: match.minute,
      to: target.minute,
      duration,
      ease: "Linear",
      onUpdate: (tween) => {
        this.scoreOverlay?.setMinute(formatMatchMinute(tween.getValue() ?? match.minute));
        if (this.simulationBall) {
          const meters = (
            (SIMULATION_FIELD.tryLineBottom - this.simulationBall.y)
            / SIMULATION_FIELD.playingHeight
          ) * 100;
          this.ballPositionText?.setText(t("match.ballPosition")
            .replace("{meters}", String(Math.round(Phaser.Math.Clamp(meters, 0, 100)))));
        }
      },
      onComplete: () => {
        GameStore.setMatch(target);
        this.scene.restart();
      }
    });
  }

  private startHalfTimePause(match: MatchStateData): void {
    const visualConfig = LINEOUT_BALANCE.match.visualSimulation;
    this.updateSimulationActionText("match.action.halfTime");
    this.scoreOverlay?.setMinute(t("match.halfTimeShort"));

    const panel = this.add.rectangle(195, 510, 238, 82, 0x07111a, 0.96)
      .setStrokeStyle(3, 0xfde047, 0.95)
      .setDepth(SIMULATION_DEPTH.halfTimePanel);
    const label = this.add.text(195, 510, t("match.halfTime"), {
      font: "bold 28px Arial",
      color: "#fde047",
      stroke: "#020617",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(SIMULATION_DEPTH.halfTimePanel);

    this.time.delayedCall(visualConfig.halfTimePauseDurationMs, () => {
      panel.setVisible(false);
      label.setVisible(false);
      const restartedMatch = startSecondHalf(match);
      GameStore.setMatch(restartedMatch);
      this.scoreOverlay?.setMinute(formatMatchMinute(restartedMatch.minute));
      this.updateSimulationActionText("match.action.secondHalfKickoff");
      this.simulationBall?.setPosition(
        SIMULATION_FIELD.centerX,
        this.getPitchY(LINEOUT_BALANCE.match.restartPositionMeters)
      );
      this.setSimulationBallLooseStyle();
      this.animateBallFlight(
        this.getPitchX(restartedMatch.ballLateralPosition),
        this.getPitchY(restartedMatch.ballPositionMeters),
        visualConfig.restartArcHeightPixels,
        visualConfig.halfTimeKickoffDurationMs,
        restartedMatch,
        true,
        () => this.scene.restart(),
        "trajectory"
      );
    });
  }

  private startPendingTryCelebration(match: MatchStateData): void {
    const pendingTry = match.pendingTryCelebration;
    if (!pendingTry) return;
    const visualConfig = LINEOUT_BALANCE.match.visualSimulation;
    const nextMatch: MatchStateData = {
      ...match,
      pendingTryCelebration: undefined
    };
    const actionKey = pendingTry.points === LINEOUT_BALANCE.match.points.convertedTry
      ? "match.action.convertedTryScored"
      : "match.action.tryScored";
    this.updateSimulationActionText(actionKey);
    this.showTryCelebration(
      match,
      pendingTry.scoringOwner,
      visualConfig.tryCelebrationDisplayDurationMs
    );

    this.time.delayedCall(visualConfig.tryCelebrationDisplayDurationMs, () => {
      const concedingOwner = pendingTry.scoringOwner === "player" ? "opponent" : "player";
      GameStore.setMatch(nextMatch);
      this.simulationBall?.setPosition(
        SIMULATION_FIELD.centerX,
        this.getPitchY(LINEOUT_BALANCE.match.restartPositionMeters)
      );
      this.setSimulationBallTeamStyle(nextMatch, concedingOwner);
      this.updateSimulationActionText("match.action.restart");
      this.animateBallFlight(
        this.getPitchX(nextMatch.ballLateralPosition),
        this.getPitchY(nextMatch.ballPositionMeters),
        visualConfig.restartArcHeightPixels,
        visualConfig.halfTimeKickoffDurationMs,
        nextMatch,
        true,
        () => this.scene.restart(),
        "trajectory"
      );
    });
  }

  private renderPixelGoalPosts(): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.goalPosts);
    const drawUpwardPosts = (goalLineY: number): void => {
      const uprightHeight = 34;
      const uprightTop = goalLineY - uprightHeight;
      const crossbarY = goalLineY - 14;

      graphics.fillStyle(0x020617, 0.65);
      graphics.fillRect(SIMULATION_FIELD.centerX - 20, uprightTop + 2, 6, uprightHeight);
      graphics.fillRect(SIMULATION_FIELD.centerX + 16, uprightTop + 2, 6, uprightHeight);
      graphics.fillRect(SIMULATION_FIELD.centerX - 20, crossbarY + 2, 42, 6);

      graphics.fillStyle(0xf8fafc, 1);
      graphics.fillRect(SIMULATION_FIELD.centerX - 22, uprightTop, 6, uprightHeight);
      graphics.fillRect(SIMULATION_FIELD.centerX + 14, uprightTop, 6, uprightHeight);
      graphics.fillRect(SIMULATION_FIELD.centerX - 22, crossbarY, 42, 6);

      graphics.fillStyle(0xcbd5e1, 1);
      graphics.fillRect(SIMULATION_FIELD.centerX - 20, uprightTop + 2, 2, uprightHeight - 4);
      graphics.fillRect(SIMULATION_FIELD.centerX + 16, uprightTop + 2, 2, uprightHeight - 4);
    };

    drawUpwardPosts(SIMULATION_FIELD.tryLineTop);
    drawUpwardPosts(SIMULATION_FIELD.tryLineBottom);
  }

  private renderInGoalAreas(): void {
    const field = SIMULATION_FIELD;
    const inGoalHeight = field.tryLineTop - field.top;
    for (const centerY of [
      field.top + inGoalHeight / 2,
      field.bottom - inGoalHeight / 2
    ]) {
      this.add.rectangle(field.centerX, centerY, field.width - 4, inGoalHeight, 0x166534, 0.38);
    }
    for (const tryLineY of [field.tryLineTop, field.tryLineBottom]) {
      this.add.rectangle(field.centerX, tryLineY, field.width - 4, 4, 0xffffff, 0.92);
    }
  }

  private renderLongitudinalPitchMarkings(): void {
    const field = SIMULATION_FIELD;
    for (const distanceFromTouch of [5, 15]) {
      const offsetX = field.width / 2 - (distanceFromTouch / 70) * field.width;
      for (const direction of [-1, 1]) {
        const x = field.centerX + direction * offsetX;
        for (let y = field.tryLineTop + 5; y < field.tryLineBottom; y += 12) {
          this.add.rectangle(x, y, 2, 6, 0xffffff, distanceFromTouch === 15 ? 0.4 : 0.28);
        }
      }
    }
  }

  private renderDashedTransverseLine(y: number): void {
    for (let x = SIMULATION_FIELD.left + 7; x < SIMULATION_FIELD.right - 4; x += 14) {
      this.add.rectangle(x, y, 8, 2, 0xffffff, 0.34);
    }
  }

  private playSimulationActions(
    initial: MatchStateData,
    actions: MatchSimulationAction[],
    totalDuration: number
  ): void {
    if (!this.simulationBall || actions.length === 0) return;
    const hasInitialKickoff = initial.minute === 0;
    const kickoffWeight = hasInitialKickoff ? 1.8 : 0;
    const tryActionIndexes = this.getTryActionIndexes(initial, actions);
    const celebrationExtraDuration = LINEOUT_BALANCE.match.visualSimulation
      .tryCelebrationExtraDurationMs;
    const distributableDuration = Math.max(
      0,
      totalDuration - tryActionIndexes.size * celebrationExtraDuration
    );
    const weights = actions.map((action) => {
      if (action.kind === "score") return 2.5;
      if (["breakthrough", "clearanceKick", "lineout"].includes(action.kind)) return 1.8;
      return 1;
    });
    const totalWeight = kickoffWeight + weights.reduce((sum, weight) => sum + weight, 0);

    const playAction = (index: number): void => {
      const action = actions[index];
      if (!action) return;
      const previous = index === 0 ? initial : actions[index - 1].state;
      const actionDuration = distributableDuration * weights[index] / totalWeight
        + (tryActionIndexes.has(index) ? celebrationExtraDuration : 0);
      const next = () => playAction(index + 1);

      if (action.kind === "score") {
        this.updateDisplayedScore(action.state);
        this.updateSimulationActionText(this.getScoreActionKey(previous, action.state));
        this.animateScoringRestart(previous, action.state, actionDuration, next);
        return;
      }
      this.animateOpenPlayAction(action, previous, index, actionDuration, next);
    };

    if (hasInitialKickoff) {
      this.updateSimulationActionText("match.action.restart");
      this.animateBallFlight(
        this.getPitchX(initial.ballLateralPosition),
        this.getPitchY(initial.ballPositionMeters),
        LINEOUT_BALANCE.match.visualSimulation.restartArcHeightPixels,
        distributableDuration * kickoffWeight / totalWeight,
        initial,
        true,
        () => playAction(0),
        "trajectory"
      );
      return;
    }

    playAction(0);
  }

  private animateOpenPlayAction(
    action: MatchSimulationAction,
    previous: MatchStateData,
    actionIndex: number,
    actionDuration: number,
    onComplete: () => void
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const targetY = this.getPitchY(action.state.ballPositionMeters);
    const direction = actionIndex % 2 === 0 ? -1 : 1;
    const openPlayTargetX = this.getPitchX(action.state.ballLateralPosition);
    const lineoutDirection = Math.sign(action.state.ballLateralPosition ?? 0) || direction;
    const targetX = action.kind === "lineout"
      ? SIMULATION_FIELD.centerX + lineoutDirection * (SIMULATION_FIELD.width / 2 - 6)
      : openPlayTargetX;
    const arcHeight = action.kind === "clearanceKick"
      ? LINEOUT_BALANCE.match.visualSimulation.kickArcHeightPixels
      : action.kind === "lineout"
        ? 18
        : 5;
    const flightDuration = actionDuration
      * LINEOUT_BALANCE.match.visualSimulation.ballFlightDurationRatio;

    this.updateSimulationActionFor(action);
    if (action.kind === "handPlay" || action.kind === "turnover") {
      this.animatePassAndCarry(
        previous,
        action.state,
        targetX,
        targetY,
        actionDuration,
        onComplete
      );
      return;
    }
    if (action.kind === "ruck") {
      this.animateRuck(action.state, actionDuration, onComplete);
      return;
    }
    const ballIsLoose = action.kind === "clearanceKick";
    this.animateBallFlight(
      targetX,
      targetY,
      arcHeight,
      flightDuration,
      action.state,
      ballIsLoose,
      () => {
        this.time.delayedCall(Math.max(0, actionDuration - flightDuration), onComplete);
      },
      action.kind === "clearanceKick" || action.kind === "lineout"
        ? "trajectory"
        : "vertical"
    );
  }

  private animateRuck(
    state: MatchStateData,
    duration: number,
    onComplete: () => void
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;

    ball.setRotation(Math.PI / 2);
    this.setSimulationBallTeamStyle(state, state.ballOwner);
    this.time.delayedCall(Math.max(1, duration), onComplete);
  }

  private animatePassAndCarry(
    previous: MatchStateData,
    arrivalState: MatchStateData,
    targetX: number,
    targetY: number,
    actionDuration: number,
    onComplete: () => void
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const visualConfig = LINEOUT_BALANCE.match.visualSimulation;
    const lateralDistancePixels = Math.abs(targetX - ball.x);
    const minimumLateralDistance = visualConfig.passLateralStepMinimum
      * SIMULATION_FIELD.lateralRange;
    const maximumLateralDistance = visualConfig.passLateralStepMaximum
      * SIMULATION_FIELD.lateralRange;
    const distanceRatio = Phaser.Math.Clamp(
      (lateralDistancePixels - minimumLateralDistance)
      / Math.max(1, maximumLateralDistance - minimumLateralDistance),
      0,
      1
    );
    const minimumAngleProbability = Phaser.Math.Linear(
      visualConfig.passMinimumAngleProbabilityAtMinimumDistance,
      visualConfig.passMinimumAngleProbabilityAtMaximumDistance,
      distanceRatio
    );
    const depthAngleDegrees = Phaser.Math.FloatBetween(0, 1) < minimumAngleProbability
      ? visualConfig.passDepthMinimumAngleDegrees
      : Phaser.Math.FloatBetween(
        visualConfig.passDepthRandomMinimumAngleDegrees,
        visualConfig.passDepthMaximumAngleDegrees
      );
    const backwardDistancePixels = lateralDistancePixels
      * Math.tan(Phaser.Math.DegToRad(depthAngleDegrees));
    const ownerDirection = previous.ballOwner === "player" ? 1 : -1;
    const passTargetY = Phaser.Math.Clamp(
      ball.y + ownerDirection * backwardDistancePixels,
      SIMULATION_FIELD.top,
      SIMULATION_FIELD.bottom
    );
    const passDurationRatio = Phaser.Math.FloatBetween(
      visualConfig.passDurationRatioMinimum,
      visualConfig.passDurationRatioMaximum
    );
    const passDuration = actionDuration * passDurationRatio;
    const carryDuration = actionDuration - passDuration;

    this.animateBallFlight(
      targetX,
      passTargetY,
      0,
      passDuration,
      arrivalState,
      false,
      () => {
        this.animateBallFlight(targetX, targetY, 0, carryDuration, arrivalState, false, () => {
          onComplete();
        });
      },
      "trajectory"
    );
  }

  private animateScoringRestart(
    previous: MatchStateData,
    frame: MatchStateData,
    duration: number,
    onComplete: () => void
  ): void {
    const scoringOwner = frame.ourScore > previous.ourScore ? "player" : "opponent";
    const scoringLineY = scoringOwner === "player" ? this.getPitchY(100) : this.getPitchY(0);
    const scoreDelta = scoringOwner === "player"
      ? frame.ourScore - previous.ourScore
      : frame.opponentScore - previous.opponentScore;
    const scoringArc = scoreDelta === LINEOUT_BALANCE.match.points.penalty
      ? LINEOUT_BALANCE.match.visualSimulation.kickArcHeightPixels
      : 8;
    const isTry = scoreDelta !== LINEOUT_BALANCE.match.points.penalty;
    const scoringDuration = duration * (isTry ? 0.2 : 0.3);
    const celebrationDuration = isTry
      ? Math.min(
        LINEOUT_BALANCE.match.visualSimulation.tryCelebrationDisplayDurationMs,
        duration * 0.6
      )
      : duration * 0.12;
    const restartDuration = Math.max(1, duration - scoringDuration - celebrationDuration);

    this.animateBallFlight(
      this.getPitchX(previous.ballLateralPosition),
      scoringLineY,
      scoringArc,
      scoringDuration,
      previous,
      scoreDelta === LINEOUT_BALANCE.match.points.penalty,
      () => {
        if (isTry) {
          this.showTryCelebration(frame, scoringOwner, celebrationDuration);
        }
        const concedingOwner = scoringOwner === "player" ? "opponent" : "player";
        this.time.delayedCall(celebrationDuration, () => {
          this.simulationBall?.setPosition(
            SIMULATION_FIELD.centerX,
            this.getPitchY(LINEOUT_BALANCE.match.restartPositionMeters)
          );
          this.setSimulationBallTeamStyle(frame, concedingOwner);
          this.updateSimulationActionText("match.action.restart");
          this.animateBallFlight(
            this.getPitchX(frame.ballLateralPosition),
            this.getPitchY(frame.ballPositionMeters),
            LINEOUT_BALANCE.match.visualSimulation.restartArcHeightPixels,
            restartDuration,
            frame,
            true,
            onComplete,
            "trajectory"
          );
        });
      },
      scoreDelta === LINEOUT_BALANCE.match.points.penalty ? "trajectory" : "vertical"
    );
  }

  private showTryCelebration(
    match: MatchStateData,
    scoringOwner: MatchStateData["ballOwner"],
    duration: number
  ): void {
    const colors = this.getDisplayedTeamColors(match, scoringOwner);
    const flash = this.add.rectangle(
      SIMULATION_FIELD.centerX,
      SIMULATION_FIELD.centerY,
      SIMULATION_FIELD.width,
      SIMULATION_FIELD.height,
      colors.primary,
      0.22
    ).setDepth(SIMULATION_DEPTH.tryCelebration).setAlpha(0);
    const panel = this.add.container(195, 500)
      .setDepth(SIMULATION_DEPTH.tryCelebration + 1)
      .setAlpha(0)
      .setScale(0.72);
    const shadow = this.add.rectangle(0, 6, 230, 82, 0x020617, 0.72);
    const background = this.add.rectangle(0, 0, 230, 82, colors.primary, 0.96)
      .setStrokeStyle(4, colors.secondary, 1);
    const title = this.add.text(0, 0, t("match.tryCelebration.title"), {
      font: "bold 36px Arial",
      color: "#ffffff",
      stroke: "#020617",
      strokeThickness: 4
    }).setOrigin(0.5);
    panel.add([shadow, background, title]);

    for (let index = 0; index < 14; index += 1) {
      const angle = Phaser.Math.DegToRad(index * (360 / 14));
      const distance = index % 2 === 0 ? 150 : 120;
      const piece = this.add.rectangle(
        SIMULATION_FIELD.centerX,
        500,
        index % 3 === 0 ? 8 : 5,
        12,
        index % 2 === 0 ? colors.primary : colors.secondary,
        1
      ).setDepth(SIMULATION_DEPTH.tryCelebration);
      this.tweens.add({
        targets: piece,
        x: SIMULATION_FIELD.centerX + Math.cos(angle) * distance,
        y: 500 + Math.sin(angle) * distance,
        angle: index % 2 === 0 ? 180 : -180,
        alpha: 0,
        duration: Math.max(1, duration),
        ease: "Cubic.easeOut",
        onComplete: () => piece.destroy()
      });
    }

    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: Math.max(1, duration * 0.18),
      yoyo: true,
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: Math.max(1, duration * 0.22),
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(Math.max(1, duration * 0.5), () => {
          this.tweens.add({
            targets: panel,
            alpha: 0,
            y: 480,
            duration: Math.max(1, duration * 0.25),
            ease: "Cubic.easeIn",
            onComplete: () => panel.destroy()
          });
        });
      }
    });
  }

  private getTryActionIndexes(
    initial: MatchStateData,
    actions: MatchSimulationAction[]
  ): Set<number> {
    const indexes = new Set<number>();
    actions.forEach((action, index) => {
      if (action.kind !== "score") return;
      const previous = index === 0 ? initial : actions[index - 1].state;
      const points = action.state.ourScore > previous.ourScore
        ? action.state.ourScore - previous.ourScore
        : action.state.opponentScore - previous.opponentScore;
      if (points !== LINEOUT_BALANCE.match.points.penalty) indexes.add(index);
    });
    return indexes;
  }

  private animateBallFlight(
    targetX: number,
    targetY: number,
    arcHeight: number,
    duration: number,
    arrivalState: MatchStateData,
    ballIsLoose: boolean,
    onComplete: () => void,
    orientation: BallOrientation = "vertical"
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const startX = ball.x;
    const startY = ball.y;
    const rotation = orientation === "trajectory"
      ? Phaser.Math.Angle.Between(startX, startY, targetX, targetY) - Math.PI / 2
      : orientation === "horizontal"
        ? Math.PI / 2
        : 0;
    ball.setRotation(rotation);
    if (ballIsLoose) this.setSimulationBallLooseStyle();

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(1, duration),
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        ball.x = Phaser.Math.Linear(startX, targetX, progress);
        ball.y = Phaser.Math.Linear(startY, targetY, progress)
          - 4 * arcHeight * progress * (1 - progress);
      },
      onComplete: () => {
        ball.setPosition(targetX, targetY);
        this.setSimulationBallTeamStyle(arrivalState, arrivalState.ballOwner);
        onComplete();
      }
    });
  }

  private updateSimulationActionFor(action: MatchSimulationAction): void {
    if (action.kind === "turnover") return;
    if (action.kind === "breakthrough") {
      this.simulationActionText?.setText(t("match.action.breakthrough")
        .replace("{meters}", String(Math.round(action.distanceMeters))));
      return;
    }
    const keyByAction = {
      handPlay: "match.action.handPlay",
      ruck: "match.action.ruck",
      clearanceKick: "match.action.clearanceKick",
      lineout: "match.action.lineout"
    } as const;
    const key = keyByAction[action.kind as keyof typeof keyByAction];
    if (key) this.updateSimulationActionText(key);
  }

  private updateSimulationActionText(key: string): void {
    this.simulationActionText?.setText(t(key));
  }

  private getScoreActionKey(previous: MatchStateData, next: MatchStateData): string {
    const points = next.ourScore > previous.ourScore
      ? next.ourScore - previous.ourScore
      : next.opponentScore - previous.opponentScore;
    if (points === LINEOUT_BALANCE.match.points.penalty) return "match.action.penaltyScored";
    if (points === LINEOUT_BALANCE.match.points.unconvertedTry) return "match.action.tryScored";
    return "match.action.convertedTryScored";
  }

  private updateDisplayedScore(match: MatchStateData): void {
    this.scoreOverlay?.setScore(match.ourScore, match.opponentScore);
  }

  private setSimulationBallTeamStyle(
    match: MatchStateData,
    owner: MatchStateData["ballOwner"]
  ): void {
    const colors = this.getDisplayedTeamColors(match, owner);
    this.simulationBall?.setTint(colors.primary);
  }

  private getDisplayedTeamColors(
    match: MatchStateData,
    owner: MatchStateData["ballOwner"]
  ) {
    if (owner === "player") {
      return match.home.colors;
    }

    return getContrastingOpponentColors(match.home.colors, match.away.colors);
  }

  private setSimulationBallLooseStyle(): void {
    this.simulationBall?.clearTint();
  }

  private getPitchX(lateralPosition = 0): number {
    return SIMULATION_FIELD.centerX
      + Phaser.Math.Clamp(lateralPosition, -1, 1) * SIMULATION_FIELD.lateralRange;
  }

  private getPitchY(positionMeters: number): number {
    const position = Phaser.Math.Clamp(positionMeters, 0, LINEOUT_BALANCE.match.pitchLengthMeters);
    return SIMULATION_FIELD.tryLineBottom
      - SIMULATION_FIELD.playingHeight * (position / LINEOUT_BALANCE.match.pitchLengthMeters);
  }

  private renderFullTimePanel(): void {
    this.add.text(195, 386, t("match.end"), {
      font: "bold 28px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(195, 430, t("match.viewResult"), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);

    new UIButton(this, 195, 492, 280, 52, t("match.viewResult"), () => navigateTo(this, "ResultScene"));
  }

}
