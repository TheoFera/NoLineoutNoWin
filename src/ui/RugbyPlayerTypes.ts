export { RUGBY_PLAYER_BODY_SHAPE_NAMES } from "../models/PlayerAppearance";
export type {
  BodyShapeName,
  PlayerAccessoryId,
  PlayerHairStyleId
} from "../models/PlayerAppearance";

export const RUGBY_PLAYER_POSE_NAMES = [
  "stand_front",
  "stand_back",
  "hand",
  "hooker_ready_back",
  "hooker_throw_back",
  "jumper",
  "jumper_catch_front",
  "lifter_front",
  "lifter_back",
  "receiver_front"
] as const;

export type PoseName = typeof RUGBY_PLAYER_POSE_NAMES[number];

export const RUGBY_PLAYER_WALKING_FRAME_NAMES = ["gauche", "droite"] as const;

export type RugbyPlayerWalkingFrame = typeof RUGBY_PLAYER_WALKING_FRAME_NAMES[number];

export type Kit = {
  jerseyPrimary: number;
  shortsPrimary: number;
  socksPrimary: number;
  detailsSecondary: number;
};

export const RUGBY_PLAYER_BASE_LAYER_NAMES = ["body", "jersey", "shorts", "socks", "details"] as const;
export const RUGBY_PLAYER_OPTIONAL_LAYER_NAMES = ["bodychauve", "casque", "chauve", "strap"] as const;
export const RUGBY_PLAYER_LAYER_NAMES = [
  ...RUGBY_PLAYER_BASE_LAYER_NAMES,
  ...RUGBY_PLAYER_OPTIONAL_LAYER_NAMES
] as const;

export type PlayerLayerName = typeof RUGBY_PLAYER_LAYER_NAMES[number];
