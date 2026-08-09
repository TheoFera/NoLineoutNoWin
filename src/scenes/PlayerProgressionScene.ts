import Phaser from "phaser";
import type { SeasonSummary } from "../models/Championship";
import type {
  PlayerProgressionSummary,
  PlayerStatProgression,
  ProgressedStatName
} from "../models/PlayerProgression";
import type { Player } from "../models/Player";
import { isHooker } from "../models/Player";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import {
  preloadMatchPitchBackdrop,
  renderMatchPitchBackdrop
} from "../ui/MatchPitchBackdrop";
import { renderResultOverlayPanel } from "../ui/ResultOverlayPanel";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import { getPlayerSkinTint } from "../ui/PlayerSkinTone";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

type PlayerProgressionSceneData = {
  progressions?: PlayerProgressionSummary[];
  seasonSummary?: SeasonSummary | null;
};

type DisplayedStat = {
  name: ProgressedStatName;
  value: number;
};

const SCREEN_CENTER_X = 195;
const PANEL_LEFT = 18;
const PANEL_TOP = 102;
const PANEL_WIDTH = 354;
const PANEL_HEIGHT = 620;
const LIST_TOP = 166;
const LIST_HEIGHT = 536;
const PROGRESSION_COLOR = 0x4ade80;

export class PlayerProgressionScene extends Phaser.Scene {
  private progressions: PlayerProgressionSummary[] = [];
  private seasonSummary: SeasonSummary | null = null;

  constructor() {
    super("PlayerProgressionScene");
  }

  init(data: PlayerProgressionSceneData): void {
    this.progressions = data.progressions ?? [];
    this.seasonSummary = data.seasonSummary ?? null;
  }

  preload(): void {
    preloadMatchPitchBackdrop(this);
  }

  create(): void {
    renderMatchPitchBackdrop(this, 0.74);
    this.renderHeader();

    if (this.progressions.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.renderTeamProgressionPanel();
    this.renderContinueButton();
  }

  private renderHeader(): void {
    this.add.text(SCREEN_CENTER_X, 38, t("playerProgression.title").toUpperCase(), {
      font: "bold 25px Arial",
      color: UI.colors.text,
      align: "center",
      stroke: "#020617",
      strokeThickness: 6,
      wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.rectangle(SCREEN_CENTER_X, 62, 116, 4, PROGRESSION_COLOR, 0.95);
  }

  private renderTeamProgressionPanel(): void {
    const totalGain = this.progressions.reduce(
      (total, progression) => total + progression.changes.reduce(
        (playerTotal, change) => playerTotal + change.currentValue - change.previousValue,
        0
      ),
      0
    );
    const panel = renderResultOverlayPanel(
      this,
      PANEL_LEFT,
      PANEL_TOP,
      PANEL_WIDTH,
      PANEL_HEIGHT
    );
    panel.fillStyle(PROGRESSION_COLOR, 0.95);
    panel.fillRoundedRect(PANEL_LEFT + 14, PANEL_TOP + 6, PANEL_WIDTH - 28, 4, 2);
    panel.fillStyle(0x94a3b8, 0.2);
    panel.fillRect(SCREEN_CENTER_X, PANEL_TOP + 20, 1, 38);
    panel.fillRect(PANEL_LEFT + 16, LIST_TOP - 7, PANEL_WIDTH - 32, 1);

    this.renderSummaryValue(
      104,
      this.progressions.length,
      t("playerProgression.playersImproved")
    );
    this.renderSummaryValue(
      286,
      `+${totalGain}`,
      t("playerProgression.totalTeamGain")
    );

    const rowHeight = Phaser.Math.Clamp(
      Math.floor(LIST_HEIGHT / this.progressions.length),
      66,
      94
    );
    const rowsHeight = rowHeight * this.progressions.length;
    const firstRowTop = LIST_TOP + Math.max(0, Math.floor((LIST_HEIGHT - rowsHeight) / 2));

    this.progressions.forEach((progression, index) => {
      this.renderPlayerRow(progression, firstRowTop + index * rowHeight, rowHeight, index);
    });
  }

  private renderSummaryValue(x: number, value: number | string, label: string): void {
    this.add.text(x, 128, String(value), {
      font: "bold 21px Arial",
      color: "#bbf7d0",
      stroke: "#020617",
      strokeThickness: 3
    }).setOrigin(0.5).setResolution(2);
    this.add.text(x, 150, label.toUpperCase(), {
      font: "bold 9px Arial",
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 142, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
  }

  private renderPlayerRow(
    progression: PlayerProgressionSummary,
    top: number,
    rowHeight: number,
    index: number
  ): void {
    const { player, changes } = progression;
    const rowLeft = PANEL_LEFT + 12;
    const rowWidth = PANEL_WIDTH - 24;
    const rowContentHeight = rowHeight - 6;
    const rowCenterY = top + rowContentHeight / 2;
    const graphics = this.add.graphics();

    graphics.fillStyle(index % 2 === 0 ? 0x071326 : 0x0b1b2a, 0.92);
    graphics.fillRoundedRect(rowLeft, top, rowWidth, rowContentHeight, 10);
    graphics.lineStyle(1, 0x40604b, 0.56);
    graphics.strokeRoundedRect(rowLeft, top, rowWidth, rowContentHeight, 10);

    this.renderPlayerVisual(player, 52, top + rowContentHeight - 5, rowContentHeight);
    this.add.text(78, rowCenterY - 10, player.nickname.toUpperCase(), {
      font: "bold 10px Arial",
      color: UI.colors.text,
      wordWrap: { width: 68, useAdvancedWrap: true }
    }).setOrigin(0, 0.5).setResolution(2);
    this.add.text(78, rowCenterY + 11, `${t("team.numberPrefix")}${player.number}`, {
      font: "9px Arial",
      color: UI.colors.muted,
      wordWrap: { width: 72, useAdvancedWrap: true }
    }).setOrigin(0, 0.5).setResolution(2);

    const stats = this.getDisplayedStats(player);
    const statsLeft = 154;
    const statsWidth = 198;
    const gap = 4;
    const statWidth = (statsWidth - gap * (stats.length - 1)) / stats.length;
    stats.forEach((stat, statIndex) => {
      this.renderStatCell(
        stat,
        changes.find((change) => change.stat === stat.name),
        statsLeft + statIndex * (statWidth + gap),
        top + 7,
        statWidth,
        rowContentHeight - 14
      );
    });
  }

  private renderPlayerVisual(player: Player, x: number, feetY: number, rowHeight: number): void {
    const colors = GameStore.getSave().playerTeam.colors;
    const visualHeight = Phaser.Math.Clamp(rowHeight - 9, 46, 70);

    this.add.ellipse(x, feetY + 1, 42, 8, 0x020617, 0.5);
    new RugbyPlayer(
      this,
      x,
      feetY,
      "stand_front",
      {
        jerseyPrimary: colors.primary,
        shortsPrimary: colors.secondary,
        socksPrimary: colors.primary,
        detailsSecondary: colors.secondary
      },
      player.appearance.bodyShape,
      getPlayerSkinTint(player),
      player.appearance.hairStyleId,
      player.appearance.accessoryId
    ).setVisualSize(46, visualHeight);
  }

  private renderStatCell(
    stat: DisplayedStat,
    change: PlayerStatProgression | undefined,
    left: number,
    top: number,
    width: number,
    height: number
  ): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(change ? 0x123c28 : 0x111f2d, 0.96);
    graphics.fillRoundedRect(left, top, width, height, 8);
    graphics.lineStyle(1, change ? PROGRESSION_COLOR : 0x64748b, change ? 0.9 : 0.46);
    graphics.strokeRoundedRect(left, top, width, height, 8);

    this.add.text(left + width / 2, top + 12, t(this.getStatLabelKey(stat.name)).toUpperCase(), {
      font: "bold 8px Arial",
      color: change ? "#bbf7d0" : UI.colors.muted
    }).setOrigin(0.5).setResolution(2);

    if (!change) {
      this.add.text(left + width / 2, top + height - 17, String(stat.value), {
        font: "bold 17px Arial",
        color: UI.colors.text
      }).setOrigin(0.5).setResolution(2);
      return;
    }

    const gain = change.currentValue - change.previousValue;
    const valueY = top + height - 17;
    this.add.text(left + width / 2 - 17, valueY, String(change.previousValue), {
      font: "bold 10px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5).setResolution(2);
    this.add.text(left + width / 2, valueY, "›", {
      font: "bold 13px Arial",
      color: UI.colors.text
    }).setOrigin(0.5).setResolution(2);
    this.add.text(left + width / 2 + 18, valueY, String(change.currentValue), {
      font: "bold 14px Arial",
      color: "#bbf7d0"
    }).setOrigin(0.5).setResolution(2);
    this.add.text(left + width - 3, top + 3, `+${gain}`, {
      font: "bold 8px Arial",
      color: "#052e16",
      backgroundColor: "#4ade80",
      padding: { left: 3, right: 3, top: 1, bottom: 1 }
    }).setOrigin(1, 0).setResolution(2);
  }

  private renderEmptyState(): void {
    renderResultOverlayPanel(this, PANEL_LEFT, 170, PANEL_WIDTH, 250);
    this.add.text(SCREEN_CENTER_X, 232, t("playerProgression.noneTitle").toUpperCase(), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 300, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.text(SCREEN_CENTER_X, 306, t("playerProgression.noneBody"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      lineSpacing: 7,
      wordWrap: { width: 294, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.renderContinueButton();
  }

  private renderContinueButton(): void {
    new UIButton(this, SCREEN_CENTER_X, 786, 286, 48, t("button.continue"), () => {
      if (this.seasonSummary) {
        navigateTo(this, "SeasonResultScene", { summary: this.seasonSummary });
        return;
      }

      navigateTo(this, "LineoutScene", { mode: "training" });
    });
  }

  private getDisplayedStats(player: Player): DisplayedStat[] {
    if (isHooker(player)) {
      return [{ name: "throwing", value: player.throwing }];
    }

    return [
      { name: "speed", value: player.speed },
      { name: "strength", value: player.strength },
      { name: "technique", value: player.technique }
    ];
  }

  private getStatLabelKey(stat: ProgressedStatName): string {
    if (stat === "throwing") return "team.throwing";
    return `team.stat.${stat}`;
  }
}
