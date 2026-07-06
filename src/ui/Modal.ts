import Phaser from "phaser";
import { t } from "../systems/I18n";
import { UI } from "./UITheme";

export class Modal extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, title: string, body: string, onClose: () => void) {
    super(scene, 195, 420);
    const bg = scene.add.rectangle(0, 0, 320, 190, UI.colors.panelDark, 0.96).setStrokeStyle(2, UI.colors.accent);
    const titleText = scene.add.text(0, -65, title, { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    const bodyText = scene.add.text(0, -20, body, { font: UI.font.body, color: UI.colors.text, align: "center", wordWrap: { width: 260 } }).setOrigin(0.5);
    const close = scene.add.text(0, 62, t("button.ok"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5).setInteractive();
    close.on("pointerup", () => {
      this.destroy();
      onClose();
    });
    this.add([bg, titleText, bodyText, close]);
    scene.add.existing(this);
  }
}
