import Phaser from "phaser";
import { getRugbyPlayerEqualHeightScale, getRugbyPlayerTextureKey } from "./RugbyPlayerAssets";
import type { BodyShapeName, PoseName } from "./RugbyPlayerTypes";

export const PLAYER_GROUND_SHADOW_STYLE = {
  color: 0x020617,
  projectionRatio: 0.85,
  angleDegrees: -40,
  contactOffsetX: 1,
  contactOffsetY: -7,
  baseAlpha: 0.25,
  maximumElevationAlphaReduction: 0.13,
  maximumElevationScaleReduction: 0.45
} as const;

export function getPlayerShadowProjectionOffset(distancePixels: number): { x: number; y: number } {
  const projectedDistance = distancePixels * PLAYER_GROUND_SHADOW_STYLE.projectionRatio;
  const angleRadians = Phaser.Math.DegToRad(PLAYER_GROUND_SHADOW_STYLE.angleDegrees);
  return {
    x: Math.sin(angleRadians) * projectedDistance,
    y: -Math.cos(angleRadians) * projectedDistance
  };
}

export function getElevatedObjectShadowOffset(elevationPixels: number): { x: number; y: number } {
  const projectedPoint = getPlayerShadowProjectionOffset(elevationPixels);
  return {
    x: projectedPoint.x + PLAYER_GROUND_SHADOW_STYLE.contactOffsetX,
    y: elevationPixels
      + projectedPoint.y
      + PLAYER_GROUND_SHADOW_STYLE.contactOffsetY
  };
}

export class PlayerGroundShadow extends Phaser.GameObjects.Container {
  private groundX: number;
  private groundY: number;
  private elevation = 0;
  private readonly silhouette: Phaser.GameObjects.Image;
  private readonly playerWidth: number;
  private readonly playerHeight: number;
  private bodyShape: BodyShapeName;
  private pose: PoseName;

  constructor(
    scene: Phaser.Scene,
    x: number,
    groundY: number,
    playerWidth: number,
    playerHeight: number,
    bodyShape: BodyShapeName,
    pose: PoseName
  ) {
    super(scene, x, groundY);
    this.groundX = x;
    this.groundY = groundY;
    this.playerWidth = playerWidth;
    this.playerHeight = playerHeight;
    this.bodyShape = bodyShape;
    this.pose = pose;

    this.silhouette = scene.add.image(
      PLAYER_GROUND_SHADOW_STYLE.contactOffsetX,
      PLAYER_GROUND_SHADOW_STYLE.contactOffsetY,
      getRugbyPlayerTextureKey(this.bodyShape, this.pose, "body")
    )
      .setOrigin(0.5, 1)
      .setTintFill(PLAYER_GROUND_SHADOW_STYLE.color)
      .setAlpha(PLAYER_GROUND_SHADOW_STYLE.baseAlpha)
      .setAngle(PLAYER_GROUND_SHADOW_STYLE.angleDegrees);
    this.add(this.silhouette);
    this.applyProjectedScale(1);
    scene.add.existing(this);
  }

  setPose(pose: PoseName): this {
    if (this.pose !== pose) {
      this.pose = pose;
      this.refreshTexture();
    }
    return this;
  }

  setBodyShape(bodyShape: BodyShapeName): this {
    if (this.bodyShape !== bodyShape) {
      this.bodyShape = bodyShape;
      this.refreshTexture();
    }
    return this;
  }

  setElevation(elevationPixels: number): this {
    this.elevation = Math.max(0, elevationPixels);
    const elevationRatio = Phaser.Math.Clamp(this.elevation / (this.playerHeight * 0.9), 0, 1);
    const scale = 1
      - elevationRatio * PLAYER_GROUND_SHADOW_STYLE.maximumElevationScaleReduction;

    this.setPosition(this.groundX, this.groundY + this.elevation);
    this.applyProjectedScale(scale);
    this.silhouette.setAlpha(
      PLAYER_GROUND_SHADOW_STYLE.baseAlpha
        - elevationRatio * PLAYER_GROUND_SHADOW_STYLE.maximumElevationAlphaReduction
    );
    return this;
  }

  setGroundPosition(x: number, y: number): this {
    this.groundX = x;
    this.groundY = y;
    this.setPosition(this.groundX, this.groundY + this.elevation);
    return this;
  }

  private refreshTexture(): void {
    this.silhouette.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "body"));
    this.applyProjectedScale(1);
  }

  private applyProjectedScale(elevationScale: number): void {
    const playerScale = getRugbyPlayerEqualHeightScale(
      this.silhouette.height,
      this.playerWidth,
      this.playerHeight
    );
    this.silhouette.setScale(
      playerScale * elevationScale,
      playerScale * PLAYER_GROUND_SHADOW_STYLE.projectionRatio * elevationScale
    );
  }
}
