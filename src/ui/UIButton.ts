import Phaser from "phaser";
import { UI } from "./UITheme";

export class UIButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, text: string, onClick: () => void) {
    super(scene, x, y);

    this.background = scene.add.rectangle(0, 0, width, height, UI.colors.panel, 1).setStrokeStyle(2, UI.colors.accent);
    this.label = scene.add.text(0, 0, text, { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add([this.background, this.label]);

    this.setSize(width, height);
    this.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    this.on("pointerdown", () => this.setScale(0.98));
    this.on("pointerup", () => {
      this.setScale(1);
      onClick();
    });
    this.on("pointerout", () => this.setScale(1));

    scene.add.existing(this);
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}
