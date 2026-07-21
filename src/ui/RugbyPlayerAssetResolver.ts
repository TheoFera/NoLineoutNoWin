import type { BodyShapeName, PoseName } from "./RugbyPlayerTypes";

export type RugbyPlayerAssetSet = {
  bodyShape: BodyShapeName;
  pose: PoseName;
};

export const DEFAULT_RUGBY_PLAYER_ASSET_SET: RugbyPlayerAssetSet = {
  bodyShape: "medium_standard",
  pose: "stand_front"
};

export const AVAILABLE_RUGBY_PLAYER_ASSET_SETS: readonly RugbyPlayerAssetSet[] = [
  DEFAULT_RUGBY_PLAYER_ASSET_SET,
  { bodyShape: "medium_standard", pose: "hooker_throw_back" },
  { bodyShape: "medium_standard", pose: "lifter_front" }
];

const availableAssetSetKeys = new Set<string>(
  AVAILABLE_RUGBY_PLAYER_ASSET_SETS.map(({ bodyShape, pose }) => getAssetSetKey(bodyShape, pose))
);

export function hasRugbyPlayerAssetSet(bodyShape: BodyShapeName, pose: PoseName): boolean {
  return availableAssetSetKeys.has(getAssetSetKey(bodyShape, pose));
}

export function resolveRugbyPlayerAssetSet(bodyShape: BodyShapeName, pose: PoseName): RugbyPlayerAssetSet {
  if (hasRugbyPlayerAssetSet(bodyShape, pose)) {
    return { bodyShape, pose };
  }

  if (hasRugbyPlayerAssetSet(DEFAULT_RUGBY_PLAYER_ASSET_SET.bodyShape, pose)) {
    return { bodyShape: DEFAULT_RUGBY_PLAYER_ASSET_SET.bodyShape, pose };
  }

  return DEFAULT_RUGBY_PLAYER_ASSET_SET;
}

function getAssetSetKey(bodyShape: BodyShapeName, pose: PoseName): string {
  return `${bodyShape}:${pose}`;
}
