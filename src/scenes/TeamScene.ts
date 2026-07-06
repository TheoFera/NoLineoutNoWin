import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class TeamScene extends Phaser.Scene {
  constructor() {
    super("TeamScene");
  }

  create(): void {
    const save = GameStore.getSave();
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 48, t("menu.team"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 84, save.playerTeam.name, { font: UI.font.body, color: UI.colors.muted }).setOrigin(0.5);

    this.add.text(195, 125, `${t("team.hooker")} ${t("team.numberPrefix")}2 ${save.playerTeam.hooker.nickname} · ${t("team.throwing")} ${save.playerTeam.hooker.throwing}`, {
      font: UI.font.body,
      color: UI.colors.text
    }).setOrigin(0.5);

    save.playerTeam.lineoutPlayers.forEach((player, index) => {
      const y = 175 + index * 52;
      this.add.rectangle(195, y, 330, 42, UI.colors.panelDark, 0.9).setStrokeStyle(1, UI.colors.accent);
      this.add.text(45, y, `${t("team.numberPrefix")}${player.number}`, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(100, y, player.nickname, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(210, y, `${t("team.stat.jumpAbbr")} ${player.jump} · ${t("team.stat.liftAbbr")} ${player.lift} · ${t("team.stat.handsAbbr")} ${player.hands}`, {
        font: UI.font.small,
        color: UI.colors.muted
      }).setOrigin(0, 0.5);
    });

    new UIButton(this, 195, 760, 220, 48, t("button.back"), () => this.scene.start("TrainingScene"));
  }
}
