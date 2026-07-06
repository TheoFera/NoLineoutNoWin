import Phaser from "phaser";

const BACKGROUND_WIDTH = 390;
const BACKGROUND_HEIGHT = 844;
const BACKGROUND_CENTER_X = 195;
const BACKGROUND_CENTER_Y = 422;
const FALLBACK_COLOR = 0x08142c;

export function renderMainMenuBackground(scene: Phaser.Scene): boolean {
  if (scene.textures.exists("main-menu-background")) {
    const image = scene.add.image(BACKGROUND_CENTER_X, BACKGROUND_CENTER_Y, "main-menu-background");
    const scale = Math.max(BACKGROUND_WIDTH / image.width, BACKGROUND_HEIGHT / image.height);

    image.setScale(scale);
    return true;
  }

  scene.add.rectangle(BACKGROUND_CENTER_X, BACKGROUND_CENTER_Y, BACKGROUND_WIDTH, BACKGROUND_HEIGHT, FALLBACK_COLOR);
  return false;
}
