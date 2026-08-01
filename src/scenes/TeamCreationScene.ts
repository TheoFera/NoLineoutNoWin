import Phaser from "phaser";
import {
  AVAILABLE_PLAYER_BODY_SHAPES,
  cloneTeamPlayerDrafts,
  createDefaultTeamPlayerDrafts
} from "../data/PlayerAppearanceOptions";
import type { ClubDraft, TeamPlayerDraft } from "../models/TeamCreation";
import { TEAM_PLAYER_NUMBERS } from "../models/TeamCreation";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { renderMenuHeader, renderMenuPanel } from "../ui/MenuChrome";
import { getSkinToneTint, PLAYER_SKIN_TONE_OPTIONS } from "../ui/PlayerSkinTone";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import type { Kit } from "../ui/RugbyPlayerTypes";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const NICKNAME_MAX_LENGTH = 12;

type NumberSelector = {
  background: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
};

type SkinSelector = {
  ring: Phaser.GameObjects.Arc;
  swatch: Phaser.GameObjects.Arc;
};

export class TeamCreationScene extends Phaser.Scene {
  private clubDraft!: ClubDraft;
  private players: TeamPlayerDraft[] = [];
  private selectedPlayerIndex = 0;
  private nicknameInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;
  private previewPlayer!: RugbyPlayer;
  private nicknameLabel!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private numberSelectors: NumberSelector[] = [];
  private bodyShapeDots: Phaser.GameObjects.Arc[] = [];
  private skinSelectors: SkinSelector[] = [];

  constructor() {
    super("TeamCreationScene");
  }

  init(data: ClubDraft): void {
    const sourcePlayers = data.players?.length === TEAM_PLAYER_NUMBERS.length
      ? data.players
      : createDefaultTeamPlayerDrafts();
    this.clubDraft = {
      clubName: data.clubName,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor
    };
    this.players = cloneTeamPlayerDrafts(sourcePlayers);
    this.selectedPlayerIndex = 0;
  }

  preload(): void {
    if (!this.textures.exists("create-club-background")) {
      this.load.image("create-club-background", "assets/images/create-club-background.png");
    }
  }

  create(): void {
    this.renderBackground();
    renderMenuHeader(this, t("teamCreation.title"), {
      subtitle: t("teamCreation.subtitle"),
      y: 58
    });
    this.renderNumberSelectors();
    this.nicknameLabel = this.add.text(35, 170, "", {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.createNicknameInput();

    renderMenuPanel(this, {
      x: 195,
      y: 410,
      width: 320,
      height: 300,
      accentColor: UI.colors.accent,
      showAccent: false
    });
    this.add.text(195, 280, t("teamCreation.chooseBodyShape"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0.5);
    this.previewPlayer = new RugbyPlayer(
      this,
      195,
      520,
      "stand_front",
      this.getKit(),
      this.selectedPlayer.appearance.bodyShape,
      getSkinToneTint(this.selectedPlayer.appearance.skinToneId)
    ).setVisualSize(112, 220);

    new UIButton(this, 83, 405, 52, 58, t("teamCreation.previousBodyShape"), () => this.cycleBodyShape(-1), {
      variant: "secondary",
      fontSize: 34
    });
    new UIButton(this, 307, 405, 52, 58, t("teamCreation.nextBodyShape"), () => this.cycleBodyShape(1), {
      variant: "secondary",
      fontSize: 34
    });
    this.renderBodyShapeDots();
    this.renderSkinToneSelectors();

    this.errorText = this.add.text(195, 738, "", {
      font: UI.font.small,
      color: "#fecaca",
      align: "center",
      wordWrap: { width: 330 }
    }).setOrigin(0.5);

    new UIButton(this, 94, 800, 138, 48, t("button.back"), () => this.goBack(), {
      variant: "secondary"
    });
    new UIButton(this, 271, 800, 190, 48, t("teamCreation.create"), () => this.createTeam());

    this.events.once("shutdown", () => this.destroyNicknameInput());
    this.events.once("destroy", () => this.destroyNicknameInput());
    this.refreshSelectedPlayer();
  }

  private get selectedPlayer(): TeamPlayerDraft {
    return this.players[this.selectedPlayerIndex];
  }

  private renderBackground(): void {
    const background = this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "create-club-background");
    const source = background.texture.getSourceImage() as { width: number; height: number };
    background.setScale(Math.max(SCREEN_WIDTH / source.width, SCREEN_HEIGHT / source.height));
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x020617, 0.36);
  }

  private renderNumberSelectors(): void {
    this.numberSelectors = TEAM_PLAYER_NUMBERS.map((number, index) => {
      const x = 41 + index * 44;
      const background = this.add.circle(x, 116, 18, UI.colors.panel, 0.96)
        .setStrokeStyle(2, UI.colors.line)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, 117, String(number), {
        font: "bold 15px Arial",
        color: UI.colors.text
      }).setOrigin(0.5);
      background.on("pointerup", () => this.selectPlayer(index));
      return { background, label };
    });
  }

  private createNicknameInput(): void {
    const parent = this.game.canvas.parentElement ?? document.body;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = NICKNAME_MAX_LENGTH;
    input.value = this.selectedPlayer.nickname;
    input.placeholder = t("teamCreation.nicknamePlaceholder");
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.setAttribute(
      "aria-label",
      t("teamCreation.nicknameForPlayer").replace("{number}", String(this.selectedPlayer.number))
    );
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
      this.selectedPlayer.nickname = input.value;
      this.errorText?.setText("");
    });
    parent.appendChild(input);
    this.nicknameInput = input;
    this.positionInputHandler = () => this.positionNicknameInput();
    window.addEventListener("resize", this.positionInputHandler);
    this.scale.on("resize", this.positionInputHandler);
    this.positionNicknameInput();
  }

  private positionNicknameInput(): void {
    if (!this.nicknameInput) return;
    const bounds = this.game.canvas.getBoundingClientRect();
    const scaleX = bounds.width / SCREEN_WIDTH;
    const scaleY = bounds.height / SCREEN_HEIGHT;
    this.nicknameInput.style.left = `${bounds.left + 35 * scaleX}px`;
    this.nicknameInput.style.top = `${bounds.top + 194 * scaleY}px`;
    this.nicknameInput.style.width = `${320 * scaleX}px`;
    this.nicknameInput.style.height = `${46 * scaleY}px`;
    this.nicknameInput.style.fontSize = `${18 * Math.min(scaleX, scaleY)}px`;
  }

  private renderBodyShapeDots(): void {
    const totalWidth = (AVAILABLE_PLAYER_BODY_SHAPES.length - 1) * 18;
    this.bodyShapeDots = AVAILABLE_PLAYER_BODY_SHAPES.map((_bodyShape, index) => (
      this.add.circle(195 - totalWidth / 2 + index * 18, 540, 5, UI.colors.line, 0.45)
    ));
  }

  private renderSkinToneSelectors(): void {
    this.add.text(35, 583, t("teamCreation.skinTone"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    const totalWidth = (PLAYER_SKIN_TONE_OPTIONS.length - 1) * 55;
    this.skinSelectors = PLAYER_SKIN_TONE_OPTIONS.map((option, index) => {
      const x = 195 - totalWidth / 2 + index * 55;
      const ring = this.add.circle(x, 628, 22, UI.colors.panel, 0.96)
        .setStrokeStyle(3, UI.colors.line);
      const swatch = this.add.circle(x, 628, 16, option.tint)
        .setInteractive({ useHandCursor: true });
      swatch.setData("ariaLabel", t("teamCreation.skinToneOption").replace("{number}", String(index + 1)));
      swatch.on("pointerup", () => {
        this.selectedPlayer.appearance.skinToneId = option.id;
        this.refreshSelectedPlayer();
      });
      return { ring, swatch };
    });
  }

  private selectPlayer(index: number): void {
    if (index === this.selectedPlayerIndex) return;
    this.commitNickname();
    this.selectedPlayerIndex = index;
    if (this.nicknameInput) this.nicknameInput.value = this.selectedPlayer.nickname;
    this.refreshSelectedPlayer();
  }

  private cycleBodyShape(direction: -1 | 1): void {
    const currentIndex = AVAILABLE_PLAYER_BODY_SHAPES.indexOf(
      this.selectedPlayer.appearance.bodyShape as typeof AVAILABLE_PLAYER_BODY_SHAPES[number]
    );
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (
      safeCurrentIndex + direction + AVAILABLE_PLAYER_BODY_SHAPES.length
    ) % AVAILABLE_PLAYER_BODY_SHAPES.length;
    this.selectedPlayer.appearance.bodyShape = AVAILABLE_PLAYER_BODY_SHAPES[nextIndex];
    this.refreshSelectedPlayer();
  }

  private refreshSelectedPlayer(): void {
    const nicknameLabel = t("teamCreation.nicknameForPlayer")
      .replace("{number}", String(this.selectedPlayer.number));
    this.nicknameLabel.setText(nicknameLabel);
    this.nicknameInput?.setAttribute("aria-label", nicknameLabel);
    this.previewPlayer
      .setBodyShape(this.selectedPlayer.appearance.bodyShape)
      .setBodyTint(getSkinToneTint(this.selectedPlayer.appearance.skinToneId));

    this.numberSelectors.forEach(({ background, label }, index) => {
      const selected = index === this.selectedPlayerIndex;
      background
        .setFillStyle(selected ? UI.colors.accent : UI.colors.panel, selected ? 1 : 0.96)
        .setStrokeStyle(2, selected ? UI.colors.accent : UI.colors.line);
      label.setColor(selected ? "#1f2937" : UI.colors.text);
    });

    const bodyShapeIndex = AVAILABLE_PLAYER_BODY_SHAPES.indexOf(
      this.selectedPlayer.appearance.bodyShape as typeof AVAILABLE_PLAYER_BODY_SHAPES[number]
    );
    this.bodyShapeDots.forEach((dot, index) => {
      dot.setFillStyle(index === bodyShapeIndex ? UI.colors.accent : UI.colors.line, index === bodyShapeIndex ? 1 : 0.45);
      dot.setScale(index === bodyShapeIndex ? 1.25 : 1);
    });

    this.skinSelectors.forEach(({ ring }, index) => {
      const selected = PLAYER_SKIN_TONE_OPTIONS[index].id === this.selectedPlayer.appearance.skinToneId;
      ring.setStrokeStyle(selected ? 4 : 2, selected ? UI.colors.accent : UI.colors.line);
    });
  }

  private commitNickname(): void {
    if (this.nicknameInput) this.selectedPlayer.nickname = this.nicknameInput.value;
  }

  private createTeam(): void {
    this.commitNickname();
    this.players.forEach((player) => {
      player.nickname = player.nickname.trim();
    });
    const missingNameIndex = this.players.findIndex((player) => !player.nickname);
    if (missingNameIndex >= 0) {
      this.selectedPlayerIndex = missingNameIndex;
      if (this.nicknameInput) {
        this.nicknameInput.value = "";
        this.nicknameInput.focus();
      }
      this.errorText.setText(t("teamCreation.nameRequired"));
      this.refreshSelectedPlayer();
      return;
    }

    GameStore.createNewSave(
      this.clubDraft.clubName,
      this.clubDraft.primaryColor,
      this.clubDraft.secondaryColor,
      this.players
    );
    navigateTo(this, "LineoutScene", { mode: "training" });
  }

  private goBack(): void {
    this.commitNickname();
    navigateTo(this, "ClubCreationScene", {
      ...this.clubDraft,
      players: cloneTeamPlayerDrafts(this.players)
    } satisfies ClubDraft);
  }

  private destroyNicknameInput(): void {
    if (this.positionInputHandler) {
      window.removeEventListener("resize", this.positionInputHandler);
      this.scale.off("resize", this.positionInputHandler);
      this.positionInputHandler = null;
    }
    this.nicknameInput?.remove();
    this.nicknameInput = null;
  }

  private getKit(): Kit {
    return {
      jerseyPrimary: this.clubDraft.primaryColor,
      shortsPrimary: this.clubDraft.secondaryColor,
      socksPrimary: this.clubDraft.primaryColor,
      detailsSecondary: this.clubDraft.secondaryColor
    };
  }
}
