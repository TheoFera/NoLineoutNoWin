import Phaser from "phaser";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from "../rules/TeamFactory";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

const COLOR_OPTIONS = [
  0x2563eb,
  0x0f766e,
  0x15803d,
  0xb91c1c,
  0xd97706,
  0x111827,
  0xffffff,
  0xfacc15
];

export class ClubCreationScene extends Phaser.Scene {
  private nameInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;
  private selectedPrimaryColor = DEFAULT_PRIMARY_COLOR;
  private selectedSecondaryColor = DEFAULT_SECONDARY_COLOR;
  private primarySwatches: Phaser.GameObjects.Rectangle[] = [];
  private secondarySwatches: Phaser.GameObjects.Rectangle[] = [];
  private previewPrimary!: Phaser.GameObjects.Rectangle;
  private previewSecondary!: Phaser.GameObjects.Rectangle;
  private previewText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super("ClubCreationScene");
  }

  create(): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 84, t("club.title"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 146, t("club.intro"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    this.add.text(35, 220, t("club.nameLabel"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.createNameInput();

    this.add.text(35, 338, t("club.primaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.primarySwatches = this.createColorRow(35, 382, COLOR_OPTIONS, this.selectedPrimaryColor, (color) => {
      this.selectedPrimaryColor = color;
      this.refreshSwatches(this.primarySwatches, color);
      this.refreshPreview();
    });

    this.add.text(35, 466, t("club.secondaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.secondarySwatches = this.createColorRow(35, 510, COLOR_OPTIONS, this.selectedSecondaryColor, (color) => {
      this.selectedSecondaryColor = color;
      this.refreshSwatches(this.secondarySwatches, color);
      this.refreshPreview();
    });

    this.add.text(195, 620, t("club.preview"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.previewSecondary = this.add.rectangle(195, 680, 198, 82, this.selectedSecondaryColor, 1).setStrokeStyle(2, UI.colors.line);
    this.previewPrimary = this.add.rectangle(195, 680, 176, 58, this.selectedPrimaryColor, 1).setStrokeStyle(2, UI.colors.line);
    this.previewText = this.add.text(195, 680, t("club.defaultName"), {
      font: "bold 20px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);

    this.errorText = this.add.text(195, 744, "", {
      font: UI.font.body,
      color: "#fecaca",
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    new UIButton(this, 195, 786, 280, 52, t("club.startGame"), () => this.handleCreateClub());
    new UIButton(this, 195, 830, 220, 34, t("club.backMenu"), () => navigateTo(this, "MainMenuScene"));

    this.events.once("shutdown", () => this.destroyNameInput());
    this.events.once("destroy", () => this.destroyNameInput());
    this.refreshPreview();
  }

  private createNameInput(): void {
    const parent = this.game.canvas.parentElement ?? document.body;
    const input = document.createElement("input");

    input.type = "text";
    input.maxLength = 24;
    input.value = t("club.defaultName");
    input.placeholder = t("club.namePlaceholder");
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.setAttribute("aria-label", t("club.nameLabel"));
    input.style.position = "fixed";
    input.style.zIndex = "20";
    input.style.border = "2px solid #facc15";
    input.style.borderRadius = "14px";
    input.style.padding = "0 14px";
    input.style.background = "#f8fafc";
    input.style.color = "#10271b";
    input.style.boxSizing = "border-box";
    input.style.outline = "none";

    input.addEventListener("input", () => {
      this.errorText.setText("");
      this.refreshPreview();
    });

    parent.appendChild(input);
    this.nameInput = input;
    this.positionInputHandler = () => this.positionNameInput();

    window.addEventListener("resize", this.positionInputHandler);
    this.scale.on("resize", this.positionInputHandler);
    this.positionNameInput();
  }

  private positionNameInput(): void {
    if (!this.nameInput) {
      return;
    }

    const bounds = this.game.canvas.getBoundingClientRect();
    const scale = bounds.width / 390;
    this.nameInput.style.left = `${bounds.left + 35 * scale}px`;
    this.nameInput.style.top = `${bounds.top + 244 * scale}px`;
    this.nameInput.style.width = `${320 * scale}px`;
    this.nameInput.style.height = `${50 * scale}px`;
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

  private createColorRow(
    startX: number,
    y: number,
    colors: number[],
    selectedColor: number,
    onSelect: (color: number) => void
  ): Phaser.GameObjects.Rectangle[] {
    return colors.map((color, index) => {
      const x = startX + (index % 4) * 80 + 24;
      const rowOffset = Math.floor(index / 4) * 56;
      const swatch = this.add.rectangle(x, y + rowOffset, 48, 48, color, 1)
        .setStrokeStyle(color === selectedColor ? 4 : 2, color === selectedColor ? UI.colors.accent : UI.colors.line)
        .setInteractive({ useHandCursor: true });

      swatch.on("pointerdown", () => onSelect(color));
      return swatch;
    });
  }

  private refreshSwatches(swatches: Phaser.GameObjects.Rectangle[], selectedColor: number): void {
    for (const swatch of swatches) {
      swatch.setStrokeStyle(
        swatch.fillColor === selectedColor ? 4 : 2,
        swatch.fillColor === selectedColor ? UI.colors.accent : UI.colors.line
      );
    }
  }

  private refreshPreview(): void {
    const clubName = this.nameInput?.value.trim() || t("club.defaultName");
    const textColor = this.selectedPrimaryColor === 0xffffff ? "#111827" : UI.colors.text;

    this.previewSecondary.setFillStyle(this.selectedSecondaryColor, 1);
    this.previewPrimary.setFillStyle(this.selectedPrimaryColor, 1);
    this.previewText.setText(clubName);
    this.previewText.setColor(textColor);
  }

  private handleCreateClub(): void {
    const clubName = this.nameInput?.value.trim() ?? "";
    if (!clubName) {
      this.errorText.setText(t("club.nameRequired"));
      this.nameInput?.focus();
      return;
    }

    GameStore.createNewSave(clubName, this.selectedPrimaryColor, this.selectedSecondaryColor);
    navigateTo(this, "LineoutScene", { mode: "training" });
  }
}
