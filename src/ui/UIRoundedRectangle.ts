import Phaser from "phaser";
import { UI } from "./UITheme";

type RoundedRectangleInteractionOptions = {
  useHandCursor?: boolean;
};

export class UIRoundedRectangle extends Phaser.GameObjects.Graphics {
  private fillColor: number;
  private fillAlpha: number;
  private strokeWidth = 0;
  private strokeColor = UI.colors.outline;
  private strokeAlpha = 1;
  private readonly rectangleWidth: number;
  private readonly rectangleHeight: number;
  private readonly radius: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    fillAlpha = 1,
    radius = UI.radius
  ) {
    super(scene, { x, y });
    this.rectangleWidth = width;
    this.rectangleHeight = height;
    this.fillColor = fillColor;
    this.fillAlpha = fillAlpha;
    this.radius = Math.min(radius, width / 2, height / 2);
    this.redraw();
    scene.add.existing(this);
  }

  setFillStyle(color: number, alpha = 1): this {
    this.fillColor = color;
    this.fillAlpha = alpha;
    return this.redraw();
  }

  setStrokeStyle(lineWidth: number, color: number, alpha = 1): this {
    this.strokeWidth = lineWidth;
    this.strokeColor = color;
    this.strokeAlpha = alpha;
    return this.redraw();
  }

  setRoundedInteractive(options: RoundedRectangleInteractionOptions = {}): this {
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.rectangleWidth / 2,
        -this.rectangleHeight / 2,
        this.rectangleWidth,
        this.rectangleHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );
    if (options.useHandCursor && this.input) this.input.cursor = "pointer";
    return this;
  }

  private redraw(): this {
    this.clear();
    this.fillStyle(this.fillColor, this.fillAlpha);
    this.fillRoundedRect(
      -this.rectangleWidth / 2,
      -this.rectangleHeight / 2,
      this.rectangleWidth,
      this.rectangleHeight,
      this.radius
    );
    if (this.strokeWidth > 0) {
      this.lineStyle(this.strokeWidth, this.strokeColor, this.strokeAlpha);
      this.strokeRoundedRect(
        -this.rectangleWidth / 2,
        -this.rectangleHeight / 2,
        this.rectangleWidth,
        this.rectangleHeight,
        this.radius
      );
    }
    return this;
  }
}
