import Phaser from "phaser";
import { RUGBY_PLAYER_LAYER_NAMES } from "./RugbyPlayerTypes";
import type { BodyShapeName, PlayerLayerName, PoseName } from "./RugbyPlayerTypes";

export const RUGBY_PLAYER_FRAME_WIDTH = 48;
export const RUGBY_PLAYER_FRAME_HEIGHT = 64;

const RUGBY_PLAYER_ASSET_BASE_PATH = "assets/sprites/rugby-player";
const FALLBACK_BODY_SHAPE: BodyShapeName = "medium_standard";
const FALLBACK_POSE: PoseName = "stand_front";

const AVAILABLE_RUGBY_PLAYER_ASSET_SETS = [
  { bodyShape: FALLBACK_BODY_SHAPE, pose: FALLBACK_POSE }
] as const;

const availableAssetSetKeys = new Set<string>(
  AVAILABLE_RUGBY_PLAYER_ASSET_SETS.map(({ bodyShape, pose }) => getAssetSetKey(bodyShape, pose))
);

type RugbyPlayerLayerPaths = {
  body: string;
  jersey: string;
  shorts: string;
  socks: string;
  details: string;
};

export function getRugbyPlayerAssetPaths(bodyShape: BodyShapeName, pose: PoseName): RugbyPlayerLayerPaths {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  const basePath = `${RUGBY_PLAYER_ASSET_BASE_PATH}/${resolvedAssetSet.bodyShape}/${resolvedAssetSet.pose}`;

  return {
    body: `${basePath}/body.png`,
    jersey: `${basePath}/jersey.png`,
    shorts: `${basePath}/shorts.png`,
    socks: `${basePath}/socks.png`,
    details: `${basePath}/details.png`
  };
}

export function getRugbyPlayerTextureKey(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): string {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  return `rugby-player:${resolvedAssetSet.bodyShape}:${resolvedAssetSet.pose}:${layer}`;
}

export function hasRugbyPlayerLayerAsset(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): boolean {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  return RUGBY_PLAYER_LAYER_NAMES.includes(layer)
    && availableAssetSetKeys.has(getAssetSetKey(resolvedAssetSet.bodyShape, resolvedAssetSet.pose));
}

export function preloadRugbyPlayerAssets(loader: Phaser.Loader.LoaderPlugin): void {
  for (const { bodyShape, pose } of AVAILABLE_RUGBY_PLAYER_ASSET_SETS) {
    const assets = getRugbyPlayerAssetPaths(bodyShape, pose);

    for (const layer of RUGBY_PLAYER_LAYER_NAMES) {
      if (!hasRugbyPlayerLayerAsset(bodyShape, pose, layer)) {
        continue;
      }

      loader.image(getRugbyPlayerTextureKey(bodyShape, pose, layer), assets[layer]);
    }
  }
}

function getAssetSetKey(bodyShape: BodyShapeName, pose: PoseName): string {
  return `${bodyShape}:${pose}`;
}

function resolveAssetSet(bodyShape: BodyShapeName, pose: PoseName): { bodyShape: BodyShapeName; pose: PoseName } {
  if (availableAssetSetKeys.has(getAssetSetKey(bodyShape, pose))) {
    return { bodyShape, pose };
  }

  return { bodyShape: FALLBACK_BODY_SHAPE, pose: FALLBACK_POSE };
}
