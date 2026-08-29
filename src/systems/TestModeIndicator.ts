import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { t } from "./I18n";
import { pushNavigationState } from "./Navigation";
import { UI_DEPTH } from "../ui/UIDepth";
import { UI } from "../ui/UITheme";

type TestModeOverlay = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
};

export function registerTestModeIndicator(game: Phaser.Game): void {
  const overlays = new Map<Phaser.Scene, TestModeOverlay>();

  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const state = GameStore.getTestModeState();
    if (!state) {
      destroyOverlays(overlays);
      return;
    }

    const activeScenes = game.scene.getScenes(true);
    for (const [scene, overlay] of overlays) {
      if (!activeScenes.includes(scene)) {
        if (overlay.container.active) overlay.container.destroy();
        overlays.delete(scene);
      }
    }

    const label = t("testMode.banner").replace(
      "{division}",
      t(`division.${state.divisionId}`)
    );
    for (const scene of activeScenes) {
      const current = overlays.get(scene);
      if (current?.container.active) {
        current.label.setText(label);
        continue;
      }

      overlays.set(scene, createOverlay(scene, label));
    }
  });
}

function createOverlay(scene: Phaser.Scene, label: string): TestModeOverlay {
  const background = scene.add.rectangle(0, 0, 188, 22, UI.colors.panelDark, 0.96)
    .setStrokeStyle(1, UI.colors.warning);
  const hitArea = scene.add.zone(0, 0, 188, 48)
    .setInteractive({ useHandCursor: true })
    .on("pointerup", () => {
      pushNavigationState("TestModeScene");
      scene.scene.start("TestModeScene");
    });
  const text = scene.add.text(0, 0, label, {
    font: UI.font.caption,
    color: UI.colors.textAccent,
    align: "center"
  }).setOrigin(0.5);
  const container = scene.add.container(294, 15, [background, text, hitArea])
    .setDepth(UI_DEPTH.overlayContent + 100)
    .setScrollFactor(0);

  return { container, label: text };
}

function destroyOverlays(overlays: Map<Phaser.Scene, TestModeOverlay>): void {
  for (const overlay of overlays.values()) {
    if (overlay.container.active) overlay.container.destroy();
  }
  overlays.clear();
}
