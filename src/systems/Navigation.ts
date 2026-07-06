import Phaser from "phaser";

type NavigationState = {
  sceneKey: string;
  data?: Record<string, unknown>;
};

let gameRef: Phaser.Game | null = null;

function canUseHistory(): boolean {
  return typeof window !== "undefined" && typeof window.history !== "undefined";
}

export function registerNavigation(game: Phaser.Game): void {
  gameRef = game;

  if (!canUseHistory()) {
    return;
  }

  window.addEventListener("popstate", (event: PopStateEvent) => {
    const state = event.state as NavigationState | null;
    if (!state?.sceneKey || !gameRef) {
      return;
    }

    gameRef.scene.start(state.sceneKey, state.data);
  });
}

export function replaceNavigationState(sceneKey: string, data?: Record<string, unknown>): void {
  if (!canUseHistory()) {
    return;
  }

  window.history.replaceState({ sceneKey, data } satisfies NavigationState, "");
}

export function navigateTo(scene: Phaser.Scene, sceneKey: string, data?: Record<string, unknown>): void {
  if (canUseHistory()) {
    window.history.pushState({ sceneKey, data } satisfies NavigationState, "");
  }

  scene.scene.start(sceneKey, data);
}
