import Phaser from "phaser";
import { renderMainMenuBackground } from "./MainMenuBackground";
import { UI } from "./UITheme";

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const SCREEN_CENTER_X = 195;
const SCREEN_CENTER_Y = 422;

type MenuBackdropVariant = "hero" | "field";

type MenuBackdropOptions = {
  overlayAlpha?: number;
  showGuideLines?: boolean;
  variant?: MenuBackdropVariant;
};

type MenuHeaderOptions = {
  subtitle?: string;
  y?: number;
};

type MenuPanelOptions = {
  accentColor?: number;
  fillAlpha?: number;
  fillColor?: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

export function renderMenuBackdrop(scene: Phaser.Scene, options: MenuBackdropOptions = {}): boolean {
  const variant = options.variant ?? "field";
  const showGuideLines = options.showGuideLines ?? true;
  const usedHeroBackground = variant === "hero" && renderMainMenuBackground(scene);

  if (!usedHeroBackground) {
    renderFieldBackdrop(scene, showGuideLines);
  }

  scene.add.rectangle(
    SCREEN_CENTER_X,
    SCREEN_CENTER_Y,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    UI.colors.scrim,
    options.overlayAlpha ?? (variant === "hero" ? 0.42 : 0.28)
  );

  if (showGuideLines) {
    scene.add.rectangle(SCREEN_CENTER_X, 146, 312, 3, UI.colors.divider, 0.25);
    scene.add.rectangle(SCREEN_CENTER_X, 698, 312, 3, UI.colors.divider, 0.22);
    scene.add.rectangle(60, SCREEN_CENTER_Y, 2, 610, UI.colors.divider, 0.12);
    scene.add.rectangle(330, SCREEN_CENTER_Y, 2, 610, UI.colors.divider, 0.12);
  }

  return usedHeroBackground;
}

export function renderMenuHeader(scene: Phaser.Scene, title: string, options: MenuHeaderOptions = {}): void {
  const y = options.y ?? 98;
  scene.add.text(SCREEN_CENTER_X, y - (options.subtitle ? 12 : 0), title, {
    font: UI.font.title,
    color: UI.colors.text,
    align: "center",
    wordWrap: { width: 280 }
  }).setOrigin(0.5);

  if (options.subtitle) {
    scene.add.text(SCREEN_CENTER_X, y + 22, options.subtitle, {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 280 }
    }).setOrigin(0.5);
  }
}

export function renderMenuPanel(scene: Phaser.Scene, options: MenuPanelOptions): Phaser.GameObjects.Graphics {
  return createRoundedPanel(scene, options.x, options.y, options.width, options.height, {
    accentColor: options.accentColor ?? UI.colors.accent,
    fillAlpha: options.fillAlpha ?? 0.92,
    fillColor: options.fillColor ?? UI.colors.panelDark
  });
}

function renderFieldBackdrop(scene: Phaser.Scene, showGuideLines: boolean): void {
  scene.add.rectangle(SCREEN_CENTER_X, SCREEN_CENTER_Y, SCREEN_WIDTH, SCREEN_HEIGHT, UI.colors.background);

  for (let index = 0; index < 10; index += 1) {
    const y = 84 + index * 76;
    const color = index % 2 === 0 ? UI.colors.panelAlternate : UI.colors.panel;
    scene.add.rectangle(SCREEN_CENTER_X, y, SCREEN_WIDTH, 78, color, 1);
  }

  if (showGuideLines) {
    scene.add.rectangle(SCREEN_CENTER_X, 214, 314, 3, UI.colors.divider, 0.25);
    scene.add.rectangle(SCREEN_CENTER_X, 422, 314, 3, UI.colors.divider, 0.2);
    scene.add.rectangle(SCREEN_CENTER_X, 630, 314, 3, UI.colors.divider, 0.25);
  }
}

function createRoundedPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: { accentColor: number; fillAlpha: number; fillColor: number; }
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  const left = x - width / 2;
  const top = y - height / 2;
  const radius = UI.radius;

  graphics.fillStyle(UI.colors.scrim, 0.22);
  graphics.fillRoundedRect(left + 4, top + 8, width, height, radius);
  graphics.fillStyle(colors.fillColor, colors.fillAlpha);
  graphics.lineStyle(2, colors.accentColor, 0.95);
  graphics.fillRoundedRect(left, top, width, height, radius);
  graphics.strokeRoundedRect(left, top, width, height, radius);

  return graphics;
}
