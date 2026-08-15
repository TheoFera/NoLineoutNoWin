import Phaser from "phaser";
import {
  canUseRugbyPlayerWalkingFrames,
  getRugbyPlayerEqualHeightScale,
  getRugbyPlayerTextureKey,
  getRugbyPlayerWalkingTextureKey,
  hasRugbyPlayerLayerAsset,
  RUGBY_PLAYER_FRAME_HEIGHT,
  RUGBY_PLAYER_FRAME_WIDTH
} from "./RugbyPlayerAssets";
import type {
  BodyShapeName,
  Kit,
  PlayerAccessoryId,
  PlayerHairStyleId,
  PlayerLayerName,
  PoseName,
  RugbyPlayerWalkingFrame
} from "./RugbyPlayerTypes";

export class RugbyPlayer extends Phaser.GameObjects.Container {
  private pose: PoseName;
  private bodyShape: BodyShapeName;
  private kit: Kit;
  private bodyTint: number;
  private hairStyleId: PlayerHairStyleId;
  private accessoryId: PlayerAccessoryId;
  private bodyLayer: Phaser.GameObjects.Image;
  private jerseyLayer: Phaser.GameObjects.Image;
  private shortsLayer: Phaser.GameObjects.Image;
  private socksLayer: Phaser.GameObjects.Image;
  private detailsLayer?: Phaser.GameObjects.Image;
  private hairStyleLayer?: Phaser.GameObjects.Image;
  private accessoryLayer?: Phaser.GameObjects.Image;
  private requestedVisualWidth?: number;
  private requestedVisualHeight?: number;
  private walkingFrame?: RugbyPlayerWalkingFrame;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    pose: PoseName,
    kit: Kit,
    bodyShape: BodyShapeName,
    bodyTint = 0xffffff,
    hairStyleId: PlayerHairStyleId = "short",
    accessoryId: PlayerAccessoryId = "none"
  ) {
    super(scene, x, y);
    this.pose = pose;
    this.bodyShape = bodyShape;
    this.kit = { ...kit };
    this.bodyTint = bodyTint;
    this.hairStyleId = hairStyleId;
    this.accessoryId = accessoryId;

    // Tous les calques partagent un ancrage par les pieds pour garder le meme repere visuel entre poses.
    this.bodyLayer = this.createLayer(scene, this.canRenderBaldHairStyle() ? "bodychauve" : "body");
    this.jerseyLayer = this.createLayer(scene, "jersey");
    this.shortsLayer = this.createLayer(scene, "shorts");
    this.socksLayer = this.createLayer(scene, "socks");
    this.detailsLayer = this.createOptionalDetailsLayer(scene);

    this.add([this.bodyLayer, this.jerseyLayer, this.shortsLayer, this.socksLayer]);
    if (this.detailsLayer) {
      this.add(this.detailsLayer);
    }
    this.hairStyleLayer = this.createOptionalHairStyleLayer(scene);
    if (this.hairStyleLayer) {
      this.add(this.hairStyleLayer);
    }
    this.accessoryLayer = this.createOptionalAccessoryLayer(scene);
    if (this.accessoryLayer) {
      this.add(this.accessoryLayer);
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

  setWalkingFrame(frame: RugbyPlayerWalkingFrame | undefined): this {
    if (this.walkingFrame === frame) {
      return this;
    }

    this.walkingFrame = frame;
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

  setHairStyle(hairStyleId: PlayerHairStyleId): this {
    if (this.hairStyleId === hairStyleId) {
      return this;
    }

    this.hairStyleId = hairStyleId;
    this.refreshTextures();
    this.applyTints();
    return this;
  }

  setAccessory(accessoryId: PlayerAccessoryId): this {
    if (this.accessoryId === accessoryId) {
      return this;
    }

    this.accessoryId = accessoryId;
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
    this.hairStyleLayer?.setDisplaySize(displayWidth, displayHeight);
    this.accessoryLayer?.setDisplaySize(displayWidth, displayHeight);
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

  getWorldPointAtRelativeHeightFromFeet(
    sourceXRatio: number,
    heightFromFeetRatio: number
  ): { x: number; y: number } {
    return this.getWorldPointAtHeightFromFeet(
      this.bodyLayer.width * sourceXRatio,
      this.bodyLayer.height * heightFromFeetRatio
    );
  }

  getVisualHeight(): number {
    return this.bodyLayer.displayHeight * Math.abs(this.scaleY);
  }

  private createLayer(scene: Phaser.Scene, layer: PlayerLayerName): Phaser.GameObjects.Image {
    return scene.add.image(0, 0, getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer)).setOrigin(0.5, 1);
  }

  private createOptionalDetailsLayer(scene: Phaser.Scene): Phaser.GameObjects.Image | undefined {
    if (!hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "details")) {
      return undefined;
    }

    return this.createLayer(scene, "details");
  }

  private createOptionalHairStyleLayer(scene: Phaser.Scene): Phaser.GameObjects.Image | undefined {
    const layer = this.getHairStyleLayerName();
    return layer ? this.createLayer(scene, layer) : undefined;
  }

  private createOptionalAccessoryLayer(scene: Phaser.Scene): Phaser.GameObjects.Image | undefined {
    const layer = this.getAccessoryLayerName();
    return layer ? this.createLayer(scene, layer) : undefined;
  }

  private refreshTextures(): void {
    const bodyLayerName = this.canRenderBaldHairStyle() ? "bodychauve" : "body";
    this.bodyLayer.setTexture(this.getLayerTextureKey(bodyLayerName));
    this.jerseyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "jersey"));
    this.shortsLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "shorts"));
    this.socksLayer.setTexture(this.getLayerTextureKey("socks"));
    this.refreshDetailsLayer();
    this.refreshHairStyleLayer();
    this.refreshAccessoryLayer();
    if (this.accessoryLayer) {
      this.bringToTop(this.accessoryLayer);
    }
    this.applyVisualSize();
  }

  private applyTints(): void {
    this.bodyLayer.setTint(this.bodyTint);
    // Les calques de tenue restent en niveaux de gris, puis la couleur est appliquee ici.
    this.jerseyLayer.setTint(this.kit.jerseyPrimary);
    this.shortsLayer.setTint(this.kit.shortsPrimary);
    this.socksLayer.setTint(this.kit.socksPrimary);
    this.detailsLayer?.setTint(this.kit.detailsSecondary);
    if (this.hairStyleId === "bald") {
      this.hairStyleLayer?.setTint(this.bodyTint);
    } else {
      this.hairStyleLayer?.clearTint();
    }
    this.accessoryLayer?.clearTint();
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

    this.detailsLayer.setTexture(this.getLayerTextureKey("details"));
  }

  private refreshHairStyleLayer(): void {
    const layer = this.getHairStyleLayerName();
    if (!layer) {
      this.hairStyleLayer?.destroy();
      this.hairStyleLayer = undefined;
      return;
    }

    if (!this.hairStyleLayer) {
      this.hairStyleLayer = this.createLayer(this.scene, layer);
      this.hairStyleLayer.setDisplaySize(this.bodyLayer.displayWidth, this.bodyLayer.displayHeight);
      this.add(this.hairStyleLayer);
      return;
    }

    this.hairStyleLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer));
  }

  private refreshAccessoryLayer(): void {
    const layer = this.getAccessoryLayerName();
    if (!layer) {
      this.accessoryLayer?.destroy();
      this.accessoryLayer = undefined;
      return;
    }

    if (!this.accessoryLayer) {
      this.accessoryLayer = this.createLayer(this.scene, layer);
      this.accessoryLayer.setDisplaySize(this.bodyLayer.displayWidth, this.bodyLayer.displayHeight);
      this.add(this.accessoryLayer);
      return;
    }

    this.accessoryLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer));
  }

  private getHairStyleLayerName(): "chauve" | undefined {
    if (this.canRenderBaldHairStyle()) {
      return "chauve";
    }
    return undefined;
  }

  private getAccessoryLayerName(): "casque" | "strap" | undefined {
    if (this.accessoryId === "helmet" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "casque")) {
      return "casque";
    }
    if (this.accessoryId === "strap" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "strap")) {
      return "strap";
    }
    return undefined;
  }

  private canRenderBaldHairStyle(): boolean {
    return this.hairStyleId === "bald"
      && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "bodychauve")
      && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "chauve");
  }

  private getLayerTextureKey(
    layer: "body" | "bodychauve" | "details" | "socks"
  ): string {
    if (
      this.walkingFrame
      && canUseRugbyPlayerWalkingFrames(this.bodyShape, this.pose)
    ) {
      return getRugbyPlayerWalkingTextureKey(
        this.bodyShape,
        this.pose,
        layer,
        this.walkingFrame
      );
    }
    return getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer);
  }
}
