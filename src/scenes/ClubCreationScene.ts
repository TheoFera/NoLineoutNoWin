import Phaser from "phaser";
import { cloneTeamPlayerDrafts } from "../data/PlayerAppearanceOptions";
import { FFR_LEAGUES, isFfrLeagueId } from "../data/frenchRugbyLeagues";
import type { FfrLeagueId } from "../models/ClubLocation";
import type { ClubDraft } from "../models/TeamCreation";
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from "../rules/TeamFactory";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuHeader } from "../ui/MenuChrome";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import type { Kit } from "../ui/RugbyPlayerTypes";
import { UI } from "../ui/UITheme";
import { UIRoundedRectangle } from "../ui/UIRoundedRectangle";
import { applyDomControlStyle } from "../ui/DomControlStyle";

export class ClubCreationScene extends Phaser.Scene {
  private nameInput: HTMLInputElement | null = null;
  private leagueInput: HTMLSelectElement | null = null;
  private primaryColorInput: HTMLInputElement | null = null;
  private secondaryColorInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;
  private selectedPrimaryColor = DEFAULT_PRIMARY_COLOR;
  private selectedSecondaryColor = DEFAULT_SECONDARY_COLOR;
  private previewNameplate!: UIRoundedRectangle;
  private previewBackdrop!: UIRoundedRectangle;
  private previewPlayer!: RugbyPlayer;
  private previewText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private primaryColorValueText!: Phaser.GameObjects.Text;
  private secondaryColorValueText!: Phaser.GameObjects.Text;
  private initialClubName = "";
  private selectedLeagueId: FfrLeagueId | null = null;
  private playerDrafts?: ClubDraft["players"];

  constructor() {
    super("ClubCreationScene");
  }

  init(data: Partial<ClubDraft> = {}): void {
    this.initialClubName = data.clubName ?? "";
    this.selectedLeagueId = data.leagueId ?? null;
    this.selectedPrimaryColor = data.primaryColor ?? DEFAULT_PRIMARY_COLOR;
    this.selectedSecondaryColor = data.secondaryColor ?? DEFAULT_SECONDARY_COLOR;
    this.playerDrafts = data.players ? cloneTeamPlayerDrafts(data.players) : undefined;
  }

  preload(): void {
    if (!this.textures.exists("create-club-background")) {
      this.load.image("create-club-background", "assets/images/create-club-background.png");
    }
  }

  create(): void {
    const previewPlayerHeight = 188;
    const previewPlayerWidth = 84;

    this.renderCreateClubBackground();
    renderMenuHeader(this, t("club.title"), { y: 86 });
    this.add.text(35, 126, t("club.locationQuestion"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.createLeagueInput();

    this.add.text(35, 220, t("club.nameLabel"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.createNameInput();

    this.add.text(92, 324, t("club.primaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center"
    }).setOrigin(0.5);
    this.primaryColorValueText = this.add.text(92, 418, this.formatColorValue(this.selectedPrimaryColor), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.createPrimaryColorInput();

    this.add.text(288, 324, t("club.secondaryColor"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center"
    }).setOrigin(0.5);
    this.secondaryColorValueText = this.add.text(288, 418, this.formatColorValue(this.selectedSecondaryColor), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.createSecondaryColorInput();

    this.previewBackdrop = new UIRoundedRectangle(this, 195, 480, 176, 40, this.selectedSecondaryColor, 1)
      .setStrokeStyle(2, UI.colors.line);
    this.previewNameplate = new UIRoundedRectangle(this, 195, 480, 164, 30, this.selectedPrimaryColor, 1)
      .setStrokeStyle(2, UI.colors.line);
    this.previewPlayer = new RugbyPlayer(this, 195, 685, "stand_front", this.getPreviewKit(), "medium_standard")
      .setVisualSize(previewPlayerWidth, previewPlayerHeight);
    this.previewText = this.add.text(195, 480, t("club.defaultName"), {
      font: UI.font.body,
      color: UI.colors.text
    }).setOrigin(0.5);

    this.errorText = this.add.text(195, 724, "", {
      font: UI.font.body,
      color: UI.colors.textDanger,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    new MainMenuButton(this, 195, 760, 236, 50, t("club.continue"), () => this.handleCreateClub(), {
      variant: "primary"
    });
    new MainMenuButton(this, 195, 816, 186, 38, t("club.backMenu"), () => navigateTo(this, "MainMenuScene"), {
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
    input.value = this.initialClubName;
    input.placeholder = t("club.namePlaceholder");
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.setAttribute("aria-label", t("club.nameLabel"));
    applyDomControlStyle(input);

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
    this.add.rectangle(195, 422, 390, 844, UI.colors.scrim, 0.3);
  }

  private createLeagueInput(): void {
    const parent = this.game.canvas.parentElement ?? document.body;
    const select = document.createElement("select");
    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = t("club.locationPlaceholder");
    placeholder.disabled = true;
    select.appendChild(placeholder);
    FFR_LEAGUES.forEach((league) => {
      const option = document.createElement("option");
      option.value = league.id;
      option.textContent = t(league.translationKey);
      select.appendChild(option);
    });
    select.value = this.selectedLeagueId ?? "";
    select.setAttribute("aria-label", t("club.locationQuestion"));
    applyDomControlStyle(select, { compact: true });
    select.addEventListener("change", () => {
      this.selectedLeagueId = isFfrLeagueId(select.value) ? select.value : null;
      this.errorText?.setText("");
    });

    parent.appendChild(select);
    this.leagueInput = select;
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
    applyDomControlStyle(input, { colorPicker: true });

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
    const scaleX = bounds.width / 390;
    const scaleY = bounds.height / 844;

    if (this.leagueInput) {
      this.leagueInput.style.left = `${bounds.left + 35 * scaleX}px`;
      this.leagueInput.style.top = `${bounds.top + 148 * scaleY}px`;
      this.leagueInput.style.width = `${320 * scaleX}px`;
      this.leagueInput.style.height = `${48 * scaleY}px`;
      this.leagueInput.style.fontSize = `${16 * Math.min(scaleX, scaleY)}px`;
    }

    this.nameInput.style.left = `${bounds.left + 35 * scaleX}px`;
    this.nameInput.style.top = `${bounds.top + 242 * scaleY}px`;
    this.nameInput.style.width = `${320 * scaleX}px`;
    this.nameInput.style.height = `${50 * scaleY}px`;
    this.nameInput.style.fontSize = `${18 * Math.min(scaleX, scaleY)}px`;

    if (this.primaryColorInput) {
      this.primaryColorInput.style.left = `${bounds.left + 63 * scaleX}px`;
      this.primaryColorInput.style.top = `${bounds.top + 346 * scaleY}px`;
      this.primaryColorInput.style.width = `${58 * scaleX}px`;
      this.primaryColorInput.style.height = `${58 * scaleY}px`;
    }

    if (this.secondaryColorInput) {
      this.secondaryColorInput.style.left = `${bounds.left + 259 * scaleX}px`;
      this.secondaryColorInput.style.top = `${bounds.top + 346 * scaleY}px`;
      this.secondaryColorInput.style.width = `${58 * scaleX}px`;
      this.secondaryColorInput.style.height = `${58 * scaleY}px`;
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

    if (this.leagueInput) {
      this.leagueInput.remove();
      this.leagueInput = null;
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
    if (!this.selectedLeagueId) {
      this.errorText.setText(t("club.locationRequired"));
      this.leagueInput?.focus();
      return;
    }
    if (!clubName) {
      this.errorText.setText(t("club.nameRequired"));
      this.nameInput?.focus();
      return;
    }

    navigateTo(this, "TeamCreationScene", {
      clubName,
      leagueId: this.selectedLeagueId,
      primaryColor: this.selectedPrimaryColor,
      secondaryColor: this.selectedSecondaryColor,
      players: this.playerDrafts
    } satisfies ClubDraft);
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
      socksPrimary: this.selectedPrimaryColor,
      detailsSecondary: this.selectedSecondaryColor
    };
  }

  private getReadableTextColor(backgroundColor: number): string {
    const red = (backgroundColor >> 16) & 0xff;
    const green = (backgroundColor >> 8) & 0xff;
    const blue = backgroundColor & 0xff;
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);

    return luminance > 160 ? UI.colors.textOnAccent : UI.colors.text;
  }
}
