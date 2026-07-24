import Phaser from "phaser";
import { isLikelyJumper, isLikelyLifter } from "../models/Player";
import type { FieldPlayer } from "../models/Player";
import { RugbyPlayer } from "./RugbyPlayer";
import type { BodyShapeName, Kit, PoseName } from "./RugbyPlayerTypes";
import { UI } from "./UITheme";

export type PlayerTokenVisualConfig = {
  pose: PoseName;
  kit: Kit;
  bodyShape: BodyShapeName;
  displayWidth: number;
  displayHeight: number;
};

export class PlayerToken extends Phaser.GameObjects.Container {
  readonly player: FieldPlayer;
  private tokenBody: Phaser.GameObjects.GameObject;
  private selectionRing: Phaser.GameObjects.Ellipse;
  private hitTarget: Phaser.GameObjects.Zone;
  private numberText: Phaser.GameObjects.Text;
  private rugbyPlayer?: RugbyPlayer;
  private defaultPose?: PoseName;
  private defaultBodyShape?: BodyShapeName;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: FieldPlayer,
    color: number,
    visualConfig?: PlayerTokenVisualConfig
  ) {
    super(scene, x, y);
    this.player = player;
    const hitboxWidth = visualConfig ? visualConfig.displayWidth + 8 : 48;
    const hitboxHeight = visualConfig ? Math.max(46, Math.round(visualConfig.displayHeight * 0.58)) : 68;
    const ringWidth = visualConfig ? visualConfig.displayWidth + 8 : 44;
    const ringHeight = visualConfig ? visualConfig.displayHeight + 8 : 68;

    // Keep the interactive zone tighter than the full sprite so stacked lineout players stay individually draggable.
    this.hitTarget = scene.add.zone(-hitboxWidth / 2, -hitboxHeight + 4, hitboxWidth, hitboxHeight).setOrigin(0);
    this.selectionRing = scene.add.ellipse(0, -ringHeight / 2 + 4, ringWidth, ringHeight).setStrokeStyle(4, UI.colors.accent).setVisible(false);
    this.tokenBody = this.createBody(scene, color, visualConfig);
    this.numberText = scene.add.text(0, -Math.max(12, (visualConfig?.displayHeight ?? 64) * 0.42), String(player.number), {
      font: "bold 12px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    const roleIcons = this.createRoleIcons(scene, player, visualConfig);
    this.add([this.selectionRing, this.hitTarget, this.tokenBody, this.numberText, ...roleIcons]);
    this.hitTarget.setInteractive({ useHandCursor: true });
    this.hitTarget.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.emit("pointerdown", pointer);
    });
    scene.add.existing(this);
  }

  setSelected(selected: boolean): void {
    this.selectionRing.setVisible(selected);

    if (this.tokenBody instanceof Phaser.GameObjects.Ellipse) {
      this.tokenBody.setStrokeStyle(selected ? 4 : 2, selected ? UI.colors.accent : UI.colors.line);
    }
  }

  setTargetable(targetable: boolean): void {
    if (targetable) {
      this.rugbyPlayer?.setPose("hand");
    } else {
      this.resetPose();
    }
    this.setAlpha(targetable ? 1 : 0.68);
  }

  override disableInteractive(): this {
    this.hitTarget.disableInteractive();
    return this;
  }

  setPose(pose: PoseName): this {
    this.rugbyPlayer?.setPose(pose);
    return this;
  }

  resetPose(): this {
    if (this.defaultPose) {
      this.rugbyPlayer?.setPose(this.defaultPose);
    }

    return this;
  }

  setKit(kit: Kit): this {
    this.rugbyPlayer?.setKit(kit);
    return this;
  }

  setBodyShape(bodyShape: BodyShapeName): this {
    this.defaultBodyShape = bodyShape;
    this.rugbyPlayer?.setBodyShape(bodyShape);
    return this;
  }

  private createBody(scene: Phaser.Scene, color: number, visualConfig?: PlayerTokenVisualConfig): Phaser.GameObjects.GameObject {
    if (visualConfig) {
      this.defaultPose = visualConfig.pose;
      this.defaultBodyShape = visualConfig.bodyShape;
      this.rugbyPlayer = new RugbyPlayer(scene, 0, 4, visualConfig.pose, visualConfig.kit, visualConfig.bodyShape)
        .setVisualSize(visualConfig.displayWidth, visualConfig.displayHeight);
      return this.rugbyPlayer;
    }

    return scene.add.ellipse(0, 0, 34, 44, color, 1).setStrokeStyle(2, UI.colors.line);
  }

  private createRoleIcons(
    scene: Phaser.Scene,
    player: FieldPlayer,
    visualConfig?: PlayerTokenVisualConfig
  ): Phaser.GameObjects.GameObject[] {
    const icons: Phaser.GameObjects.GameObject[] = [];
    const bodyWidth = visualConfig?.displayWidth ?? 34;
    const bodyHeight = visualConfig?.displayHeight ?? 44;
    const iconY = visualConfig ? Math.round(4 - bodyHeight / 2) : 0;
    const jumperX = Math.round(bodyWidth / 2) + 10;
    const lifterX = -jumperX;

    if (isLikelyJumper(player)) {
      const bg = scene.add.circle(jumperX, iconY, 8, UI.colors.accent, 1).setStrokeStyle(1, 0x3f2d00);
      const text = scene.add.text(jumperX, iconY, "S", { font: "bold 10px Arial", color: "#1f2937" }).setOrigin(0.5);
      icons.push(bg, text);
    }

    if (isLikelyLifter(player)) {
      const bg = scene.add.circle(lifterX, iconY, 8, 0x0f3d2b, 1).setStrokeStyle(1, UI.colors.line);
      const text = scene.add.text(lifterX, iconY, "L", { font: "bold 9px Arial", color: UI.colors.text }).setOrigin(0.5);
      icons.push(bg, text);
    }

    return icons;
  }
}
