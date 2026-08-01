import Phaser from "phaser";
import type { JerseyColors } from "../models/Team";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { getContrastingOpponentColors } from "../ui/JerseyColorContrast";
import {
  preloadMatchPitchBackdrop,
  renderMatchPitchBackdrop
} from "../ui/MatchPitchBackdrop";
import { renderResultOverlayPanel } from "../ui/ResultOverlayPanel";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

type MatchOutcome = "victory" | "draw" | "defeat";

const SCREEN_CENTER_X = 195;
const PANEL_WIDTH = 358;
const PANEL_LEFT = 16;

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  preload(): void {
    preloadMatchPitchBackdrop(this);
  }

  create(): void {
    const match = GameStore.getMatch();

    renderMatchPitchBackdrop(this, 0.68);

    if (!match) {
      this.add.text(SCREEN_CENTER_X, 44, t("result.title").toUpperCase(), {
        font: UI.font.title,
        color: UI.colors.text,
        stroke: "#020617",
        strokeThickness: 4
      }).setOrigin(0.5);
      this.add.text(SCREEN_CENTER_X, 220, t("result.noMatch"), {
        font: UI.font.subtitle,
        color: UI.colors.text
      }).setOrigin(0.5);
      new UIButton(this, SCREEN_CENTER_X, 790, 300, 52, t("result.backTraining"), () => {
        navigateTo(this, "LineoutScene", { mode: "training" });
      });
      return;
    }

    const totalLineouts = match.lineoutHistory.length;
    const attackLineouts = match.lineoutHistory.filter((item) => item.throwingSide === "us");
    const defenseLineouts = match.lineoutHistory.filter((item) => item.throwingSide === "opponent");
    const attackWon = attackLineouts.filter((item) => item.success).length;
    const defenseWon = defenseLineouts.filter((item) => item.success).length;
    const outcome = this.getMatchOutcome(match.ourScore, match.opponentScore);
    const opponentColors = getContrastingOpponentColors(match.home.colors, match.away.colors);

    this.renderResultHeader();
    this.renderScorePanel(
      match.home.name,
      match.away.name,
      match.ourScore,
      match.opponentScore,
      match.home.colors,
      opponentColors,
      outcome
    );

    this.renderComparisonRow(
      270,
      t("match.possession"),
      match.possession,
      match.home.colors,
      opponentColors
    );
    this.renderComparisonRow(
      342,
      t("match.occupation"),
      match.occupation,
      match.home.colors,
      opponentColors
    );
    this.renderLineoutSummary(
      totalLineouts,
      attackWon,
      attackLineouts.length,
      defenseWon,
      defenseLineouts.length,
      match.home.colors
    );

    this.add.text(SCREEN_CENTER_X, 492, t("result.combinationsTitle").toUpperCase(), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 3
    }).setOrigin(0.5);

    const stats = Object.values(match.combinationStats);
    if (stats.length === 0) {
      renderResultOverlayPanel(this, PANEL_LEFT, 516, PANEL_WIDTH, 132);
      this.add.text(SCREEN_CENTER_X, 582, t("result.noCombinationStats"), {
        font: UI.font.body,
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 306 }
      }).setOrigin(0.5);
    } else {
      const panel = renderResultOverlayPanel(this, PANEL_LEFT, 516, PANEL_WIDTH, 160);
      panel.fillStyle(UI.colors.accent, 0.95);
      panel.fillRoundedRect(PANEL_LEFT + 14, 522, PANEL_WIDTH - 28, 4, 2);
      stats
        .sort((left, right) => right.played - left.played)
        .slice(0, 3)
        .forEach((stat, index) => {
          const y = 550 + index * 46;
          const rate = stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0;
          if (index > 0) {
            this.add.rectangle(SCREEN_CENTER_X, y - 23, 326, 1, 0xf8fafc, 0.16);
          }
          this.add.text(32, y - 7, stat.combinationName.toUpperCase(), {
            font: "bold 12px Arial",
            color: UI.colors.text
          }).setOrigin(0, 0.5);
          this.add.text(32, y + 11, t("result.comboLine")
            .replace("{count}", String(stat.playerCount))
            .replace("{played}", String(stat.played))
            .replace("{won}", String(stat.won))
            .replace("{lost}", String(stat.lost)), {
            font: "10px Arial",
            color: UI.colors.muted
          }).setOrigin(0, 0.5);
          this.add.text(356, y, `${rate}%`, {
            font: "bold 19px Arial",
            color: "#fde68a"
          }).setOrigin(1, 0.5).setResolution(2);
        });
    }

    new UIButton(this, SCREEN_CENTER_X, 790, 300, 52, t("result.viewProgression"), () => {
      const completion = GameStore.completeCurrentMatch();
      navigateTo(this, "PlayerProgressionScene", {
        progressions: completion?.playerProgressions ?? [],
        seasonSummary: completion?.seasonSummary ?? null
      });
    });
  }

  private getMatchOutcome(ourScore: number, opponentScore: number): MatchOutcome {
    if (ourScore > opponentScore) return "victory";
    if (ourScore < opponentScore) return "defeat";
    return "draw";
  }

  private renderResultHeader(): void {
    this.add.text(SCREEN_CENTER_X, 39, t("result.title").toUpperCase(), {
      font: "bold 30px Arial",
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 6
    }).setOrigin(0.5).setResolution(2);
    this.add.rectangle(SCREEN_CENTER_X, 61, 116, 4, UI.colors.accent, 0.95);
  }

  private renderScorePanel(
    homeName: string,
    awayName: string,
    homeScore: number,
    awayScore: number,
    homeColors: JerseyColors,
    awayColors: JerseyColors,
    outcome: MatchOutcome
  ): void {
    const y = 147;
    const width = PANEL_WIDTH;
    const height = 158;
    const left = SCREEN_CENTER_X - width / 2;
    const top = y - height / 2;
    const graphics = renderResultOverlayPanel(this, left, top, width, height);

    graphics.fillStyle(homeColors.primary, 0.24);
    graphics.fillRoundedRect(left + 2, top + 2, width / 2 - 2, height - 4, 16);
    graphics.fillStyle(awayColors.primary, 0.24);
    graphics.fillRoundedRect(SCREEN_CENTER_X, top + 2, width / 2 - 2, height - 4, 16);
    graphics.fillStyle(homeColors.primary, 1);
    graphics.fillRoundedRect(left + 10, top + 8, width / 2 - 20, 4, 2);
    graphics.fillStyle(awayColors.primary, 1);
    graphics.fillRoundedRect(SCREEN_CENTER_X + 10, top + 8, width / 2 - 20, 4, 2);
    graphics.fillStyle(0xf8fafc, 0.2);
    graphics.fillRect(SCREEN_CENTER_X - 1, top + 20, 2, height - 40);

    this.add.text(104, 118, homeName.toUpperCase(), {
      font: `bold ${this.getTeamNameFontSize(homeName)}px Arial`,
      color: UI.colors.text,
      align: "center",
      stroke: "#020617",
      strokeThickness: 3,
      wordWrap: { width: 142, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.text(286, 118, awayName.toUpperCase(), {
      font: `bold ${this.getTeamNameFontSize(awayName)}px Arial`,
      color: UI.colors.text,
      align: "center",
      stroke: "#020617",
      strokeThickness: 3,
      wordWrap: { width: 142, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.text(112, 161, String(homeScore), {
      font: "bold 46px Arial",
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 5
    }).setOrigin(0.5).setResolution(2);
    this.add.text(278, 161, String(awayScore), {
      font: "bold 46px Arial",
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 5
    }).setOrigin(0.5).setResolution(2);

    const outcomeColor = this.getOutcomeColor(outcome);
    const outcomeX = outcome === "draw" ? SCREEN_CENTER_X : 104;
    this.add.text(outcomeX, 207, t(`result.${outcome}`).toUpperCase(), {
      font: "bold 13px Arial",
      color: outcomeColor,
      stroke: "#020617",
      strokeThickness: 3
    }).setOrigin(0.5).setResolution(2);
    graphics.fillStyle(outcome === "defeat" ? 0xf87171 : UI.colors.accent, 0.95);
    graphics.fillRoundedRect(outcomeX - 43, 218, 86, 3, 2);
  }

  private renderComparisonRow(
    y: number,
    label: string,
    value: number,
    homeColors: JerseyColors,
    awayColors: JerseyColors
  ): void {
    const clampedValue = Phaser.Math.Clamp(value, 0, 100);
    const roundedValue = Math.round(clampedValue);
    const awayValue = 100 - roundedValue;
    const top = y - 32;
    const graphics = renderResultOverlayPanel(this, 18, top, 354, 64);

    graphics.fillStyle(homeColors.primary, 0.12);
    graphics.fillRoundedRect(20, top + 2, 88, 60, 12);
    graphics.fillStyle(awayColors.primary, 0.12);
    graphics.fillRoundedRect(282, top + 2, 88, 60, 12);
    graphics.fillStyle(homeColors.secondary, 0.95);
    graphics.fillRoundedRect(28, top + 6, 70, 3, 2);
    graphics.fillStyle(awayColors.secondary, 0.95);
    graphics.fillRoundedRect(292, top + 6, 70, 3, 2);
    graphics.fillStyle(0x94a3b8, 0.22);
    graphics.fillRect(112, top + 12, 1, 40);
    graphics.fillRect(277, top + 12, 1, 40);

    this.add.text(64, y + 1, `${roundedValue}%`, {
      font: "bold 27px Arial",
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 4
    }).setOrigin(0.5).setResolution(2);
    this.add.text(326, y + 1, `${awayValue}%`, {
      font: "bold 27px Arial",
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 4
    }).setOrigin(0.5).setResolution(2);
    this.add.text(SCREEN_CENTER_X, y - 9, label.toUpperCase(), {
      font: "bold 12px Arial",
      color: UI.colors.text
    }).setOrigin(0.5).setResolution(2);

    const barX = 137;
    const barY = y + 13;
    const barWidth = 116;
    graphics.fillStyle(0x1e293b, 1);
    graphics.fillRoundedRect(barX, barY, barWidth, 7, 3);
    if (clampedValue > 0) {
      graphics.fillStyle(homeColors.primary, 1);
      graphics.fillRoundedRect(barX, barY, barWidth * clampedValue / 100, 7, 3);
    }
    if (clampedValue < 100) {
      graphics.fillStyle(awayColors.primary, 1);
      graphics.fillRoundedRect(
        barX + barWidth * clampedValue / 100,
        barY,
        barWidth * (100 - clampedValue) / 100,
        7,
        3
      );
    }
  }

  private renderLineoutSummary(
    totalLineouts: number,
    attackWon: number,
    attackPlayed: number,
    defenseWon: number,
    defensePlayed: number,
    homeColors: JerseyColors
  ): void {
    const top = 386;
    const graphics = renderResultOverlayPanel(this, 18, top, 354, 76);
    const columns = [
      { x: 76, value: totalLineouts, label: t("result.totalLineouts"), color: UI.colors.accent },
      {
        x: 195,
        value: `${attackWon}/${attackPlayed}`,
        label: t("result.offensiveLineouts"),
        color: homeColors.secondary
      },
      {
        x: 314,
        value: `${defenseWon}/${defensePlayed}`,
        label: t("result.defensiveLineouts"),
        color: 0xf87171
      }
    ];

    graphics.fillStyle(0x94a3b8, 0.2);
    graphics.fillRect(135, top + 14, 1, 48);
    graphics.fillRect(254, top + 14, 1, 48);
    columns.forEach((column) => {
      graphics.fillStyle(column.color, 0.95);
      graphics.fillRoundedRect(column.x - 38, top + 6, 76, 3, 2);
      this.add.text(column.x, top + 28, String(column.value), {
        font: "bold 25px Arial",
        color: UI.colors.text,
        stroke: "#020617",
        strokeThickness: 3
      }).setOrigin(0.5).setResolution(2);
      this.add.text(column.x, top + 55, column.label.toUpperCase(), {
        font: "bold 9px Arial",
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 104, useAdvancedWrap: true }
      }).setOrigin(0.5).setResolution(2);
    });
  }

  private getTeamNameFontSize(name: string): number {
    if (name.length > 20) return 9;
    if (name.length > 15) return 10;
    return 12;
  }

  private getOutcomeColor(outcome: MatchOutcome): string {
    if (outcome === "victory") return "#fde047";
    if (outcome === "defeat") return "#f87171";
    return UI.colors.text;
  }
}
