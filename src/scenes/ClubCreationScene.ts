import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class ClubCreationScene extends Phaser.Scene {
  constructor() {
    super("ClubCreationScene");
  }

  create(): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 100, t("club.title"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 170, t("club.v1Notice"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    new UIButton(this, 195, 300, 260, 52, t("club.createDefault"), () => {
      GameStore.createNewSave(t("club.defaultName"));
      this.scene.start("TrainingScene");
    });
    new UIButton(this, 195, 370, 260, 52, t("button.back"), () => this.scene.start("MainMenuScene"));
  }
}
