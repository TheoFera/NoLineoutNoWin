import Phaser from "phaser";

const BUTTON_ICONS = {
  combinations: { x: 194, y: 272, width: 922, height: 820 },
  recruit: { x: 216, y: 272, width: 894, height: 768 },
  championship: { x: 94, y: 146, width: 1092, height: 1008 }
} as const;

export type ButtonImageIcon = keyof typeof BUTTON_ICONS;

export function preloadButtonIcons(loader: Phaser.Loader.LoaderPlugin): void {
  for (const name of Object.keys(BUTTON_ICONS)) {
    loader.image(`button-icon-${name}`, `assets/images/button-icons/${name}.jpg`);
  }
}

export function createButtonIcon(
  scene: Phaser.Scene, name: ButtonImageIcon, x: number
): Phaser.GameObjects.Image {
  const key = `button-icon-${name}`;
  const bounds = BUTTON_ICONS[name];
  const texture = scene.textures.get(key);
  if (!texture.has("symbol")) {
    texture.add("symbol", 0, bounds.x, bounds.y, bounds.width, bounds.height);
  }
  const size = name === "recruit" ? 42 : 28;
  const icon = scene.add.image(x, 0, key, "symbol");
  icon.setScale(size / Math.max(bounds.width, bounds.height));
  // Les sources fournies sont sur fond noir : Écran rend ce fond neutre sur le bouton.
  return icon.setBlendMode(Phaser.BlendModes.SCREEN);
}
