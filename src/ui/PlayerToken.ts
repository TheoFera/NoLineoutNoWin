import Phaser from "phaser";
import type { FieldPlayer } from "../models/Player";
import { UI } from "./UITheme";

export class PlayerToken extends Phaser.GameObjects.Container {
  readonly player: FieldPlayer;
  private circle: Phaser.GameObjects.Ellipse;
  private numberText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, player: FieldPlayer, color: number) {
    super(scene, x, y);
    this.player = player;
    this.circle = scene.add.ellipse(0, 0, 34, 44, color, 1).setStrokeStyle(2, UI.colors.line);
    this.numberText = scene.add.text(0, 0, String(player.number), { font: "bold 15px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add([this.circle, this.numberText]);
    this.setSize(44, 52);
    this.setInteractive(new Phaser.Geom.Rectangle(-22, -26, 44, 52), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(this);
    scene.add.existing(this);
  }

  setSelected(selected: boolean): void {
    this.circle.setStrokeStyle(selected ? 4 : 2, selected ? UI.colors.accent : UI.colors.line);
  }
}
