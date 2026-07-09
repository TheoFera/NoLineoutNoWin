import Phaser from "phaser";
import type { LineoutPosition } from "../models/Combination";
import type { FieldPlayer, Player } from "../models/Player";
import type { Team } from "../models/Team";
import { GameStore } from "../state/GameStore";
import { assignPlayerToLineoutPosition, getLineoutBenchPlayers, isSelectedForLineout } from "../rules/TeamSelection";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { renderMenuBackdrop } from "../ui/MenuChrome";
import { UIButton } from "../ui/UIButton";
import { PlayerCard } from "../ui/PlayerCard";
import { UI } from "../ui/UITheme";

export class TeamScene extends Phaser.Scene {
  private team!: Team;
  private selectedLineoutPosition: LineoutPosition = 1;
  private inspectedPlayerId: string | "hooker" = "hooker";

  constructor() {
    super("TeamScene");
  }

  create(): void {
    this.team = GameStore.getSave().playerTeam;
    this.inspectedPlayerId = this.team.lineoutPlayers[0]?.id ?? "hooker";
    this.renderScene();
  }

  private renderScene(): void {
    this.children.removeAll(true);

    const inspectedPlayer = this.getInspectedPlayer();
    const benchCount = getLineoutBenchPlayers(this.team).length;

    renderMenuBackdrop(this);
    this.add.text(195, 42, t("menu.team"), { font: UI.font.title, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 66, this.team.name, { font: UI.font.body, color: UI.colors.muted }).setOrigin(0.5);

    this.renderHookerPanel();

    this.add.text(195, 156, t("team.lineoutTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 178, `${t("team.activePosition")} ${this.selectedLineoutPosition} - ${t("team.reserveCount")} ${benchCount}`, {
      font: UI.font.small,
      color: UI.colors.muted
    }).setOrigin(0.5);
    this.renderLineoutSlots();

    this.add.text(195, 292, t("team.rosterTitle"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0.5);
    this.add.text(195, 314, t("team.rosterHint"), { font: UI.font.small, color: UI.colors.muted }).setOrigin(0.5);
    this.renderRoster();

    new PlayerCard(this, 124, 744, inspectedPlayer);

    if (this.isFieldPlayer(inspectedPlayer)) {
      const assignLabel = `${t("team.assignToPosition")} ${this.selectedLineoutPosition}`;
      new UIButton(this, 309, 720, 122, 40, assignLabel, () => this.assignInspectedPlayer());
      const statusKey = isSelectedForLineout(this.team, inspectedPlayer.id) ? "team.status.lineout" : "team.status.reserve";
      this.add.text(309, 756, t(statusKey), { font: UI.font.small, color: UI.colors.muted, align: "center", wordWrap: { width: 120 } }).setOrigin(0.5);
    } else {
      this.add.text(309, 736, t("team.hookerOnly"), {
        font: UI.font.body,
        color: UI.colors.muted,
        align: "center",
        wordWrap: { width: 120 }
      }).setOrigin(0.5);
    }

    new UIButton(this, 309, 792, 122, 40, t("button.back"), () => navigateTo(this, "LineoutScene", { mode: "training" }), {
      variant: "secondary"
    });
  }

  private renderHookerPanel(): void {
    const selected = this.inspectedPlayerId === "hooker";
    const panel = this.add.rectangle(195, 114, 338, 52, selected ? 0x173b27 : 0x0d1b14, 0.96).setStrokeStyle(2, selected ? UI.colors.accent : 0x40604b);
    panel.setInteractive();
    panel.on("pointerup", () => {
      this.inspectedPlayerId = "hooker";
      this.renderScene();
    });

    const hooker = this.team.hooker;
    this.add.text(32, 102, `${t("team.hooker")} ${t("team.numberPrefix")}2`, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
    this.add.text(150, 102, hooker.nickname, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
    this.add.text(268, 102, `${t("team.throwing")} ${hooker.throwing}`, { font: UI.font.small, color: UI.colors.muted }).setOrigin(0, 0.5);
    this.add.text(32, 124, t("team.hookerHint"), { font: UI.font.small, color: UI.colors.muted }).setOrigin(0, 0.5);
  }

  private renderLineoutSlots(): void {
    const slotLayout = [
      { position: 1 as LineoutPosition, x: 58, y: 214 },
      { position: 2 as LineoutPosition, x: 140, y: 214 },
      { position: 3 as LineoutPosition, x: 222, y: 214 },
      { position: 4 as LineoutPosition, x: 304, y: 214 },
      { position: 5 as LineoutPosition, x: 99, y: 258 },
      { position: 6 as LineoutPosition, x: 195, y: 258 },
      { position: 7 as LineoutPosition, x: 291, y: 258 }
    ];

    slotLayout.forEach(({ position, x, y }) => {
      const player = this.team.lineoutPlayers[position - 1];
      const selected = this.selectedLineoutPosition === position;
      const slot = this.add.rectangle(x, y, 74, 36, selected ? 0x173b27 : 0x0d1b14, 1).setStrokeStyle(2, selected ? UI.colors.accent : 0x40604b);
      slot.setInteractive();
      slot.on("pointerup", () => {
        this.selectedLineoutPosition = position;
        this.renderScene();
      });

      this.add.text(x, y - 9, String(position), { font: UI.font.small, color: UI.colors.muted }).setOrigin(0.5);
      this.add.text(x, y + 7, player.nickname, { font: "bold 11px Arial", color: UI.colors.text, align: "center", wordWrap: { width: 64 } }).setOrigin(0.5);
    });
  }

  private renderRoster(): void {
    this.team.fieldPlayers.forEach((player, index) => {
      const y = 348 + index * 32;
      const selectedForLineout = isSelectedForLineout(this.team, player.id);
      const inspected = this.inspectedPlayerId === player.id;
      const row = this.add.rectangle(195, y, 338, 28, inspected ? 0x173b27 : 0x0d1b14, 0.96).setStrokeStyle(1, selectedForLineout ? UI.colors.accent : 0x40604b);
      row.setInteractive();
      row.on("pointerup", () => {
        this.inspectedPlayerId = player.id;
        this.renderScene();
      });

      this.add.text(28, y, `${t("team.numberPrefix")}${player.number}`, { font: UI.font.small, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(84, y, player.nickname, { font: UI.font.body, color: UI.colors.text }).setOrigin(0, 0.5);
      this.add.text(166, y, `${t("team.stat.jumpAbbr")} ${player.jump} - ${t("team.stat.liftAbbr")} ${player.lift} - ${t("team.stat.handsAbbr")} ${player.hands}`, {
        font: UI.font.small,
        color: UI.colors.muted
      }).setOrigin(0, 0.5);
      this.add.text(324, y, t(selectedForLineout ? "team.status.lineoutShort" : "team.status.reserveShort"), {
        font: "bold 10px Arial",
        color: selectedForLineout ? "#fde68a" : UI.colors.muted
      }).setOrigin(1, 0.5);
    });
  }

  private assignInspectedPlayer(): void {
    const inspectedPlayer = this.getInspectedPlayer();
    if (!this.isFieldPlayer(inspectedPlayer)) {
      return;
    }

    this.team = assignPlayerToLineoutPosition(this.team, this.selectedLineoutPosition, inspectedPlayer.id);
    GameStore.setPlayerTeam(this.team);
    this.renderScene();
  }

  private getInspectedPlayer(): Player {
    if (this.inspectedPlayerId === "hooker") {
      return this.team.hooker;
    }

    return this.team.fieldPlayers.find((player) => player.id === this.inspectedPlayerId) ?? this.team.hooker;
  }

  private isFieldPlayer(player: Player): player is FieldPlayer {
    return player.role === "field";
  }
}
