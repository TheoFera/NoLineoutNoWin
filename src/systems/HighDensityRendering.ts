import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/DisplayConfig";

export function installHighDensityRendering(game: Phaser.Game, renderScale: 1 | 2): void {
  if (renderScale === 1) {
    return;
  }

  for (const scene of game.scene.getScenes(false)) {
    const applyLogicalViewport = (): void => {
      scene.cameras.main
        .setViewport(0, 0, GAME_WIDTH * renderScale, GAME_HEIGHT * renderScale)
        .setZoom(renderScale)
        .centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    };

    scene.events.on(Phaser.Scenes.Events.START, applyLogicalViewport);
    scene.events.on(
      Phaser.Scenes.Events.ADDED_TO_SCENE,
      (gameObject: Phaser.GameObjects.GameObject): void => {
        if (gameObject instanceof Phaser.GameObjects.Text) {
          gameObject.setResolution(renderScale);
        }
      }
    );

    if (scene.sys.isActive()) {
      applyLogicalViewport();
    }
  }
}
