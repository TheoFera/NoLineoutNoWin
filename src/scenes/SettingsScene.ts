import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { getLanguage, setLanguage, t } from "../systems/I18n";
import { renderMainMenuBackground } from "../ui/MainMenuBackground";
import { MainMenuButton } from "../ui/MainMenuButton";
import { UI } from "../ui/UITheme";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    const currentLanguage = getLanguage();

    renderMainMenuBackground(this);
    this.add.rectangle(195, 422, 390, 844, 0x020617, 0.52);
    this.add.text(195, 92, t("menu.options"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 170, t("settings.languageTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new MainMenuButton(this, 195, 248, 260, 58, t("options.language.fr"), () => {
      setLanguage("fr");
      this.scene.restart();
    }, {
      variant: currentLanguage === "fr" ? "primary" : "secondary"
    });

    new MainMenuButton(this, 195, 324, 260, 58, t("options.language.en"), () => {
      setLanguage("en");
      this.scene.restart();
    }, {
      variant: currentLanguage === "en" ? "primary" : "secondary"
    });

    this.add.text(195, 430, t("settings.resetInfo"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    new MainMenuButton(this, 195, 512, 300, 58, t("button.resetSave"), () => {
      GameStore.resetSave();
      navigateTo(this, "MainMenuScene");
    }, {
      variant: "primary"
    });

    new MainMenuButton(this, 195, 724, 236, 54, t("button.back"), () => navigateTo(this, "MainMenuScene"), {
      variant: "secondary"
    });
  }
}
