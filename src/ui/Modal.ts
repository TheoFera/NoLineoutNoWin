import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/DisplayConfig";
import { t } from "../systems/I18n";
import { UI_DEPTH } from "./UIDepth";
import { UIButton } from "./UIButton";
import type { ButtonVariant } from "./ButtonStyle";
import { UI } from "./UITheme";
import { UIRoundedRectangle } from "./UIRoundedRectangle";

export type ModalSecondaryAction = {
  label: string;
  onSelect: () => void;
  variant?: ButtonVariant;
};

export type ModalOptions = {
  primaryLabel?: string;
  primaryVariant?: ButtonVariant;
  secondaryAction?: ModalSecondaryAction;
  tone?: "default" | "success" | "danger";
};

const MODAL_TONES = {
  default: {
    background: UI.colors.panelDark,
    border: UI.colors.outline,
    title: UI.colors.text
  },
  success: {
    background: UI.colors.panelDark,
    border: UI.colors.success,
    title: UI.colors.textSuccess
  },
  danger: {
    background: UI.colors.panelDark,
    border: UI.colors.danger,
    title: UI.colors.textDanger
  }
} as const;

export class Modal extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    title: string,
    body: string,
    onClose: () => void,
    options: ModalOptions = {}
  ) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const tone = MODAL_TONES[options.tone ?? "default"];
    const backdrop = scene.add.rectangle(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      UI.colors.scrim,
      0.68
    ).setInteractive();
    const titleText = scene.add.text(0, 0, title, {
      font: UI.font.subtitle,
      color: tone.title,
      align: "center",
      wordWrap: { width: 276 }
    }).setOrigin(0.5);
    const bodyText = scene.add.text(0, 0, body, {
      font: "14px Arial",
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 276 }
    }).setOrigin(0.5);
    const topPadding = 28;
    const titleGap = 18;
    const buttonGap = 24;
    const bottomPadding = 22;
    const buttonHeight = 40;
    const panelHeight = Math.max(
      202,
      topPadding + titleText.height + titleGap + bodyText.height + buttonGap + buttonHeight + bottomPadding
    );
    const bg = new UIRoundedRectangle(scene, 0, 0, 332, panelHeight, tone.background, 0.98)
      .setStrokeStyle(2, tone.border);
    const panelTop = -panelHeight / 2;
    const titleY = panelTop + topPadding + titleText.height / 2;
    const bodyY = titleY + titleText.height / 2 + titleGap + bodyText.height / 2;
    const closeY = bodyY + bodyText.height / 2 + buttonGap + buttonHeight / 2;

    titleText.setY(titleY);
    bodyText.setY(bodyY);
    const hasSecondaryAction = Boolean(options.secondaryAction);
    const closeX = hasSecondaryAction ? 76 : 0;
    const close = new UIButton(scene, closeX, closeY, 128, buttonHeight, options.primaryLabel ?? t("button.ok"), () => {
      this.destroy();
      onClose();
    }, {
      variant: options.primaryVariant ?? "primary"
    });
    const children: Phaser.GameObjects.GameObject[] = [backdrop, bg, titleText, bodyText, close];
    if (options.secondaryAction) {
      const secondary = new UIButton(scene, -76, closeY, 128, buttonHeight, options.secondaryAction.label, () => {
        this.destroy();
        options.secondaryAction?.onSelect();
      }, {
        variant: options.secondaryAction.variant ?? "secondary"
      });
      children.push(secondary);
    }
    this.add(children);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayPanel);
  }
}
