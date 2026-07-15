import Phaser from "phaser";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type { SeasonSummary } from "../models/Championship";
import { getDivision } from "../rules/DivisionRules";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { renderMenuBackdrop } from "../ui/MenuChrome";
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

export class SeasonResultScene extends Phaser.Scene {
  private summary: SeasonSummary | null = null;

  constructor() {
    super("SeasonResultScene");
  }

  init(data: SeasonResultSceneData): void {
    this.summary = data.summary ?? null;
  }

  create(): void {
    renderMenuBackdrop(this);

    if (!this.summary) {
      this.add.text(195, 260, t("seasonResult.unavailable"), {
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

    this.add.text(195, 54, t("seasonResult.title").replace("{season}", String(summary.season)), {
      font: UI.font.title,
      color: UI.colors.text
    }).setOrigin(0.5);

    this.add.rectangle(195, 126, 330, 92, summary.promoted ? 0x123c28 : 0x172033, 0.96)
      .setStrokeStyle(2, summary.promoted ? 0x4ade80 : 0x60a5fa, 0.9);
    this.add.text(195, 108, resultText, {
      font: UI.font.subtitle,
      color: summary.promoted ? "#bbf7d0" : "#bfdbfe",
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);
    this.add.text(195, 145, previousDivisionLabel, {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);

    this.renderSeasonRecord(summary);
    this.renderDivisionChanges(summary);
    this.renderContinueButton();
  }

  private renderSeasonRecord(summary: SeasonSummary): void {
    const record = summary.playerRecord;
    this.add.text(195, 208, t("seasonResult.summaryTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0.5);

    this.renderStatCard(72, 258, `${summary.rank}/${summary.teamCount}`, t("seasonResult.rank"));
    this.renderStatCard(195, 258, String(record.leaguePoints), t("seasonResult.points"));
    this.renderStatCard(318, 258, `${record.wins}-${record.draws}-${record.losses}`, t("seasonResult.record"));

    const scoreText = t("seasonResult.pointsRecord")
      .replace("{for}", String(record.pointsFor))
      .replace("{against}", String(record.pointsAgainst));
    this.add.text(195, 310, scoreText, {
      font: UI.font.small,
      color: UI.colors.muted
    }).setOrigin(0.5);
  }

  private renderDivisionChanges(summary: SeasonSummary): void {
    const changes = this.getDivisionChanges(summary);
    this.add.text(195, 366, t("seasonResult.changesTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0.5);

    if (changes.length === 0) {
      this.add.rectangle(195, 454, 330, 112, 0x0d1b14, 0.96).setStrokeStyle(1, 0x40604b);
      this.add.text(195, 454, t("seasonResult.noChanges"), {
        font: UI.font.body,
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 286 }
      }).setOrigin(0.5);
      return;
    }

    changes.forEach((change, index) => {
      const y = 416 + index * 66;
      this.add.rectangle(195, y, 330, 52, 0x0d1b14, 0.96).setStrokeStyle(1, 0x40604b);
      this.add.text(46, y - 9, change.label, {
        font: "bold 12px Arial",
        color: UI.colors.text
      }).setOrigin(0, 0.5);
      this.add.text(46, y + 11, `${change.previousValue}  >  ${change.nextValue}`, {
        font: UI.font.body,
        color: "#fde68a"
      }).setOrigin(0, 0.5);
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

  private renderStatCard(x: number, y: number, value: string, label: string): void {
    this.add.rectangle(x, y, 104, 68, 0x0d1b14, 0.96).setStrokeStyle(1, 0x40604b);
    this.add.text(x, y - 10, value, { font: "bold 22px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(x, y + 15, label, {
      font: "10px Arial",
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 94 }
    }).setOrigin(0.5);
  }

  private renderContinueButton(): void {
    new UIButton(this, 195, 790, 300, 52, t("seasonResult.continue"), () => {
      navigateTo(this, "LineoutScene", { mode: "training" });
    });
  }
}
