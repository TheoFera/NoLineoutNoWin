import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { getDivision } from "../rules/DivisionRules";
import { getCurrentOpponentId } from "../rules/ChampionshipRules";
import { generateOpponentById } from "../ai/OpponentGenerator";
import { generateMatchLineouts } from "../rules/MatchSimulator";
import { countAssignedPlayers, getAvailableOffensiveCombinations, getCombinationDisplayName, normalizeCombinationSlots, normalizeOffensiveCombinations } from "../rules/CombinationRules";
import { createEmptyUsage } from "../rules/PlayerProgression";
import type { MatchStateData } from "../models/Match";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { randomInt } from "../utils/Random";

type MatchLineoutEvent = MatchStateData["lineouts"][number];
type OffensiveCombination = ReturnType<typeof normalizeOffensiveCombinations>[number];

export class MatchScene extends Phaser.Scene {
  constructor() {
    super("MatchScene");
  }

  create(): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const scheduledOpponentId = getCurrentOpponentId(save.championship) ?? "opponent_1";
    const opponent = generateOpponentById(scheduledOpponentId, division);
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
        },
        combinationStats: {},
        lineoutHistory: []
      } satisfies MatchStateData;
      GameStore.setMatch(match);
    }

    this.render(match);
  }

  private render(match: MatchStateData): void {
    renderMenuBackdrop(this);

    const next = match.lineouts[match.currentLineoutIndex];
    this.renderScoreboard(match, next);

    if (!next) {
      this.renderFullTimePanel();
      return;
    }

    this.renderCurrentPhasePanel(next);

    if (next.throwingSide === "us") {
      this.renderOffensiveBoard(match, next);
      return;
    }

    this.renderDefensiveBoard(next);
  }

  private renderScoreboard(match: MatchStateData, next?: MatchLineoutEvent): void {
    const minute = next?.minute ?? match.minute;
    const periodKey = minute < 40 ? "match.period.firstHalf" : "match.period.secondHalf";

    this.add.rectangle(98, 42, 196, 76, 0x11335b, 0.98).setStrokeStyle(2, 0x27568a);
    this.add.rectangle(292, 42, 196, 76, 0x6a1f19, 0.98).setStrokeStyle(2, 0x8d342d);
    this.add.rectangle(195, 42, 86, 76, 0x09131c, 1).setStrokeStyle(2, 0x1f2937);

    this.add.text(72, 20, match.home.name.toUpperCase(), {
      font: "bold 11px Arial",
      color: UI.colors.text,
      wordWrap: { width: 105 }
    }).setOrigin(0, 0.5);
    this.add.text(72, 55, String(match.ourScore), {
      font: "bold 28px Arial",
      color: UI.colors.text
    }).setOrigin(0, 0.5);
    this.add.text(318, 20, match.away.name.toUpperCase(), {
      font: "bold 11px Arial",
      color: UI.colors.text,
      align: "right",
      wordWrap: { width: 105 }
    }).setOrigin(1, 0.5);
    this.add.text(318, 55, String(match.opponentScore), {
      font: "bold 28px Arial",
      color: UI.colors.text
    }).setOrigin(1, 0.5);

    this.add.text(195, 34, this.formatMinute(minute), { font: "bold 22px Arial", color: "#fbbf24" }).setOrigin(0.5);
    this.add.text(195, 62, t(periodKey), { font: "bold 11px Arial", color: "#84cc16" }).setOrigin(0.5);

    this.add.rectangle(78, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);
    this.add.rectangle(195, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);
    this.add.rectangle(312, 110, 116, 44, 0x07111a, 0.96).setStrokeStyle(1, 0x334155);

    this.add.text(78, 96, t("match.possession").toUpperCase(), {
      font: "bold 9px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(54, 114, `${match.possession}%`, {
      font: "bold 15px Arial",
      color: "#60a5fa"
    }).setOrigin(0.5);
    this.add.text(102, 114, `${100 - match.possession}%`, {
      font: "bold 15px Arial",
      color: "#ef4444"
    }).setOrigin(0.5);
    this.add.rectangle(78, 130, 82, 6, 0x1e293b);
    this.add.rectangle(78 - 41 + (82 * match.possession) / 200, 130, (82 * match.possession) / 100, 5, 0x2563eb).setOrigin(0, 0.5);
    this.add.rectangle(78 + (82 * match.possession) / 200, 130, (82 * (100 - match.possession)) / 100, 5, 0xdc2626).setOrigin(0, 0.5);

    this.add.text(195, 96, t("match.occupation").toUpperCase(), {
      font: "bold 9px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(195, 118, `${match.occupation}%`, {
      font: "bold 18px Arial",
      color: "#84cc16"
    }).setOrigin(0.5);
    this.add.text(312, 96, t("match.zone").toUpperCase(), {
      font: "bold 9px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(312, 118, t(`match.zone.${next?.pitchZone ?? "middle"}`), {
      font: "bold 12px Arial",
      color: "#f8fafc",
      align: "center",
      wordWrap: { width: 92 }
    }).setOrigin(0.5);
  }

  private renderCurrentPhasePanel(next: MatchLineoutEvent): void {
    const phaseLabel = next.throwingSide === "us" ? t("match.phase.attack") : t("match.phase.defense");
    const throwLabel = next.throwingSide === "us" ? t("match.ourThrow") : t("match.opponentThrow");
    const phaseColor = next.throwingSide === "us" ? UI.colors.attack : UI.colors.defense;

    this.add.text(195, 192, `${next.minute}${t("match.minuteSuffix")}`, {
      font: "bold 24px Arial",
      color: "#f8fafc"
    }).setOrigin(0.5);

    this.add.rectangle(195, 226, 122, 28, phaseColor, 1).setStrokeStyle(2, 0xffffff, 0.6);
    this.add.text(195, 226, phaseLabel, {
      font: "bold 14px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);

    this.add.text(195, 254, throwLabel, {
      font: "bold 16px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
  }

  private renderOffensiveBoard(match: MatchStateData, next: MatchLineoutEvent): void {
    const save = GameStore.getSave();
    const division = getDivision(save.currentDivisionId);
    const combinations = getAvailableOffensiveCombinations(
      normalizeOffensiveCombinations(save.offensiveCombinations),
      division.offensiveCombinations
    );

    const boardY = 552;
    const boardHeight = 444;
    const boardTop = boardY - boardHeight / 2;
    const phrase = t("match.offensiveOverlay")
      .replace("{zone}", t(`match.zone.${next.pitchZone}`))
      .replace("{team}", match.home.name);

    this.add.text(195, boardTop + 36, phrase, {
      font: "bold 22px Arial",
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 286 }
    }).setOrigin(0.5);
    this.add.text(195, boardTop + 84, t("match.chooseCombination"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 280 }
    }).setOrigin(0.5);

    const gap = 10;
    const availableHeight = 282;
    const cardHeight = Phaser.Math.Clamp(Math.floor((availableHeight - gap * Math.max(0, combinations.length - 1)) / Math.max(1, combinations.length)), 54, 86);
    const listUsedHeight = combinations.length * cardHeight + Math.max(0, combinations.length - 1) * gap;
    const firstCardCenterY = boardTop + 130 + (availableHeight - listUsedHeight) / 2 + cardHeight / 2;

    combinations.forEach((combination, index) => {
      const cardY = firstCardCenterY + index * (cardHeight + gap);
      this.renderCombinationCard(combination, cardY, cardHeight);
    });
  }

  private renderDefensiveBoard(next: MatchLineoutEvent): void {
    const zoneLabel = t(`match.zone.${next.pitchZone}`);
    const playersLabel = t("match.playersCount").replace("{count}", String(next.numberOfPlayers));

    this.add.text(195, 398, `${t("match.opponentThrow")} - ${zoneLabel}`, {
      font: "bold 22px Arial",
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 290 }
    }).setOrigin(0.5);
    this.add.text(195, 438, playersLabel, {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center"
    }).setOrigin(0.5);

    this.renderStaticLineoutPreview(195, 528, next.numberOfPlayers, false);

    new UIButton(this, 195, 646, 280, 52, t("match.playLineout"), () => navigateTo(this, "LineoutScene", { mode: "match" }));
  }

  private renderFullTimePanel(): void {
    this.add.text(195, 386, t("match.end"), {
      font: "bold 28px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(195, 430, t("match.viewResult"), {
      font: UI.font.body,
      color: UI.colors.muted
    }).setOrigin(0.5);

    new UIButton(this, 195, 492, 280, 52, t("match.viewResult"), () => navigateTo(this, "ResultScene"));
  }

  private renderCombinationCard(combination: OffensiveCombination, y: number, height: number): void {
    const playerCount = countAssignedPlayers(combination);
    const cardWidth = 298;
    const left = 195 - cardWidth / 2;
    const top = y - height / 2;
    const accentColor = playerCount > 0 ? UI.colors.accent : 0x64748b;
    const card = this.add.graphics().setDepth(10);

    card.fillStyle(0x0b1711, 0.98);
    card.lineStyle(2, accentColor, 0.95);
    card.fillRoundedRect(left, top, cardWidth, height, 16);
    card.strokeRoundedRect(left, top, cardWidth, height, 16);
    card.fillStyle(0xffffff, 0.06);
    card.fillRoundedRect(left + 12, top + 12, 122, Math.max(18, height - 24), 10);

    const hitArea = this.add.zone(195, y, cardWidth, height).setOrigin(0.5).setDepth(11)
      .setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", () => {
      navigateTo(this, "LineoutScene", { mode: "match", combinationId: combination.id });
    });

    this.add.text(left + 22, top + 22, getCombinationDisplayName(combination, t), {
      font: `bold ${Math.max(14, Math.min(18, Math.round(height * 0.24)))}px Arial`,
      color: UI.colors.text
    }).setOrigin(0, 0.5).setDepth(12);
    this.add.text(left + 22, top + height - 18, t("match.comboPlayers").replace("{count}", String(playerCount)), {
      font: `${Math.max(11, Math.round(height * 0.2))}px Arial`,
      color: UI.colors.muted
    }).setOrigin(0, 0.5).setDepth(12);

    this.renderLineoutPreview(left + 198, y, height, combination);

    this.add.text(left + cardWidth - 20, y, ">", {
      font: "bold 18px Arial",
      color: playerCount > 0 ? "#fde68a" : "#94a3b8"
    }).setOrigin(0.5).setDepth(12);
  }

  private renderLineoutPreview(centerX: number, centerY: number, cardHeight: number, combination: OffensiveCombination): void {
    const slots = normalizeCombinationSlots(combination.slots);
    const previewTop = centerY - cardHeight / 2 + 10;
    const previewBottom = centerY + cardHeight / 2 - 10;
    const touchlineX = centerX + 26;
    const slotStartX = centerX - 18;

    this.add.rectangle(touchlineX, centerY, 3, previewBottom - previewTop, 0xf8fafc, 0.82).setDepth(12);
    this.add.circle(touchlineX + 18, previewBottom - 4, 8, UI.colors.attack, 1).setStrokeStyle(1, 0xffffff, 0.65).setDepth(12);

    slots.forEach((slot, index) => {
      const ratio = slots.length === 1 ? 0.5 : index / (slots.length - 1);
      const y = Phaser.Math.Linear(previewTop, previewBottom, ratio);
      const fillColor = slot.playerId ? UI.colors.accent : 0x10271b;
      const alpha = slot.playerId ? 0.95 : 0.75;

      this.add.ellipse(slotStartX, y, 24, 10, fillColor, alpha)
        .setStrokeStyle(1, slot.playerId ? 0x4a2b00 : 0x64748b, 0.95)
        .setDepth(12);
      this.add.text(slotStartX - 18, y, String(index + 1), {
        font: "10px Arial",
        color: slot.playerId ? "#fde68a" : "#94a3b8"
      }).setOrigin(0.5).setDepth(12);
    });
  }

  private renderStaticLineoutPreview(centerX: number, centerY: number, playerCount: number, isOurThrow: boolean): void {
    const activeCount = Phaser.Math.Clamp(playerCount, 1, 7);
    const top = centerY - 74;
    const bottom = centerY + 74;
    const touchlineX = centerX;
    const playerX = isOurThrow ? centerX - 28 : centerX + 28;
    const color = isOurThrow ? UI.colors.attack : UI.colors.defense;

    this.add.rectangle(touchlineX, centerY, 4, 164, 0xf8fafc, 0.9);

    for (let index = 0; index < activeCount; index += 1) {
      const ratio = activeCount === 1 ? 0.5 : index / (activeCount - 1);
      const y = Phaser.Math.Linear(top, bottom, ratio);
      this.add.ellipse(playerX, y, 26, 12, color, 0.95).setStrokeStyle(1, 0xffffff, 0.6);
      this.add.text(playerX + (isOurThrow ? -18 : 18), y, String(index + 1), {
        font: "10px Arial",
        color: UI.colors.text
      }).setOrigin(0.5);
    }
  }

  private formatMinute(minute: number): string {
    return `${minute}'`;
  }
}
