import Phaser from "phaser";
import {
  BUTTON_STYLES,
  drawButtonStyle,
  getButtonFontSize,
  type ButtonVariant,
  type ButtonVisualState
} from "./ButtonStyle";
import { UI } from "./UITheme";
import { createButtonIcon } from "./ButtonIcons";

export type UIButtonOptions = {
  variant?: ButtonVariant;
  fontSize?: number;
  textColor?: string;
  flipX?: boolean;
  enabled?: boolean;
  hitWidth?: number;
  hitHeight?: number;
  icon?: "combinations" | "championship" | "team" | "recruit";
  accessibleLabel?: string;
};

export class UIButton extends Phaser.GameObjects.Container {
  private shadow: Phaser.GameObjects.Graphics;
  private background: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Zone;
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private readonly variant: ButtonVariant;
  private readonly onClick: () => void;
  private enabled: boolean;
  private buttonIcon?: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;

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
    this.variant = options.variant ?? "secondary";
    this.onClick = onClick;
    this.enabled = options.enabled ?? true;

    this.shadow = scene.add.graphics();
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 1, text, {
      font: `bold ${options.fontSize ?? getButtonFontSize(width, height, text)}px Arial`,
      color: options.textColor ?? BUTTON_STYLES[this.variant].textColor,
      align: "center",
      wordWrap: { width: Math.max(48, width - 18), useAdvancedWrap: true }
    }).setOrigin(0.5).setFlipX(options.flipX ?? false);
    this.hitArea = scene.add.zone(
      0,
      0,
      Math.max(UI.touch.minimum, options.hitWidth ?? width),
      Math.max(UI.touch.minimum, options.hitHeight ?? height)
    ).setOrigin(0.5);
    if (options.accessibleLabel) this.setData("accessibleLabel", options.accessibleLabel);

    this.hitArea.on("pointerdown", () => this.setVisualState("pressed"));
    this.hitArea.on("pointerup", () => {
      if (!this.enabled) return;
      this.setVisualState("normal");
      this.onClick();
    });
    this.hitArea.on("pointerout", () => this.setVisualState(this.enabled ? "normal" : "disabled"));
    this.hitArea.on("pointerupoutside", () => this.setVisualState(this.enabled ? "normal" : "disabled"));

    this.add([this.shadow, this.background, this.label, this.hitArea]);
    if (options.icon) {
      const iconX = text ? -width / 2 + 20 : 0;
      let icon: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
      if (options.icon === "team") {
        const group = scene.add.graphics({ x: iconX, y: 0 });
        group.fillStyle(UI.colors.paper);
        group.fillCircle(0, -6, 4);
        group.fillRoundedRect(-5, 0, 10, 10, 3);
        for (const side of [-1, 1]) {
          group.fillCircle(side * 9, -3, 3);
          group.fillRoundedRect(side * 9 - 3, 2, 6, 7, 2);
        }
        icon = group;
      } else {
        icon = createButtonIcon(scene, options.icon, iconX);
      }
      this.add(icon);
      this.buttonIcon = icon;
      this.label.setX(14).setWordWrapWidth(Math.max(48, width - 40), true);
    }
    scene.add.existing(this);
    this.setEnabled(this.enabled);
  }

  setText(text: string): void {
    this.label.setText(text);
    this.label.setFontSize(getButtonFontSize(this.buttonWidth, this.buttonHeight, text));
    this.label.setWordWrapWidth(Math.max(48, this.buttonWidth - (this.buttonIcon ? 40 : 18)), true);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.buttonIcon?.setAlpha(enabled ? 1 : 0.52);
    if (enabled) {
      this.hitArea.setInteractive({ useHandCursor: true });
      this.label.setAlpha(1);
      this.setVisualState("normal");
    } else {
      this.hitArea.disableInteractive();
      this.label.setAlpha(0.52);
      this.setVisualState("disabled");
    }
    return this;
  }

  private renderButton(state: ButtonVisualState): void {
    drawButtonStyle(this.shadow, this.background, this.buttonWidth, this.buttonHeight, this.variant, state);
  }

  private setVisualState(state: ButtonVisualState): void {
    this.renderButton(state);
    this.label.setY(state === "pressed" ? UI.motion.pressOffset + 1 : 1);
    this.buttonIcon?.setY(state === "pressed" ? UI.motion.pressOffset : 0);
  }
}
