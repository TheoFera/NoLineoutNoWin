export type FieldPlayerStatName = "jump" | "lift" | "hands";

export type PlayerRole = "field" | "hooker";

export type FieldPlayer = {
  id: string;
  role: "field";
  number: number;
  nickname: string;
  height: number;
  width: number;
  jump: number;
  lift: number;
  hands: number;
};

export type Hooker = {
  id: string;
  role: "hooker";
  number: 2;
  nickname: string;
  height: number;
  width: number;
  throwing: number;
};

export type Player = FieldPlayer | Hooker;

export function isFieldPlayer(player: Player): player is FieldPlayer {
  return player.role === "field";
}

export function isHooker(player: Player): player is Hooker {
  return player.role === "hooker";
}
