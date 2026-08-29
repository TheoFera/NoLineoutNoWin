import Phaser from "phaser";

export function startSceneCrossfade(
  fromScene: Phaser.Scene,
  targetSceneKey: string,
  data: Record<string, unknown>,
  duration: number
): boolean {
  const targetScene = fromScene.scene.get(targetSceneKey);
  const fromCamera = fromScene.cameras.main;

  fromCamera.setAlpha(1);

  const started = fromScene.scene.transition({
    target: targetSceneKey,
    duration,
    data,
    moveAbove: true,
    allowInput: false,
    onUpdate: (progress: number): void => {
      const blend = Phaser.Math.Easing.Sine.InOut(progress);
      // La scène sortante reste opaque sous la nouvelle pour éviter un creux sombre à mi-fondu.
      fromCamera.setAlpha(1);
      targetScene.cameras?.main?.setAlpha(blend);
    }
  });

  if (!started) {
    fromCamera.setAlpha(1);
  }

  return started;
}
