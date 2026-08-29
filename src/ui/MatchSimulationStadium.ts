import Phaser from "phaser";
import type { DivisionId } from "../models/Division";
import type { JerseyColors } from "../models/Team";

export type SimulationCrowdReaction = "play" | "danger" | "celebrate" | "disappointed";
type StadiumTier = "railing" | "stand" | "professional";
type RailingMaterial = "wood" | "white";
type PixelSpectator = { container: Phaser.GameObjects.Container; leftArm: Phaser.GameObjects.Rectangle; rightArm: Phaser.GameObjects.Rectangle; baseX: number; baseY: number; baseScale: number; ambientDelay: number };

const FAR_LEFT = 38;
const FAR_RIGHT = 352;
const RAIL_Y = 390;
export const SIMULATION_RAILING_TOP_Y = RAIL_Y - 9;
const DEPTH = { structure: 3, crowd: 4, railing: 5 } as const;
const CLOTHES = [0x243746, 0x7f1d1d, 0x1d4ed8, 0x3f6212, 0x8a5a2b, 0xd6d3c9] as const;
const SKINS = [0xf1c27d, 0xd6a06f, 0x9a623f, 0x6f432b] as const;

export class MatchSimulationCrowd {
  private readonly spectators: PixelSpectator[] = [];

  constructor(private readonly scene: Phaser.Scene, divisionId: DivisionId, colors: JerseyColors, seedKey: string) {
    const tier = getStadiumTier(divisionId);
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

  private renderStructure(tier: StadiumTier, colors: JerseyColors): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.structure);
    if (tier === "railing") {
      return;
    }
    const professional = tier === "professional";
    const top = professional ? 294 : 330;
    const rows = professional ? 5 : 3;
    g.fillStyle(0x17242b, 0.96).fillPoints([new Phaser.Math.Vector2(56, top), new Phaser.Math.Vector2(334, top), new Phaser.Math.Vector2(FAR_RIGHT, RAIL_Y), new Phaser.Math.Vector2(FAR_LEFT, RAIL_Y)], true);
    for (let row = 0; row < rows; row += 1) {
      const ratio = row / Math.max(1, rows - 1);
      g.lineStyle(5, row % 2 ? 0x243d48 : 0x31505c, 1).lineBetween(Phaser.Math.Linear(58, FAR_LEFT + 5, ratio), Phaser.Math.Linear(top + 8, RAIL_Y - 12, ratio), Phaser.Math.Linear(332, FAR_RIGHT - 5, ratio), Phaser.Math.Linear(top + 8, RAIL_Y - 12, ratio));
    }
    g.lineStyle(4, colors.primary, 1).lineBetween(FAR_LEFT + 3, RAIL_Y - 7, FAR_RIGHT - 3, RAIL_Y - 7);
  }

  private renderSpectators(tier: StadiumTier, random: () => number): void {
    const rows = tier === "professional" ? 5 : tier === "stand" ? 3 : 1;
    const topY = tier === "professional" ? 307 : tier === "stand" ? 345 : RAIL_Y;
    const gap = tier === "professional" ? 14 : tier === "stand" ? 16 : 0;
    for (let row = 0; row < rows; row += 1) {
      const ratio = rows === 1 ? 1 : row / (rows - 1);
      const right = Phaser.Math.Linear(332, FAR_RIGHT - 8, ratio);
      let x = Phaser.Math.Linear(58, FAR_LEFT + 8, ratio) + random() * 7;
      const y = topY + row * gap;
      const scale = tier === "railing" ? 1 : 0.72 + row * 0.07;
      while (x < right - 3) {
        const groupSize = 2 + Math.floor(random() * 4);
        for (let member = 0; member < groupSize && x < right - 3; member += 1) {
          if (random() > 0.12) this.spectators.push(this.createSpectator(x, y, scale, random));
          x += 4 + random() * 3;
        }
        x += 7 + random() * 13;
      }
    }
  }

  private createSpectator(x: number, y: number, scale: number, random: () => number): PixelSpectator {
    const baseX = Math.round(x);
    const container = this.scene.add.container(baseX, Math.round(y)).setScale(scale).setDepth(DEPTH.crowd);
    const skin = SKINS[Math.floor(random() * SKINS.length)];
    const clothes = CLOTHES[Math.floor(random() * CLOTHES.length)];
    const legs = this.scene.add.rectangle(0, -4, 3, 4, 0x17242b).setOrigin(0.5, 0);
    const body = this.scene.add.rectangle(0, -10, random() < 0.25 ? 6 : 5, 6, clothes).setOrigin(0.5, 0);
    const head = this.scene.add.rectangle(0, -13, 3, 3, skin).setOrigin(0.5, 0);
    const hair = this.scene.add.rectangle(0, -14, 3, 1, 0x261b16).setOrigin(0.5, 0);
    const leftArm = this.scene.add.rectangle(-3, -9, 1, 5, clothes).setOrigin(0.5, 0);
    const rightArm = this.scene.add.rectangle(3, -9, 1, 5, clothes).setOrigin(0.5, 0);
    container.add([legs, leftArm, rightArm, body, head, hair]);
    return { container, leftArm, rightArm, baseX, baseY: y, baseScale: scale, ambientDelay: random() * 900 };
  }

  private renderRailing(tier: StadiumTier, material: RailingMaterial): void {
    const g = this.scene.add.graphics().setDepth(DEPTH.railing);
    const topY = SIMULATION_RAILING_TOP_Y;
    const bottomY = RAIL_Y;
    const mainColor = material === "wood" ? 0x9a6538 : 0xf3f0e7;
    const highlightColor = material === "wood" ? 0xc18a52 : 0xffffff;
    const shadowColor = material === "wood" ? 0x4a2e1a : 0x607a86;
    const spacing = tier === "professional" ? 14 : 18;

    g.lineStyle(2, shadowColor, 0.75).lineBetween(FAR_LEFT, topY + 1, FAR_RIGHT, topY + 1);
    g.lineStyle(2, mainColor, 1).lineBetween(FAR_LEFT, topY, FAR_RIGHT, topY);
    g.lineStyle(1, highlightColor, 0.55).lineBetween(FAR_LEFT, topY - 1, FAR_RIGHT, topY - 1);
    for (let x = FAR_LEFT + 2; x <= FAR_RIGHT; x += spacing) {
      g.fillStyle(shadowColor, 0.8).fillRect(x, topY, 2, bottomY - topY);
      g.fillStyle(mainColor, 1).fillRect(x, topY, 1, bottomY - topY);
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

function getStadiumTier(id: DivisionId): StadiumTier {
  if (id === "top_14" || id === "pro_d2") return "professional";
  if (["federale_2", "federale_1", "nationale_2", "nationale"].includes(id)) return "stand";
  return "railing";
}
function hashString(value: string): number { let hash = 2166136261; for (const c of value) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function createSeededRandom(seed: number): () => number { let state = seed || 1; return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0xffffffff; }; }
