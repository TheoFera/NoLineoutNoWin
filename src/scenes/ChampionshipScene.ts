import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class ChampionshipScene extends Phaser.Scene {
  constructor() {
    super("ChampionshipScene");
  }

  create(): void {
    const save = GameStore.getSave();
    const divisionLabel = t(`division.${save.currentDivisionId}`);

    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 70, t("menu.championship"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 120, `${divisionLabel} · ${t("championship.season")} ${save.season}`, { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 200, t("championship.placeholder"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);
    new UIButton(this, 195, 735, 220, 48, t("button.back"), () => this.scene.start("TrainingScene"));
  }
}
