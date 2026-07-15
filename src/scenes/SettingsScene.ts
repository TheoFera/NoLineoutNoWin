import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { getLanguage, setLanguage, t } from "../systems/I18n";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuHeader } from "../ui/MenuChrome";
import { Modal } from "../ui/Modal";
import { UI } from "../ui/UITheme";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create(): void {
    const currentLanguage = getLanguage();

    this.renderOptionsBackground();
    renderMenuHeader(this, t("menu.options"));

    new MainMenuButton(this, 195, 190, 300, 58, t("button.resetSave"), () => {
      this.showResetConfirmation();
    }, {
      variant: "primary"
    });

    this.add.text(195, 390, t("settings.languageTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new MainMenuButton(this, 195, 468, 260, 58, t("options.language.fr"), () => {
      setLanguage("fr");
      this.scene.restart();
    }, {
      variant: currentLanguage === "fr" ? "primary" : "secondary"
    });

    new MainMenuButton(this, 195, 544, 260, 58, t("options.language.en"), () => {
      setLanguage("en");
      this.scene.restart();
    }, {
      variant: currentLanguage === "en" ? "primary" : "secondary"
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
  }

  private showResetConfirmation(): void {
    new Modal(
      this,
      t("settings.resetConfirmTitle"),
      t("settings.resetConfirmBody"),
      () => undefined,
      {
        primaryLabel: t("button.cancel"),
        secondaryAction: {
          label: t("button.delete"),
          onSelect: () => {
            GameStore.resetSave();
            navigateTo(this, "MainMenuScene");
          }
        }
      }
    );
  }
}
