import Phaser from "phaser";
import { t } from "../systems/I18n";
import { replaceNavigationState } from "../systems/Navigation";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { preloadRugbyPlayerAssets } from "../ui/RugbyPlayerAssets";
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

    this.load.image("create-club-background", "assets/images/create-club-background.png");
    this.load.image("option-menu-background", "assets/images/option-menu-background.png");
    this.load.image("championship-menu-background", "assets/images/championship-menu-background.png");
    this.load.image("combi-menu-background", "assets/images/combi-menu-background.png");
    this.load.image("lineout-pitch-background", "assets/images/lineout-pitch-training.png");
    preloadRugbyPlayerAssets(this.load);
  }

  create(): void {
    replaceNavigationState("MainMenuScene");
    this.scene.start("MainMenuScene");
  }

  private drawProgressBar(graphics: Phaser.GameObjects.Graphics, progress: number): void {
    const innerWidth = LOADING_BAR_WIDTH - LOADING_BAR_PADDING * 2;
    const innerHeight = LOADING_BAR_HEIGHT - LOADING_BAR_PADDING * 2;

    graphics.clear();
    graphics.fillStyle(0x071326, 0.94);
    graphics.lineStyle(3, 0xf3c54d, 1);
    graphics.fillRoundedRect(LOADING_BAR_X, LOADING_BAR_Y, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT, 14);
    graphics.strokeRoundedRect(LOADING_BAR_X, LOADING_BAR_Y, LOADING_BAR_WIDTH, LOADING_BAR_HEIGHT, 14);

    if (progress > 0) {
      graphics.fillStyle(0xd79c17, 1);
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
