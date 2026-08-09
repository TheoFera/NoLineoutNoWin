import Phaser from "phaser";
import {
  DEFENSIVE_LINEOUT_SIZES,
  type DefensiveLineoutSize
} from "../models/SaveGame";
import { createDefaultDefensiveLayout } from "../rules/DefenseSelection";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

type DefensiveFormationSceneData = {
  size?: DefensiveLineoutSize;
  selectedSlot?: number;
};

export class DefensiveFormationScene extends Phaser.Scene {
  private size: DefensiveLineoutSize = 7;
  private selectedSlot: number | null = null;

  constructor() {
    super("DefensiveFormationScene");
  }

  init(data: DefensiveFormationSceneData): void {
    this.size = data.size ?? 7;
    this.selectedSlot = data.selectedSlot ?? null;
  }

  create(): void {
    const save = GameStore.getSave();
    const layout = save.defenseMemory[this.size]
      ?? createDefaultDefensiveLayout(save.playerTeam, this.size);
    const playersById = new Map(save.playerTeam.lineoutPlayers.map((player) => [player.id, player]));

    this.add.rectangle(195, 422, 390, 844, 0x07111a);
    this.add.text(195, 52, t("lineout.v3.defensiveFormations"), {
      font: "bold 23px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    this.add.text(195, 82, t("lineout.v3.defensiveFormationHint"), {
      font: "12px Arial",
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 340 }
    }).setOrigin(0.5);

    DEFENSIVE_LINEOUT_SIZES.forEach((size, index) => {
      new UIButton(this, 45 + index * 60, 130, 52, 38, String(size), () => {
        this.scene.restart({ size } satisfies DefensiveFormationSceneData);
      }, { variant: size === this.size ? "primary" : "secondary" });
    });

    this.add.text(195, 172, t("lineout.v3.positions"), {
      font: "bold 13px Arial",
      color: "#facc15"
    }).setOrigin(0.5);
    layout.forEach((playerId, slotIndex) => {
      const player = playerId ? playersById.get(playerId) : undefined;
      const y = 214 + slotIndex * 61;
      const label = player
        ? `${t("lineout.v3.positionShort")} ${slotIndex + 1}  ·  ${t("team.numberPrefix")}${player.number} ${player.nickname}`
        : `${t("lineout.v3.positionShort")} ${slotIndex + 1}  ·  ${t("lineout.v3.emptyPosition")}`;
      new UIButton(this, 195, y, 320, 46, label, () => {
        this.scene.restart({
          size: this.size,
          selectedSlot: slotIndex
        } satisfies DefensiveFormationSceneData);
      }, {
        variant: this.selectedSlot === slotIndex ? "primary" : "secondary",
        fontSize: 13
      });
    });

    this.add.text(195, 654, this.selectedSlot === null
      ? t("lineout.v3.selectFormationSlot")
      : t("lineout.v3.chooseFormationPlayer"), {
      font: "bold 12px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5);
    save.playerTeam.lineoutPlayers.forEach((player, index) => {
      new UIButton(this, 39 + index * 52, 700, 46, 50, `${t("team.numberPrefix")}${player.number}`, () => {
        this.assignPlayer(layout, player.id);
      }, { variant: layout.includes(player.id) ? "primary" : "secondary", fontSize: 11 });
    });

    new UIButton(this, 195, 792, 220, 42, t("button.back"), () => {
      navigateTo(this, "CombinationListScene");
    }, { variant: "secondary" });
  }

  private assignPlayer(layout: Array<string | null>, playerId: string): void {
    if (this.selectedSlot === null) return;
    const next = layout.slice();
    const previousSlot = next.indexOf(playerId);
    const replacedPlayerId = next[this.selectedSlot];
    next[this.selectedSlot] = playerId;
    if (previousSlot >= 0 && previousSlot !== this.selectedSlot) {
      next[previousSlot] = replacedPlayerId;
    }
    GameStore.setDefenseMemory(this.size, next);
    this.scene.restart({ size: this.size } satisfies DefensiveFormationSceneData);
  }
}
