import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { getDivision } from "../rules/DivisionRules";
import { getCurrentOpponentId } from "../rules/ChampionshipRules";
import { generateOpponent } from "../ai/OpponentGenerator";
import { generateMatchLineouts } from "../rules/MatchSimulator";
import { createEmptyUsage } from "../rules/PlayerProgression";
import type { MatchStateData } from "../models/Match";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { randomInt } from "../utils/Random";

export class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
  }

  create(): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const scheduledOpponentId = getCurrentOpponentId(save.championship) ?? "opponent_1";
    const opponentIndex = Number.parseInt(scheduledOpponentId.replace("opponent_", ""), 10) || 1;
    const opponent = generateOpponent(opponentIndex, division);
    let match = GameStore.getMatch();

    if (!match) {
      match = {
        id: `match_${Date.now()}`,
        divisionId: division.id,
        home: save.playerTeam,
        away: opponent,
        minute: 0,
        maxMinute: randomInt(80, 82),
        ourScore: 0,
        opponentScore: 0,
        possession: 50,
        occupation: 50,
        lineouts: generateMatchLineouts(division),
        currentLineoutIndex: 0,
        playerUsage: {
          [save.playerTeam.hooker.id]: createEmptyUsage()
        }
      } satisfies MatchStateData;
      GameStore.setMatch(match);
    }

    this.render(match);
  }

  private render(match: MatchStateData): void {
    this.add.rectangle(195, 422, 390, 844, UI.colors.background);
    this.add.text(195, 70, t("match.title"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 125, `${match.home.name} ${match.ourScore} - ${match.opponentScore} ${match.away.name}`, {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 350 }
    }).setOrigin(0.5);
    this.add.text(195, 170, `${t("match.possession")} ${match.possession}% · ${t("match.occupation")} ${match.occupation}%`, {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);

    const next = match.lineouts[match.currentLineoutIndex];
    if (next) {
      const throwLabel = next.throwingSide === "us" ? t("match.ourThrow") : t("match.opponentThrow");
      const zoneLabel = t(`match.zone.${next.pitchZone}`);
      const playersLabel = t("match.playersCount").replace("{count}", String(next.numberOfPlayers));
      this.add.text(195, 250, `${next.minute}${t("match.minuteSuffix")}\n${throwLabel}\n${t("match.zone")} : ${zoneLabel}\n${playersLabel}`, {
        font: UI.font.subtitle,
        color: UI.colors.text,
        align: "center"
      }).setOrigin(0.5);
      new UIButton(this, 195, 360, 280, 52, t("match.playLineout"), () => navigateTo(this, "LineoutScene", { mode: "match" }));
    } else {
      this.add.text(195, 270, t("match.end"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
      new UIButton(this, 195, 360, 280, 52, t("match.viewResult"), () => navigateTo(this, "ResultScene"));
    }
  }
}
