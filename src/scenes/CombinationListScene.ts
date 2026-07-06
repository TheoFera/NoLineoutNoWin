import Phaser from "phaser";
import type { Combination } from "../models/Combination";
import { getDivision } from "../rules/DivisionRules";
import { getAvailableOffensiveCombinations, getCombinationDisplayName, normalizeOffensiveCombinations, renameCombination } from "../rules/CombinationRules";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

type CombinationListSceneData = {
  combinationId?: string;
};

export class CombinationListScene extends Phaser.Scene {
  private selectedCombinationId?: string;
  private nameInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;

  constructor() {
    super("CombinationListScene");
  }

  init(data: CombinationListSceneData): void {
    this.selectedCombinationId = data.combinationId;
  }

  create(): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const combinations = getAvailableOffensiveCombinations(
      normalizeOffensiveCombinations(save.offensiveCombinations),
      division.offensiveCombinations
    );
    const fallbackCombinationId = combinations[0]?.id;
    this.selectedCombinationId ??= fallbackCombinationId;

    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 84, t("lineout.combinationsTitle"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);

    combinations.forEach((combination, index) => {
      this.renderCombinationRow(combination, index);
    });

    new UIButton(this, 195, 792, 220, 42, t("button.back"), () => {
      navigateTo(this, "LineoutScene", { mode: "training", combinationId: this.selectedCombinationId ?? fallbackCombinationId });
    });

    this.events.once("shutdown", () => this.destroyNameInput());
    this.events.once("destroy", () => this.destroyNameInput());
  }

  private renderCombinationRow(combination: Combination, index: number): void {
    const y = 184 + index * 104;
    const isSelected = combination.id === this.selectedCombinationId;

    this.add.rectangle(195, y, 334, 84, UI.colors.panelDark, 0.96)
      .setStrokeStyle(2, isSelected ? UI.colors.accent : UI.colors.line);

    new UIButton(this, 145, y, 196, 42, getCombinationDisplayName(combination, t), () => {
      navigateTo(this, "LineoutScene", { mode: "training", combinationId: combination.id });
    });

    new UIButton(this, 292, y, 96, 42, t("button.rename"), () => {
      this.openRenameOverlay(combination);
    });
  }

  private openRenameOverlay(combination: Combination): void {
    this.destroyNameInput();

    const overlay = this.add.rectangle(195, 422, 390, 844, 0x020617, 0.55).setDepth(20);
    const panel = this.add.rectangle(195, 520, 320, 210, 0x07111a, 0.98).setStrokeStyle(2, UI.colors.accent).setDepth(21);
    const title = this.add.text(195, 452, t("lineout.renameTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 260 }
    }).setOrigin(0.5).setDepth(22);

    const saveButton = new UIButton(this, 136, 590, 126, 40, t("button.rename"), () => {
      this.applyRename(combination.id);
    });
    saveButton.setDepth(22);

    const closeButton = new UIButton(this, 254, 590, 126, 40, t("button.close"), () => {
      this.destroyNameInput();
      this.scene.restart({ combinationId: this.selectedCombinationId });
    });
    closeButton.setDepth(22);

    overlay.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.destroyNameInput();
      this.scene.restart({ combinationId: this.selectedCombinationId });
    });

    this.createNameInput(getCombinationDisplayName(combination, t), combination.id);
  }

  private createNameInput(initialValue: string, combinationId: string): void {
    const parent = this.game.canvas.parentElement ?? document.body;
    const input = document.createElement("input");

    input.type = "text";
    input.maxLength = 24;
    input.value = initialValue;
    input.placeholder = t("lineout.renamePlaceholder");
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.setAttribute("aria-label", t("lineout.renameTitle"));
    input.style.position = "fixed";
    input.style.zIndex = "20";
    input.style.border = "2px solid #facc15";
    input.style.borderRadius = "14px";
    input.style.padding = "0 14px";
    input.style.background = "#f8fafc";
    input.style.color = "#10271b";
    input.style.boxSizing = "border-box";
    input.style.outline = "none";

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.applyRename(combinationId);
      }
    });

    parent.appendChild(input);
    this.nameInput = input;
    this.positionInputHandler = () => this.positionNameInput();

    window.addEventListener("resize", this.positionInputHandler);
    this.scale.on("resize", this.positionInputHandler);
    this.positionNameInput();
    input.focus();
    input.select();
  }

  private positionNameInput(): void {
    if (!this.nameInput) {
      return;
    }

    const bounds = this.game.canvas.getBoundingClientRect();
    const scale = bounds.width / 390;
    this.nameInput.style.left = `${bounds.left + 52 * scale}px`;
    this.nameInput.style.top = `${bounds.top + 494 * scale}px`;
    this.nameInput.style.width = `${286 * scale}px`;
    this.nameInput.style.height = `${48 * scale}px`;
    this.nameInput.style.fontSize = `${18 * scale}px`;
  }

  private destroyNameInput(): void {
    if (this.positionInputHandler) {
      window.removeEventListener("resize", this.positionInputHandler);
      this.scale.off("resize", this.positionInputHandler);
      this.positionInputHandler = null;
    }

    if (this.nameInput) {
      this.nameInput.remove();
      this.nameInput = null;
    }
  }

  private applyRename(combinationId: string): void {
    const nextName = this.nameInput?.value ?? "";
    const updatedCombinations = renameCombination(GameStore.getSave().offensiveCombinations, combinationId, nextName);
    GameStore.setOffensiveCombinations(updatedCombinations);
    this.destroyNameInput();
    this.scene.restart({ combinationId });
  }
}
