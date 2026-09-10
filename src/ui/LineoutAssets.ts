import Phaser from "phaser";
import { preloadMatchPitchBackdrop } from "./MatchPitchBackdrop";

/** Charge dès le démarrage les images nécessaires à l'entrée sur le terrain. */
export function preloadLineoutAssets(scene: Phaser.Scene): void {
  preloadMatchPitchBackdrop(scene);
  for (const [key, path] of [
    ["lineout-ball", "assets/sprites/ball.png"],
    ["lineout-ball-twist", "assets/sprites/ball2.png"]
  ]) {
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  }
}
