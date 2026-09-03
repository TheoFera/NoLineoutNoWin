import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/DisplayConfig";
import { t } from "../systems/I18n";
import { UI_DEPTH } from "./UIDepth";
import { UI } from "./UITheme";
import { UIRoundedRectangle } from "./UIRoundedRectangle";

const DIALOGUES = [
  { textKey: "tutorial.introduction.welcome", sprite: "charles-welcome" },
  { textKey: "tutorial.introduction.support", sprite: "charles-encouraging" },
  { textKey: "tutorial.introduction.lineouts", sprite: "charles-advice" },
  { textKey: "tutorial.introduction.club", sprite: "charles-explaining" }
] as const;

export function preloadCharlesIntroduction(scene: Phaser.Scene): void {
  for (const { sprite } of DIALOGUES) {
    if (!scene.textures.exists(sprite)) {
      scene.load.image(sprite, `assets/images/charles/${sprite}.png`);
    }
  }
}

export class CharlesIntroductionOverlay extends Phaser.GameObjects.Container {
  private dialogueIndex = 0;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly dialogue: Phaser.GameObjects.Text;
  private readonly progress: Phaser.GameObjects.Text;
  private pressedPointerId: number | null = null;
  private finished = false;

  constructor(scene: Phaser.Scene, private readonly onComplete: () => void) {
    super(scene, 0, 0);
    const centerX = GAME_WIDTH / 2;
    const backdrop = scene.add.rectangle(
      centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, UI.colors.scrim, 0.58
    );
    this.portrait = scene.add.image(centerX, 565, DIALOGUES[0].sprite).setOrigin(0.5, 1);
    const panel = new UIRoundedRectangle(scene, centerX, 657, 354, 240, UI.colors.panelDark, 0.99)
      .setStrokeStyle(2, UI.colors.outline);
    const name = scene.add.text(40, 558, t("tutorial.charles"), {
      font: UI.font.subtitle,
      color: UI.colors.textAccent
    });
    this.progress = scene.add.text(350, 560, "", {
      font: UI.font.small,
      color: UI.colors.muted
    }).setOrigin(1, 0);
    this.dialogue = scene.add.text(40, 599, "", {
      font: "18px Arial",
      color: UI.colors.text,
      lineSpacing: 5,
      wordWrap: { width: 310 }
    });
    const hint = scene.add.text(centerX, 750, t("tutorial.tapToContinue"), {
      font: UI.font.small,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 310 }
    }).setOrigin(0.5);

    // Une surface unique reçoit les appuis et protège les commandes situées dessous.
    const input = scene.add.zone(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT)
      .setInteractive({ useHandCursor: true });
    input.on("pointerdown", (
      pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      if (this.pressedPointerId === null) this.pressedPointerId = pointer.id;
    });
    input.on("pointerup", (
      pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
    ) => {
      event.stopPropagation();
      // Le relâchement du bouton « Jouer » ne doit pas passer la première réplique.
      if (this.pressedPointerId !== pointer.id) return;
      this.pressedPointerId = null;
      this.advance();
    });
    input.on("pointerout", () => { this.pressedPointerId = null; });
    input.on("pointerupoutside", () => { this.pressedPointerId = null; });

    this.add([backdrop, this.portrait, panel, name, this.progress, this.dialogue, hint, input]);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayContent);
    this.showDialogue();
  }

  private showDialogue(): void {
    const current = DIALOGUES[this.dialogueIndex];
    this.portrait.setTexture(current.sprite);
    this.portrait.setScale(Math.min(340 / this.portrait.width, 450 / this.portrait.height));
    this.dialogue.setText(t(current.textKey));
    this.progress.setText(t("tutorial.progress")
      .replace("{current}", String(this.dialogueIndex + 1))
      .replace("{total}", String(DIALOGUES.length)));
  }

  private advance(): void {
    if (this.finished) return;
    this.dialogueIndex += 1;
    if (this.dialogueIndex < DIALOGUES.length) {
      this.showDialogue();
      return;
    }
    this.finished = true;
    this.destroy();
    this.onComplete();
  }
}
