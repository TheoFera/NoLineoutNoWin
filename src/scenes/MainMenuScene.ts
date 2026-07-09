import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuBackdrop, renderMenuHeader } from "../ui/MenuChrome";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const hasSave = GameStore.hasSave();
    const primaryLabel = hasSave ? t("menu.continue") : t("button.play");

    this.renderBackground();
    new MainMenuButton(this, 195, 660, 316, 78, primaryLabel.toUpperCase(), () => this.handlePrimaryAction(hasSave));
    new MainMenuButton(this, 195, 760, 316, 78, t("menu.options").toUpperCase(), () => navigateTo(this, "SettingsScene"), {
      variant: "secondary"
    });
  }

  private handlePrimaryAction(hasSave: boolean): void {
    if (hasSave) {
      navigateTo(this, "LineoutScene", { mode: "training" });
      return;
    }

    navigateTo(this, "ClubCreationScene");
  }

  private renderBackground(): void {
    const usedHeroBackground = renderMenuBackdrop(this, { variant: "hero", overlayAlpha: 0.24 });
    if (!usedHeroBackground) {
      renderMenuHeader(this, t("app.title"), { y: 136 });
    }
  }
}
