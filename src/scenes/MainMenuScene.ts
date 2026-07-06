import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const hasSave = GameStore.hasSave();
    const primaryLabel = hasSave ? t("menu.continue") : t("button.play");

    this.renderBackground();
    this.createMenuButton(660, primaryLabel.toUpperCase(), () => this.handlePrimaryAction(hasSave));
    this.createMenuButton(760, t("menu.options").toUpperCase(), () => navigateTo(this, "SettingsScene"), true);
  }

  private handlePrimaryAction(hasSave: boolean): void {
    if (hasSave) {
      navigateTo(this, "LineoutScene", { mode: "training" });
      return;
    }

    navigateTo(this, "ClubCreationScene");
  }

  private renderBackground(): void {
    if (this.textures.exists("main-menu-background")) {
      const image = this.add.image(195, 422, "main-menu-background");
      const scale = Math.max(390 / image.width, 844 / image.height);
      image.setScale(scale);
      return;
    }

    this.add.rectangle(195, 422, 390, 844, 0x08142c);
    this.add.text(195, 136, t("app.title"), {
      font: "bold 40px Arial",
      color: "#f8fafc",
      align: "center",
      stroke: "#05070d",
      strokeThickness: 8
    }).setOrigin(0.5);
  }

  private createMenuButton(y: number, label: string, onClick: () => void, secondary = false): void {
    const width = 316;
    const height = 78;
    const x = 195;
    const left = x - width / 2;
    const top = y - height / 2;
    const background = secondary ? 0x16498f : 0xd79c17;
    const border = secondary ? 0x0a1d47 : 0x4a2b00;
    const bevel = secondary ? 0x2f73d1 : 0xf3c54d;
    const textColor = secondary ? "#f4f7fb" : "#161103";

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(left + 6, top + 10, width, height, 22);

    const button = this.add.graphics();
    button.fillStyle(background, 1);
    button.lineStyle(5, border, 1);
    button.fillRoundedRect(left, top, width, height, 22);
    button.strokeRoundedRect(left, top, width, height, 22);
    button.fillStyle(bevel, 0.6);
    button.fillRoundedRect(left + 10, top + 8, width - 20, 16, 10);

    this.add.text(195, y + 1, label, {
      font: "bold 34px Arial",
      color: textColor
    }).setOrigin(0.5);

    const hit = this.add.zone(x, y, width, height).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      button.setScale(0.985);
      shadow.setScale(0.985);
    });
    hit.on("pointerup", () => {
      button.setScale(1);
      shadow.setScale(1);
      onClick();
    });
    hit.on("pointerout", () => {
      button.setScale(1);
      shadow.setScale(1);
    });
    hit.on("pointerupoutside", () => {
      button.setScale(1);
      shadow.setScale(1);
    });
  }
}
