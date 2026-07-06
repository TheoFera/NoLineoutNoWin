import Phaser from "phaser";
import { t } from "../systems/I18n";
import { UI } from "../ui/UITheme";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload(): void {
    this.add.text(195, 390, t("loading.message"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
  }

  create(): void {
    this.scene.start("MainMenuScene");
  }
}
