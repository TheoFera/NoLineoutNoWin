import Phaser from "phaser";
import { UI } from "./UITheme";

export function renderResultOverlayPanel(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();

  graphics.fillStyle(UI.colors.scrim, 0.42);
  graphics.fillRoundedRect(left + 3, top + 5, width, height, UI.radius);
  graphics.fillStyle(UI.colors.panelDark, 0.95);
  graphics.lineStyle(2, UI.colors.outline, 0.9);
  graphics.fillRoundedRect(left, top, width, height, UI.radius);
  graphics.strokeRoundedRect(left, top, width, height, UI.radius);
  return graphics;
}
