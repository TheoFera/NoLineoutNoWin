import Phaser from "phaser";
import {
  BUTTON_STYLES,
  drawButtonStyle,
  getButtonFontSize,
  type ButtonVariant,
  type ButtonVisualState
} from "./ButtonStyle";
import { UI } from "./UITheme";

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
  private buttonIcon?: Phaser.GameObjects.Graphics;

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
      const icon = scene.add.graphics({ x: -width / 2 + 20, y: 0 });
      icon.lineStyle(2, UI.colors.paper);
      if (options.icon === "recruit") {
        icon.fillStyle(UI.colors.paper);
        icon.fillCircle(-6, -10, 5);
        // Épaules larges et buste : silhouette de joueur plutôt que pictogramme en forme de point.
        icon.beginPath().moveTo(-13, -1).lineTo(-18, 5).lineTo(-13, 9)
          .lineTo(-10, 6).lineTo(-10, 15).lineTo(-2, 15).lineTo(-2, 6)
          .lineTo(1, 9).lineTo(5, 5).lineTo(0, -1).closePath().fillPath();
        icon.lineStyle(3, UI.colors.accent).lineBetween(7, -7, 19, -7).lineBetween(13, -13, 13, -1);
      } else if (options.icon === "team") {
        icon.fillStyle(UI.colors.paper);
        icon.fillCircle(0, -6, 4);
        icon.fillRoundedRect(-5, 0, 10, 10, 3);
        for (const side of [-1, 1]) {
          icon.fillCircle(side * 9, -3, 3);
          icon.fillRoundedRect(side * 9 - 3, 2, 6, 7, 2);
        }
      } else if (options.icon === "championship") {
        // Coupe pleine, anses ouvertes et pied : silhouette lisible à petite taille.
        icon.beginPath().moveTo(-6, -8).lineTo(-10, -8).lineTo(-10, -4)
          .lineTo(-7, 0).lineTo(-4, 1).strokePath();
        icon.beginPath().moveTo(6, -8).lineTo(10, -8).lineTo(10, -4)
          .lineTo(7, 0).lineTo(4, 1).strokePath();
        icon.fillStyle(UI.colors.paper);
        icon.beginPath().moveTo(-6, -10).lineTo(6, -10).lineTo(5, -2)
          .lineTo(2, 3).lineTo(-2, 3).lineTo(-5, -2).closePath().fillPath();
        icon.fillRect(-1.5, 2, 3, 6);
        icon.fillRoundedRect(-6, 8, 12, 3, 1);
      } else {
        icon.strokeCircle(-6, 6, 3);
        icon.lineBetween(-6, 2, 5, -8);
        icon.lineBetween(0, -8, 5, -8);
        icon.lineBetween(5, -8, 5, -3);
        icon.lineBetween(-10, -8, -5, -3);
        icon.lineBetween(-10, -3, -5, -8);
        icon.strokeCircle(7, 6, 3);
      }
      this.add(icon);
      this.buttonIcon = icon;
      if (options.icon === "recruit") icon.setX(0);
      this.label.setX(12).setWordWrapWidth(Math.max(48, width - 48), true);
    }
    scene.add.existing(this);
    this.setEnabled(this.enabled);
  }

  setText(text: string): void {
    this.label.setText(text);
    this.label.setFontSize(getButtonFontSize(this.buttonWidth, this.buttonHeight, text));
    this.label.setWordWrapWidth(Math.max(48, this.buttonWidth - (this.buttonIcon ? 48 : 18)), true);
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
