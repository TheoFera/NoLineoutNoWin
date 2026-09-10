import Phaser from "phaser";
import type { Player } from "../models/Player";
import type { JerseyColors } from "../models/Team";
import { RugbyPlayer } from "./RugbyPlayer";
import { getPlayerSkinTint } from "./PlayerSkinTone";
import { UI } from "./UITheme";
import { TRAINING_PLAYER_SIZE } from "../config/DisplayConfig";
import { PlayerGroundShadow } from "./PlayerGroundShadow";

export function renderSquadPlayer(
  scene: Phaser.Scene, x: number, y: number, player: Player, colors: JerseyColors,
  height = TRAINING_PLAYER_SIZE.height, width = TRAINING_PLAYER_SIZE.width * height / TRAINING_PLAYER_SIZE.height,
  showNumber = true
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = new PlayerGroundShadow(scene, 0, 0, width, height, player.appearance.bodyShape, "stand_front");
  const body = new RugbyPlayer(scene, 0, 0, "stand_front", {
    jerseyPrimary: colors.primary, shortsPrimary: colors.secondary,
    socksPrimary: colors.primary, detailsSecondary: colors.secondary
  }, player.appearance.bodyShape, getPlayerSkinTint(player), player.appearance.hairStyleId,
  player.appearance.accessoryIds).setVisualSize(width, height);
  container.setData("squadBody", body);
  const number = scene.add.text(0, -height * 0.43, String(player.number), {
    font: "bold 12px Arial", color: UI.colors.text, stroke: UI.colors.textStroke, strokeThickness: 2
  }).setOrigin(0.5).setVisible(showNumber);
  container.add([shadow, body, number]);
  return container;
}

export function renderRecruitmentPortrait(
  scene: Phaser.Scene, x: number, y: number, player: Player, colors: JerseyColors
): Phaser.GameObjects.Container {
  const portrait = renderSquadPlayer(scene, x, y + 80, player, colors, 142, undefined, false);
  const body = portrait.getData("squadBody") as RugbyPlayer;
  portrait.getAt(0).setActive(false);
  (portrait.getAt(0) as Phaser.GameObjects.Container).setVisible(false);
  body.list.forEach((layer) => {
    if (layer instanceof Phaser.GameObjects.Image) layer.setCrop(0, 0, layer.width, layer.height * 0.56);
  });
  return portrait;
}

export function renderBenchPlayerPortrait(
  scene: Phaser.Scene, x: number, y: number, player: Player, colors: JerseyColors
): Phaser.GameObjects.Container {
  // Même taille que sur le terrain ; le portrait est coupé à la base de la carte.
  const portrait = renderSquadPlayer(scene, x, y, player, colors, TRAINING_PLAYER_SIZE.height, undefined, false);
  const body = portrait.getData("squadBody") as RugbyPlayer;
  // Remonte le buste de 30 % des 76 px du cadre, sans déplacer sa zone de sélection.
  const portraitRise = Math.ceil(76 * 0.3);
  body.setY(TRAINING_PLAYER_SIZE.height / 2 - portraitRise);
  (portrait.getAt(0) as Phaser.GameObjects.Container).setVisible(false);
  body.list.forEach((layer) => {
    if (layer instanceof Phaser.GameObjects.Image) {
      // L'ancrage du portrait se situe 8 px au-dessus du bas de la carte.
      const cropHeight = layer.displayOriginY + (8 - body.y) / layer.scaleY;
      layer.setCrop(0, 0, layer.width, Phaser.Math.Clamp(cropHeight, 0, layer.height));
    }
  });
  return portrait;
}
