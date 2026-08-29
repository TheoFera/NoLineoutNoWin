import Phaser from "phaser";
import type { JerseyColors } from "../models/Team";
import {
  MATCH_SCORE_OVERLAY_LAYOUT,
  PLAYER_STATS_OVERLAY_DEPTH
} from "./MatchScoreOverlayLayout";
import { UI } from "./UITheme";

export type PlayerStatsOverlayData = {
  name: string;
  role: string;
  stats: Array<{ label: string; value: number }>;
  colors: JerseyColors;
};

const IDENTITY_WIDTH = 136;
const STATS_LEFT = 146;
const STATS_RIGHT = MATCH_SCORE_OVERLAY_LAYOUT.width - 14;
const STAT_GAP = 7;
const HIGH_STAT_THRESHOLD = 60;
const HIGH_STAT_COLOR = UI.colors.textAccent;
const DEFAULT_STAT_COLOR = UI.colors.text;

export class PlayerStatsOverlay extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly panels: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly roleText: Phaser.GameObjects.Text;
  private readonly statLabels: Phaser.GameObjects.Text[];
  private readonly statValues: Phaser.GameObjects.Text[];

  constructor(scene: Phaser.Scene, colors: JerseyColors) {
    const layout = MATCH_SCORE_OVERLAY_LAYOUT;
    super(scene, layout.x, layout.y);

    this.shadow = scene.add.graphics();
    this.panels = scene.add.graphics();
    this.nameText = scene.add.text(14, 27, "", {
      font: "bold 14px Arial",
      color: UI.colors.text,
      stroke: UI.colors.textStroke,
      strokeThickness: 2
    }).setOrigin(0, 0.5).setResolution(2);
    this.roleText = scene.add.text(14, 58, "", {
      font: "bold 10px Arial",
      color: UI.colors.textAccent,
      wordWrap: { width: IDENTITY_WIDTH - 28 }
    }).setOrigin(0, 0.5).setResolution(2);
    this.statLabels = Array.from({ length: 3 }, () => scene.add.text(0, 27, "", {
      font: "bold 11px Arial",
      color: UI.colors.text
    }).setOrigin(0.5).setResolution(2));
    this.statValues = Array.from({ length: 3 }, () => scene.add.text(0, 57, "", {
      font: "bold 25px Arial",
      color: UI.colors.text,
      stroke: UI.colors.textStroke,
      strokeThickness: 2
    }).setOrigin(0.5).setResolution(2));

    this.add([
      this.shadow,
      this.panels,
      this.nameText,
      this.roleText,
      ...this.statLabels,
      ...this.statValues
    ]);
    scene.add.existing(this);
    this.setDepth(PLAYER_STATS_OVERLAY_DEPTH);
    this.drawPanels(colors, 3);
  }

  setPlayerData(data: PlayerStatsOverlayData): void {
    const visibleStats = data.stats.slice(0, 3);
    const statCount = Math.max(1, visibleStats.length);
    this.drawPanels(data.colors, statCount);

    const nameFontSize = data.name.length > 18 ? 11 : data.name.length > 14 ? 12 : 14;
    this.nameText.setText(data.name).setFontSize(nameFontSize);
    this.roleText.setText(data.role);

    const availableWidth = STATS_RIGHT - STATS_LEFT;
    const cardWidth = (availableWidth - STAT_GAP * (statCount - 1)) / statCount;
    this.statLabels.forEach((label, index) => {
      const stat = visibleStats[index];
      const visible = Boolean(stat);
      const centerX = STATS_LEFT + cardWidth / 2 + index * (cardWidth + STAT_GAP);
      label
        .setPosition(centerX, 27)
        .setText(stat?.label.toUpperCase() ?? "")
        .setVisible(visible);
      this.statValues[index]
        .setPosition(centerX, 57)
        .setText(stat ? String(stat.value) : "")
        .setColor(stat && stat.value > HIGH_STAT_THRESHOLD ? HIGH_STAT_COLOR : DEFAULT_STAT_COLOR)
        .setVisible(visible);
    });
  }

  private drawPanels(colors: JerseyColors, statCount: number): void {
    const layout = MATCH_SCORE_OVERLAY_LAYOUT;
    this.shadow.clear();
    this.shadow.fillStyle(UI.colors.scrim, 0.5);
    this.shadow.fillRoundedRect(0, 5, layout.width, layout.height, 18);

    this.panels.clear();
    this.panels.fillStyle(UI.colors.panelDark, 0.96);
    this.panels.lineStyle(2, UI.colors.outline, 0.9);
    this.panels.fillRoundedRect(0, 0, layout.width, layout.height, 18);
    this.panels.strokeRoundedRect(0, 0, layout.width, layout.height, 18);

    this.panels.fillStyle(colors.primary, 0.88);
    this.panels.lineStyle(3, colors.secondary, 0.98);
    this.panels.fillRoundedRect(0, 0, IDENTITY_WIDTH, layout.height, 18);
    this.panels.strokeRoundedRect(0, 0, IDENTITY_WIDTH, layout.height, 18);

    const availableWidth = STATS_RIGHT - STATS_LEFT;
    const cardWidth = (availableWidth - STAT_GAP * (statCount - 1)) / statCount;
    for (let index = 0; index < statCount; index += 1) {
      const cardX = STATS_LEFT + index * (cardWidth + STAT_GAP);
      this.panels.fillStyle(UI.colors.panelRaised, 0.92);
      this.panels.lineStyle(1, colors.secondary, 0.62);
      this.panels.fillRoundedRect(cardX, 10, cardWidth, 64, 12);
      this.panels.strokeRoundedRect(cardX, 10, cardWidth, 64, 12);
      this.panels.fillStyle(colors.secondary, 0.9);
      this.panels.fillRoundedRect(cardX + 8, 14, cardWidth - 16, 3, 2);
    }
  }
}
