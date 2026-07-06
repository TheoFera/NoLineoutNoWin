import Phaser from "phaser";
import "./style.css";
import { gameConfig } from "./gameConfig";
import { registerNavigation } from "./systems/Navigation";

const screenOrientation = typeof screen !== "undefined" ? (screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> }) : undefined;
if (screenOrientation?.lock) {
  screenOrientation.lock("portrait").catch(() => undefined);
}

const game = new Phaser.Game(gameConfig);
registerNavigation(game);
