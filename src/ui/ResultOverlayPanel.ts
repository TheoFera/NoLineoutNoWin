import Phaser from "phaser";

export function renderResultOverlayPanel(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();

  graphics.fillStyle(0x000000, 0.46);
  graphics.fillRoundedRect(left + 3, top + 5, width, height, 16);
  graphics.fillStyle(0x07111a, 0.95);
  graphics.lineStyle(2, 0x64748b, 0.76);
  graphics.fillRoundedRect(left, top, width, height, 16);
  graphics.strokeRoundedRect(left, top, width, height, 16);
  return graphics;
}
