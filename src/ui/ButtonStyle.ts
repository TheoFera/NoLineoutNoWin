import Phaser from "phaser";
import { UI } from "./UITheme";

export type ButtonVariant = "primary" | "secondary" | "selected" | "danger" | "dangerFilled" | "ghost";
export type ButtonVisualState = "normal" | "pressed" | "disabled";

type ButtonPalette = {
  background: number;
  border: number;
  pressedBackground: number;
  textColor: string;
  shadow: number;
};

export const BUTTON_STYLES: Record<ButtonVariant, ButtonPalette> = {
  primary: {
    background: UI.colors.accent,
    border: UI.colors.accentStrong,
    pressedBackground: UI.colors.accentStrong,
    textColor: UI.colors.textOnAccent,
    shadow: UI.colors.scrim
  },
  secondary: {
    background: UI.colors.panelDark,
    border: UI.colors.outline,
    pressedBackground: UI.colors.panelRaised,
    textColor: UI.colors.text,
    shadow: UI.colors.scrim
  },
  selected: {
    background: UI.colors.panelRaised,
    border: UI.colors.accent,
    pressedBackground: UI.colors.panel,
    textColor: UI.colors.textAccent,
    shadow: UI.colors.scrim
  },
  danger: {
    background: UI.colors.panelDark,
    border: UI.colors.danger,
    pressedBackground: UI.colors.dangerSurface,
    textColor: UI.colors.textDanger,
    shadow: UI.colors.scrim
  },
  dangerFilled: {
    background: UI.colors.danger,
    border: UI.colors.dangerSurface,
    pressedBackground: UI.colors.dangerSurface,
    textColor: UI.colors.text,
    shadow: UI.colors.scrim
  },
  ghost: {
    background: UI.colors.panelDark,
    border: UI.colors.panelDark,
    pressedBackground: UI.colors.panelRaised,
    textColor: UI.colors.muted,
    shadow: UI.colors.scrim
  }
};

export function drawButtonStyle(
  shadow: Phaser.GameObjects.Graphics,
  button: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: ButtonVariant,
  state: ButtonVisualState = "normal"
): void {
  const left = -width / 2;
  const top = -height / 2;
  const radius = Math.min(14, Math.max(10, Math.round(height * 0.24)));
  const lineWidth = 2;
  const style = BUTTON_STYLES[variant];
  const pressedOffset = state === "pressed" ? UI.motion.pressOffset : 0;
  const alpha = state === "disabled" ? 0.46 : 1;

  shadow.clear();
  shadow.fillStyle(style.shadow, state === "pressed" ? 0.12 : 0.28);
  shadow.fillRoundedRect(left, top + 4, width, height, radius);

  button.clear();
  button.fillStyle(state === "pressed" ? style.pressedBackground : style.background, alpha);
  button.lineStyle(lineWidth, style.border, alpha);
  button.fillRoundedRect(left, top + pressedOffset, width, height, radius);
  button.strokeRoundedRect(left, top + pressedOffset, width, height, radius);
}

export function getButtonFontSize(width: number, height: number, text: string): number {
  const heightBasedSize = Math.round(height * 0.42);
  const widthBasedSize = Math.round(width / Math.max(4.8, text.length * 0.62));
  return Math.max(12, Math.min(34, Math.min(heightBasedSize, widthBasedSize)));
}
