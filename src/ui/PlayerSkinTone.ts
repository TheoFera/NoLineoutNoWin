import type { PlayerSkinToneId } from "../models/PlayerAppearance";

export const PLAYER_SKIN_TONE_OPTIONS: ReadonlyArray<{
  id: PlayerSkinToneId;
  tint: number;
}> = [
  { id: "base", tint: 0xffffff },
  { id: "warmLight", tint: 0xffe3cf },
  { id: "tan", tint: 0xe7bc9b },
  { id: "brown", tint: 0xc99070 },
  { id: "deep", tint: 0xa66f55 }
] as const;

export function getSkinToneTint(skinToneId: PlayerSkinToneId): number {
  return PLAYER_SKIN_TONE_OPTIONS.find((option) => option.id === skinToneId)?.tint ?? 0xffffff;
}

export function getPlayerSkinTint(player: { appearance: { skinToneId: PlayerSkinToneId } }): number {
  return getSkinToneTint(player.appearance.skinToneId);
}
