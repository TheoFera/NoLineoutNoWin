import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 110, t("app.title"), { font: UI.font.title, color: UI.colors.text, align: "center" }).setOrigin(0.5);
    this.add.text(195, 150, t("app.tagline"), { font: UI.font.body, color: UI.colors.muted }).setOrigin(0.5);

    new UIButton(this, 195, 260, 260, 52, t("menu.newGame"), () => this.scene.start("ClubCreationScene"));
    new UIButton(this, 195, 330, 260, 52, t("menu.continue"), () => {
      if (!GameStore.hasSave()) GameStore.createNewSave(t("club.defaultName"));
      this.scene.start("TrainingScene");
    });
    new UIButton(this, 195, 400, 260, 52, t("menu.training"), () => {
      if (!GameStore.hasSave()) GameStore.createNewSave(t("club.defaultName"));
      this.scene.start("TrainingScene");
    });
    new UIButton(this, 195, 470, 260, 52, t("menu.options"), () => this.scene.start("OptionsScene"));
  }
}
