import Phaser from "phaser";
import { UIButton } from "./UIButton";
import { UI } from "./UITheme";
import { markTutorialAnchor } from "./TutorialAnchor";

type CombinationSequenceLabels = {
  placement: string;
  phase: string;
  removePhase: string;
  train: string;
};

type CombinationSequenceBarOptions = {
  phaseCount: number;
  maximumPhaseCount: number;
  selectedPhaseIndex: number | null;
  labels: CombinationSequenceLabels;
  onSelectPlacement: () => void;
  onSelectPhase: (phaseIndex: number) => void;
  onAddPhase: () => void;
  onRemovePhase: () => void;
  onTrain: () => void;
};

const BAR_WIDTH = 354;
const BAR_HEIGHT = 96;
const TRACK_START_X = -151;
const TRACK_STEP = 52;
const TRACK_Y = -10;

export class CombinationSequenceBar extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, options: CombinationSequenceBarOptions) {
    super(scene, x, y);

    this.renderPanel(scene);
    this.renderTrack(scene, options);
    this.renderActions(scene, options);

    scene.add.existing(this);
  }

  private renderPanel(scene: Phaser.Scene): void {
    const graphics = scene.add.graphics();
    const left = -BAR_WIDTH / 2;
    const top = -BAR_HEIGHT / 2;

    graphics.fillStyle(UI.colors.scrim, 0.24);
    graphics.fillRoundedRect(left + 3, top + 5, BAR_WIDTH, BAR_HEIGHT, UI.radius);
    graphics.fillStyle(UI.colors.panelDark, 0.94);
    graphics.lineStyle(2, UI.colors.outline, 0.96);
    graphics.fillRoundedRect(left, top, BAR_WIDTH, BAR_HEIGHT, UI.radius);
    graphics.strokeRoundedRect(left, top, BAR_WIDTH, BAR_HEIGHT, UI.radius);

    this.add(graphics);
  }

  private renderTrack(scene: Phaser.Scene, options: CombinationSequenceBarOptions): void {
    const graphics = scene.add.graphics();
    const phaseControls: Array<{ phaseIndex: number; x: number; selected: boolean; }> = [];

    for (let phaseIndex = 0; phaseIndex < options.phaseCount; phaseIndex += 1) {
      const startX = TRACK_START_X + phaseIndex * TRACK_STEP;
      const endX = startX + TRACK_STEP;
      const selected = options.selectedPhaseIndex === phaseIndex;

      graphics.lineStyle(selected ? 7 : 4, selected ? UI.colors.accent : UI.colors.outlineStrong, 1);
      graphics.lineBetween(startX + 6, TRACK_Y, endX - 6, TRACK_Y);
      phaseControls.push({ phaseIndex, x: (startX + endX) / 2, selected });
    }

    for (let stateIndex = 0; stateIndex <= options.phaseCount; stateIndex += 1) {
      const nodeX = TRACK_START_X + stateIndex * TRACK_STEP;
      const placementSelected = stateIndex === 0 && options.selectedPhaseIndex === null;
      graphics.fillStyle(placementSelected ? UI.colors.accent : UI.colors.panelDark, 1);
      graphics.fillCircle(nodeX, TRACK_Y, 5);
      graphics.lineStyle(2, placementSelected ? UI.colors.accentStrong : UI.colors.line, 1);
      graphics.strokeCircle(nodeX, TRACK_Y, placementSelected ? 7 : 5);
    }

    this.add(graphics);
    phaseControls.forEach(({ phaseIndex, x, selected }) => {
      this.renderPhaseControl(scene, phaseIndex, x, selected, options);
    });
    this.renderStateLabels(scene, options);
    this.renderPlacementControl(scene, options);
  }

  private renderStateLabels(scene: Phaser.Scene, options: CombinationSequenceBarOptions): void {
    for (let stateIndex = 1; stateIndex <= options.phaseCount; stateIndex += 1) {
      const x = TRACK_START_X + stateIndex * TRACK_STEP;
      const label = scene.add.text(x, 10, String(stateIndex), {
        font: "bold 10px Arial",
        color: UI.colors.muted
      }).setOrigin(0.5).setResolution(2);
      this.add(label);
    }
  }

  private renderPlacementControl(scene: Phaser.Scene, options: CombinationSequenceBarOptions): void {
    const placement = scene.add.text(TRACK_START_X, 10, options.labels.placement, {
      font: "bold 10px Arial",
      color: options.selectedPhaseIndex === null ? UI.colors.textAccent : UI.colors.muted
    }).setOrigin(0.5).setResolution(2);
    const hitArea = scene.add.zone(TRACK_START_X, -5, 56, 46)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", options.onSelectPlacement);

    markTutorialAnchor(hitArea, "combination.placement");
    this.add([placement, hitArea]);
  }

  private renderPhaseControl(
    scene: Phaser.Scene,
    phaseIndex: number,
    x: number,
    selected: boolean,
    options: CombinationSequenceBarOptions
  ): void {
    const label = scene.add.text(x, -30, options.labels.phase.replace("{number}", String(phaseIndex + 1)), {
      font: "bold 10px Arial",
      color: selected ? UI.colors.textAccent : UI.colors.muted
    }).setOrigin(0.5).setResolution(2);
    const hitArea = scene.add.zone(x, -8, 50, 42)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => options.onSelectPhase(phaseIndex));

    markTutorialAnchor(hitArea, "combination.phase");
    this.add([label, hitArea]);
  }

  private renderActions(scene: Phaser.Scene, options: CombinationSequenceBarOptions): void {
    const endNodeX = TRACK_START_X + options.phaseCount * TRACK_STEP;
    if (options.phaseCount < options.maximumPhaseCount) {
      const addX = Math.min(57, endNodeX + 27);
      const add = new UIButton(scene, addX, TRACK_Y, 34, 32, "+", options.onAddPhase, {
        variant: "secondary",
        fontSize: 19,
        hitWidth: 48,
        hitHeight: 52
      });
      markTutorialAnchor(add, "combination.add-phase");
      this.add(add);
    }

    if (options.selectedPhaseIndex !== null && options.phaseCount > 1) {
      const remove = new UIButton(
        scene,
        -82,
        35,
        138,
        24,
        options.labels.removePhase.replace("{number}", String(options.selectedPhaseIndex + 1)),
        options.onRemovePhase,
        {
          variant: "danger",
          fontSize: 8,
          hitHeight: 30
        }
      );
      markTutorialAnchor(remove, "combination.remove-phase");
      this.add(remove);
    }

    const train = new UIButton(scene, 128, 0, 88, 44, `▶ ${options.labels.train}`, options.onTrain, {
      variant: "primary",
      fontSize: 10
    });
    markTutorialAnchor(train, "combination.train");
    this.add(train);
  }
}
