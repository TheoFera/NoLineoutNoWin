import Phaser from "phaser";
import { PLAYER_VISUAL_SCALE } from "../config/DisplayConfig";
import { GameStore } from "../state/GameStore";
import { buildDefensivePlan } from "../ai/DefenseAI";
import {
  chooseAiOffensiveLineout,
  predictDefensiveTarget,
  type AiFieldZone,
  type PreviousAiLineout
} from "../ai/LineoutAiSelection";
import { createOpponentAiIdentity } from "../ai/LineoutAiIdentity";
import { getDivision } from "../rules/DivisionRules";
import { resolveDefensiveLineout } from "../rules/DefensiveLineoutResolver";
import { getDefensiveSelectionMode } from "../rules/DefensiveLineoutSelection";
import { getDefensiveLineoutSlots } from "../rules/DefenseSelection";
import {
  countAssignedPlayers,
  findCombinationTargetOption,
  getActiveOffensiveCombinations,
  getCombinationDisplayName,
  getCombinationTargetPositions,
  getPlayersAssignedToCombination,
  getUnassignedCombinationPlayers,
  isCombinationValidForMatch,
  normalizeOffensiveCombinations,
  replaceCombinationLayout
} from "../rules/CombinationRules";
import { resolveLineout } from "../rules/LineoutResolver";
import { rebuildPlayableCombinationTargets } from "../rules/LineoutCombinationAssignment";
import { canBeLineoutJumper, canBeLineoutLifter } from "../rules/LineoutPlayerRoles";
import { buildLineoutResultPresentation, type LineoutResultDetail } from "../rules/LineoutResultPresentation";
import { applyLineoutResolutionToMatch } from "../rules/MatchSimulator";
import { addUsage } from "../rules/PlayerProgression";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { LineoutAssignments, LineoutResult } from "../models/Lineout";
import type { MatchLineoutEvent, MatchPlayerUsage, MatchStateData } from "../models/Match";
import type { FieldPlayer, Hooker } from "../models/Player";
import { getContrastingOpponentColors } from "../ui/JerseyColorContrast";
import {
  getLifterAnimationConfig,
  getLineoutLiftSequenceDurationMs,
  getLineoutJumpAnimationMetrics,
  LINEOUT_LIFT_ANIMATION
} from "../ui/LineoutLiftAnimation";
import {
  applyConstantBallTravelSpeed,
  applyThrowCorridorFlight,
  buildLineoutBallAnimationPlan,
  getBallAnimationTargetOffset,
  getBallTravelDurationMs,
  getHandPoseBallOffset,
  getLineoutAnimationTargetType,
  getLineoutAnimationTrajectory,
  getLineoutAnimationThrowQuality,
  LINEOUT_THROW_ANIMATION,
  sampleThrowHorizontalOffset,
  sampleVolleyHorizontalDistance,
  type BallAnimationPhase,
  type BallAnimationWaypoint
} from "../ui/LineoutThrowAnimation";
import { PLAYER_TOKEN_HIT_AREA_DATA_KEY, PlayerToken } from "../ui/PlayerToken";
import {
  getElevatedObjectShadowOffset,
  PLAYER_GROUND_SHADOW_STYLE,
  PlayerGroundShadow
} from "../ui/PlayerGroundShadow";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import type { Kit, PoseName } from "../ui/RugbyPlayerTypes";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { MatchScoreOverlay } from "../ui/MatchScoreOverlay";
import { LineoutCombinationOverlay } from "../ui/LineoutCombinationOverlay";
import { MatchStatsOverlay } from "../ui/MatchStatsOverlay";
import { playRefereeWhistle, prepareGameAudio } from "../systems/AudioSystem";
import {
  formatMatchMinute,
  MATCH_SCORE_OVERLAY_LAYOUT
} from "../ui/MatchScoreOverlayLayout";
import { PlayerStatsOverlay } from "../ui/PlayerStatsOverlay";
import { getPlayerSkinTint } from "../ui/PlayerSkinTone";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { MATH_RANDOM_SOURCE } from "../utils/Random";

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const FIELD_TOP = 0;
const FIELD_HEIGHT = SCREEN_HEIGHT;
const PLAYER_FIELD_WIDTH_RATIO = 0.125;
const PLAYER_FIELD_HEIGHT_RATIO = 0.14;
const PLAYER_DEPTH_BASE = 100;
const GROUND_SHADOW_DEPTH = PLAYER_DEPTH_BASE - 1;
const PLAYER_LABEL_DEPTH_OFFSET = 0.1;
const PLAYER_HITBOX_DEPTH_OFFSET = 0.2;
const LINEOUT_ACTION_DEPTH = 1500;
const RUGBY_DASH_WIDTH = 18;
const RUGBY_DASH_GAP = 12;
const TRAINING_FIFTEEN_LINE_Y = FIELD_TOP + 160;
const TRAINING_FIVE_METER_LINE_Y = SCREEN_HEIGHT - 196;
const TRAINING_TOUCH_LINE_Y = SCREEN_HEIGHT - 82;
const TRAINING_SLOT_START_Y = SCREEN_HEIGHT - 206;
const TRAINING_HOOKER_Y = 744;
const TRAINING_HOOKER_FEET_OFFSET = 34;
const TRAINING_THROW_START_OFFSET = 24;

type SecondaryAttemptMode = "smallJump" | "jumperOnGround" | "hand";

type SecondaryBallWaypoint = BallAnimationWaypoint & {
  position: LineoutPosition;
};

export type LineoutSceneData = {
  mode: "training" | "match";
  combinationId?: string;
  combinationConfirmed?: boolean;
};

type LineoutLayout = {
  fieldTop: number;
  fieldBottom: number;
  fieldWidth: number;
  fieldHeight: number;
  playerWidth: number;
  playerHeight: number;
  attackX: number;
  defenseX?: number;
  hookerX: number;
  hookerY: number;
  fifteenLineY: number;
  fiveMeterLineY: number;
  touchLineY: number;
  slotStartY: number;
  slotGap: number;
  reserveX: number;
  reserveY: number;
  navigationY: number;
};

type DragOrigin =
  | { kind: "training-slot"; slotIndex: number }
  | { kind: "training-reserve" }
  | { kind: "match-attack" }
  | { kind: "match-defense" };

type DragState = {
  origin: DragOrigin;
  pointer: Phaser.Input.Pointer;
  token: PlayerToken;
  startX: number;
  startY: number;
  moved: boolean;
  homeX: number;
  homeY: number;
};

type LineoutBallGameObject =
  | Phaser.GameObjects.Ellipse
  | Phaser.GameObjects.Image;

type BallShadowFlightProfile = {
  startElevationPixels: number;
  apexElevationPixels: number;
  arrivalElevationPixels: number;
  finalElevationPixels: number;
  primaryFlightDurationMs: number;
  totalTravelDurationMs: number;
  baseScaleX: number;
  baseScaleY: number;
};

export class LineoutScene extends Phaser.Scene {
  private mode: "training" | "match" = "training";
  private selectedCombinationId?: string;
  private combinationConfirmed = false;
  private selectedCombination!: Combination;
  private allCombinations: Combination[] = [];
  private selectedTargetId: string | null = null;
  private selectedTargetPosition: LineoutPosition | null = null;
  private attackTokens: PlayerToken[] = [];
  private defenseTokens: PlayerToken[] = [];
  private attackSlotPlayers: Array<FieldPlayer | null> = [];
  private defenseSlotPlayers: Array<FieldPlayer | null> = [];
  private trainingAssignedPlayers: Array<FieldPlayer | null> = [];
  private isResolving = false;
  private currentMatchLineout?: MatchLineoutEvent;
  private opponentDefensiveJumpPosition: LineoutPosition | null = null;
  private opponentTargetId: string | null = null;
  private opponentTargetPosition: LineoutPosition | null = null;
  private opponentTargetOptionId: string | null = null;
  private opponentCombination: Combination | null = null;
  private dragState: DragState | null = null;
  private inspectedPlayer: FieldPlayer | null = null;
  private inspectorPanel?: PlayerStatsOverlay;
  private statusText?: Phaser.GameObjects.Text;
  private statusClearTimer?: Phaser.Time.TimerEvent;
  private hookerSprite?: RugbyPlayer;
  private hookerShadow?: PlayerGroundShadow;
  private hookerHeldBall?: Phaser.GameObjects.Container;
  private userSlotIndicators: Phaser.GameObjects.Rectangle[] = [];
  private readonly activeSlotPatterns: Record<number, number[]> = {
    1: [3],
    2: [3, 4],
    3: [2, 3, 4],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6]
  };

  constructor() {
    super("LineoutScene");
  }

  init(data: LineoutSceneData): void {
    this.mode = data.mode ?? "training";
    this.selectedCombinationId = data.combinationId;
    this.combinationConfirmed = data.combinationConfirmed ?? false;
  }

  preload(): void {
    if (!this.textures.exists("lineout-pitch-background")) {
      this.load.image("lineout-pitch-background", "assets/images/lineout-pitch-training.png");
    }
    if (!this.textures.exists("lineout-ball")) {
      this.load.image("lineout-ball", "assets/sprites/ball.png");
    }
    if (!this.textures.exists("lineout-ball-twist")) {
      this.load.image("lineout-ball-twist", "assets/sprites/ball2.png");
    }
  }

  create(): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const match = GameStore.getMatch();

    this.resetSceneState();
    this.currentMatchLineout = this.mode === "match" ? match?.lineouts[match.currentLineoutIndex] : undefined;
    this.allCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);

    const visibleCombinations = this.mode === "match"
      ? getActiveOffensiveCombinations(this.allCombinations, save.offensiveRepertoire)
        .filter(isCombinationValidForMatch)
        .map((combination) => rebuildPlayableCombinationTargets(
          combination,
          save.playerTeam.hooker,
          save.playerTeam.lineoutPlayers
        ))
        .filter((combination) => (combination.targetOptions?.length ?? 0) > 0)
      : this.allCombinations;

    if (this.mode === "match" && visibleCombinations.length === 0) {
      navigateTo(this, "MatchScene");
      return;
    }

    this.selectedCombination = visibleCombinations.find((combination) => combination.id === this.selectedCombinationId)
      ?? visibleCombinations[0]
      ?? this.allCombinations[0];
    this.selectedCombination = rebuildPlayableCombinationTargets(
      this.selectedCombination,
      save.playerTeam.hooker,
      save.playerTeam.lineoutPlayers
    );

    this.primeSlotOccupancy(save.playerTeam.lineoutPlayers);
    const layout = this.getLayout();
    this.renderBackground(layout);
    this.renderHeader();
    this.renderPlayerInspector();
    this.bindPlayerInspectorDismissal();
    this.renderPitch(layout);
    this.renderLineout(save.playerTeam.lineoutPlayers, layout);
    if (this.shouldShowCombinationSelection()) {
      this.renderMatchStatsOverlay();
      this.renderCombinationSelectionOverlay(visibleCombinations);
    } else {
      this.renderActions(layout);
    }
  }

  update(): void {
    if (!this.dragState) {
      return;
    }

    if (this.dragState.pointer.isDown) {
      this.trackDrag();
      return;
    }

    this.completeDrag();
  }

  private renderBackground(layout: LineoutLayout): void {
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x09131c);
    this.add.image(SCREEN_WIDTH / 2, layout.fieldTop + layout.fieldHeight / 2, "lineout-pitch-background")
      .setDisplaySize(layout.fieldWidth, layout.fieldHeight);
  }

  private renderHeader(): void {
    if (this.mode !== "training") {
      this.renderMatchScoreboard();
    }
  }

  private renderMatchScoreboard(): void {
    const match = GameStore.getMatch();
    if (!match) {
      return;
    }

    const minute = this.currentMatchLineout?.minute ?? match.minute;
    const opponentColors = getContrastingOpponentColors(match.home.colors, match.away.colors);
    new MatchScoreOverlay(this, {
      homeName: match.home.name,
      awayName: match.away.name,
      homeScore: match.ourScore,
      awayScore: match.opponentScore,
      minuteLabel: formatMatchMinute(minute),
      homeColors: match.home.colors,
      awayColors: opponentColors
    });
  }

  private renderPlayerInspector(): void {
    this.inspectorPanel = new PlayerStatsOverlay(
      this,
      GameStore.getSave().playerTeam.colors
    ).setVisible(false);
    const matchStatusY = MATCH_SCORE_OVERLAY_LAYOUT.y + MATCH_SCORE_OVERLAY_LAYOUT.height + 14;
    this.statusText = this.add.text(195, matchStatusY, "", {
      font: "bold 11px Arial",
      color: "#fca5a5",
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    this.refreshPlayerInspector();
  }

  private renderPitch(layout: LineoutLayout): void {
    this.renderDashedPitchLine(SCREEN_WIDTH / 2, layout.fifteenLineY, layout.fieldWidth, 3, 0.95);
    this.renderDashedPitchLine(SCREEN_WIDTH / 2, layout.fiveMeterLineY, layout.fieldWidth, 2, 0.72);
    this.add.rectangle(SCREEN_WIDTH / 2, layout.touchLineY, layout.fieldWidth, 3, 0xffffff, 0.95);

    this.refreshUserSlotIndicators(layout);

    this.renderHooker(layout);
  }

  private renderDashedPitchLine(centerX: number, y: number, width: number, height: number, alpha: number): void {
    const startX = centerX - width / 2;
    const endX = startX + width;
    let currentX = startX;

    while (currentX < endX) {
      const dashWidth = Math.min(RUGBY_DASH_WIDTH, endX - currentX);
      this.add.rectangle(currentX + dashWidth / 2, y, dashWidth, height, 0xffffff, alpha);
      currentX += RUGBY_DASH_WIDTH + RUGBY_DASH_GAP;
    }
  }

  private refreshUserSlotIndicators(layout: LineoutLayout): void {
    this.userSlotIndicators.forEach((indicator) => indicator.destroy());
    this.userSlotIndicators = [];
    const slotWidth = layout.playerWidth + 18;
    const slotHeight = Math.round(slotWidth * 0.72);
    const slotBottomOffset = 5;

    for (let index = 1; index <= 7; index += 1) {
      if (this.attackSlotPlayers[index - 1]) {
        continue;
      }

      const indicator = this.add.rectangle(
        layout.attackX,
        this.positionY(index as LineoutPosition, layout) + slotBottomOffset - slotHeight / 2,
        slotWidth,
        slotHeight,
        0xffffff,
        0.04
      )
        .setStrokeStyle(2, 0xffffff, 0.5);
      this.userSlotIndicators.push(indicator);
    }
  }

  private renderHooker(layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const isOpponentThrow = this.isDefensiveMatch();
    const hookerSide = isOpponentThrow ? "opponent" : "us";
    const hookerX = this.getHookerX(hookerSide, layout);
    const hookerNumber = isOpponentThrow
      ? (match?.away.hooker.number ?? 2)
      : save.playerTeam.hooker.number;
    const hookerFeetOffset = Math.round(
      TRAINING_HOOKER_FEET_OFFSET
      * layout.playerHeight
      / Math.round(FIELD_HEIGHT * PLAYER_FIELD_HEIGHT_RATIO)
    );
    const hookerFeetY = layout.hookerY + hookerFeetOffset;
    const hookerKit = this.getLineoutKit(hookerSide);
    const hookerDepth = this.getPlayerDepth(hookerFeetY);
    const hooker = isOpponentThrow ? match?.away.hooker ?? save.playerTeam.hooker : save.playerTeam.hooker;
    const hookerBodyShape = hooker.appearance.bodyShape;

    this.hookerShadow = new PlayerGroundShadow(
      this,
      hookerX,
      hookerFeetY,
      layout.playerWidth,
      layout.playerHeight,
      hookerBodyShape,
      "hooker_throw_back"
    ).setDepth(GROUND_SHADOW_DEPTH);

    this.hookerSprite = new RugbyPlayer(
      this,
      hookerX,
      hookerFeetY,
      "hooker_throw_back",
      hookerKit,
      hookerBodyShape,
      getPlayerSkinTint(hooker)
    ).setVisualSize(layout.playerWidth, layout.playerHeight);
    this.hookerSprite.setKit(hookerKit);

    const heldBallPosition = this.getHookerBallStart(hookerSide, layout);
    const heldBall = this.add.image(0, 0, "lineout-ball")
      .setDisplaySize(17, 24);
    const heldBallElevationPixels = Math.max(0, hookerFeetY - heldBallPosition.y);
    const heldBallShadowOffset = getElevatedObjectShadowOffset(heldBallElevationPixels);
    const heldBallShadow = this.add.image(
      heldBallShadowOffset.x,
      heldBallShadowOffset.y,
      "lineout-ball"
    )
      .setDisplaySize(heldBall.displayWidth, heldBall.displayHeight)
      .setTintFill(PLAYER_GROUND_SHADOW_STYLE.color)
      .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha)
      .setAngle(PLAYER_GROUND_SHADOW_STYLE.angleDegrees);
    this.hookerHeldBall = this.add.container(
      heldBallPosition.x,
      heldBallPosition.y,
      [heldBallShadow, heldBall]
    );

    // PlayerToken place le numero par rapport a son conteneur, dont le sprite a les pieds 4 px plus bas.
    const hookerNumberY = hookerFeetY - 1 - Math.max(12, layout.playerHeight * 0.42);
    const hookerText = this.add.text(hookerX, hookerNumberY, String(hookerNumber), {
      font: "bold 12px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.hookerSprite.setDepth(hookerDepth);
    this.hookerHeldBall.setDepth(hookerDepth + PLAYER_LABEL_DEPTH_OFFSET);
    hookerText.setDepth(hookerDepth + PLAYER_LABEL_DEPTH_OFFSET);

    if (this.mode !== "training" && !isOpponentThrow) {
      return;
    }

    const hitbox = this.add.zone(
      hookerX - layout.playerWidth / 2 - 6,
      hookerFeetY - layout.playerHeight,
      layout.playerWidth + 12,
      layout.playerHeight + 8
    ).setOrigin(0);
    hitbox.setData(PLAYER_TOKEN_HIT_AREA_DATA_KEY, true);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.on("pointerdown", () => {
      const hooker = isOpponentThrow ? match?.away.hooker : save.playerTeam.hooker;
      if (hooker) {
        this.showHookerInspector(hooker);
      }
    });
    hitbox.setDepth(hookerDepth + PLAYER_HITBOX_DEPTH_OFFSET);
  }

  private renderLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    if (this.mode === "training") {
      this.renderTrainingLineout(players, layout);
      return;
    }

    if (this.isDefensiveMatch()) {
      this.renderDefensiveLineout(layout);
      return;
    }

    this.renderOffensiveMatchLineout(players, layout);
  }

  private renderTrainingLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    this.trainingAssignedPlayers = getPlayersAssignedToCombination(players, this.selectedCombination);
    this.attackSlotPlayers = this.trainingAssignedPlayers.slice();

    this.trainingAssignedPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(
        this,
        layout.attackX,
        this.positionY(position, layout),
        player,
        GameStore.getSave().playerTeam.colors.primary,
        {
          pose: this.getLineoutPose("us"),
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindTrainingSlotToken(token, index);
    });

    const reservePlayers = getUnassignedCombinationPlayers(players, this.selectedCombination);
    reservePlayers.forEach((player, index) => {
      const token = new PlayerToken(
        this,
        layout.reserveX,
        this.reservePositionY(index, layout),
        player,
        GameStore.getSave().playerTeam.colors.primary,
        {
          pose: "receiver_front",
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      this.syncPlayerTokenDepth(token);
      this.bindTrainingReserveToken(token);
    });

  }

  private renderOffensiveMatchLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const opponentPlayers = match?.away.lineoutPlayers ?? [];
    this.attackSlotPlayers = getPlayersAssignedToCombination(players, this.selectedCombination);

    this.attackSlotPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(
        this,
        layout.attackX,
        this.positionY(position, layout),
        player,
        save.playerTeam.colors.primary,
        {
          pose: this.getLineoutPose("us"),
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindMatchAttackToken(token);
      this.attackTokens.push(token);
    });
    this.markTargetablePlayers(this.attackTokens, this.selectedCombination);

    const attackCount = Math.max(2, countAssignedPlayers(this.selectedCombination));
    const defense = buildDefensivePlan(opponentPlayers, attackCount);
    this.defenseSlotPlayers = this.createDefenseSlotsForAttack(
      defense.selectedPlayers,
      this.attackSlotPlayers
    );
    const defenseColor = match?.away.colors.primary ?? UI.colors.defense;

    this.defenseSlotPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.defenseX ?? 250, this.positionY(position, layout), player, defenseColor, {
        pose: this.getLineoutPose("opponent"),
        kit: this.getLineoutKit("opponent"),
        bodyShape: player.appearance.bodyShape,
        displayWidth: layout.playerWidth,
        displayHeight: layout.playerHeight
      });
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindOpponentInspectorToken(token);
      this.defenseTokens.push(token);
    });
  }

  private renderMatchStatsOverlay(): void {
    const match = GameStore.getMatch();
    if (!match || !this.currentMatchLineout) {
      return;
    }

    const opponentColors = getContrastingOpponentColors(match.home.colors, match.away.colors);
    new MatchStatsOverlay(this, {
      possessionLabel: t("match.possession"),
      occupationLabel: t("match.occupation"),
      zoneLabel: t("match.zone"),
      zoneValue: t(`match.zone.${this.currentMatchLineout.pitchZone}`),
      possession: Math.round(match.possession),
      occupation: Math.round(match.occupation),
      homeColors: match.home.colors,
      awayColors: opponentColors
    });
  }

  private renderCombinationSelectionOverlay(combinations: Combination[]): void {
    new LineoutCombinationOverlay(this, combinations, {
      title: t("match.chooseCombination"),
      getCombinationName: (combination) => getCombinationDisplayName(combination, t),
      getPlayersLabel: (count) => t("match.comboPlayers").replace("{count}", String(count)),
      onSelect: (combination) => {
        this.scene.restart({
          mode: "match",
          combinationId: combination.id,
          combinationConfirmed: true
        } satisfies LineoutSceneData);
      }
    });
  }

  private renderDefensiveLineout(layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const numberOfPlayers = this.currentMatchLineout?.numberOfPlayers ?? 7;
    this.attackSlotPlayers = getDefensiveLineoutSlots(
      save.playerTeam,
      save.defensivePriority,
      save.defenseMemory,
      numberOfPlayers,
      this.getActiveSlotIndices(numberOfPlayers)
    );

    this.attackSlotPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(
        this,
        layout.attackX,
        this.positionY(position, layout),
        player,
        save.playerTeam.colors.primary,
        {
          pose: this.getLineoutPose("us"),
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      token.setTargetable(this.getUserDefensiveSelectionMode(position) !== "unavailable");
      this.syncPlayerTokenDepth(token);
      this.bindMatchDefenseToken(token);
      this.attackTokens.push(token);
    });

    const opponentColor = match?.away.colors.primary ?? UI.colors.defense;
    this.defenseSlotPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.defenseX ?? 250, this.positionY(position, layout), player, opponentColor, {
        pose: this.getLineoutPose("opponent"),
        kit: this.getLineoutKit("opponent"),
        bodyShape: player.appearance.bodyShape,
        displayWidth: layout.playerWidth,
        displayHeight: layout.playerHeight
      });
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindOpponentInspectorToken(token);
      this.defenseTokens.push(token);
    });
    if (this.opponentCombination) {
      this.markTargetablePlayers(this.defenseTokens, this.opponentCombination);
    }
  }

  private bindTrainingSlotToken(token: PlayerToken, slotIndex: number): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointerPosition = this.getPointerWorldPosition(pointer);
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "training-slot", slotIndex },
        pointer,
        token,
        startX: pointerPosition.x,
        startY: pointerPosition.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindTrainingReserveToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointerPosition = this.getPointerWorldPosition(pointer);
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "training-reserve" },
        pointer,
        token,
        startX: pointerPosition.x,
        startY: pointerPosition.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindMatchAttackToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointerPosition = this.getPointerWorldPosition(pointer);
      this.dragState = {
        origin: { kind: "match-attack" },
        pointer,
        token,
        startX: pointerPosition.x,
        startY: pointerPosition.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindMatchDefenseToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointerPosition = this.getPointerWorldPosition(pointer);
      this.hidePlayerInspector();
      this.dragState = {
        origin: { kind: "match-defense" },
        pointer,
        token,
        startX: pointerPosition.x,
        startY: pointerPosition.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindOpponentInspectorToken(token: PlayerToken): void {
    token.on("pointerdown", () => {
      this.setInspectedPlayer(token.player);
    });
  }

  private renderActions(layout: LineoutLayout): void {
    if (this.mode === "match") {
      return;
    }

    new UIButton(this, 103, layout.navigationY, 164, 44, t("button.combinations"), () => navigateTo(this, "CombinationListScene", { combinationId: this.selectedCombination.id }))
      .setDepth(LINEOUT_ACTION_DEPTH);
    new UIButton(this, 287, layout.navigationY, 164, 44, t("menu.championship"), () => navigateTo(this, "ChampionshipScene"), {
      variant: "secondary"
    }).setDepth(LINEOUT_ACTION_DEPTH);
  }

  private trackDrag(): void {
    if (!this.dragState) {
      return;
    }

    const { origin, pointer, token } = this.dragState;
    if (!pointer.isDown) {
      return;
    }

    if (origin.kind === "match-attack") {
      return;
    }

    const pointerPosition = this.getPointerWorldPosition(pointer);
    const movement = Phaser.Math.Distance.Between(
      this.dragState.startX,
      this.dragState.startY,
      pointerPosition.x,
      pointerPosition.y
    );
    if (!this.dragState.moved && movement < 10) {
      return;
    }

    const startedDragging = !this.dragState.moved;
    this.dragState.moved = true;
    const layout = this.getLayout();

    if (origin.kind === "training-slot" || origin.kind === "training-reserve") {
      token.x = Phaser.Math.Clamp(pointerPosition.x, 28, 362);
      token.y = Phaser.Math.Clamp(pointerPosition.y, layout.fieldTop + layout.playerHeight - 4, layout.navigationY - 32);
      this.syncPlayerTokenDepth(token);
      return;
    }

    if (origin.kind === "match-defense") {
      if (startedDragging) {
        this.setInspectedPlayer(token.player);
      }
      const minY = Math.min(this.positionY(1, layout), this.positionY(7, layout));
      const maxY = Math.max(this.positionY(1, layout), this.positionY(7, layout));
      token.y = Phaser.Math.Clamp(pointerPosition.y, minY, maxY);
      this.syncPlayerTokenDepth(token);
    }
  }

  private getPointerWorldPosition(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
  }

  private completeDrag(): void {
    if (!this.dragState) {
      return;
    }

    const drag = this.dragState;
    this.dragState = null;

    if (!drag.moved) {
      this.handleTap(drag);
      return;
    }

    if (drag.origin.kind === "training-slot" || drag.origin.kind === "training-reserve") {
      this.handleTrainingDrop(drag);
      return;
    }

    if (drag.origin.kind === "match-defense") {
      this.finishMatchDefenseReorder(drag.token);
      return;
    }

    drag.token.x = drag.homeX;
    drag.token.y = drag.homeY;
    this.syncPlayerTokenDepth(drag.token);
  }

  private handleTap(drag: DragState): void {
    if (drag.origin.kind === "match-attack") {
      const targetPosition = drag.token.getData("lineoutPosition") as LineoutPosition | undefined;
      if (!findCombinationTargetOption(this.selectedCombination, targetPosition ?? null)) {
        this.setInspectedPlayer(drag.token.player);
        return;
      }
      this.hidePlayerInspector();
      this.throwLineout(drag.token.player.id);
      return;
    }

    if (drag.origin.kind === "match-defense") {
      const position = drag.token.getData("lineoutPosition") as LineoutPosition | undefined;
      if (
        position === undefined
        || this.getUserDefensiveSelectionMode(position) === "unavailable"
      ) {
        this.setInspectedPlayer(drag.token.player);
        this.flashStatus(t("lineout.status.defenderUnavailable"));
        return;
      }
      this.defendLineout(drag.token.player.id);
      return;
    }

    drag.token.x = drag.homeX;
    drag.token.y = drag.homeY;
    this.syncPlayerTokenDepth(drag.token);
  }

  private handleTrainingDrop(drag: DragState): void {
    const layout = this.getLayout();
    const targetSlotIndex = this.findTrainingTargetSlot(drag.token.x, drag.token.y, layout);
    const sourceSlotIndex = drag.origin.kind === "training-slot" ? drag.origin.slotIndex : null;

    if (targetSlotIndex !== null) {
      const nextAssignments = this.trainingAssignedPlayers.slice();

      if (sourceSlotIndex !== null) {
        const targetPlayer = nextAssignments[targetSlotIndex];
        nextAssignments[targetSlotIndex] = nextAssignments[sourceSlotIndex];
        nextAssignments[sourceSlotIndex] = targetPlayer ?? null;
      } else {
        nextAssignments[targetSlotIndex] = drag.token.player;
      }

      this.persistTrainingAssignments(nextAssignments);
      return;
    }

    if (sourceSlotIndex !== null && this.isInTrainingReserveZone(drag.token.x, drag.token.y, layout)) {
      const nextAssignments = this.trainingAssignedPlayers.slice();
      nextAssignments[sourceSlotIndex] = null;
      this.persistTrainingAssignments(nextAssignments);
      return;
    }

    this.scene.restart({ mode: "training", combinationId: this.selectedCombination.id });
  }

  private finishMatchDefenseReorder(token: PlayerToken): void {
    const previousLayout = this.getDefenseMemorySlotIds().join("|");
    const layout = this.getLayout();
    const sourceIndex = ((token.getData("lineoutPosition") as number | undefined) ?? 1) - 1;
    const targetIndex = this.findDefenseTargetSlot(token.y, layout);
    const nextAssignments = this.attackSlotPlayers.slice();
    const targetPlayer = nextAssignments[targetIndex] ?? null;

    nextAssignments[targetIndex] = token.player;
    if (sourceIndex !== targetIndex) {
      nextAssignments[sourceIndex] = targetPlayer;
    }

    this.attackSlotPlayers = nextAssignments;
    this.syncDefenseTokenPositions(layout);
    this.refreshUserSlotIndicators(layout);
    const nextLayout = this.getDefenseMemorySlotIds().join("|");
    if (previousLayout !== nextLayout && this.currentMatchLineout) {
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.getDefenseMemorySlotIds());
    }
  }

  private persistTrainingAssignments(assignments: Array<FieldPlayer | null>): void {
    const updatedCombinations = replaceCombinationLayout(this.allCombinations, this.selectedCombination.id, assignments);
    GameStore.setOffensiveCombinations(updatedCombinations);
    this.scene.restart({ mode: "training", combinationId: this.selectedCombination.id });
  }

  private throwLineout(targetPlayerId?: string): void {
    prepareGameAudio(this);

    if (this.isResolving) {
      return;
    }

    if (targetPlayerId) {
      const targetToken = this.attackTokens.find((token) => token.player.id === targetPlayerId);
      if (targetToken) {
        this.selectTarget(targetToken);
      }
    }

    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId);
    const targetOption = this.findSelectedTargetOption();
    if (!targetToken || !targetOption) {
      this.flashStatus(t("lineout.status.selectTarget"));
      return;
    }

    this.isResolving = true;
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const pitchZone = match?.lineouts[match.currentLineoutIndex]?.pitchZone ?? "middle";
    const result = resolveLineout(
      {
        throwingSide: "us",
        pitchZone,
        minute: this.currentMatchLineout?.minute ?? match?.minute ?? 0,
        numberOfPlayers: Math.max(2, countAssignedPlayers(this.selectedCombination)),
        hooker: save.playerTeam.hooker,
        attackingPlayers: this.attackSlotPlayers,
        defendingPlayers: this.defenseSlotPlayers,
        combination: this.selectedCombination,
        targetPlayerId: this.selectedTargetId ?? undefined,
        targetPosition: this.selectedTargetPosition ?? undefined,
        defensiveJumpPosition: this.opponentDefensiveJumpPosition ?? undefined,
        maximumFatigueByPlayerId: match?.maximumFatigueByPlayerId
      }
    );

    if (this.mode === "match" && match) {
      const updated = result.resolution
        ? applyLineoutResolutionToMatch(match, result.resolution, "us")
        : { ...match };
      updated.lineouts[updated.currentLineoutIndex].resolved = true;
      updated.minute = this.currentMatchLineout?.minute ?? updated.minute;
      updated.currentLineoutIndex += 1;
      updated.playerUsage = this.recordOffensiveUsage(updated.playerUsage, save.playerTeam.hooker.id);
      this.recordOffensiveSummary(updated, result);
      GameStore.setMatch(updated);
      if (this.selectedTargetPosition) {
        GameStore.observePlayerLineoutTarget(
          match.away.id,
          this.selectedCombination.id,
          this.selectedTargetPosition
        );
      }
    }

    this.playThrowAnimation(
      "us",
      this.selectedTargetPosition ?? 4,
      this.attackTokens,
      this.defenseTokens,
      this.opponentDefensiveJumpPosition ?? undefined,
      getLineoutAnimationTargetType(result, targetOption.type),
      result,
      () => {
      this.isResolving = false;
      this.showResult(result);
      }
    );
  }

  private defendLineout(targetPlayerId?: string): void {
    prepareGameAudio(this);

    if (this.isResolving) {
      return;
    }

    if (targetPlayerId) {
      const targetToken = this.attackTokens.find((token) => token.player.id === targetPlayerId);
      if (targetToken) {
        this.selectTarget(targetToken);
      }
    }

    this.revealOpponentTarget();

    this.isResolving = true;
    const match = GameStore.getMatch();
    if (!match) {
      this.isResolving = false;
      return;
    }
    const result = resolveDefensiveLineout({
      throwingSide: "opponent",
      pitchZone: this.currentMatchLineout?.pitchZone ?? "middle",
      minute: this.currentMatchLineout?.minute ?? match.minute,
      numberOfPlayers: this.currentMatchLineout?.numberOfPlayers ?? 7,
      hooker: match.away.hooker,
      attackingPlayers: this.defenseSlotPlayers,
      defendingPlayers: this.attackSlotPlayers,
      combination: this.opponentCombination ?? undefined,
      targetPlayerId: this.opponentTargetId ?? undefined,
      targetPosition: this.opponentTargetPosition ?? undefined,
      defensiveJumpPosition: this.selectedTargetPosition ?? undefined,
      maximumFatigueByPlayerId: match.maximumFatigueByPlayerId
    }, this.selectedTargetId ?? undefined);

    const updated = result.resolution
      ? applyLineoutResolutionToMatch(match, result.resolution, "opponent")
      : { ...match };
    updated.lineouts[updated.currentLineoutIndex].resolved = true;
    updated.minute = this.currentMatchLineout?.minute ?? updated.minute;
    updated.currentLineoutIndex += 1;
    updated.playerUsage = this.recordDefensiveUsage(updated.playerUsage, result);
    this.recordOpponentOffensiveSummary(updated, result);
    updated.lineoutHistory.push({
      minute: this.currentMatchLineout?.minute ?? updated.minute,
      throwingSide: "opponent",
      displayedResult: result.displayedResult,
      success: result.displayedResult !== "lost",
      combinationId: this.opponentCombination?.id,
      targetOptionId: this.opponentTargetOptionId ?? undefined,
      targetPosition: this.opponentTargetPosition ?? undefined,
      defensivePosition: this.selectedTargetPosition ?? undefined,
      officialOutcome: result.resolution?.outcome
    });
    GameStore.setMatch(updated);

    if (this.selectedTargetPosition) {
      GameStore.observePlayerDefensiveChoice(
        match.away.id,
        this.selectedTargetPosition,
        result.resolution?.ballTeam === "defendingTeam"
      );
    }

    if (this.currentMatchLineout) {
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.getDefenseMemorySlotIds());
    }

    this.playThrowAnimation(
      "opponent",
      this.opponentTargetPosition ?? 4,
      this.defenseTokens,
      this.attackTokens,
      this.selectedTargetPosition ?? undefined,
      getLineoutAnimationTargetType(
        result,
        this.opponentCombination?.targetOptions?.find(
          (option) => option.id === this.opponentTargetOptionId
        )?.type ?? "jumpBlock"
      ),
      result,
      () => {
      this.isResolving = false;
      this.showResult(result);
      }
    );
  }

  private playThrowAnimation(
    throwingSide: "us" | "opponent",
    targetPosition: LineoutPosition,
    lineTokens: PlayerToken[],
    defendingTokens: PlayerToken[],
    defendingJumpPosition: LineoutPosition | undefined,
    targetOptionType: "jumpBlock" | "directCatch",
    result: LineoutResult,
    onComplete: () => void
  ): void {
    const layout = this.getLayout();
    const trajectory = getLineoutAnimationTrajectory(result);
    const targetToken = lineTokens.find((token) => (token.getData("lineoutPosition") as LineoutPosition | undefined) === targetPosition)
      ?? lineTokens[0];
    const supportTokens = lineTokens.filter((token) => {
      const position = token.getData("lineoutPosition") as LineoutPosition | undefined;
      return position === targetPosition - 1 || position === targetPosition + 1;
    });
    const throwStart = this.getHookerBallStart(throwingSide, layout);
    const startX = throwStart.x;
    const startY = throwStart.y;
    const initialBallElevationPixels = Math.max(
      0,
      (this.hookerSprite?.y ?? layout.hookerY) - startY
    );
    const apexBallElevationPixels = Math.max(
      initialBallElevationPixels,
      (this.hookerSprite?.getVisualHeight() ?? layout.playerHeight)
        * LINEOUT_THROW_ANIMATION.ballShadowApexPlayerHeightRatio
    );
    const shouldTargetJump = Boolean(
      targetOptionType === "jumpBlock"
      && targetToken
      && canBeLineoutJumper(targetToken.player)
    );
    const targetJumpQuality = this.getAnimationJumpQuality(
      result,
      "attackJumpQuality"
    );
    const lowFailedJumpRecovery = trajectory === "low"
      && targetOptionType === "jumpBlock"
      && result.resolution?.details.attackJumpSucceeded === false;
    const targetAnimationJumpQuality = lowFailedJumpRecovery ? 0 : targetJumpQuality;
    const targetJumpMetrics = getLineoutJumpAnimationMetrics(targetAnimationJumpQuality);
    const targetBaseY = targetToken?.y ?? this.positionY(4, layout);
    const targetHandsX = targetToken?.x ?? layout.attackX;
    const targetHandsOffset = getBallAnimationTargetOffset(
      lowFailedJumpRecovery ? "low" : "precise",
      lowFailedJumpRecovery ? false : shouldTargetJump,
      layout.playerHeight,
      0,
      targetJumpMetrics.heightPixels
    );
    const targetHandsY = targetBaseY + targetHandsOffset.y;
    const horizontalOffset = sampleThrowHorizontalOffset(
      getLineoutAnimationThrowQuality(result),
      MATH_RANDOM_SOURCE
    );
    const volleyHorizontalDistance = sampleVolleyHorizontalDistance(
      MATH_RANDOM_SOURCE
    );
    const ball: LineoutBallGameObject = this.add.image(0, 0, "lineout-ball").setDisplaySize(17, 24);
    const ballShadowOffset = getElevatedObjectShadowOffset(
      initialBallElevationPixels
    );
    const ballShadow: LineoutBallGameObject = this.add.image(
      ballShadowOffset.x,
      ballShadowOffset.y,
      "lineout-ball"
    )
      .setDisplaySize(ball.displayWidth, ball.displayHeight)
      .setTintFill(PLAYER_GROUND_SHADOW_STYLE.color);
    ballShadow
      .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha)
      .setAngle(PLAYER_GROUND_SHADOW_STYLE.angleDegrees);
    const ballShadowBaseScaleX = ballShadow.scaleX;
    const ballShadowBaseScaleY = ballShadow.scaleY;
    const ballVisual = this.add.container(startX, startY, [ballShadow, ball])
      .setDepth(this.getPlayerDepth(startY) + PLAYER_LABEL_DEPTH_OFFSET);
    this.hookerHeldBall?.destroy();
    this.hookerHeldBall = undefined;
    const defendingTargetToken = defendingJumpPosition
      ? defendingTokens.find((token) => (token.getData("lineoutPosition") as LineoutPosition | undefined) === defendingJumpPosition)
      : undefined;
    const defendingSupportTokens = defendingJumpPosition
      ? defendingTokens.filter((token) => {
        const position = token.getData("lineoutPosition") as LineoutPosition | undefined;
        return position === defendingJumpPosition - 1 || position === defendingJumpPosition + 1;
      })
      : [];

    this.hookerSprite?.setScale(1, 1);
    this.hookerSprite?.setPose("hooker_throw_back");
    this.hookerShadow?.setPose("hooker_throw_back");
    this.time.delayedCall(LINEOUT_LIFT_ANIMATION.hookerReleaseDelayMs, () => {
      this.hookerSprite?.setPose("lifter_front");
      this.hookerShadow?.setPose("lifter_front");
      this.hookerSprite?.setScale(LINEOUT_LIFT_ANIMATION.hookerLiftPoseWidthScale, 1);
    });
    const shouldDefenderJump = Boolean(
      defendingTargetToken
      && result.resolution?.details.defensiveSelectionMode === "aerialCounter"
    );
    const defenderJumpQuality = this.getAnimationJumpQuality(
      result,
      "defenseJumpQuality"
    );
    const defenderJumpMetrics = getLineoutJumpAnimationMetrics(defenderJumpQuality);
    const defendingHandsY = defendingTargetToken
      ? defendingTargetToken.y + getBallAnimationTargetOffset(
        "precise",
        shouldDefenderJump,
        layout.playerHeight,
        0,
        defenderJumpMetrics.heightPixels
      ).y
      : undefined;
    const defendingHandsX = defendingTargetToken?.x;
    const recordedRecoveryPosition = this.getAnimationRecoveryPosition(result);
    const recoveryUsesDefendingTeam = result.resolution?.outcome === "knockOn"
      ? result.resolution.offendingTeam === "defendingTeam"
      : result.resolution?.ballTeam === "defendingTeam";
    const recoveryTokens = recoveryUsesDefendingTeam ? defendingTokens : lineTokens;
    const recordedRecoveryPlayerId = result.resolution?.details.cascadeRecoveryPlayerId;
    const recoveryToken = typeof recordedRecoveryPlayerId === "string"
      ? recoveryTokens.find((token) => token.player.id === recordedRecoveryPlayerId)
        ?? recoveryTokens.find(
          (token) => token.getData("lineoutPosition") === recordedRecoveryPosition
        )
      : recoveryTokens.find(
        (token) => token.getData("lineoutPosition") === recordedRecoveryPosition
      );
    const recoveryTokenPosition = recoveryToken?.getData("lineoutPosition");
    const recoveryPosition = recordedRecoveryPosition
      ?? (
        typeof recoveryTokenPosition === "number"
        && Number.isInteger(recoveryTokenPosition)
        && recoveryTokenPosition >= 1
        && recoveryTokenPosition <= 7
          ? recoveryTokenPosition as LineoutPosition
          : undefined
      );
    const recoveryKind = result.resolution?.details.recoveryKind;
    const secondaryVisitedPositions = this.getAnimationPositionList(
      result,
      "cascadeVisitedPositions"
    );
    const secondaryWaypoints: SecondaryBallWaypoint[] = [];
    if (
      (secondaryVisitedPositions.length > 0 || recoveryKind === "out15m")
      && (trajectory === "precise" || trajectory === "high")
    ) {
      secondaryWaypoints.push({
        position: targetPosition,
        x: layout.hookerX + horizontalOffset,
        y: trajectory === "high"
          ? targetHandsY - LINEOUT_THROW_ANIMATION.highBallClearancePixels
          : targetHandsY
      });
    }
    secondaryWaypoints.push(...secondaryVisitedPositions.map((position) => {
      const mode = this.getSecondaryAttemptMode(result, targetPosition, position);
      const isRecoveryPosition = recoveryKind === "secondary"
        && position === recoveryPosition;
      return {
        position,
        x: isRecoveryPosition && recoveryToken
          ? recoveryToken.x
          : layout.hookerX + horizontalOffset,
        y: this.positionY(position, layout)
          + this.getSecondaryBallOffsetY(mode, layout.playerHeight, trajectory)
      };
    }));
    const recoveryMode = recoveryPosition
      ? this.getSecondaryAttemptMode(result, targetPosition, recoveryPosition)
      : undefined;
    const recoveryHandsY = recoveryToken
      ? recoveryToken.y + (
        recoveryKind === "ground"
          ? getHandPoseBallOffset(layout.playerHeight).y
          : recoveryMode
            ? this.getSecondaryBallOffsetY(recoveryMode, layout.playerHeight, trajectory)
            : getBallAnimationTargetOffset(
              "precise",
              false,
              layout.playerHeight,
              0
            ).y
      )
      : undefined;
    const recoveryHandsX = recoveryToken?.x;
    const groundPosition = this.getAnimationDetailPosition(result, "groundPosition");
    const groundPointFeetY = groundPosition
      ? this.positionY(groundPosition, layout)
      : undefined;
    const usCampX = this.mode === "training"
      ? layout.hookerX - 75
      : layout.attackX - 20;
    const opponentCampX = this.mode === "training"
      ? layout.hookerX + 75
      : (layout.defenseX ?? layout.hookerX + 55) + 20;
    const plan = buildLineoutBallAnimationPlan({
      result,
      corridorX: layout.hookerX,
      throwingCampX: throwingSide === "us" ? usCampX : opponentCampX,
      defendingCampX: throwingSide === "us" ? opponentCampX : usCampX,
      targetHandsX,
      targetHandsY,
      targetGroundY: targetBaseY,
      defendingHandsX,
      defendingHandsY,
      defendingGroundY: defendingTargetToken?.y,
      recoveryHandsX,
      recoveryHandsY,
      recoveryGroundY: recoveryToken?.y,
      secondaryPath: secondaryWaypoints,
      groundPointX: groundPosition
        ? layout.hookerX + horizontalOffset
        : undefined,
      groundPointFeetY,
      slotGap: layout.slotGap,
      horizontalOffset,
      volleyHorizontalDistance,
      volleyMinimumX: LINEOUT_THROW_ANIMATION.ballScreenMarginPixels,
      volleyMaximumX: layout.fieldWidth
        - LINEOUT_THROW_ANIMATION.ballScreenMarginPixels
    });
    const corridorPhases = trajectory === "notStraight"
      ? plan.phases
      : applyThrowCorridorFlight(
        layout.hookerX,
        horizontalOffset,
        plan.phases
      );
    const corridorFlightPhaseCount = corridorPhases.length - plan.phases.length;
    const phases = applyConstantBallTravelSpeed(
      startX,
      startY,
      corridorPhases
    );
    const targetFollowsFrontAttempts = trajectory === "low"
      && secondaryWaypoints.length > 0
      && recoveryKind !== "secondary";
    const targetArrivalDurationMs = targetFollowsFrontAttempts
      ? phases
        .slice(0, corridorFlightPhaseCount + secondaryWaypoints.length + 1)
        .reduce((total, phase) => total + phase.durationMs, 0)
      : phases
        .slice(0, corridorFlightPhaseCount + 1)
        .reduce((total, phase) => total + phase.durationMs, 0);
    const defendingArrivalDurationMs = defendingHandsX !== undefined
      && defendingHandsY !== undefined
      ? getBallTravelDurationMs(
        startX,
        startY,
        defendingHandsX,
        defendingHandsY
      )
      : targetArrivalDurationMs;
    const retainedToken = plan.retainedBy === "target"
      ? targetToken
      : plan.retainedBy === "defending"
        ? defendingTargetToken
        : plan.retainedBy === "recovery"
          ? recoveryToken
        : undefined;
    const targetArrivalElevationPixels = Math.max(0, targetBaseY - targetHandsY);
    const defendingArrivalElevationPixels = defendingTargetToken && defendingHandsY !== undefined
      ? Math.max(0, defendingTargetToken.y - defendingHandsY)
      : targetArrivalElevationPixels;
    const recoveryArrivalElevationPixels = recoveryToken && recoveryHandsY !== undefined
      ? Math.max(0, recoveryToken.y - recoveryHandsY)
      : targetArrivalElevationPixels;
    const primaryArrivalElevationPixels = plan.retainedBy === "defending"
      ? defendingArrivalElevationPixels
      : targetArrivalElevationPixels;
    const finalBallElevationPixels = plan.retainedBy === "target"
      ? targetArrivalElevationPixels
      : plan.retainedBy === "defending"
        ? defendingArrivalElevationPixels
        : plan.retainedBy === "recovery"
          ? recoveryArrivalElevationPixels
          : plan.leavesScreen
            ? primaryArrivalElevationPixels
            : 0;
    const totalTravelDurationMs = phases.reduce(
      (total, phase) => total + phase.durationMs,
      0
    );
    const ballShadowFlightProfile: BallShadowFlightProfile = {
      startElevationPixels: initialBallElevationPixels,
      apexElevationPixels: Math.max(
        apexBallElevationPixels,
        primaryArrivalElevationPixels
      ),
      arrivalElevationPixels: primaryArrivalElevationPixels,
      finalElevationPixels: finalBallElevationPixels,
      primaryFlightDurationMs: targetArrivalDurationMs,
      totalTravelDurationMs,
      baseScaleX: ballShadowBaseScaleX,
      baseScaleY: ballShadowBaseScaleY
    };
    const targetCanAttempt = !(targetOptionType === "directCatch" && trajectory === "high");
    if (targetCanAttempt) {
      this.animateJumpGroup(
        lowFailedJumpRecovery ? [] : supportTokens,
        targetToken,
        shouldTargetJump,
        targetArrivalDurationMs,
        Boolean(retainedToken && retainedToken === targetToken),
        targetAnimationJumpQuality,
        layout.hookerX
      );
    }
    this.animateJumpGroup(
      defendingSupportTokens,
      defendingTargetToken,
      shouldDefenderJump,
      defendingArrivalDurationMs,
      Boolean(retainedToken && retainedToken === defendingTargetToken),
      defenderJumpQuality,
      layout.hookerX
    );
    this.animateSecondaryRecoveryAttempts(
      result,
      targetPosition,
      lineTokens,
      defendingTokens,
      secondaryWaypoints,
      phases,
      corridorFlightPhaseCount,
      retainedToken
    );

    const twistTimer = this.startBallFlightAppearance(ball, targetArrivalDurationMs);
    this.playBallAnimationPhases(
      ballVisual,
      ball,
      ballShadow,
      ballShadowFlightProfile,
      phases,
      () => {
        twistTimer?.remove(false);
        if (ball instanceof Phaser.GameObjects.Image && ball.active) {
          ball.setTexture("lineout-ball");
        }
        if (retainedToken) {
          ballShadow.setVisible(false);
          this.retainBallInPlayerHands(ballVisual, ball, retainedToken, layout.playerHeight);
          return;
        }
        if (plan.leavesScreen) {
          ballVisual.destroy();
        }
      }
    );
    const ballDuration = totalTravelDurationMs + plan.holdDurationMs;
    const targetJumpAnimationDelayMs = shouldTargetJump
      ? Math.max(
        0,
        targetArrivalDurationMs
        - LINEOUT_LIFT_ANIMATION.approachDurationMs
        - targetJumpMetrics.liftDurationMs
        - LINEOUT_LIFT_ANIMATION.jumpAnticipationMs
      )
      : 0;
    const defenderJumpAnimationDelayMs = shouldDefenderJump
      ? Math.max(
        0,
        defendingArrivalDurationMs
        - LINEOUT_LIFT_ANIMATION.approachDurationMs
        - defenderJumpMetrics.liftDurationMs
        - LINEOUT_LIFT_ANIMATION.jumpAnticipationMs
      )
      : 0;
    const jumpSequenceDurationMs = Math.max(
      shouldTargetJump
        ? targetJumpAnimationDelayMs
          + getLineoutLiftSequenceDurationMs(true, targetAnimationJumpQuality)
        : 0,
      shouldDefenderJump
        ? defenderJumpAnimationDelayMs
          + getLineoutLiftSequenceDurationMs(true, defenderJumpQuality)
        : 0
    );
    this.time.delayedCall(
      Math.max(ballDuration, jumpSequenceDurationMs),
      onComplete
    );
  }

  private startBallFlightAppearance(
    ball: LineoutBallGameObject,
    flightDurationMs: number
  ): Phaser.Time.TimerEvent | undefined {
    if (!(ball instanceof Phaser.GameObjects.Image)) {
      return undefined;
    }

    let useTwistFrame = false;
    const twistTimer = this.time.addEvent({
      delay: LINEOUT_THROW_ANIMATION.twistFrameDurationMs,
      loop: true,
      callback: () => {
        if (!ball.active) {
          return;
        }
        useTwistFrame = !useTwistFrame;
        ball.setTexture(useTwistFrame ? "lineout-ball-twist" : "lineout-ball");
      }
    });

    if (flightDurationMs > 0) {
      this.tweens.add({
        targets: ball,
        scaleX: ball.scaleX * LINEOUT_THROW_ANIMATION.flightApexScale,
        scaleY: ball.scaleY * LINEOUT_THROW_ANIMATION.flightApexScale,
        duration: flightDurationMs / 2,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    }

    return twistTimer;
  }

  private getBallShadowFlightState(
    profile: BallShadowFlightProfile,
    elapsedMs: number
  ): { elevationPixels: number; archRatio: number } {
    const primaryDurationMs = Math.max(1, profile.primaryFlightDurationMs);
    if (elapsedMs <= primaryDurationMs) {
      const progress = Phaser.Math.Clamp(elapsedMs / primaryDurationMs, 0, 1);
      const archRatio = Math.sin(Math.PI * progress);
      const baselineElevation = Phaser.Math.Linear(
        profile.startElevationPixels,
        profile.arrivalElevationPixels,
        progress
      );
      const middleBaselineElevation = (
        profile.startElevationPixels + profile.arrivalElevationPixels
      ) / 2;
      const apexBoost = Math.max(
        0,
        profile.apexElevationPixels - middleBaselineElevation
      );
      return {
        elevationPixels: baselineElevation + archRatio * apexBoost,
        archRatio
      };
    }

    const secondaryDurationMs = Math.max(
      1,
      profile.totalTravelDurationMs - primaryDurationMs
    );
    const secondaryProgress = Phaser.Math.Clamp(
      (elapsedMs - primaryDurationMs) / secondaryDurationMs,
      0,
      1
    );
    return {
      elevationPixels: Phaser.Math.Linear(
        profile.arrivalElevationPixels,
        profile.finalElevationPixels,
        secondaryProgress
      ),
      archRatio: 0
    };
  }

  private playBallAnimationPhases(
    ballVisual: Phaser.GameObjects.Container,
    ball: LineoutBallGameObject,
    ballShadow: LineoutBallGameObject,
    shadowProfile: BallShadowFlightProfile,
    phases: readonly BallAnimationPhase[],
    onComplete: () => void,
    phaseIndex = 0,
    elapsedBeforePhaseMs = 0
  ): void {
    const phase = phases[phaseIndex];
    if (!phase) {
      onComplete();
      return;
    }

    this.tweens.add({
      targets: ball,
      angle: phase.angle,
      duration: phase.durationMs,
      ease: phase.ease
    });
    this.tweens.add({
      targets: ballVisual,
      x: phase.x,
      y: phase.y,
      duration: phase.durationMs,
      ease: phase.ease,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        ballVisual.setDepth(this.getPlayerDepth(ballVisual.y) + PLAYER_LABEL_DEPTH_OFFSET);
        const elapsedMs = elapsedBeforePhaseMs + phase.durationMs * tween.progress;
        const shadowState = this.getBallShadowFlightState(
          shadowProfile,
          elapsedMs
        );
        const shadowOffset = getElevatedObjectShadowOffset(shadowState.elevationPixels);
        const shadowScale = Phaser.Math.Linear(
          1,
          LINEOUT_THROW_ANIMATION.ballShadowApexScale,
          shadowState.archRatio
        );
        ballShadow
          .setPosition(shadowOffset.x, shadowOffset.y)
          .setScale(
            shadowProfile.baseScaleX * shadowScale,
            shadowProfile.baseScaleY * shadowScale
          )
          .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha);
      },
      onComplete: () => {
        this.playBallAnimationPhases(
          ballVisual,
          ball,
          ballShadow,
          shadowProfile,
          phases,
          onComplete,
          phaseIndex + 1,
          elapsedBeforePhaseMs + phase.durationMs
        );
      }
    });
  }

  private animateSecondaryRecoveryAttempts(
    result: LineoutResult,
    targetPosition: LineoutPosition,
    throwingTokens: PlayerToken[],
    defendingTokens: PlayerToken[],
    waypoints: readonly SecondaryBallWaypoint[],
    phases: readonly BallAnimationPhase[],
    corridorFlightPhaseCount: number,
    retainedToken: PlayerToken | undefined
  ): void {
    const throwingPositions = new Set(
      this.getAnimationPositionList(result, "cascadeThrowingAttemptPositions")
    );
    const defendingPositions = new Set(
      this.getAnimationPositionList(result, "cascadeDefendingAttemptPositions")
    );
    let arrivalDurationMs = phases
      .slice(0, corridorFlightPhaseCount)
      .reduce((total, phase) => total + phase.durationMs, 0);

    waypoints.forEach((waypoint, index) => {
      arrivalDurationMs += phases[corridorFlightPhaseCount + index]?.durationMs ?? 0;
      const mode = this.getSecondaryAttemptMode(
        result,
        targetPosition,
        waypoint.position
      );
      const animationDelayMs = Math.max(
        0,
        arrivalDurationMs - LINEOUT_THROW_ANIMATION.secondaryAttemptDurationMs / 2
      );

      if (throwingPositions.has(waypoint.position)) {
        const token = throwingTokens.find(
          (candidate) => candidate.getData("lineoutPosition") === waypoint.position
        );
        if (token) {
          this.animateSecondaryRecoveryToken(
            token,
            mode,
            animationDelayMs,
            token === retainedToken
          );
        }
      }
      if (defendingPositions.has(waypoint.position)) {
        const token = defendingTokens.find(
          (candidate) => candidate.getData("lineoutPosition") === waypoint.position
        );
        if (token) {
          this.animateSecondaryRecoveryToken(
            token,
            mode,
            animationDelayMs,
            token === retainedToken
          );
        }
      }
    });
  }

  private animateSecondaryRecoveryToken(
    token: PlayerToken,
    mode: SecondaryAttemptMode,
    delayMs: number,
    retainsBall: boolean
  ): void {
    this.time.delayedCall(delayMs, () => {
      token.setPose(mode === "hand" ? "hand" : "jumper");

      if (mode !== "smallJump") {
        if (!retainsBall) {
          this.time.delayedCall(
            LINEOUT_THROW_ANIMATION.secondaryAttemptDurationMs,
            () => token.resetPose()
          );
        }
        return;
      }

      const originalY = token.y;
      const halfDuration = Math.round(
        LINEOUT_THROW_ANIMATION.secondaryAttemptDurationMs / 2
      );
      this.tweens.add({
        targets: token,
        y: originalY - LINEOUT_THROW_ANIMATION.secondaryJumpHeightPixels,
        duration: halfDuration,
        yoyo: true,
        ease: "Sine.easeOut",
        onUpdate: () => {
          token.setShadowElevation(originalY - token.y);
          this.syncPlayerTokenDepth(token);
        },
        onComplete: () => {
          token.y = originalY;
          token.setShadowElevation(0);
          this.syncPlayerTokenDepth(token);
          if (retainsBall) {
            token.setPose("hand");
          } else {
            token.resetPose();
          }
        }
      });
    });
  }

  private getSecondaryAttemptMode(
    result: LineoutResult,
    targetPosition: LineoutPosition,
    attemptPosition: LineoutPosition
  ): SecondaryAttemptMode {
    const trajectory = getLineoutAnimationTrajectory(result);
    if (trajectory === "high" && attemptPosition >= targetPosition + 4) {
      return "hand";
    }
    if (
      trajectory === "low"
      && result.resolution?.details.targetOptionType === "jumpBlock"
      && result.resolution.details.attackJumpSucceeded === false
    ) {
      return "jumperOnGround";
    }
    return "smallJump";
  }

  private getSecondaryBallOffsetY(
    mode: SecondaryAttemptMode,
    playerHeight: number,
    trajectory: ReturnType<typeof getLineoutAnimationTrajectory>
  ): number {
    if (mode === "hand") {
      return getHandPoseBallOffset(playerHeight).y;
    }
    const attemptedTrajectory = trajectory === "low" ? "low" : "precise";
    const baseOffset = getBallAnimationTargetOffset(
      attemptedTrajectory,
      false,
      playerHeight,
      0
    ).y;
    return mode === "smallJump"
      ? baseOffset - LINEOUT_THROW_ANIMATION.secondaryJumpHeightPixels
      : baseOffset;
  }

  private getAnimationPositionList(
    result: LineoutResult,
    detailKey: string
  ): LineoutPosition[] {
    const rawValue = result.resolution?.details[detailKey];
    if (typeof rawValue !== "string" || rawValue.length === 0) {
      return [];
    }
    return rawValue
      .split(",")
      .map(Number)
      .filter((position): position is LineoutPosition => (
        Number.isInteger(position) && position >= 1 && position <= 7
      ));
  }

  private getAnimationDetailPosition(
    result: LineoutResult,
    detailKey: string
  ): LineoutPosition | undefined {
    const position = result.resolution?.details[detailKey];
    return typeof position === "number"
      && Number.isInteger(position)
      && position >= 1
      && position <= 7
      ? position as LineoutPosition
      : undefined;
  }

  private getAnimationRecoveryPosition(result: LineoutResult): LineoutPosition | undefined {
    return this.getAnimationDetailPosition(result, "cascadeRecoveryPosition");
  }

  private getAnimationJumpQuality(
    result: LineoutResult,
    detailKey: "attackJumpQuality" | "defenseJumpQuality"
  ): number {
    const quality = result.resolution?.details[detailKey];
    return typeof quality === "number" && Number.isFinite(quality)
      ? Phaser.Math.Clamp(quality, 0, 100)
      : LINEOUT_LIFT_ANIMATION.defaultJumpQuality;
  }

  private retainBallInPlayerHands(
    ballVisual: Phaser.GameObjects.Container,
    ball: LineoutBallGameObject,
    token: PlayerToken,
    playerHeight: number
  ): void {
    const handsOffset = getHandPoseBallOffset(playerHeight);
    token.setPose("hand");
    token.attachToBody(ballVisual, handsOffset.x, handsOffset.y);
    ball
      .setAngle(0);
  }

  private animateJumpGroup(
    supportTokens: PlayerToken[],
    targetToken: PlayerToken | undefined,
    shouldJump: boolean,
    ballArrivalDurationMs: number,
    retainBall: boolean,
    jumpQuality: number,
    contestCenterX: number
  ): void {
    if (!targetToken) {
      return;
    }
    if (!shouldJump) {
      const handPoseDelayMs = Math.max(
        LINEOUT_LIFT_ANIMATION.approachDurationMs,
        ballArrivalDurationMs
      );
      this.time.delayedCall(handPoseDelayMs, () => {
        targetToken.setPose("hand");
      });
      if (!retainBall) {
        this.time.delayedCall(
          handPoseDelayMs + LINEOUT_LIFT_ANIMATION.jumperHoldDurationMs,
          () => targetToken.resetPose()
        );
      }
      return;
    }

    const jumpMetrics = getLineoutJumpAnimationMetrics(jumpQuality);
    const jumpAnimationDelayMs = Math.max(
      0,
      ballArrivalDurationMs
      - LINEOUT_LIFT_ANIMATION.approachDurationMs
      - jumpMetrics.liftDurationMs
      - LINEOUT_LIFT_ANIMATION.jumpAnticipationMs
    );
    this.time.delayedCall(jumpAnimationDelayMs, () => {
      const targetPosition = targetToken.getData("lineoutPosition") as LineoutPosition | undefined;
      const originalTargetX = targetToken.x;
      const contestDirection = Math.sign(contestCenterX - originalTargetX);
      const contestedTargetX = originalTargetX
        + contestDirection * LINEOUT_LIFT_ANIMATION.contestCenterShiftPixels;
      const targetLean = contestDirection * LINEOUT_LIFT_ANIMATION.contestJumperLeanDegrees;
      const leanState = { angle: 0 };

      this.tweens.add({
        targets: targetToken,
        x: contestedTargetX,
        duration: LINEOUT_LIFT_ANIMATION.approachDurationMs,
        ease: "Sine.easeInOut"
      });
      this.tweens.add({
        targets: leanState,
        angle: targetLean,
        duration: LINEOUT_LIFT_ANIMATION.approachDurationMs,
        ease: "Sine.easeInOut",
        onUpdate: () => targetToken.setBodyAngle(leanState.angle)
      });

      supportTokens.forEach((token) => {
        const supportPosition = token.getData("lineoutPosition") as LineoutPosition | undefined;
        if (targetPosition === undefined || supportPosition === undefined) {
          return;
        }

        const animationConfig = getLifterAnimationConfig(supportPosition, targetPosition);
        if (!animationConfig) {
          return;
        }

        const approachedX = token.x
          + contestDirection * LINEOUT_LIFT_ANIMATION.contestCenterShiftPixels;
        const approachedY = token.y + animationConfig.approachOffsetY;
        this.tweens.add({
          targets: token,
          x: approachedX,
          y: approachedY,
          duration: LINEOUT_LIFT_ANIMATION.approachDurationMs,
          ease: "Sine.easeInOut",
          onUpdate: () => {
            this.syncPlayerTokenDepth(token);
          },
          onComplete: () => {
            token.x = approachedX;
            token.y = approachedY;
            this.syncPlayerTokenDepth(token);
            token.setPose(animationConfig.pose);
          }
        });
      });

      const originalTargetY = targetToken.y;
      this.time.delayedCall(LINEOUT_LIFT_ANIMATION.approachDurationMs, () => {
        targetToken.setPose("jumper");
        this.tweens.add({
          targets: targetToken,
          y: originalTargetY - jumpMetrics.heightPixels,
          duration: jumpMetrics.liftDurationMs,
          hold: LINEOUT_LIFT_ANIMATION.jumperApexSuspensionDurationMs,
          yoyo: true,
          ease: "Sine.easeOut",
          onUpdate: () => {
            targetToken.setShadowElevation(originalTargetY - targetToken.y);
            this.syncPlayerTokenDepth(targetToken);
          },
          onComplete: () => {
            targetToken.y = originalTargetY;
            targetToken.setShadowElevation(0);
            this.syncPlayerTokenDepth(targetToken);
            if (retainBall) {
              targetToken.setPose("hand");
            } else {
              targetToken.resetPose();
            }
            this.tweens.add({
              targets: leanState,
              angle: 0,
              duration: LINEOUT_LIFT_ANIMATION.lifterReturnDurationMs,
              ease: "Sine.easeInOut",
              onUpdate: () => targetToken.setBodyAngle(leanState.angle),
              onComplete: () => targetToken.setBodyAngle(0)
            });
          }
        });
      });
    });
  }

  private getHookerX(throwingSide: "us" | "opponent", layout: LineoutLayout): number {
    if (this.mode === "training") {
      return layout.hookerX;
    }

    return layout.hookerX;
  }

  private getHookerBallStart(
    throwingSide: "us" | "opponent",
    layout: LineoutLayout
  ): { x: number; y: number } {
    const throwStartOffset = Math.round(
      TRAINING_THROW_START_OFFSET
      * layout.playerHeight
      / Math.round(FIELD_HEIGHT * PLAYER_FIELD_HEIGHT_RATIO)
    );
    const hookerBallPoint = this.hookerSprite?.getWorldPointAtHeightFromFeet(
      LINEOUT_THROW_ANIMATION.hookerBallSourceX,
      LINEOUT_THROW_ANIMATION.hookerBallHeightFromFeet
    );

    return hookerBallPoint ?? {
      x: this.getHookerX(throwingSide, layout),
      y: layout.hookerY - throwStartOffset
    };
  }

  private getLineoutPose(side: "us" | "opponent"): PoseName {
    return side === "us" ? "stand_front" : "stand_back";
  }

  private getLineoutKit(side: "us" | "opponent"): Kit {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const opponentColors = match?.away.colors ?? {
      primary: UI.colors.defense,
      secondary: UI.colors.defense
    };
    const displayedColors = side === "us"
      ? save.playerTeam.colors
      : getContrastingOpponentColors(save.playerTeam.colors, opponentColors);

    return {
      jerseyPrimary: displayedColors.primary,
      shortsPrimary: displayedColors.secondary,
      socksPrimary: displayedColors.primary,
      detailsSecondary: displayedColors.secondary
    };
  }

  private recordOffensiveUsage(usageMap: Record<string, MatchPlayerUsage>, hookerId: string): Record<string, MatchPlayerUsage> {
    let updated = addUsage(usageMap, hookerId, "throwing", 1);
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId);
    if (targetToken) {
      updated = addUsage(updated, targetToken.player.id, "jump", 1);
      updated = addUsage(updated, targetToken.player.id, "hands", 1);
    }

    for (const player of this.getSupportPlayersAroundTarget()) {
      updated = addUsage(updated, player.id, "lift", 1);
    }

    return updated;
  }

  private recordDefensiveUsage(
    usageMap: Record<string, MatchPlayerUsage>,
    result: LineoutResult
  ): Record<string, MatchPlayerUsage> {
    let updated = usageMap;
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId);
    const selectionMode = result.resolution?.details.defensiveSelectionMode;
    if (targetToken && selectionMode === "aerialCounter") {
      updated = addUsage(updated, targetToken.player.id, "jump", 1);
      for (const player of this.getSupportPlayersAroundTarget()) {
        updated = addUsage(updated, player.id, "lift", 1);
      }
    } else if (targetToken && result.resolution?.details.defensiveReadMatched === true) {
      updated = addUsage(updated, targetToken.player.id, "hands", 1);
    }

    return updated;
  }

  private selectTarget(token: PlayerToken): void {
    this.selectedTargetId = token.player.id;
    this.selectedTargetPosition = (token.getData("lineoutPosition") as LineoutPosition | undefined) ?? null;
    this.attackTokens.forEach((item) => item.setSelected(item === token));
  }

  private revealOpponentTarget(): void {
    this.defenseTokens.forEach((token) => {
      token.setSelected(token.player.id === this.opponentTargetId);
    });
  }

  private setInspectedPlayer(player: FieldPlayer | null): void {
    this.inspectedPlayer = player;
    this.refreshPlayerInspector();
    this.inspectorPanel?.setVisible(true);
  }

  private bindPlayerInspectorDismissal(): void {
    this.input.on(
      "pointerdown",
      (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        const clickedPlayer = currentlyOver.some(
          (gameObject) => gameObject.getData(PLAYER_TOKEN_HIT_AREA_DATA_KEY) === true
        );
        if (!clickedPlayer) {
          this.hidePlayerInspector();
        }
      }
    );
  }

  private showHookerInspector(hooker: Hooker): void {
    this.inspectedPlayer = null;
    this.inspectorPanel?.setPlayerData({
      name: `${t("team.numberPrefix")}${hooker.number} · ${hooker.nickname}`,
      role: t("lineout.hookerLabel"),
      stats: [{ label: t("team.throwing"), value: hooker.throwing }],
      colors: this.getPlayerInspectorColors(hooker.id)
    });
    this.inspectorPanel?.setVisible(true);
  }

  private hidePlayerInspector(): void {
    this.inspectorPanel?.setVisible(false);
  }

  private refreshPlayerInspector(): void {
    if (!this.inspectorPanel) {
      return;
    }

    if (!this.inspectedPlayer) {
      return;
    }

    const roles: string[] = [];
    if (canBeLineoutJumper(this.inspectedPlayer)) {
      roles.push(t("lineout.role.jumper"));
    }
    if (canBeLineoutLifter(this.inspectedPlayer)) {
      roles.push(t("lineout.role.lifter"));
    }

    this.inspectorPanel.setPlayerData({
      name: `${t("team.numberPrefix")}${this.inspectedPlayer.number} · ${this.inspectedPlayer.nickname}`,
      role: roles.join(" • "),
      stats: [
        { label: t("team.stat.jump"), value: this.inspectedPlayer.jump },
        { label: t("team.stat.lift"), value: this.inspectedPlayer.lift },
        { label: t("team.stat.hands"), value: this.inspectedPlayer.hands }
      ],
      colors: this.getPlayerInspectorColors(this.inspectedPlayer.id)
    });
  }

  private getPlayerInspectorColors(playerId: string) {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const belongsToOpponent = match?.away.hooker.id === playerId
      || match?.away.fieldPlayers.some((player) => player.id === playerId);

    return belongsToOpponent && match
      ? getContrastingOpponentColors(save.playerTeam.colors, match.away.colors)
      : save.playerTeam.colors;
  }

  private flashStatus(message: string): void {
    if (!this.statusText) {
      return;
    }

    this.statusText.setText(message);
    this.statusClearTimer?.remove(false);
    this.statusClearTimer = this.time.delayedCall(1800, () => {
      this.statusText?.setText("");
    });
  }

  private createSpreadSlots(players: FieldPlayer[], count: number): Array<FieldPlayer | null> {
    const slots: Array<FieldPlayer | null> = Array(7).fill(null);
    const positions = this.getActiveSlotIndices(count);

    players.slice(0, positions.length).forEach((player, index) => {
      slots[positions[index]] = player;
    });

    return slots;
  }

  private syncDefenseTokenPositions(layout: LineoutLayout): void {
    for (const token of this.attackTokens) {
      const slotIndex = this.attackSlotPlayers.findIndex((player) => player?.id === token.player.id);
      if (slotIndex === -1) {
        continue;
      }

      const position = (slotIndex + 1) as LineoutPosition;
      token.x = layout.attackX;
      token.y = this.positionY(position, layout);
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
    }

    if (this.selectedTargetId) {
      const selectedToken = this.attackTokens.find((item) => item.player.id === this.selectedTargetId);
      this.selectedTargetPosition = (selectedToken?.getData("lineoutPosition") as LineoutPosition | undefined) ?? null;
    }
  }

  private getDefenseMemorySlotIds(): Array<string | null> {
    return this.attackSlotPlayers.map((player) => player?.id ?? null);
  }

  private primeSlotOccupancy(players: FieldPlayer[]): void {
    if (this.mode === "training") {
      this.trainingAssignedPlayers = getPlayersAssignedToCombination(players, this.selectedCombination);
      this.attackSlotPlayers = this.trainingAssignedPlayers.slice();
      this.defenseSlotPlayers = [];
      return;
    }

    if (this.isDefensiveMatch()) {
      const save = GameStore.getSave();
      const match = GameStore.getMatch();
      const numberOfPlayers = this.currentMatchLineout?.numberOfPlayers ?? 7;
      this.attackSlotPlayers = getDefensiveLineoutSlots(
        save.playerTeam,
        save.defensivePriority,
        save.defenseMemory,
        numberOfPlayers,
        this.getActiveSlotIndices(numberOfPlayers)
      );
      this.prepareOpponentOffensiveDecision(match);
      return;
    }

    const match = GameStore.getMatch();
    const opponentPlayers = match?.away.lineoutPlayers ?? [];
    const attackCount = Math.max(2, countAssignedPlayers(this.selectedCombination));
    const defense = buildDefensivePlan(opponentPlayers, attackCount);
    this.attackSlotPlayers = getPlayersAssignedToCombination(players, this.selectedCombination);
    this.defenseSlotPlayers = this.createDefenseSlotsForAttack(
      defense.selectedPlayers,
      this.attackSlotPlayers
    );
    if (match) {
      const identity = createOpponentAiIdentity(match.away.id, match.divisionId);
      const prediction = predictDefensiveTarget({
        combination: this.selectedCombination,
        memory: GameStore.getPreparedOpponentAiMemory(match.away.id),
        identity,
        divisionId: match.divisionId,
        rng: MATH_RANDOM_SOURCE
      });
      this.opponentDefensiveJumpPosition = prediction.predictedPosition;
    }
  }

  private getActiveSlotIndices(count: number): number[] {
    return this.activeSlotPatterns[Math.max(1, Math.min(7, count))] ?? this.activeSlotPatterns[7];
  }

  private findDefenseTargetSlot(y: number, layout: LineoutLayout): number {
    const rawIndex = Math.round((layout.slotStartY - y) / layout.slotGap);
    return Phaser.Math.Clamp(rawIndex, 0, 6);
  }

  private nearestActivePosition(y: number, activeSlots: number[], layout: LineoutLayout): number {
    let bestSlot = activeSlots[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const slotIndex of activeSlots) {
      const distance = Math.abs(y - this.positionY((slotIndex + 1) as LineoutPosition, layout));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSlot = slotIndex;
      }
    }

    return bestSlot;
  }

  private getSupportPlayersAroundTarget(): FieldPlayer[] {
    if (!this.selectedTargetPosition) {
      return [];
    }

    const left = this.attackSlotPlayers[this.selectedTargetPosition - 2] ?? null;
    const right = this.attackSlotPlayers[this.selectedTargetPosition] ?? null;
    return [left, right].filter((player): player is FieldPlayer => player !== null);
  }

  private recordOffensiveSummary(match: MatchStateData, result: {
    displayedResult: "won" | "won_dirty" | "lost" | "fault";
    resolution?: { outcome: MatchStateData["lineoutHistory"][number]["officialOutcome"] };
  }): void {
    const combinationId = this.selectedCombination.id;
    const existing = match.combinationStats[combinationId];
    const success = result.displayedResult === "won" || result.displayedResult === "won_dirty";
    const combinationName = this.selectedCombination.customName?.trim() || t(this.selectedCombination.nameKey);

    match.combinationStats[combinationId] = {
      combinationId,
      combinationName,
      playerCount: countAssignedPlayers(this.selectedCombination),
      played: (existing?.played ?? 0) + 1,
      won: (existing?.won ?? 0) + (success ? 1 : 0),
      lost: (existing?.lost ?? 0) + (success ? 0 : 1)
    };

    match.lineoutHistory.push({
      minute: this.currentMatchLineout?.minute ?? match.minute,
      throwingSide: "us",
      displayedResult: result.displayedResult,
      success,
      combinationId,
      combinationName,
      targetOptionId: this.findSelectedTargetOption()?.id,
      targetPosition: this.selectedTargetPosition ?? undefined,
      defensivePosition: this.opponentDefensiveJumpPosition ?? undefined,
      officialOutcome: result.resolution?.outcome
    });
  }

  private recordOpponentOffensiveSummary(match: MatchStateData, result: {
    resolution?: {
      outcome: MatchStateData["lineoutHistory"][number]["officialOutcome"];
      ballTeam: "throwingTeam" | "defendingTeam";
    };
  }): void {
    if (!this.opponentCombination) return;
    const combinationId = this.opponentCombination.id;
    const existing = match.opponentCombinationStats[combinationId];
    const outcome = result.resolution?.outcome;
    const success = result.resolution?.ballTeam === "throwingTeam"
      && outcome !== "knockOn"
      && outcome !== "notStraight";
    match.opponentCombinationStats[combinationId] = {
      combinationId,
      combinationName: this.opponentCombination.customName?.trim()
        || t(this.opponentCombination.nameKey),
      playerCount: countAssignedPlayers(this.opponentCombination),
      played: (existing?.played ?? 0) + 1,
      won: (existing?.won ?? 0) + Number(success),
      lost: (existing?.lost ?? 0) + Number(!success)
    };
  }

  private prepareOpponentOffensiveDecision(match: MatchStateData | null): void {
    if (!match?.away.offensiveCombinations || !match.away.offensiveRepertoire || !match.away.lineoutStyle) {
      return;
    }
    const previousEntry = [...match.lineoutHistory].reverse().find((entry) => (
      entry.throwingSide === "opponent"
      && entry.combinationId
      && entry.targetPosition
      && entry.officialOutcome
    ));
    const previous: PreviousAiLineout | undefined = previousEntry
      ? {
        combinationId: previousEntry.combinationId as string,
        targetPosition: previousEntry.targetPosition as LineoutPosition,
        outcome: previousEntry.officialOutcome as NonNullable<typeof previousEntry.officialOutcome>
      }
      : undefined;
    const playableCombinations = match.away.offensiveCombinations.map((combination) => (
      rebuildPlayableCombinationTargets(
        combination,
        match.away.hooker,
        match.away.fieldPlayers
      )
    ));
    const decision = chooseAiOffensiveLineout({
      combinations: playableCombinations,
      repertoire: match.away.offensiveRepertoire,
      style: match.away.lineoutStyle,
      zone: this.getOpponentFieldZone(this.currentMatchLineout?.pitchZone ?? "middle"),
      memory: GameStore.getPreparedOpponentAiMemory(match.away.id),
      identity: createOpponentAiIdentity(match.away.id, match.divisionId),
      previous,
      rng: MATH_RANDOM_SOURCE
    });
    this.opponentCombination = decision.combination;
    this.opponentTargetOptionId = decision.targetOption.id;
    this.opponentTargetPosition = decision.targetOption.targetPosition;
    this.opponentTargetId = decision.targetPlayerId;
    this.defenseSlotPlayers = getPlayersAssignedToCombination(
      match.away.fieldPlayers,
      decision.combination
    );
    const playerCount = countAssignedPlayers(decision.combination);
    if (this.currentMatchLineout) this.currentMatchLineout.numberOfPlayers = playerCount;
  }

  private createDefenseSlotsForAttack(
    players: FieldPlayer[],
    attackingSlots: Array<FieldPlayer | null>
  ): Array<FieldPlayer | null> {
    const slots: Array<FieldPlayer | null> = Array.from({ length: 7 }, () => null);
    const occupiedPositions = attackingSlots
      .map((player, index) => player ? index : -1)
      .filter((index) => index >= 0);
    players.slice(0, occupiedPositions.length).forEach((player, index) => {
      slots[occupiedPositions[index]] = player;
    });
    return slots;
  }

  private findSelectedTargetOption() {
    return findCombinationTargetOption(this.selectedCombination, this.selectedTargetPosition);
  }

  private getOpponentFieldZone(pitchZone: MatchLineoutEvent["pitchZone"]): AiFieldZone {
    if (pitchZone === "their_22") return "own22";
    if (pitchZone === "our_22") return "opponent22";
    return "midfield";
  }

  private findTrainingTargetSlot(x: number, y: number, layout: LineoutLayout): number | null {
    if (Math.abs(x - layout.attackX) > 44) {
      return null;
    }

    for (let index = 0; index < 7; index += 1) {
      const slotY = this.positionY((index + 1) as LineoutPosition, layout);
      if (Math.abs(y - slotY) <= Math.min(34, layout.slotGap / 2)) {
        return index;
      }
    }

    return null;
  }

  private isInTrainingReserveZone(x: number, y: number, layout: LineoutLayout): boolean {
    const reserveTop = this.reservePositionY(6, layout) - layout.playerHeight / 2;
    const reserveBottom = this.reservePositionY(0, layout) + layout.playerHeight / 2;

    return Math.abs(x - layout.reserveX) <= layout.playerWidth
      && y >= reserveTop
      && y <= reserveBottom;
  }

  private reservePositionY(index: number, layout: LineoutLayout): number {
    return layout.reserveY + (6 - index) * layout.slotGap;
  }

  private nearestPosition(y: number, layout: LineoutLayout): LineoutPosition {
    const rawPosition = Math.round((layout.slotStartY - y) / layout.slotGap) + 1;
    const maxPosition = this.getCurrentLineoutSize();
    return Phaser.Math.Clamp(rawPosition, 1, maxPosition) as LineoutPosition;
  }

  private markTargetablePlayers(tokens: readonly PlayerToken[], combination: Combination): void {
    const positions = new Set(getCombinationTargetPositions(combination));
    tokens.forEach((token) => {
      const position = token.getData("lineoutPosition") as LineoutPosition | undefined;
      token.setTargetable(position !== undefined && positions.has(position));
    });
  }

  private showResult(result: LineoutResult): void {
    if (
      this.mode === "match"
      && (result.resolution?.outcome === "knockOn" || result.internalEvent === "knock_on")
    ) {
      playRefereeWhistle(this);
    }

    const presentation = buildLineoutResultPresentation(result);
    const continueMatch = () => this.scene.start("MatchScene");
    const summary = presentation.summaryKeys.map((key) => t(key)).join(" ");
    new Modal(this, t(presentation.titleKey), summary, continueMatch, {
      primaryLabel: t("button.continue"),
      secondaryAction: {
        label: t("lineout.result.details"),
        onSelect: () => {
          new Modal(
            this,
            t("lineout.result.detailsTitle"),
            this.buildResultDetails(presentation.reasonKey, presentation.details),
            continueMatch,
            { primaryLabel: t("button.continue") }
          );
        }
      }
    });
  }

  private buildResultDetails(reasonKey: string | undefined, details: LineoutResultDetail[]): string {
    const lines = details.map((detail) => `${t(detail.labelKey)} : ${this.formatResultDetail(detail)}`);
    return [
      ...(reasonKey ? [t(reasonKey), ""] : []),
      ...lines
    ].join("\n");
  }

  private formatResultDetail(detail: LineoutResultDetail): string {
    if (detail.valueKey) {
      return t(detail.valueKey);
    }
    if (detail.format === "score" && typeof detail.value === "number") {
      return `${Math.round(detail.value)} / 100`;
    }
    return String(detail.value);
  }

  private getCurrentLineoutSize(): number {
    if (this.isDefensiveMatch()) {
      return this.currentMatchLineout?.numberOfPlayers ?? 7;
    }

    return 7;
  }

  private getLayout(): LineoutLayout {
    const trainingPlayerWidth = Math.round(SCREEN_WIDTH * PLAYER_FIELD_WIDTH_RATIO * PLAYER_VISUAL_SCALE);
    const trainingPlayerHeight = Math.round(FIELD_HEIGHT * PLAYER_FIELD_HEIGHT_RATIO * PLAYER_VISUAL_SCALE);
    const common = {
      fieldTop: FIELD_TOP,
      fieldBottom: SCREEN_HEIGHT,
      fieldWidth: SCREEN_WIDTH,
      fieldHeight: FIELD_HEIGHT,
      playerWidth: trainingPlayerWidth,
      playerHeight: trainingPlayerHeight
    };

    if (this.mode === "training") {
      const slotRectHalfHeight = (trainingPlayerHeight + 8) / 2;
      const topSlotLift = 10;
      const fifteenLineY = TRAINING_FIFTEEN_LINE_Y;
      const fiveMeterLineY = TRAINING_FIVE_METER_LINE_Y;
      const slotStartY = TRAINING_SLOT_START_Y;
      const topSlotTargetY = fifteenLineY - topSlotLift + slotRectHalfHeight;
      const slotGap = Math.round((slotStartY - topSlotTargetY) / 6);
      const reserveY = slotStartY - slotGap * 6;

      return {
        ...common,
        attackX: 195,
        reserveX: 292,
        hookerX: 195,
        hookerY: TRAINING_HOOKER_Y,
        fifteenLineY,
        fiveMeterLineY,
        touchLineY: TRAINING_TOUCH_LINE_Y,
        slotStartY,
        slotGap,
        reserveY,
        navigationY: SCREEN_HEIGHT - 36
      };
    }

    // Le match reprend exactement la géométrie de l'entraînement, puis l'agrandit
    // jusqu'au bas de l'écran rendu disponible par l'absence des boutons.
    const matchFifteenLineY = FIELD_TOP + 170;
    const trainingHookerFeetY = TRAINING_HOOKER_Y + TRAINING_HOOKER_FEET_OFFSET;
    const matchHookerFeetY = SCREEN_HEIGHT - 4;
    const matchScale = (matchHookerFeetY - matchFifteenLineY)
      / (trainingHookerFeetY - TRAINING_FIFTEEN_LINE_Y);
    const scaleMatchY = (trainingY: number): number => (
      matchFifteenLineY
      + (trainingY - TRAINING_FIFTEEN_LINE_Y) * matchScale
    );
    const playerWidth = Math.round(trainingPlayerWidth * matchScale);
    const playerHeight = Math.round(trainingPlayerHeight * matchScale);
    const slotRectHalfHeight = (playerHeight + 8 * matchScale) / 2;
    const topSlotLift = 10 * matchScale;
    const fifteenLineY = matchFifteenLineY;
    const fiveMeterLineY = Math.round(scaleMatchY(TRAINING_FIVE_METER_LINE_Y));
    const touchLineY = Math.round(scaleMatchY(TRAINING_TOUCH_LINE_Y));
    const slotStartY = Math.round(scaleMatchY(TRAINING_SLOT_START_Y));
    const hookerY = Math.round(scaleMatchY(TRAINING_HOOKER_Y));
    const topSlotTargetY = fifteenLineY - topSlotLift + slotRectHalfHeight;
    const slotGap = Math.round((slotStartY - topSlotTargetY) / 6);

    return {
      ...common,
      playerWidth,
      playerHeight,
      attackX: 140,
      defenseX: 250,
      reserveX: 0,
      hookerX: 195,
      hookerY,
      fifteenLineY,
      fiveMeterLineY,
      touchLineY,
      slotStartY,
      slotGap,
      reserveY: 0,
      navigationY: SCREEN_HEIGHT - 36
    };
  }

  private positionY(position: LineoutPosition, layout: LineoutLayout): number {
    // Position 1 stays nearest to the hooker and the 5 m line.
    return layout.slotStartY - (position - 1) * layout.slotGap;
  }

  private getPlayerDepth(feetY: number): number {
    return PLAYER_DEPTH_BASE + feetY;
  }

  private syncPlayerTokenDepth(token: PlayerToken): void {
    token.setDepth(this.getPlayerDepth(token.y));
    token.setShadowDepth(GROUND_SHADOW_DEPTH);
  }

  private getUserDefensiveSelectionMode(position: LineoutPosition) {
    const assignments: LineoutAssignments = {};
    this.attackSlotPlayers.forEach((player, index) => {
      if (player) assignments[(index + 1) as LineoutPosition] = player;
    });
    return getDefensiveSelectionMode(assignments, position);
  }

  private resetSceneState(): void {
    this.selectedTargetId = null;
    this.selectedTargetPosition = null;
    this.isResolving = false;
    this.currentMatchLineout = undefined;
    this.opponentDefensiveJumpPosition = null;
    this.opponentTargetId = null;
    this.opponentTargetPosition = null;
    this.opponentTargetOptionId = null;
    this.opponentCombination = null;
    this.attackTokens = [];
    this.defenseTokens = [];
    this.attackSlotPlayers = [];
    this.defenseSlotPlayers = [];
    this.trainingAssignedPlayers = [];
    this.dragState = null;
    this.inspectedPlayer = null;
    this.inspectorPanel = undefined;
    this.statusText = undefined;
    this.hookerSprite = undefined;
    this.hookerShadow = undefined;
    this.hookerHeldBall = undefined;
    this.userSlotIndicators = [];
    this.statusClearTimer?.remove(false);
    this.statusClearTimer = undefined;
  }

  private isDefensiveMatch(): boolean {
    return this.mode === "match" && this.currentMatchLineout?.throwingSide === "opponent";
  }

  private shouldShowCombinationSelection(): boolean {
    return this.mode === "match"
      && !this.isDefensiveMatch()
      && !this.combinationConfirmed;
  }

}
