import Phaser from "phaser";
import { getButtonFontSize, type ButtonVariant } from "./ButtonStyle";
import { UIButton } from "./UIButton";

type MainMenuButtonOptions = {
  variant?: ButtonVariant;
};

export class MainMenuButton extends UIButton {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    options: MainMenuButtonOptions = {}
  ) {
    super(scene, x, y, width, height, text, onClick, {
      variant: options.variant ?? "primary",
      fontSize: Math.max(18, getButtonFontSize(width, height, text))
    });
  }
}
