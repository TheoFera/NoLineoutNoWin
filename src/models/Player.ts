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

const JUMPER_NUMBERS = new Set<number>([4, 6, 7, 8]);
const LIFTER_NUMBERS = new Set<number>([1, 3, 4, 5, 8]);

export function isJumperNumber(number: number): boolean {
  return JUMPER_NUMBERS.has(number);
}

export function isLifterNumber(number: number): boolean {
  return LIFTER_NUMBERS.has(number);
}

export function isFieldPlayer(player: Player): player is FieldPlayer {
  return player.role === "field";
}

export function isHooker(player: Player): player is Hooker {
  return player.role === "hooker";
}

export function isLikelyJumper(player: FieldPlayer): boolean {
  return isJumperNumber(player.number);
}

export function isLikelyLifter(player: FieldPlayer): boolean {
  return isLifterNumber(player.number);
}
