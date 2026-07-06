import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ClubCreationScene } from "./scenes/ClubCreationScene";
import { TrainingScene } from "./scenes/TrainingScene";
import { MatchScene } from "./scenes/MatchScene";
import { LineoutScene } from "./scenes/LineoutScene";
import { TeamScene } from "./scenes/TeamScene";
import { ChampionshipScene } from "./scenes/ChampionshipScene";
import { OptionsScene } from "./scenes/OptionsScene";
import { ResultScene } from "./scenes/ResultScene";

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#10271b",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    ClubCreationScene,
    TrainingScene,
    MatchScene,
    LineoutScene,
    TeamScene,
    ChampionshipScene,
    OptionsScene,
    ResultScene
  ]
};
