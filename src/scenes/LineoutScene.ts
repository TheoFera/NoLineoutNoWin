import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { buildDefensivePlan } from "../ai/DefenseAI";
import { getDivision } from "../rules/DivisionRules";
import { resolveDefensiveLineout } from "../rules/DefensiveLineoutResolver";
import { getDefensiveLineoutPlayers } from "../rules/DefenseSelection";
import { resolveLineout } from "../rules/LineoutResolver";
import { updateMatchAfterLineout } from "../rules/MatchSimulator";
import { getAvailableOffensiveCombinations, normalizeOffensiveCombinations, orderPlayersForCombination, replaceCombinationLayout } from "../rules/CombinationRules";
import { addUsage } from "../rules/PlayerProgression";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { MatchLineoutEvent, MatchPlayerUsage } from "../models/Match";
import type { FieldPlayer } from "../models/Player";
import { PlayerToken } from "../ui/PlayerToken";
import { UIButton } from "../ui/UIButton";
import { PlayerCard } from "../ui/PlayerCard";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";

export type LineoutSceneData = {
  mode: "training" | "match";
  combinationId?: string;
};

export class LineoutScene extends Phaser.Scene {
  private mode: "training" | "match" = "training";
  private selectedCombinationId?: string;
  private selectedCombination!: Combination;
  private allCombinations: Combination[] = [];
  private selectedTargetId: string | null = null;
  private attackTokens: PlayerToken[] = [];
  private defenseTokens: PlayerToken[] = [];
  private playerCard?: PlayerCard;
  private isResolving = false;
  private defensivePlan?: ReturnType<typeof buildDefensivePlan>;
  private currentMatchLineout?: MatchLineoutEvent;

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
    this.currentMatchLineout = this.mode === "match" ? match?.lineouts[match.currentLineoutIndex] : undefined;
    this.allCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);
    const visibleCombinations = this.mode === "match"
      ? getAvailableOffensiveCombinations(this.allCombinations, division.offensiveCombinations)
      : this.allCombinations;

    this.resetSceneState();
    this.selectedCombination = visibleCombinations.find((combination) => combination.id === this.selectedCombinationId) ?? visibleCombinations[0];
    this.renderPitch();
    this.renderHeader();
    this.renderLineout(save.playerTeam.lineoutPlayers);
    this.renderCombinationButtons(visibleCombinations);
    this.renderActions();
    this.bindInputHandlers();
  }

  private renderHeader(): void {
    this.add.text(195, 28, t("lineout.title"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    const hintKey = this.isDefensiveMatch() ? "lineout.defenseHint" : this.mode === "training" ? "lineout.trainingHint" : "lineout.targetHint";
    this.add.text(195, 58, t(hintKey), { font: UI.font.body, color: UI.colors.muted, align: "center", wordWrap: { width: 360 } }).setOrigin(0.5);
  }

  private renderPitch(): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.pitch);
    const g = this.add.graphics();
    g.lineStyle(3, UI.colors.line, 1);
    g.lineBetween(76, 110, 76, 690);
    g.lineStyle(2, UI.colors.line, 0.8);
    for (let y = 110; y < 690; y += 24) {
      g.lineBetween(315, y, 315, y + 10);
    }
    this.add.text(78, 707, t("lineout.hookerLabel"), { font: UI.font.small, color: UI.colors.text }).setOrigin(0.5);
    this.add.ellipse(78, 735, 32, 42, UI.colors.attack).setStrokeStyle(2, UI.colors.line);
    this.add.text(78, 735, "2", { font: "bold 14px Arial", color: UI.colors.text }).setOrigin(0.5);

    for (let i = 1; i <= 7; i += 1) {
      const y = this.positionY(i as LineoutPosition);
      this.add.text(46, y, String(i), { font: UI.font.small, color: UI.colors.muted }).setOrigin(0.5);
    }
  }

  private renderLineout(players: FieldPlayer[]): void {
    if (this.isDefensiveMatch()) {
      this.renderDefensiveLineout();
      return;
    }

    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const orderedPlayers = orderPlayersForCombination(players, this.selectedCombination);
    const defense = buildDefensivePlan(orderedPlayers, 7, division.opponentSkill);

    orderedPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, 160, this.positionY(position), player, save.playerTeam.colors.primary);
      token.on("pointerup", () => this.selectTarget(token));
      token.on("pointerdown", () => {
        this.playerCard?.destroy();
        this.playerCard = new PlayerCard(this, 260, 735, player);
        this.time.delayedCall(1200, () => this.playerCard?.destroy());
      });
      this.attackTokens.push(token);
    });

    defense.selectedPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, 245, this.positionY(position), player, UI.colors.defense);
      token.disableInteractive();
      this.defenseTokens.push(token);
    });
  }

  private renderDefensiveLineout(): void {
    const save = GameStore.getSave();
    const match = GameStore.getMatch();
    const division = getDivision(save.currentDivisionId);
    const numberOfPlayers = this.currentMatchLineout?.numberOfPlayers ?? 7;
    const selectedDefenders = getDefensiveLineoutPlayers(save.playerTeam, save.defensivePriority, save.defenseMemory, numberOfPlayers);
    const opponentPlayers = (match?.away.lineoutPlayers ?? []).slice(0, numberOfPlayers);
    this.defensivePlan = buildDefensivePlan(opponentPlayers, numberOfPlayers, division.opponentSkill);

    selectedDefenders.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, 160, this.positionY(position), player, save.playerTeam.colors.primary);
      token.on("pointerup", () => this.selectTarget(token));
      this.attackTokens.push(token);
    });

    opponentPlayers.forEach((player, index) => {
      const position = (index + 1) as LineoutPosition;
      const token = new PlayerToken(this, 245, this.positionY(position), player, UI.colors.defense);
      token.disableInteractive();
      this.defenseTokens.push(token);
    });
  }

  private renderCombinationButtons(combinations: Combination[]): void {
    if (this.isDefensiveMatch()) {
      return;
    }

    combinations.forEach((combination, index) => {
      new UIButton(this, 92 + index * 135, 93, 125, 42, t(combination.nameKey), () => {
        this.scene.restart({ mode: this.mode, combinationId: combination.id });
      });
    });
  }

  private renderActions(): void {
    if (this.mode === "match") {
      new UIButton(this, 195, 742, 170, 44, this.isDefensiveMatch() ? t("button.defend") : t("button.throw"), () => {
        if (this.isDefensiveMatch()) {
          this.defendLineout();
          return;
        }

        this.throwLineout();
      });
      new UIButton(this, 195, 794, 170, 40, t("button.back"), () => navigateTo(this, "MatchScene"));
      return;
    }

    new UIButton(this, 118, 742, 140, 44, t("button.throw"), () => this.throwLineout());
    new UIButton(this, 272, 742, 140, 44, t("button.save"), () => this.saveCurrentCombination());
    new UIButton(this, 77, 794, 118, 40, t("menu.team"), () => navigateTo(this, "TeamScene"));
    new UIButton(this, 195, 794, 118, 40, t("match.title"), () => navigateTo(this, "MatchScene"));
    new UIButton(this, 313, 794, 118, 40, t("menu.championship"), () => navigateTo(this, "ChampionshipScene"));
  }

  private selectTarget(token: PlayerToken): void {
    this.selectedTargetId = token.player.id;
    this.attackTokens.forEach((item) => item.setSelected(item === token));
  }

  private throwLineout(): void {
    if (this.isResolving) {
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
        this.scene.start(this.mode === "match" ? "MatchScene" : "LineoutScene", { mode: this.mode, combinationId: this.selectedCombination.id });
      });
    });
  }

  private defendLineout(): void {
    if (this.isResolving || !this.defensivePlan) {
      return;
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

  private saveCurrentCombination(): void {
    const updatedCombinations = replaceCombinationLayout(
      this.allCombinations,
      this.selectedCombination.id,
      this.attackTokens.map((token) => token.player)
    );

    GameStore.setOffensiveCombinations(updatedCombinations);
    this.scene.restart({ mode: "training", combinationId: this.selectedCombination.id });
  }

  private positionY(position: LineoutPosition): number {
    return 145 + (position - 1) * 82;
  }

  private resetSceneState(): void {
    this.isResolving = false;
    this.defensivePlan = undefined;
    this.currentMatchLineout = undefined;
    this.selectedTargetId = null;
    this.attackTokens = [];
    this.defenseTokens = [];
    this.playerCard?.destroy();
    this.playerCard = undefined;
  }

  private playThrowAnimation(onComplete: () => void): void {
    const targetToken = this.attackTokens.find((token) => token.player.id === this.selectedTargetId) ?? this.attackTokens[3];
    const targetIndex = this.attackTokens.indexOf(targetToken);
    const supportTokens = this.attackTokens.filter((_token, index) => index === targetIndex - 1 || index === targetIndex + 1);
    const startX = 78;
    const startY = 735;
    const targetX = targetToken?.x ?? 160;
    const targetY = (targetToken?.y ?? this.positionY(4)) - 18;
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

  private bindInputHandlers(): void {
    this.input.off("drag", this.handleDrag, this);
    this.input.off("dragend", this.handleDragEnd, this);
    this.input.on("drag", this.handleDrag, this);
    this.input.on("dragend", this.handleDragEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("drag", this.handleDrag, this);
      this.input.off("dragend", this.handleDragEnd, this);
    });
  }

  private handleDrag(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, _dragX: number, dragY: number): void {
    if (gameObject instanceof PlayerToken) {
      gameObject.y = Phaser.Math.Clamp(dragY, this.positionY(1), this.positionY(7));
    }
  }

  private handleDragEnd(_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject): void {
    if (gameObject instanceof PlayerToken) {
      const nearest = this.nearestPosition(gameObject.y);
      gameObject.y = this.positionY(nearest);
      this.sortAttackTokensByY();

      if (this.isDefensiveMatch() && this.currentMatchLineout) {
        GameStore.setDefenseMemory(this.currentMatchLineout.numberOfPlayers, this.attackTokens.map((token) => token.player.id));
      }
    }
  }

  private nearestPosition(y: number): LineoutPosition {
    const position = Math.round((y - 145) / 82) + 1;
    return Phaser.Math.Clamp(position, 1, 7) as LineoutPosition;
  }

  private sortAttackTokensByY(): void {
    this.attackTokens.sort((a, b) => a.y - b.y);
    this.attackTokens.forEach((token, index) => {
      token.y = this.positionY((index + 1) as LineoutPosition);
    });
  }

  private isDefensiveMatch(): boolean {
    return this.mode === "match" && this.currentMatchLineout?.throwingSide === "opponent";
  }
}
