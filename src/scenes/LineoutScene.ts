import Phaser from "phaser";
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
import { getDefensiveLineoutPlayers } from "../rules/DefenseSelection";
import {
  countAssignedPlayers,
  findCombinationTargetOption,
  getActiveOffensiveCombinations,
  getCombinationTargetPositions,
  getPlayersAssignedToCombination,
  getUnassignedCombinationPlayers,
  normalizeOffensiveCombinations,
  replaceCombinationLayout
} from "../rules/CombinationRules";
import { resolveLineout } from "../rules/LineoutResolver";
import { buildLineoutResultPresentation, type LineoutResultDetail } from "../rules/LineoutResultPresentation";
import { applyLineoutResolutionToMatch } from "../rules/MatchSimulator";
import { addUsage } from "../rules/PlayerProgression";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { LineoutResult } from "../models/Lineout";
import type { MatchLineoutEvent, MatchPlayerUsage, MatchStateData } from "../models/Match";
import { isLikelyJumper, isLikelyLifter } from "../models/Player";
import type { FieldPlayer } from "../models/Player";
import { PlayerToken } from "../ui/PlayerToken";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import { getBodyShapeForPlayer } from "../ui/RugbyPlayerTypes";
import type { Kit, PoseName } from "../ui/RugbyPlayerTypes";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { MATH_RANDOM_SOURCE } from "../utils/Random";

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const HEADER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.2);
const FIELD_TOP = HEADER_HEIGHT;
const FIELD_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT;
const PLAYER_FIELD_WIDTH_RATIO = 0.1;
const PLAYER_FIELD_HEIGHT_RATIO = 0.13;
const PLAYER_DEPTH_BASE = 100;
const PLAYER_LABEL_DEPTH_OFFSET = 0.1;
const PLAYER_HITBOX_DEPTH_OFFSET = 0.2;
const RUGBY_DASH_WIDTH = 18;
const RUGBY_DASH_GAP = 12;

export type LineoutSceneData = {
  mode: "training" | "match";
  combinationId?: string;
};

type LineoutLayout = {
  headerHeight: number;
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
  startY: number;
  moved: boolean;
  homeX: number;
  homeY: number;
};

export class LineoutScene extends Phaser.Scene {
  private mode: "training" | "match" = "training";
  private selectedCombinationId?: string;
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
  private inspectorNameText?: Phaser.GameObjects.Text;
  private inspectorStatsText?: Phaser.GameObjects.Text;
  private inspectorRoleText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private statusClearTimer?: Phaser.Time.TimerEvent;
  private hookerSprite?: RugbyPlayer;
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
      : this.allCombinations;

    this.selectedCombination = visibleCombinations.find((combination) => combination.id === this.selectedCombinationId)
      ?? visibleCombinations[0]
      ?? this.allCombinations[0];

    this.primeSlotOccupancy(save.playerTeam.lineoutPlayers);
    const layout = this.getLayout();
    this.renderBackground(layout);
    this.renderHeader(layout);
    this.renderPlayerInspector(layout);
    this.renderPitch(layout);
    this.renderLineout(save.playerTeam.lineoutPlayers, layout);
    this.renderActions(layout);
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

  private renderHeader(layout: LineoutLayout): void {
    if (this.mode !== "training") {
      this.renderMatchScoreboard();
      this.renderMatchStats(layout);
    }
  }

  private renderMatchScoreboard(): void {
    const match = GameStore.getMatch();
    if (!match) {
      return;
    }

    const minute = this.currentMatchLineout?.minute ?? match.minute;
    const periodKey = minute < 40 ? "match.period.firstHalf" : "match.period.secondHalf";

    this.add.rectangle(98, 42, 196, 76, 0x11335b, 0.98).setStrokeStyle(2, 0x27568a);
    this.add.rectangle(292, 42, 196, 76, 0x6a1f19, 0.98).setStrokeStyle(2, 0x8d342d);
    this.add.rectangle(195, 42, 86, 76, 0x09131c, 1).setStrokeStyle(2, 0x1f2937);

    this.add.text(72, 20, match.home.name.toUpperCase(), {
      font: "bold 11px Arial",
      color: UI.colors.text,
      wordWrap: { width: 105 }
    }).setOrigin(0, 0.5);
    this.add.text(72, 55, String(match.ourScore), { font: "bold 28px Arial", color: UI.colors.text }).setOrigin(0, 0.5);
    this.add.text(318, 20, match.away.name.toUpperCase(), {
      font: "bold 11px Arial",
      color: UI.colors.text,
      align: "right",
      wordWrap: { width: 105 }
    }).setOrigin(1, 0.5);
    this.add.text(318, 55, String(match.opponentScore), { font: "bold 28px Arial", color: UI.colors.text }).setOrigin(1, 0.5);

    this.add.text(195, 34, this.formatMinute(minute), { font: "bold 22px Arial", color: "#fbbf24" }).setOrigin(0.5);
    this.add.text(195, 62, t(periodKey), { font: "bold 11px Arial", color: "#84cc16" }).setOrigin(0.5);
  }

  private renderMatchStats(layout: LineoutLayout): void {
    const match = GameStore.getMatch();
    if (!match) {
      return;
    }
    const roundedPossession = Math.round(match.possession);
    const roundedOccupation = Math.round(match.occupation);

    this.add.rectangle(78, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);
    this.add.rectangle(195, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);
    this.add.rectangle(312, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);

    this.add.text(78, 96, t("match.possession").toUpperCase(), { font: "bold 9px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(54, 114, `${roundedPossession}%`, { font: "bold 15px Arial", color: "#60a5fa" }).setOrigin(0.5);
    this.add.text(102, 114, `${100 - roundedPossession}%`, { font: "bold 15px Arial", color: "#ef4444" }).setOrigin(0.5);
    this.add.rectangle(78, 130, 82, 6, 0x1e293b);
    this.add.rectangle(78 - 41 + (82 * match.possession) / 200, 130, (82 * match.possession) / 100, 5, 0x2563eb).setOrigin(0, 0.5);
    this.add.rectangle(78 + (82 * match.possession) / 200, 130, (82 * (100 - match.possession)) / 100, 5, 0xdc2626).setOrigin(0, 0.5);

    this.add.text(195, 96, t("match.occupation").toUpperCase(), { font: "bold 9px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 118, `${roundedOccupation}%`, { font: "bold 18px Arial", color: "#84cc16" }).setOrigin(0.5);
    this.add.text(312, 96, t("match.zone").toUpperCase(), { font: "bold 9px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(312, 118, t(`match.zone.${this.currentMatchLineout?.pitchZone ?? "middle"}`), {
      font: "bold 12px Arial",
      color: "#f8fafc",
      align: "center",
      wordWrap: { width: 92 }
    }).setOrigin(0.5);
  }

  private renderPlayerInspector(layout: LineoutLayout): void {
    const panelY = this.mode === "training" ? 92 : 153;
    const panelHeight = this.mode === "training" ? 98 : 28;

    this.add.rectangle(195, panelY, 344, panelHeight, 0x07111a, 0.94).setStrokeStyle(2, 0x334155);
    this.inspectorNameText = this.add.text(28, panelY - (this.mode === "training" ? 26 : 7), t("lineout.playerPanel.empty"), {
      font: this.mode === "training" ? "bold 18px Arial" : "bold 11px Arial",
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.inspectorRoleText = this.add.text(28, panelY + 2, "", {
      font: this.mode === "training" ? "bold 12px Arial" : "bold 9px Arial",
      color: "#fde68a"
    }).setOrigin(0, 0.5);
    this.inspectorStatsText = this.add.text(28, panelY + (this.mode === "training" ? 28 : 10), "", {
      font: this.mode === "training" ? "12px Arial" : "9px Arial",
      color: UI.colors.muted
    }).setOrigin(0, 0.5);
    this.statusText = this.add.text(195, this.mode === "training" ? panelY + 44 : layout.fieldTop + 18, "", {
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

    this.renderSlots(layout.attackX, 7, layout, this.attackSlotPlayers);
    if (layout.defenseX) {
      this.renderSlots(layout.defenseX, 7, layout, this.defenseSlotPlayers);
    }

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

  private renderSlots(x: number, count: number, layout: LineoutLayout, occupiedSlots: Array<FieldPlayer | null> = []): void {
    const slotWidth = layout.playerWidth + 18;
    const slotHeight = Math.round(slotWidth * 0.72);
    const slotBottomOffset = 5;

    for (let index = 1; index <= count; index += 1) {
      if (occupiedSlots[index - 1]) {
        continue;
      }

      this.add.rectangle(
        x,
        this.positionY(index as LineoutPosition, layout) + slotBottomOffset - slotHeight / 2,
        slotWidth,
        slotHeight,
        0xffffff,
        0.04
      )
        .setStrokeStyle(2, 0xffffff, 0.5);
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
    const hookerFeetY = layout.hookerY + 34;
    const hookerKit = this.getLineoutKit(hookerSide);

    this.hookerSprite = new RugbyPlayer(
      this,
      hookerX,
      hookerFeetY,
      "hooker_ready_back",
      hookerKit,
      getBodyShapeForPlayer(isOpponentThrow ? match?.away.hooker ?? save.playerTeam.hooker : save.playerTeam.hooker)
    ).setVisualSize(layout.playerWidth, layout.playerHeight);
    this.hookerSprite.setKit(hookerKit);

    const hookerText = this.add.text(hookerX, hookerFeetY - 28, String(hookerNumber), {
      font: "bold 18px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    const hookerDepth = this.getPlayerDepth(hookerFeetY);
    this.hookerSprite.setDepth(hookerDepth);
    hookerText.setDepth(hookerDepth + PLAYER_LABEL_DEPTH_OFFSET);

    if (this.mode !== "training") {
      return;
    }

    const hitbox = this.add.zone(
      hookerX - layout.playerWidth / 2 - 6,
      hookerFeetY - layout.playerHeight,
      layout.playerWidth + 12,
      layout.playerHeight + 8
    ).setOrigin(0);
    hitbox.setInteractive({ useHandCursor: true });
    hitbox.on("pointerdown", () => {
      this.showHookerInspector();
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
          bodyShape: getBodyShapeForPlayer(player),
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
          bodyShape: getBodyShapeForPlayer(player),
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      this.syncPlayerTokenDepth(token);
      this.bindTrainingReserveToken(token);
    });

    this.setInspectedPlayer(
      this.trainingAssignedPlayers.find((player): player is FieldPlayer => player !== null)
      ?? reservePlayers[0]
      ?? null
    );
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
          bodyShape: getBodyShapeForPlayer(player),
          displayWidth: layout.playerWidth,
          displayHeight: layout.playerHeight
        }
      );
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.bindMatchAttackToken(token);
      this.attackTokens.push(token);
    });
    this.markOffensiveTargets();

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
        bodyShape: getBodyShapeForPlayer(player),
        displayWidth: layout.playerWidth,
        displayHeight: layout.playerHeight
      });
      token.disableInteractive();
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.defenseTokens.push(token);
    });

    this.setInspectedPlayer(this.attackSlotPlayers.find((player): player is FieldPlayer => player !== null) ?? null);
  }

  private renderDefensiveLineout(layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const numberOfPlayers = this.currentMatchLineout?.numberOfPlayers ?? 7;
    const selectedDefenders = getDefensiveLineoutPlayers(save.playerTeam, save.defensivePriority, save.defenseMemory, numberOfPlayers);
    this.attackSlotPlayers = this.createSpreadSlots(selectedDefenders, numberOfPlayers);

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
          bodyShape: getBodyShapeForPlayer(player),
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
      const token = new PlayerToken(this, layout.defenseX ?? 250, this.positionY(position, layout), player, opponentColor, {
        pose: this.getLineoutPose("opponent"),
        kit: this.getLineoutKit("opponent"),
        bodyShape: getBodyShapeForPlayer(player),
        displayWidth: layout.playerWidth,
        displayHeight: layout.playerHeight
      });
      token.disableInteractive();
      token.setData("lineoutPosition", position);
      this.syncPlayerTokenDepth(token);
      this.defenseTokens.push(token);
    });

    this.setInspectedPlayer(this.attackSlotPlayers.find((player): player is FieldPlayer => player !== null) ?? null);
  }

  private bindTrainingSlotToken(token: PlayerToken, slotIndex: number): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "training-slot", slotIndex },
        pointer,
        token,
        startY: pointer.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindTrainingReserveToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "training-reserve" },
        pointer,
        token,
        startY: pointer.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindMatchAttackToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "match-attack" },
        pointer,
        token,
        startY: pointer.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private bindMatchDefenseToken(token: PlayerToken): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.setInspectedPlayer(token.player);
      this.dragState = {
        origin: { kind: "match-defense" },
        pointer,
        token,
        startY: pointer.y,
        moved: false,
        homeX: token.x,
        homeY: token.y
      };
    });
  }

  private renderActions(layout: LineoutLayout): void {
    if (this.mode === "match") {
      new UIButton(this, 195, layout.navigationY, 180, 40, t("button.back"), () => navigateTo(this, "MatchScene"), {
        variant: "secondary"
      });
      return;
    }

    new UIButton(this, 103, layout.navigationY, 164, 44, t("button.combinations"), () => navigateTo(this, "CombinationListScene", { combinationId: this.selectedCombination.id }));
    new UIButton(this, 287, layout.navigationY, 164, 44, t("menu.championship"), () => navigateTo(this, "ChampionshipScene"), {
      variant: "secondary"
    });
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

    const movement = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
    if (!this.dragState.moved && movement < 10) {
      return;
    }

    this.dragState.moved = true;
    const layout = this.getLayout();

    if (origin.kind === "training-slot" || origin.kind === "training-reserve") {
      token.x = Phaser.Math.Clamp(pointer.x, 28, 362);
      token.y = Phaser.Math.Clamp(pointer.y, layout.fieldTop + layout.playerHeight - 4, layout.navigationY - 32);
      this.syncPlayerTokenDepth(token);
      return;
    }

    if (origin.kind === "match-defense") {
      const minY = Math.min(this.positionY(1, layout), this.positionY(7, layout));
      const maxY = Math.max(this.positionY(1, layout), this.positionY(7, layout));
      token.y = Phaser.Math.Clamp(pointer.y, minY, maxY);
      this.syncPlayerTokenDepth(token);
    }
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
      this.throwLineout(drag.token.player.id);
      return;
    }

    if (drag.origin.kind === "match-defense") {
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
    const previousOrder = this.getDefenseMemoryPlayerIds().join("|");
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
    const nextOrder = this.getDefenseMemoryPlayerIds().join("|");
    if (previousOrder !== nextOrder && this.currentMatchLineout) {
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.getDefenseMemoryPlayerIds());
    }
  }

  private persistTrainingAssignments(assignments: Array<FieldPlayer | null>): void {
    const updatedCombinations = replaceCombinationLayout(this.allCombinations, this.selectedCombination.id, assignments);
    GameStore.setOffensiveCombinations(updatedCombinations);
    this.scene.restart({ mode: "training", combinationId: this.selectedCombination.id });
  }

  private throwLineout(targetPlayerId?: string): void {
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
    if (!targetToken || !this.findSelectedTargetOption()) {
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

    this.playThrowAnimation("us", this.selectedTargetPosition ?? 4, this.attackTokens, () => {
      this.isResolving = false;
      this.showResult(result);
    });
  }

  private defendLineout(targetPlayerId?: string): void {
    if (this.isResolving) {
      return;
    }

    if (targetPlayerId) {
      const targetToken = this.attackTokens.find((token) => token.player.id === targetPlayerId);
      if (targetToken) {
        this.selectTarget(targetToken);
      }
    }

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
    updated.playerUsage = this.recordDefensiveUsage(updated.playerUsage);
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
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.getDefenseMemoryPlayerIds());
    }

    this.playThrowAnimation("opponent", this.opponentTargetPosition ?? 4, this.defenseTokens, () => {
      this.isResolving = false;
      this.showResult(result);
    });
  }

  private playThrowAnimation(
    throwingSide: "us" | "opponent",
    targetPosition: LineoutPosition,
    lineTokens: PlayerToken[],
    onComplete: () => void
  ): void {
    const layout = this.getLayout();
    const targetToken = lineTokens.find((token) => (token.getData("lineoutPosition") as LineoutPosition | undefined) === targetPosition)
      ?? lineTokens[0];
    const supportTokens = lineTokens.filter((token) => {
      const position = token.getData("lineoutPosition") as LineoutPosition | undefined;
      return position === targetPosition - 1 || position === targetPosition + 1;
    });
    const startX = this.getHookerX(throwingSide, layout);
    const startY = layout.hookerY - 24;
    const targetX = targetToken?.x ?? layout.attackX;
    const targetY = (targetToken?.y ?? this.positionY(4, layout)) - 18;
    const strokeColor = throwingSide === "us" ? 0x1d4ed8 : UI.colors.defense;
    const ball = this.add.ellipse(startX, startY, 16, 24, 0xf8fafc).setStrokeStyle(2, strokeColor);
    ball.setDepth(this.getPlayerDepth(startY) + PLAYER_LABEL_DEPTH_OFFSET);
    const supportPose = throwingSide === "us" ? "lifter_front" : "lifter_back";
    const targetPose = throwingSide === "us" ? "jumper_catch_front" : this.getLineoutPose("opponent");

    // On change juste quelques poses le temps du lancer pour garder l'animation tres simple.
    this.hookerSprite?.setPose("hooker_throw_back");
    supportTokens.forEach((token) => {
      token.setPose(supportPose);
    });
    targetToken?.setPose(targetPose);

    supportTokens.forEach((token) => {
      this.tweens.add({
        targets: token,
        y: token.y - 10,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          this.syncPlayerTokenDepth(token);
        }
      });
    });

    if (targetToken) {
      this.tweens.add({
        targets: targetToken,
        y: targetToken.y - 28,
        duration: 220,
        yoyo: true,
        ease: "Sine.easeOut",
        onUpdate: () => {
          this.syncPlayerTokenDepth(targetToken);
        }
      });
    }

    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY,
      angle: 18,
      duration: 320,
      ease: "Sine.easeOut",
      onUpdate: () => {
        ball.setDepth(this.getPlayerDepth(ball.y) + PLAYER_LABEL_DEPTH_OFFSET);
      },
      onComplete: () => {
        ball.destroy();
        this.hookerSprite?.setPose("hooker_ready_back");
        supportTokens.forEach((token) => {
          token.resetPose();
        });
        targetToken?.resetPose();
        this.time.delayedCall(120, onComplete);
      }
    });
  }

  private getHookerX(throwingSide: "us" | "opponent", layout: LineoutLayout): number {
    if (this.mode === "training") {
      return layout.hookerX;
    }

    return layout.hookerX;
  }

  private getLineoutPose(side: "us" | "opponent"): PoseName {
    return side === "us" ? "stand_front" : "stand_back";
  }

  private getLineoutKit(side: "us" | "opponent"): Kit {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const jerseyPrimary = side === "us"
      ? save.playerTeam.colors.primary
      : (match?.away.colors.primary ?? UI.colors.defense);
    const secondaryColor = side === "us"
      ? save.playerTeam.colors.secondary
      : (match?.away.colors.secondary ?? jerseyPrimary);

    return {
      jerseyPrimary,
      shortsPrimary: secondaryColor,
      socksPrimary: jerseyPrimary,
      detailsSecondary: secondaryColor
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

  private recordDefensiveUsage(usageMap: Record<string, MatchPlayerUsage>): Record<string, MatchPlayerUsage> {
    let updated = usageMap;
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId);
    if (targetToken) {
      updated = addUsage(updated, targetToken.player.id, "jump", 1);
    }

    for (const player of this.getSupportPlayersAroundTarget()) {
      updated = addUsage(updated, player.id, "lift", 1);
    }

    return updated;
  }

  private selectTarget(token: PlayerToken): void {
    this.selectedTargetId = token.player.id;
    this.selectedTargetPosition = (token.getData("lineoutPosition") as LineoutPosition | undefined) ?? null;
    this.setInspectedPlayer(token.player);
    this.attackTokens.forEach((item) => item.setSelected(item === token));
  }

  private setInspectedPlayer(player: FieldPlayer | null): void {
    this.inspectedPlayer = player;
    this.refreshPlayerInspector();
  }

  private showHookerInspector(): void {
    const hooker = GameStore.getSave().playerTeam.hooker;

    this.inspectedPlayer = null;
    this.inspectorNameText?.setText(`${t("team.numberPrefix")}${hooker.number} - ${hooker.nickname}`);
    this.inspectorRoleText?.setText(t("lineout.hookerLabel"));
    this.inspectorStatsText?.setText(`${t("team.throwing")} ${hooker.throwing}`);
  }

  private refreshPlayerInspector(): void {
    if (!this.inspectorNameText || !this.inspectorStatsText || !this.inspectorRoleText) {
      return;
    }

    if (!this.inspectedPlayer) {
      this.inspectorNameText.setText(t("lineout.playerPanel.empty"));
      this.inspectorRoleText.setText("");
      this.inspectorStatsText.setText("");
      return;
    }

    const roles: string[] = [];
    if (isLikelyJumper(this.inspectedPlayer)) {
      roles.push(t("lineout.role.jumper"));
    }
    if (isLikelyLifter(this.inspectedPlayer)) {
      roles.push(t("lineout.role.lifter"));
    }

    this.inspectorNameText.setText(`${t("team.numberPrefix")}${this.inspectedPlayer.number} - ${this.inspectedPlayer.nickname}`);
    this.inspectorRoleText.setText(roles.join(" · "));
    this.inspectorStatsText.setText(
      `${t("team.stat.jump")} ${this.inspectedPlayer.jump} · `
      + `${t("team.stat.lift")} ${this.inspectedPlayer.lift} · `
      + `${t("team.stat.hands")} ${this.inspectedPlayer.hands}`
    );
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

  private getDefenseMemoryPlayerIds(): string[] {
    return this.attackSlotPlayers
      .filter((player): player is FieldPlayer => player !== null)
      .map((player) => player.id);
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
      const selectedDefenders = getDefensiveLineoutPlayers(save.playerTeam, save.defensivePriority, save.defenseMemory, numberOfPlayers);
      this.attackSlotPlayers = this.createSpreadSlots(selectedDefenders, numberOfPlayers);
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
    const decision = chooseAiOffensiveLineout({
      combinations: match.away.offensiveCombinations,
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
    const reserveTop = this.reservePositionY(0, layout) - layout.playerHeight / 2;
    const reserveBottom = this.reservePositionY(6, layout) + layout.playerHeight / 2;

    return Math.abs(x - layout.reserveX) <= layout.playerWidth
      && y >= reserveTop
      && y <= reserveBottom;
  }

  private reservePositionY(index: number, layout: LineoutLayout): number {
    return layout.reserveY + index * layout.slotGap;
  }

  private nearestPosition(y: number, layout: LineoutLayout): LineoutPosition {
    const rawPosition = Math.round((layout.slotStartY - y) / layout.slotGap) + 1;
    const maxPosition = this.getCurrentLineoutSize();
    return Phaser.Math.Clamp(rawPosition, 1, maxPosition) as LineoutPosition;
  }

  private markOffensiveTargets(): void {
    const positions = new Set(getCombinationTargetPositions(this.selectedCombination));
    this.attackTokens.forEach((token) => {
      const position = token.getData("lineoutPosition") as LineoutPosition | undefined;
      token.setTargetable(position !== undefined && positions.has(position));
    });
  }

  private showResult(result: LineoutResult): void {
    const presentation = buildLineoutResultPresentation(result);
    const continueMatch = () => this.scene.start("MatchScene");
    new Modal(this, t(presentation.titleKey), t(presentation.summaryKey), continueMatch, {
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
    const common = {
      headerHeight: HEADER_HEIGHT,
      fieldTop: FIELD_TOP,
      fieldBottom: SCREEN_HEIGHT,
      fieldWidth: SCREEN_WIDTH,
      fieldHeight: FIELD_HEIGHT,
      playerWidth: Math.round(SCREEN_WIDTH * PLAYER_FIELD_WIDTH_RATIO),
      playerHeight: Math.round(FIELD_HEIGHT * PLAYER_FIELD_HEIGHT_RATIO)
    };
    const slotRectHalfHeight = (common.playerHeight + 8) / 2;
    const slotBottomOffset = 4;
    const topSlotLift = 10;

    if (this.mode === "training") {
      const fifteenLineY = FIELD_TOP + 56;
      const fiveMeterLineY = SCREEN_HEIGHT - 196;
      const slotStartY = SCREEN_HEIGHT - 202 - slotBottomOffset;
      const topSlotTargetY = fifteenLineY - topSlotLift + slotRectHalfHeight;
      const slotGap = Math.round((slotStartY - topSlotTargetY) / 6);
      const reserveY = slotStartY - slotGap * 6;

      return {
        ...common,
        attackX: 195,
        reserveX: 292,
        hookerX: 195,
        hookerY: 744,
        fifteenLineY,
        fiveMeterLineY,
        touchLineY: SCREEN_HEIGHT - 82,
        slotStartY,
        slotGap,
        reserveY,
        navigationY: SCREEN_HEIGHT - 36
      };
    }

    const fifteenLineY = FIELD_TOP + 70;
    const fiveMeterLineY = SCREEN_HEIGHT - 196;
    const slotStartY = SCREEN_HEIGHT - 202 - slotBottomOffset;
    const topSlotTargetY = fifteenLineY - topSlotLift + slotRectHalfHeight;
    const slotGap = Math.round((slotStartY - topSlotTargetY) / 6);

    return {
      ...common,
      attackX: 140,
      defenseX: 250,
      reserveX: 0,
      hookerX: 195,
      hookerY: 744,
      fifteenLineY,
      fiveMeterLineY,
      touchLineY: SCREEN_HEIGHT - 82,
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
    this.hookerSprite = undefined;
    this.statusClearTimer?.remove(false);
    this.statusClearTimer = undefined;
  }

  private isDefensiveMatch(): boolean {
    return this.mode === "match" && this.currentMatchLineout?.throwingSide === "opponent";
  }

  private formatMinute(minute: number): string {
    const clampedMinute = Phaser.Math.Clamp(Math.round(minute), 0, 99);
    return `${String(clampedMinute).padStart(2, "0")}:00`;
  }
}
