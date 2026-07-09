import Phaser from "phaser";
import { t } from "../systems/I18n";
import { replaceNavigationState } from "../systems/Navigation";
import { preloadRugbyPlayerAssets } from "../ui/RugbyPlayerAssets";
import { UI } from "../ui/UITheme";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.add.text(195, 390, t("loading.message"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.load.image("main-menu-background", "assets/images/main-menu-background.png");
    preloadRugbyPlayerAssets(this.load);
  }

  create(): void {
    replaceNavigationState("MainMenuScene");
    this.scene.start("MainMenuScene");
  }
}
