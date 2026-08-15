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

const ACCESSORY_RENDER_ORDER = [
  "strap",
  "beard",
  "moustache",
  "helmet"
] as const satisfies readonly PlayerAccessoryId[];

export class RugbyPlayer extends Phaser.GameObjects.Container {
  private pose: PoseName;
  private bodyShape: BodyShapeName;
  private kit: Kit;
  private bodyTint: number;
  private hairStyleId: PlayerHairStyleId;
  private accessoryIds: PlayerAccessoryId[];
  private bodyLayer: Phaser.GameObjects.Image;
  private jerseyLayer: Phaser.GameObjects.Image;
  private shortsLayer: Phaser.GameObjects.Image;
  private socksLayer: Phaser.GameObjects.Image;
  private detailsLayer?: Phaser.GameObjects.Image;
  private hairStyleLayer?: Phaser.GameObjects.Image;
  private accessoryLayers = new Map<PlayerAccessoryId, Phaser.GameObjects.Image>();
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
    accessoryIds: readonly PlayerAccessoryId[] = []
  ) {
    super(scene, x, y);
    this.pose = pose;
    this.bodyShape = bodyShape;
    this.kit = { ...kit };
    this.bodyTint = bodyTint;
    this.hairStyleId = hairStyleId;
    this.accessoryIds = [...new Set(accessoryIds)];

    // Tous les calques partagent un ancrage par les pieds pour garder le meme repere visuel entre poses.
    this.bodyLayer = this.createLayer(scene, this.usesBaldBody() ? "bodychauve" : "body");
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
    this.refreshAccessoryLayers();
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

  setAccessories(accessoryIds: readonly PlayerAccessoryId[]): this {
    const normalizedAccessoryIds = [...new Set(accessoryIds)];
    if (
      this.accessoryIds.length === normalizedAccessoryIds.length
      && this.accessoryIds.every((accessoryId) => normalizedAccessoryIds.includes(accessoryId))
    ) {
      return this;
    }

    this.accessoryIds = normalizedAccessoryIds;
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
    this.accessoryLayers.forEach((layer) => layer.setDisplaySize(displayWidth, displayHeight));
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

  setVerticalCompressionPixels(compressionPixels: number): this {
    const visualHeight = Math.max(1, this.bodyLayer.displayHeight);
    this.setScale(this.scaleX, Math.max(0.9, (visualHeight - compressionPixels) / visualHeight));
    return this;
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

  private refreshTextures(): void {
    const bodyLayerName = this.usesBaldBody() ? "bodychauve" : "body";
    this.bodyLayer.setTexture(this.getLayerTextureKey(bodyLayerName));
    this.jerseyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "jersey"));
    this.shortsLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "shorts"));
    this.socksLayer.setTexture(this.getLayerTextureKey("socks"));
    this.refreshDetailsLayer();
    this.refreshHairStyleLayer();
    this.refreshAccessoryLayers();
    this.applyVisualSize();
  }

  private applyTints(): void {
    this.bodyLayer.setTint(this.bodyTint);
    // Les calques de tenue restent en niveaux de gris, puis la couleur est appliquee ici.
    this.jerseyLayer.setTint(this.kit.jerseyPrimary);
    this.shortsLayer.setTint(this.kit.shortsPrimary);
    this.socksLayer.setTint(this.kit.socksPrimary);
    this.detailsLayer?.setTint(this.kit.detailsSecondary);
    this.hairStyleLayer?.setTint(this.bodyTint);
    this.accessoryLayers.forEach((layer, accessoryId) => {
      if (accessoryId === "moustache" || accessoryId === "beard") {
        layer.setTint(this.bodyTint);
      } else {
        layer.clearTint();
      }
    });
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

  private refreshAccessoryLayers(): void {
    const selectedAccessoryIds = new Set(this.accessoryIds);
    this.accessoryLayers.forEach((layer, accessoryId) => {
      if (!selectedAccessoryIds.has(accessoryId) || !this.getAccessoryLayerName(accessoryId)) {
        layer.destroy();
        this.accessoryLayers.delete(accessoryId);
      }
    });

    for (const accessoryId of ACCESSORY_RENDER_ORDER) {
      if (!selectedAccessoryIds.has(accessoryId)) continue;
      const layerName = this.getAccessoryLayerName(accessoryId);
      if (!layerName) continue;

      let layer = this.accessoryLayers.get(accessoryId);
      if (!layer) {
        layer = this.createLayer(this.scene, layerName);
        layer.setDisplaySize(this.bodyLayer.displayWidth, this.bodyLayer.displayHeight);
        this.add(layer);
        this.accessoryLayers.set(accessoryId, layer);
      } else {
        layer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, layerName));
      }
      this.bringToTop(layer);
    }
  }

  private getHairStyleLayerName(): "chauve" | "chignon" | "mulet" | undefined {
    if (this.canRenderHairStyleLayer("bald", "chauve")) {
      return "chauve";
    }
    if (this.canRenderHairStyleLayer("mullet", "mulet")) {
      return "mulet";
    }
    if (this.canRenderHairStyleLayer("bun", "chignon")) {
      return "chignon";
    }
    return undefined;
  }

  private getAccessoryLayerName(
    accessoryId: PlayerAccessoryId
  ): "barbe" | "casque" | "moustache" | "strap" | undefined {
    if (accessoryId === "helmet" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "casque")) {
      return "casque";
    }
    if (accessoryId === "strap" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "strap")) {
      return "strap";
    }
    if (accessoryId === "moustache" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "moustache")) {
      return "moustache";
    }
    if (accessoryId === "beard" && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "barbe")) {
      return "barbe";
    }
    return undefined;
  }

  private usesBaldBody(): boolean {
    return this.getHairStyleLayerName() !== undefined;
  }

  private canRenderHairStyleLayer(
    hairStyleId: PlayerHairStyleId,
    layer: "chauve" | "chignon" | "mulet"
  ): boolean {
    return this.hairStyleId === hairStyleId
      && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, "bodychauve")
      && hasRugbyPlayerLayerAsset(this.bodyShape, this.pose, layer);
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
