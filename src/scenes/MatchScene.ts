import Phaser from "phaser";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { GameStore } from "../state/GameStore";
import { getDivision } from "../rules/DivisionRules";
import { getCurrentOpponentId } from "../rules/ChampionshipRules";
import { generateOpponentById } from "../ai/OpponentGenerator";
import {
  advanceToNextScheduledLineoutWithTrace,
  generateMatchSchedule,
  generateMatchMaximumFatigue,
  getPitchZoneFromPosition,
  getRealSecondsForSimulatedMinutes
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

type MatchLineoutEvent = MatchStateData["lineouts"][number];

const SIMULATION_FIELD = {
  left: 46,
  right: 344,
  top: 346,
  bottom: 774,
  centerX: 195,
  centerY: 560,
  width: 298,
  height: 428,
  lateralRange: 124
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
        save.playerTeam.hooker,
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
      match = {
        id: `match_${Date.now()}`,
        divisionId: division.id,
        home: save.playerTeam,
        away: opponent,
        minute: 0,
        maxMinute: schedule.maxMinute,
        ourScore: 0,
        opponentScore: 0,
        possession: 50,
        occupation: 50,
        ballOwner: "player",
        ballPositionMeters: 50,
        ballLateralPosition: 0,
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
    renderMenuBackdrop(this);

    const next = match.lineouts[match.currentLineoutIndex];
    const simulationPending = next
      ? match.minute < next.minute
      : match.minute < match.maxMinute;

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
    this.add.rectangle(field.centerX, field.centerY, field.width, field.height, 0x1f6d45, 1)
      .setStrokeStyle(3, 0xf8fafc, 0.9);
    const fifteenMeterOffsetX = field.width / 2 - (15 / 70) * field.width;
    for (const direction of [-1, 1]) {
      this.add.rectangle(
        field.centerX + direction * fifteenMeterOffsetX,
        field.centerY,
        2,
        field.height - 4,
        0xffffff,
        0.28
      );
    }
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
    this.add.text(195, 286, t("match.simulationInProgress"), {
      font: "bold 22px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.rectangle(195, 316, 270, 26, 0x07111a, 0.9)
      .setStrokeStyle(1, 0x64748b, 0.8);
    this.simulationActionText = this.add.text(195, 316, t("match.action.handPlay"), {
      font: "bold 12px Arial",
      color: "#fde68a"
    }).setOrigin(0.5);
    const ownerColors = this.getDisplayedTeamColors(match, match.ballOwner);
    const ballX = this.getPitchX(match.ballLateralPosition);
    const ballY = this.getPitchY(match.ballPositionMeters);
    this.simulationBall = this.add.image(ballX, ballY, "lineout-ball")
      .setDisplaySize(16, 23)
      .setTint(ownerColors.primary);
    this.ballPositionText = this.add.text(195, 804, t("match.ballPosition")
      .replace("{meters}", String(Math.round(match.ballPositionMeters))), {
      font: UI.font.body,
      color: UI.colors.text
    }).setOrigin(0.5);
  }

  private startAcceleratedSimulation(match: MatchStateData): void {
    const trace = advanceToNextScheduledLineoutWithTrace(match);
    const target = trace.match;
    const simulatedMinutes = Math.max(0, target.minute - match.minute);
    const duration = getRealSecondsForSimulatedMinutes(simulatedMinutes) * 1000;
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
            (SIMULATION_FIELD.bottom - this.simulationBall.y)
            / SIMULATION_FIELD.height
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

  private playSimulationActions(
    initial: MatchStateData,
    actions: MatchSimulationAction[],
    totalDuration: number
  ): void {
    if (!this.simulationBall || actions.length === 0) return;
    const weights = actions.map((action) => {
      if (action.kind === "score") return 2.5;
      if (["breakthrough", "clearanceKick", "lineout"].includes(action.kind)) return 1.8;
      return 1;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    const playAction = (index: number): void => {
      const action = actions[index];
      if (!action) return;
      const previous = index === 0 ? initial : actions[index - 1].state;
      const actionDuration = totalDuration * weights[index] / totalWeight;
      const next = () => playAction(index + 1);

      if (action.kind === "score") {
        this.updateDisplayedScore(action.state);
        this.updateSimulationActionText(this.getScoreActionKey(previous, action.state));
        this.animateScoringRestart(previous, action.state, actionDuration, next);
        return;
      }
      this.animateOpenPlayAction(action, previous, index, actionDuration, next);
    };

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
    if (["handPlay", "ruck", "turnover"].includes(action.kind)) {
      this.animatePassAndCarry(
        action,
        previous,
        actionIndex,
        targetX,
        targetY,
        flightDuration,
        actionDuration,
        onComplete
      );
      return;
    }
    const ballIsLoose = action.kind === "clearanceKick" || action.kind === "lineout";
    this.animateBallFlight(targetX, targetY, arcHeight, flightDuration, action.state, ballIsLoose, () => {
      if (action.kind === "lineout") this.setSimulationBallLooseStyle();
      this.time.delayedCall(Math.max(0, actionDuration - flightDuration), onComplete);
    });
  }

  private animatePassAndCarry(
    action: MatchSimulationAction,
    previous: MatchStateData,
    actionIndex: number,
    targetX: number,
    targetY: number,
    movementDuration: number,
    actionDuration: number,
    onComplete: () => void
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const pattern = LINEOUT_BALANCE.match.visualSimulation.passBackwardMetersPattern;
    const backwardMeters = pattern[actionIndex % pattern.length];
    const ownerDirection = previous.ballOwner === "player" ? 1 : -1;
    const pixelsPerMeter = SIMULATION_FIELD.height / LINEOUT_BALANCE.match.pitchLengthMeters;
    const passTargetY = Phaser.Math.Clamp(
      ball.y + ownerDirection * backwardMeters * pixelsPerMeter,
      SIMULATION_FIELD.top,
      SIMULATION_FIELD.bottom
    );
    const passDuration = movementDuration
      * LINEOUT_BALANCE.match.visualSimulation.passDurationRatio;
    const carryDuration = movementDuration - passDuration;

    this.animateBallFlight(
      targetX,
      passTargetY,
      0,
      passDuration,
      action.state,
      false,
      () => {
        this.animateBallFlight(targetX, targetY, 0, carryDuration, action.state, false, () => {
          this.time.delayedCall(Math.max(0, actionDuration - movementDuration), onComplete);
        });
      },
      true
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

    this.animateBallFlight(
      SIMULATION_FIELD.centerX,
      scoringLineY,
      scoringArc,
      duration * 0.3,
      previous,
      scoreDelta === LINEOUT_BALANCE.match.points.penalty,
      () => {
        const concedingOwner = scoringOwner === "player" ? "opponent" : "player";
        this.simulationBall?.setPosition(
          SIMULATION_FIELD.centerX,
          this.getPitchY(LINEOUT_BALANCE.match.restartPositionMeters)
        );
        this.setSimulationBallTeamStyle(frame, concedingOwner);
        this.updateSimulationActionText("match.action.restart");
        this.time.delayedCall(duration * 0.12, () => {
          this.animateBallFlight(
            this.getPitchX(frame.ballLateralPosition),
            this.getPitchY(frame.ballPositionMeters),
            LINEOUT_BALANCE.match.visualSimulation.restartArcHeightPixels,
            duration * 0.58,
            frame,
            true,
            onComplete
          );
        });
      }
    );
  }

  private animateBallFlight(
    targetX: number,
    targetY: number,
    arcHeight: number,
    duration: number,
    arrivalState: MatchStateData,
    ballIsLoose: boolean,
    onComplete: () => void,
    alignWithTrajectory = false
  ): void {
    const ball = this.simulationBall;
    if (!ball) return;
    const startX = ball.x;
    const startY = ball.y;
    ball.setRotation(
      alignWithTrajectory
        ? Phaser.Math.Angle.Between(startX, startY, targetX, targetY) - Math.PI / 2
        : 0
    );
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
    return SIMULATION_FIELD.bottom
      - SIMULATION_FIELD.height * (position / LINEOUT_BALANCE.match.pitchLengthMeters);
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
