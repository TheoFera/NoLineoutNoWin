import Phaser from "phaser";
import { GameStore } from "../state/GameStore";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    GameStore.boot();
    this.scene.start("PreloadScene");
  }
}
