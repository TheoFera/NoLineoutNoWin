import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ClubCreationScene } from "./scenes/ClubCreationScene";
import { MatchScene } from "./scenes/MatchScene";
import { LineoutScene } from "./scenes/LineoutScene";
import { TeamScene } from "./scenes/TeamScene";
import { ChampionshipScene } from "./scenes/ChampionshipScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { ResultScene } from "./scenes/ResultScene";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#10271b",
  audio: {
    noAudio: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    ClubCreationScene,
    MatchScene,
    LineoutScene,
    TeamScene,
    ChampionshipScene,
    SettingsScene,
    ResultScene
  ]
};
