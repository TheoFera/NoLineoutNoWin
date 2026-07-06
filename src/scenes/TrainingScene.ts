import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class TrainingScene extends Phaser.Scene {
  constructor() {
    super("TrainingScene");
  }

  create(): void {
    const save = GameStore.getSave();
    const divisionLabel = t(`division.${save.currentDivisionId}`);

    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 80, t("menu.training"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 130, `${save.playerTeam.name} · ${divisionLabel}`, { font: UI.font.body, color: UI.colors.muted }).setOrigin(0.5);

    new UIButton(this, 195, 230, 280, 52, t("training.practiceLineout"), () => this.scene.start("LineoutScene", { mode: "training" }));
    new UIButton(this, 195, 300, 280, 52, t("training.playMatch"), () => this.scene.start("MatchScene"));
    new UIButton(this, 195, 370, 280, 52, t("menu.team"), () => this.scene.start("TeamScene"));
    new UIButton(this, 195, 440, 280, 52, t("menu.championship"), () => this.scene.start("ChampionshipScene"));
    new UIButton(this, 195, 510, 280, 52, t("button.back"), () => this.scene.start("MainMenuScene"));
  }
}
