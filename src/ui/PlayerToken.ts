import Phaser from "phaser";
import type { FieldPlayer } from "../models/Player";
import { canBeLineoutJumper, canBeLineoutLifter } from "../rules/LineoutPlayerRoles";
import { PlayerGroundShadow } from "./PlayerGroundShadow";
import { getPlayerSkinTint } from "./PlayerSkinTone";
import { t } from "../systems/I18n";
import { RugbyPlayer } from "./RugbyPlayer";
import type { BodyShapeName, Kit, PoseName } from "./RugbyPlayerTypes";
import { UI } from "./UITheme";

export const PLAYER_TOKEN_HIT_AREA_DATA_KEY = "playerTokenHitArea";

export type PlayerTokenVisualConfig = {
  pose: PoseName;
  kit: Kit;
  bodyShape: BodyShapeName;
  displayWidth: number;
  displayHeight: number;
};

export class PlayerToken extends Phaser.GameObjects.Container {
  readonly player: FieldPlayer;
  private shadow?: PlayerGroundShadow;
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
    const bodyWidth = visualConfig?.displayWidth ?? 34;
    const bodyHeight = visualConfig?.displayHeight ?? 44;

    // Keep the interactive zone tighter than the full sprite so stacked lineout players stay individually draggable.
    this.hitTarget = scene.add.zone(-hitboxWidth / 2, -hitboxHeight + 4, hitboxWidth, hitboxHeight).setOrigin(0);
    this.shadow = visualConfig
      ? new PlayerGroundShadow(
          scene,
          x,
          y + 4,
          bodyWidth,
          bodyHeight,
          visualConfig.bodyShape,
          visualConfig.pose
        )
      : undefined;
    this.selectionRing = scene.add.ellipse(0, -ringHeight / 2 + 4, ringWidth, ringHeight).setStrokeStyle(4, UI.colors.accent).setVisible(false);
    this.tokenBody = this.createBody(scene, color, visualConfig);
    const numberY = -Math.max(12, (visualConfig?.displayHeight ?? 64) * 0.42);
    this.numberText = scene.add.text(0, numberY, String(player.number), {
      font: "bold 12px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    const roleIcons = this.createRoleIcons(scene, player, visualConfig);
    this.add([
      this.selectionRing,
      this.hitTarget,
      this.tokenBody,
      ...roleIcons
    ]);
    // Le numéro fait partie du corps visuel : il suit ainsi le saut et l'inclinaison du sauteur.
    this.attachToBody(this.numberText, 0, numberY);
    this.hitTarget.setData(PLAYER_TOKEN_HIT_AREA_DATA_KEY, true);
    this.hitTarget.setInteractive({ useHandCursor: true });
    this.hitTarget.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.emit("pointerdown", pointer);
    });
    scene.events.on("postupdate", this.syncShadowPosition, this);
    this.once("destroy", () => {
      scene.events.off("postupdate", this.syncShadowPosition, this);
      this.shadow?.destroy();
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
      this.setPose("hand");
    } else {
      this.resetPose();
    }
    this.setAlpha(1);
  }

  override disableInteractive(): this {
    this.hitTarget.disableInteractive();
    return this;
  }

  setPose(pose: PoseName): this {
    this.rugbyPlayer?.setPose(pose);
    this.shadow?.setPose(pose);
    return this;
  }

  setBodyAngle(angle: number): this {
    this.rugbyPlayer?.setAngle(angle);
    if (this.tokenBody instanceof Phaser.GameObjects.Ellipse) {
      this.tokenBody.setAngle(angle);
    }
    return this;
  }

  setShadowElevation(elevationPixels: number): this {
    this.shadow?.setElevation(elevationPixels);
    return this;
  }

  setShadowDepth(depth: number): this {
    this.shadow?.setDepth(depth);
    return this;
  }

  getVisualCenterOffsetY(): number {
    if (this.rugbyPlayer) {
      return this.rugbyPlayer.y - this.rugbyPlayer.getVisualHeight() / 2;
    }
    return -22;
  }

  attachToBody(
    gameObject: Phaser.GameObjects.Image
      | Phaser.GameObjects.Ellipse
      | Phaser.GameObjects.Container
      | Phaser.GameObjects.Text,
    tokenLocalX: number,
    tokenLocalY: number
  ): this {
    if (!this.rugbyPlayer) {
      this.add(gameObject);
      gameObject.setPosition(tokenLocalX, tokenLocalY);
      return this;
    }

    this.rugbyPlayer.add(gameObject);
    gameObject.setPosition(
      tokenLocalX - this.rugbyPlayer.x,
      tokenLocalY - this.rugbyPlayer.y
    );
    return this;
  }

  resetPose(): this {
    if (this.defaultPose) {
      this.rugbyPlayer?.setPose(this.defaultPose);
      this.shadow?.setPose(this.defaultPose);
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
    this.shadow?.setBodyShape(bodyShape);
    return this;
  }

  private createBody(scene: Phaser.Scene, color: number, visualConfig?: PlayerTokenVisualConfig): Phaser.GameObjects.GameObject {
    if (visualConfig) {
      this.defaultPose = visualConfig.pose;
      this.defaultBodyShape = visualConfig.bodyShape;
      this.rugbyPlayer = new RugbyPlayer(
        scene,
        0,
        4,
        visualConfig.pose,
        visualConfig.kit,
        visualConfig.bodyShape,
        getPlayerSkinTint(this.player),
        this.player.appearance.hairStyleId,
        this.player.appearance.accessoryId
      )
        .setVisualSize(visualConfig.displayWidth, visualConfig.displayHeight);
      return this.rugbyPlayer;
    }

    return scene.add.ellipse(0, 0, 34, 44, color, 1).setStrokeStyle(2, UI.colors.line);
  }

  private syncShadowPosition(): void {
    this.shadow?.setPlayerFeetPosition(this.x, this.y + 4);
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

    if (canBeLineoutJumper(player)) {
      const bg = scene.add.circle(jumperX, iconY, 8, UI.colors.accent, 1).setStrokeStyle(1, 0x3f2d00);
      const text = scene.add.text(jumperX, iconY, t("lineout.role.jumperAbbr"), { font: "bold 10px Arial", color: "#1f2937" }).setOrigin(0.5);
      icons.push(bg, text);
    }

    if (canBeLineoutLifter(player)) {
      const bg = scene.add.circle(lifterX, iconY, 8, 0x0f3d2b, 1).setStrokeStyle(1, UI.colors.line);
      const text = scene.add.text(lifterX, iconY, t("lineout.role.lifterAbbr"), { font: "bold 9px Arial", color: UI.colors.text }).setOrigin(0.5);
      icons.push(bg, text);
    }

    return icons;
  }
}
