import Phaser from "phaser";
import { UI } from "./UITheme";

export class UIButton extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, text: string, onClick: () => void) {
    super(scene, x, y);

    this.background = scene.add.rectangle(0, 0, width, height, UI.colors.panel, 1).setStrokeStyle(2, UI.colors.accent);
    this.label = scene.add.text(0, 0, text, { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.hitArea = scene.add.zone(0, 0, width, height).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.hitArea.on("pointerdown", () => {
      this.setScale(0.98);
      onClick();
    });
    this.hitArea.on("pointerup", () => {
      this.setScale(1);
    });
    this.hitArea.on("pointerout", () => {
      this.setScale(1);
    });
    this.hitArea.on("pointerupoutside", () => {
      this.setScale(1);
    });

    this.add([this.background, this.label, this.hitArea]);
    scene.add.existing(this);
  }

  setText(text: string): void {
    this.label.setText(text);
  }
}
