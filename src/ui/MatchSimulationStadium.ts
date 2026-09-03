import Phaser from "phaser";
import type { DivisionId } from "../models/Division";
import type { JerseyColors } from "../models/Team";

export type SimulationCrowdReaction = "play" | "danger" | "celebrate" | "disappointed";
export type SimulationStadiumTier = "regional" | "federal" | "national";
// Trois réglages de mise en page : le décor remonte quand la tribune est plus petite.
// Les coordonnées internes du stade restent identiques pour conserver sa perspective.
export const SIMULATION_LAYOUT_BY_TIER = {
  regional: { sceneryOffsetY: -80, bubbleY: 273 },
  federal: { sceneryOffsetY: -40, bubbleY: 268 },
  national: { sceneryOffsetY: 0, bubbleY: 285 }
} as const satisfies Readonly<Record<SimulationStadiumTier, {
  sceneryOffsetY: number;
  bubbleY: number;
}>>;
type RailingMaterial = "wood" | "white";
type PixelSpectator = { container: Phaser.GameObjects.Container; leftArm: Phaser.GameObjects.Rectangle; rightArm: Phaser.GameObjects.Rectangle; baseX: number; baseY: number; baseScale: number; ambientDelay: number };

const FAR_LEFT = 38;
const FAR_RIGHT = 352;
const FEDERAL_LEFT = 84;
const FEDERAL_RIGHT = 306;
const FEDERAL_TOP = 450;
const FEDERAL_TOP_LEFT = 100;
const FEDERAL_TOP_RIGHT = 290;
const NATIONAL_WING_LEFT = 2;
const NATIONAL_WING_RIGHT = 388;
const NATIONAL_WING_Y = 462;
const NEAR_LEFT = 10;
const NEAR_RIGHT = 380;
const RAIL_Y = 510;
const SIDE_STAND_BOTTOM_Y = RAIL_Y + 245;
export const SIMULATION_RAILING_TOP_Y = RAIL_Y - 9;
export const SIMULATION_RAILING_BOTTOM_Y = RAIL_Y;
export const SIMULATION_COMMENTATORS_BOTTOM_Y = {
  regional: RAIL_Y,
  federal: RAIL_Y - 45,
  national: RAIL_Y - 83
} as const satisfies Readonly<Record<SimulationStadiumTier, number>>;
const DEPTH = { structure: 3, crowd: 4, railing: 8 } as const;
const CLOTHES = [0x243746, 0x7f1d1d, 0x1d4ed8, 0x3f6212, 0x8a5a2b, 0xd6d3c9] as const;
const SKINS = [0xf1c27d, 0xd6a06f, 0x9a623f, 0x6f432b] as const;

export class MatchSimulationCrowd {
  private readonly spectators: PixelSpectator[] = [];
  private readonly verticalOffsetY: number;

  constructor(private readonly scene: Phaser.Scene, divisionId: DivisionId, colors: JerseyColors, seedKey: string) {
    const tier = getSimulationStadiumTier(divisionId);
    this.verticalOffsetY = SIMULATION_LAYOUT_BY_TIER[tier].sceneryOffsetY;
    const random = createSeededRandom(hashString(seedKey));
    const railingMaterial: RailingMaterial = hashString(`rambarde:${seedKey}`) % 2 === 0
      ? "wood"
      : "white";
    this.renderStructure(tier, colors);
    this.renderSpectators(tier, random);
    this.renderRailing(tier, railingMaterial);
    this.spectators.filter((_, index) => index % 4 === 0).forEach((item) => this.startAmbientMotion(item));
  }

  react(reaction: SimulationCrowdReaction): void {
    const selected = reaction === "play" ? this.spectators.filter((_, i) => i % 6 === 0)
      : reaction === "danger" ? this.spectators.filter((_, i) => i % 2 === 0) : this.spectators;
    selected.forEach((item, index) => {
      this.scene.tweens.killTweensOf([item.container, item.leftArm, item.rightArm]);
      this.resetSpectator(item);
      const delay = (index % 10) * (reaction === "play" ? 14 : 24);
      if (reaction === "disappointed") {
        this.scene.tweens.add({ targets: item.container, scaleY: item.baseScale * 0.78, y: item.baseY + 1, duration: 180, delay, hold: 260, yoyo: true, onComplete: () => this.resumeAmbientMotion(item) });
        return;
      }
      const excited = reaction === "danger" || reaction === "celebrate";
      if (excited) this.scene.tweens.add({ targets: [item.leftArm, item.rightArm], angle: index % 2 ? -55 : 55, duration: 90, delay, yoyo: true, repeat: reaction === "celebrate" ? 2 : 0 });
      this.scene.tweens.add({ targets: item.container, y: item.baseY - (reaction === "celebrate" ? 3 : excited ? 2 : 1), x: item.baseX + (reaction === "play" ? (index % 2 ? 1 : -1) : 0), duration: reaction === "play" ? 150 : 110, delay, yoyo: true, repeat: reaction === "celebrate" ? 2 : 0, onComplete: () => this.resumeAmbientMotion(item) });
    });
  }

  private renderStructure(tier: SimulationStadiumTier, colors: JerseyColors): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.structure)
      .setPosition(0, this.verticalOffsetY);
    if (tier === "regional") {
      return;
    }
    const national = tier === "national";
    const top = national ? 414 : FEDERAL_TOP;
    const rows = national ? 5 : 3;
    const structurePoints = national
      ? [
          new Phaser.Math.Vector2(56, top),
          new Phaser.Math.Vector2(334, top),
          new Phaser.Math.Vector2(NATIONAL_WING_RIGHT, NATIONAL_WING_Y),
          new Phaser.Math.Vector2(FAR_RIGHT, RAIL_Y),
          new Phaser.Math.Vector2(FAR_LEFT, RAIL_Y),
          new Phaser.Math.Vector2(NATIONAL_WING_LEFT, NATIONAL_WING_Y)
        ]
      : [
          new Phaser.Math.Vector2(FEDERAL_TOP_LEFT, top),
          new Phaser.Math.Vector2(FEDERAL_TOP_RIGHT, top),
          new Phaser.Math.Vector2(FEDERAL_RIGHT, RAIL_Y),
          new Phaser.Math.Vector2(FEDERAL_LEFT, RAIL_Y)
        ];
    g.fillStyle(0x17242b, 0.96);
    if (national) {
      g.fillPoints([
        new Phaser.Math.Vector2(0, NATIONAL_WING_Y),
        new Phaser.Math.Vector2(FAR_LEFT, RAIL_Y),
        new Phaser.Math.Vector2(NEAR_LEFT, SIDE_STAND_BOTTOM_Y),
        new Phaser.Math.Vector2(0, SIDE_STAND_BOTTOM_Y)
      ], true);
      g.fillPoints([
        new Phaser.Math.Vector2(NATIONAL_WING_RIGHT, NATIONAL_WING_Y),
        new Phaser.Math.Vector2(390, NATIONAL_WING_Y),
        new Phaser.Math.Vector2(390, SIDE_STAND_BOTTOM_Y),
        new Phaser.Math.Vector2(NEAR_RIGHT, SIDE_STAND_BOTTOM_Y),
        new Phaser.Math.Vector2(FAR_RIGHT, RAIL_Y)
      ], true);
    }
    g.fillPoints(structurePoints, true);
    for (let row = 0; row < rows; row += 1) {
      const ratio = row / Math.max(1, rows - 1);
      const left = national
        ? Phaser.Math.Linear(58, 30, ratio)
        : Phaser.Math.Linear(102, FEDERAL_LEFT + 8, ratio);
      const right = national
        ? Phaser.Math.Linear(332, 360, ratio)
        : Phaser.Math.Linear(288, FEDERAL_RIGHT - 8, ratio);
      const y = Phaser.Math.Linear(top + 8, RAIL_Y - 12, ratio);
      g.lineStyle(5, row % 2 ? 0x243d48 : 0x31505c, 1)
        .lineBetween(left, y, right, y);
    }
    const frontLeft = national ? FAR_LEFT : FEDERAL_LEFT;
    const frontRight = national ? FAR_RIGHT : FEDERAL_RIGHT;
    g.lineStyle(4, colors.primary, 1)
      .lineBetween(frontLeft + 3, RAIL_Y - 7, frontRight - 3, RAIL_Y - 7);
    if (national) {
      this.renderSideStandRows(g);
    }
  }

  private renderSideStandRows(graphics: Phaser.GameObjects.Graphics): void {
    for (let row = 1; row <= 3; row += 1) {
      const depthRatio = row / 4;
      const left = this.getSideStandRow(depthRatio, "left");
      const right = this.getSideStandRow(depthRatio, "right");
      graphics.lineStyle(5, row % 2 ? 0x243d48 : 0x31505c, 1);
      graphics.lineBetween(left.top.x, left.top.y, left.bottom.x, left.bottom.y);
      graphics.lineBetween(right.top.x, right.top.y, right.bottom.x, right.bottom.y);
    }
  }

  private renderSpectators(tier: SimulationStadiumTier, random: () => number): void {
    const rows = tier === "national" ? 5 : tier === "federal" ? 3 : 1;
    const topY = tier === "national" ? 427 : tier === "federal" ? 465 : RAIL_Y;
    const gap = tier === "national"
      ? 14
      : tier === "federal"
        ? (RAIL_Y - topY) / Math.max(1, rows - 1)
        : 0;
    for (let row = 0; row < rows; row += 1) {
      const ratio = rows === 1 ? 1 : row / (rows - 1);
      const left = tier === "national"
        ? Phaser.Math.Linear(58, 20, ratio)
        : tier === "federal"
          ? Phaser.Math.Linear(102, FEDERAL_LEFT + 8, ratio)
          : FAR_LEFT + 8;
      const right = tier === "national"
        ? Phaser.Math.Linear(332, 370, ratio)
        : tier === "federal"
          ? Phaser.Math.Linear(288, FEDERAL_RIGHT - 8, ratio)
          : FAR_RIGHT - 8;
      let x = left + random() * 7;
      const y = topY + row * gap;
      const scale = tier === "regional" ? 1 : 0.72 + row * 0.07;
      while (x < right - 3) {
        const groupSize = 2 + Math.floor(random() * 4);
        for (let member = 0; member < groupSize && x < right - 3; member += 1) {
          if (random() > 0.12) this.spectators.push(this.createSpectator(x, y, scale, random));
          x += 4 + random() * 3;
        }
        x += 7 + random() * 13;
      }
    }
    if (tier === "national") this.renderSideSpectators(random);
    if (tier === "federal") this.renderFederalRailingSpectators(random);
  }

  private renderFederalRailingSpectators(random: () => number): void {
    for (const ratio of [0.38, 0.72]) {
      const y = Phaser.Math.Linear(FEDERAL_TOP, SIMULATION_RAILING_TOP_Y, ratio);
      const scale = 0.76 + ratio * 0.1;
      const leftX = Phaser.Math.Linear(FEDERAL_TOP_LEFT, FEDERAL_LEFT, ratio) + 5;
      const rightX = Phaser.Math.Linear(FEDERAL_TOP_RIGHT, FEDERAL_RIGHT, ratio) - 5;
      this.spectators.push(this.createSpectator(leftX, y, scale, random));
      this.spectators.push(this.createSpectator(rightX, y, scale, random));
    }
    for (const x of [52, 69, 321, 338]) {
      this.spectators.push(this.createSpectator(x, RAIL_Y, 0.9, random));
    }
  }

  private renderSideSpectators(random: () => number): void {
    for (const depthRatio of [0.18, 0.48, 0.78]) {
      const left = this.getSideStandRow(depthRatio, "left");
      const right = this.getSideStandRow(depthRatio, "right");
      for (let positionRatio = 0.1 + random() * 0.03; positionRatio < 0.94; positionRatio += 0.11 + random() * 0.025) {
        const scale = 0.74 + positionRatio * 0.12;
        const leftX = Phaser.Math.Linear(left.top.x, left.bottom.x, positionRatio);
        const leftY = Phaser.Math.Linear(left.top.y, left.bottom.y, positionRatio);
        const rightX = Phaser.Math.Linear(right.top.x, right.bottom.x, positionRatio);
        const rightY = Phaser.Math.Linear(right.top.y, right.bottom.y, positionRatio);
        if (random() > 0.12) {
          this.spectators.push(this.createSpectator(leftX, leftY, scale, random));
        }
        if (random() > 0.12) {
          this.spectators.push(this.createSpectator(rightX, rightY, scale, random));
        }
      }
    }
  }

  private getSideStandRow(
    depthRatio: number,
    side: "left" | "right"
  ): { top: Phaser.Math.Vector2; bottom: Phaser.Math.Vector2 } {
    const isLeft = side === "left";
    const lateralOffset = (FAR_LEFT - NATIONAL_WING_LEFT) * depthRatio;
    const topX = isLeft ? FAR_LEFT - lateralOffset : FAR_RIGHT + lateralOffset;
    const pitchPerspectiveDeltaX = NEAR_LEFT - FAR_LEFT;
    const fullBottomX = topX + (isLeft ? pitchPerspectiveDeltaX : -pitchPerspectiveDeltaX);
    const screenEdgeX = isLeft ? NATIONAL_WING_LEFT : NATIONAL_WING_RIGHT;
    const maximumLengthRatio = isLeft
      ? fullBottomX >= screenEdgeX
        ? 1
        : (topX - screenEdgeX) / Math.max(1, topX - fullBottomX)
      : fullBottomX <= screenEdgeX
        ? 1
        : (screenEdgeX - topX) / Math.max(1, fullBottomX - topX);
    const lengthRatio = Phaser.Math.Clamp(maximumLengthRatio, 0, 1);
    const topY = Phaser.Math.Linear(RAIL_Y, NATIONAL_WING_Y, depthRatio);
    return {
      top: new Phaser.Math.Vector2(topX, topY),
      bottom: new Phaser.Math.Vector2(
        Phaser.Math.Linear(topX, fullBottomX, lengthRatio),
        topY + (SIDE_STAND_BOTTOM_Y - RAIL_Y) * lengthRatio
      )
    };
  }

  private createSpectator(x: number, y: number, scale: number, random: () => number): PixelSpectator {
    const baseX = Math.round(x);
    const baseY = Math.round(y + this.verticalOffsetY);
    const container = this.scene.add.container(baseX, baseY).setScale(scale).setDepth(DEPTH.crowd);
    const skin = SKINS[Math.floor(random() * SKINS.length)];
    const clothes = CLOTHES[Math.floor(random() * CLOTHES.length)];
    const legs = this.scene.add.rectangle(0, -4, 3, 4, 0x17242b).setOrigin(0.5, 0);
    const body = this.scene.add.rectangle(0, -10, random() < 0.25 ? 6 : 5, 6, clothes).setOrigin(0.5, 0);
    const head = this.scene.add.rectangle(0, -13, 3, 3, skin).setOrigin(0.5, 0);
    const hair = this.scene.add.rectangle(0, -14, 3, 1, 0x261b16).setOrigin(0.5, 0);
    const leftArm = this.scene.add.rectangle(-3, -9, 1, 5, clothes).setOrigin(0.5, 0);
    const rightArm = this.scene.add.rectangle(3, -9, 1, 5, clothes).setOrigin(0.5, 0);
    container.add([legs, leftArm, rightArm, body, head, hair]);
    return { container, leftArm, rightArm, baseX, baseY, baseScale: scale, ambientDelay: random() * 900 };
  }

  private renderRailing(tier: SimulationStadiumTier, material: RailingMaterial): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.railing)
      .setPosition(0, this.verticalOffsetY);
    const topY = SIMULATION_RAILING_TOP_Y;
    const bottomY = RAIL_Y;
    const mainColor = material === "wood" ? 0x9a6538 : 0xf3f0e7;
    const highlightColor = material === "wood" ? 0xc18a52 : 0xffffff;
    const shadowColor = material === "wood" ? 0x4a2e1a : 0x607a86;
    const spacing = tier === "national" ? 14 : 18;
    const left = FAR_LEFT;
    const right = FAR_RIGHT;

    g.lineStyle(2, shadowColor, 0.75).lineBetween(left, topY + 1, right, topY + 1);
    g.lineStyle(2, mainColor, 1).lineBetween(left, topY, right, topY);
    g.lineStyle(1, highlightColor, 0.55).lineBetween(left, topY - 1, right, topY - 1);
    for (let x = left + 2; x <= right; x += spacing) {
      g.fillStyle(shadowColor, 0.8).fillRect(x, topY, 2, bottomY - topY);
      g.fillStyle(mainColor, 1).fillRect(x, topY, 1, bottomY - topY);
    }
    if (tier === "federal") {
      this.renderAngledRailing(
        g,
        new Phaser.Math.Vector2(FEDERAL_TOP_LEFT, FEDERAL_TOP),
        new Phaser.Math.Vector2(FEDERAL_LEFT, topY),
        mainColor,
        highlightColor,
        shadowColor
      );
      this.renderAngledRailing(
        g,
        new Phaser.Math.Vector2(FEDERAL_TOP_RIGHT, FEDERAL_TOP),
        new Phaser.Math.Vector2(FEDERAL_RIGHT, topY),
        mainColor,
        highlightColor,
        shadowColor
      );
    }
    if (tier === "national") {
      this.renderAngledRailing(
        g,
        new Phaser.Math.Vector2(FAR_LEFT, RAIL_Y),
        new Phaser.Math.Vector2(NEAR_LEFT, SIDE_STAND_BOTTOM_Y),
        mainColor,
        highlightColor,
        shadowColor
      );
      this.renderAngledRailing(
        g,
        new Phaser.Math.Vector2(FAR_RIGHT, RAIL_Y),
        new Phaser.Math.Vector2(NEAR_RIGHT, SIDE_STAND_BOTTOM_Y),
        mainColor,
        highlightColor,
        shadowColor
      );
    }
  }

  private renderAngledRailing(
    graphics: Phaser.GameObjects.Graphics,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    mainColor: number,
    highlightColor: number,
    shadowColor: number
  ): void {
    graphics.lineStyle(3, shadowColor, 0.75)
      .lineBetween(start.x, start.y + 1, end.x, end.y + 1);
    graphics.lineStyle(2, mainColor, 1)
      .lineBetween(start.x, start.y, end.x, end.y);
    graphics.lineStyle(1, highlightColor, 0.55)
      .lineBetween(start.x, start.y - 1, end.x, end.y - 1);
    for (const ratio of [0.25, 0.5, 0.75]) {
      const x = Phaser.Math.Linear(start.x, end.x, ratio);
      const y = Phaser.Math.Linear(start.y, end.y, ratio);
      graphics.fillStyle(shadowColor, 0.8).fillRect(x, y, 2, 8);
      graphics.fillStyle(mainColor, 1).fillRect(x, y, 1, 8);
    }
  }

  private startAmbientMotion(item: PixelSpectator): void {
    this.scene.tweens.add({ targets: item.container, y: item.baseY - 1, duration: 900 + item.ambientDelay * 0.35, delay: item.ambientDelay, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private resetSpectator(item: PixelSpectator): void {
    item.container.setPosition(item.baseX, item.baseY).setScale(item.baseScale).setAngle(0);
    item.leftArm.setAngle(0); item.rightArm.setAngle(0);
  }

  private resumeAmbientMotion(item: PixelSpectator): void {
    if (!item.container.active || !this.scene.sys.isActive()) return;
    this.resetSpectator(item); this.startAmbientMotion(item);
  }
}

export function getSimulationStadiumTier(id: DivisionId): SimulationStadiumTier {
  if (["regionale_3", "regionale_2", "regionale_1"].includes(id)) return "regional";
  if (["federale_3", "federale_2", "federale_1"].includes(id)) return "federal";
  return "national";
}
function hashString(value: string): number { let hash = 2166136261; for (const c of value) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function createSeededRandom(seed: number): () => number { let state = seed || 1; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0xffffffff; }; }
