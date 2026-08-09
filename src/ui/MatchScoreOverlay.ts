import Phaser from "phaser";
import type { JerseyColors } from "../models/Team";
import {
  MATCH_SCORE_OVERLAY_DEPTH,
  MATCH_SCORE_OVERLAY_LAYOUT
} from "./MatchScoreOverlayLayout";
import { fitTextToWidth } from "./TextFit";

export type MatchScoreOverlayData = {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  minuteLabel: string;
  homeColors: JerseyColors;
  awayColors: JerseyColors;
};

export class MatchScoreOverlay extends Phaser.GameObjects.Container {
  private readonly homeScoreText: Phaser.GameObjects.Text;
  private readonly awayScoreText: Phaser.GameObjects.Text;
  private readonly minuteText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, data: MatchScoreOverlayData) {
    const layout = MATCH_SCORE_OVERLAY_LAYOUT;
    super(scene, layout.x, layout.y);

    const relief = scene.add.graphics();
    relief.fillStyle(0x111827, 0.6);
    relief.fillRoundedRect(
      0,
      layout.teamPanelY + 6,
      layout.teamPanelWidth,
      layout.teamPanelHeight,
      18
    );
    relief.fillRoundedRect(
      layout.width - layout.teamPanelWidth,
      layout.teamPanelY + 6,
      layout.teamPanelWidth,
      layout.teamPanelHeight,
      18
    );
    relief.fillRoundedRect(
      layout.centerPanelX,
      6,
      layout.centerPanelWidth,
      layout.height,
      15
    );

    const panels = scene.add.graphics();
    this.drawTeamPanel(panels, 0, data.homeColors);
    this.drawTeamPanel(
      panels,
      layout.width - layout.teamPanelWidth,
      data.awayColors
    );
    panels.fillStyle(0x07111a, 0.96);
    panels.lineStyle(2, 0x64748b, 0.88);
    panels.fillRoundedRect(
      layout.centerPanelX,
      0,
      layout.centerPanelWidth,
      layout.height,
      15
    );
    panels.strokeRoundedRect(
      layout.centerPanelX,
      0,
      layout.centerPanelWidth,
      layout.height,
      15
    );

    const homeName = this.createTeamName(scene, data.homeName, 14, 24, "left");
    const awayName = this.createTeamName(
      scene,
      data.awayName,
      layout.width - 14,
      24,
      "right"
    );
    this.homeScoreText = scene.add.text(72, 57, String(data.homeScore), {
      font: "bold 32px Arial",
      color: "#f8fafc",
      stroke: "#020617",
      strokeThickness: 2
    }).setOrigin(0.5);
    this.awayScoreText = scene.add.text(layout.width - 72, 57, String(data.awayScore), {
      font: "bold 32px Arial",
      color: "#f8fafc",
      stroke: "#020617",
      strokeThickness: 2
    }).setOrigin(0.5);
    this.minuteText = scene.add.text(layout.width / 2, 42, data.minuteLabel, {
      font: "bold 28px Arial",
      color: "#fde047",
      stroke: "#020617",
      strokeThickness: 2
    }).setOrigin(0.5);

    this.add([
      relief,
      panels,
      homeName,
      awayName,
      this.homeScoreText,
      this.awayScoreText,
      this.minuteText
    ]);
    scene.add.existing(this);
    this.setDepth(MATCH_SCORE_OVERLAY_DEPTH);
  }

  setScore(homeScore: number, awayScore: number): void {
    this.homeScoreText.setText(String(homeScore));
    this.awayScoreText.setText(String(awayScore));
  }

  setMinute(minuteLabel: string): void {
    this.minuteText.setText(minuteLabel);
  }

  private drawTeamPanel(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    colors: JerseyColors
  ): void {
    const layout = MATCH_SCORE_OVERLAY_LAYOUT;
    graphics.fillStyle(colors.primary, 0.88);
    graphics.lineStyle(3, colors.secondary, 0.98);
    graphics.fillRoundedRect(
      x,
      layout.teamPanelY,
      layout.teamPanelWidth,
      layout.teamPanelHeight,
      18
    );
    graphics.strokeRoundedRect(
      x,
      layout.teamPanelY,
      layout.teamPanelWidth,
      layout.teamPanelHeight,
      18
    );
  }

  private createTeamName(
    scene: Phaser.Scene,
    name: string,
    x: number,
    y: number,
    align: "left" | "right"
  ): Phaser.GameObjects.Text {
    const normalizedName = name.toUpperCase();
    const textObject = scene.add.text(x, y, normalizedName, {
      font: "bold 12px Arial",
      color: "#f8fafc",
      align,
      stroke: "#020617",
      strokeThickness: 2
    }).setOrigin(align === "left" ? 0 : 1, 0.5);
    return fitTextToWidth(
      textObject,
      MATCH_SCORE_OVERLAY_LAYOUT.centerPanelX - 20,
      8
    );
  }
}
