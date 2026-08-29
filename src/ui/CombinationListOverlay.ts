import Phaser from "phaser";
import type { Combination } from "../models/Combination";
import {
  DEFENSIVE_LINEOUT_SIZES,
  type DefensiveLineoutSize
} from "../models/SaveGame";
import { getCombinationDisplayName } from "../rules/CombinationRules";
import { t } from "../systems/I18n";
import { applyDomControlStyle } from "./DomControlStyle";
import { renderMenuPanel } from "./MenuChrome";
import { markTutorialAnchor } from "./TutorialAnchor";
import { UIButton } from "./UIButton";
import { UI } from "./UITheme";

type CombinationOverlayTab = "attack" | "defense";

type CombinationListOverlayOptions = {
  combinations: Combination[];
  initialTab: CombinationOverlayTab;
  selectedCombinationId: string;
  selectedDefensiveSize: DefensiveLineoutSize;
  onClose: () => void;
  onRename: (combinationId: string, name: string) => void;
  onSelectCombination: (combinationId: string) => void;
  onSelectDefensiveSize: (size: DefensiveLineoutSize) => void;
};

const PANEL_X = 195;
const PANEL_TOP = 32;
const PANEL_WIDTH = 354;
const TAB_Y = 62;

export class CombinationListOverlay extends Phaser.GameObjects.Container {
  private readonly options: CombinationListOverlayOptions;
  private content: Phaser.GameObjects.Container;
  private activeTab: CombinationOverlayTab;
  private nameInput: HTMLInputElement | null = null;
  private positionInputHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, options: CombinationListOverlayOptions) {
    super(scene, 0, 0);
    this.options = options;
    this.activeTab = options.initialTab;
    this.content = scene.add.container(0, 0);

    const backdrop = scene.add.rectangle(195, 382, 390, 764, UI.colors.scrim, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", options.onClose);
    this.add([backdrop, this.content]);
    scene.add.existing(this);

    this.renderCurrentTab();
  }

  override destroy(fromScene?: boolean): void {
    this.destroyNameInput();
    super.destroy(fromScene);
  }

  private renderCurrentTab(): void {
    this.destroyNameInput();
    this.content.removeAll(true);

    const panelBottom = this.activeTab === "attack"
      ? Math.max(230, 166 + Math.max(0, this.options.combinations.length - 1) * 64)
      : 516;
    const panel = renderMenuPanel(this.scene, {
      x: PANEL_X,
      y: (PANEL_TOP + panelBottom) / 2,
      width: PANEL_WIDTH,
      height: panelBottom - PANEL_TOP,
      accentColor: UI.colors.outline,
      fillAlpha: 0.98,
      fillColor: UI.colors.panelDark
    });
    const panelInputBlocker = this.scene.add.zone(
      PANEL_X,
      (PANEL_TOP + panelBottom) / 2,
      PANEL_WIDTH,
      panelBottom - PANEL_TOP
    ).setInteractive();
    this.content.add([panel, panelInputBlocker]);

    this.renderTabs();
    if (this.activeTab === "attack") {
      this.renderOffensiveCombinations();
    } else {
      this.renderDefensiveSizes();
    }
  }

  private renderTabs(): void {
    const attack = new UIButton(
      this.scene,
      107,
      TAB_Y,
      164,
      44,
      t("lineout.overlay.offensiveTab"),
      () => this.selectTab("attack"),
      {
        variant: this.activeTab === "attack" ? "selected" : "secondary",
        fontSize: 14,
        textColor: UI.colors.text
      }
    );
    const defense = new UIButton(
      this.scene,
      283,
      TAB_Y,
      164,
      44,
      t("lineout.overlay.defensiveTab"),
      () => this.selectTab("defense"),
      {
        variant: this.activeTab === "defense" ? "selected" : "secondary",
        fontSize: 14,
        textColor: UI.colors.text
      }
    );
    markTutorialAnchor(attack, "combinations.attack");
    markTutorialAnchor(defense, "combinations.defense");
    this.content.add([attack, defense]);
  }

  private selectTab(tab: CombinationOverlayTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.renderCurrentTab();
  }

  private renderOffensiveCombinations(): void {
    this.options.combinations.forEach((combination, index) => {
      const y = 122 + index * 64;
      const isSelected = combination.id === this.options.selectedCombinationId;

      const displayName = getCombinationDisplayName(combination, t, index);
      const row = new UIButton(
        this.scene,
        165,
        y,
        256,
        46,
        displayName,
        () => this.options.onSelectCombination(combination.id),
        {
          variant: isSelected ? "selected" : "secondary",
          fontSize: 14,
          textColor: UI.colors.text
        }
      );
      const rename = new UIButton(
        this.scene,
        327,
        y,
        46,
        46,
        t("button.editSymbol"),
        () => this.renderRenameForm(combination, index),
        { variant: "secondary", fontSize: 26, flipX: true }
      );
      this.content.add([row, rename]);
    });
  }

  private renderDefensiveSizes(): void {
    this.content.add(this.scene.add.text(195, 120, t("lineout.v3.defensiveFormationHint"), {
      font: UI.font.body,
      color: UI.colors.muted,
      align: "center",
      wordWrap: { width: 300 }
    }).setOrigin(0.5));

    DEFENSIVE_LINEOUT_SIZES.forEach((size, index) => {
      const button = new UIButton(
        this.scene,
        195,
        174 + index * 58,
        320,
        48,
        t("lineout.overlay.defensiveSize").replace("{size}", String(size)),
        () => this.options.onSelectDefensiveSize(size),
        {
          variant: size === this.options.selectedDefensiveSize ? "selected" : "secondary",
          fontSize: 15,
          textColor: UI.colors.text
        }
      );
      this.content.add(button);
    });
  }

  private renderRenameForm(combination: Combination, index: number): void {
    this.destroyNameInput();
    this.content.removeAll(true);

    const panel = renderMenuPanel(this.scene, {
      x: 195,
      y: 260,
      width: 354,
      height: 300,
      accentColor: UI.colors.outline,
      fillAlpha: 0.98,
      fillColor: UI.colors.panelDark
    });
    const panelInputBlocker = this.scene.add.zone(195, 260, 354, 300).setInteractive();
    const title = this.scene.add.text(195, 164, t("lineout.renameTitle"), {
      font: UI.font.subtitle,
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 280 }
    }).setOrigin(0.5);
    const back = new UIButton(
      this.scene,
      107,
      342,
      150,
      44,
      t("button.back"),
      () => this.renderCurrentTab(),
      { variant: "secondary" }
    );
    const save = new UIButton(
      this.scene,
      283,
      342,
      150,
      44,
      t("button.save"),
      () => this.applyRename(combination.id),
      { variant: "primary" }
    );
    this.content.add([panel, panelInputBlocker, title, back, save]);
    this.createNameInput(getCombinationDisplayName(combination, t, index), combination.id);
  }

  private createNameInput(initialValue: string, combinationId: string): void {
    const parent = this.scene.game.canvas.parentElement ?? document.body;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 24;
    input.value = initialValue;
    input.placeholder = t("lineout.renamePlaceholder");
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.setAttribute("aria-label", t("lineout.renameTitle"));
    applyDomControlStyle(input);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.applyRename(combinationId);
    });

    parent.appendChild(input);
    this.nameInput = input;
    this.positionInputHandler = () => this.positionNameInput();
    window.addEventListener("resize", this.positionInputHandler);
    this.scene.scale.on("resize", this.positionInputHandler);
    this.positionNameInput();
    input.focus();
    input.select();
  }

  private positionNameInput(): void {
    if (!this.nameInput) return;
    const bounds = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = bounds.width / 390;
    const scaleY = bounds.height / 844;
    this.nameInput.style.left = `${bounds.left + 52 * scaleX}px`;
    this.nameInput.style.top = `${bounds.top + 216 * scaleY}px`;
    this.nameInput.style.width = `${286 * scaleX}px`;
    this.nameInput.style.height = `${48 * scaleY}px`;
    this.nameInput.style.fontSize = `${18 * Math.min(scaleX, scaleY)}px`;
  }

  private applyRename(combinationId: string): void {
    const name = this.nameInput?.value ?? "";
    this.destroyNameInput();
    this.options.onRename(combinationId, name);
  }

  private destroyNameInput(): void {
    if (this.positionInputHandler) {
      window.removeEventListener("resize", this.positionInputHandler);
      this.scene.scale.off("resize", this.positionInputHandler);
      this.positionInputHandler = null;
    }
    this.nameInput?.remove();
    this.nameInput = null;
  }
}
