import Phaser from "phaser";

export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  scene.scene.start(key, data);
}
