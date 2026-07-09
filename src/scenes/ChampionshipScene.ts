import Phaser from "phaser";
import { getCurrentOpponentId, getCurrentRoundLabel, getPlayerRank, sortStandings } from "../rules/ChampionshipRules";
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
    const playerRank = getPlayerRank(championship);
    const visibleStandings = this.buildVisibleStandings(standings, nextOpponentId);

    this.renderChampionshipBackground();
    this.add.text(195, 160, `${t("championship.season")} ${save.season} - ${divisionLabel}`, {
      font: UI.font.body,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);
    renderMenuPanel(this, {
      x: 195,
      y: 456,
      width: 338,
      height: 396,
      accentColor: 0x35584a,
      fillColor: 0x07120d
    });

    this.add.text(195, 202, `${t("championship.round")} ${getCurrentRoundLabel(championship)} - ${t("championship.rank")} ${playerRank}`, {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.add.text(195, 234, `${t("championship.nextOpponent")} ${nextOpponentName}`, {
      font: UI.font.body,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    visibleStandings.forEach((record, index) => {
      const y = 304 + index * 40;
      const isPlayerTeam = record.teamId === "player_team";
      const isNextOpponent = record.teamId === nextOpponentId;
      const rank = standings.findIndex((item) => item.teamId === record.teamId) + 1;
      const nameColor = isPlayerTeam ? "#fde68a" : UI.colors.text;
      const pointsColor = isNextOpponent ? "#bfdbfe" : UI.colors.text;

      this.add.rectangle(195, y + 16, 322, 2, 0xf8fafc, 0.1);
      if (isPlayerTeam) {
        this.add.rectangle(28, y, 6, 24, UI.colors.accent, 0.95);
      } else if (isNextOpponent) {
        this.add.rectangle(28, y, 6, 24, 0x60a5fa, 0.95);
      }
      this.add.text(32, y, `${rank}`, { font: UI.font.small, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(62, y, record.name, { font: UI.font.body, color: nameColor }).setOrigin(0, 0.5);
      this.add.text(260, y, `${record.played}J`, { font: UI.font.small, color: UI.colors.muted }).setOrigin(0.5);
      this.add.text(302, y, `${record.leaguePoints} pts`, { font: UI.font.small, color: pointsColor }).setOrigin(0.5);

      if (isNextOpponent) {
        this.add.rectangle(324, y, 42, 16, 0x1d4ed8, 1).setStrokeStyle(1, 0xbfdbfe, 0.9);
        this.add.text(324, y, t("championship.nextMatchShort"), {
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
