import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { ClubCreationScene } from "./scenes/ClubCreationScene";
import { TeamCreationScene } from "./scenes/TeamCreationScene";
import { MatchScene } from "./scenes/MatchScene";
import { LineoutScene } from "./scenes/LineoutScene";
import { TeamScene } from "./scenes/TeamScene";
import { ChampionshipScene } from "./scenes/ChampionshipScene";
import { CombinationListScene } from "./scenes/CombinationListScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { ResultScene } from "./scenes/ResultScene";
import { SeasonResultScene } from "./scenes/SeasonResultScene";
import { PlayerProgressionScene } from "./scenes/PlayerProgressionScene";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/DisplayConfig";
import { getRenderScale } from "./systems/DisplaySettings";
import { installHighDensityRendering } from "./systems/HighDensityRendering";

const renderScale = getRenderScale();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH * renderScale,
  height: GAME_HEIGHT * renderScale,
  backgroundColor: "#08142c",
  scale: {
    mode: Phaser.Scale.NONE
  },
  callbacks: {
    postBoot: (game) => installHighDensityRendering(game, renderScale)
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    ClubCreationScene,
    TeamCreationScene,
    MatchScene,
    LineoutScene,
    TeamScene,
    ChampionshipScene,
    CombinationListScene,
    SettingsScene,
    ResultScene,
    PlayerProgressionScene,
    SeasonResultScene
  ]
};
