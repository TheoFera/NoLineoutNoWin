import Phaser from "phaser";
import { PLAYER_VISUAL_SCALE } from "../config/DisplayConfig";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { GameStore } from "../state/GameStore";
import { buildDefensivePlan } from "../ai/DefenseAI";
import {
  chooseAiOffensiveLineout,
  predictDefensiveTarget,
  type AiFieldZone,
  type PreviousAiLineout
} from "../ai/LineoutAiSelection";
import { buildAiLineoutCombinationPlan } from "../ai/LineoutAiCombinationPlan";
import { createOpponentAiIdentity } from "../ai/LineoutAiIdentity";
import { getDivision } from "../rules/DivisionRules";
import { resolveDefensiveLineout } from "../rules/DefensiveLineoutResolver";
import { getDefensiveSelectionMode } from "../rules/DefensiveLineoutSelection";
import { createDefaultDefensiveLayout, getDefensiveLineoutSlots } from "../rules/DefenseSelection";
import {
  countAssignedPlayers,
  constrainAiAerialRepertoire,
  findCombinationTargetOption,
  getActiveOffensiveCombinations,
  getAvailableOffensiveCombinations,
  getCombinationDisplayName,
  getPlayersAssignedToCombination,
  getUnassignedCombinationPlayers,
  isCombinationValidForMatch,
  normalizeOffensiveCombinations,
  renameCombination,
  replaceCombinationLayout,
  replaceCombinationPlan
} from "../rules/CombinationRules";
import { resolveLineout } from "../rules/LineoutResolver";
import { LineoutV3Engine } from "../rules/LineoutV3Engine";
import { getV3CombinationPlan, LINEOUT_V3_MAX_PHASES } from "../rules/LineoutV3Combination";
import {
  evaluateLineoutV3AerialActionEligibility,
  removeInvalidLineoutV3AerialActions
} from "../rules/LineoutV3ActionEligibility";
import {
  calculateAiLineoutV3ThrowReleaseMs,
  getLineoutV3DepthForGestureDistance,
  getLineoutV3DepthForPosition,
  getLineoutV3GestureDistanceForDepth,
  getLineoutV3MovementSpeedMetersPerSecond,
  getLineoutV3PositionForDepth,
  getLineoutV3TargetPhaseIndex
} from "../rules/LineoutV3Geometry";
import { adaptV3ResolutionForPerspective } from "../rules/LineoutV3Presentation";
import {
  assignTeamLineoutRepertoire,
  rebuildPlayableCombinationTargets
} from "../rules/LineoutCombinationAssignment";
import { calculateCurrentFatiguePercent } from "../rules/LineoutThrowResolver";
import { canBeLineoutJumper, canBeLineoutLifter } from "../rules/LineoutPlayerRoles";
import { buildLineoutResultPresentation, type LineoutResultDetail } from "../rules/LineoutResultPresentation";
import { applyLineoutResolutionToMatch } from "../rules/MatchSimulator";
import { addUsage } from "../rules/PlayerProgression";
import type { Combination, CombinationPhaseAction, LineoutPosition } from "../models/Combination";
import type { DefensiveLineoutSize } from "../models/SaveGame";
import type { LineoutAssignments, LineoutResult } from "../models/Lineout";
import type { LineoutV3Event, LineoutV3ThrowGesture } from "../models/LineoutV3";
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
  getCaughtBallPlacement,
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
import {
  createIdleBreathingProfile,
  getIdleBreathingCompressionPixels,
  type IdleBreathingProfile
} from "../ui/IdleBreathing";
import { PLAYER_TOKEN_HIT_AREA_DATA_KEY, PlayerToken } from "../ui/PlayerToken";
import {
  getElevatedObjectShadowOffset,
  PLAYER_GROUND_SHADOW_STYLE,
  PlayerGroundShadow
} from "../ui/PlayerGroundShadow";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import type { Kit, PoseName } from "../ui/RugbyPlayerTypes";
import { UIButton } from "../ui/UIButton";
import { CombinationSequenceBar } from "../ui/CombinationSequenceBar";
import { CombinationListOverlay } from "../ui/CombinationListOverlay";
import { UI_DEPTH } from "../ui/UIDepth";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { MatchScoreOverlay } from "../ui/MatchScoreOverlay";
import { LineoutCombinationOverlay } from "../ui/LineoutCombinationOverlay";
import { MatchStatsOverlay } from "../ui/MatchStatsOverlay";
import {
  getMatchPitchAppearance,
  getTrainingPitchAppearance,
  renderPitchSurface
} from "../ui/MatchPitchBackdrop";
import { isCurrentMatchAtHome } from "../rules/ChampionshipRules";
import { playRefereeWhistle, prepareGameAudio } from "../systems/AudioSystem";
import {
  formatMatchMinute,
  MATCH_SCORE_OVERLAY_LAYOUT
} from "../ui/MatchScoreOverlayLayout";
import { PlayerStatsOverlay } from "../ui/PlayerStatsOverlay";
import { getPlayerSkinTint } from "../ui/PlayerSkinTone";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { getCameraRenderScale } from "../systems/HighDensityRendering";
import { startSceneCrossfade } from "../systems/SceneCrossfade";
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
const TRAINING_SEQUENCE_CENTER_Y = MATCH_SCORE_OVERLAY_LAYOUT.y + 48;
const V3_METERS_TO_PIXELS = 34;
const TRAINING_ACTION_OVERLAY_DATA_KEY = "training-action-overlay";
const RUGBY_DASH_WIDTH = 18;
const RUGBY_DASH_GAP = 12;
const TRAINING_FIFTEEN_LINE_Y = FIELD_TOP + 160;
const TRAINING_FIVE_METER_LINE_Y = SCREEN_HEIGHT - 196;
const TRAINING_TOUCH_LINE_Y = SCREEN_HEIGHT - 82;
const TRAINING_SLOT_START_Y = SCREEN_HEIGHT - 206;
const TRAINING_HOOKER_Y = 744;
const TRAINING_HOOKER_FEET_OFFSET = 34;
const TRAINING_THROW_START_OFFSET = 24;
const THROW_GESTURE_ZONE_TOP_OFFSET = 12;
const PLAYER_ALIGNMENT_HORIZONTAL_VARIATION_PIXELS = 2;
const TRAINING_PREPARATION_REMAINING_ALIGNMENT_OFFSET_PIXELS = 1;
const TRAINING_MOVEMENT_ARROW_HORIZONTAL_OFFSET_PIXELS = 36;
const TRAINING_MOVEMENT_ARROW_LANE_GAP_PIXELS = 8;
const TRAINING_MOVEMENT_ARROW_ANCHOR_HEIGHT_RATIO = 0.14;
const TRAINING_MOVEMENT_ARROW_COLOR = UI.colors.accent;
const TRAINING_MOVEMENT_ARROW_SHADOW_COLOR = UI.colors.panelDark;
const TRAINING_MOVEMENT_AVOIDANCE_VISUAL_MARGIN_PIXELS = 10;
const LINEOUT_PREPARATION_ANIMATION = {
  attackingMinimumPixels: 2,
  attackingMaximumPixels: 5,
  defendingMinimumPixels: 1,
  defendingMaximumPixels: 3,
  attackingDurationMs: 130,
  defendingDelayMs: 60,
  defendingDurationMs: 140
} as const;
const LINEOUT_CAMERA_ANIMATION = {
  releaseZoom: 1.025,
  flightZoom: 1.04,
  contestZoom: 1.06,
  receptionZoom: 1.035,
  horizontalFollowRatio: 0.25,
  verticalFollowRatio: 0.18,
  maximumHorizontalShiftPixels: 8,
  maximumVerticalShiftPixels: 12,
  responseDurationMs: 120,
  releaseRampDurationMs: 300,
  resultHoldDurationMs: 220,
  returnDurationMs: 450,
  cleanupDelayMs: 720,
  contestShakeDurationMs: 80,
  contestShakeIntensity: 0.002
} as const;

type LineoutCameraPhase = "idle" | "flight" | "contest" | "reception" | "return";

function getPlayerVisualSeed(playerId: string): number {
  let hash = 0;
  for (const character of playerId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function getPlayerAlignmentOffsetX(playerId: string): number {
  return getPlayerVisualSeed(playerId) % (PLAYER_ALIGNMENT_HORIZONTAL_VARIATION_PIXELS * 2 + 1)
    - PLAYER_ALIGNMENT_HORIZONTAL_VARIATION_PIXELS;
}

function getPlayerPreparationDistanceX(playerId: string, attacking: boolean): number {
  const minimum = attacking
    ? LINEOUT_PREPARATION_ANIMATION.attackingMinimumPixels
    : LINEOUT_PREPARATION_ANIMATION.defendingMinimumPixels;
  const maximum = attacking
    ? LINEOUT_PREPARATION_ANIMATION.attackingMaximumPixels
    : LINEOUT_PREPARATION_ANIMATION.defendingMaximumPixels;
  return minimum + getPlayerVisualSeed(playerId) % (maximum - minimum + 1);
}

function getTrainingPreparationDistanceX(alignmentOffsetX: number): number {
  return Math.max(
    0,
    Math.abs(alignmentOffsetX) - TRAINING_PREPARATION_REMAINING_ALIGNMENT_OFFSET_PIXELS
  );
}

function clearCameraFilterRecursively(
  gameObject: Phaser.GameObjects.GameObject,
  cameraId: number
): void {
  gameObject.cameraFilter &= ~cameraId;
  const parent = gameObject as Phaser.GameObjects.GameObject & {
    getChildren?: () => Phaser.GameObjects.GameObject[];
  };
  parent.getChildren?.().forEach((child) => clearCameraFilterRecursively(child, cameraId));
}

type SecondaryAttemptMode = "smallJump" | "jumperOnGround" | "hand";

type SecondaryBallWaypoint = BallAnimationWaypoint & {
  position: LineoutPosition;
};

export type LineoutSceneData = {
  mode: "training" | "match";
  entryTransition?: "from-match-simulation";
  transitionPitchPositionMeters?: number;
  transitionLateralPosition?: number;
  combinationId?: string;
  combinationConfirmed?: boolean;
  trainingMode?: "practice" | "edit" | "defense-edit";
  editorPhaseIndex?: number | null;
  editorSelectedPosition?: LineoutPosition;
  defensiveSize?: DefensiveLineoutSize;
  defensiveDraftIds?: Array<string | null>;
  combinationOverlayOpen?: boolean;
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
  | { kind: "training-action"; playerPosition: LineoutPosition }
  | { kind: "training-defense-slot"; slotIndex: number }
  | { kind: "training-defense-reserve" }
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
  startedWhileDefenseUnlocked: boolean;
  directionalAction?: DirectionalPlayerAction;
};

type DirectionalPlayerAction = "jump" | "feint" | "none";

type ThrowGestureState = {
  pointer: Phaser.Input.Pointer;
  contactStartedAtMs: number;
  gestureStartedAtMs: number | null;
  gestureStartY: number;
};

type ThrowPowerGauge = {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  levelLabel: Phaser.GameObjects.Text;
};

type DefensiveGroupDragState = {
  pointer: Phaser.Input.Pointer;
  jumperId: string;
  lifterIds: string[];
  handle: Phaser.GameObjects.Container;
  handleOffsetY: number;
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
  private enterFromMatchSimulation = false;
  private transitionPitchPositionMeters?: number;
  private transitionLateralPosition?: number;
  private trainingMode: "practice" | "edit" | "defense-edit" = "edit";
  private selectedCombinationId?: string;
  private combinationConfirmed = false;
  private trainingEditorPhaseIndex: number | null = null;
  private trainingEditorSelectedPosition: LineoutPosition | null = null;
  private trainingActionOverlay?: Phaser.GameObjects.Container;
  private trainingCombinationOverlay?: CombinationListOverlay;
  private trainingSequenceBar?: CombinationSequenceBar;
  private trainingCombinationsButton?: UIButton;
  private trainingChampionshipButton?: UIButton;
  private shouldOpenTrainingCombinationOverlay = false;
  private defensiveEditorSize: DefensiveLineoutSize = 7;
  private defensiveDraftIds: Array<string | null> | null = null;
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
  private readonly armedDefensiveBlocks = new Map<string, readonly string[]>();
  private dragState: DragState | null = null;
  private inspectedPlayer: FieldPlayer | null = null;
  private inspectorPanel?: PlayerStatsOverlay;
  private statusText?: Phaser.GameObjects.Text;
  private statusClearTimer?: Phaser.Time.TimerEvent;
  private matchScoreOverlay?: MatchScoreOverlay;
  private hookerSprite?: RugbyPlayer;
  private hookerShadow?: PlayerGroundShadow;
  private hookerHeldBall?: Phaser.GameObjects.Container;
  private hookerHeldBallRestY?: number;
  private hookerIdleBreathingProfile?: IdleBreathingProfile;
  private hookerIdleBreathingActive = false;
  private userSlotIndicators: Phaser.GameObjects.Rectangle[] = [];
  private v3Engine?: LineoutV3Engine;
  private v3BallSprite?: Phaser.GameObjects.Image;
  private v3BallShadow?: Phaser.GameObjects.Image;
  private v3ContactPlayerId: string | null = null;
  private v3RetainedBallPose: Extract<PoseName, "hand" | "jumper"> | null = null;
  private v3ContestPlayerIds = new Set<string>();
  private v3BallAttemptPlayerIds = new Set<string>();
  private v3GroundRecoveryPlayerId: string | null = null;
  private v3GroundRecoveryRunStarted = false;
  private v3ContestStartedAtMs: number | null = null;
  private v3ThrowGesture: ThrowGestureState | null = null;
  private v3ThrowPowerGauge?: ThrowPowerGauge;
  private v3ThrowPowerGaugeHideTimer?: Phaser.Time.TimerEvent;
  private v3OpponentCombinationStartsAtMs: number | null = null;
  private v3OpponentThrowAtMs: number | null = null;
  private v3AiJumpAtMs: number | null = null;
  private v3AttackingPreparationProgress = 0;
  private v3DefendingPreparationProgress = 0;
  private v3PreparationTweens: Phaser.Tweens.Tween[] = [];
  private v3HudCamera?: Phaser.Cameras.Scene2D.Camera;
  private v3CameraHudObjects: Phaser.GameObjects.GameObject[] = [];
  private v3CameraWorldObjects: Phaser.GameObjects.GameObject[] = [];
  private v3CameraPhase: LineoutCameraPhase = "idle";
  private v3CameraFocusX = SCREEN_WIDTH / 2;
  private v3CameraFocusY = SCREEN_HEIGHT / 2;
  private v3CameraZoom = 1;
  private v3CameraBaseZoom = 1;
  private v3CameraFlightStartedAtMs = 0;
  private v3CameraReceptionTargetId: string | null = null;
  private v3ResolutionHandled = false;
  private sceneCameraBaseZoom = 1;
  private v3GroupHandles = new Map<string, Phaser.GameObjects.Container>();
  private v3GroupDrag: DefensiveGroupDragState | null = null;
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
    this.enterFromMatchSimulation = data.entryTransition === "from-match-simulation";
    this.transitionPitchPositionMeters = data.transitionPitchPositionMeters;
    this.transitionLateralPosition = data.transitionLateralPosition;
    this.selectedCombinationId = data.combinationId;
    this.combinationConfirmed = data.combinationConfirmed ?? false;
    this.trainingMode = data.trainingMode ?? (this.mode === "training" ? "edit" : "practice");
    this.trainingEditorPhaseIndex = data.editorPhaseIndex ?? null;
    this.trainingEditorSelectedPosition = data.editorSelectedPosition ?? null;
    this.defensiveEditorSize = data.defensiveSize ?? 7;
    this.defensiveDraftIds = data.defensiveDraftIds?.slice(0, 7) ?? null;
    this.shouldOpenTrainingCombinationOverlay = data.combinationOverlayOpen ?? false;
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
    this.sceneCameraBaseZoom = getCameraRenderScale(this);
    this.cameras.main
      .resetFX()
      .setZoom(this.sceneCameraBaseZoom)
      .centerOn(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
      .setAlpha(this.enterFromMatchSimulation ? 0 : 1);
    this.input.enabled = true;
    this.currentMatchLineout = this.mode === "match" ? match?.lineouts[match.currentLineoutIndex] : undefined;
    this.allCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);

    const activeCombinations = getActiveOffensiveCombinations(this.allCombinations, save.offensiveRepertoire);
    const visibleCombinations = this.mode === "match"
      ? activeCombinations
        .filter(isCombinationValidForMatch)
        .map((combination) => rebuildPlayableCombinationTargets(
          combination,
          save.playerTeam.lineoutPlayers
        ))
        .filter((combination) => (combination.targetOptions?.length ?? 0) > 0)
      : activeCombinations.length > 0 ? activeCombinations : this.allCombinations;

    if (this.mode === "match" && visibleCombinations.length === 0) {
      navigateTo(this, "MatchScene");
      return;
    }

    this.selectedCombination = visibleCombinations.find((combination) => combination.id === this.selectedCombinationId)
      ?? visibleCombinations[0]
      ?? this.allCombinations[0];
    this.selectedCombination = rebuildPlayableCombinationTargets(
      this.selectedCombination,
      save.playerTeam.lineoutPlayers
    );

    this.primeSlotOccupancy(save.playerTeam.lineoutPlayers);
    const layout = this.getLayout();
    this.renderBackground(layout);
    this.renderHeader();
    this.renderPlayerInspector();
    this.bindPlayerInspectorDismissal();
    this.renderPitch(layout);
    if (this.mode === "training" && this.trainingMode === "edit" && this.trainingEditorPhaseIndex !== null) {
      this.renderTrainingMovementArrows(layout);
    }
    this.renderLineout(save.playerTeam.lineoutPlayers, layout);
    if (this.shouldShowCombinationSelection()) {
      this.renderMatchStatsOverlay();
      this.renderCombinationSelectionOverlay(visibleCombinations);
    } else {
      this.renderActions(layout);
    }
    this.initializeV3Runtime();
    this.input.on("pointermove", this.trackV3ThrowGesture, this);
    this.input.on("pointerup", this.completeV3ThrowGesture, this);
    if (this.enterFromMatchSimulation) this.startMatchLineoutEntryTransition(layout);
  }

  private startMatchLineoutEntryTransition(layout: LineoutLayout): void {
    const transition = LINEOUT_BALANCE.match.visualSimulation.lineoutTransition;
    const camera = this.cameras.main;
    const focus = this.getLineoutTransitionFocus(layout);

    this.enterFromMatchSimulation = false;
    this.input.enabled = false;
    camera
      .setZoom(this.sceneCameraBaseZoom * transition.lineoutArrivalZoom)
      .centerOn(focus.x, focus.y);
    camera.pan(
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2,
      transition.lineoutArrivalDurationMs,
      "Sine.easeOut",
      true
    );
    camera.zoomTo(
      this.sceneCameraBaseZoom,
      transition.lineoutArrivalDurationMs,
      "Cubic.easeOut",
      true
    );
    this.events.once(Phaser.Scenes.Events.TRANSITION_COMPLETE, () => {
      camera
        .setZoom(this.sceneCameraBaseZoom)
        .centerOn(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
        .setAlpha(1);
      this.input.enabled = true;
    });
  }

  private getLineoutTransitionFocus(layout: LineoutLayout): { x: number; y: number } {
    const throwingSide = this.isDefensiveMatch() ? "opponent" : "us";
    return this.getHookerBallStart(throwingSide, layout);
  }

  update(time: number, delta: number): void {
    this.updateHookerIdleBreathing(time);
    this.updateV3Runtime(delta);
    this.updateV3DynamicCamera(delta);
    if (this.v3ThrowGesture) {
      this.updateV3ThrowPowerGauge(this.getPointerWorldPosition(this.v3ThrowGesture.pointer));
    }
    if (this.v3GroupDrag) {
      if (this.v3GroupDrag.pointer.isDown) this.trackV3GroupDrag();
      else this.completeV3GroupDrag();
    }
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
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, UI.colors.background);
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const isHomeMatch = isCurrentMatchAtHome(save.championship);
    const appearance = this.mode === "match" && match
      ? getMatchPitchAppearance(
        isHomeMatch ? match.home.id : match.away.id,
        match.id,
        isHomeMatch
      )
      : getTrainingPitchAppearance();
    renderPitchSurface(
      this,
      SCREEN_WIDTH / 2,
      layout.fieldTop + layout.fieldHeight / 2,
      layout.fieldWidth,
      layout.fieldHeight,
      appearance
    );
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
    this.matchScoreOverlay = new MatchScoreOverlay(this, {
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
      color: UI.colors.textDanger,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    this.refreshPlayerInspector();
  }

  private renderPitch(layout: LineoutLayout): void {
    this.renderDashedPitchLine(SCREEN_WIDTH / 2, layout.fifteenLineY, layout.fieldWidth, 3, 0.95);
    this.renderDashedPitchLine(SCREEN_WIDTH / 2, layout.fiveMeterLineY, layout.fieldWidth, 2, 0.72);
    this.add.rectangle(SCREEN_WIDTH / 2, layout.touchLineY, layout.fieldWidth, 3, UI.colors.line, 0.95);

    this.refreshUserSlotIndicators(layout);

    if (this.trainingMode !== "defense-edit") {
      this.renderHooker(layout);
      this.renderThrowGestureZone(layout);
    }
  }

  private renderThrowGestureZone(layout: LineoutLayout): void {
    const isUserThrow = !this.isDefensiveMatch()
      && (this.mode === "match" || this.trainingMode === "practice");
    if (!isUserThrow) return;

    const top = layout.fiveMeterLineY + THROW_GESTURE_ZONE_TOP_OFFSET;
    const height = Math.max(0, layout.fieldBottom - top);
    const gestureZone = this.add.zone(0, top, layout.fieldWidth, height)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(GROUND_SHADOW_DEPTH - 1);
    gestureZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.canControlV3Throw()) return;
      this.hidePlayerInspector();
      this.beginV3ThrowGesture(pointer);
    });
  }

  private renderDashedPitchLine(centerX: number, y: number, width: number, height: number, alpha: number): void {
    const startX = centerX - width / 2;
    const endX = startX + width;
    let currentX = startX;

    while (currentX < endX) {
      const dashWidth = Math.min(RUGBY_DASH_WIDTH, endX - currentX);
      this.add.rectangle(currentX + dashWidth / 2, y, dashWidth, height, UI.colors.line, alpha);
      currentX += RUGBY_DASH_WIDTH + RUGBY_DASH_GAP;
    }
  }

  private refreshUserSlotIndicators(layout: LineoutLayout): void {
    this.userSlotIndicators.forEach((indicator) => indicator.destroy());
    this.userSlotIndicators = [];
    if (this.mode !== "training" || this.trainingMode === "practice") return;
    const slotWidth = layout.playerWidth + 18;
    const slotHeight = Math.round(slotWidth * 0.72);
    const slotBottomOffset = 5;
    const occupiedPositions = new Set<LineoutPosition>();
    this.attackSlotPlayers.forEach((player, index) => {
      if (!player) return;
      const initialPosition = (index + 1) as LineoutPosition;
      const displayedPosition = this.trainingMode === "edit"
        && this.trainingEditorPhaseIndex !== null
        ? getLineoutV3PositionForDepth(this.getTrainingPreviewDepth(
          initialPosition,
          this.trainingEditorPhaseIndex
        ))
        : initialPosition;
      occupiedPositions.add(displayedPosition);
    });

    for (let index = 1; index <= 7; index += 1) {
      if (occupiedPositions.has(index as LineoutPosition)) continue;

      const indicator = this.add.rectangle(
        layout.attackX,
        this.positionY(index as LineoutPosition, layout) + slotBottomOffset - slotHeight / 2,
        slotWidth,
        slotHeight,
        UI.colors.line,
        0.04
      )
        .setStrokeStyle(2, UI.colors.line, 0.5);
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
    this.hookerIdleBreathingProfile = createIdleBreathingProfile(hooker.id);
    this.hookerIdleBreathingActive = true;

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
      getPlayerSkinTint(hooker),
      hooker.appearance.hairStyleId,
      hooker.appearance.accessoryIds
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
    this.hookerHeldBallRestY = heldBallPosition.y;

    // PlayerToken place le numero par rapport a son conteneur, dont le sprite a les pieds 4 px plus bas.
    const hookerNumberY = hookerFeetY - 1 - Math.max(12, layout.playerHeight * 0.42);
    const hookerText = this.add.text(hookerX, hookerNumberY, String(hookerNumber), {
      font: "bold 12px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.hookerSprite.setDepth(hookerDepth);
    this.hookerHeldBall.setDepth(hookerDepth + PLAYER_LABEL_DEPTH_OFFSET);
    hookerText.setDepth(hookerDepth + PLAYER_LABEL_DEPTH_OFFSET);

    const hitbox = this.add.zone(
      hookerX - layout.playerWidth / 2 - 6,
      hookerFeetY - layout.playerHeight,
      layout.playerWidth + 12,
      layout.playerHeight + 8
    ).setOrigin(0);
    hitbox.setData(PLAYER_TOKEN_HIT_AREA_DATA_KEY, true);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.canControlV3Throw()) {
        this.beginV3ThrowGesture(pointer);
        return;
      }
      const hooker = isOpponentThrow ? match?.away.hooker : save.playerTeam.hooker;
      if (hooker) {
        this.showHookerInspector(hooker);
      }
    });
    hitbox.setDepth(hookerDepth + PLAYER_HITBOX_DEPTH_OFFSET);
  }

  private renderLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    if (this.mode === "training") {
      if (this.trainingMode === "defense-edit") {
        this.renderDefensiveTrainingLineout(players, layout);
        return;
      }
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
      const tokenY = this.getTrainingEditorTokenY(position, layout);
      const token = new PlayerToken(
        this,
        layout.attackX + getPlayerAlignmentOffsetX(player.id),
        tokenY,
        player,
        GameStore.getSave().playerTeam.colors.primary,
        {
          pose: this.getTrainingEditorPose(position),
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindTrainingSlotToken(token, index);
      this.attackTokens.push(token);
    });

    const reservePlayers = this.trainingMode === "edit" && this.trainingEditorPhaseIndex === null
      ? getUnassignedCombinationPlayers(players, this.selectedCombination)
      : [];
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

    if (this.trainingEditorPhaseIndex !== null && this.trainingEditorSelectedPosition !== null) {
      const selectedToken = this.attackTokens.find((token) => (
        token.getData("lineoutPosition") === this.trainingEditorSelectedPosition
      ));
      if (selectedToken) {
        this.renderTrainingActionOverlay(selectedToken, this.trainingEditorSelectedPosition);
      }
    }

  }

  private renderDefensiveTrainingLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const stored = save.defenseMemory[this.defensiveEditorSize]
      ?? createDefaultDefensiveLayout(save.playerTeam, this.defensiveEditorSize);
    const sourceDraft = this.defensiveDraftIds ?? stored;
    const draft = Array.from({ length: 7 }, (_item, index) => (
      sourceDraft[index] ?? null
    ));
    const playersById = new Map(players.map((player) => [player.id, player]));
    const used = new Set<string>();
    this.defensiveDraftIds = draft.map((playerId) => {
      if (!playerId || used.has(playerId) || !playersById.has(playerId)) return null;
      used.add(playerId);
      return playerId;
    });
    this.trainingAssignedPlayers = this.defensiveDraftIds.map((playerId) => (
      playerId ? playersById.get(playerId) ?? null : null
    ));
    this.attackSlotPlayers = this.trainingAssignedPlayers.slice();

    this.trainingAssignedPlayers.forEach((player, index) => {
      if (!player) return;
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(
        this,
        layout.attackX + getPlayerAlignmentOffsetX(player.id),
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
      this.bindDefensiveTrainingSlotToken(token, index);
      this.attackTokens.push(token);
    });

    players.filter((player) => !used.has(player.id)).forEach((player, index) => {
      const token = new PlayerToken(
        this,
        layout.reserveX,
        this.reservePositionY(index, layout),
        player,
        save.playerTeam.colors.primary,
        {
          pose: "receiver_front",
          kit: this.getLineoutKit("us"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      this.syncPlayerTokenDepth(token);
      this.bindDefensiveTrainingReserveToken(token);
    });

    const playerCount = this.trainingAssignedPlayers.filter((player) => player !== null).length;
    if (playerCount !== this.defensiveEditorSize) {
      this.statusText?.setText(
        t("lineout.v3.defensivePlayerCountError")
          .replace("{size}", String(this.defensiveEditorSize))
      ).setColor(UI.colors.textDanger);
    }
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
        layout.attackX + getPlayerAlignmentOffsetX(player.id),
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
      const token = new PlayerToken(
        this,
        (layout.defenseX ?? 250) + getPlayerAlignmentOffsetX(player.id),
        this.positionY(position, layout),
        player,
        defenseColor,
        {
          pose: this.getLineoutPose("opponent"),
          kit: this.getLineoutKit("opponent"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
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
      getCombinationName: (combination) => this.getUserCombinationDisplayName(combination),
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
        layout.attackX + getPlayerAlignmentOffsetX(player.id),
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
      this.bindMatchDefenseToken(token);
      this.attackTokens.push(token);
    });

    const opponentColor = match?.away.colors.primary ?? UI.colors.defense;
    this.defenseSlotPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(
        this,
        (layout.defenseX ?? 250) + getPlayerAlignmentOffsetX(player.id),
        this.positionY(position, layout),
        player,
        opponentColor,
        {
          pose: this.getLineoutPose("opponent"),
          kit: this.getLineoutKit("opponent"),
          bodyShape: player.appearance.bodyShape,
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindOpponentInspectorToken(token);
      this.defenseTokens.push(token);
    });
  }

  private bindTrainingSlotToken(token: PlayerToken, slotIndex: number): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.trainingMode === "practice") {
        this.setInspectedPlayer(token.player);
        return;
      }
      const playerPosition = (slotIndex + 1) as LineoutPosition;
      if (this.trainingEditorPhaseIndex !== null) {
        this.hidePlayerInspector();
        this.trainingEditorSelectedPosition = playerPosition;
        this.trainingActionOverlay?.destroy();
        this.trainingActionOverlay = undefined;
        const pointerPosition = this.getPointerWorldPosition(pointer);
        this.dragState = {
          origin: { kind: "training-action", playerPosition },
          pointer,
          token,
          startX: pointerPosition.x,
          startY: pointerPosition.y,
          moved: false,
          homeX: token.x,
          homeY: token.y,
          startedWhileDefenseUnlocked: true
        };
        return;
      }
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
        homeY: token.y,
        startedWhileDefenseUnlocked: !(this.v3Engine?.getSnapshot().defenseLocked ?? false)
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
        homeY: token.y,
        startedWhileDefenseUnlocked: !(this.v3Engine?.getSnapshot().defenseLocked ?? false)
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
        homeY: token.y,
        startedWhileDefenseUnlocked: !(this.v3Engine?.getSnapshot().defenseLocked ?? false)
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
        homeY: token.y,
        startedWhileDefenseUnlocked: !(this.v3Engine?.getSnapshot().defenseLocked ?? false)
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

    if (this.trainingMode === "edit") {
      this.renderTrainingTimeline();
    }
    if (this.trainingMode === "practice") {
      return;
    }
    this.renderTrainingNavigation(layout, false);
    if (this.shouldOpenTrainingCombinationOverlay) {
      this.shouldOpenTrainingCombinationOverlay = false;
      this.openTrainingCombinationOverlay();
    }
  }

  private renderTrainingNavigation(layout: LineoutLayout, overlayOpen: boolean): void {
    this.trainingCombinationsButton?.destroy();
    this.trainingChampionshipButton?.destroy();

    this.trainingCombinationsButton = new UIButton(
      this,
      103,
      layout.navigationY,
      164,
      44,
      t("button.combinations"),
      () => overlayOpen
        ? this.closeTrainingCombinationOverlay()
        : this.openTrainingCombinationOverlay(),
      {
        variant: overlayOpen ? "selected" : "secondary",
        textColor: overlayOpen ? UI.colors.text : undefined
      }
    ).setDepth(overlayOpen ? UI_DEPTH.overlayContent + 2 : LINEOUT_ACTION_DEPTH);
    this.trainingChampionshipButton = new UIButton(
      this,
      287,
      layout.navigationY,
      164,
      44,
      t("menu.championship"),
      () => navigateTo(this, "ChampionshipScene"),
      { variant: "secondary", enabled: !overlayOpen }
    ).setDepth(overlayOpen ? UI_DEPTH.overlayContent + 2 : LINEOUT_ACTION_DEPTH);
  }

  private openTrainingCombinationOverlay(): void {
    if (this.mode !== "training" || this.trainingMode === "practice") return;
    this.closeTrainingCombinationOverlay(false);
    this.hidePlayerInspector();
    this.hideTrainingActionOverlay();
    this.trainingSequenceBar?.destroy();
    this.trainingSequenceBar = undefined;
    this.dragState = null;

    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const allCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);
    const activeCombinations = getActiveOffensiveCombinations(
      allCombinations,
      save.offensiveRepertoire
    );
    const combinations = activeCombinations.length > 0
      ? activeCombinations
      : getAvailableOffensiveCombinations(allCombinations, division.offensiveCombinations);

    this.trainingCombinationOverlay = new CombinationListOverlay(this, {
      combinations,
      initialTab: this.trainingMode === "defense-edit" ? "defense" : "attack",
      selectedCombinationId: this.selectedCombination.id,
      selectedDefensiveSize: this.defensiveEditorSize,
      onClose: () => this.closeTrainingCombinationOverlay(),
      onRename: (combinationId, name) => {
        GameStore.setOffensiveCombinations(renameCombination(
          GameStore.getSave().offensiveCombinations,
          combinationId,
          name
        ));
        this.scene.restart({
          mode: "training",
          trainingMode: "edit",
          combinationId,
          combinationOverlayOpen: true
        } satisfies LineoutSceneData);
      },
      onSelectCombination: (combinationId) => {
        if (combinationId === this.selectedCombination.id && this.trainingMode === "edit") {
          this.closeTrainingCombinationOverlay();
          return;
        }
        this.scene.restart({
          mode: "training",
          trainingMode: "edit",
          combinationId
        } satisfies LineoutSceneData);
      },
      onSelectDefensiveSize: (size) => this.restartDefensiveEditor(size)
    }).setDepth(UI_DEPTH.overlayBackdrop);
    this.renderTrainingNavigation(this.getLayout(), true);
  }

  private closeTrainingCombinationOverlay(renderNavigation = true): void {
    this.trainingCombinationOverlay?.destroy();
    this.trainingCombinationOverlay = undefined;
    if (renderNavigation && this.mode === "training" && this.trainingMode !== "practice") {
      if (this.trainingMode === "edit") {
        this.renderTrainingTimeline();
      }
      this.renderTrainingNavigation(this.getLayout(), false);
    }
  }

  private renderTrainingTimeline(): void {
    const plan = getV3CombinationPlan(this.selectedCombination);
    const phaseCount = plan.phases.length;
    if (this.trainingEditorPhaseIndex !== null) {
      this.trainingEditorPhaseIndex = Phaser.Math.Clamp(
        this.trainingEditorPhaseIndex,
        0,
        phaseCount - 1
      );
    }

    this.trainingSequenceBar?.destroy();
    this.trainingSequenceBar = new CombinationSequenceBar(this, 195, TRAINING_SEQUENCE_CENTER_Y, {
      phaseCount,
      maximumPhaseCount: LINEOUT_V3_MAX_PHASES,
      selectedPhaseIndex: this.trainingEditorPhaseIndex,
      labels: {
        placement: t("lineout.v3.initialPlacementShort"),
        phase: t("lineout.v3.phaseNumber"),
        removePhase: t("lineout.v3.deletePhaseNumber"),
        train: t("lineout.v3.practiceCombination")
      },
      onSelectPlacement: () => this.restartTrainingEditor({ editorPhaseIndex: null }),
      onSelectPhase: (phaseIndex) => this.restartTrainingEditor({
        editorPhaseIndex: phaseIndex,
        editorSelectedPosition: undefined
      }),
      onAddPhase: () => this.addTrainingPhase(),
      onRemovePhase: () => this.removeTrainingPhase(),
      onTrain: () => {
        navigateTo(this, "LineoutScene", {
          mode: "training",
          trainingMode: "practice",
          combinationId: this.selectedCombination.id
        } satisfies LineoutSceneData);
      }
    }).setDepth(LINEOUT_ACTION_DEPTH);
  }

  private bindDefensiveTrainingSlotToken(token: PlayerToken, slotIndex: number): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerWorldPosition(pointer);
      this.dragState = {
        origin: { kind: "training-defense-slot", slotIndex },
        pointer,
        token,
        startX: point.x,
        startY: point.y,
        moved: false,
        homeX: token.x,
        homeY: token.y,
        startedWhileDefenseUnlocked: true
      };
    });
  }

  private bindDefensiveTrainingReserveToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const point = this.getPointerWorldPosition(pointer);
      this.dragState = {
        origin: { kind: "training-defense-reserve" },
        pointer,
        token,
        startX: point.x,
        startY: point.y,
        moved: false,
        homeX: token.x,
        homeY: token.y,
        startedWhileDefenseUnlocked: true
      };
    });
  }

  private addTrainingPhase(): void {
    const plan = getV3CombinationPlan(this.selectedCombination);
    if (plan.phases.length >= LINEOUT_V3_MAX_PHASES) {
      this.flashStatus(t("lineout.v3.maximumPhases"));
      return;
    }
    plan.phases.push({ id: `phase-${Date.now()}`, actions: [] });
    this.persistTrainingPlan(plan, plan.phases.length - 1);
  }

  private removeTrainingPhase(): void {
    const plan = getV3CombinationPlan(this.selectedCombination);
    if (plan.phases.length <= 1) return;
    const index = this.trainingEditorPhaseIndex ?? plan.phases.length - 1;
    plan.phases.splice(index, 1);
    this.persistTrainingPlan(plan, Math.min(index, plan.phases.length - 1));
  }

  private renderTrainingActionOverlay(token: PlayerToken, playerPosition: LineoutPosition): void {
    this.trainingActionOverlay?.destroy();
    const currentAction = this.getTrainingPhaseAction(playerPosition);
    const plan = getV3CombinationPlan(this.selectedCombination);
    const isFinalPhase = this.trainingEditorPhaseIndex === plan.phases.length - 1;
    const container = this.add.container(token.x, token.y).setDepth(LINEOUT_ACTION_DEPTH + 20);
    const actions: Array<{
      type: "feint" | "jump";
      label: string;
      x: number;
      y: number;
    }> = [
      { type: "feint", label: t("lineout.v3.actionFeint"), x: -52, y: -54 },
      { type: "jump", label: t("lineout.v3.actionJump"), x: 52, y: -54 }
    ];
    actions.forEach((action) => {
      const active = currentAction?.type === action.type;
      const enabled = this.isTrainingAerialActionEligible(playerPosition, action.type)
        && (action.type !== "jump" || isFinalPhase);
      const bubble = this.add.circle(
        action.x,
        action.y,
        29,
        enabled ? (active ? UI.colors.accent : UI.colors.panelRaised) : UI.colors.panel,
        enabled ? 0.98 : 0.62
      )
        .setStrokeStyle(2, enabled && active ? UI.colors.accentStrong : UI.colors.outlineStrong, enabled ? 0.95 : 0.45)
        .setData(TRAINING_ACTION_OVERLAY_DATA_KEY, true);
      const label = this.add.text(action.x, action.y, action.label, {
        font: "bold 9px Arial",
        color: enabled ? UI.colors.text : UI.colors.muted,
        align: "center",
        wordWrap: { width: 50 }
      }).setOrigin(0.5).setData(TRAINING_ACTION_OVERLAY_DATA_KEY, true);
      if (enabled) {
        bubble.setInteractive({ useHandCursor: true });
        label.setInteractive({ useHandCursor: true });
        bubble.on("pointerup", () => this.toggleTrainingAction(playerPosition, action.type));
        label.on("pointerup", () => this.toggleTrainingAction(playerPosition, action.type));
      }
      container.add([bubble, label]);
    });
    this.trainingActionOverlay = container;
  }

  private toggleTrainingAction(
    playerPosition: LineoutPosition,
    type: "feint" | "jump",
    removeWhenAlreadySelected = true
  ): void {
    if (this.trainingEditorPhaseIndex === null) return;
    if (!this.isTrainingAerialActionEligible(playerPosition, type)) return;
    const plan = getV3CombinationPlan(this.selectedCombination);
    if (type === "jump" && this.trainingEditorPhaseIndex !== plan.phases.length - 1) return;
    const phase = plan.phases[this.trainingEditorPhaseIndex];
    const current = phase.actions.find((action) => action.playerPosition === playerPosition);
    phase.actions = phase.actions.filter((action) => action.playerPosition !== playerPosition);
    if (current?.type === type && removeWhenAlreadySelected) {
      this.persistTrainingPlan(plan, this.trainingEditorPhaseIndex, playerPosition);
      return;
    }

    if (type === "feint") {
      phase.actions.push({ type, playerPosition });
    } else {
      phase.actions.push({
        type,
        playerPosition,
        lifterPositions: this.getAutomaticLifterPositions(playerPosition)
      });
    }
    this.persistTrainingPlan(plan, this.trainingEditorPhaseIndex, playerPosition);
  }

  private getAutomaticLifterPositions(jumperPosition: LineoutPosition): LineoutPosition[] {
    if (this.trainingEditorPhaseIndex === null) return [];
    return evaluateLineoutV3AerialActionEligibility(
      this.selectedCombination,
      GameStore.getSave().playerTeam.lineoutPlayers,
      jumperPosition,
      this.trainingEditorPhaseIndex
    ).lifterPositions;
  }

  private isTrainingAerialActionEligible(
    playerPosition: LineoutPosition,
    actionType: "feint" | "jump"
  ): boolean {
    if (this.trainingEditorPhaseIndex === null) return false;
    const actionPosition = this.v3PositionForDepth(
      this.getTrainingPreviewDepth(playerPosition, this.trainingEditorPhaseIndex)
    );
    if (actionType === "jump" && actionPosition === 1) return false;
    return evaluateLineoutV3AerialActionEligibility(
      this.selectedCombination,
      GameStore.getSave().playerTeam.lineoutPlayers,
      playerPosition,
      this.trainingEditorPhaseIndex
    ).eligible;
  }

  private getTrainingPhaseAction(playerPosition: LineoutPosition): CombinationPhaseAction | undefined {
    if (this.trainingEditorPhaseIndex === null) return undefined;
    return getV3CombinationPlan(this.selectedCombination)
      .phases[this.trainingEditorPhaseIndex]
      ?.actions.find((action) => action.playerPosition === playerPosition);
  }

  private getTrainingEditorTokenY(position: LineoutPosition, layout: LineoutLayout): number {
    if (this.trainingMode !== "edit" || this.trainingEditorPhaseIndex === null) {
      return this.positionY(position, layout);
    }
    const playerY = this.v3YFromDepth(
      this.getTrainingPreviewDepth(position, this.trainingEditorPhaseIndex),
      layout
    );
    const supportAction = this.getTrainingAerialSupportAction(position);
    if (!supportAction) return playerY;

    const jumperY = this.v3YFromDepth(
      this.getTrainingPreviewDepth(supportAction.playerPosition, this.trainingEditorPhaseIndex),
      layout
    );
    const approachDistance = position < supportAction.playerPosition
      ? LINEOUT_LIFT_ANIMATION.frontLifterApproachDistancePixels
      : LINEOUT_LIFT_ANIMATION.approachDistancePixels;
    return playerY + Math.sign(jumperY - playerY) * approachDistance;
  }

  private renderTrainingMovementArrows(layout: LineoutLayout): void {
    if (this.trainingEditorPhaseIndex === null) return;
    const phaseIndex = this.trainingEditorPhaseIndex;
    const phase = getV3CombinationPlan(this.selectedCombination).phases[phaseIndex];
    const movements = phase?.actions.filter((action) => action.type === "move") ?? [];
    const graphics = this.add.graphics().setDepth(GROUND_SHADOW_DEPTH - 0.5);
    let upwardLaneIndex = 0;
    let downwardLaneIndex = 0;
    movements.forEach((movement) => {
      if (movement.type !== "move") return;
      const startDepth = this.getTrainingPreviewDepth(
        movement.playerPosition,
        phaseIndex - 1
      );
      const anchorOffsetY = -layout.playerHeight
        * TRAINING_MOVEMENT_ARROW_ANCHOR_HEIGHT_RATIO;
      const startY = this.v3YFromDepth(startDepth, layout)
        + anchorOffsetY;
      const endY = this.v3YFromDepth(movement.destinationDepthMeters, layout)
        + anchorOffsetY;
      if (Math.abs(endY - startY) < 4) return;
      const direction = Math.sign(endY - startY);
      const isUpwardMovement = direction < 0;
      const laneIndex = isUpwardMovement ? upwardLaneIndex++ : downwardLaneIndex++;
      const sideDirection = isUpwardMovement ? 1 : -1;
      const x = layout.attackX + sideDirection * (
        TRAINING_MOVEMENT_ARROW_HORIZONTAL_OFFSET_PIXELS
        + laneIndex * TRAINING_MOVEMENT_ARROW_LANE_GAP_PIXELS
      );
      const player = this.attackSlotPlayers[movement.playerPosition - 1];
      const playerX = layout.attackX + (player ? getPlayerAlignmentOffsetX(player.id) : 0);
      const startX = playerX + sideDirection * Math.min(8, layout.playerWidth * 0.15);
      this.drawTrainingMovementArrow(graphics, startX, startY, x, endY, direction);
    });
  }

  private drawTrainingMovementArrow(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    laneX: number,
    endY: number,
    direction: number
  ): void {
    const bendY = startY + direction * 10;
    const arrowBaseY = endY - direction * 11;
    const shadowBaseY = endY - direction * 13;
    const drawShaft = (
      width: number,
      color: number,
      alpha: number,
      destinationY: number
    ): void => {
      graphics.lineStyle(width, color, alpha);
      graphics.beginPath();
      graphics.moveTo(startX, startY);
      graphics.lineTo(laneX, bendY);
      graphics.lineTo(laneX, destinationY);
      graphics.strokePath();
    };

    drawShaft(5, TRAINING_MOVEMENT_ARROW_SHADOW_COLOR, 0.48, shadowBaseY);
    drawShaft(3, TRAINING_MOVEMENT_ARROW_COLOR, 0.98, arrowBaseY);

    graphics.fillStyle(TRAINING_MOVEMENT_ARROW_SHADOW_COLOR, 0.55);
    graphics.fillTriangle(
      laneX,
      endY,
      laneX - 7,
      shadowBaseY,
      laneX + 7,
      shadowBaseY
    );
    graphics.fillStyle(TRAINING_MOVEMENT_ARROW_COLOR, 0.98);
    graphics.fillTriangle(
      laneX,
      endY,
      laneX - 5,
      arrowBaseY,
      laneX + 5,
      arrowBaseY
    );

    graphics.fillStyle(TRAINING_MOVEMENT_ARROW_SHADOW_COLOR, 0.55);
    graphics.fillCircle(startX, startY, 4);
    graphics.fillStyle(TRAINING_MOVEMENT_ARROW_COLOR, 0.98);
    graphics.fillCircle(startX, startY, 2.5);
  }

  private getTrainingEditorPose(position: LineoutPosition): PoseName {
    if (this.trainingMode !== "edit" || this.trainingEditorPhaseIndex === null) {
      return this.getLineoutPose("us");
    }
    const actions = getV3CombinationPlan(this.selectedCombination)
      .phases[this.trainingEditorPhaseIndex]?.actions ?? [];
    if (actions.some((action) => (
      (action.type === "jump" || action.type === "feint")
      && action.playerPosition === position
    ))) {
      return "jumper";
    }
    const supportedAction = this.getTrainingAerialSupportAction(position);
    if (supportedAction) {
      const jumperDepth = this.getTrainingPreviewDepth(
        supportedAction.playerPosition,
        this.trainingEditorPhaseIndex
      );
      const lifterDepth = this.getTrainingPreviewDepth(position, this.trainingEditorPhaseIndex);
      return lifterDepth > jumperDepth ? "hand" : "lifter_front";
    }
    return this.getLineoutPose("us");
  }

  private getTrainingAerialSupportAction(
    lifterPosition: LineoutPosition
  ): Extract<CombinationPhaseAction, { type: "jump" | "feint" }> | undefined {
    if (this.trainingEditorPhaseIndex === null) return undefined;
    const actions = getV3CombinationPlan(this.selectedCombination)
      .phases[this.trainingEditorPhaseIndex]?.actions ?? [];
    return actions.find((action): action is Extract<CombinationPhaseAction, { type: "jump" | "feint" }> => {
      if (action.type === "jump") {
        return action.lifterPositions.includes(lifterPosition);
      }
      if (action.type !== "feint") return false;
      return this.getAutomaticLifterPositions(action.playerPosition).includes(lifterPosition);
    });
  }

  private getTrainingPreviewDepth(position: LineoutPosition, throughPhaseIndex: number): number {
    let depthMeters = getLineoutV3DepthForPosition(position);
    if (throughPhaseIndex < 0) return depthMeters;
    const phases = getV3CombinationPlan(this.selectedCombination).phases;
    for (let index = 0; index <= Math.min(throughPhaseIndex, phases.length - 1); index += 1) {
      const action = phases[index].actions.find((item) => item.playerPosition === position);
      if (action?.type === "move") depthMeters = action.destinationDepthMeters;
    }
    return depthMeters;
  }

  private persistTrainingPlan(
    plan: NonNullable<Combination["plan"]>,
    phaseIndex: number,
    selectedPosition?: LineoutPosition
  ): void {
    const sanitizedPlan = removeInvalidLineoutV3AerialActions(
      this.selectedCombination,
      GameStore.getSave().playerTeam.lineoutPlayers,
      plan
    );
    const updated = replaceCombinationPlan(
      GameStore.getSave().offensiveCombinations,
      this.selectedCombination.id,
      sanitizedPlan
    );
    GameStore.setOffensiveCombinations(updated);
    this.restartTrainingEditor({
      editorPhaseIndex: phaseIndex,
      editorSelectedPosition: selectedPosition
    });
  }

  private restartTrainingEditor(overrides: Partial<LineoutSceneData>): void {
    this.scene.restart({
      mode: "training",
      trainingMode: "edit",
      combinationId: this.selectedCombination.id,
      editorPhaseIndex: this.trainingEditorPhaseIndex,
      editorSelectedPosition: this.trainingEditorSelectedPosition ?? undefined,
      ...overrides
    } satisfies LineoutSceneData);
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
    const directionalAction = this.getDirectionalPlayerAction(this.dragState, pointerPosition);

    if (origin.kind === "training-action") {
      if (directionalAction !== null) {
        token.x = this.dragState.homeX;
        token.y = this.dragState.homeY;
        this.syncPlayerTokenDepth(token);
        this.dragState = null;
        if (directionalAction !== "none") {
          this.toggleTrainingAction(origin.playerPosition, directionalAction, false);
        }
        return;
      }
      const minY = Math.min(this.positionY(1, layout), this.positionY(7, layout));
      const maxY = Math.max(this.positionY(1, layout), this.positionY(7, layout));
      token.x = layout.attackX + getPlayerAlignmentOffsetX(token.player.id);
      token.y = Phaser.Math.Clamp(pointerPosition.y, minY, maxY);
      this.syncPlayerTokenDepth(token);
      return;
    }

    if (
      origin.kind === "training-slot"
      || origin.kind === "training-reserve"
      || origin.kind === "training-defense-slot"
      || origin.kind === "training-defense-reserve"
    ) {
      token.x = Phaser.Math.Clamp(pointerPosition.x, 28, 362);
      token.y = Phaser.Math.Clamp(pointerPosition.y, layout.fieldTop + layout.playerHeight - 4, layout.navigationY - 32);
      this.syncPlayerTokenDepth(token);
      return;
    }

    if (origin.kind === "match-defense") {
      if (directionalAction !== null) {
        this.dragState = null;
        if (directionalAction === "jump") {
          this.armDefensiveJump(token);
        } else {
          this.syncV3Objects();
        }
        return;
      }
      if (startedDragging) {
        this.setInspectedPlayer(token.player);
      }
      const minY = Math.min(this.positionY(1, layout), this.positionY(7, layout));
      const maxY = Math.max(this.positionY(1, layout), this.positionY(7, layout));
      token.y = Phaser.Math.Clamp(pointerPosition.y, minY, maxY);
      if (this.v3Engine && !this.v3Engine.getSnapshot().defenseLocked) {
        this.v3Engine.moveDefender(
          token.player.id,
          this.v3DepthFromY(token.y, layout)
        );
      }
      this.syncPlayerTokenDepth(token);
    }
  }

  private getPointerWorldPosition(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
  }

  private getDirectionalPlayerAction(
    drag: DragState,
    pointerPosition = this.getPointerWorldPosition(drag.pointer)
  ): DirectionalPlayerAction | null {
    if (drag.origin.kind !== "training-action" && drag.origin.kind !== "match-defense") {
      return null;
    }
    if (drag.directionalAction !== undefined) return drag.directionalAction;
    const deltaX = pointerPosition.x - drag.startX;
    const deltaY = pointerPosition.y - drag.startY;
    const gesture = LINEOUT_BALANCE.gameplayV3.gesture;
    if (
      Math.abs(deltaX) < gesture.playerActionSwipeMinimumPixels
      || Math.abs(deltaX) < Math.abs(deltaY) * gesture.playerActionSwipeDominanceRatio
    ) {
      return null;
    }
    drag.directionalAction = deltaX > 0
      ? "jump"
      : drag.origin.kind === "training-action" ? "feint" : "none";
    return drag.directionalAction;
  }

  private completeDrag(): void {
    if (!this.dragState) {
      return;
    }

    const drag = this.dragState;
    const directionalAction = this.getDirectionalPlayerAction(drag);
    this.dragState = null;

    if (directionalAction !== null) {
      if (drag.origin.kind === "training-action") {
        drag.token.x = drag.homeX;
        drag.token.y = drag.homeY;
        this.syncPlayerTokenDepth(drag.token);
        if (directionalAction !== "none") {
          this.toggleTrainingAction(
            drag.origin.playerPosition,
            directionalAction,
            false
          );
        }
        return;
      }
      if (drag.origin.kind === "match-defense") {
        if (directionalAction === "jump") {
          this.armDefensiveJump(drag.token);
        } else {
          this.syncV3Objects();
        }
        return;
      }
    }

    if (!drag.moved) {
      this.handleTap(drag);
      return;
    }

    if (
      drag.origin.kind === "training-defense-slot"
      || drag.origin.kind === "training-defense-reserve"
    ) {
      this.handleDefensiveTrainingDrop(drag);
      return;
    }

    if (drag.origin.kind === "training-action") {
      this.handleTrainingActionDrop(drag);
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
    if (
      drag.origin.kind === "training-defense-slot"
      || drag.origin.kind === "training-defense-reserve"
    ) {
      this.setInspectedPlayer(drag.token.player);
      return;
    }

    if (drag.origin.kind === "training-action") {
      this.renderTrainingActionOverlay(drag.token, drag.origin.playerPosition);
      return;
    }

    if (drag.origin.kind === "match-attack") {
      this.setInspectedPlayer(drag.token.player);
      return;
    }

    if (drag.origin.kind === "match-defense") {
      const snapshot = this.v3Engine?.getSnapshot();
      if (snapshot) {
        if (!snapshot.defenseLocked) {
          this.setInspectedPlayer(drag.token.player);
          return;
        }
        if (drag.startedWhileDefenseUnlocked) {
          return;
        }
        this.triggerDefensiveJump(drag.token);
        return;
      }
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

  private triggerDefensiveJump(token: PlayerToken): void {
    const snapshot = this.v3Engine?.getSnapshot();
    if (!snapshot) return;
    if (!snapshot.defenseLocked) {
      this.setInspectedPlayer(token.player);
      return;
    }
    this.armedDefensiveBlocks.delete(token.player.id);
    this.hidePlayerInspector();
    this.handleV3Events(this.v3Engine?.jumpDefender(token.player.id) ?? []);
    this.syncV3Objects();
  }

  private armDefensiveJump(token: PlayerToken): void {
    const snapshot = this.v3Engine?.getSnapshot();
    if (!snapshot) return;
    if (snapshot.defenseLocked) {
      this.triggerDefensiveJump(token);
      return;
    }

    const lifterIds = this.v3Engine?.getCompatibleLifterIds(token.player.id) ?? [];
    if (lifterIds.length === 0) return;
    const newParticipants = new Set([token.player.id, ...lifterIds]);
    this.armedDefensiveBlocks.forEach((armedLifterIds, armedJumperId) => {
      const armedParticipants = [armedJumperId, ...armedLifterIds];
      if (!armedParticipants.some((playerId) => newParticipants.has(playerId))) return;
      this.armedDefensiveBlocks.delete(armedJumperId);
      this.findV3Token(armedJumperId)?.resetPose();
    });
    this.armedDefensiveBlocks.set(token.player.id, lifterIds);
    this.hidePlayerInspector();
    token.setPose("hand");
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

    this.scene.restart({ mode: "training", trainingMode: "edit", combinationId: this.selectedCombination.id });
  }

  private finishMatchDefenseReorder(token: PlayerToken): void {
    if (this.v3Engine) {
      const layout = this.getLayout();
      const gesture = LINEOUT_BALANCE.gameplayV3.gesture;
      const swapRadius = Math.max(
        layout.playerHeight * gesture.playerSwapTargetRadiusHeightRatio,
        layout.slotGap * gesture.playerSwapTargetRadiusSlotRatio
      );
      const swapTarget = this.attackTokens
        .filter((candidate) => candidate !== token)
        .map((candidate) => ({
          token: candidate,
          distance: Math.abs(candidate.y - token.y)
        }))
        .filter((candidate) => candidate.distance <= swapRadius)
        .sort((left, right) => left.distance - right.distance)[0]?.token;
      if (swapTarget) {
        this.handleV3Events(this.v3Engine.swapDefenders(
          token.player.id,
          swapTarget.player.id
        ));
        this.syncV3Objects();
        return;
      }
      const destinationDepthMeters = this.v3DepthFromY(token.y, layout);
      this.handleV3Events(this.v3Engine.moveDefender(token.player.id, destinationDepthMeters));
      this.syncV3Objects();
      return;
    }
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
    const combinationsWithPlacement = replaceCombinationLayout(
      this.allCombinations,
      this.selectedCombination.id,
      assignments
    );
    const combinationsWithResetTimeline = replaceCombinationPlan(
      combinationsWithPlacement,
      this.selectedCombination.id,
      {
        phases: [{
          id: "phase-1",
          actions: []
        }]
      }
    );
    GameStore.setOffensiveCombinations(combinationsWithResetTimeline);
    this.scene.restart({
      mode: "training",
      trainingMode: "edit",
      combinationId: this.selectedCombination.id,
      editorPhaseIndex: null
    } satisfies LineoutSceneData);
  }

  private handleTrainingActionDrop(drag: DragState): void {
    if (drag.origin.kind !== "training-action" || this.trainingEditorPhaseIndex === null) return;
    const plan = getV3CombinationPlan(this.selectedCombination);
    const phase = plan.phases[this.trainingEditorPhaseIndex];
    const playerPosition = drag.origin.playerPosition;
    const layout = this.getLayout();
    const swapTargetPosition = this.findTrainingActionSwapTarget(drag, layout);
    if (swapTargetPosition !== null) {
      const sourceDepth = this.getTrainingPreviewDepth(
        playerPosition,
        this.trainingEditorPhaseIndex
      );
      const targetDepth = this.getTrainingPreviewDepth(
        swapTargetPosition,
        this.trainingEditorPhaseIndex
      );
      const sourceStartingDepth = this.getTrainingPreviewDepth(
        playerPosition,
        this.trainingEditorPhaseIndex - 1
      );
      const targetStartingDepth = this.getTrainingPreviewDepth(
        swapTargetPosition,
        this.trainingEditorPhaseIndex - 1
      );
      phase.actions = phase.actions.filter((action) => (
        action.playerPosition !== playerPosition
        && action.playerPosition !== swapTargetPosition
      ));
      if (Math.abs(targetDepth - sourceStartingDepth) > 0.01) {
        phase.actions.push({
          type: "move",
          playerPosition,
          destinationDepthMeters: targetDepth
        });
      }
      if (Math.abs(sourceDepth - targetStartingDepth) > 0.01) {
        phase.actions.push({
          type: "move",
          playerPosition: swapTargetPosition,
          destinationDepthMeters: sourceDepth
        });
      }
      this.persistTrainingPlan(plan, this.trainingEditorPhaseIndex);
      return;
    }

    const previousPlayerActions = phase.actions.filter(
      (action) => action.playerPosition === playerPosition
    );
    const actions = phase.actions.filter((action) => action.playerPosition !== playerPosition);
    const startingDepthMeters = this.getTrainingPreviewDepth(
      playerPosition,
      this.trainingEditorPhaseIndex - 1
    );
    const destinationDepthMeters = getLineoutV3DepthForPosition(
      getLineoutV3PositionForDepth(this.v3DepthFromY(drag.token.y, layout))
    );
    if (Math.abs(destinationDepthMeters - startingDepthMeters) > 0.01) {
      actions.push({
        type: "move",
        playerPosition,
        destinationDepthMeters
      });
    } else {
      actions.push(...previousPlayerActions.filter((action) => action.type !== "move"));
    }
    phase.actions = actions;
    this.persistTrainingPlan(plan, this.trainingEditorPhaseIndex);
  }

  private findTrainingActionSwapTarget(
    drag: DragState,
    layout: LineoutLayout
  ): LineoutPosition | null {
    if (drag.origin.kind !== "training-action") return null;
    const gesture = LINEOUT_BALANCE.gameplayV3.gesture;
    const swapRadius = Math.max(
      layout.playerHeight * gesture.playerSwapTargetRadiusHeightRatio,
      layout.slotGap * gesture.playerSwapTargetRadiusSlotRatio
    );
    return this.attackTokens
      .filter((candidate) => candidate !== drag.token)
      .map((candidate) => ({
        position: candidate.getData("lineoutPosition") as LineoutPosition | undefined,
        distance: Math.abs(candidate.y - drag.token.y)
      }))
      .filter((candidate): candidate is { position: LineoutPosition; distance: number } => (
        candidate.position !== undefined && candidate.distance <= swapRadius
      ))
      .sort((left, right) => left.distance - right.distance)[0]?.position ?? null;
  }

  private handleDefensiveTrainingDrop(drag: DragState): void {
    if (
      drag.origin.kind !== "training-defense-slot"
      && drag.origin.kind !== "training-defense-reserve"
    ) return;
    const layout = this.getLayout();
    const draft = (this.defensiveDraftIds ?? Array(7).fill(null)).slice(0, 7);
    while (draft.length < 7) draft.push(null);
    const targetSlotIndex = this.findTrainingTargetSlot(drag.token.x, drag.token.y, layout);
    const sourceSlotIndex = drag.origin.kind === "training-defense-slot"
      ? drag.origin.slotIndex
      : null;

    if (targetSlotIndex !== null) {
      if (sourceSlotIndex !== null) {
        const targetPlayerId = draft[targetSlotIndex];
        draft[targetSlotIndex] = draft[sourceSlotIndex];
        draft[sourceSlotIndex] = targetPlayerId;
      } else {
        const previousSlot = draft.indexOf(drag.token.player.id);
        if (previousSlot >= 0) draft[previousSlot] = null;
        draft[targetSlotIndex] = drag.token.player.id;
      }
      this.persistDefensiveDraft(draft);
      return;
    }

    if (sourceSlotIndex !== null && this.isInTrainingReserveZone(drag.token.x, drag.token.y, layout)) {
      draft[sourceSlotIndex] = null;
      this.persistDefensiveDraft(draft);
      return;
    }
    this.restartDefensiveEditor(this.defensiveEditorSize, draft);
  }

  private persistDefensiveDraft(draft: Array<string | null>): void {
    const count = draft.filter((playerId): playerId is string => typeof playerId === "string").length;
    if (count === this.defensiveEditorSize) {
      GameStore.setDefenseMemory(this.defensiveEditorSize, draft);
    }
    this.restartDefensiveEditor(this.defensiveEditorSize, draft);
  }

  private restartDefensiveEditor(
    size: DefensiveLineoutSize,
    draft?: Array<string | null>
  ): void {
    this.scene.restart({
      mode: "training",
      trainingMode: "defense-edit",
      defensiveSize: size,
      defensiveDraftIds: draft
    } satisfies LineoutSceneData);
  }

  private initializeV3Runtime(): void {
    if (this.shouldShowCombinationSelection() || (this.mode === "training" && this.trainingMode !== "practice")) {
      return;
    }
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const defensiveMatch = this.isDefensiveMatch();
    const attackingSlots = defensiveMatch ? this.defenseSlotPlayers : this.attackSlotPlayers;
    const defendingSlots = defensiveMatch ? this.attackSlotPlayers : this.defenseSlotPlayers;
    const attackingEntries = attackingSlots
      .map((player, index) => ({ player, position: (index + 1) as LineoutPosition }))
      .filter((entry): entry is { player: FieldPlayer; position: LineoutPosition } => entry.player !== null);
    const defendingEntries = defendingSlots
      .map((player, index) => ({ player, position: (index + 1) as LineoutPosition }))
      .filter((entry): entry is { player: FieldPlayer; position: LineoutPosition } => entry.player !== null);
    const minute = this.currentMatchLineout?.minute ?? match?.minute ?? 0;
    const maximumFatigue = match?.maximumFatigueByPlayerId ?? {};
    const fatigueByPlayerId = Object.fromEntries(
      [...attackingEntries, ...defendingEntries].map(({ player }) => [
        player.id,
        calculateCurrentFatiguePercent(maximumFatigue[player.id] ?? 0, minute)
      ])
    );
    const throwingHooker = defensiveMatch
      ? match?.away.hooker
      : save.playerTeam.hooker;
    if (!throwingHooker || attackingEntries.length === 0) return;

    this.v3Engine = new LineoutV3Engine({
      minute,
      throwingHooker,
      attackingPlayers: attackingEntries.map((entry) => entry.player),
      defendingPlayers: defendingEntries.map((entry) => entry.player),
      attackingDepthsMeters: attackingEntries.map((entry) => this.v3DepthForPosition(entry.position)),
      defendingDepthsMeters: defendingEntries.map((entry) => this.v3DepthForPosition(entry.position)),
      combination: defensiveMatch
        ? this.opponentCombination ?? this.selectedCombination
        : this.selectedCombination,
      fatigueByPlayerId: {
        ...fatigueByPlayerId,
        [throwingHooker.id]: calculateCurrentFatiguePercent(
          maximumFatigue[throwingHooker.id] ?? 0,
          minute
        )
      }
    }, MATH_RANDOM_SOURCE);

    if (defensiveMatch) {
      this.renderV3GroupHandles();
      const targetPosition = this.opponentTargetPosition ?? 4;
      const combinationStartsAtMs = Math.max(
        0,
        LINEOUT_BALANCE.gameplayV3.timing.opponentPreparationMs
          - LINEOUT_BALANCE.gameplayV3.timing.combinationLeadMs
      );
      this.v3OpponentCombinationStartsAtMs = combinationStartsAtMs;
      this.v3OpponentThrowAtMs = combinationStartsAtMs
        + calculateAiLineoutV3ThrowReleaseMs(
          this.opponentCombination ?? this.selectedCombination,
          targetPosition
        );
    }
  }

  private canControlV3Throw(): boolean {
    return Boolean(this.v3Engine)
      && !this.isDefensiveMatch()
      && (this.mode === "match" || this.trainingMode === "practice")
      && !this.v3Engine?.getSnapshot().defenseLocked;
  }

  private beginV3ThrowGesture(pointer: Phaser.Input.Pointer): void {
    if (!this.v3Engine || !this.canControlV3Throw() || this.v3ThrowGesture) return;
    const point = this.getPointerWorldPosition(pointer);
    this.handleV3Events(this.v3Engine.startCombination());
    this.v3ThrowGesture = {
      pointer,
      contactStartedAtMs: this.time.now,
      gestureStartedAtMs: null,
      gestureStartY: point.y
    };
    this.createV3ThrowPowerGauge();
    this.updateV3ThrowPowerGauge(point);
    const predictedPosition = this.opponentDefensiveJumpPosition;
    const predictedPlayer = predictedPosition
      ? this.defenseSlotPlayers[predictedPosition - 1]
      : null;
    if (predictedPosition && predictedPlayer) {
      this.handleV3Events(this.v3Engine.moveDefender(
        predictedPlayer.id,
        this.v3DepthForPosition(predictedPosition)
      ));
    }
  }

  private renderV3GroupHandles(): void {
    const engine = this.v3Engine;
    if (!engine || engine.getSnapshot().defenseLocked) return;
    this.destroyV3GroupHandles();
    engine.getSnapshot().players
      .filter((state) => state.side === "defendingTeam")
      .forEach((state) => {
        const jumperToken = this.findV3Token(state.player.id);
        const lifterIds = engine.getCompatibleLifterIds(state.player.id);
        if (!jumperToken || lifterIds.length === 0) return;
        this.createV3GroupHandle(jumperToken);
      });
  }

  private createV3GroupHandle(jumperToken: PlayerToken): void {
    const engine = this.v3Engine;
    if (!engine) return;
    const handleOffsetY = jumperToken.getVisualCenterOffsetY();
    const background = this.add.circle(0, 0, 19, UI.colors.panelDark, 0.98)
      .setStrokeStyle(2, UI.colors.accent);
    const label = this.add.text(0, 0, "↕", {
      font: "bold 22px Arial",
      color: UI.colors.textAccent
    }).setOrigin(0.5);
    const hitbox = this.add.zone(0, 0, 48, 58).setInteractive({ useHandCursor: true });
    const handle = this.add.container(
      jumperToken.x - 64,
      jumperToken.y + handleOffsetY,
      [background, label, hitbox]
    )
      .setDepth(LINEOUT_ACTION_DEPTH);
    hitbox.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (engine.getSnapshot().defenseLocked) return;
      const lifterIds = engine.getCompatibleLifterIds(jumperToken.player.id);
      if (lifterIds.length === 0) return;
      this.v3GroupDrag = {
        pointer,
        jumperId: jumperToken.player.id,
        lifterIds,
        handle,
        handleOffsetY
      };
    });
    this.v3GroupHandles.set(jumperToken.player.id, handle);
  }

  private destroyV3GroupHandles(): void {
    this.v3GroupHandles.forEach((handle) => handle.destroy());
    this.v3GroupHandles.clear();
  }

  private trackV3GroupDrag(): void {
    const drag = this.v3GroupDrag;
    if (!drag) return;
    const point = this.getPointerWorldPosition(drag.pointer);
    const layout = this.getLayout();
    const firstPositionY = this.positionY(1, layout) + drag.handleOffsetY;
    const seventhPositionY = this.positionY(7, layout) + drag.handleOffsetY;
    drag.handle.y = Phaser.Math.Clamp(
      point.y,
      Math.min(firstPositionY, seventhPositionY),
      Math.max(firstPositionY, seventhPositionY)
    );
    if (this.v3Engine && !this.v3Engine.getSnapshot().defenseLocked) {
      this.v3Engine.moveDefensiveGroup(
        drag.jumperId,
        this.v3DepthFromY(drag.handle.y - drag.handleOffsetY, layout),
        drag.lifterIds
      );
    }
  }

  private completeV3GroupDrag(): void {
    const drag = this.v3GroupDrag;
    this.v3GroupDrag = null;
    if (!drag || !this.v3Engine) return;
    const destination = this.v3DepthFromY(
      drag.handle.y - drag.handleOffsetY,
      this.getLayout()
    );
    this.handleV3Events(this.v3Engine.moveDefensiveGroup(
      drag.jumperId,
      destination,
      drag.lifterIds
    ));
    this.syncV3Objects();
  }

  private trackV3ThrowGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.v3ThrowGesture;
    if (!gesture || gesture.pointer.id !== pointer.id || !pointer.isDown) return;
    const point = this.getPointerWorldPosition(pointer);
    const activationDistance = LINEOUT_BALANCE.gameplayV3.gesture.minimumDistancePixels;
    if (
      gesture.gestureStartedAtMs === null
      && gesture.gestureStartY - point.y >= activationDistance
    ) {
      gesture.gestureStartedAtMs = this.time.now;
    }
    this.updateV3ThrowPowerGauge(point);
  }

  private completeV3ThrowGesture(pointer: Phaser.Input.Pointer): void {
    const gesture = this.v3ThrowGesture;
    if (!gesture || gesture.pointer.id !== pointer.id) return;
    const point = this.getPointerWorldPosition(pointer);
    this.updateV3ThrowPowerGauge(point);
    this.v3ThrowGesture = null;
    if (!this.v3Engine) {
      this.destroyV3ThrowPowerGauge();
      return;
    }
    const throwGesture: LineoutV3ThrowGesture = {
      distancePixels: Math.max(0, gesture.gestureStartY - point.y),
      durationMs: Math.max(
        1,
        this.time.now - (gesture.gestureStartedAtMs ?? gesture.contactStartedAtMs)
      )
    };
    const released = this.v3Engine.releaseThrow(throwGesture);
    if (!released.validation.valid) {
      this.destroyV3ThrowPowerGauge();
      this.flashStatus(t(`lineout.v3.gesture.${released.validation.reason}`));
      return;
    }
    this.scheduleV3ThrowPowerGaugeHide();
    this.handleV3Events(released.events);
    this.scheduleV3AiDefensiveJump();
  }

  private animateV3PlayerPreparation(): void {
    this.v3PreparationTweens.forEach((tween) => tween.stop());
    this.v3PreparationTweens = [];
    this.v3AttackingPreparationProgress = 0;
    this.v3DefendingPreparationProgress = 0;

    const attackingState = { progress: 0 };
    const defendingState = { progress: 0 };
    this.v3PreparationTweens.push(
      this.tweens.add({
        targets: attackingState,
        progress: 1,
        duration: LINEOUT_PREPARATION_ANIMATION.attackingDurationMs,
        ease: "Sine.easeOut",
        onUpdate: () => {
          this.v3AttackingPreparationProgress = attackingState.progress;
        }
      }),
      this.tweens.add({
        targets: defendingState,
        progress: 1,
        delay: LINEOUT_PREPARATION_ANIMATION.defendingDelayMs,
        duration: LINEOUT_PREPARATION_ANIMATION.defendingDurationMs,
        ease: "Sine.easeOut",
        onUpdate: () => {
          this.v3DefendingPreparationProgress = defendingState.progress;
        }
      })
    );
  }

  private startV3DynamicCameraFlight(): void {
    if (!this.v3HudCamera) {
      const fieldCamera = this.cameras.main;
      this.v3CameraBaseZoom = fieldCamera.zoom;
      const hudCandidates: Array<Phaser.GameObjects.GameObject | undefined> = [
        this.matchScoreOverlay,
        this.statusText,
        this.inspectorPanel
      ];
      this.v3CameraHudObjects = hudCandidates.filter(
        (object): object is Phaser.GameObjects.GameObject => object !== undefined
      );
      this.v3CameraWorldObjects = this.children.list.filter((object) => (
        !this.v3CameraHudObjects.includes(object)
      ));
      fieldCamera.ignore(this.v3CameraHudObjects);
      this.v3HudCamera = this.cameras.add(
        fieldCamera.x,
        fieldCamera.y,
        fieldCamera.width,
        fieldCamera.height,
        false,
        "lineout-interface"
      );
      this.v3HudCamera
        .setZoom(this.v3CameraBaseZoom)
        .centerOn(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2)
        .ignore(this.v3CameraWorldObjects);
    }

    this.v3CameraPhase = "flight";
    this.v3CameraFocusX = SCREEN_WIDTH / 2;
    this.v3CameraFocusY = SCREEN_HEIGHT / 2;
    this.v3CameraZoom = 1;
    this.v3CameraFlightStartedAtMs = this.time.now;
    this.v3CameraReceptionTargetId = null;
  }

  private focusV3DynamicCameraOnContest(): void {
    if (!this.v3HudCamera) return;
    this.v3CameraPhase = "contest";
    this.cameras.main.shake(
      LINEOUT_CAMERA_ANIMATION.contestShakeDurationMs,
      LINEOUT_CAMERA_ANIMATION.contestShakeIntensity
    );
  }

  private settleV3DynamicCamera(
    resolution: NonNullable<ReturnType<LineoutV3Engine["getSnapshot"]>["resolution"]>,
    holdDurationMs: number = LINEOUT_CAMERA_ANIMATION.resultHoldDurationMs
  ): void {
    if (!this.v3HudCamera) return;
    this.v3CameraReceptionTargetId = typeof resolution.details.catcherId === "string"
      ? resolution.details.catcherId
      : typeof resolution.details.recoveryPlayerId === "string"
        ? resolution.details.recoveryPlayerId
        : null;
    this.v3CameraPhase = "reception";
    this.time.delayedCall(holdDurationMs, () => {
      if (this.v3CameraPhase === "reception") this.v3CameraPhase = "return";
    });
    this.time.delayedCall(
      Math.max(
        LINEOUT_CAMERA_ANIMATION.cleanupDelayMs,
        holdDurationMs + LINEOUT_CAMERA_ANIMATION.returnDurationMs + 50
      ),
      () => this.restoreV3DynamicCamera()
    );
  }

  private updateV3DynamicCamera(delta: number): void {
    if (!this.v3HudCamera || this.v3CameraPhase === "idle") return;
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;
    let focusPoint = { x: centerX, y: centerY };
    let targetZoom: number = LINEOUT_CAMERA_ANIMATION.releaseZoom;

    if (this.v3CameraPhase === "flight" && this.v3BallSprite) {
      focusPoint = { x: this.v3BallSprite.x, y: this.v3BallSprite.y };
      const releaseProgress = Phaser.Math.Clamp(
        (this.time.now - this.v3CameraFlightStartedAtMs)
          / LINEOUT_CAMERA_ANIMATION.releaseRampDurationMs,
        0,
        1
      );
      targetZoom = Phaser.Math.Linear(
        LINEOUT_CAMERA_ANIMATION.releaseZoom,
        LINEOUT_CAMERA_ANIMATION.flightZoom,
        releaseProgress
      );
    } else if (this.v3CameraPhase === "contest") {
      focusPoint = this.getV3CameraPlayersCenter([...this.v3ContestPlayerIds]) ?? focusPoint;
      targetZoom = LINEOUT_CAMERA_ANIMATION.contestZoom;
    } else if (this.v3CameraPhase === "reception") {
      const token = this.v3CameraReceptionTargetId
        ? this.findV3Token(this.v3CameraReceptionTargetId)
        : undefined;
      focusPoint = token
        ? { x: token.x, y: token.y + token.getVisualCenterOffsetY() }
        : this.v3BallSprite
          ? { x: this.v3BallSprite.x, y: this.v3BallSprite.y }
          : focusPoint;
      targetZoom = LINEOUT_CAMERA_ANIMATION.receptionZoom;
    } else if (this.v3CameraPhase === "return") {
      targetZoom = 1;
    }

    const targetFocusX = centerX + Phaser.Math.Clamp(
      (focusPoint.x - centerX) * LINEOUT_CAMERA_ANIMATION.horizontalFollowRatio,
      -LINEOUT_CAMERA_ANIMATION.maximumHorizontalShiftPixels,
      LINEOUT_CAMERA_ANIMATION.maximumHorizontalShiftPixels
    );
    const targetFocusY = centerY + Phaser.Math.Clamp(
      (focusPoint.y - centerY) * LINEOUT_CAMERA_ANIMATION.verticalFollowRatio,
      -LINEOUT_CAMERA_ANIMATION.maximumVerticalShiftPixels,
      LINEOUT_CAMERA_ANIMATION.maximumVerticalShiftPixels
    );
    const responseDuration = this.v3CameraPhase === "return"
      ? LINEOUT_CAMERA_ANIMATION.returnDurationMs / 4
      : LINEOUT_CAMERA_ANIMATION.responseDurationMs;
    const smoothing = 1 - Math.exp(-delta / responseDuration);
    this.v3CameraFocusX = Phaser.Math.Linear(this.v3CameraFocusX, targetFocusX, smoothing);
    this.v3CameraFocusY = Phaser.Math.Linear(this.v3CameraFocusY, targetFocusY, smoothing);
    this.v3CameraZoom = Phaser.Math.Linear(this.v3CameraZoom, targetZoom, smoothing);
    this.cameras.main
      .setZoom(this.v3CameraBaseZoom * this.v3CameraZoom)
      .centerOn(this.v3CameraFocusX, this.v3CameraFocusY);
  }

  private getV3CameraPlayersCenter(playerIds: readonly string[]): { x: number; y: number } | null {
    const tokens = playerIds
      .map((playerId) => this.findV3Token(playerId))
      .filter((token): token is PlayerToken => Boolean(token));
    if (tokens.length === 0) return null;
    return {
      x: tokens.reduce((total, token) => total + token.x, 0) / tokens.length,
      y: tokens.reduce(
        (total, token) => total + token.y + token.getVisualCenterOffsetY(),
        0
      ) / tokens.length
    };
  }

  private restoreV3DynamicCamera(): void {
    if (!this.v3HudCamera && this.v3CameraPhase === "idle") return;
    const fieldCamera = this.cameras.main;
    this.v3CameraHudObjects.forEach((object) => {
      clearCameraFilterRecursively(object, fieldCamera.id);
    });
    if (this.v3HudCamera) {
      const hudCameraId = this.v3HudCamera.id;
      this.v3CameraWorldObjects.forEach((object) => {
        clearCameraFilterRecursively(object, hudCameraId);
      });
      this.cameras.remove(this.v3HudCamera);
    }
    fieldCamera
      .resetFX()
      .setZoom(this.v3CameraBaseZoom)
      .centerOn(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    this.v3HudCamera = undefined;
    this.v3CameraHudObjects = [];
    this.v3CameraWorldObjects = [];
    this.v3CameraPhase = "idle";
    this.v3CameraFocusX = SCREEN_WIDTH / 2;
    this.v3CameraFocusY = SCREEN_HEIGHT / 2;
    this.v3CameraZoom = 1;
    this.v3CameraBaseZoom = fieldCamera.zoom;
    this.v3CameraReceptionTargetId = null;
  }

  private scheduleV3AiDefensiveJump(): void {
    if (
      !this.v3Engine
      || this.mode !== "match"
      || this.isDefensiveMatch()
      || this.v3AiJumpAtMs !== null
      || !this.opponentDefensiveJumpPosition
      || !this.defenseSlotPlayers[this.opponentDefensiveJumpPosition - 1]
    ) return;
    const match = GameStore.getMatch();
    const identity = match
      ? createOpponentAiIdentity(match.away.id, match.divisionId)
      : null;
    this.v3AiJumpAtMs = this.v3Engine.getSnapshot().elapsedMs
      + Math.round(330 - (identity?.aiIntelligence ?? 30) * 1.8);
  }

  private createV3ThrowPowerGauge(): void {
    this.destroyV3ThrowPowerGauge();
    const graphics = this.add.graphics();
    const levelLabel = this.add.text(0, 0, "", {
      font: "bold 15px Arial",
      color: UI.colors.text,
      stroke: UI.colors.textStroke,
      strokeThickness: 3
    }).setOrigin(0.5);
    const container = this.add.container(0, 0, [graphics, levelLabel])
      .setDepth(LINEOUT_ACTION_DEPTH + 20);
    this.v3ThrowPowerGauge = { container, graphics, levelLabel };
  }

  private updateV3ThrowPowerGauge(point: Phaser.Math.Vector2): void {
    const gesture = this.v3ThrowGesture;
    const gauge = this.v3ThrowPowerGauge;
    const engine = this.v3Engine;
    if (!gesture || !gauge || !engine) return;

    const minimumDistance = LINEOUT_BALANCE.gameplayV3.gesture.minimumDistancePixels;
    const distancePixels = Math.max(0, gesture.gestureStartY - point.y);
    const durationMs = Math.max(
      1,
      this.time.now - (gesture.gestureStartedAtMs ?? gesture.contactStartedAtMs)
    );
    const validation = engine.validateThrowGesture({ distancePixels, durationMs });
    const requestedDepth = getLineoutV3DepthForGestureDistance(distancePixels);
    const level = distancePixels < minimumDistance
      ? 0
      : getLineoutV3PositionForDepth(requestedDepth);
    const layout = this.getLayout();
    const railX = SCREEN_WIDTH - 15;
    const fixedTargetOffsetY = getHandPoseBallOffset(layout.playerHeight).y;
    const positionTargetY = (position: LineoutPosition): number => (
      this.positionY(position, layout) + fixedTargetOffsetY
    );
    const firstPositionY = positionTargetY(1);
    const seventhPositionY = positionTargetY(7);
    const throwStartY = Math.max(firstPositionY + 22, this.getHookerBallStart("us", layout).y);
    const positionProgress = Phaser.Math.Clamp(
      (requestedDepth - LINEOUT_BALANCE.gameplayV3.depth.minimumMeters)
        / LINEOUT_BALANCE.gameplayV3.depth.positionSpacingMeters,
      0,
      6
    );
    const lowerTargetPosition = (Math.floor(positionProgress) + 1) as LineoutPosition;
    const upperTargetPosition = (Math.ceil(positionProgress) + 1) as LineoutPosition;
    const targetY = distancePixels < minimumDistance
      ? Phaser.Math.Linear(throwStartY, firstPositionY, distancePixels / minimumDistance)
      : Phaser.Math.Linear(
        positionTargetY(lowerTargetPosition),
        positionTargetY(upperTargetPosition),
        positionProgress - Math.floor(positionProgress)
      );
    const activeColor = level === 0
      ? UI.colors.outlineStrong
      : validation.valid ? UI.colors.accent : UI.colors.danger;
    const activeTargetY = level > 0
      ? positionTargetY(level as LineoutPosition)
      : null;

    gauge.graphics.clear();

    gauge.graphics.fillStyle(UI.colors.scrim, 0.54);
    gauge.graphics.fillRoundedRect(
      railX - 4,
      seventhPositionY - 8,
      8,
      throwStartY - seventhPositionY + 16,
      4
    );

    gauge.graphics.lineStyle(2, UI.colors.outlineStrong, 0.34);
    gauge.graphics.beginPath();
    gauge.graphics.moveTo(railX, throwStartY);
    gauge.graphics.lineTo(railX, seventhPositionY);
    gauge.graphics.strokePath();

    gauge.graphics.lineStyle(7, activeColor, 0.1);
    gauge.graphics.beginPath();
    gauge.graphics.moveTo(railX, throwStartY);
    gauge.graphics.lineTo(railX, targetY);
    gauge.graphics.strokePath();

    gauge.graphics.lineStyle(2, activeColor, 0.95);
    gauge.graphics.beginPath();
    gauge.graphics.moveTo(railX, throwStartY);
    gauge.graphics.lineTo(railX, targetY);
    gauge.graphics.strokePath();

    for (let position = 1; position <= 7; position += 1) {
      const markerY = positionTargetY(position as LineoutPosition);
      const isActive = position === level;
      gauge.graphics.fillStyle(isActive ? activeColor : UI.colors.outlineStrong, isActive ? 1 : 0.56);
      gauge.graphics.fillCircle(railX, markerY, isActive ? 4 : 2.5);
    }

    if (activeTargetY !== null) {
      gauge.graphics.lineStyle(1, activeColor, 0.2);
      gauge.graphics.beginPath();
      gauge.graphics.moveTo(18, activeTargetY);
      gauge.graphics.lineTo(railX - 10, activeTargetY);
      gauge.graphics.strokePath();

      gauge.graphics.lineStyle(3, activeColor, 0.9);
      gauge.graphics.beginPath();
      gauge.graphics.moveTo(railX - 66, activeTargetY);
      gauge.graphics.lineTo(railX - 9, activeTargetY);
      gauge.graphics.strokePath();

      gauge.graphics.fillStyle(UI.colors.panelDark, 0.94);
      gauge.graphics.fillRoundedRect(railX - 48, activeTargetY - 12, 26, 24, 7);
      gauge.graphics.lineStyle(1, activeColor, 0.9);
      gauge.graphics.strokeRoundedRect(railX - 48, activeTargetY - 12, 26, 24, 7);
      gauge.graphics.fillStyle(activeColor, 1);
      gauge.graphics.fillTriangle(
        railX - 9,
        activeTargetY,
        railX - 16,
        activeTargetY - 5,
        railX - 16,
        activeTargetY + 5
      );
    }

    gauge.levelLabel
      .setVisible(activeTargetY !== null)
      .setText(level > 0 ? String(level) : "")
      .setColor(validation.valid ? UI.colors.textAccent : UI.colors.textDanger)
      .setPosition(railX - 35, activeTargetY ?? firstPositionY);
    gauge.container.setPosition(0, 0);
  }

  private destroyV3ThrowPowerGauge(): void {
    this.v3ThrowPowerGaugeHideTimer?.remove(false);
    this.v3ThrowPowerGaugeHideTimer = undefined;
    this.v3ThrowPowerGauge?.container.destroy(true);
    this.v3ThrowPowerGauge = undefined;
  }

  private scheduleV3ThrowPowerGaugeHide(): void {
    this.v3ThrowPowerGaugeHideTimer?.remove(false);
    this.v3ThrowPowerGaugeHideTimer = this.time.delayedCall(
      LINEOUT_BALANCE.gameplayV3.timing.throwPowerGaugeHoldMs,
      () => {
        this.v3ThrowPowerGaugeHideTimer = undefined;
        this.destroyV3ThrowPowerGauge();
      }
    );
  }

  private updateV3Runtime(delta: number): void {
    const engine = this.v3Engine;
    if (!engine) return;
    if (this.v3ResolutionHandled) {
      engine.update(delta);
      this.syncV3Objects();
      return;
    }
    const beforeUpdate = engine.getSnapshot();
    if (
      this.isDefensiveMatch()
      && !beforeUpdate.combinationStarted
      && this.v3OpponentCombinationStartsAtMs !== null
      && beforeUpdate.elapsedMs >= this.v3OpponentCombinationStartsAtMs
    ) {
      this.v3OpponentCombinationStartsAtMs = null;
      this.handleV3Events(engine.startCombination());
    }
    if (
      this.isDefensiveMatch()
      && !beforeUpdate.ball
      && this.v3OpponentThrowAtMs !== null
      && beforeUpdate.elapsedMs >= this.v3OpponentThrowAtMs
      && engine.hasStartedCombinationPhase(getLineoutV3TargetPhaseIndex(
        this.opponentCombination ?? this.selectedCombination,
        this.opponentTargetPosition ?? 4
      ))
    ) {
      const targetDepth = this.v3DepthForPosition(this.opponentTargetPosition ?? 4);
      const distancePixels = this.v3GestureDistanceForDepth(targetDepth);
      const released = engine.releaseThrow({
        distancePixels,
        durationMs: distancePixels / 520 * 1_000
      });
      this.v3OpponentThrowAtMs = null;
      this.handleV3Events(released.events);
    }
    if (
      this.v3AiJumpAtMs !== null
      && beforeUpdate.elapsedMs >= this.v3AiJumpAtMs
      && beforeUpdate.ball !== null
      && this.opponentDefensiveJumpPosition
    ) {
      const player = this.defenseSlotPlayers[this.opponentDefensiveJumpPosition - 1];
      if (player) this.handleV3Events(engine.jumpDefender(player.id));
      this.v3AiJumpAtMs = null;
    }
    this.handleV3Events(engine.update(delta));
    this.syncV3Objects();
  }

  private handleV3Events(events: readonly LineoutV3Event[]): void {
    for (const event of events) {
      if (event.type === "combinationStarted") {
        [...this.attackTokens, ...this.defenseTokens].forEach((token) => (
          token.setIdleBreathingActive(false)
        ));
        this.setHookerIdleBreathingActive(false);
        this.animateV3PlayerPreparation();
        this.hookerSprite?.setPose("hooker_throw_back");
        this.hookerShadow?.setPose("hooker_throw_back");
      } else if (event.type === "throwReleased") {
        this.v3GroupHandles.forEach((handle) => handle.setVisible(false));
        this.hookerHeldBall?.setVisible(false);
        if (!this.v3BallSprite) {
          const layout = this.getLayout();
          const start = this.getHookerBallStart(
            this.isDefensiveMatch() ? "opponent" : "us",
            layout
          );
          this.v3BallSprite = this.add.image(start.x, start.y, "lineout-ball")
            .setDisplaySize(17, 24)
            .setDepth(LINEOUT_ACTION_DEPTH - 10);
          const hookerFeetY = this.hookerSprite?.y ?? layout.hookerY;
          const startElevationPixels = Math.max(0, hookerFeetY - start.y);
          const shadowOffset = getElevatedObjectShadowOffset(startElevationPixels);
          this.v3BallShadow = this.add.image(
            start.x + shadowOffset.x,
            start.y + shadowOffset.y,
            "lineout-ball"
          )
            .setDisplaySize(17, 24)
            .setTintFill(PLAYER_GROUND_SHADOW_STYLE.color)
            .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha)
            .setAngle(PLAYER_GROUND_SHADOW_STYLE.angleDegrees)
            .setDepth(LINEOUT_ACTION_DEPTH - 10.1);
        }
        this.startV3DynamicCameraFlight();
        const armedBlocks = [...this.armedDefensiveBlocks.entries()];
        this.armedDefensiveBlocks.clear();
        armedBlocks.forEach(([armedJumperId, lifterIds]) => {
          this.handleV3Events(
            this.v3Engine?.jumpDefender(armedJumperId, lifterIds) ?? []
          );
        });
      } else if (event.type === "jumpStarted") {
        const jumpingPlayer = this.v3Engine?.getSnapshot().players.find((state) => (
          state.player.id === event.playerId
        ));
        if (!event.feint && jumpingPlayer?.side === "throwingTeam") {
          this.scheduleV3AiDefensiveJump();
        }
        this.findV3Token(event.playerId)?.setPose("jumper");
        const players = this.v3Engine?.getSnapshot().players ?? [];
        const jumperDepth = players.find((state) => state.player.id === event.playerId)
          ?.position.depthMeters;
        event.lifterIds.forEach((lifterId) => {
          const lifterDepth = players.find((state) => state.player.id === lifterId)
            ?.position.depthMeters;
          const pose: PoseName = jumperDepth !== undefined
            && lifterDepth !== undefined
            && lifterDepth > jumperDepth
            ? "hand"
            : "lifter_front";
          this.findV3Token(lifterId)?.setPose(pose);
        });
      } else if (event.type === "ballAttempt") {
        this.animateV3BallAttempts(event.playerIds);
      } else if (event.type === "ballContact") {
        this.animateV3Contest(event.playerIds);
      } else if (event.type === "resolved") {
        this.handleV3Resolution(event.resolution);
      }
    }
  }

  private syncV3Objects(): void {
    const snapshot = this.v3Engine?.getSnapshot();
    if (!snapshot) return;
    const layout = this.getLayout();
    const naturalLateralScale = ((layout.defenseX ?? 250) - layout.attackX) / 1.44;
    const lateralScale = this.mode === "training"
      ? Math.max(
          naturalLateralScale,
          (layout.playerWidth + TRAINING_MOVEMENT_AVOIDANCE_VISUAL_MARGIN_PIXELS)
            / LINEOUT_BALANCE.gameplayV3.movement.avoidanceLateralMeters
        )
      : naturalLateralScale;
    snapshot.players.forEach((state) => {
      const token = this.findV3Token(state.player.id);
      if (
        !token
        || this.dragState?.token === token
        || (this.v3GroundRecoveryRunStarted && state.player.id === this.v3GroundRecoveryPlayerId)
      ) return;
      const displayedLateralMeters = this.getV3DisplayedLateralMeters(
        state.position.lateralMeters
      );
      const baseX = this.mode === "training"
        ? layout.hookerX + (state.position.lateralMeters + 0.72) * lateralScale
        : SCREEN_WIDTH / 2 + displayedLateralMeters * lateralScale;
      const groundY = this.v3YFromDepth(state.position.depthMeters, layout);
      const engagedJumper = state.activity === "lifting" && state.engagedByPlayerId
        ? snapshot.players.find((candidate) => candidate.player.id === state.engagedByPlayerId)
        : undefined;
      const isFrontLifter = Boolean(
        engagedJumper
        && state.position.depthMeters < engagedJumper.position.depthMeters
      );
      const lifterApproachDurationMs = isFrontLifter
        ? LINEOUT_LIFT_ANIMATION.frontLifterApproachDurationMs
        : LINEOUT_LIFT_ANIMATION.approachDurationMs;
      const approachProgress = engagedJumper?.jump
        ? this.getV3LifterApproachProgress(
          snapshot.elapsedMs - engagedJumper.jump.startedAtMs,
          engagedJumper.jump.durationMs,
          lifterApproachDurationMs
        )
        : 0;
      const jumperApproachProgress = state.jump && !state.jump.feint
        ? this.getV3LifterApproachProgress(
          snapshot.elapsedMs - state.jump.startedAtMs,
          state.jump.durationMs
        )
        : 0;
      const jumperGroundY = engagedJumper
        ? this.v3YFromDepth(engagedJumper.position.depthMeters, layout)
        : groundY;
      const approachDistance = isFrontLifter
        ? LINEOUT_LIFT_ANIMATION.frontLifterApproachDistancePixels
        : LINEOUT_LIFT_ANIMATION.approachDistancePixels;
      const approachY = Math.sign(jumperGroundY - groundY)
        * approachDistance
        * approachProgress;
      const corridorDirection = this.mode === "training" ? 0 : Math.sign(SCREEN_WIDTH / 2 - baseX);
      const contestApproachProgress = this.v3ContestPlayerIds.has(state.player.id)
        && this.v3ContestStartedAtMs !== null
        ? Phaser.Math.Clamp(
          (snapshot.elapsedMs - this.v3ContestStartedAtMs)
            / LINEOUT_LIFT_ANIMATION.approachDurationMs,
          0,
          1
        )
        : 0;
      const corridorProgress = Math.max(
        approachProgress,
        jumperApproachProgress,
        contestApproachProgress
      );
      const alignmentOffsetX = getPlayerAlignmentOffsetX(state.player.id);
      const preparationProgress = state.side === "throwingTeam"
        ? this.v3AttackingPreparationProgress
        : this.v3DefendingPreparationProgress;
      const preparationDirection = this.mode === "training"
        ? -Math.sign(alignmentOffsetX)
        : Math.sign(SCREEN_WIDTH / 2 - baseX);
      const preparationDistance = this.mode === "training"
        ? getTrainingPreparationDistanceX(alignmentOffsetX)
        : getPlayerPreparationDistanceX(state.player.id, state.side === "throwingTeam");
      token.x = baseX
        + alignmentOffsetX
        + preparationDirection * preparationDistance * preparationProgress
        + corridorDirection * LINEOUT_LIFT_ANIMATION.contestCenterShiftPixels * corridorProgress;
      const elevationPixels = state.position.heightMeters * V3_METERS_TO_PIXELS;
      token.y = groundY + approachY - elevationPixels;
      token.setBodyAngle(
        corridorDirection
          * LINEOUT_LIFT_ANIMATION.contestJumperLeanDegrees
          * jumperApproachProgress
      );
      token.setShadowElevation(elevationPixels);
      const isMoving = state.activity === "moving" && state.movement !== undefined;
      token.updateWalkingMovement(
        state.position.depthMeters,
        state.position.lateralMeters,
        isMoving
      );
      if (state.player.id === this.v3ContactPlayerId && this.v3RetainedBallPose) {
        const desiredPose: Extract<PoseName, "hand" | "jumper"> = (
          this.v3RetainedBallPose === "jumper"
          && state.jump
          && !state.jump.feint
          && state.position.heightMeters > 0
        ) ? "jumper" : "hand";
        if (desiredPose !== this.v3RetainedBallPose) {
          this.v3RetainedBallPose = desiredPose;
          token.setPose(desiredPose);
          if (this.v3BallSprite) {
            const placement = getCaughtBallPlacement(desiredPose, layout.playerHeight);
            token.attachToBody(this.v3BallSprite, placement.x, placement.y);
            this.v3BallSprite.setAngle(placement.angle);
          }
        }
      } else if (this.armedDefensiveBlocks.has(state.player.id)) {
        token.setPose("hand");
      } else if (
        state.player.id !== this.v3ContactPlayerId
        && !this.v3ContestPlayerIds.has(state.player.id)
        && !this.v3BallAttemptPlayerIds.has(state.player.id)
        && ["ready", "moving", "unavailable"].includes(state.activity)
        && !isMoving
      ) token.resetPose();
      this.syncPlayerTokenDepth(token);
    });
    if (!snapshot.defenseLocked) {
      this.v3GroupHandles.forEach((handle, jumperId) => {
        if (this.v3GroupDrag?.handle === handle) return;
        const jumperToken = this.findV3Token(jumperId);
        if (jumperToken) {
          handle.setPosition(
            jumperToken.x - 64,
            jumperToken.y + jumperToken.getVisualCenterOffsetY()
          );
        }
      });
    }
    if (snapshot.ball && this.v3BallSprite && !this.v3ContactPlayerId) {
      const displayedBallLateralMeters = this.getV3DisplayedLateralMeters(
        snapshot.ball.position.lateralMeters
      );
      this.v3BallSprite.x = SCREEN_WIDTH / 2 + displayedBallLateralMeters * lateralScale;
      const targetApproachProgress = Phaser.Math.Clamp(
        snapshot.ball.position.depthMeters
          / Math.max(0.001, snapshot.ball.trajectory.actualDepthMeters),
        0,
        1
      );
      const releaseInfluence = (1 - targetApproachProgress) ** 2;
      const releasePoint = this.getHookerBallStart(
        this.isDefensiveMatch() ? "opponent" : "us",
        layout
      );
      const hookerFeetY = this.hookerSprite?.y ?? layout.hookerY;
      const releaseElevationPixels = Math.max(0, hookerFeetY - releasePoint.y);
      const trajectoryElevationPixels = snapshot.ball.position.heightMeters
        * V3_METERS_TO_PIXELS;
      const trajectoryStartElevationPixels = LINEOUT_BALANCE.gameplayV3.trajectory.startHeightMeters
        * V3_METERS_TO_PIXELS;
      const trajectoryStartY = this.v3YFromDepth(0, layout) - trajectoryStartElevationPixels;
      const releaseYOffset = releasePoint.y - trajectoryStartY;
      const ballGroundY = this.v3YFromDepth(snapshot.ball.position.depthMeters, layout);
      const ballElevationPixels = trajectoryElevationPixels
        + (releaseElevationPixels - trajectoryStartElevationPixels) * releaseInfluence;
      this.v3BallSprite.y = ballGroundY
        - trajectoryElevationPixels
        + releaseYOffset * releaseInfluence;
      this.v3BallSprite.setDepth(
        snapshot.ball.completed
          ? this.getPlayerDepth(ballGroundY) + 0.05
          : LINEOUT_ACTION_DEPTH - 10
      );
      this.v3BallSprite.setAngle(snapshot.ball.completed ? 90 : -8);
      if (this.v3BallShadow) {
        const trajectoryBalance = LINEOUT_BALANCE.gameplayV3.trajectory;
        const shadowHeightProgress = Phaser.Math.Clamp(
          (snapshot.ball.position.heightMeters - trajectoryBalance.startHeightMeters)
            / (trajectoryBalance.highTargetHeightMeters - trajectoryBalance.startHeightMeters),
          0,
          1
        );
        const shadowDistanceScale = Phaser.Math.Linear(
          1,
          LINEOUT_THROW_ANIMATION.ballShadowMaximumDistanceScale,
          shadowHeightProgress
        );
        const shadowOffset = getElevatedObjectShadowOffset(
          ballElevationPixels,
          shadowDistanceScale
        );
        const heightRatio = Phaser.Math.Clamp(
          snapshot.ball.position.heightMeters
            / trajectoryBalance.shadowReferenceHeightMeters,
          0,
          1
        );
        const shadowScale = Phaser.Math.Linear(
          1,
          LINEOUT_THROW_ANIMATION.ballShadowApexScale,
          heightRatio
        );
        this.v3BallShadow
          .setPosition(
            this.v3BallSprite.x + shadowOffset.x,
            this.v3BallSprite.y + shadowOffset.y
          )
          .setDisplaySize(17 * shadowScale, 24 * shadowScale)
          .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha)
          .setDepth(this.v3BallSprite.depth - 0.01)
          .setVisible(true);
      }
    }
  }

  private getV3LifterApproachProgress(
    elapsedMs: number,
    durationMs: number,
    approachDurationMs: number = LINEOUT_LIFT_ANIMATION.approachDurationMs
  ): number {
    const approachProgress = Phaser.Math.Clamp(
      elapsedMs / approachDurationMs,
      0,
      1
    );
    const returnProgress = Phaser.Math.Clamp(
      (durationMs - elapsedMs) / LINEOUT_LIFT_ANIMATION.lifterReturnDurationMs,
      0,
      1
    );
    return Math.min(approachProgress, returnProgress);
  }

  private handleV3Resolution(
    resolution: NonNullable<ReturnType<LineoutV3Engine["getSnapshot"]>["resolution"]>
  ): void {
    if (this.v3ResolutionHandled) return;
    this.v3ResolutionHandled = true;
    this.v3GroupHandles.forEach((handle) => handle.setVisible(false));
    const groundRecoveryAnimationDurationMs = resolution.primaryReason === "lineout.v3.reason.groundRecovery"
      ? this.animateV3GroundRecovery(resolution)
      : 0;
    if (groundRecoveryAnimationDurationMs === 0) {
      if (resolution.outcome === "knockOn") {
        this.animateV3KnockOn(resolution);
      } else {
        this.retainV3CaughtBall(resolution);
      }
    }
    this.settleV3DynamicCamera(
      resolution,
      groundRecoveryAnimationDurationMs || LINEOUT_CAMERA_ANIMATION.resultHoldDurationMs
    );
    const perspective = this.isDefensiveMatch() ? "defending" : "throwing";
    const result = adaptV3ResolutionForPerspective(resolution, perspective);

    const match = GameStore.getMatch();
    if (this.mode === "match" && match) {
      const throwingSide = this.isDefensiveMatch() ? "opponent" : "us";
      const updated = applyLineoutResolutionToMatch(match, resolution, throwingSide);
      updated.lineouts[updated.currentLineoutIndex].resolved = true;
      updated.minute = this.currentMatchLineout?.minute ?? updated.minute;
      updated.currentLineoutIndex += 1;
      const catcherId = typeof resolution.details.catcherId === "string"
        ? resolution.details.catcherId
        : undefined;
      const actualDepth = typeof resolution.details.actualDepthMeters === "number"
        ? resolution.details.actualDepthMeters
        : undefined;
      this.selectedTargetId = catcherId ?? null;
      this.selectedTargetPosition = actualDepth === undefined
        ? null
        : this.v3PositionForDepth(actualDepth);
      updated.playerUsage = this.recordV3Usage(
        updated.playerUsage,
        catcherId,
        !this.isDefensiveMatch()
      );
      if (this.isDefensiveMatch()) {
        this.recordOpponentOffensiveSummary(updated, result);
        updated.lineoutHistory.push({
          minute: this.currentMatchLineout?.minute ?? updated.minute,
          throwingSide: "opponent",
          displayedResult: result.displayedResult,
          success: resolution.ballTeam === "defendingTeam",
          combinationId: this.opponentCombination?.id,
          targetOptionId: this.opponentTargetOptionId ?? undefined,
          targetPosition: this.opponentTargetPosition ?? undefined,
          officialOutcome: resolution.outcome
        });
      } else {
        this.recordOffensiveSummary(updated, result);
        if (this.selectedTargetPosition) {
          GameStore.observePlayerLineoutTarget(
            match.away.id,
            this.selectedCombination.id,
            this.selectedTargetPosition
          );
        }
      }
      GameStore.setMatch(updated);
    }
    this.time.delayedCall(
      Math.max(
        LINEOUT_BALANCE.gameplayV3.timing.resultOverlayDelayMs,
        groundRecoveryAnimationDurationMs > 0
          ? groundRecoveryAnimationDurationMs + LINEOUT_CAMERA_ANIMATION.returnDurationMs + 100
          : 0
      ),
      () => this.showResult(result)
    );
  }

  private animateV3GroundRecovery(
    resolution: NonNullable<ReturnType<LineoutV3Engine["getSnapshot"]>["resolution"]>
  ): number {
    const recoveryPlayerId = typeof resolution.details.recoveryPlayerId === "string"
      ? resolution.details.recoveryPlayerId
      : "";
    const snapshot = this.v3Engine?.getSnapshot();
    const state = snapshot?.players.find((player) => player.player.id === recoveryPlayerId);
    const ballState = snapshot?.ball;
    const token = recoveryPlayerId ? this.findV3Token(recoveryPlayerId) : undefined;
    const ball = this.v3BallSprite;
    if (!state || !ballState || !token || !ball) return 0;

    this.v3GroundRecoveryPlayerId = recoveryPlayerId;
    this.v3GroundRecoveryRunStarted = false;
    this.v3BallAttemptPlayerIds.delete(recoveryPlayerId);
    token.setIdleBreathingActive(false);
    const startDepthMeters = state.position.depthMeters;
    const startLateralMeters = state.position.lateralMeters;
    const destinationDepthMeters = ballState.position.depthMeters;
    const destinationLateralMeters = ballState.position.lateralMeters;
    const distanceMeters = Math.hypot(
      destinationDepthMeters - startDepthMeters,
      destinationLateralMeters - startLateralMeters
    );
    const speedMetersPerSecond = getLineoutV3MovementSpeedMetersPerSecond(state.player.speed);
    const runDurationMs = Math.max(
      LINEOUT_THROW_ANIMATION.v3GroundRecoveryMinimumRunDurationMs,
      distanceMeters / Math.max(0.01, speedMetersPerSecond) * 1_000,
    );
    const layout = this.getLayout();
    const feetSide = Math.sign(token.x - ball.x)
      || (state.side === "throwingTeam" ? -1 : 1);
    const destinationX = ball.x
      + feetSide * LINEOUT_THROW_ANIMATION.v3GroundRecoveryFeetDistancePixels;
    const destinationY = this.v3YFromDepth(destinationDepthMeters, layout);
    const relatedJump = state.jump
      ?? (state.engagedByPlayerId
        ? snapshot.players.find((player) => player.player.id === state.engagedByPlayerId)?.jump
        : undefined);
    const landingDurationMs = relatedJump
      ? Math.max(0, relatedJump.startedAtMs + relatedJump.durationMs - snapshot.elapsedMs)
      : 0;
    const startRun = (): void => {
      this.v3GroundRecoveryRunStarted = true;
      const originalX = token.x;
      const originalY = token.y;
      const movementProgress = { value: 0 };
      this.tweens.add({
        targets: movementProgress,
        value: 1,
        duration: runDurationMs,
        ease: "Linear",
        onUpdate: () => {
          token.x = Phaser.Math.Linear(originalX, destinationX, movementProgress.value);
          token.y = Phaser.Math.Linear(originalY, destinationY, movementProgress.value);
          token.updateWalkingMovement(
            Phaser.Math.Linear(startDepthMeters, destinationDepthMeters, movementProgress.value),
            Phaser.Math.Linear(startLateralMeters, destinationLateralMeters, movementProgress.value),
            true
          );
          this.syncPlayerTokenDepth(token);
        },
        onComplete: () => {
          token.x = destinationX;
          token.y = destinationY;
          token.stopWalkingMovement().setPose("hand");
          this.syncPlayerTokenDepth(token);
          const placement = getCaughtBallPlacement("hand", layout.playerHeight);
          this.tweens.add({
            targets: ball,
            x: token.x + placement.x,
            y: token.y + placement.y,
            angle: placement.angle,
            duration: LINEOUT_THROW_ANIMATION.v3GroundRecoveryPickupDurationMs,
            ease: "Sine.easeOut",
            onStart: () => {
              this.v3ContactPlayerId = recoveryPlayerId;
              this.v3RetainedBallPose = "hand";
              this.v3BallShadow?.setVisible(false);
            },
            onComplete: () => {
              token.attachToBody(ball, placement.x, placement.y);
              ball.setAngle(placement.angle);
            }
          });
        }
      });
    };

    const beginRunAfterLanding = (): void => {
      if (landingDurationMs > 0) {
        token.y = this.v3YFromDepth(startDepthMeters, layout);
        token.setBodyAngle(0);
        token.setShadowElevation(0);
        token.resetPose();
        this.syncPlayerTokenDepth(token);
      }
      startRun();
    };
    this.time.delayedCall(landingDurationMs, beginRunAfterLanding);

    return Math.round(
      landingDurationMs
      + runDurationMs
      + LINEOUT_THROW_ANIMATION.v3GroundRecoveryPickupDurationMs
      + LINEOUT_THROW_ANIMATION.v3GroundRecoveryHoldDurationMs
    );
  }

  private retainV3CaughtBall(
    resolution: NonNullable<ReturnType<LineoutV3Engine["getSnapshot"]>["resolution"]>
  ): void {
    if (resolution.outcome === "knockOn" || !this.v3BallSprite) return;
    const catcherId = typeof resolution.details.catcherId === "string"
      ? resolution.details.catcherId
      : "";
    if (!catcherId) return;
    const token = this.findV3Token(catcherId);
    const state = this.v3Engine?.getSnapshot().players.find((player) => (
      player.player.id === catcherId
    ));
    if (!token || !state) return;

    const pose: Extract<PoseName, "hand" | "jumper"> = resolution.details.receptionPose === "jumper"
      ? "jumper"
      : "hand";
    const placement = getCaughtBallPlacement(pose, this.getLayout().playerHeight);
    this.v3ContactPlayerId = catcherId;
    this.v3RetainedBallPose = pose;
    token.setPose(pose);
    token.attachToBody(this.v3BallSprite, placement.x, placement.y);
    this.v3BallSprite.setAngle(placement.angle);
    this.v3BallShadow?.setVisible(false);
  }

  private animateV3Contest(playerIds: readonly string[]): void {
    const snapshot = this.v3Engine?.getSnapshot();
    if (!snapshot) return;
    const contestPlayers = snapshot.players.filter((state) => (
      playerIds.includes(state.player.id)
    ));
    if (contestPlayers.length < 2) return;

    this.v3ContestPlayerIds = new Set(
      contestPlayers.map((state) => state.player.id)
    );
    this.v3ContestStartedAtMs = snapshot.elapsedMs;
    this.focusV3DynamicCameraOnContest();
    contestPlayers.forEach((state) => {
      const token = this.findV3Token(state.player.id);
      if (!token) return;
      const isJumping = Boolean(state.jump && !state.jump.feint);
      if (isJumping) return;
      token.setPose("hand");
    });
  }

  private animateV3BallAttempts(playerIds: readonly string[]): void {
    const players = this.v3Engine?.getSnapshot().players ?? [];
    playerIds.forEach((playerId) => {
      const state = players.find((player) => player.player.id === playerId);
      const token = this.findV3Token(playerId);
      if (!state || !token || (state.jump && !state.jump.feint)) return;
      this.v3BallAttemptPlayerIds.add(playerId);
      token.setPose("hand");
      this.time.delayedCall(LINEOUT_THROW_ANIMATION.v3BallAttemptPoseDurationMs, () => {
        this.v3BallAttemptPlayerIds.delete(playerId);
        if (
          this.v3ContactPlayerId !== playerId
          && this.v3GroundRecoveryPlayerId !== playerId
          && !this.v3ContestPlayerIds.has(playerId)
        ) token.resetPose();
      });
    });
  }

  private animateV3KnockOn(
    resolution: NonNullable<ReturnType<LineoutV3Engine["getSnapshot"]>["resolution"]>
  ): void {
    const playerId = typeof resolution.details.catcherId === "string"
      ? resolution.details.catcherId
      : "";
    const ball = this.v3BallSprite;
    const token = playerId ? this.findV3Token(playerId) : undefined;
    const state = this.v3Engine?.getSnapshot().players.find((player) => (
      player.player.id === playerId
    ));
    if (!ball || !token || !state) return;

    const pose: Extract<PoseName, "hand" | "jumper"> = state.jump && !state.jump.feint
      ? "jumper"
      : "hand";
    const placement = getCaughtBallPlacement(pose, this.getLayout().playerHeight);
    const forwardDirection = this.getV3ForwardDirection(state.side);
    this.v3ContactPlayerId = playerId;
    token.setPose(pose);
    this.v3BallShadow?.setVisible(false);

    this.time.delayedCall(0, () => {
      const groundY = this.v3YFromDepth(state.position.depthMeters, this.getLayout())
        - LINEOUT_THROW_ANIMATION.groundBallCenterOffsetPixels;
      const forwardX = token.x
        + forwardDirection * LINEOUT_THROW_ANIMATION.v3KnockOnForwardPixels;
      ball.setDepth(LINEOUT_ACTION_DEPTH - 10);
      this.tweens.add({
        targets: ball,
        x: token.x + placement.x,
        y: token.y + placement.y,
        angle: 0,
        duration: LINEOUT_THROW_ANIMATION.v3KnockOnContactDurationMs,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: ball,
            x: forwardX,
            y: groundY,
            angle: 90,
            duration: LINEOUT_THROW_ANIMATION.knockOnDropDurationMs,
            ease: "Quad.easeIn",
            onComplete: () => {
              ball.setDepth(this.getPlayerDepth(groundY) + 0.05);
              this.tweens.add({
                targets: ball,
                y: groundY - LINEOUT_THROW_ANIMATION.knockOnBouncePixels,
                angle: 205,
                duration: LINEOUT_THROW_ANIMATION.knockOnBounceDurationMs,
                ease: "Quad.easeOut",
                yoyo: true,
                onComplete: () => ball.setAngle(90)
              });
            }
          });
        }
      });
    });
  }

  private findV3Token(playerId: string): PlayerToken | undefined {
    return [...this.attackTokens, ...this.defenseTokens]
      .find((token) => token.player.id === playerId);
  }

  private recordV3Usage(
    usageMap: Record<string, MatchPlayerUsage>,
    catcherId: string | undefined,
    playerTeamThrows: boolean
  ): Record<string, MatchPlayerUsage> {
    let updated = usageMap;
    if (playerTeamThrows) {
      updated = addUsage(updated, GameStore.getSave().playerTeam.hooker.id, "throwing", 1);
    }
    const ourSide = playerTeamThrows ? "throwingTeam" : "defendingTeam";
    this.v3Engine?.getSnapshot().players
      .filter((state) => state.side === ourSide)
      .forEach((state) => {
        if (state.hasJumped) {
          updated = addUsage(updated, state.player.id, "speed", 1);
          updated = addUsage(updated, state.player.id, "technique", 1);
        }
        if (state.hasLifted) {
          updated = addUsage(updated, state.player.id, "strength", 1);
        }
      });
    if (
      catcherId
      && GameStore.getSave().playerTeam.fieldPlayers.some((player) => player.id === catcherId)
    ) {
      updated = addUsage(updated, catcherId, "technique", 1);
    }
    return updated;
  }

  private v3DepthForPosition(position: LineoutPosition): number {
    return getLineoutV3DepthForPosition(position);
  }

  private v3PositionForDepth(depthMeters: number): LineoutPosition {
    return getLineoutV3PositionForDepth(depthMeters);
  }

  private v3GestureDistanceForDepth(depthMeters: number): number {
    return getLineoutV3GestureDistanceForDepth(depthMeters);
  }

  private v3YFromDepth(depthMeters: number, layout: LineoutLayout): number {
    const depth = LINEOUT_BALANCE.gameplayV3.depth;
    const positionIndex = (depthMeters - depth.minimumMeters) / depth.positionSpacingMeters;
    const firstPositionY = this.positionY(1, layout);
    const seventhPositionY = this.positionY(7, layout);
    return firstPositionY + (seventhPositionY - firstPositionY) * (positionIndex / 6);
  }

  private v3DepthFromY(y: number, layout: LineoutLayout): number {
    const depth = LINEOUT_BALANCE.gameplayV3.depth;
    const firstPositionY = this.positionY(1, layout);
    const seventhPositionY = this.positionY(7, layout);
    const positionIndex = (y - firstPositionY) / (seventhPositionY - firstPositionY) * 6;
    return Phaser.Math.Clamp(
      depth.minimumMeters + positionIndex * depth.positionSpacingMeters,
      0,
      depth.maximumMeters + depth.ballContinuationMeters
    );
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
    const samePositionContest = defendingJumpPosition === targetPosition && Boolean(
      result.resolution?.details.defensiveSelectionMode === "aerialCounter"
      || result.resolution?.details.defensiveReadMatched === true
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
        layout.hookerX,
        trajectory === "low" ? "hand" : "jumper",
        samePositionContest
      );
    }
    this.animateJumpGroup(
      defendingSupportTokens,
      defendingTargetToken,
      shouldDefenderJump,
      defendingArrivalDurationMs,
      Boolean(retainedToken && retainedToken === defendingTargetToken),
      defenderJumpQuality,
      layout.hookerX,
      trajectory === "low" ? "hand" : "jumper",
      samePositionContest
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
      const samePositionContest = throwingPositions.has(waypoint.position)
        && defendingPositions.has(waypoint.position);

      if (throwingPositions.has(waypoint.position)) {
        const token = throwingTokens.find(
          (candidate) => candidate.getData("lineoutPosition") === waypoint.position
        );
        if (token) {
          this.animateSecondaryRecoveryToken(
            token,
            mode,
            animationDelayMs,
            token === retainedToken,
            samePositionContest
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
            token === retainedToken,
            samePositionContest
          );
        }
      }
    });
  }

  private animateSecondaryRecoveryToken(
    token: PlayerToken,
    mode: SecondaryAttemptMode,
    delayMs: number,
    retainsBall: boolean,
    samePositionContest: boolean
  ): void {
    this.time.delayedCall(delayMs, () => {
      token.setPose(mode === "hand" ? "hand" : "jumper");
      if (samePositionContest) {
        this.moveTokenTowardContestCenter(token, this.getLayout().hookerX);
      }

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
    contestCenterX: number,
    jumpPose: PoseName,
    samePositionContest: boolean
  ): void {
    if (!targetToken) {
      return;
    }
    if (!shouldJump) {
      const handPoseDelayMs = Math.max(
        LINEOUT_LIFT_ANIMATION.approachDurationMs,
        ballArrivalDurationMs
      );
      if (samePositionContest) {
        this.time.delayedCall(
          Math.max(0, handPoseDelayMs - LINEOUT_LIFT_ANIMATION.approachDurationMs),
          () => this.moveTokenTowardContestCenter(targetToken, contestCenterX)
        );
      }
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
      const contestDirection = this.mode === "training"
        ? 0
        : Math.sign(contestCenterX - originalTargetX);
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
          duration: animationConfig.approachDurationMs,
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
        targetToken.setPose(jumpPose);
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

  private getV3DisplayedLateralMeters(lateralMeters: number): number {
    return this.mode === "match" && this.isDefensiveMatch()
      ? -lateralMeters
      : lateralMeters;
  }

  private getV3ForwardDirection(side: "throwingTeam" | "defendingTeam"): number {
    const throwingTeamDirection = this.mode === "match" && this.isDefensiveMatch()
      ? -1
      : 1;
    return side === "throwingTeam" ? throwingTeamDirection : -throwingTeamDirection;
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
    const hookerBallPoint = this.hookerSprite?.getWorldPointAtRelativeHeightFromFeet(
      LINEOUT_THROW_ANIMATION.hookerBallSourceXRatio,
      LINEOUT_THROW_ANIMATION.hookerBallHeightFromFeetRatio
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
      updated = addUsage(updated, targetToken.player.id, "speed", 1);
      updated = addUsage(updated, targetToken.player.id, "technique", 1);
    }

    for (const player of this.getSupportPlayersAroundTarget()) {
      updated = addUsage(updated, player.id, "strength", 1);
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
      updated = addUsage(updated, targetToken.player.id, "speed", 1);
      updated = addUsage(updated, targetToken.player.id, "technique", 1);
      for (const player of this.getSupportPlayersAroundTarget()) {
        updated = addUsage(updated, player.id, "strength", 1);
      }
    } else if (targetToken && result.resolution?.details.defensiveReadMatched === true) {
      updated = addUsage(updated, targetToken.player.id, "technique", 1);
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

  private moveTokenTowardContestCenter(token: PlayerToken, contestCenterX: number): void {
    const contestDirection = Math.sign(contestCenterX - token.x);
    this.tweens.add({
      targets: token,
      x: token.x + contestDirection * LINEOUT_LIFT_ANIMATION.contestCenterShiftPixels,
      duration: LINEOUT_LIFT_ANIMATION.approachDurationMs,
      ease: "Sine.easeInOut"
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
        const clickedTrainingAction = currentlyOver.some(
          (gameObject) => gameObject.getData(TRAINING_ACTION_OVERLAY_DATA_KEY) === true
        );
        if (this.trainingActionOverlay && !clickedTrainingAction) {
          this.hideTrainingActionOverlay();
        }
        if (!clickedPlayer) {
          this.hidePlayerInspector();
        }
      }
    );
  }

  private hideTrainingActionOverlay(): void {
    this.trainingActionOverlay?.destroy();
    this.trainingActionOverlay = undefined;
    this.trainingEditorSelectedPosition = null;
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
        { label: t("team.stat.speed"), value: this.inspectedPlayer.speed },
        { label: t("team.stat.strength"), value: this.inspectedPlayer.strength },
        { label: t("team.stat.technique"), value: this.inspectedPlayer.technique }
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
      token.x = layout.attackX + getPlayerAlignmentOffsetX(token.player.id);
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
      if (this.trainingMode === "defense-edit") {
        const save = GameStore.getSave();
        const stored = save.defenseMemory[this.defensiveEditorSize]
          ?? createDefaultDefensiveLayout(save.playerTeam, this.defensiveEditorSize);
        const sourceDraft = this.defensiveDraftIds ?? stored;
        const draft = Array.from({ length: 7 }, (_item, index) => (
          sourceDraft[index] ?? null
        ));
        const playersById = new Map(players.map((player) => [player.id, player]));
        this.trainingAssignedPlayers = draft.map((playerId) => (
          playerId ? playersById.get(playerId) ?? null : null
        ));
        this.attackSlotPlayers = this.trainingAssignedPlayers.slice();
        this.defenseSlotPlayers = [];
        return;
      }
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
    const combinationName = this.getUserCombinationDisplayName(this.selectedCombination);

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

  private getUserCombinationDisplayName(combination: Combination): string {
    const save = GameStore.getSave();
    const activeCombinations = getActiveOffensiveCombinations(
      this.allCombinations,
      save.offensiveRepertoire
    );
    const activeIndex = activeCombinations.findIndex((item) => item.id === combination.id);
    return getCombinationDisplayName(
      combination,
      t,
      activeIndex >= 0 ? activeIndex : undefined
    );
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
    let playableCombinations = match.away.offensiveCombinations.map((combination) => (
      rebuildPlayableCombinationTargets(
        combination,
        match.away.fieldPlayers
      )
    ));
    let playableRepertoire = constrainAiAerialRepertoire(
      playableCombinations,
      match.away.offensiveRepertoire,
      LINEOUT_BALANCE.ai.maximumNonAerialCombinationRatio
    );
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[match.divisionId];
    if (playableRepertoire.activeCombinationIds.length < repertoireLimits.active) {
      const repaired = assignTeamLineoutRepertoire({
        hooker: match.away.hooker,
        players: match.away.fieldPlayers,
        style: match.away.lineoutStyle,
        activeCount: repertoireLimits.active,
        reserveCount: repertoireLimits.reserve,
        rng: MATH_RANDOM_SOURCE
      });
      match.away.offensiveCombinations = repaired.combinations;
      match.away.offensiveRepertoire = repaired.repertoire;
      playableCombinations = repaired.combinations;
      playableRepertoire = repaired.repertoire;
    }
    const decision = chooseAiOffensiveLineout({
      combinations: playableCombinations,
      repertoire: playableRepertoire,
      style: match.away.lineoutStyle,
      zone: this.getOpponentFieldZone(this.currentMatchLineout?.pitchZone ?? "middle"),
      memory: GameStore.getPreparedOpponentAiMemory(match.away.id),
      identity: createOpponentAiIdentity(match.away.id, match.divisionId),
      previous,
      rng: MATH_RANDOM_SOURCE
    });
    this.opponentCombination = buildAiLineoutCombinationPlan({
      combination: decision.combination,
      targetOption: decision.targetOption,
      divisionId: match.divisionId,
      rng: MATH_RANDOM_SOURCE
    });
    this.opponentTargetOptionId = decision.targetOption.id;
    this.opponentTargetPosition = decision.targetOption.targetPosition;
    this.opponentTargetId = decision.targetPlayerId;
    this.defenseSlotPlayers = getPlayersAssignedToCombination(
      match.away.fieldPlayers,
      this.opponentCombination
    );
    const playerCount = countAssignedPlayers(this.opponentCombination);
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

  private showResult(result: LineoutResult): void {
    this.restoreV3DynamicCamera();
    if (
      this.mode === "match"
      && (result.resolution?.outcome === "knockOn" || result.internalEvent === "knock_on")
    ) {
      playRefereeWhistle(this);
    }

    const presentation = buildLineoutResultPresentation(result);
    const continueMatch = this.mode === "training"
      ? () => this.scene.restart({
        mode: "training",
        trainingMode: "edit",
        combinationId: this.selectedCombination.id
      } satisfies LineoutSceneData)
      : () => this.startMatchSimulationReturnTransition();
    const summary = presentation.summaryKeys.map((key) => t(key)).join(" ");
    const resultTone = result.displayedResult === "won" || result.displayedResult === "won_dirty"
      ? "success"
      : "danger";
    new Modal(this, t(presentation.titleKey), summary, continueMatch, {
      primaryLabel: t("button.continue"),
      tone: resultTone,
      secondaryAction: {
        label: t("lineout.result.details"),
        onSelect: () => {
          new Modal(
            this,
            t("lineout.result.detailsTitle"),
            this.buildResultDetails(presentation.reasonKey, presentation.details),
            continueMatch,
            { primaryLabel: t("button.continue"), tone: resultTone }
          );
        }
      }
    });
  }

  private startMatchSimulationReturnTransition(): void {
    const transition = LINEOUT_BALANCE.match.visualSimulation.lineoutTransition;
    const duration = transition.lineoutExitDurationMs;
    const camera = this.cameras.main;
    const focus = this.getLineoutTransitionFocus(this.getLayout());
    const match = GameStore.getMatch();
    const pitchPositionMeters = this.transitionPitchPositionMeters
      ?? this.currentMatchLineout?.ballPositionMeters
      ?? match?.ballPositionMeters;
    const lateralPosition = this.transitionLateralPosition
      ?? match?.ballLateralPosition;

    this.input.enabled = false;
    camera.pan(focus.x, focus.y, duration, "Sine.easeInOut", true);
    camera.zoomTo(
      this.sceneCameraBaseZoom * transition.lineoutExitZoom,
      duration,
      "Cubic.easeInOut",
      true
    );
    const transitionData = {
      entryTransition: "from-lineout",
      transitionPitchPositionMeters: pitchPositionMeters,
      transitionLateralPosition: lateralPosition
    };
    const started = startSceneCrossfade(
      this,
      "MatchScene",
      transitionData,
      Math.max(duration, transition.simulationReturnDurationMs)
    );
    if (!started) this.scene.start("MatchScene", {});
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

  private setHookerIdleBreathingActive(active: boolean): void {
    this.hookerIdleBreathingActive = active;
    if (active) return;
    this.hookerSprite?.setVerticalCompressionPixels(0);
    if (this.hookerHeldBall && this.hookerHeldBallRestY !== undefined) {
      this.hookerHeldBall.y = this.hookerHeldBallRestY;
    }
  }

  private updateHookerIdleBreathing(time: number): void {
    if (
      !this.hookerIdleBreathingActive
      || !this.hookerIdleBreathingProfile
      || !this.hookerSprite
    ) return;
    const compressionPixels = getIdleBreathingCompressionPixels(
      time,
      this.hookerIdleBreathingProfile
    );
    this.hookerSprite.setVerticalCompressionPixels(compressionPixels);
    if (this.hookerHeldBall && this.hookerHeldBallRestY !== undefined) {
      this.hookerHeldBall.y = this.hookerHeldBallRestY + compressionPixels;
    }
  }

  private getUserDefensiveSelectionMode(position: LineoutPosition) {
    const assignments: LineoutAssignments = {};
    this.attackSlotPlayers.forEach((player, index) => {
      if (player) assignments[(index + 1) as LineoutPosition] = player;
    });
    return getDefensiveSelectionMode(assignments, position);
  }

  private resetSceneState(): void {
    this.restoreV3DynamicCamera();
    this.v3PreparationTweens.forEach((tween) => tween.stop());
    this.v3PreparationTweens = [];
    this.v3AttackingPreparationProgress = 0;
    this.v3DefendingPreparationProgress = 0;
    this.selectedTargetId = null;
    this.selectedTargetPosition = null;
    this.isResolving = false;
    this.currentMatchLineout = undefined;
    this.opponentDefensiveJumpPosition = null;
    this.opponentTargetId = null;
    this.opponentTargetPosition = null;
    this.opponentTargetOptionId = null;
    this.opponentCombination = null;
    this.armedDefensiveBlocks.clear();
    this.attackTokens = [];
    this.defenseTokens = [];
    this.attackSlotPlayers = [];
    this.defenseSlotPlayers = [];
    this.trainingAssignedPlayers = [];
    this.trainingActionOverlay?.destroy();
    this.trainingActionOverlay = undefined;
    this.trainingCombinationOverlay?.destroy();
    this.trainingCombinationOverlay = undefined;
    this.trainingSequenceBar?.destroy();
    this.trainingSequenceBar = undefined;
    this.trainingCombinationsButton = undefined;
    this.trainingChampionshipButton = undefined;
    this.dragState = null;
    this.inspectedPlayer = null;
    this.inspectorPanel = undefined;
    this.statusText = undefined;
    this.matchScoreOverlay = undefined;
    this.hookerSprite = undefined;
    this.hookerShadow = undefined;
    this.hookerHeldBall = undefined;
    this.hookerHeldBallRestY = undefined;
    this.hookerIdleBreathingProfile = undefined;
    this.hookerIdleBreathingActive = false;
    this.userSlotIndicators = [];
    this.v3Engine = undefined;
    this.v3BallSprite = undefined;
    this.v3BallShadow = undefined;
    this.v3ContactPlayerId = null;
    this.v3RetainedBallPose = null;
    this.v3ContestPlayerIds.clear();
    this.v3BallAttemptPlayerIds.clear();
    this.v3GroundRecoveryPlayerId = null;
    this.v3GroundRecoveryRunStarted = false;
    this.v3ContestStartedAtMs = null;
    this.v3ThrowGesture = null;
    this.destroyV3ThrowPowerGauge();
    this.v3OpponentCombinationStartsAtMs = null;
    this.v3OpponentThrowAtMs = null;
    this.v3AiJumpAtMs = null;
    this.v3ResolutionHandled = false;
    this.destroyV3GroupHandles();
    this.v3GroupDrag = null;
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
