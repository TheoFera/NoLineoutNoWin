import Phaser from "phaser";
import { generateOpponent } from "../ai/OpponentGenerator";
import { getCurrentOpponentId, getCurrentRoundLabel, getPlayerRank, sortStandings } from "../rules/ChampionshipRules";
import { getDivision } from "../rules/DivisionRules";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

export class ChampionshipScene extends Phaser.Scene {
  constructor() {
    super("ChampionshipScene");
  }

  create(): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const divisionLabel = t(`division.${save.currentDivisionId}`);
    const championship = save.championship;
    const standings = sortStandings(championship.standings);
    const nextOpponentId = getCurrentOpponentId(championship);
    const nextOpponentIndex = nextOpponentId ? Number.parseInt(nextOpponentId.replace("opponent_", ""), 10) : 1;
    const nextOpponentName = nextOpponentId ? generateOpponent(nextOpponentIndex, division).name : t("championship.finished");
    const playerRank = getPlayerRank(championship);

    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 70, t("menu.championship"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 120, `${divisionLabel} · ${t("championship.season")} ${save.season}`, { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 158, `${t("championship.round")} ${getCurrentRoundLabel(championship)} · ${t("championship.rank")} ${playerRank}`, {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.add.text(195, 188, `${t("championship.nextOpponent")} ${nextOpponentName}`, {
      font: UI.font.body,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 340 }
    }).setOrigin(0.5);

    standings.slice(0, 8).forEach((record, index) => {
      const y = 248 + index * 48;
      const highlighted = record.teamId === "player_team";
      this.add.rectangle(195, y, 338, 38, highlighted ? UI.colors.panel : UI.colors.panelDark, 0.96).setStrokeStyle(1, highlighted ? UI.colors.accent : UI.colors.line);
      this.add.text(32, y, `${index + 1}`, { font: UI.font.small, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(62, y, record.name, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(260, y, `${record.played}J`, { font: UI.font.small, color: UI.colors.muted }).setOrigin(0.5);
      this.add.text(302, y, `${record.leaguePoints} pts`, { font: UI.font.small, color: UI.colors.text }).setOrigin(0.5);
    });

    this.add.text(195, 646, t("championship.top2Hint"), {
      font: UI.font.small,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);

    new UIButton(this, 195, 735, 220, 48, t("button.back"), () => navigateTo(this, "LineoutScene", { mode: "training" }));
  }
}
