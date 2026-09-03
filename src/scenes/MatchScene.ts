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
import { navigateTo, pushNavigationState } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { getCameraRenderScale } from "../systems/HighDensityRendering";
import { startSceneCrossfade } from "../systems/SceneCrossfade";
import { getContrastingOpponentColors } from "../ui/JerseyColorContrast";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { UIRoundedRectangle } from "../ui/UIRoundedRectangle";
import { MatchScoreOverlay } from "../ui/MatchScoreOverlay";
import { formatMatchMinute } from "../ui/MatchScoreOverlayLayout";
import { MatchStatsOverlay } from "../ui/MatchStatsOverlay";
import {
  preloadMatchPitchBackdrop,
  getMatchPitchAppearance,
  MATCH_PITCH_TEXTURE_KEY,
  renderMatchPitchBackdrop,
  type MatchPitchAppearance
} from "../ui/MatchPitchBackdrop";
import {
  getSimulationStadiumTier,
  MatchSimulationCrowd,
  SIMULATION_COMMENTATORS_BOTTOM_Y,
  SIMULATION_LAYOUT_BY_TIER,
  SIMULATION_RAILING_BOTTOM_Y,
  type SimulationCrowdReaction
} from "../ui/MatchSimulationStadium";

type MatchLineoutEvent = MatchStateData["lineouts"][number];
type BallOrientation = "trajectory" | "horizontal";
type MatchSceneData = {
  entryTransition?: "from-lineout";
  transitionPitchPositionMeters?: number;
  transitionLateralPosition?: number;
};

const SIMULATION_FIELD_TOP = SIMULATION_RAILING_BOTTOM_Y + 8;
const SIMULATION_FIELD_HEIGHT = 237;
const SIMULATION_FIELD = {
  nearLeft: 10,
  nearRight: 380,
  farLeft: 38,
  farRight: 352,
  top: SIMULATION_FIELD_TOP,
  bottom: SIMULATION_FIELD_TOP + SIMULATION_FIELD_HEIGHT,
  centerX: 195,
  centerY: SIMULATION_FIELD_TOP + SIMULATION_FIELD_HEIGHT / 2,
  width: 370,
  height: SIMULATION_FIELD_HEIGHT,
  lateralRange: SIMULATION_FIELD_HEIGHT / 2,
  inGoalRatio: 21 / 370
} as const;

function createSimulationField(verticalOffsetY: number) {
  return {
    ...SIMULATION_FIELD,
    top: SIMULATION_FIELD.top + verticalOffsetY,
    bottom: SIMULATION_FIELD.bottom + verticalOffsetY,
    centerY: SIMULATION_FIELD.centerY + verticalOffsetY
  };
}

const SIMULATION_DEPTH = {
  commentators: 2.5,
  pitch: 6,
  markings: 7,
  ball: 20,
  goalPosts: 30,
  halfTimePanel: 40,
  tryCelebration: 50
} as const;

const MATCH_COMMENTATORS = {
  centerX: 195,
  regional: {
    textureKey: "match-commentators-regional",
    texturePath: "assets/images/match-commentators-regional.png",
    width: 195,
    height: 109,
    leftTailX: 145,
    rightTailX: 263
  },
  federal: {
    textureKey: "match-commentators-federal",
    texturePath: "assets/images/match-commentators-federal.png",
    width: 195,
    height: 109,
    leftTailX: 132,
    rightTailX: 266
  },
  national: {
    textureKey: "match-commentators-national",
    texturePath: "assets/images/match-commentators.png",
    width: 195,
    height: 94,
    leftTailX: 132,
    rightTailX: 258
  }
} as const;

export class MatchScene extends Phaser.Scene {
  private simulationField = createSimulationField(0);
  private scoreOverlay?: MatchScoreOverlay;
  private simulationBall?: Phaser.GameObjects.Image;
  private ballPositionText?: Phaser.GameObjects.Text;
  private simulationCommentaryTexts?: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private simulationCrowd?: MatchSimulationCrowd;
  private crowdSupportingOwner: MatchStateData["ballOwner"] = "player";
  private nextCommentatorIndex = 0;
  private enterFromLineout = false;
  private cameraBaseZoom = 1;
  private transitionPitchPositionMeters?: number;
  private transitionLateralPosition?: number;

  constructor() {
    super("MatchScene");
  }

  init(data?: MatchSceneData): void {
    this.enterFromLineout = data?.entryTransition === "from-lineout";
    this.transitionPitchPositionMeters = data?.transitionPitchPositionMeters;
    this.transitionLateralPosition = data?.transitionLateralPosition;

    // Phaser conserve les anciennes données de scène quand restart() ne reçoit
    // aucun paramètre. Une transition déjà consommée ne doit donc jamais être
    // rejouée au redémarrage suivant, sinon la caméra reste transparente.
    this.sys.settings.data = {};
  }

  preload(): void {
    preloadMatchPitchBackdrop(this);
    if (!this.textures.exists("lineout-ball")) {
      this.load.image("lineout-ball", "assets/sprites/ball.png");
    }
    for (const appearance of [
      MATCH_COMMENTATORS.regional,
      MATCH_COMMENTATORS.federal,
      MATCH_COMMENTATORS.national
    ]) {
      if (!this.textures.exists(appearance.textureKey)) {
        this.load.image(appearance.textureKey, appearance.texturePath);
      }
    }
  }

  create(): void {
    this.cameraBaseZoom = getCameraRenderScale(this);
    this.cameras.main
      .resetFX()
      .setZoom(this.cameraBaseZoom)
      .centerOn(195, 422)
      .setAlpha(this.enterFromLineout ? 0 : 1);
    this.input.enabled = true;
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
      navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "edit",
        combinationOverlayOpen: true
      });
    }, { variant: "primary" });
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
      if (this.enterFromLineout) {
        this.startSimulationReturnTransition(
          match,
          () => this.startPendingTryCelebration(match)
        );
      } else {
        this.startPendingTryCelebration(match);
      }
      return;
    }

    if (!match.halfTimeCompleted && match.minute >= match.halfTimeMinute) {
      this.renderScoreboard(match);
      this.renderSimulationBoard(match);
      if (this.enterFromLineout) {
        this.startSimulationReturnTransition(match, () => this.startHalfTimePause(match));
      } else {
        this.startHalfTimePause(match);
      }
      return;
    }

    if (!simulationPending && next) {
      this.renderScoreboard(match, next);
      this.renderSimulationBoard(match);
      this.startLineoutTransition(match, next);
      return;
    }

    this.renderScoreboard(match, simulationPending ? undefined : next);

    if (simulationPending) {
      this.renderSimulationBoard(match);
      if (this.enterFromLineout) {
        this.startSimulationReturnTransition(match);
      } else {
        this.startAcceleratedSimulation(match);
      }
      return;
    }

    if (!next) {
      this.renderFullTimePanel();
      if (this.enterFromLineout) this.startSimpleReturnReveal();
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
    const save = GameStore.getSave();
    const isHomeMatch = isCurrentMatchAtHome(save.championship);
    const venueTeam = isHomeMatch ? match.home : match.away;
    const layout = SIMULATION_LAYOUT_BY_TIER[getSimulationStadiumTier(venueTeam.divisionId)];
    this.simulationField = createSimulationField(layout.sceneryOffsetY);
    const field = this.simulationField;
    const pitchAppearance = getMatchPitchAppearance(
      venueTeam.id,
      match.id,
      isHomeMatch
    );
    this.crowdSupportingOwner = isHomeMatch ? "player" : "opponent";
    this.simulationCrowd = new MatchSimulationCrowd(
      this,
      venueTeam.divisionId,
      venueTeam.colors,
      `${venueTeam.id}:${match.id}`
    );
    this.renderPerspectivePitch(pitchAppearance);
    this.renderInGoalAreas();
    this.renderPerspectiveGoalPosts(venueTeam.colors);
    this.renderLongitudinalPitchMarkings();
    this.renderRugbyFlagPosts(venueTeam.colors);
    for (const meter of [22, 50, 78]) {
      this.renderTransversePitchLine(
        meter,
        meter === 50 ? 3 : 2,
        meter === 50 ? 0.8 : 0.45
      );
      const labelPosition = this.getPitchPoint(meter, -0.88);
      this.add.text(labelPosition.x, labelPosition.y, String(meter), {
        font: "bold 10px Arial",
        color: UI.colors.muted
      }).setOrigin(0.5).setDepth(SIMULATION_DEPTH.markings + 1);
    }
    for (const meter of [5, 40, 60, 95]) {
      this.renderDashedTransverseLine(meter);
    }
    this.add.text(195, 195, t("match.simulationInProgress"), {
      font: "bold 20px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    const initialActionKey = match.minute === 0
      ? "match.action.restart"
      : "match.action.handPlay";
    this.renderMatchCommentators(t(initialActionKey), venueTeam.divisionId);
    const pendingTry = match.pendingTryCelebration;
    const displayedOwner = pendingTry?.scoringOwner ?? match.ballOwner;
    const ownerColors = this.getDisplayedTeamColors(match, displayedOwner);
    const isInitialKickoff = match.minute === 0;
    const displayedBallPosition = pendingTry
      ? pendingTry.scoringOwner === "player" ? LINEOUT_BALANCE.match.pitchLengthMeters : 0
      : isInitialKickoff
        ? LINEOUT_BALANCE.match.restartPositionMeters
        : match.ballPositionMeters;
    const displayedLateralPosition = pendingTry
      ? pendingTry.lateralPosition
      : isInitialKickoff
        ? 0
        : match.ballLateralPosition;
    const ballX = this.getPitchX(displayedBallPosition, displayedLateralPosition);
    const ballY = pendingTry
      ? this.getPitchY(pendingTry.lateralPosition)
      : isInitialKickoff
        ? this.simulationField.centerY
        : this.getPitchY(match.ballLateralPosition);
    this.simulationBall = this.add.image(ballX, ballY, "lineout-ball")
      .setDisplaySize(16, 23)
      .setRotation(Math.PI / 2)
      .setDepth(SIMULATION_DEPTH.ball);
    if (isInitialKickoff && !pendingTry) {
      this.setSimulationBallLooseStyle();
    } else {
      this.simulationBall.setTint(ownerColors.primary);
    }
    this.ballPositionText = this.add.text(
      195,
      field.bottom + 34,
      this.getBallPositionLabel(displayedBallPosition),
      {
        font: UI.font.body,
        color: UI.colors.text
      }
    ).setOrigin(0.5);
  }

  private startLineoutTransition(match: MatchStateData, lineout: MatchLineoutEvent): void {
    const transition = LINEOUT_BALANCE.match.visualSimulation.lineoutTransition;
    const duration = transition.simulationZoomDurationMs;
    const camera = this.cameras.main;
    const focusX = this.simulationBall?.x
      ?? this.getPitchX(match.ballPositionMeters, match.ballLateralPosition);
    const focusY = this.simulationBall?.y ?? this.getPitchY(match.ballLateralPosition);

    this.input.enabled = false;
    camera.pan(focusX, focusY, duration, "Sine.easeInOut", true);
    camera.zoomTo(
      this.cameraBaseZoom * transition.simulationZoom,
      duration,
      "Cubic.easeInOut",
      true
    );
    const transitionData = {
      mode: "match",
      entryTransition: "from-match-simulation",
      transitionPitchPositionMeters: lineout.ballPositionMeters ?? match.ballPositionMeters,
      transitionLateralPosition: match.ballLateralPosition ?? 0
    };
    const started = startSceneCrossfade(
      this,
      "LineoutScene",
      transitionData,
      duration
    );
    if (started) {
      pushNavigationState("LineoutScene", transitionData);
    } else {
      navigateTo(this, "LineoutScene", { mode: "match" });
    }
  }

  private startSimulationReturnTransition(
    match: MatchStateData,
    onComplete: () => void = () => this.startAcceleratedSimulation(match)
  ): void {
    const transition = LINEOUT_BALANCE.match.visualSimulation.lineoutTransition;
    const duration = transition.simulationReturnDurationMs;
    const camera = this.cameras.main;
    const transitionLateralPosition = this.transitionLateralPosition ?? match.ballLateralPosition;
    const focusX = this.getPitchX(
      this.transitionPitchPositionMeters ?? match.ballPositionMeters,
      transitionLateralPosition
    );
    const focusY = this.getPitchY(
      transitionLateralPosition
    );

    this.enterFromLineout = false;
    this.transitionPitchPositionMeters = undefined;
    this.transitionLateralPosition = undefined;
    this.input.enabled = false;
    camera
      .setZoom(this.cameraBaseZoom * transition.simulationReturnZoom)
      .centerOn(focusX, focusY);
    camera.pan(195, 422, duration, "Sine.easeOut", true);
    camera.zoomTo(this.cameraBaseZoom, duration, "Cubic.easeOut", true);
    this.time.delayedCall(duration, () => {
      if (!this.sys.isActive()) return;
      camera.setZoom(this.cameraBaseZoom).centerOn(195, 422).setAlpha(1);
      this.input.enabled = true;
      onComplete();
    });
  }

  private startSimpleReturnReveal(): void {
    this.enterFromLineout = false;
    this.input.enabled = false;
    this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, () => {
      this.cameras.main.setAlpha(1);
      this.input.enabled = true;
    });
  }

  private renderMatchCommentators(
    initialMessage: string,
    divisionId: MatchStateData["home"]["divisionId"]
  ): void {
    const stadiumTier = getSimulationStadiumTier(divisionId);
    const appearance = MATCH_COMMENTATORS[stadiumTier];
    const layout = SIMULATION_LAYOUT_BY_TIER[stadiumTier];
    const commentatorsBottomY = SIMULATION_COMMENTATORS_BOTTOM_Y[stadiumTier]
      + layout.sceneryOffsetY;
    this.add.image(
      MATCH_COMMENTATORS.centerX,
      commentatorsBottomY,
      appearance.textureKey
    )
      .setOrigin(0.5, 1)
      .setDisplaySize(appearance.width, appearance.height)
      .setDepth(SIMULATION_DEPTH.commentators);

    const leftText = this.renderCommentatorPlaceholder(
      appearance.leftTailX,
      124,
      "left",
      commentatorsBottomY - appearance.height + 14,
      layout.bubbleY
    );
    const rightText = this.renderCommentatorPlaceholder(
      appearance.rightTailX,
      266,
      "right",
      commentatorsBottomY - appearance.height + 14,
      layout.bubbleY
    );

    leftText.setText(initialMessage);
    rightText.setText("");
    this.simulationCommentaryTexts = [leftText, rightText];
    this.nextCommentatorIndex = 0;
  }

  private renderCommentatorPlaceholder(
    tailTargetX: number,
    bubbleX: number,
    side: "left" | "right",
    tailTargetY: number,
    bubbleY: number
  ): Phaser.GameObjects.Text {
    const bubbleWidth = 124;
    const bubbleHeight = 64;
    const bubbleLeft = bubbleX - bubbleWidth / 2;
    const bubbleBottom = bubbleY + bubbleHeight / 2;
    const bubble = this.add.graphics().setDepth(12);
    bubble.fillStyle(UI.colors.paper, 0.98);
    bubble.lineStyle(2, UI.colors.outline, 1);
    bubble.fillRoundedRect(bubbleLeft, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 12);
    bubble.strokeRoundedRect(bubbleLeft, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 12);
    const tailBaseX = side === "left" ? bubbleX - 31 : bubbleX + 31;
    const tailPoints = [
      new Phaser.Math.Vector2(tailBaseX - 8, bubbleBottom - 2),
      new Phaser.Math.Vector2(tailTargetX, tailTargetY),
      new Phaser.Math.Vector2(tailBaseX + 8, bubbleBottom - 2)
    ];
    bubble.fillStyle(UI.colors.paper, 1);
    bubble.fillPoints(tailPoints, true);
    bubble.lineStyle(2, UI.colors.outline, 1);
    bubble.strokePoints(tailPoints, false);

    return this.add.text(bubbleX, bubbleY, "", {
      font: "bold 11px Arial",
      color: UI.colors.textOnAccent,
      align: "center",
      wordWrap: { width: bubbleWidth - 14 }
    }).setOrigin(0.5).setResolution(2).setDepth(13);
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
          const meters = this.getPitchPositionMeters(
            this.simulationBall.x,
            this.simulationBall.y
          );
          this.ballPositionText?.setText(this.getBallPositionLabel(meters));
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

    const panel = new UIRoundedRectangle(
      this,
      this.simulationField.centerX,
      this.simulationField.centerY,
      238,
      82,
      UI.colors.panelDark,
      0.96
    )
      .setStrokeStyle(3, UI.colors.accent, 0.95)
      .setDepth(SIMULATION_DEPTH.halfTimePanel);
    const label = this.add.text(
      this.simulationField.centerX,
      this.simulationField.centerY,
      t("match.halfTime"),
      {
        font: "bold 28px Arial",
        color: UI.colors.textAccent,
        stroke: UI.colors.textStroke,
        strokeThickness: 3
      }
    ).setOrigin(0.5).setDepth(SIMULATION_DEPTH.halfTimePanel);

    this.time.delayedCall(visualConfig.halfTimePauseDurationMs, () => {
      panel.setVisible(false);
      label.setVisible(false);
      const restartedMatch = startSecondHalf(match);
      GameStore.setMatch(restartedMatch);
      this.scoreOverlay?.setMinute(formatMatchMinute(restartedMatch.minute));
      this.updateSimulationActionText("match.action.secondHalfKickoff");
      this.simulationBall?.setPosition(
        this.getPitchX(LINEOUT_BALANCE.match.restartPositionMeters),
        this.simulationField.centerY
      );
      this.setSimulationBallLooseStyle();
      this.animateBallFlight(
        this.getPitchX(restartedMatch.ballPositionMeters, restartedMatch.ballLateralPosition),
        this.getPitchY(restartedMatch.ballLateralPosition),
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
        this.getPitchX(LINEOUT_BALANCE.match.restartPositionMeters),
        this.simulationField.centerY
      );
      this.setSimulationBallTeamStyle(nextMatch, concedingOwner);
      this.updateSimulationActionText("match.action.restart");
      this.animateBallFlight(
        this.getPitchX(nextMatch.ballPositionMeters, nextMatch.ballLateralPosition),
        this.getPitchY(nextMatch.ballLateralPosition),
        visualConfig.restartArcHeightPixels,
        visualConfig.halfTimeKickoffDurationMs,
        nextMatch,
        true,
        () => this.scene.restart(),
        "trajectory"
      );
    });
  }

  private renderPerspectivePitch(appearance: MatchPitchAppearance): void {
    const farLeft = this.getOuterPitchPoint(0, -1);
    const farRight = this.getOuterPitchPoint(1, -1);
    const nearRight = this.getOuterPitchPoint(1, 1);
    const nearLeft = this.getOuterPitchPoint(0, 1);
    const pitchColor = multiplyColors(UI.colors.pitch, appearance.tint);
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.pitch + 0.1);

    if (this.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
      const maskGraphics = this.make.graphics({ x: 0, y: 0 });
      maskGraphics.fillStyle(0xffffff, 1)
        .fillPoints([farLeft, farRight, nearRight, nearLeft], true);
      this.add.image(this.simulationField.centerX, this.simulationField.centerY, MATCH_PITCH_TEXTURE_KEY)
        .setDisplaySize(this.simulationField.width, this.simulationField.height)
        .setTint(appearance.tint)
        .setDepth(SIMULATION_DEPTH.pitch)
        .setMask(maskGraphics.createGeometryMask());
      graphics.fillStyle(UI.colors.pitch, 0.16)
        .fillPoints([farLeft, farRight, nearRight, nearLeft], true);
    } else {
      graphics.fillStyle(pitchColor, 1)
        .fillPoints([farLeft, farRight, nearRight, nearLeft], true);
    }
    for (let stripe = 0; stripe < 10; stripe += 1) {
      if (stripe % 2 !== 0) continue;
      const startRatio = stripe / 10;
      const endRatio = (stripe + 1) / 10;
      graphics.fillStyle(0xffffff, 0.035);
      graphics.fillPoints([
        this.getOuterPitchPoint(startRatio, -1),
        this.getOuterPitchPoint(endRatio, -1),
        this.getOuterPitchPoint(endRatio, 1),
        this.getOuterPitchPoint(startRatio, 1)
      ], true);
    }
    if (appearance.terrainOverlayAlpha > 0) {
      graphics.fillStyle(appearance.terrainOverlayColor, appearance.terrainOverlayAlpha);
      graphics.fillPoints([farLeft, farRight, nearRight, nearLeft], true);
    }

    this.renderPerspectiveTerrainDetails(graphics, appearance);
    graphics.lineStyle(3, UI.colors.line, 0.9);
    graphics.strokePoints([farLeft, farRight, nearRight, nearLeft], true);
  }

  private renderPerspectiveTerrainDetails(
    graphics: Phaser.GameObjects.Graphics,
    appearance: MatchPitchAppearance
  ): void {
    if (appearance.decoration === "clean") return;
    const random = createVisualRandom(appearance.terrainSeed);
    const colorByDecoration = {
      mud: 0x4b3525,
      worn: 0x8c7744,
      lush: 0x72b957,
      dry: 0xc7b36a
    } as const;
    const color = colorByDecoration[appearance.decoration];
    const count = appearance.decoration === "worn" ? 44 : 30;
    graphics.fillStyle(color, appearance.decoration === "lush" ? 0.18 : 0.28);
    for (let index = 0; index < count; index += 1) {
      const position = this.getOuterPitchPoint(0.04 + random() * 0.92, -0.9 + random() * 1.8);
      const size = random() < 0.8 ? 2 : 3;
      graphics.fillRect(Math.round(position.x), Math.round(position.y), size, size);
    }
  }

  private renderTransversePitchLine(
    positionMeters: number,
    width: number,
    alpha: number
  ): void {
    const far = this.getPitchPoint(positionMeters, -1);
    const near = this.getPitchPoint(positionMeters, 1);
    this.add.graphics()
      .setDepth(SIMULATION_DEPTH.markings)
      .lineStyle(width, UI.colors.line, alpha)
      .lineBetween(far.x, far.y, near.x, near.y);
  }

  private renderRugbyFlagPosts(colors: MatchStateData["home"]["colors"]): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.markings + 2);
    const bases: Phaser.Math.Vector2[] = [];
    for (const lateralPosition of [-1, 1]) {
      bases.push(
        this.getOuterPitchPoint(0, lateralPosition),
        this.getPitchPoint(0, lateralPosition),
        this.getPitchPoint(22, lateralPosition),
        this.getPitchPoint(50, lateralPosition),
        this.getPitchPoint(78, lateralPosition),
        this.getPitchPoint(100, lateralPosition),
        this.getOuterPitchPoint(1, lateralPosition)
      );
    }

    bases.forEach((base, index) => {
      const farSide = base.y < this.simulationField.centerY;
      const outsideY = base.y + (farSide ? -3 : 3);
      const poleHeight = farSide ? 8 : 10;
      const poleWidth = farSide ? 1 : 2;
      const flagWidth = farSide ? 4 : 5;
      const flagDirection = base.x < this.simulationField.centerX ? 1 : -1;
      graphics.lineStyle(poleWidth + 1, UI.colors.scrim, 0.55);
      graphics.lineBetween(base.x + 1, outsideY + 1, base.x + 1, outsideY - poleHeight + 1);
      graphics.lineStyle(poleWidth, UI.colors.line, 1);
      graphics.lineBetween(base.x, outsideY, base.x, outsideY - poleHeight);
      graphics.fillStyle(index % 2 === 0 ? colors.primary : colors.secondary, 1);
      graphics.fillTriangle(
        base.x,
        outsideY - poleHeight,
        base.x + flagDirection * flagWidth,
        outsideY - poleHeight + 2,
        base.x,
        outsideY - poleHeight + 4
      );
    });
  }

  private renderPerspectiveGoalPosts(colors: MatchStateData["home"]["colors"]): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.goalPosts);
    const drawPosts = (positionMeters: 0 | 100): void => {
      const nearBase = this.getPitchPoint(positionMeters, 0.16);
      const farBase = this.getPitchPoint(positionMeters, -0.16);
      const nearTop = {
        x: nearBase.x,
        y: nearBase.y - 66
      };
      const farTop = {
        x: farBase.x,
        y: farBase.y - 54
      };
      const nearCrossbar = { x: nearBase.x, y: nearBase.y - 23 };
      const farCrossbar = { x: farBase.x, y: farBase.y - 18 };

      graphics.lineStyle(6, UI.colors.outlineStrong, 1);
      graphics.lineBetween(nearBase.x, nearBase.y, nearTop.x, nearTop.y);
      graphics.lineBetween(farBase.x, farBase.y, farTop.x, farTop.y);
      graphics.lineStyle(8, UI.colors.outlineStrong, 1);
      graphics.lineBetween(
        nearCrossbar.x,
        nearCrossbar.y,
        farCrossbar.x,
        farCrossbar.y
      );

      graphics.lineStyle(3, UI.colors.line, 1);
      graphics.lineBetween(nearBase.x, nearBase.y, nearTop.x, nearTop.y);
      graphics.lineBetween(farBase.x, farBase.y, farTop.x, farTop.y);
      graphics.lineStyle(4, UI.colors.line, 1);
      graphics.lineBetween(
        nearCrossbar.x,
        nearCrossbar.y,
        farCrossbar.x,
        farCrossbar.y
      );

      // Une seule source lumineuse : toutes les ombres suivent la même diagonale.
      graphics.lineStyle(5, UI.colors.scrim, 0.26);
      graphics.lineBetween(
        nearBase.x,
        nearBase.y + 3,
        nearBase.x + 24,
        nearBase.y + 9
      );
      graphics.lineBetween(
        farBase.x,
        farBase.y + 3,
        farBase.x + 19,
        farBase.y + 8
      );
      const drawProtection = (base: Phaser.Math.Vector2, width: number, height: number): void => {
        const topWidth = Math.max(4, width - 2);
        const points = [
          new Phaser.Math.Vector2(base.x - topWidth / 2, base.y - height),
          new Phaser.Math.Vector2(base.x + topWidth / 2, base.y - height),
          new Phaser.Math.Vector2(base.x + width / 2, base.y),
          new Phaser.Math.Vector2(base.x - width / 2, base.y)
        ];
        graphics.fillStyle(colors.primary, 1);
        graphics.fillPoints(points, true);
        graphics.lineStyle(2, UI.colors.scrim, 0.8);
        graphics.strokePoints(points, true);
        graphics.fillStyle(colors.secondary, 0.65);
        graphics.fillRect(base.x - 1, base.y - height + 3, 2, Math.max(3, height - 6));
        graphics.fillStyle(UI.colors.scrim, 0.35);
        graphics.fillRect(base.x - width / 2 + 1, base.y - 3, width - 2, 2);
      };
      drawProtection(farBase, 7, 11);
      drawProtection(nearBase, 9, 14);
      graphics.lineStyle(3, UI.colors.line, 1);
      graphics.lineBetween(farBase.x, farBase.y - 11, farTop.x, farTop.y);
      graphics.lineBetween(nearBase.x, nearBase.y - 14, nearTop.x, nearTop.y);
    };

    drawPosts(0);
    drawPosts(100);
  }

  private renderInGoalAreas(): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.markings);
    const farLeftOuter = this.getOuterPitchPoint(0, -1);
    const nearLeftOuter = this.getOuterPitchPoint(0, 1);
    const farRightOuter = this.getOuterPitchPoint(1, -1);
    const nearRightOuter = this.getOuterPitchPoint(1, 1);
    const farLeftTry = this.getPitchPoint(0, -1);
    const nearLeftTry = this.getPitchPoint(0, 1);
    const farRightTry = this.getPitchPoint(100, -1);
    const nearRightTry = this.getPitchPoint(100, 1);

    graphics.fillStyle(0x0f5f34, 0.14);
    graphics.fillPoints([farLeftOuter, farLeftTry, nearLeftTry, nearLeftOuter], true);
    graphics.fillPoints([farRightTry, farRightOuter, nearRightOuter, nearRightTry], true);
    graphics.lineStyle(4, UI.colors.line, 0.92);
    graphics.lineBetween(farLeftTry.x, farLeftTry.y, nearLeftTry.x, nearLeftTry.y);
    graphics.lineBetween(farRightTry.x, farRightTry.y, nearRightTry.x, nearRightTry.y);
  }

  private renderLongitudinalPitchMarkings(): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.markings);
    for (const distanceFromTouch of [5, 15]) {
      for (const direction of [-1, 1]) {
        const lateralPosition = direction * (1 - (distanceFromTouch / 70) * 2);
        graphics.lineStyle(2, UI.colors.line, distanceFromTouch === 15 ? 0.4 : 0.28);
        for (let meter = 1; meter < 100; meter += 4) {
          const start = this.getPitchPoint(meter, lateralPosition);
          const end = this.getPitchPoint(Math.min(100, meter + 2), lateralPosition);
          graphics.lineBetween(start.x, start.y, end.x, end.y);
        }
      }
    }
  }

  private renderDashedTransverseLine(positionMeters: number): void {
    const graphics = this.add.graphics().setDepth(SIMULATION_DEPTH.markings);
    graphics.lineStyle(2, UI.colors.line, 0.34);
    for (let lateral = -0.96; lateral < 0.96; lateral += 0.12) {
      const start = this.getPitchPoint(positionMeters, lateral);
      const end = this.getPitchPoint(positionMeters, Math.min(1, lateral + 0.065));
      graphics.lineBetween(start.x, start.y, end.x, end.y);
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
        this.getPitchX(initial.ballPositionMeters, initial.ballLateralPosition),
        this.getPitchY(initial.ballLateralPosition),
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
    const direction = actionIndex % 2 === 0 ? -1 : 1;
    const openPlayTargetY = this.getPitchY(action.state.ballLateralPosition);
    const lineoutDirection = Math.sign(action.state.ballLateralPosition ?? 0) || direction;
    const targetLateralPosition = action.kind === "lineout"
      ? lineoutDirection * 0.96
      : action.state.ballLateralPosition;
    const targetX = this.getPitchX(action.state.ballPositionMeters, targetLateralPosition);
    const targetY = action.kind === "lineout"
      ? this.simulationField.centerY + lineoutDirection * (this.simulationField.height / 2 - 6)
      : openPlayTargetY;
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
        : "horizontal"
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
    const lateralDistancePixels = Math.abs(targetY - ball.y);
    const minimumLateralDistance = visualConfig.passLateralStepMinimum
      * this.simulationField.lateralRange;
    const maximumLateralDistance = visualConfig.passLateralStepMaximum
      * this.simulationField.lateralRange;
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
    const backwardDirection = previous.ballOwner === "player" ? -1 : 1;
    const passTargetX = Phaser.Math.Clamp(
      ball.x + backwardDirection * backwardDistancePixels,
      this.simulationField.nearLeft,
      this.simulationField.nearRight
    );
    const passDurationRatio = Phaser.Math.FloatBetween(
      visualConfig.passDurationRatioMinimum,
      visualConfig.passDurationRatioMaximum
    );
    const passDuration = actionDuration * passDurationRatio;
    const carryDuration = actionDuration - passDuration;

    this.animateBallFlight(
      passTargetX,
      targetY,
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
    const scoringPositionMeters = scoringOwner === "player" ? 100 : 0;
    const scoringLineX = this.getPitchX(scoringPositionMeters, previous.ballLateralPosition);
    const scoreDelta = scoringOwner === "player"
      ? frame.ourScore - previous.ourScore
      : frame.opponentScore - previous.opponentScore;
    const scoringArc = scoreDelta === LINEOUT_BALANCE.match.points.penalty
      ? LINEOUT_BALANCE.match.visualSimulation.kickArcHeightPixels
      : 8;
    const isTry = scoreDelta !== LINEOUT_BALANCE.match.points.penalty;
    if (!isTry) {
      this.reactCrowd(
        scoringOwner === this.crowdSupportingOwner ? "celebrate" : "disappointed"
      );
    }
    const scoringDuration = duration * (isTry ? 0.2 : 0.3);
    const celebrationDuration = isTry
      ? Math.min(
        LINEOUT_BALANCE.match.visualSimulation.tryCelebrationDisplayDurationMs,
        duration * 0.6
      )
      : duration * 0.12;
    const restartDuration = Math.max(1, duration - scoringDuration - celebrationDuration);

    this.animateBallFlight(
      scoringLineX,
      this.getPitchY(previous.ballLateralPosition),
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
            this.getPitchX(LINEOUT_BALANCE.match.restartPositionMeters),
            this.simulationField.centerY
          );
          this.setSimulationBallTeamStyle(frame, concedingOwner);
          this.updateSimulationActionText("match.action.restart");
          this.animateBallFlight(
            this.getPitchX(frame.ballPositionMeters, frame.ballLateralPosition),
            this.getPitchY(frame.ballLateralPosition),
            LINEOUT_BALANCE.match.visualSimulation.restartArcHeightPixels,
            restartDuration,
            frame,
            true,
            onComplete,
            "trajectory"
          );
        });
      },
      scoreDelta === LINEOUT_BALANCE.match.points.penalty ? "trajectory" : "horizontal"
    );
  }

  private showTryCelebration(
    match: MatchStateData,
    scoringOwner: MatchStateData["ballOwner"],
    duration: number
  ): void {
    this.reactCrowd(
      scoringOwner === this.crowdSupportingOwner ? "celebrate" : "disappointed"
    );
    const colors = this.getDisplayedTeamColors(match, scoringOwner);
    const flash = this.add.rectangle(
      this.simulationField.centerX,
      this.simulationField.centerY,
      this.simulationField.width,
      this.simulationField.height,
      colors.primary,
      0.22
    ).setDepth(SIMULATION_DEPTH.tryCelebration).setAlpha(0);
    const panel = this.add.container(this.simulationField.centerX, this.simulationField.centerY)
      .setDepth(SIMULATION_DEPTH.tryCelebration + 1)
      .setAlpha(0)
      .setScale(0.72);
    const shadow = new UIRoundedRectangle(this, 0, 6, 230, 82, UI.colors.scrim, 0.72);
    const background = new UIRoundedRectangle(this, 0, 0, 230, 82, colors.primary, 0.96)
      .setStrokeStyle(4, colors.secondary, 1);
    const title = this.add.text(0, 0, t("match.tryCelebration.title"), {
      font: "bold 36px Arial",
      color: UI.colors.text,
      stroke: UI.colors.textStroke,
      strokeThickness: 4
    }).setOrigin(0.5);
    panel.add([shadow, background, title]);

    for (let index = 0; index < 14; index += 1) {
      const angle = Phaser.Math.DegToRad(index * (360 / 14));
      const distance = index % 2 === 0 ? 150 : 120;
      const piece = this.add.rectangle(
        this.simulationField.centerX,
        this.simulationField.centerY,
        index % 3 === 0 ? 8 : 5,
        12,
        index % 2 === 0 ? colors.primary : colors.secondary,
        1
      ).setDepth(SIMULATION_DEPTH.tryCelebration);
      this.tweens.add({
        targets: piece,
        x: this.simulationField.centerX + Math.cos(angle) * distance,
        y: this.simulationField.centerY + Math.sin(angle) * distance,
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
            y: this.simulationField.centerY - 20,
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
    orientation: BallOrientation = "horizontal"
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const startX = ball.x;
    const startY = ball.y;
    const rotation = orientation === "trajectory"
      ? Phaser.Math.Angle.Between(startX, startY, targetX, targetY) - Math.PI / 2
      : Math.PI / 2;
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
    const crowdReaction: SimulationCrowdReaction = action.kind === "breakthrough"
      || action.kind === "clearanceKick"
      || action.kind === "lineout"
      || action.kind === "turnover"
      ? "danger"
      : "play";
    this.reactCrowd(crowdReaction);
    if (action.kind === "turnover") return;
    if (action.kind === "breakthrough") {
      this.updateSimulationCommentary(
        t("match.action.breakthrough")
          .replace("{meters}", String(Math.round(action.distanceMeters)))
      );
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
    this.updateSimulationCommentary(t(key));
  }

  private updateSimulationCommentary(message: string): void {
    const commentatorTexts = this.simulationCommentaryTexts;
    if (!commentatorTexts) return;
    commentatorTexts[this.nextCommentatorIndex].setText(message);
    this.nextCommentatorIndex = this.nextCommentatorIndex === 0 ? 1 : 0;
  }

  private reactCrowd(reaction: SimulationCrowdReaction): void {
    this.simulationCrowd?.react(reaction);
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

  private getPitchX(positionMeters: number, lateralPosition = 0): number {
    const position = Phaser.Math.Clamp(positionMeters, 0, LINEOUT_BALANCE.match.pitchLengthMeters);
    const { left, right } = this.getFieldEdges(lateralPosition);
    const fieldWidth = right - left;
    const tryLineLeft = left + fieldWidth * this.simulationField.inGoalRatio;
    const tryLineRight = right - fieldWidth * this.simulationField.inGoalRatio;
    return Phaser.Math.Linear(
      tryLineLeft,
      tryLineRight,
      position / LINEOUT_BALANCE.match.pitchLengthMeters
    );
  }

  private getPitchY(lateralPosition = 0): number {
    return this.simulationField.centerY
      + Phaser.Math.Clamp(lateralPosition, -1, 1) * this.simulationField.lateralRange;
  }

  private getPitchPoint(positionMeters: number, lateralPosition = 0): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.getPitchX(positionMeters, lateralPosition),
      this.getPitchY(lateralPosition)
    );
  }

  private getOuterPitchPoint(lengthRatio: number, lateralPosition: number): Phaser.Math.Vector2 {
    const { left, right } = this.getFieldEdges(lateralPosition);
    return new Phaser.Math.Vector2(
      Phaser.Math.Linear(left, right, Phaser.Math.Clamp(lengthRatio, 0, 1)),
      this.getPitchY(lateralPosition)
    );
  }

  private getFieldEdges(lateralPosition: number): { left: number; right: number } {
    const depthRatio = (Phaser.Math.Clamp(lateralPosition, -1, 1) + 1) / 2;
    return {
      left: Phaser.Math.Linear(this.simulationField.farLeft, this.simulationField.nearLeft, depthRatio),
      right: Phaser.Math.Linear(this.simulationField.farRight, this.simulationField.nearRight, depthRatio)
    };
  }

  private getPitchPositionMeters(x: number, y: number): number {
    const lateralPosition = Phaser.Math.Clamp(
      (y - this.simulationField.centerY) / this.simulationField.lateralRange,
      -1,
      1
    );
    const { left, right } = this.getFieldEdges(lateralPosition);
    const fieldWidth = right - left;
    const tryLineLeft = left + fieldWidth * this.simulationField.inGoalRatio;
    const tryLineRight = right - fieldWidth * this.simulationField.inGoalRatio;
    return Phaser.Math.Clamp(
      ((x - tryLineLeft) / Math.max(1, tryLineRight - tryLineLeft))
        * LINEOUT_BALANCE.match.pitchLengthMeters,
      0,
      LINEOUT_BALANCE.match.pitchLengthMeters
    );
  }

  private getBallPositionLabel(positionMeters: number): string {
    const pitchLength = LINEOUT_BALANCE.match.pitchLengthMeters;
    const remainingMeters = pitchLength - Phaser.Math.Clamp(positionMeters, 0, pitchLength);
    return t("match.ballPosition")
      .replace("{meters}", String(Math.round(remainingMeters)));
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

    new UIButton(this, 195, 492, 280, 52, t("match.viewResult"), () => navigateTo(this, "ResultScene"), {
      variant: "primary"
    });
  }

}

function multiplyColors(baseColor: number, tintColor: number): number {
  const red = Math.round(((baseColor >> 16) & 0xff) * ((tintColor >> 16) & 0xff) / 0xff);
  const green = Math.round(((baseColor >> 8) & 0xff) * ((tintColor >> 8) & 0xff) / 0xff);
  const blue = Math.round((baseColor & 0xff) * (tintColor & 0xff) / 0xff);
  return (red << 16) | (green << 8) | blue;
}

function createVisualRandom(seed: number): () => number {
  let state = seed || 1;
  return (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}
