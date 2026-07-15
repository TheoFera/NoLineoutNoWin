import Phaser from "phaser";
import { BUTTON_STYLES, drawButtonStyle, getButtonFontSize, type ButtonVariant } from "./ButtonStyle";

type UIButtonOptions = {
  variant?: ButtonVariant;
  fontSize?: number;
  flipX?: boolean;
};

export class UIButton extends Phaser.GameObjects.Container {
  private shadow: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Zone;
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private readonly variant: ButtonVariant;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    options: UIButtonOptions = {}
  ) {
    super(scene, x, y);

    this.buttonWidth = width;
    this.buttonHeight = height;
    this.variant = options.variant ?? "primary";

    this.shadow = scene.add.graphics();
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 1, text, {
      font: `bold ${options.fontSize ?? getButtonFontSize(width, height, text)}px Arial`,
      color: BUTTON_STYLES[this.variant].textColor,
      align: "center",
      wordWrap: { width: Math.max(48, width - 18), useAdvancedWrap: true }
    }).setOrigin(0.5).setFlipX(options.flipX ?? false);
    this.hitArea = scene.add.zone(0, 0, width, height).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.hitArea.on("pointerdown", () => this.setPressedScale(0.985));
    this.hitArea.on("pointerup", () => {
      this.setPressedScale(1);
      onClick();
    });
    this.hitArea.on("pointerout", () => this.setPressedScale(1));
    this.hitArea.on("pointerupoutside", () => this.setPressedScale(1));

    this.renderButton();
    this.add([this.shadow, this.background, this.label, this.hitArea]);
    scene.add.existing(this);
  }

  setText(text: string): void {
    this.label.setText(text);
    this.label.setFontSize(getButtonFontSize(this.buttonWidth, this.buttonHeight, text));
    this.label.setWordWrapWidth(Math.max(48, this.buttonWidth - 18), true);
  }

  private renderButton(): void {
    drawButtonStyle(this.shadow, this.background, this.buttonWidth, this.buttonHeight, this.variant);
  }

  private setPressedScale(scale: number): void {
    this.shadow.setScale(scale);
    this.background.setScale(scale);
    this.label.setScale(scale);
  }
}
