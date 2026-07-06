import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(): void {
    const match = GameStore.getMatch();
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 85, t("result.title"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 160, match ? `${match.home.name} ${match.ourScore} - ${match.opponentScore} ${match.away.name}` : t("result.noMatch"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 330 }
    }).setOrigin(0.5);
    new UIButton(this, 195, 330, 260, 52, t("result.continue"), () => {
      GameStore.completeCurrentMatch();
      navigateTo(this, "LineoutScene", { mode: "training" });
    });
  }
}
