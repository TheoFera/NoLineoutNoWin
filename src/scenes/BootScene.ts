import Phaser from "phaser";
import { GameStore } from "../state/GameStore";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("main-menu-background", "assets/images/main-menu-background.png");
  }

  create(): void {
    GameStore.boot();
    this.scene.start("PreloadScene");
  }
}
