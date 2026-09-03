import type { PlayerAppearance } from "./PlayerAppearance";

export type FieldPlayerStatName = "speed" | "strength" | "technique";

export type PlayerRole = "field" | "hooker";

export type FieldPlayer = {
  id: string;
  role: "field";
  number: number;
  nickname: string;
  appearance: PlayerAppearance;
  speed: number;
  strength: number;
  technique: number;
};

export type Hooker = {
  id: string;
  role: "hooker";
  number: 2;
  nickname: string;
  appearance: PlayerAppearance;
  throwing: number;
};

export type Player = FieldPlayer | Hooker;

export function isHooker(player: Player): player is Hooker {
  return player.role === "hooker";
}

