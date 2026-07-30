import Phaser from "phaser";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type { SeasonSummary } from "../models/Championship";
import { getDivision } from "../rules/DivisionRules";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import {
  preloadMatchPitchBackdrop,
  renderMatchPitchBackdrop
} from "../ui/MatchPitchBackdrop";
import { renderResultOverlayPanel } from "../ui/ResultOverlayPanel";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

type SeasonResultSceneData = {
  summary?: SeasonSummary;
};

type DivisionChange = {
  label: string;
  previousValue: string;
  nextValue: string;
};

const SCREEN_CENTER_X = 195;
const PANEL_LEFT = 18;
const PANEL_WIDTH = 354;

export class SeasonResultScene extends Phaser.Scene {
  private summary: SeasonSummary | null = null;

  constructor() {
    super("SeasonResultScene");
  }

  init(data: SeasonResultSceneData): void {
    this.summary = data.summary ?? null;
  }

  preload(): void {
    preloadMatchPitchBackdrop(this);
  }

  create(): void {
    renderMatchPitchBackdrop(this, 0.68);

    if (!this.summary) {
      this.add.text(SCREEN_CENTER_X, 260, t("seasonResult.unavailable"), {
        font: UI.font.subtitle,
        color: UI.colors.text,
        align: "center",
        wordWrap: { width: 310 }
      }).setOrigin(0.5);
      this.renderContinueButton();
      return;
    }

    const summary = this.summary;
    const previousDivisionLabel = t(`division.${summary.previousDivisionId}`);
    const nextDivisionLabel = t(`division.${summary.nextDivisionId}`);
    const resultKey = summary.promoted ? "seasonResult.promoted" : "seasonResult.maintained";
    const resultText = t(resultKey).replace("{division}", nextDivisionLabel);

    this.renderHeader(summary.season);
    this.renderSeasonOutcome(resultText, previousDivisionLabel, summary.promoted);
    this.renderSeasonRecord(summary);
    this.renderDivisionChanges(summary);
    this.renderContinueButton();
  }

  private renderHeader(season: number): void {
    const title = t("seasonResult.title").replace("{season}", String(season)).toUpperCase();
    this.add.text(SCREEN_CENTER_X, 38, title, {
      font: "bold 26px Arial",
      color: UI.colors.text,
      align: "center",
      stroke: "#020617",
      strokeThickness: 6,
      wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.rectangle(SCREEN_CENTER_X, 61, 116, 4, UI.colors.accent, 0.95);
  }

  private renderSeasonOutcome(resultText: string, previousDivisionLabel: string, promoted: boolean): void {
    const top = 72;
    const accentColor = promoted ? 0x4ade80 : 0x60a5fa;
    const panel = renderResultOverlayPanel(this, PANEL_LEFT, top, PANEL_WIDTH, 104);

    panel.fillStyle(promoted ? 0x123c28 : 0x172c4d, 0.42);
    panel.fillRoundedRect(PANEL_LEFT + 2, top + 2, PANEL_WIDTH - 4, 100, 14);
    panel.fillStyle(accentColor, 0.98);
    panel.fillRoundedRect(PANEL_LEFT + 14, top + 8, PANEL_WIDTH - 28, 4, 2);
    this.add.text(SCREEN_CENTER_X, 108, resultText.toUpperCase(), {
      font: "bold 21px Arial",
      color: promoted ? "#bbf7d0" : "#bfdbfe",
      align: "center",
      stroke: "#020617",
      strokeThickness: 4,
      wordWrap: { width: 320, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);
    this.add.text(SCREEN_CENTER_X, 147, previousDivisionLabel.toUpperCase(), {
      font: "bold 12px Arial",
      color: UI.colors.muted,
      letterSpacing: 1
    }).setOrigin(0.5).setResolution(2);
  }

  private renderSeasonRecord(summary: SeasonSummary): void {
    const record = summary.playerRecord;
    this.add.text(SCREEN_CENTER_X, 202, t("seasonResult.summaryTitle").toUpperCase(), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      stroke: "#020617",
      strokeThickness: 3
    }).setOrigin(0.5).setResolution(2);

    const top = 220;
    const panel = renderResultOverlayPanel(this, PANEL_LEFT, top, PANEL_WIDTH, 112);
    const columns = [
      {
        x: 76,
        value: `${summary.rank}/${summary.teamCount}`,
        label: t("seasonResult.rank"),
        color: UI.colors.accent
      },
      {
        x: 195,
        value: String(record.leaguePoints),
        label: t("seasonResult.points"),
        color: 0x60a5fa
      },
      {
        x: 314,
        value: `${record.wins}-${record.draws}-${record.losses}`,
        label: t("seasonResult.record"),
        color: 0x4ade80
      }
    ];

    panel.fillStyle(0x94a3b8, 0.2);
    panel.fillRect(135, top + 14, 1, 65);
    panel.fillRect(254, top + 14, 1, 65);
    columns.forEach((column) => {
      panel.fillStyle(column.color, 0.98);
      panel.fillRoundedRect(column.x - 38, top + 7, 76, 3, 2);
      this.add.text(column.x, top + 34, column.value, {
        font: "bold 24px Arial",
        color: UI.colors.text,
        stroke: "#020617",
        strokeThickness: 3
      }).setOrigin(0.5).setResolution(2);
      this.add.text(column.x, top + 63, column.label.toUpperCase(), {
        font: "bold 9px Arial",
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 104, useAdvancedWrap: true }
      }).setOrigin(0.5).setResolution(2);
    });

    const scoreText = t("seasonResult.pointsRecord")
      .replace("{for}", String(record.pointsFor))
      .replace("{against}", String(record.pointsAgainst));
    this.add.text(SCREEN_CENTER_X, top + 94, scoreText.toUpperCase(), {
      font: "bold 10px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5).setResolution(2);
  }

  private renderDivisionChanges(summary: SeasonSummary): void {
    const changes = this.getDivisionChanges(summary);
    this.add.text(SCREEN_CENTER_X, 365, t("seasonResult.changesTitle").toUpperCase(), {
      font: "bold 16px Arial",
      color: UI.colors.text,
      align: "center",
      stroke: "#020617",
      strokeThickness: 3,
      wordWrap: { width: 350, useAdvancedWrap: true }
    }).setOrigin(0.5).setResolution(2);

    if (changes.length === 0) {
      renderResultOverlayPanel(this, PANEL_LEFT, 393, PANEL_WIDTH, 118);
      this.add.text(SCREEN_CENTER_X, 452, t("seasonResult.noChanges"), {
        font: UI.font.body,
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 306, useAdvancedWrap: true }
      }).setOrigin(0.5).setResolution(2);
      return;
    }

    changes.forEach((change, index) => {
      const top = 393 + index * 62;
      const panel = renderResultOverlayPanel(this, PANEL_LEFT, top, PANEL_WIDTH, 54);
      panel.fillStyle(UI.colors.accent, 0.96);
      panel.fillRoundedRect(PANEL_LEFT + 8, top + 9, 4, 36, 2);
      this.add.text(40, top + 17, change.label.toUpperCase(), {
        font: "bold 11px Arial",
        color: UI.colors.text
      }).setOrigin(0, 0.5);
      this.add.text(230, top + 38, change.previousValue, {
        font: "bold 14px Arial",
        color: UI.colors.muted
      }).setOrigin(0.5).setResolution(2);
      this.add.text(276, top + 38, "›", {
        font: "bold 20px Arial",
        color: UI.colors.text
      }).setOrigin(0.5).setResolution(2);
      this.add.text(322, top + 38, change.nextValue, {
        font: "bold 16px Arial",
        color: "#fde68a"
      }).setOrigin(0.5).setResolution(2);
    });
  }

  private getDivisionChanges(summary: SeasonSummary): DivisionChange[] {
    const previousDivision = getDivision(summary.previousDivisionId);
    const nextDivision = getDivision(summary.nextDivisionId);
    const previousRepertoire = LINEOUT_BALANCE.ai.repertoireByDivision[summary.previousDivisionId];
    const nextRepertoire = LINEOUT_BALANCE.ai.repertoireByDivision[summary.nextDivisionId];
    const previousLevel = LINEOUT_BALANCE.generation.divisionStats[summary.previousDivisionId].mean;
    const nextLevel = LINEOUT_BALANCE.generation.divisionStats[summary.nextDivisionId].mean;
    const candidates: Array<DivisionChange & { changed: boolean }> = [
      {
        label: t("seasonResult.change.lineouts"),
        previousValue: `${previousDivision.minLineouts}-${previousDivision.maxLineouts}`,
        nextValue: `${nextDivision.minLineouts}-${nextDivision.maxLineouts}`,
        changed: previousDivision.minLineouts !== nextDivision.minLineouts
          || previousDivision.maxLineouts !== nextDivision.maxLineouts
      },
      {
        label: t("seasonResult.change.activeCombinations"),
        previousValue: String(previousDivision.offensiveCombinations),
        nextValue: String(nextDivision.offensiveCombinations),
        changed: previousDivision.offensiveCombinations !== nextDivision.offensiveCombinations
      },
      {
        label: t("seasonResult.change.reserveCombinations"),
        previousValue: String(previousRepertoire.reserve),
        nextValue: String(nextRepertoire.reserve),
        changed: previousRepertoire.reserve !== nextRepertoire.reserve
      },
      {
        label: t("seasonResult.change.divisionLevel"),
        previousValue: String(previousLevel),
        nextValue: String(nextLevel),
        changed: previousLevel !== nextLevel
      }
    ];

    return candidates.filter((change) => change.changed);
  }

  private renderContinueButton(): void {
    new UIButton(this, SCREEN_CENTER_X, 790, 300, 52, t("seasonResult.continue"), () => {
      navigateTo(this, "LineoutScene", { mode: "training" });
    });
  }
}
