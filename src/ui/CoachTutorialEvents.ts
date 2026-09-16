import type Phaser from "phaser";

export function coachAction(scene: Phaser.Scene, action: string): void {
  scene.events.emit("coach-action", action);
}

export function coachControl<T extends Phaser.GameObjects.GameObject>(target: T, anchor: string, action?: string): T {
  target.setData("tutorial-anchor", anchor);
  if (action) target.setData("coach-action", action);
  return target;
}
