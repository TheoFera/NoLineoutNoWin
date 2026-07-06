import Phaser from "phaser";

type MainMenuButtonVariant = "primary" | "secondary";

type MainMenuButtonOptions = {
  variant?: MainMenuButtonVariant;
};

const BUTTON_STYLES: Record<MainMenuButtonVariant, {
  background: number;
  border: number;
  bevel: number;
  textColor: string;
}> = {
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

export class MainMenuButton extends Phaser.GameObjects.Container {
  private shadow: Phaser.GameObjects.Graphics;
  private button: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Zone;
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private readonly onClick: () => void;
  private readonly variant: MainMenuButtonVariant;

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
      font: `bold ${this.getFontSize()}px Arial`,
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
    const left = -this.buttonWidth / 2;
    const top = -this.buttonHeight / 2;
    const radius = Math.max(16, Math.round(this.buttonHeight * 0.28));
    const inset = Math.max(8, Math.round(this.buttonHeight * 0.12));
    const bevelHeight = Math.max(12, Math.round(this.buttonHeight * 0.2));
    const lineWidth = Math.max(3, Math.round(this.buttonHeight * 0.06));
    const shadowOffsetX = Math.max(5, Math.round(this.buttonWidth * 0.02));
    const shadowOffsetY = Math.max(8, Math.round(this.buttonHeight * 0.13));
    const style = BUTTON_STYLES[this.variant];

    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.35);
    this.shadow.fillRoundedRect(left + shadowOffsetX, top + shadowOffsetY, this.buttonWidth, this.buttonHeight, radius);

    this.button.clear();
    this.button.fillStyle(style.background, 1);
    this.button.lineStyle(lineWidth, style.border, 1);
    this.button.fillRoundedRect(left, top, this.buttonWidth, this.buttonHeight, radius);
    this.button.strokeRoundedRect(left, top, this.buttonWidth, this.buttonHeight, radius);
    this.button.fillStyle(style.bevel, 0.6);
    this.button.fillRoundedRect(
      left + inset,
      top + inset,
      this.buttonWidth - inset * 2,
      bevelHeight,
      Math.max(8, Math.round(radius / 2))
    );
  }

  private setPressedScale(scale: number): void {
    this.shadow.setScale(scale);
    this.button.setScale(scale);
    this.label.setScale(scale);
  }

  private getFontSize(): number {
    return Math.max(18, Math.min(34, Math.round(this.buttonHeight * 0.44)));
  }
}
