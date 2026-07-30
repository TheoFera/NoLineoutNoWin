import Phaser from "phaser";
import { getCurrentOpponentId, getCurrentRoundLabel, getGoalAverage, sortStandings } from "../rules/ChampionshipRules";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { renderMenuPanel } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import type { ChampionshipTeamRecord } from "../models/Championship";

export class ChampionshipScene extends Phaser.Scene {
  constructor() {
    super("ChampionshipScene");
  }

  preload(): void {
    if (!this.textures.exists("championship-menu-background")) {
      this.load.image("championship-menu-background", "assets/images/championship-menu-background.png");
    }
  }

  create(): void {
    const save = GameStore.getSave();
    const divisionLabel = t(`division.${save.currentDivisionId}`);
    const championship = save.championship;
    const standings = sortStandings(championship.standings);
    const nextOpponentId = getCurrentOpponentId(championship);
    const nextOpponentRecord = nextOpponentId
      ? championship.standings.find((record) => record.teamId === nextOpponentId) ?? null
      : null;
    const nextOpponentName = nextOpponentRecord?.name ?? t("championship.finished");
    const visibleStandings = this.buildVisibleStandings(standings, nextOpponentId);
    const standingsPanelCenterX = 195;
    const standingsPanelWidth = 338;
    const teamNameX = 62;
    const contentSideInset = teamNameX - (standingsPanelCenterX - standingsPanelWidth / 2);
    const goalAverageColumnCenterX = standingsPanelCenterX + standingsPanelWidth / 2 - contentSideInset - 6;
    const pointsColumnCenterX = goalAverageColumnCenterX - 46;
    const nextMatchBadgeCenterX = pointsColumnCenterX - 60;
    const standingsHeaderY = 288;
    const firstStandingRowY = 318;

    this.renderChampionshipBackground();
    this.add.text(195, 160, `${t("championship.season")} ${save.season} - ${divisionLabel}`, {
      font: UI.font.body,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);
    renderMenuPanel(this, {
      x: standingsPanelCenterX,
      y: 456,
      width: standingsPanelWidth,
      height: 396,
      accentColor: 0x2f73d1,
      fillColor: 0x071326
    });

    this.add.text(195, 202, `${t("championship.round")} ${getCurrentRoundLabel(championship)}`, {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.add.text(195, 234, `${t("championship.nextOpponent")} ${nextOpponentName}`, {
      font: UI.font.body,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    const tableHeaderStyle = { font: "bold 10px Arial", color: UI.colors.muted };
    this.add.text(32, standingsHeaderY, t("championship.tableRank"), tableHeaderStyle).setOrigin(0, 0.5);
    this.add.text(teamNameX, standingsHeaderY, t("championship.tableClub"), tableHeaderStyle).setOrigin(0, 0.5);
    this.add.text(pointsColumnCenterX, standingsHeaderY, t("championship.tablePoints"), tableHeaderStyle).setOrigin(0.5);
    this.add.text(goalAverageColumnCenterX, standingsHeaderY, t("championship.goalAverageShort"), tableHeaderStyle).setOrigin(0.5);
    this.add.rectangle(standingsPanelCenterX, standingsHeaderY + 14, 322, 2, 0xf8fafc, 0.25);

    visibleStandings.forEach((record, index) => {
      const y = firstStandingRowY + index * 40;
      const isPlayerTeam = record.teamId === "player_team";
      const isNextOpponent = record.teamId === nextOpponentId;
      const rank = standings.findIndex((item) => item.teamId === record.teamId) + 1;
      const nameColor = isPlayerTeam ? "#fde68a" : UI.colors.text;
      const statisticsColor = isNextOpponent ? "#bfdbfe" : UI.colors.text;
      const goalAverage = getGoalAverage(record);
      const formattedGoalAverage = goalAverage > 0 ? `+${goalAverage}` : String(goalAverage);

      this.add.rectangle(195, y + 16, 322, 2, 0xf8fafc, 0.1);
      if (isPlayerTeam) {
        this.add.rectangle(28, y, 6, 24, UI.colors.accent, 0.95);
      } else if (isNextOpponent) {
        this.add.rectangle(28, y, 6, 24, 0x60a5fa, 0.95);
      }
      this.add.text(32, y, `${rank}`, { font: UI.font.small, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(teamNameX, y, record.name, { font: UI.font.body, color: nameColor }).setOrigin(0, 0.5);
      this.add.text(goalAverageColumnCenterX, y, formattedGoalAverage, {
        font: UI.font.small,
        color: statisticsColor
      }).setOrigin(0.5);
      this.add.text(pointsColumnCenterX, y, `${record.leaguePoints}`, {
        font: UI.font.small,
        color: statisticsColor
      }).setOrigin(0.5);

      if (isNextOpponent) {
        this.add.rectangle(nextMatchBadgeCenterX, y, 42, 16, 0x1d4ed8, 1).setStrokeStyle(1, 0xbfdbfe, 0.9);
        this.add.text(nextMatchBadgeCenterX, y, t("championship.nextMatchShort"), {
          font: "bold 9px Arial",
          color: UI.colors.text
        }).setOrigin(0.5);
      }
    });

    new UIButton(this, 195, 724, 260, 48, t("match.playNow"), () => navigateTo(this, "MatchScene"));
    new UIButton(this, 195, 788, 220, 42, t("button.back"), () => navigateTo(this, "LineoutScene", { mode: "training" }), {
      variant: "secondary"
    });
  }

  private renderChampionshipBackground(): void {
    const background = this.add.image(195, 422, "championship-menu-background");
    const source = background.texture.getSourceImage() as { width: number; height: number; };
    const scale = Math.max(390 / source.width, 844 / source.height);

    background.setScale(scale);
    this.add.rectangle(195, 422, 390, 844, 0x020617, 0.3);
  }

  private buildVisibleStandings(standings: ChampionshipTeamRecord[], nextOpponentId: string | null): ChampionshipTeamRecord[] {
    const requiredIds = ["player_team", nextOpponentId].filter((value): value is string => Boolean(value));
    const visible: ChampionshipTeamRecord[] = [];
    const seen = new Set<string>();

    for (const record of standings) {
      if (requiredIds.includes(record.teamId) && !seen.has(record.teamId)) {
        visible.push(record);
        seen.add(record.teamId);
      }
    }

    for (const record of standings) {
      if (visible.length >= 8) {
        break;
      }

      if (seen.has(record.teamId)) {
        continue;
      }

      visible.push(record);
      seen.add(record.teamId);
    }

    return visible.sort((left, right) => standings.findIndex((record) => record.teamId === left.teamId) - standings.findIndex((record) => record.teamId === right.teamId));
  }
}
