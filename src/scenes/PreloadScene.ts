import Phaser from "phaser";
import { t } from "../systems/I18n";
import { replaceNavigationState } from "../systems/Navigation";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import {
  preloadRugbyPlayerAssets,
  useCrispRugbyPlayerTextures
} from "../ui/RugbyPlayerAssets";
import { UI } from "../ui/UITheme";

const LOADING_BAR_X = 37;
const LOADING_BAR_Y = 642;
const LOADING_BAR_WIDTH = 316;
const LOADING_BAR_HEIGHT = 36;
const LOADING_BAR_PADDING = 5;

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    renderMenuBackdrop(this, { variant: "hero", overlayAlpha: 0.24, showGuideLines: false });
    this.add.text(195, 615, t("loading.message"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    const progressBar = this.add.graphics();
    this.drawProgressBar(progressBar, 0);
    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => this.drawProgressBar(progressBar, progress));

    this.load.audio("referee-whistle", "whistle.mp3");
    preloadRugbyPlayerAssets(this.load);
  }

  create(): void {
    useCrispRugbyPlayerTextures(this.textures);
    replaceNavigationState("MainMenuScene");
    this.scene.start("MainMenuScene");
  }

  private drawProgressBar(graphics: Phaser.GameObjects.Graphics, progress: number): void {
    const innerWidth = LOADING_BAR_WIDTH - LOADING_BAR_PADDING * 2;
    const innerHeight = LOADING_BAR_HEIGHT - LOADING_BAR_PADDING * 2;

    graphics.clear();
    graphics.fillStyle(UI.colors.panelDark, 0.94);
    graphics.lineStyle(2, UI.colors.outline, 1);
    graphics.fillRoundedRect(LOADING_BAR_X, LOADING_BAR_Y, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT, 14);
    graphics.strokeRoundedRect(LOADING_BAR_X, LOADING_BAR_Y, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT, 14);

    if (progress > 0) {
      graphics.fillStyle(UI.colors.accent, 1);
      graphics.fillRoundedRect(
        LOADING_BAR_X + LOADING_BAR_PADDING,
        LOADING_BAR_Y + LOADING_BAR_PADDING,
        innerWidth * Phaser.Math.Clamp(progress, 0, 1),
        innerHeight,
        9
      );
    }
  }
}
