export const RUGBY_PLAYER_BODY_SHAPE_NAMES = [
  "small_slim",
  "small_standard",
  "small_large",
  "medium_slim",
  "medium_standard",
  "medium_large",
  "large_slim",
  "large_standard",
  "large_large"
] as const;

export type BodyShapeName = typeof RUGBY_PLAYER_BODY_SHAPE_NAMES[number];

export const PLAYER_SKIN_TONE_IDS = [
  "base",
  "warmLight",
  "tan",
  "brown",
  "deep"
] as const;

export type PlayerSkinToneId = typeof PLAYER_SKIN_TONE_IDS[number];

export const PLAYER_HAIR_STYLE_IDS = [
  "short",
  "bald",
  "mullet",
  "bun"
] as const;

export type PlayerHairStyleId = typeof PLAYER_HAIR_STYLE_IDS[number];

export const PLAYER_ACCESSORY_IDS = [
  "none",
  "helmet",
  "strap",
  "moustache",
  "beard"
] as const;

export type PlayerAccessoryId = typeof PLAYER_ACCESSORY_IDS[number];

export type PlayerAppearance = {
  bodyShape: BodyShapeName;
  skinToneId: PlayerSkinToneId;
  hairStyleId: PlayerHairStyleId;
  accessoryId: PlayerAccessoryId;
};
