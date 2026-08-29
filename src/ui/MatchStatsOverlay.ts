import Phaser from "phaser";
import type { JerseyColors } from "../models/Team";
import { MATCH_SCORE_OVERLAY_LAYOUT } from "./MatchScoreOverlayLayout";
import { UI } from "./UITheme";

export const MATCH_STATS_OVERLAY_LAYOUT = {
  x: MATCH_SCORE_OVERLAY_LAYOUT.x,
  y: MATCH_SCORE_OVERLAY_LAYOUT.y + MATCH_SCORE_OVERLAY_LAYOUT.height + 8,
  width: MATCH_SCORE_OVERLAY_LAYOUT.width,
  height: 64
} as const;

const MATCH_STATS_OVERLAY_DEPTH = 1400;

export type MatchStatsOverlayData = {
  possessionLabel: string;
  occupationLabel: string;
  zoneLabel: string;
  zoneValue: string;
  possession: number;
  occupation: number;
  homeColors: JerseyColors;
  awayColors: JerseyColors;
};

export class MatchStatsOverlay extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, data: MatchStatsOverlayData) {
    const layout = MATCH_STATS_OVERLAY_LAYOUT;
    super(scene, layout.x, layout.y);

    const graphics = scene.add.graphics();
    this.drawCard(graphics, 0, 130, data.homeColors.secondary);
    this.drawCard(graphics, 136, 92, UI.colors.outlineStrong);
    this.drawCard(graphics, 234, 120, data.awayColors.secondary);

    const possessionLabel = this.createLabel(scene, 65, data.possessionLabel);
    const possessionHome = this.createValue(
      scene,
      42,
      `${Math.round(data.possession)}%`,
      Phaser.Display.Color.IntegerToColor(data.homeColors.secondary).rgba
    );
    const possessionAway = this.createValue(
      scene,
      91,
      `${100 - Math.round(data.possession)}%`,
      Phaser.Display.Color.IntegerToColor(data.awayColors.secondary).rgba
    );
    const barX = 12;
    const barY = 52;
    const barWidth = 106;
    graphics.fillStyle(UI.colors.panelAlternate, 0.95);
    graphics.fillRoundedRect(barX, barY, barWidth, 5, 2);
    graphics.fillStyle(data.homeColors.primary, 1);
    graphics.fillRoundedRect(barX, barY, barWidth * data.possession / 100, 5, 2);
    graphics.fillStyle(data.awayColors.primary, 1);
    graphics.fillRoundedRect(
      barX + barWidth * data.possession / 100,
      barY,
      barWidth * (100 - data.possession) / 100,
      5,
      2
    );

    const occupationLabel = this.createLabel(scene, 182, data.occupationLabel);
    const occupationValue = this.createLargeValue(scene, 182, `${Math.round(data.occupation)}%`, UI.colors.text);
    const zoneLabel = this.createLabel(scene, 294, data.zoneLabel);
    const zoneValue = scene.add.text(294, 42, data.zoneValue, {
      font: `bold ${data.zoneValue.length > 14 ? 10 : 12}px Arial`,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 102 }
    }).setOrigin(0.5).setResolution(2);

    this.add([
      graphics,
      possessionLabel,
      possessionHome,
      possessionAway,
      occupationLabel,
      occupationValue,
      zoneLabel,
      zoneValue
    ]);
    scene.add.existing(this);
    this.setDepth(MATCH_STATS_OVERLAY_DEPTH);
  }

  private drawCard(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    width: number,
    accentColor: number
  ): void {
    graphics.fillStyle(UI.colors.panelDark, 0.94);
    graphics.lineStyle(1, UI.colors.outline, 0.9);
    graphics.fillRoundedRect(x, 0, width, MATCH_STATS_OVERLAY_LAYOUT.height, 12);
    graphics.strokeRoundedRect(x, 0, width, MATCH_STATS_OVERLAY_LAYOUT.height, 12);
    graphics.fillStyle(accentColor, 0.95);
    graphics.fillRoundedRect(x + 10, 6, width - 20, 3, 2);
  }

  private createLabel(scene: Phaser.Scene, x: number, label: string): Phaser.GameObjects.Text {
    return scene.add.text(x, 17, label.toUpperCase(), {
      font: "bold 10px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5).setResolution(2);
  }

  private createValue(
    scene: Phaser.Scene,
    x: number,
    value: string,
    color: string
  ): Phaser.GameObjects.Text {
    return scene.add.text(x, 36, value, {
      font: "bold 15px Arial",
      color
    }).setOrigin(0.5).setResolution(2);
  }

  private createLargeValue(
    scene: Phaser.Scene,
    x: number,
    value: string,
    color: string
  ): Phaser.GameObjects.Text {
    return scene.add.text(x, 42, value, {
      font: "bold 22px Arial",
      color,
      stroke: UI.colors.textStroke,
      strokeThickness: 2
    }).setOrigin(0.5).setResolution(2);
  }
}
