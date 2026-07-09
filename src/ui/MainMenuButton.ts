import Phaser from "phaser";
import { BUTTON_STYLES, drawButtonStyle, getButtonFontSize, type ButtonVariant } from "./ButtonStyle";

type MainMenuButtonOptions = {
  variant?: ButtonVariant;
};

export class MainMenuButton extends Phaser.GameObjects.Container {
  private shadow: Phaser.GameObjects.Graphics;
  private button: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Zone;
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private readonly onClick: () => void;
  private readonly variant: ButtonVariant;

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
    super(scene, x, y);

    this.buttonWidth = width;
    this.buttonHeight = height;
    this.onClick = onClick;
    this.variant = options.variant ?? "primary";

    this.shadow = scene.add.graphics();
    this.button = scene.add.graphics();
    this.label = scene.add.text(0, 1, text, {
      font: `bold ${this.getFontSize(text)}px Arial`,
      color: BUTTON_STYLES[this.variant].textColor
    }).setOrigin(0.5);
    this.hitArea = scene.add.zone(0, 0, width, height).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.hitArea.on("pointerdown", () => this.setPressedScale(0.985));
    this.hitArea.on("pointerup", () => {
      this.setPressedScale(1);
      this.onClick();
    });
    this.hitArea.on("pointerout", () => this.setPressedScale(1));
    this.hitArea.on("pointerupoutside", () => this.setPressedScale(1));

    this.renderButton();
    this.add([this.shadow, this.button, this.label, this.hitArea]);
    scene.add.existing(this);
  }

  private renderButton(): void {
    drawButtonStyle(this.shadow, this.button, this.buttonWidth, this.buttonHeight, this.variant);
  }

  private setPressedScale(scale: number): void {
    this.shadow.setScale(scale);
    this.button.setScale(scale);
    this.label.setScale(scale);
  }

  private getFontSize(text: string): number {
    return Math.max(18, getButtonFontSize(this.buttonWidth, this.buttonHeight, text));
  }
}
