import Phaser from "phaser";
import {
  getRugbyPlayerEqualHeightScale,
  getRugbyPlayerTextureKey,
  hasRugbyPlayerLayerAsset,
  RUGBY_PLAYER_FRAME_HEIGHT,
  RUGBY_PLAYER_FRAME_WIDTH
} from "./RugbyPlayerAssets";
import type { BodyShapeName, Kit, PoseName } from "./RugbyPlayerTypes";

export class RugbyPlayer extends Phaser.GameObjects.Container {
  private pose: PoseName;
  private bodyShape: BodyShapeName;
  private kit: Kit;
  private bodyTint: number;
  private bodyLayer: Phaser.GameObjects.Image;
  private jerseyLayer: Phaser.GameObjects.Image;
  private shortsLayer: Phaser.GameObjects.Image;
  private socksLayer: Phaser.GameObjects.Image;
  private detailsLayer?: Phaser.GameObjects.Image;
  private requestedVisualWidth?: number;
  private requestedVisualHeight?: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pose: PoseName,
    kit: Kit,
    bodyShape: BodyShapeName,
    bodyTint = 0xffffff
  ) {
    super(scene, x, y);
    this.pose = pose;
    this.bodyShape = bodyShape;
    this.kit = { ...kit };
    this.bodyTint = bodyTint;

    // Tous les calques partagent un ancrage par les pieds pour garder le meme repere visuel entre poses.
    this.bodyLayer = this.createLayer(scene, "body");
    this.jerseyLayer = this.createLayer(scene, "jersey");
    this.shortsLayer = this.createLayer(scene, "shorts");
    this.socksLayer = this.createLayer(scene, "socks");
    this.detailsLayer = this.createOptionalDetailsLayer(scene);

    this.add([this.bodyLayer, this.jerseyLayer, this.shortsLayer, this.socksLayer]);
    if (this.detailsLayer) {
      this.add(this.detailsLayer);
    }
    this.setSize(RUGBY_PLAYER_FRAME_WIDTH, RUGBY_PLAYER_FRAME_HEIGHT);

    this.applyTints();
    scene.add.existing(this);
  }

  setPose(pose: PoseName): this {
    if (this.pose === pose) {
      return this;
    }

    this.pose = pose;
    this.refreshTextures();
    this.applyTints();
    return this;
  }

  setKit(kit: Kit): this {
    this.kit = { ...kit };
    this.applyTints();
    return this;
  }

  setBodyTint(bodyTint: number): this {
    this.bodyTint = bodyTint;
    this.applyTints();
    return this;
  }

  setBodyShape(bodyShape: BodyShapeName): this {
    if (this.bodyShape === bodyShape) {
      return this;
    }

    this.bodyShape = bodyShape;
    this.refreshTextures();
    this.applyTints();
    return this;
  }

  setVisualSize(width: number, height: number): this {
    this.requestedVisualWidth = width;
    this.requestedVisualHeight = height;
    this.applyVisualSize();
    return this;
  }

  private applyVisualSize(): void {
    if (this.requestedVisualWidth === undefined || this.requestedVisualHeight === undefined) {
      return;
    }

    const scale = getRugbyPlayerEqualHeightScale(
      this.bodyLayer.height,
      this.requestedVisualWidth,
      this.requestedVisualHeight
    );
    const displayWidth = Math.round(this.bodyLayer.width * scale);
    const displayHeight = Math.round(this.bodyLayer.height * scale);
    this.bodyLayer.setDisplaySize(displayWidth, displayHeight);
    this.jerseyLayer.setDisplaySize(displayWidth, displayHeight);
    this.shortsLayer.setDisplaySize(displayWidth, displayHeight);
    this.socksLayer.setDisplaySize(displayWidth, displayHeight);
    this.detailsLayer?.setDisplaySize(displayWidth, displayHeight);
    this.setSize(displayWidth, displayHeight);
  }

  getPose(): PoseName {
    return this.pose;
  }

  getBodyShape(): BodyShapeName {
    return this.bodyShape;
  }

  getWorldPointFromSource(sourceX: number, sourceY: number): { x: number; y: number } {
    const localX = (sourceX / this.bodyLayer.width - this.bodyLayer.originX)
      * this.bodyLayer.displayWidth;
    const localY = (sourceY / this.bodyLayer.height - this.bodyLayer.originY)
      * this.bodyLayer.displayHeight;
    return {
      x: this.x + localX * this.scaleX,
      y: this.y + localY * this.scaleY
    };
  }

  getWorldPointAtHeightFromFeet(sourceX: number, heightFromFeet: number): { x: number; y: number } {
    return this.getWorldPointFromSource(
      sourceX,
      this.bodyLayer.height - heightFromFeet
    );
  }

  getVisualHeight(): number {
    return this.bodyLayer.displayHeight * Math.abs(this.scaleY);
  }

  private createLayer(scene: Phaser.Scene, layer: "body" | "jersey" | "shorts" | "socks" | "details"): Phaser.GameObjects.Image {
    return scene.add.image(0, 0, getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer)).setOrigin(0.5, 1);
  }

  private createOptionalDetailsLayer(scene: Phaser.Scene): Phaser.GameObjects.Image | undefined {
    if (!hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "details")) {
      return undefined;
    }

    return this.createLayer(scene, "details");
  }

  private refreshTextures(): void {
    this.bodyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "body"));
    this.jerseyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "jersey"));
    this.shortsLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "shorts"));
    this.socksLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "socks"));
    this.refreshDetailsLayer();
    this.applyVisualSize();
  }

  private applyTints(): void {
    this.bodyLayer.setTint(this.bodyTint);
    // Les calques de tenue restent en niveaux de gris, puis la couleur est appliquee ici.
    this.jerseyLayer.setTint(this.kit.jerseyPrimary);
    this.shortsLayer.setTint(this.kit.shortsPrimary);
    this.socksLayer.setTint(this.kit.socksPrimary);
    this.detailsLayer?.setTint(this.kit.detailsSecondary);
  }

  private refreshDetailsLayer(): void {
    if (!hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "details")) {
      this.detailsLayer?.destroy();
      this.detailsLayer = undefined;
      return;
    }

    if (!this.detailsLayer) {
      this.detailsLayer = this.createLayer(this.scene, "details");
      this.detailsLayer.setDisplaySize(this.bodyLayer.displayWidth, this.bodyLayer.displayHeight);
      this.add(this.detailsLayer);
      return;
    }

    this.detailsLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "details"));
  }
}
