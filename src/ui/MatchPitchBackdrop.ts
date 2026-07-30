import Phaser from "phaser";

export const MATCH_PITCH_TEXTURE_KEY = "lineout-pitch-background";

const MATCH_PITCH_TEXTURE_PATH = "assets/images/lineout-pitch-training.png";
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

export function preloadMatchPitchBackdrop(scene: Phaser.Scene): void {
  if (!scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.load.image(MATCH_PITCH_TEXTURE_KEY, MATCH_PITCH_TEXTURE_PATH);
  }
}

export function renderMatchPitchBackdrop(scene: Phaser.Scene, overlayAlpha: number): void {
  scene.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x09131c);

  if (scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, MATCH_PITCH_TEXTURE_KEY)
      .setDisplaySize(SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  scene.add.rectangle(
    SCREEN_WIDTH / 2,
    SCREEN_HEIGHT / 2,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    0x020617,
    overlayAlpha
  );
}

export function renderPitchSurface(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  if (scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.add.image(x, y, MATCH_PITCH_TEXTURE_KEY).setDisplaySize(width, height);
    return;
  }

  scene.add.rectangle(x, y, width, height, 0x1f6d45);
}
