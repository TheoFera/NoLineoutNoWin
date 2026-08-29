import Phaser from "phaser";

export const TUTORIAL_ANCHOR_DATA_KEY = "tutorial-anchor";

export type TutorialAnchorId =
  | "combinations.attack"
  | "combinations.defense"
  | "combination.placement"
  | "combination.phase"
  | "combination.add-phase"
  | "combination.remove-phase"
  | "combination.train";

export function markTutorialAnchor<T extends Phaser.GameObjects.GameObject>(
  target: T,
  anchorId: TutorialAnchorId
): T {
  target.setData(TUTORIAL_ANCHOR_DATA_KEY, anchorId);
  return target;
}
