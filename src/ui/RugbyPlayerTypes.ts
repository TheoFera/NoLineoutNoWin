export const RUGBY_PLAYER_POSE_NAMES = [
  "stand_front",
  "stand_back",
  "hooker_ready_back",
  "hooker_throw_back",
  "jumper_catch_front",
  "lifter_front",
  "lifter_back",
  "receiver_front"
] as const;

export type PoseName = typeof RUGBY_PLAYER_POSE_NAMES[number];

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

export type Kit = {
  jerseyPrimary: number;
  shortsPrimary: number;
  socksPrimary: number;
  detailsSecondary: number;
};

export const RUGBY_PLAYER_LAYER_NAMES = ["body", "jersey", "shorts", "socks", "details"] as const;

export type PlayerLayerName = typeof RUGBY_PLAYER_LAYER_NAMES[number];

export type PlayerBodyMetrics = {
  height: number;
  width: number;
};

export function getBodyShapeForPlayer(player: PlayerBodyMetrics): BodyShapeName {
  const size = player.height < 180 ? "small" : player.height < 192 ? "medium" : "large";
  const build = player.width < 86 ? "slim" : player.width < 100 ? "standard" : "large";

  return `${size}_${build}` as BodyShapeName;
}
