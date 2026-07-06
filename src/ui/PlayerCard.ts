import Phaser from "phaser";
import type { FieldPlayer } from "../models/Player";
import { UI } from "./UITheme";

export class PlayerCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, player: FieldPlayer) {
    super(scene, x, y);
    const bg = scene.add.rectangle(0, 0, 220, 120, UI.colors.panelDark, 0.95).setStrokeStyle(2, UI.colors.accent);
    const title = scene.add.text(-95, -45, `N°${player.number} - ${player.nickname}`, { font: UI.font.subtitle, color: UI.colors.text });
    const stats = scene.add.text(-95, -15, `Saut ${player.jump}\nLift ${player.lift}\nMain ${player.hands}`, {
      font: UI.font.body,
      color: UI.colors.text,
      lineSpacing: 6
    });
    this.add([bg, title, stats]);
    scene.add.existing(this);
  }
}
