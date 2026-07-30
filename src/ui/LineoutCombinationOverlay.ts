import Phaser from "phaser";
import type { Combination } from "../models/Combination";
import {
  countAssignedPlayers,
  normalizeCombinationSlots
} from "../rules/CombinationRules";
import { UI } from "./UITheme";

export type LineoutCombinationOverlayOptions = {
  title: string;
  getCombinationName: (combination: Combination) => string;
  getPlayersLabel: (count: number) => string;
  onSelect: (combination: Combination) => void;
};

const OVERLAY_DEPTH = 1200;
const PANEL_TOP = 184;
const LIST_TOP = 270;
const PANEL_BOTTOM_PADDING = 18;
const CARD_GAP = 9;
const MAX_LIST_HEIGHT = 466;

type CombinationOverlayLayout = {
  panelHeight: number;
  cardHeight: number;
  firstCardY: number;
};

export class LineoutCombinationOverlay extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    combinations: Combination[],
    options: LineoutCombinationOverlayOptions
  ) {
    super(scene, 0, 0);

    const layout = this.getLayout(combinations.length);
    const backdrop = scene.add.rectangle(195, 422, 390, 844, 0x020617, 0.34)
      .setInteractive();
    const panel = scene.add.graphics();
    panel.fillStyle(0x07111a, 0.84);
    panel.lineStyle(2, 0x64748b, 0.88);
    panel.fillRoundedRect(24, PANEL_TOP, 342, layout.panelHeight, 22);
    panel.strokeRoundedRect(24, PANEL_TOP, 342, layout.panelHeight, 22);
    panel.fillStyle(0xffffff, 0.06);
    panel.fillRoundedRect(42, PANEL_TOP + 14, 306, 3, 2);

    const title = scene.add.text(195, PANEL_TOP + 38, options.title, {
      font: "bold 21px Arial",
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 292 }
    }).setOrigin(0.5).setResolution(2);

    this.add([backdrop, panel, title]);
    this.renderCombinationCards(scene, combinations, options, layout);

    scene.add.existing(this);
    this.setDepth(OVERLAY_DEPTH);
  }

  private renderCombinationCards(
    scene: Phaser.Scene,
    combinations: Combination[],
    options: LineoutCombinationOverlayOptions,
    layout: CombinationOverlayLayout
  ): void {
    combinations.forEach((combination, index) => {
      const y = layout.firstCardY + index * (layout.cardHeight + CARD_GAP);
      this.renderCombinationCard(scene, combination, y, layout.cardHeight, options);
    });
  }

  private getLayout(combinationCount: number): CombinationOverlayLayout {
    const count = Math.max(1, combinationCount);
    const gapsHeight = CARD_GAP * Math.max(0, count - 1);
    const cardHeight = Phaser.Math.Clamp(
      Math.floor((MAX_LIST_HEIGHT - gapsHeight) / count),
      56,
      80
    );
    const cardsHeight = count * cardHeight + gapsHeight;

    return {
      panelHeight: LIST_TOP - PANEL_TOP + cardsHeight + PANEL_BOTTOM_PADDING,
      cardHeight,
      firstCardY: LIST_TOP + cardHeight / 2
    };
  }

  private renderCombinationCard(
    scene: Phaser.Scene,
    combination: Combination,
    y: number,
    height: number,
    options: LineoutCombinationOverlayOptions
  ): void {
    const playerCount = countAssignedPlayers(combination);
    const left = 42;
    const width = 306;
    const top = y - height / 2;
    const graphics = scene.add.graphics();
    graphics.fillStyle(0x0f1c29, 0.96);
    graphics.lineStyle(2, UI.colors.accent, 0.9);
    graphics.fillRoundedRect(left, top, width, height, 14);
    graphics.strokeRoundedRect(left, top, width, height, 14);
    graphics.fillStyle(0xffffff, 0.05);
    graphics.fillRoundedRect(left + 12, top + 10, 130, height - 20, 9);

    const hitArea = scene.add.zone(195, y, width, height)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", () => options.onSelect(combination));

    const name = scene.add.text(left + 20, top + 22, options.getCombinationName(combination), {
      font: `bold ${Math.max(13, Math.min(17, Math.round(height * 0.24)))}px Arial`,
      color: UI.colors.text
    }).setOrigin(0, 0.5).setResolution(2);
    const players = scene.add.text(left + 20, top + height - 17, options.getPlayersLabel(playerCount), {
      font: `${Math.max(10, Math.round(height * 0.18))}px Arial`,
      color: UI.colors.muted
    }).setOrigin(0, 0.5).setResolution(2);
    const arrow = scene.add.text(left + width - 18, y, "›", {
      font: "bold 25px Arial",
      color: "#fde68a"
    }).setOrigin(0.5).setResolution(2);

    this.add([graphics, hitArea, name, players, arrow]);
    this.renderLineoutPreview(scene, combination, left + 218, y, height);
  }

  private renderLineoutPreview(
    scene: Phaser.Scene,
    combination: Combination,
    centerX: number,
    centerY: number,
    cardHeight: number
  ): void {
    const slots = normalizeCombinationSlots(combination.slots);
    const previewTop = centerY - cardHeight / 2 + 10;
    const previewBottom = centerY + cardHeight / 2 - 10;
    const touchlineX = centerX + 24;
    const slotX = centerX - 16;
    const objects: Phaser.GameObjects.GameObject[] = [];

    objects.push(scene.add.rectangle(
      touchlineX,
      centerY,
      3,
      previewBottom - previewTop,
      0xf8fafc,
      0.82
    ));

    slots.forEach((slot, index) => {
      const ratio = slots.length === 1 ? 0.5 : 1 - index / (slots.length - 1);
      const y = Phaser.Math.Linear(previewTop, previewBottom, ratio);
      objects.push(scene.add.ellipse(
        slotX,
        y,
        22,
        9,
        slot.playerId ? UI.colors.accent : 0x10271b,
        slot.playerId ? 0.95 : 0.72
      ).setStrokeStyle(1, slot.playerId ? 0x4a2b00 : 0x64748b, 0.9));
    });

    this.add(objects);
  }
}
