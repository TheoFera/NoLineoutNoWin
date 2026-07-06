import Phaser from "phaser";
import type { Player } from "../models/Player";
import { isHooker } from "../models/Player";
import { t } from "../systems/I18n";
import { UI } from "./UITheme";

export class PlayerCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y);

    const bg = scene.add.rectangle(0, 0, 220, 120, UI.colors.panelDark, 0.95).setStrokeStyle(2, UI.colors.accent);
    const title = scene.add.text(-95, -44, `${t("team.numberPrefix")}${player.number} - ${player.nickname}`, {
      font: UI.font.subtitle,
      color: UI.colors.text
    });

    const stats = isHooker(player)
      ? `${t("team.throwing")} ${player.throwing}`
      : `${t("team.stat.jump")} ${player.jump}\n${t("team.stat.lift")} ${player.lift}\n${t("team.stat.hands")} ${player.hands}`;

    const statsText = scene.add.text(-95, -12, stats, {
      font: UI.font.body,
      color: UI.colors.text,
      lineSpacing: 6
    });

    this.add([bg, title, statsText]);
    scene.add.existing(this);
  }
}
