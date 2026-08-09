import Phaser from "phaser";
import {
  AVAILABLE_RUGBY_PLAYER_ASSET_SETS,
  hasRugbyPlayerAssetSet,
  resolveRugbyPlayerAssetSet
} from "./RugbyPlayerAssetResolver";
import { RUGBY_PLAYER_BASE_LAYER_NAMES, RUGBY_PLAYER_LAYER_NAMES } from "./RugbyPlayerTypes";
import type { BodyShapeName, PlayerLayerName, PoseName } from "./RugbyPlayerTypes";

export const RUGBY_PLAYER_FRAME_WIDTH = 48;
export const RUGBY_PLAYER_FRAME_HEIGHT = 64;
export const RUGBY_PLAYER_REFERENCE_SOURCE_WIDTH = 170;
export const RUGBY_PLAYER_REFERENCE_SOURCE_HEIGHT = 370;

const RUGBY_PLAYER_ASSET_BASE_PATH = "assets/sprites/rugby-player";

export function getRugbyPlayerEqualHeightScale(
  sourceHeight: number,
  availableWidth: number,
  availableHeight: number
): number {
  const referenceScale = Math.min(
    availableWidth / RUGBY_PLAYER_REFERENCE_SOURCE_WIDTH,
    availableHeight / RUGBY_PLAYER_REFERENCE_SOURCE_HEIGHT
  );
  const referenceDisplayHeight = RUGBY_PLAYER_REFERENCE_SOURCE_HEIGHT * referenceScale;

  return referenceDisplayHeight / sourceHeight;
}

type RugbyPlayerLayerPaths = Record<PlayerLayerName, string>;

const HELMET_ASSET_SET_KEYS = new Set([
  "medium_standard:stand_front",
  "medium_standard:hand",
  "medium_standard:hooker_throw_back",
  "medium_standard:jumper",
  "medium_standard:lifter_front",
  "medium_large:hooker_throw_back"
]);

const BALD_ASSET_SET_KEYS = new Set([
  "medium_standard:stand_front",
  "medium_standard:hand",
  "medium_standard:hooker_throw_back",
  "medium_standard:jumper",
  "medium_standard:lifter_front",
  "medium_large:hooker_throw_back"
]);

const STRAP_ASSET_SET_KEYS = new Set([
  "medium_standard:stand_front",
  "medium_standard:hand",
  "medium_standard:hooker_throw_back",
  "medium_standard:jumper",
  "medium_standard:lifter_front"
]);

export function getRugbyPlayerAssetPaths(bodyShape: BodyShapeName, pose: PoseName): RugbyPlayerLayerPaths {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  const basePath = `${RUGBY_PLAYER_ASSET_BASE_PATH}/${resolvedAssetSet.bodyShape}/${resolvedAssetSet.pose}`;

  return {
    body: `${basePath}/body.png`,
    jersey: `${basePath}/jersey.png`,
    shorts: `${basePath}/shorts.png`,
    socks: `${basePath}/socks.png`,
    details: `${basePath}/details.png`,
    bodychauve: `${basePath}/bodychauve.png`,
    casque: `${basePath}/casque.png`,
    chauve: `${basePath}/chauve.png`,
    strap: `${basePath}/strap.png`
  };
}

export function getRugbyPlayerTextureKey(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): string {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  return `rugby-player:${resolvedAssetSet.bodyShape}:${resolvedAssetSet.pose}:${layer}`;
}

export function hasRugbyPlayerLayerAsset(bodyShape: BodyShapeName, pose: PoseName, layer: PlayerLayerName): boolean {
  const resolvedAssetSet = resolveAssetSet(bodyShape, pose);
  if (!hasRugbyPlayerAssetSet(resolvedAssetSet.bodyShape, resolvedAssetSet.pose)) {
    return false;
  }

  if ((RUGBY_PLAYER_BASE_LAYER_NAMES as readonly PlayerLayerName[]).includes(layer)) {
    return true;
  }

  const assetSetKey = `${resolvedAssetSet.bodyShape}:${resolvedAssetSet.pose}`;
  if (layer === "casque") {
    return HELMET_ASSET_SET_KEYS.has(assetSetKey);
  }
  if (layer === "bodychauve" || layer === "chauve") {
    return BALD_ASSET_SET_KEYS.has(assetSetKey);
  }
  if (layer === "strap") {
    return STRAP_ASSET_SET_KEYS.has(assetSetKey);
  }
  return false;
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

export function useCrispRugbyPlayerTextures(textures: Phaser.Textures.TextureManager): void {
  for (const { bodyShape, pose } of AVAILABLE_RUGBY_PLAYER_ASSET_SETS) {
    for (const layer of RUGBY_PLAYER_LAYER_NAMES) {
      const textureKey = getRugbyPlayerTextureKey(bodyShape, pose, layer);
      if (textures.exists(textureKey)) {
        textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
  }
}

function resolveAssetSet(bodyShape: BodyShapeName, pose: PoseName): { bodyShape: BodyShapeName; pose: PoseName } {
  return resolveRugbyPlayerAssetSet(bodyShape, pose);
}
