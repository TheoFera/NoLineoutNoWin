import Phaser from "phaser";

export type ButtonVariant = "primary" | "secondary";

type ButtonPalette = {
  background: number;
  border: number;
  bevel: number;
  textColor: string;
};

export const BUTTON_STYLES: Record<ButtonVariant, ButtonPalette> = {
  primary: {
    background: 0xd79c17,
    border: 0x4a2b00,
    bevel: 0xf3c54d,
    textColor: "#161103"
  },
  secondary: {
    background: 0x16498f,
    border: 0x0a1d47,
    bevel: 0x2f73d1,
    textColor: "#f4f7fb"
  }
};

export function drawButtonStyle(
  shadow: Phaser.GameObjects.Graphics,
  button: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  variant: ButtonVariant
): void {
  const left = -width / 2;
  const top = -height / 2;
  const radius = Math.max(14, Math.round(height * 0.28));
  const inset = Math.max(6, Math.round(height * 0.12));
  const bevelHeight = Math.max(10, Math.round(height * 0.2));
  const lineWidth = Math.max(2, Math.round(height * 0.06));
  const style = BUTTON_STYLES[variant];

  shadow.clear();

  button.clear();
  button.fillStyle(style.background, 1);
  button.lineStyle(lineWidth, style.border, 1);
  button.fillRoundedRect(left, top, width, height, radius);
  button.strokeRoundedRect(left, top, width, height, radius);
  button.fillStyle(style.bevel, 0.6);
  button.fillRoundedRect(
    left + inset,
    top + inset,
    width - inset * 2,
    bevelHeight,
    Math.max(8, Math.round(radius / 2))
  );
}

export function getButtonFontSize(width: number, height: number, text: string): number {
  const heightBasedSize = Math.round(height * 0.42);
  const widthBasedSize = Math.round(width / Math.max(4.8, text.length * 0.62));
  return Math.max(12, Math.min(34, Math.min(heightBasedSize, widthBasedSize)));
}
