import Phaser from "phaser";
import { DIVISIONS } from "../data/divisions";
import type { DivisionId } from "../models/Division";
import { GameStore, type TestTeamLevel } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { MainMenuButton } from "../ui/MainMenuButton";
import { renderMenuBackdrop, renderMenuHeader } from "../ui/MenuChrome";
import { Modal } from "../ui/Modal";
import { UI } from "../ui/UITheme";

type TestModeSceneData = {
  teamLevel?: TestTeamLevel;
};

export class TestModeScene extends Phaser.Scene {
  private teamLevel: TestTeamLevel = "adapted";

  constructor() {
    super("TestModeScene");
  }

  init(data: TestModeSceneData): void {
    this.teamLevel = data.teamLevel
      ?? GameStore.getTestModeState()?.teamLevel
      ?? "adapted";
  }

  create(): void {
    renderMenuBackdrop(this, { overlayAlpha: 0.4 });
    renderMenuHeader(this, t("testMode.title"), {
      subtitle: t("testMode.subtitle"),
      y: 70
    });

    this.add.text(195, 130, t("testMode.teamLevelTitle"), {
      font: UI.font.bodyStrong,
      color: UI.colors.text
    }).setOrigin(0.5);

    new MainMenuButton(this, 105, 174, 164, 44, t("testMode.teamLevelAdapted"), () => {
      this.scene.restart({ teamLevel: "adapted" });
    }, {
      variant: this.teamLevel === "adapted" ? "selected" : "secondary"
    });

    new MainMenuButton(this, 285, 174, 164, 44, t("testMode.teamLevelCurrent"), () => {
      this.scene.restart({ teamLevel: "current" });
    }, {
      variant: this.teamLevel === "current" ? "selected" : "secondary"
    });

    this.add.text(195, 224, t("testMode.divisionTitle"), {
      font: UI.font.bodyStrong,
      color: UI.colors.text
    }).setOrigin(0.5);

    const activeState = GameStore.getTestModeState();
    DIVISIONS.forEach((division, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const selected = activeState?.divisionId === division.id
        && activeState.teamLevel === this.teamLevel;

      new MainMenuButton(
        this,
        column === 0 ? 106 : 284,
        270 + row * 54,
        164,
        44,
        t(`division.${division.id}`),
        () => this.startTest(division.id),
        { variant: selected ? "selected" : "secondary" }
      );
    });

    this.add.text(195, 556, t("testMode.explanation"), {
      font: UI.font.small,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 330 }
    }).setOrigin(0.5);

    if (GameStore.isTestModeActive()) {
      new MainMenuButton(this, 195, 676, 286, 48, t("testMode.exit"), () => {
        GameStore.exitTestMode();
        navigateTo(this, "MainMenuScene");
      }, {
        variant: "danger"
      });
    }

    new MainMenuButton(this, 195, 758, 236, 48, t("button.back"), () => {
      navigateTo(this, "SettingsScene");
    }, {
      variant: "secondary"
    });
  }

  private startTest(divisionId: DivisionId): void {
    if (!GameStore.enterTestMode(divisionId, this.teamLevel)) {
      new Modal(
        this,
        t("testMode.unavailableTitle"),
        t("testMode.unavailableBody"),
        () => undefined
      );
      return;
    }

    navigateTo(this, "LineoutScene", { mode: "training" });
  }
}
