import Phaser from "phaser";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from "../rules/TeamFactory";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuHeader } from "../ui/MenuChrome";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import type { Kit } from "../ui/RugbyPlayerTypes";
import { UI } from "../ui/UITheme";

export class ClubCreationScene extends Phaser.Scene {
  private nameInput: HTMLInputElement | null = null;
  private primaryColorInput: HTMLInputElement | null = null;
  private secondaryColorInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;
  private selectedPrimaryColor = DEFAULT_PRIMARY_COLOR;
  private selectedSecondaryColor = DEFAULT_SECONDARY_COLOR;
  private previewNameplate!: Phaser.GameObjects.Rectangle;
  private previewBackdrop!: Phaser.GameObjects.Rectangle;
  private previewPlayer!: RugbyPlayer;
  private previewText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private primaryColorValueText!: Phaser.GameObjects.Text;
  private secondaryColorValueText!: Phaser.GameObjects.Text;

  constructor() {
    super("ClubCreationScene");
  }

  create(): void {
    const previewPlayerHeight = 166;
    const previewPlayerWidth = 74;

    this.renderCreateClubBackground();
    renderMenuHeader(this, t("club.title"));
    this.add.text(35, 148, t("club.nameLabel"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.createNameInput();

    this.add.text(35, 272, t("club.primaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.primaryColorValueText = this.add.text(35, 304, this.formatColorValue(this.selectedPrimaryColor), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0, 0.5);
    this.createPrimaryColorInput();

    this.add.text(35, 430, t("club.secondaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.secondaryColorValueText = this.add.text(35, 462, this.formatColorValue(this.selectedSecondaryColor), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0, 0.5);
    this.createSecondaryColorInput();

    this.add.text(288, 272, t("club.preview"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.previewBackdrop = this.add.rectangle(288, 326, 136, 40, this.selectedSecondaryColor, 1).setStrokeStyle(2, UI.colors.line);
    this.previewNameplate = this.add.rectangle(288, 326, 124, 30, this.selectedPrimaryColor, 1).setStrokeStyle(2, UI.colors.line);
    this.previewPlayer = new RugbyPlayer(this, 288, 562, "stand_front", this.getPreviewKit(), "medium_standard")
      .setVisualSize(previewPlayerWidth, previewPlayerHeight);
    this.previewText = this.add.text(288, 326, t("club.defaultName"), {
      font: UI.font.body,
      color: UI.colors.text
    }).setOrigin(0.5);

    this.errorText = this.add.text(195, 670, "", {
      font: UI.font.body,
      color: "#fecaca",
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    new MainMenuButton(this, 195, 700, 236, 58, t("club.startGame"), () => this.handleCreateClub(), {
      variant: "primary"
    });
    new MainMenuButton(this, 195, 766, 186, 44, t("club.backMenu"), () => navigateTo(this, "MainMenuScene"), {
      variant: "secondary"
    });

    this.events.once("shutdown", () => this.destroyDomInputs());
    this.events.once("destroy", () => this.destroyDomInputs());
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
    this.positionInputHandler = () => this.positionDomInputs();

    window.addEventListener("resize", this.positionInputHandler);
    this.scale.on("resize", this.positionInputHandler);
    this.positionDomInputs();
  }

  private renderCreateClubBackground(): void {
    const background = this.add.image(195, 422, "create-club-background");
    const source = background.texture.getSourceImage() as { width: number; height: number; };
    const scale = Math.max(390 / source.width, 844 / source.height);

    background.setScale(scale);
    this.add.rectangle(195, 422, 390, 844, 0x020617, 0.3);
    this.add.rectangle(195, 146, 312, 3, 0xf8fafc, 0.18);
    this.add.rectangle(195, 698, 312, 3, 0xf8fafc, 0.16);
    this.add.rectangle(60, 422, 2, 610, 0xf8fafc, 0.08);
    this.add.rectangle(330, 422, 2, 610, 0xf8fafc, 0.08);
  }

  private createPrimaryColorInput(): void {
    this.primaryColorInput = this.createColorInput(this.selectedPrimaryColor, t("club.primaryColor"), (color) => {
      this.selectedPrimaryColor = color;
      this.refreshPreview();
    });
    this.positionDomInputs();
  }

  private createSecondaryColorInput(): void {
    this.secondaryColorInput = this.createColorInput(this.selectedSecondaryColor, t("club.secondaryColor"), (color) => {
      this.selectedSecondaryColor = color;
      this.refreshPreview();
    });
    this.positionDomInputs();
  }

  private createColorInput(initialColor: number, ariaLabel: string, onChange: (color: number) => void): HTMLInputElement {
    const parent = this.game.canvas.parentElement ?? document.body;
    const input = document.createElement("input");

    input.type = "color";
    input.value = this.toColorHex(initialColor);
    input.setAttribute("aria-label", ariaLabel);
    input.style.position = "fixed";
    input.style.zIndex = "20";
    input.style.padding = "0";
    input.style.border = "2px solid #facc15";
    input.style.borderRadius = "14px";
    input.style.background = "rgba(248, 250, 252, 0.92)";
    input.style.boxSizing = "border-box";
    input.style.cursor = "pointer";

    input.addEventListener("input", () => {
      this.errorText.setText("");
      onChange(this.fromColorHex(input.value));
    });

    parent.appendChild(input);
    return input;
  }

  private positionDomInputs(): void {
    if (!this.nameInput) {
      return;
    }

    const bounds = this.game.canvas.getBoundingClientRect();
    const scale = bounds.width / 390;

    this.nameInput.style.left = `${bounds.left + 35 * scale}px`;
    this.nameInput.style.top = `${bounds.top + 172 * scale}px`;
    this.nameInput.style.width = `${320 * scale}px`;
    this.nameInput.style.height = `${50 * scale}px`;
    this.nameInput.style.fontSize = `${18 * scale}px`;

    if (this.primaryColorInput) {
      this.primaryColorInput.style.left = `${bounds.left + 35 * scale}px`;
      this.primaryColorInput.style.top = `${bounds.top + 330 * scale}px`;
      this.primaryColorInput.style.width = `${72 * scale}px`;
      this.primaryColorInput.style.height = `${72 * scale}px`;
    }

    if (this.secondaryColorInput) {
      this.secondaryColorInput.style.left = `${bounds.left + 35 * scale}px`;
      this.secondaryColorInput.style.top = `${bounds.top + 488 * scale}px`;
      this.secondaryColorInput.style.width = `${72 * scale}px`;
      this.secondaryColorInput.style.height = `${72 * scale}px`;
    }
  }

  private destroyDomInputs(): void {
    if (this.positionInputHandler) {
      window.removeEventListener("resize", this.positionInputHandler);
      this.scale.off("resize", this.positionInputHandler);
      this.positionInputHandler = null;
    }

    if (this.nameInput) {
      this.nameInput.remove();
      this.nameInput = null;
    }

    if (this.primaryColorInput) {
      this.primaryColorInput.remove();
      this.primaryColorInput = null;
    }

    if (this.secondaryColorInput) {
      this.secondaryColorInput.remove();
      this.secondaryColorInput = null;
    }
  }

  private refreshPreview(): void {
    const clubName = this.nameInput?.value.trim() || t("club.defaultName");
    const textColor = this.getReadableTextColor(this.selectedPrimaryColor);

    this.previewBackdrop.setFillStyle(this.selectedSecondaryColor, 1);
    this.previewNameplate.setFillStyle(this.selectedPrimaryColor, 1);
    this.previewPlayer.setKit(this.getPreviewKit());
    this.previewText.setText(clubName);
    this.previewText.setColor(textColor);
    this.primaryColorValueText.setText(this.formatColorValue(this.selectedPrimaryColor));
    this.secondaryColorValueText.setText(this.formatColorValue(this.selectedSecondaryColor));
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

  private formatColorValue(color: number): string {
    return this.toColorHex(color).toUpperCase();
  }

  private toColorHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  private fromColorHex(value: string): number {
    return Number.parseInt(value.slice(1), 16);
  }

  private getPreviewKit(): Kit {
    return {
      jerseyPrimary: this.selectedPrimaryColor,
      shortsPrimary: this.selectedSecondaryColor,
      socksPrimary: this.selectedSecondaryColor
    };
  }

  private getReadableTextColor(backgroundColor: number): string {
    const red = (backgroundColor >> 16) & 0xff;
    const green = (backgroundColor >> 8) & 0xff;
    const blue = backgroundColor & 0xff;
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);

    return luminance > 160 ? "#10271b" : UI.colors.text;
  }
}
