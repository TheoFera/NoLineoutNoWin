import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import {
  getRenderResolution,
  setRenderResolution,
  type RenderResolution
} from "../systems/DisplaySettings";
import { getLanguage, setLanguage, t } from "../systems/I18n";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuHeader } from "../ui/MenuChrome";
import { Modal } from "../ui/Modal";
import { UI } from "../ui/UITheme";

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  preload(): void {
    if (!this.textures.exists("option-menu-background")) {
      this.load.image("option-menu-background", "assets/images/option-menu-background.png");
    }
  }

  create(): void {
    const currentLanguage = getLanguage();
    const currentResolution = getRenderResolution();

    this.renderOptionsBackground();
    renderMenuHeader(this, t("menu.options"));

    this.add.text(195, 158, t("settings.resolutionTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new MainMenuButton(this, 112, 220, 150, 52, t("settings.resolutionStandard"), () => {
      this.selectResolution("standard", currentResolution);
    }, {
      variant: currentResolution === "standard" ? "primary" : "secondary"
    });

    new MainMenuButton(this, 278, 220, 150, 52, t("settings.resolutionHigh"), () => {
      this.selectResolution("high", currentResolution);
    }, {
      variant: currentResolution === "high" ? "primary" : "secondary"
    });

    this.add.text(195, 312, t("settings.languageTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new MainMenuButton(this, 112, 374, 150, 52, t("options.language.fr"), () => {
      setLanguage("fr");
      this.scene.restart();
    }, {
      variant: currentLanguage === "fr" ? "primary" : "secondary"
    });

    new MainMenuButton(this, 278, 374, 150, 52, t("options.language.en"), () => {
      setLanguage("en");
      this.scene.restart();
    }, {
      variant: currentLanguage === "en" ? "primary" : "secondary"
    });

    new MainMenuButton(this, 195, 500, 300, 58, t("button.resetSave"), () => {
      this.showResetConfirmation();
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
  }

  private selectResolution(resolution: RenderResolution, currentResolution: RenderResolution): void {
    if (resolution === currentResolution) {
      return;
    }

    setRenderResolution(resolution);
    window.location.reload();
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
