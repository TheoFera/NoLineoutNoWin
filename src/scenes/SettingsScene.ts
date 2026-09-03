import Phaser from "phaser";
import { APP_VERSION } from "../config/AppVersion";
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
  private versionTapCount = 0;
  private firstVersionTapAt = 0;

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
      variant: currentResolution === "standard" ? "selected" : "secondary"
    });

    new MainMenuButton(this, 278, 220, 150, 52, t("settings.resolutionHigh"), () => {
      this.selectResolution("high", currentResolution);
    }, {
      variant: currentResolution === "high" ? "selected" : "secondary"
    });

    this.add.text(195, 312, t("settings.languageTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    new MainMenuButton(this, 112, 374, 150, 52, t("options.language.fr"), () => {
      setLanguage("fr");
      this.scene.restart();
    }, {
      variant: currentLanguage === "fr" ? "selected" : "secondary"
    });

    new MainMenuButton(this, 278, 374, 150, 52, t("options.language.en"), () => {
      setLanguage("en");
      this.scene.restart();
    }, {
      variant: currentLanguage === "en" ? "selected" : "secondary"
    });

    this.renderTutorialSettings();

    this.add.text(195, 580, t("settings.currentGameTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);

    if (GameStore.isTestModeActive()) {
      new MainMenuButton(this, 195, 624, 300, 48, t("testMode.open"), () => {
        navigateTo(this, "TestModeScene");
      }, {
        variant: "secondary"
      });

      new MainMenuButton(this, 195, 684, 300, 48, t("testMode.exit"), () => {
        GameStore.exitTestMode();
        navigateTo(this, "MainMenuScene");
      }, {
        variant: "danger"
      });
    } else {
      new MainMenuButton(this, 195, 632, 300, 58, t("button.resetSave"), () => {
        this.showResetConfirmation();
      }, {
        variant: "danger"
      });
    }

    this.add.text(195, 736, `${t("settings.versionLabel")} ${APP_VERSION}`, {
      font: UI.font.small,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.add.zone(195, 736, 260, 52)
      .setInteractive()
      .on("pointerup", () => this.handleVersionTap());

    new MainMenuButton(this, 195, 798, 236, 54, t("button.back"), () => navigateTo(this, "MainMenuScene"), {
      variant: "secondary"
    });
  }

  private renderTutorialSettings(): void {
    const enabled = GameStore.isTutorialEnabled();
    this.add.text(195, 448, t("settings.tutorialTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0.5);
    new MainMenuButton(this, 112, 502, 150, 52, t("settings.tutorialEnabled"), () => {
      GameStore.setTutorialEnabled(true);
      this.scene.restart();
    }, { variant: enabled ? "selected" : "secondary" });
    new MainMenuButton(this, 278, 502, 150, 52, t("settings.tutorialDisabled"), () => {
      GameStore.setTutorialEnabled(false);
      this.scene.restart();
    }, { variant: enabled ? "secondary" : "selected" });
  }

  private renderOptionsBackground(): void {
    const background = this.add.image(195, 422, "option-menu-background");
    const source = background.texture.getSourceImage() as { width: number; height: number; };
    const scale = Math.max(390 / source.width, 844 / source.height);

    background.setScale(scale);
    this.add.rectangle(195, 422, 390, 844, UI.colors.scrim, 0.28);
  }

  private selectResolution(resolution: RenderResolution, currentResolution: RenderResolution): void {
    if (resolution === currentResolution) {
      return;
    }

    setRenderResolution(resolution);
    window.location.reload();
  }

  private handleVersionTap(): void {
    const now = Date.now();
    if (this.firstVersionTapAt === 0 || now - this.firstVersionTapAt > 4_000) {
      this.firstVersionTapAt = now;
      this.versionTapCount = 1;
    } else {
      this.versionTapCount += 1;
    }

    if (this.versionTapCount >= 7) {
      this.versionTapCount = 0;
      this.firstVersionTapAt = 0;
      navigateTo(this, "TestModeScene");
    }
  }

  private showResetConfirmation(): void {
    new Modal(
      this,
      t("settings.resetConfirmTitle"),
      t("settings.resetConfirmBody"),
      () => undefined,
      {
        primaryLabel: t("button.cancel"),
        primaryVariant: "secondary",
        secondaryAction: {
          label: t("button.delete"),
          variant: "danger",
          onSelect: () => {
            GameStore.resetSave();
            navigateTo(this, "MainMenuScene");
          }
        }
      }
    );
  }
}
