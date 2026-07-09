import Phaser from "phaser";
import { RUGBY_PLAYER_BODY_SHAPE_NAMES, RUGBY_PLAYER_LAYER_NAMES, RUGBY_PLAYER_POSE_NAMES } from "./RugbyPlayerTypes";
import type { BodyShapeName, PlayerLayerName, PoseName } from "./RugbyPlayerTypes";

export const RUGBY_PLAYER_FRAME_WIDTH = 48;
export const RUGBY_PLAYER_FRAME_HEIGHT = 64;

const RUGBY_PLAYER_ASSET_BASE_PATH = "assets/sprites/rugby-player";

type RugbyPlayerLayerPaths = {
  body: string;
  jersey: string;
  shorts: string;
  socks: string;
  details: string;
};

export function getRugbyPlayerAssetPaths(bodyShape: BodyShapeName, pose: PoseName): RugbyPlayerLayerPaths {
  const basePath = `${RUGBY_PLAYER_ASSET_BASE_PATH}/${bodyShape}/${pose}`;

  return {
    body: `${basePath}/body.png`,
    jersey: `${basePath}/jersey.png`,
    shorts: `${basePath}/shorts.png`,
    socks: `${basePath}/socks.png`,
    details: `${basePath}/details.png`
  };
}

export function getRugbyPlayerTextureKey(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): string {
  return `rugby-player:${bodyShape}:${pose}:${layer}`;
}

export function hasRugbyPlayerLayerAsset(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): boolean {
  return true;
}

export function preloadRugbyPlayerAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const bodyShape of RUGBY_PLAYER_BODY_SHAPE_NAMES) {
    for (const pose of RUGBY_PLAYER_POSE_NAMES) {
      const assets = getRugbyPlayerAssetPaths(bodyShape, pose);

      for (const layer of RUGBY_PLAYER_LAYER_NAMES) {
        if (!hasRugbyPlayerLayerAsset(bodyShape, pose, layer)) {
          continue;
        }

        loader.image(getRugbyPlayerTextureKey(bodyShape, pose, layer), assets[layer]);
      }
    }
  }
}
