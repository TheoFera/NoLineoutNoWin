import Phaser from "phaser";

export type SquadTravelPosition = { id: string; x: number; y: number };
export type SquadTravelTarget = SquadTravelPosition & {
  move: (x: number, y: number, progress: number) => void;
  finish: () => void;
};

/** Déplace les vrais sprites de la scène entrante depuis leurs positions précédentes. */
export function animateSquadTravel(
  scene: Phaser.Scene, from: SquadTravelPosition[] | undefined, targets: SquadTravelTarget[]
): void {
  if (!from?.length) return;
  const positions = new Map(from.map((position) => [position.id, position]));
  const moving = targets.flatMap((target) => {
    const start = positions.get(target.id);
    return start ? [{ target, start }] : [];
  });
  if (!moving.length) return;
  scene.input.enabled = false;
  const state = { progress: 0 };
  const update = (): void => moving.forEach(({ target, start }) => target.move(
    Phaser.Math.Linear(start.x, target.x, state.progress),
    Phaser.Math.Linear(start.y, target.y, state.progress), state.progress
  ));
  const restoreInput = (): void => { scene.input.enabled = true; };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, restoreInput);
  update();
  scene.tweens.add({ targets: state, progress: 1, duration: 950, ease: "Sine.easeInOut",
    onUpdate: update,
    onComplete: () => {
      moving.forEach(({ target }) => target.finish());
      restoreInput();
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, restoreInput);
    }
  });
}
