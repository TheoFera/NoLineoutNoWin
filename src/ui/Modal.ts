import Phaser from "phaser";
import { t } from "../systems/I18n";
import { UI_DEPTH } from "./UIDepth";
import { UIButton } from "./UIButton";
import { UI } from "./UITheme";

export type ModalSecondaryAction = {
  label: string;
  onSelect: () => void;
};

export type ModalOptions = {
  primaryLabel?: string;
  secondaryAction?: ModalSecondaryAction;
};

export class Modal extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    title: string,
    body: string,
    onClose: () => void,
    options: ModalOptions = {}
  ) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    const titleText = scene.add.text(0, 0, title, {
      font: UI.font.subtitle,
      color: UI.colors.text,
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
    const bg = scene.add.rectangle(0, 0, 332, panelHeight, UI.colors.panelDark, 0.96).setStrokeStyle(2, UI.colors.accent);
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
      variant: "secondary"
    });
    const children: Phaser.GameObjects.GameObject[] = [bg, titleText, bodyText, close];
    if (options.secondaryAction) {
      const secondary = new UIButton(scene, -76, closeY, 128, buttonHeight, options.secondaryAction.label, () => {
        this.destroy();
        options.secondaryAction?.onSelect();
      });
      children.push(secondary);
    }
    this.add(children);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayPanel);
  }
}
