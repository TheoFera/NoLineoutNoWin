import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { buildDefensivePlan } from "../ai/DefenseAI";
import { getDivision } from "../rules/DivisionRules";
import { resolveDefensiveLineout } from "../rules/DefensiveLineoutResolver";
import { getDefensiveLineoutPlayers } from "../rules/DefenseSelection";
import { getAvailableOffensiveCombinations, getPlayersAssignedToCombination, getUnassignedCombinationPlayers, normalizeOffensiveCombinations, orderPlayersForCombination, replaceCombinationLayout } from "../rules/CombinationRules";
import { resolveLineout } from "../rules/LineoutResolver";
import { updateMatchAfterLineout } from "../rules/MatchSimulator";
import { addUsage } from "../rules/PlayerProgression";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { MatchLineoutEvent, MatchPlayerUsage } from "../models/Match";
import type { FieldPlayer } from "../models/Player";
import { PlayerToken } from "../ui/PlayerToken";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";

export type LineoutSceneData = {
  mode: "training" | "match";
  combinationId?: string;
};

type LineoutLayout = {
  attackX: number;
  defenseX?: number;
  hookerX: number;
  hookerY: number;
  fifteenLineY: number;
  touchLineY: number;
  slotStartY: number;
  slotGap: number;
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
  private attackTokens: PlayerToken[] = [];
  private defenseTokens: PlayerToken[] = [];
  private trainingAssignedPlayers: Array<FieldPlayer | null> = [];
  private isResolving = false;
  private defensivePlan?: ReturnType<typeof buildDefensivePlan>;
  private currentMatchLineout?: MatchLineoutEvent;
  private dragState: DragState | null = null;

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
      ? getAvailableOffensiveCombinations(this.allCombinations, division.offensiveCombinations)
      : this.allCombinations;

    this.selectedCombination = visibleCombinations.find((combination) => combination.id === this.selectedCombinationId)
      ?? visibleCombinations[0]
      ?? this.allCombinations[0];

    const layout = this.getLayout();
    this.renderBackground(layout);
    this.renderHeader(layout);
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
    this.add.rectangle(195, 422, 390, 844, this.mode === "training" ? 0x09131c : 0x060d14);
    this.renderPitchStripes(layout);
  }

  private renderPitchStripes(layout: LineoutLayout): void {
    const top = layout.fifteenLineY - 86;
    const bottom = layout.touchLineY + 118;
    const stripeHeight = Math.floor((bottom - top) / 8);

    for (let index = 0; index < 8; index += 1) {
      const y = top + index * stripeHeight + stripeHeight / 2;
      const color = index % 2 === 0 ? 0x517f1f : 0x5f8b27;
      this.add.rectangle(195, y, 390, stripeHeight + 2, color, 1);
    }
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

    this.add.rectangle(98, 74, 196, 148, 0x11335b, 0.98).setStrokeStyle(2, 0x27568a);
    this.add.rectangle(292, 74, 196, 148, 0x6a1f19, 0.98).setStrokeStyle(2, 0x8d342d);
    this.add.rectangle(195, 74, 92, 148, 0x09131c, 1).setStrokeStyle(2, 0x1f2937);

    this.add.text(72, 34, match.home.name.toUpperCase(), { font: "bold 16px Arial", color: UI.colors.text }).setOrigin(0, 0.5);
    this.add.text(72, 82, String(match.ourScore), { font: "bold 40px Arial", color: UI.colors.text }).setOrigin(0, 0.5);
    this.add.text(318, 34, match.away.name.toUpperCase(), { font: "bold 16px Arial", color: UI.colors.text }).setOrigin(1, 0.5);
    this.add.text(318, 82, String(match.opponentScore), { font: "bold 40px Arial", color: UI.colors.text }).setOrigin(1, 0.5);

    this.add.text(195, 58, this.formatMinute(minute), { font: "bold 28px Arial", color: "#fbbf24" }).setOrigin(0.5);
    this.add.text(195, 96, t(periodKey), { font: "bold 14px Arial", color: "#84cc16" }).setOrigin(0.5);
  }

  private renderMatchStats(layout: LineoutLayout): void {
    const match = GameStore.getMatch();
    if (!match) {
      return;
    }

    this.add.rectangle(101, 244, 142, 78, 0x07111a, 0.96).setStrokeStyle(2, 0x334155);
    this.add.rectangle(195, 244, 142, 78, 0x07111a, 0.96).setStrokeStyle(2, 0x334155);
    this.add.rectangle(289, 244, 142, 78, 0x07111a, 0.96).setStrokeStyle(2, 0x334155);

    this.add.text(101, 216, t("match.possession").toUpperCase(), { font: "bold 12px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(76, 246, `${match.possession}%`, { font: "bold 22px Arial", color: "#60a5fa" }).setOrigin(0.5);
    this.add.text(126, 246, `${100 - match.possession}%`, { font: "bold 22px Arial", color: "#ef4444" }).setOrigin(0.5);
    this.add.rectangle(101, 273, 92, 10, 0x1e293b);
    this.add.rectangle(101 - 46 + (92 * match.possession) / 200, 273, (92 * match.possession) / 100, 10, 0x2563eb).setOrigin(0, 0.5);
    this.add.rectangle(101 + (92 * match.possession) / 200, 273, (92 * (100 - match.possession)) / 100, 10, 0xdc2626).setOrigin(0, 0.5);

    this.add.text(195, 216, t("match.occupation").toUpperCase(), { font: "bold 12px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 246, `${match.occupation}%`, { font: "bold 22px Arial", color: "#84cc16" }).setOrigin(0.5);
    this.add.text(289, 216, t("match.zone").toUpperCase(), { font: "bold 12px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(289, 246, t(`match.zone.${this.currentMatchLineout?.pitchZone ?? "middle"}`), {
      font: "bold 16px Arial",
      color: "#f8fafc",
      align: "center",
      wordWrap: { width: 120 }
    }).setOrigin(0.5);
  }

  private renderPitch(layout: LineoutLayout): void {
    this.add.rectangle(195, layout.fifteenLineY, 344, 3, 0xffffff, 0.95);
    this.add.rectangle(195, layout.touchLineY, 344, 3, 0xffffff, 0.95);

    this.renderSlots(layout.attackX, 7, layout);
    if (layout.defenseX) {
      this.renderSlots(layout.defenseX, 7, layout);
    }

    for (let index = 1; index <= 7; index += 1) {
      this.add.text(layout.attackX - 44, this.positionY(index as LineoutPosition, layout), String(index), {
        font: "11px Arial",
        color: "#e5e7eb"
      }).setOrigin(0.5);
    }

    this.renderHooker(layout);
  }

  private renderSlots(x: number, count: number, layout: LineoutLayout): void {
    for (let index = 1; index <= count; index += 1) {
      this.add.rectangle(x, this.positionY(index as LineoutPosition, layout), 42, 42, 0xffffff, 0.04)
        .setStrokeStyle(2, 0xffffff, 0.5);
    }
  }

  private renderHooker(layout: LineoutLayout): void {
    const save = GameStore.getSave();
    this.add.ellipse(layout.hookerX, layout.hookerY, 40, 50, save.playerTeam.colors.primary, 1).setStrokeStyle(2, 0xffffff);
    this.add.text(layout.hookerX, layout.hookerY, String(save.playerTeam.hooker.number), {
      font: "bold 18px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
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

    this.trainingAssignedPlayers.forEach((player, index) => {
      if (!player) {
        return;
      }

      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.attackX, this.positionY(position, layout), player, GameStore.getSave().playerTeam.colors.primary);
      this.bindTrainingSlotToken(token, index);
    });

    const reservePlayers = getUnassignedCombinationPlayers(players, this.selectedCombination);
    reservePlayers.forEach((player, index) => {
      const token = new PlayerToken(this, this.reserveX(index, reservePlayers.length), layout.reserveY, player, GameStore.getSave().playerTeam.colors.primary);
      this.bindTrainingReserveToken(token);
    });
  }

  private renderOffensiveMatchLineout(players: FieldPlayer[], layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const orderedPlayers = orderPlayersForCombination(players, this.selectedCombination);

    orderedPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.attackX, this.positionY(position, layout), player, save.playerTeam.colors.primary);
      this.bindMatchAttackToken(token);
      this.attackTokens.push(token);
    });

    const defense = buildDefensivePlan(orderedPlayers, 7, division.opponentSkill);
    const match = GameStore.getMatch();
    const defenseColor = match?.away.colors.primary ?? UI.colors.defense;

    defense.selectedPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.defenseX ?? 250, this.positionY(position, layout), player, defenseColor);
      token.disableInteractive();
      this.defenseTokens.push(token);
    });
  }

  private renderDefensiveLineout(layout: LineoutLayout): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const division = getDivision(save.currentDivisionId);
    const numberOfPlayers = this.currentMatchLineout?.numberOfPlayers ?? 7;
    const selectedDefenders = getDefensiveLineoutPlayers(save.playerTeam, save.defensivePriority, save.defenseMemory, numberOfPlayers);
    const opponentPlayers = (match?.away.lineoutPlayers ?? []).slice(0, numberOfPlayers);
    this.defensivePlan = buildDefensivePlan(opponentPlayers, numberOfPlayers, division.opponentSkill);

    selectedDefenders.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.attackX, this.positionY(position, layout), player, save.playerTeam.colors.primary);
      this.bindMatchDefenseToken(token);
      this.attackTokens.push(token);
    });

    const opponentColor = match?.away.colors.primary ?? UI.colors.defense;
    opponentPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, layout.defenseX ?? 250, this.positionY(position, layout), player, opponentColor);
      token.disableInteractive();
      this.defenseTokens.push(token);
    });
  }

  private bindTrainingSlotToken(token: PlayerToken, slotIndex: number): void {
    token.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
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
      new UIButton(this, 195, layout.navigationY, 180, 40, t("button.back"), () => navigateTo(this, "MatchScene"));
      return;
    }

    new UIButton(this, 73, layout.navigationY, 110, 38, t("menu.team"), () => navigateTo(this, "TeamScene"));
    new UIButton(this, 195, layout.navigationY, 110, 38, t("button.combinations"), () => navigateTo(this, "CombinationListScene", { combinationId: this.selectedCombination.id }));
    new UIButton(this, 317, layout.navigationY, 110, 38, t("menu.championship"), () => navigateTo(this, "ChampionshipScene"));
  }

  private trackDrag(): void {
    if (!this.dragState) {
      return;
    }

    const { origin, pointer, token } = this.dragState;
    if (!pointer.isDown) {
      return;
    }

    if (!this.dragState.moved && Math.abs(pointer.y - this.dragState.startY) < 8) {
      return;
    }

    this.dragState.moved = true;
    const layout = this.getLayout();

    if (origin.kind === "training-slot" || origin.kind === "training-reserve") {
      token.x = Phaser.Math.Clamp(pointer.x, 28, 362);
      token.y = Phaser.Math.Clamp(pointer.y, 190, layout.navigationY - 24);
      return;
    }

    if (origin.kind === "match-defense") {
      const maxPosition = this.getCurrentLineoutSize();
      token.y = Phaser.Math.Clamp(pointer.y, this.positionY(1, layout), this.positionY(maxPosition as LineoutPosition, layout));
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
    const previousOrder = this.attackTokens.map((item) => item.player.id).join("|");
    const layout = this.getLayout();
    const nearest = this.nearestPosition(token.y, layout);
    token.y = this.positionY(nearest, layout);
    this.attackTokens.sort((left, right) => left.y - right.y);
    this.attackTokens.forEach((item, index) => {
      item.y = this.positionY((index + 1) as LineoutPosition, layout);
    });

    const nextOrder = this.attackTokens.map((item) => item.player.id).join("|");
    if (previousOrder !== nextOrder && this.currentMatchLineout) {
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.attackTokens.map((item) => item.player.id));
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

    this.isResolving = true;
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const pitchZone = match?.lineouts[match.currentLineoutIndex]?.pitchZone ?? "middle";
    const result = resolveLineout(
      {
        throwingSide: "us",
        pitchZone,
        numberOfPlayers: 7,
        hooker: save.playerTeam.hooker,
        attackingPlayers: this.attackTokens.map((token) => token.player),
        defendingPlayers: this.defenseTokens.map((token) => token.player),
        combination: this.selectedCombination,
        targetPlayerId: this.selectedTargetId ?? undefined
      },
      45
    );

    if (this.mode === "match" && match) {
      const updated = updateMatchAfterLineout(match, result.possessionDelta, result.occupationDelta);
      updated.lineouts[updated.currentLineoutIndex].resolved = true;
      updated.currentLineoutIndex += 1;
      updated.playerUsage = this.recordOffensiveUsage(updated.playerUsage, save.playerTeam.hooker.id);
      GameStore.setMatch(updated);
    }

    this.playThrowAnimation(() => {
      this.isResolving = false;
      new Modal(this, t(`lineout.result.${result.displayedResult}`), t(result.explanationKey), () => {
        this.scene.start("MatchScene");
      });
    });
  }

  private defendLineout(targetPlayerId?: string): void {
    if (this.isResolving || !this.defensivePlan) {
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
    const result = resolveDefensiveLineout(
      this.attackTokens.map((token) => token.player),
      this.selectedTargetId ?? undefined,
      this.defensivePlan.likelyJumpPosition,
      this.defensivePlan.pressure
    );

    if (match) {
      const updated = updateMatchAfterLineout(match, result.possessionDelta, result.occupationDelta);
      updated.lineouts[updated.currentLineoutIndex].resolved = true;
      updated.currentLineoutIndex += 1;
      updated.playerUsage = this.recordDefensiveUsage(updated.playerUsage);
      GameStore.setMatch(updated);
    }

    if (this.currentMatchLineout) {
      GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.attackTokens.map((token) => token.player.id));
    }

    this.playThrowAnimation(() => {
      this.isResolving = false;
      new Modal(this, t(`lineout.result.${result.displayedResult}`), t(result.explanationKey), () => {
        this.scene.start("MatchScene");
      });
    });
  }

  private playThrowAnimation(onComplete: () => void): void {
    const layout = this.getLayout();
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId) ?? this.attackTokens[3];
    const targetIndex = this.attackTokens.indexOf(targetToken);
    const supportTokens = this.attackTokens.filter((_token, index) => index === targetIndex - 1 || index === targetIndex + 1);
    const startX = layout.hookerX;
    const startY = layout.hookerY - 24;
    const targetX = targetToken?.x ?? layout.attackX;
    const targetY = (targetToken?.y ?? this.positionY(4, layout)) - 18;
    const ball = this.add.ellipse(startX, startY, 16, 24, 0xf8fafc).setStrokeStyle(2, 0x1d4ed8).setDepth(10);

    supportTokens.forEach((token) => {
      this.tweens.add({
        targets: token,
        y: token.y - 10,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    });

    if (targetToken) {
      this.tweens.add({
        targets: targetToken,
        y: targetToken.y - 28,
        duration: 220,
        yoyo: true,
        ease: "Sine.easeOut"
      });
    }

    this.tweens.add({
      targets: ball,
      x: targetX,
      y: targetY,
      angle: 18,
      duration: 320,
      ease: "Sine.easeOut",
      onComplete: () => {
        ball.destroy();
        this.time.delayedCall(120, onComplete);
      }
    });
  }

  private recordOffensiveUsage(usageMap: Record<string, MatchPlayerUsage>, hookerId: string): Record<string, MatchPlayerUsage> {
    let updated = addUsage(usageMap, hookerId, "throwing", 1);
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId);
    if (targetToken) {
      updated = addUsage(updated, targetToken.player.id, "jump", 1);
      updated = addUsage(updated, targetToken.player.id, "hands", 1);
    }

    const targetIndex = this.attackTokens.findIndex((token) => token.player.id === this.selectedTargetId);
    const supportTokens = this.attackTokens.filter((_token, index) => index === targetIndex - 1 || index === targetIndex + 1);
    for (const token of supportTokens) {
      updated = addUsage(updated, token.player.id, "lift", 1);
    }

    return updated;
  }

  private recordDefensiveUsage(usageMap: Record<string, MatchPlayerUsage>): Record<string, MatchPlayerUsage> {
    let updated = usageMap;
    const targetIndex = this.attackTokens.findIndex((token) => token.player.id === this.selectedTargetId);
    const targetToken = this.attackTokens[targetIndex];
    if (targetToken) {
      updated = addUsage(updated, targetToken.player.id, "jump", 1);
    }

    const supportTokens = this.attackTokens.filter((_token, index) => index === targetIndex - 1 || index === targetIndex + 1);
    for (const token of supportTokens) {
      updated = addUsage(updated, token.player.id, "lift", 1);
    }

    return updated;
  }

  private selectTarget(token: PlayerToken): void {
    this.selectedTargetId = token.player.id;
    this.attackTokens.forEach((item) => item.setSelected(item === token));
  }

  private findTrainingTargetSlot(x: number, y: number, layout: LineoutLayout): number | null {
    if (Math.abs(x - layout.attackX) > 44) {
      return null;
    }

    for (let index = 0; index < 7; index += 1) {
      const slotY = this.positionY((index + 1) as LineoutPosition, layout);
      if (Math.abs(y - slotY) <= 28) {
        return index;
      }
    }

    return null;
  }

  private isInTrainingReserveZone(_x: number, y: number, layout: LineoutLayout): boolean {
    return Math.abs(y - layout.reserveY) <= 34;
  }

  private reserveX(index: number, count: number): number {
    const spacing = 46;
    const startX = 195 - ((count - 1) * spacing) / 2;
    return startX + index * spacing;
  }

  private nearestPosition(y: number, layout: LineoutLayout): LineoutPosition {
    const rawPosition = Math.round((y - layout.slotStartY) / layout.slotGap) + 1;
    const maxPosition = this.getCurrentLineoutSize();
    return Phaser.Math.Clamp(rawPosition, 1, maxPosition) as LineoutPosition;
  }

  private getCurrentLineoutSize(): number {
    if (this.isDefensiveMatch()) {
      return this.currentMatchLineout?.numberOfPlayers ?? 7;
    }

    return 7;
  }

  private getLayout(): LineoutLayout {
    if (this.mode === "training") {
      return {
        attackX: 195,
        hookerX: 195,
        hookerY: 680,
        fifteenLineY: 238,
        touchLineY: 640,
        slotStartY: 280,
        slotGap: 48,
        reserveY: 762,
        navigationY: 804
      };
    }

    return {
      attackX: 140,
      defenseX: 250,
      hookerX: 195,
      hookerY: 754,
      fifteenLineY: 346,
      touchLineY: 702,
      slotStartY: 398,
      slotGap: 46,
      reserveY: 0,
      navigationY: 808
    };
  }

  private positionY(position: LineoutPosition, layout: LineoutLayout): number {
    return layout.slotStartY + (position - 1) * layout.slotGap;
  }

  private resetSceneState(): void {
    this.selectedTargetId = null;
    this.isResolving = false;
    this.defensivePlan = undefined;
    this.currentMatchLineout = undefined;
    this.attackTokens = [];
    this.defenseTokens = [];
    this.trainingAssignedPlayers = [];
    this.dragState = null;
  }

  private isDefensiveMatch(): boolean {
    return this.mode === "match" && this.currentMatchLineout?.throwingSide === "opponent";
  }

  private formatMinute(minute: number): string {
    const clampedMinute = Phaser.Math.Clamp(Math.round(minute), 0, 99);
    return `${String(clampedMinute).padStart(2, "0")}:00`;
  }
}
