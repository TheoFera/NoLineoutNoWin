import Phaser from "phaser";
import { getRugbyPlayerTextureKey, RUGBY_PLAYER_FRAME_HEIGHT, RUGBY_PLAYER_FRAME_WIDTH } from "./RugbyPlayerAssets";
import type { BodyShapeName, Kit, PoseName } from "./RugbyPlayerTypes";

export class RugbyPlayer extends Phaser.GameObjects.Container {
  private pose: PoseName;
  private bodyShape: BodyShapeName;
  private kit: Kit;
  private bodyLayer: Phaser.GameObjects.Image;
  private jerseyLayer: Phaser.GameObjects.Image;
  private shortsLayer: Phaser.GameObjects.Image;
  private socksLayer: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, pose: PoseName, kit: Kit, bodyShape: BodyShapeName) {
    super(scene, x, y);
    this.pose = pose;
    this.bodyShape = bodyShape;
    this.kit = { ...kit };

    // Tous les calques partagent un ancrage par les pieds pour garder le meme repere visuel entre poses.
    this.bodyLayer = this.createLayer(scene, "body");
    this.jerseyLayer = this.createLayer(scene, "jersey");
    this.shortsLayer = this.createLayer(scene, "shorts");
    this.socksLayer = this.createLayer(scene, "socks");

    this.add([this.bodyLayer, this.jerseyLayer, this.shortsLayer, this.socksLayer]);
    this.setSize(RUGBY_PLAYER_FRAME_WIDTH, RUGBY_PLAYER_FRAME_HEIGHT);

    this.applyKitTint();
    scene.add.existing(this);
  }

  setPose(pose: PoseName): this {
    if (this.pose === pose) {
      return this;
    }

    this.pose = pose;
    this.refreshTextures();
    this.applyKitTint();
    return this;
  }

  setKit(kit: Kit): this {
    this.kit = { ...kit };
    this.applyKitTint();
    return this;
  }

  setBodyShape(bodyShape: BodyShapeName): this {
    if (this.bodyShape === bodyShape) {
      return this;
    }

    this.bodyShape = bodyShape;
    this.refreshTextures();
    this.applyKitTint();
    return this;
  }

  setVisualSize(width: number, height: number): this {
    this.bodyLayer.setDisplaySize(width, height);
    this.jerseyLayer.setDisplaySize(width, height);
    this.shortsLayer.setDisplaySize(width, height);
    this.socksLayer.setDisplaySize(width, height);
    this.setSize(width, height);
    return this;
  }

  getPose(): PoseName {
    return this.pose;
  }

  getBodyShape(): BodyShapeName {
    return this.bodyShape;
  }

  private createLayer(scene: Phaser.Scene, layer: "body" | "jersey" | "shorts" | "socks"): Phaser.GameObjects.Image {
    return scene.add.image(0, 0, getRugbyPlayerTextureKey(this.bodyShape, this.pose, layer)).setOrigin(0.5, 1);
  }

  private refreshTextures(): void {
    this.bodyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "body"));
    this.jerseyLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "jersey"));
    this.shortsLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "shorts"));
    this.socksLayer.setTexture(getRugbyPlayerTextureKey(this.bodyShape, this.pose, "socks"));
  }

  private applyKitTint(): void {
    // Les calques de tenue restent en niveaux de gris, puis la couleur est appliquee ici.
    this.jerseyLayer.setTint(this.kit.jerseyPrimary);
    this.shortsLayer.setTint(this.kit.shortsPrimary);
    this.socksLayer.setTint(this.kit.socksPrimary);
  }
}
