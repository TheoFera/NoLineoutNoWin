import Phaser from "phaser";

export function playClick(scene: Phaser.Scene): void {
  // À remplacer par un vrai son quand assets/sounds/click.mp3 existe.
  scene.sound.stopByKey("click");
}
