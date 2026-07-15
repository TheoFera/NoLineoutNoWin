import Phaser from "phaser";
import type { Combination } from "../models/Combination";
import { getDivision } from "../rules/DivisionRules";
import { getActiveOffensiveCombinations, getCombinationDisplayName, normalizeOffensiveCombinations, renameCombination } from "../rules/CombinationRules";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { UI_DEPTH } from "../ui/UIDepth";
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
    const combinations = getActiveOffensiveCombinations(
      normalizeOffensiveCombinations(save.offensiveCombinations),
      save.offensiveRepertoire
    );
    const fallbackCombinationId = combinations[0]?.id;
    this.selectedCombinationId ??= fallbackCombinationId;

    this.renderCombinationBackground();
    combinations.forEach((combination, index) => {
      this.renderCombinationRow(combination, index);
    });

    new UIButton(this, 195, 792, 220, 42, t("button.back"), () => {
      navigateTo(this, "LineoutScene", { mode: "training", combinationId: this.selectedCombinationId ?? fallbackCombinationId });
    }, {
      variant: "secondary"
    });

    this.events.once("shutdown", () => this.destroyNameInput());
    this.events.once("destroy", () => this.destroyNameInput());
  }

  private renderCombinationRow(combination: Combination, index: number): void {
    const y = 194 + index * 104;
    const isSelected = combination.id === this.selectedCombinationId;

    this.add.rectangle(195, y + 48, 320, 2, 0xf8fafc, 0.12);
    if (isSelected) {
      this.add.rectangle(28, y, 6, 74, UI.colors.accent, 0.95);
    }

    new UIButton(this, 145, y, 196, 40, getCombinationDisplayName(combination, t), () => {
      navigateTo(this, "LineoutScene", { mode: "training", combinationId: combination.id });
    });

    new UIButton(this, 292, y, 115, 40, t("button.rename"), () => {
      this.openRenameOverlay(combination);
    }, {
      variant: "secondary"
    });
  }

  private openRenameOverlay(combination: Combination): void {
    this.destroyNameInput();

    const overlay = this.add.rectangle(195, 422, 390, 844, 0x020617, 0.55).setDepth(UI_DEPTH.overlayBackdrop);
    const panel = this.add.rectangle(195, 520, 320, 210, 0x07111a, 0.98)
      .setStrokeStyle(2, UI.colors.accent)
      .setDepth(UI_DEPTH.overlayPanel);
    const title = this.add.text(195, 452, t("lineout.renameTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 260 }
    }).setOrigin(0.5).setDepth(UI_DEPTH.overlayContent);

    const saveButton = new UIButton(this, 136, 590, 126, 40, t("button.rename"), () => {
      this.applyRename(combination.id);
    });
    saveButton.setDepth(UI_DEPTH.overlayContent);

    const closeButton = new UIButton(this, 254, 590, 126, 40, t("button.close"), () => {
      this.destroyNameInput();
      this.scene.restart({ combinationId: this.selectedCombinationId });
    }, {
      variant: "secondary"
    });
    closeButton.setDepth(UI_DEPTH.overlayContent);

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

  private renderCombinationBackground(): void {
    const background = this.add.image(195, 422, "combi-menu-background");
    const source = background.texture.getSourceImage() as { width: number; height: number; };
    const scale = Math.max(390 / source.width, 844 / source.height);

    background.setScale(scale);
    this.add.rectangle(195, 422, 390, 844, 0x020617, 0.3);
  }
}
