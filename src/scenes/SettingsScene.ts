import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { getLanguage, setLanguage, t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    const currentLanguage = getLanguage();

    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 92, t("menu.options"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 170, t("settings.languageTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new UIButton(this, 195, 240, 250, 52, `${currentLanguage === "fr" ? "• " : ""}${t("options.language.fr")}`, () => {
      setLanguage("fr");
      this.scene.restart();
    });

    new UIButton(this, 195, 310, 250, 52, `${currentLanguage === "en" ? "• " : ""}${t("options.language.en")}`, () => {
      setLanguage("en");
      this.scene.restart();
    });

    this.add.text(195, 430, t("settings.resetInfo"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    new UIButton(this, 195, 500, 300, 52, t("button.resetSave"), () => {
      GameStore.resetSave();
      navigateTo(this, "MainMenuScene");
    });

    new UIButton(this, 195, 720, 220, 48, t("button.back"), () => navigateTo(this, "MainMenuScene"));
  }
}
