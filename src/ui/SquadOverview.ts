import Phaser from "phaser";
import { t } from "../systems/I18n";
import { MATCH_SCORE_OVERLAY_LAYOUT as LAYOUT, PLAYER_STATS_OVERLAY_DEPTH } from "./MatchScoreOverlayLayout";
import { UIRoundedRectangle } from "./UIRoundedRectangle";
import { UI } from "./UITheme";

export class SquadOverview extends Phaser.GameObjects.Container {
  private panel: UIRoundedRectangle;
  private title: Phaser.GameObjects.Text;
  private value: Phaser.GameObjects.Text;
  private bin: Phaser.GameObjects.Graphics;
  private errorTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, private readonly level: number) {
    super(scene, LAYOUT.x, LAYOUT.y);
    this.panel = new UIRoundedRectangle(scene, LAYOUT.width / 2, LAYOUT.height / 2,
      LAYOUT.width, LAYOUT.height, UI.colors.panelDark, 0.96, 18);
    this.title = scene.add.text(LAYOUT.width / 2, 24, "", {
      font: "bold 22px Arial", color: UI.colors.text, align: "center", wordWrap: { width: 320 }
    }).setOrigin(0.5);
    this.value = scene.add.text(LAYOUT.width / 2, 59, "", {
      font: UI.font.subtitle, color: UI.colors.textAccent, align: "center", wordWrap: { width: 320 }
    }).setOrigin(0.5);
    this.bin = scene.add.graphics({ x: 30, y: 42 });
    this.bin.lineStyle(2, UI.colors.paper).strokeRoundedRect(-8, -6, 16, 20, 2)
      .lineBetween(-11, -10, 11, -10).lineBetween(-4, -14, 4, -14)
      .lineBetween(-3, -2, -3, 10).lineBetween(3, -2, 3, 10);
    this.add([this.panel, this.title, this.value, this.bin]);
    scene.add.existing(this);
    this.setDepth(PLAYER_STATS_OVERLAY_DEPTH);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.errorTimer?.remove());
    this.showOverview();
  }

  showOverview(): void {
    this.errorTimer?.remove();
    this.title.setY(24);
    this.value.setVisible(true);
    this.setVisible(true);
    this.panel.setFillStyle(UI.colors.panelDark, 0.96).setStrokeStyle(2, UI.colors.outline);
    this.title.setText(t("squad.managementTitle")).setFontSize(22);
    this.value.setText(`${t("squad.level")} : ${this.level}`);
    this.bin.setVisible(false);
  }

  showTrash(hover = false): void {
    this.showOverview();
    this.panel.setFillStyle(UI.colors.dangerSurface, hover ? 1 : 0.96)
      .setStrokeStyle(hover ? 3 : 2, UI.colors.danger);
    this.title.setText(t("squad.removePlayer")).setFontSize(19);
    this.value.setText(t("squad.dropToRemove"));
    this.bin.setVisible(true);
  }

  showError(message: string): void {
    this.showOverview();
    this.title.setText(message).setFontSize(16).setY(42);
    this.value.setVisible(false);
    this.panel.setStrokeStyle(2, UI.colors.danger);
    this.errorTimer = this.scene.time.delayedCall(2200, () => {
      if (!this.scene) return;
      this.title.setY(24);
      this.value.setVisible(true);
      this.showOverview();
    });
  }

  containsPoint(x: number, y: number): boolean {
    return x >= LAYOUT.x && x <= LAYOUT.x + LAYOUT.width
      && y >= LAYOUT.y && y <= LAYOUT.y + LAYOUT.height;
  }
}
