import Phaser from "phaser";
import { UI } from "./UITheme";
import { UI_DEPTH } from "./UIDepth";
import { UIButton } from "./UIButton";
import { t } from "../systems/I18n";
import type { CoachStep } from "../data/CoachTutorial";

/** Les trous laissent passer les vrais gestes : aucune action de jeu n'est simulée. */
export class CharlesCoachOverlay extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Container;
  private readonly shade: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly continueButton?: UIButton;
  private gestureStarted = false;
  private readonly blockers: Phaser.GameObjects.Rectangle[];
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly dialogue: Phaser.GameObjects.Text;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private centered?: boolean;

  constructor(scene: Phaser.Scene, step: CoachStep, message: string,
    private readonly advance: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayContent + 100);
    this.shade = scene.add.container(0, 0);
    this.blockers = Array.from({ length: 5 }, () => scene.add.rectangle(0, 0, 1, 1, UI.colors.scrim, 0.48)
      .setOrigin(0).setInteractive().setVisible(false));
    this.shade.add(this.blockers);
    this.frame = scene.add.graphics();
    this.panel = scene.add.container(0, 0);
    this.add([this.shade, this.frame, this.panel]);
    const background = scene.add.graphics();
    this.background = background;
    const portrait = scene.add.image(58, 142, step.wait ? "charles-advice" : "charles-explaining").setOrigin(0.5, 1);
    this.portrait = portrait;
    portrait.setScale(Math.min(86 / portrait.width, 142 / portrait.height));
    const name = scene.add.text(108, 14, t("tutorial.charles"), { font: UI.font.subtitle, color: UI.colors.textAccent });
    this.nameLabel = name;
    const text = scene.add.text(108, 42, message, { font: "16px Arial", color: UI.colors.text,
      lineSpacing: 3, wordWrap: { width: 259 } });
    this.dialogue = text;
    this.panel.add([background, portrait, name, text]);
    if (!step.wait) {
      this.continueButton = new UIButton(scene, 270, 168, 192, 48, t("coach.continue"),
        this.advance, { fontSize: 14, variant: "primary" });
      this.panel.add(this.continueButton);
    }
  }

  layout(target: Phaser.Geom.Rectangle | undefined, destination: Phaser.Geom.Rectangle | undefined,
    step: CoachStep, time: number): void {
    if (this.gestureStarted) return;
    this.blockers.forEach((blocker) => blocker.setVisible(false));
    this.frame.clear();
    let hole = target ? Phaser.Geom.Rectangle.Clone(target) : undefined;
    if (hole && destination) Phaser.Geom.Rectangle.Union(hole, destination, hole);
    if (hole) {
      Phaser.Geom.Rectangle.Inflate(hole, 8, 8);
      hole.x = Phaser.Math.Clamp(hole.x, 0, 390);
      hole.y = Phaser.Math.Clamp(hole.y, 0, 844);
      hole.width = Math.min(hole.width, 390 - hole.x);
      hole.height = Math.min(hole.height, 844 - hole.y);
    }
    this.portrait.setPosition(hole ? 58 : 195, hole ? 142 : 0);
    this.portrait.setScale(Math.min((hole ? 86 : 210) / this.portrait.width, (hole ? 142 : 260) / this.portrait.height));
    this.nameLabel.x = hole ? 108 : 24;
    if (this.centered !== !hole) {
      this.centered = !hole;
      this.dialogue.setX(hole ? 108 : 24).setWordWrapWidth(hole ? 259 : 342).setFontSize(16);
    }
    // Adapter la bulle aux dialogues longs sans réduire la lisibilité du texte.
    const panelHeight = Math.max(194, 42 + this.dialogue.height + (this.continueButton ? 70 : 20));
    this.background.clear().fillStyle(UI.colors.panelDark, 0.99)
      .fillRoundedRect(10, 0, 370, panelHeight, UI.radius)
      .lineStyle(1.5, UI.colors.outline).strokeRoundedRect(10, 0, 370, panelHeight, UI.radius);
    this.continueButton?.setY(panelHeight - 30);
    this.panel.y = hole && hole.centerY >= 422 ? 8 : 844 - panelHeight - 8;
    let blockIndex = 0;
    const block = (x: number, y: number, width: number, height: number, alpha = 0.48): void => {
      if (width <= 0 || height <= 0) return;
      const blocker = this.blockers[blockIndex++];
      blocker.setPosition(x, y).setSize(width, height).setDisplaySize(width, height).setFillStyle(UI.colors.scrim, alpha).setVisible(true);
      blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    };
    if (hole && step.wait) {
      block(0, 0, 390, hole.top);
      block(0, hole.bottom, 390, 844 - hole.bottom);
      block(0, hole.top, hole.left, hole.height);
      block(hole.right, hole.top, 390 - hole.right, hole.height);
    } else {
      // Rétablir la luminosité de la zone montrée avec quatre voiles, tout en bloquant son entrée.
      if (hole) {
        block(0, 0, 390, hole.top); block(0, hole.bottom, 390, 844 - hole.bottom);
        block(0, hole.top, hole.left, hole.height); block(hole.right, hole.top, 390 - hole.right, hole.height);
        block(hole.left, hole.top, hole.width, hole.height, 0);
      } else block(0, 0, 390, 844);
    }
    if (target) {
      this.frame.lineStyle(3, UI.colors.accent, 0.55 + Math.sin(time / 250) * 0.45)
        .strokeRoundedRect(target.x - 4, target.y - 4, target.width + 8, target.height + 8, 10);
      if (destination) {
        this.frame.lineStyle(2, UI.colors.accent, 0.8).lineBetween(target.centerX, target.centerY, destination.centerX, destination.centerY);
        this.frame.strokeCircle(destination.centerX, destination.centerY, 16);
      }
    }
  }

  hideForGesture(): void {
    this.gestureStarted = true;
    this.setVisible(false);
    this.blockers.forEach((blocker) => { blocker.setVisible(false); blocker.disableInteractive(); });
  }
}
