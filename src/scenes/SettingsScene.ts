import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { getLanguage, setLanguage, t } from "../systems/I18n";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuHeader } from "../ui/MenuChrome";
import { UI } from "../ui/UITheme";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    const currentLanguage = getLanguage();

    this.renderOptionsBackground();
    renderMenuHeader(this, t("menu.options"));
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

  private renderOptionsBackground(): void {
    const background = this.add.image(195, 422, "option-menu-background");
    const source = background.texture.getSourceImage() as { width: number; height: number; };
    const scale = Math.max(390 / source.width, 844 / source.height);

    background.setScale(scale);
    this.add.rectangle(195, 422, 390, 844, 0x020617, 0.3);
    this.add.rectangle(195, 146, 312, 3, 0xf8fafc, 0.18);
    this.add.rectangle(195, 698, 312, 3, 0xf8fafc, 0.16);
    this.add.rectangle(60, 422, 2, 610, 0xf8fafc, 0.08);
    this.add.rectangle(330, 422, 2, 610, 0xf8fafc, 0.08);
  }
}
