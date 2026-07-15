import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(): void {
    const match = GameStore.getMatch();

    renderMenuBackdrop(this);
    this.add.text(195, 48, t("result.title"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);

    if (!match) {
      this.add.text(195, 220, t("result.noMatch"), {
        font: UI.font.subtitle,
        color: UI.colors.text
      }).setOrigin(0.5);
      new UIButton(this, 195, 760, 260, 52, t("result.backTraining"), () => {
        navigateTo(this, "LineoutScene", { mode: "training" });
      });
      return;
    }

    const totalLineouts = match.lineoutHistory.length;
    const successfulLineouts = match.lineoutHistory.filter((item) => item.success).length;
    const attackLineouts = match.lineoutHistory.filter((item) => item.throwingSide === "us");
    const defenseLineouts = match.lineoutHistory.filter((item) => item.throwingSide === "opponent");
    const attackWon = attackLineouts.filter((item) => item.success).length;
    const defenseWon = defenseLineouts.filter((item) => item.success).length;
    const masteryRate = totalLineouts > 0 ? Math.round((successfulLineouts / totalLineouts) * 100) : 0;
    const attackRate = attackLineouts.length > 0 ? Math.round((attackWon / attackLineouts.length) * 100) : 0;
    const defenseRate = defenseLineouts.length > 0 ? Math.round((defenseWon / defenseLineouts.length) * 100) : 0;

    this.add.text(195, 126, `${match.home.name} ${match.ourScore} - ${match.opponentScore} ${match.away.name}`, {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    this.renderGauge(195, 172, 310, masteryRate, t("result.masteryRate"), "#facc15");
    this.renderGauge(195, 236, 310, attackRate, t("result.attackRate"), "#60a5fa");
    this.renderGauge(195, 300, 310, defenseRate, t("result.defenseRate"), "#f87171");
    this.renderGauge(195, 364, 310, match.possession, t("match.possession"), "#34d399");
    this.renderGauge(195, 428, 310, match.occupation, t("match.occupation"), "#a78bfa");

    this.renderStatCard(76, 506, String(totalLineouts), t("result.totalLineouts"));
    this.renderStatCard(195, 506, String(attackWon), t("result.attackWon"));
    this.renderStatCard(314, 506, String(defenseWon), t("result.defenseWon"));

    this.add.text(195, 560, t("result.combinationsTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text
    }).setOrigin(0.5);

    const stats = Object.values(match.combinationStats);
    if (stats.length === 0) {
      this.add.text(195, 614, t("result.noCombinationStats"), {
        font: UI.font.body,
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 320 }
      }).setOrigin(0.5);
    } else {
      stats
        .sort((left, right) => right.played - left.played)
        .slice(0, 3)
        .forEach((stat, index) => {
          const y = 606 + index * 42;
          const rate = stat.played > 0 ? Math.round((stat.won / stat.played) * 100) : 0;
          this.add.rectangle(195, y + 18, 334, 2, 0xf8fafc, 0.1);
          this.add.text(32, y - 8, stat.combinationName, { font: "bold 13px Arial", color: UI.colors.text }).setOrigin(0, 0.5);
          this.add.text(32, y + 10, t("result.comboLine")
            .replace("{count}", String(stat.playerCount))
            .replace("{played}", String(stat.played))
            .replace("{won}", String(stat.won))
            .replace("{lost}", String(stat.lost)), {
            font: "10px Arial",
            color: UI.colors.muted
          }).setOrigin(0, 0.5);
          this.add.text(342, y, `${rate}%`, { font: "bold 16px Arial", color: "#fde68a" }).setOrigin(1, 0.5);
        });
    }

    new UIButton(this, 195, 790, 300, 52, t("result.backTraining"), () => {
      GameStore.completeCurrentMatch();
      navigateTo(this, "LineoutScene", { mode: "training" });
    });
  }

  private renderGauge(x: number, y: number, width: number, value: number, label: string, fillColor: string): void {
    const roundedValue = Math.round(value);
    this.add.text(x - width / 2, y - 18, label, {
      font: "bold 13px Arial",
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.add.text(x + width / 2, y - 18, `${roundedValue}%`, {
      font: "bold 13px Arial",
      color: UI.colors.text
    }).setOrigin(1, 0.5);
    this.add.rectangle(x, y, width, 14, 0x1e293b).setStrokeStyle(1, 0x475569);
    this.add.rectangle(x - width / 2, y, (width * value) / 100, 10, Phaser.Display.Color.HexStringToColor(fillColor).color).setOrigin(0, 0.5);
  }

  private renderStatCard(x: number, y: number, value: string, label: string): void {
    this.add.rectangle(x, y, 102, 56, 0x0d1b14, 0.96).setStrokeStyle(2, 0x40604b);
    this.add.text(x, y - 8, value, { font: "bold 24px Arial", color: UI.colors.text }).setOrigin(0.5);
    this.add.text(x, y + 12, label, {
      font: "11px Arial",
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 90 }
    }).setOrigin(0.5);
  }
}
