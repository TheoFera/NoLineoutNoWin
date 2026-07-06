import Phaser from "phaser";
import { setLanguage, t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class OptionsScene extends Phaser.Scene {
  constructor() {
    super("OptionsScene");
  }

  create(): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 90, t("menu.options"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    new UIButton(this, 195, 220, 250, 52, t("options.language.fr"), () => {
      setLanguage("fr");
      this.scene.restart();
    });
    new UIButton(this, 195, 290, 250, 52, t("options.language.en"), () => {
      setLanguage("en");
      this.scene.restart();
    });
    new UIButton(this, 195, 720, 220, 48, t("button.back"), () => this.scene.start("MainMenuScene"));
  }
}
