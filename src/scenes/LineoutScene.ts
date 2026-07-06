import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import { buildDefensivePlan } from "../ai/DefenseAI";
import { getDivision } from "../rules/DivisionRules";
import { resolveLineout } from "../rules/LineoutResolver";
import { updateMatchAfterLineout } from "../rules/MatchSimulator";
import type { Combination, LineoutPosition } from "../models/Combination";
import type { FieldPlayer } from "../models/Player";
import { PlayerToken } from "../ui/PlayerToken";
import { UIButton } from "../ui/UIButton";
import { PlayerCard } from "../ui/PlayerCard";
import { UI } from "../ui/UITheme";
import { Modal } from "../ui/Modal";
import { t } from "../systems/I18n";

export type LineoutSceneData = {
  mode: "training" | "match";
};

export class LineoutScene extends Phaser.Scene {
  private mode: "training" | "match" = "training";
  private selectedCombination: Combination = DEFAULT_COMBINATIONS[0];
  private selectedTargetId: string | null = null;
  private attackTokens: PlayerToken[] = [];
  private defenseTokens: PlayerToken[] = [];
  private playerCard?: PlayerCard;

  constructor() {
    super("LineoutScene");
  }

  init(data: LineoutSceneData): void {
    this.mode = data.mode ?? "training";
  }

  create(): void {
    const save = GameStore.getSave();
    this.resetSceneState();
    this.selectedCombination = save.offensiveCombinations[0] ?? DEFAULT_COMBINATIONS[0];
    this.renderPitch();
    this.renderHeader();
    this.renderLineout(save.playerTeam.lineoutPlayers);
    this.renderCombinationButtons(save.offensiveCombinations);
    this.renderActions();
    this.bindInputHandlers();
  }

  private renderHeader(): void {
    this.add.text(195, 28, t("lineout.title"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 58, t("lineout.targetHint"), { font: UI.font.body, color: UI.colors.muted }).setOrigin(0.5);
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
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const defense = buildDefensivePlan(players, 7, division.opponentSkill);

    players.forEach((player, index) => {
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

  private renderCombinationButtons(combinations: Combination[]): void {
    combinations.forEach((combination, index) => {
      new UIButton(this, 92 + index * 135, 93, 125, 42, t(combination.nameKey), () => {
        this.selectedCombination = combination;
      });
    });
  }

  private renderActions(): void {
    new UIButton(this, 195, 790, 150, 44, t("button.throw"), () => this.throwLineout());
    new UIButton(this, 330, 790, 85, 44, t("button.back"), () => this.scene.start(this.mode === "match" ? "MatchScene" : "TrainingScene"));
  }

  private selectTarget(token: PlayerToken): void {
    this.selectedTargetId = token.player.id;
    this.attackTokens.forEach((item) => item.setSelected(item === token));
  }

  private throwLineout(): void {
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
      GameStore.setMatch(updated);
    }

    new Modal(this, t(`lineout.result.${result.displayedResult}`), t(result.explanationKey), () => {
      this.scene.start(this.mode === "match" ? "MatchScene" : "LineoutScene", { mode: this.mode });
    });
  }

  private positionY(position: LineoutPosition): number {
    return 145 + (position - 1) * 82;
  }

  private resetSceneState(): void {
    this.selectedTargetId = null;
    this.attackTokens = [];
    this.defenseTokens = [];
    this.playerCard?.destroy();
    this.playerCard = undefined;
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
}
