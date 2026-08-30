import Phaser from "phaser";
import type {
  Combination,
  CombinationPhaseAction,
  LineoutPosition
} from "../models/Combination";
import {
  getActiveOffensiveCombinations,
  getCombinationDisplayName,
  normalizeOffensiveCombinations,
  replaceCombinationPlan
} from "../rules/CombinationRules";
import { getV3CombinationPlan, LINEOUT_V3_MAX_PHASES } from "../rules/LineoutV3Combination";
import { getLineoutV3DepthForPosition, getLineoutV3PositionForDepth } from "../rules/LineoutV3Geometry";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";
import { UIRoundedRectangle } from "../ui/UIRoundedRectangle";
import { CombinationSequenceBar } from "../ui/CombinationSequenceBar";
import { renderMenuBackdrop } from "../ui/MenuChrome";

type EditorMode = "select" | "move" | "lifters";

type CombinationPlanSceneData = {
  combinationId: string;
  phaseIndex?: number;
  selectedPosition?: LineoutPosition;
  editorMode?: EditorMode;
};

export class CombinationPlanScene extends Phaser.Scene {
  private combinationId = "";
  private phaseIndex = 0;
  private selectedPosition: LineoutPosition | null = null;
  private editorMode: EditorMode = "select";
  private combination!: Combination;

  constructor() {
    super("CombinationPlanScene");
  }

  init(data: CombinationPlanSceneData): void {
    this.combinationId = data.combinationId;
    this.phaseIndex = Math.max(0, data.phaseIndex ?? 0);
    this.selectedPosition = data.selectedPosition ?? null;
    this.editorMode = data.editorMode ?? "select";
  }

  create(): void {
    const save = GameStore.getSave();
    const combinations = normalizeOffensiveCombinations(save.offensiveCombinations);
    const activeCombinations = getActiveOffensiveCombinations(
      combinations,
      save.offensiveRepertoire
    );
    this.combination = combinations.find((item) => item.id === this.combinationId) ?? combinations[0];
    if (!this.combination) {
      navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "edit",
        combinationOverlayOpen: true
      });
      return;
    }
    const plan = getV3CombinationPlan(this.combination);
    this.phaseIndex = Phaser.Math.Clamp(this.phaseIndex, 0, plan.phases.length - 1);

    renderMenuBackdrop(this, { showGuideLines: false });
    new UIRoundedRectangle(this, 195, 60, 354, 82, UI.colors.panelDark, 0.98)
      .setStrokeStyle(2, UI.colors.outline);
    const activeIndex = activeCombinations.findIndex((item) => item.id === this.combination.id);
    this.add.text(195, 42, getCombinationDisplayName(
      this.combination,
      t,
      activeIndex >= 0 ? activeIndex : undefined
    ), {
      font: "bold 20px Arial",
      color: UI.colors.text,
      align: "center",
      wordWrap: { width: 320 }
    }).setOrigin(0.5);
    this.add.text(195, 72, t("lineout.v3.planSubtitle"), {
      font: "12px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5);

    this.renderPhaseControls(plan.phases.length);
    this.renderActions(plan.phases[this.phaseIndex].actions);
    this.renderPlayerButtons();
    this.renderActionControls();

    new UIButton(this, 195, 794, 220, 42, t("button.back"), () => {
      navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "edit",
        combinationId: this.combination.id,
        combinationOverlayOpen: true
      });
    }, { variant: "secondary" });
  }

  private renderPhaseControls(phaseCount: number): void {
    new CombinationSequenceBar(this, 195, 152, {
      phaseCount,
      maximumPhaseCount: LINEOUT_V3_MAX_PHASES,
      selectedPhaseIndex: this.phaseIndex,
      labels: {
        placement: t("lineout.v3.initialPlacementShort"),
        phase: t("lineout.v3.phaseNumber"),
        removePhase: t("lineout.v3.deletePhaseNumber"),
        train: t("lineout.v3.practiceCombination")
      },
      onSelectPlacement: () => navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "edit",
        combinationId: this.combination.id
      }),
      onSelectPhase: (phaseIndex) => this.restart({ phaseIndex }),
      onAddPhase: () => this.addPhase(),
      onRemovePhase: () => this.deletePhase(),
      onTrain: () => navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "practice",
        combinationId: this.combination.id
      })
    });
  }

  private renderActions(actions: CombinationPhaseAction[]): void {
    new UIRoundedRectangle(this, 195, 335, 350, 188, UI.colors.panelRaised, 0.96)
      .setStrokeStyle(1, UI.colors.outline);
    this.add.text(34, 252, t("lineout.v3.phaseActions"), {
      font: "bold 14px Arial",
      color: UI.colors.textAccent
    });
    const body = actions.length === 0
      ? t("lineout.v3.noAction")
      : actions.map((action) => this.describeAction(action)).join("\n");
    this.add.text(34, 278, body, {
      font: "14px Arial",
      color: UI.colors.text,
      lineSpacing: 9,
      wordWrap: { width: 320 }
    });
  }

  private renderPlayerButtons(): void {
    this.add.text(195, 450, t("lineout.v3.choosePlayer"), {
      font: "bold 13px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5);
    for (let position = 1; position <= 7; position += 1) {
      const lineoutPosition = position as LineoutPosition;
      const playerId = this.combination.slots.find((slot) => slot.position === lineoutPosition)?.playerId;
      const player = GameStore.getSave().playerTeam.lineoutPlayers.find((item) => item.id === playerId);
      const selected = this.selectedPosition === lineoutPosition;
      const label = player
        ? `${position}\n${t("team.numberPrefix")}${player.number}`
        : `${position}\n—`;
      new UIButton(this, 39 + (position - 1) * 52, 490, 46, 54, label, () => {
        this.handlePlayerChoice(lineoutPosition);
      }, { variant: selected ? "selected" : "secondary", fontSize: 11 });
    }
  }

  private renderActionControls(): void {
    const disabledHint = this.selectedPosition === null
      ? t("lineout.v3.selectPlayerHint")
      : t("lineout.v3.selectedPlayer").replace("{position}", String(this.selectedPosition));
    this.add.text(195, 538, disabledHint, {
      font: "12px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5);
    new UIButton(this, 52, 582, 84, 38, t("lineout.v3.actionMove"), () => this.chooseMove());
    new UIButton(this, 147, 582, 84, 38, t("lineout.v3.actionFeint"), () => this.setSimpleAction("feint"));
    new UIButton(this, 242, 582, 84, 38, t("lineout.v3.actionJump"), () => this.chooseJump());
    new UIButton(this, 337, 582, 84, 38, t("lineout.v3.actionClear"), () => this.clearSelectedAction(), {
      variant: "secondary"
    });

    if (this.editorMode === "move") this.renderDestinations();
    if (this.editorMode === "lifters") this.renderLifterHelp();
  }

  private renderDestinations(): void {
    this.add.text(195, 632, t("lineout.v3.chooseDestination"), {
      font: "bold 13px Arial",
      color: UI.colors.textAccent
    }).setOrigin(0.5);
    for (let position = 1; position <= 7; position += 1) {
      new UIButton(this, 39 + (position - 1) * 52, 676, 44, 40, String(position), () => {
        this.setMoveDestination(position as LineoutPosition);
      }, { variant: "secondary" });
    }
  }

  private renderLifterHelp(): void {
    const jump = this.getCurrentActions().find((action) => (
      action.type === "jump" && action.playerPosition === this.selectedPosition
    ));
    const lifters = jump?.type === "jump" ? jump.lifterPositions.join(", ") || "—" : "—";
    this.add.text(195, 642, `${t("lineout.v3.chooseLifters")}\n${t("lineout.v3.currentLifters")} ${lifters}`, {
      font: "bold 13px Arial",
      color: UI.colors.textAccent,
      align: "center",
      lineSpacing: 7
    }).setOrigin(0.5);
    new UIButton(this, 195, 716, 180, 40, t("button.confirm"), () => this.restart({ editorMode: "select" }), {
      variant: "primary"
    });
  }

  private handlePlayerChoice(position: LineoutPosition): void {
    const occupied = Boolean(
      this.combination.slots.find((slot) => slot.position === position)?.playerId
    );
    if (!occupied) return;
    if (this.editorMode === "lifters" && this.selectedPosition && position !== this.selectedPosition) {
      this.toggleLifter(position);
      return;
    }
    this.restart({ selectedPosition: position, editorMode: "select" });
  }

  private chooseMove(): void {
    if (!this.selectedPosition) return;
    this.restart({ editorMode: "move" });
  }

  private chooseJump(): void {
    if (!this.selectedPosition) return;
    this.replaceSelectedAction({
      type: "jump",
      playerPosition: this.selectedPosition,
      lifterPositions: []
    }, "lifters");
  }

  private setSimpleAction(type: "feint"): void {
    if (!this.selectedPosition) return;
    this.replaceSelectedAction({ type, playerPosition: this.selectedPosition }, "select");
  }

  private setMoveDestination(position: LineoutPosition): void {
    if (!this.selectedPosition) return;
    this.replaceSelectedAction({
      type: "move",
      playerPosition: this.selectedPosition,
      destinationDepthMeters: getLineoutV3DepthForPosition(position)
    }, "select");
  }

  private toggleLifter(position: LineoutPosition): void {
    if (!this.selectedPosition) return;
    const current = this.getCurrentActions().find((action) => (
      action.type === "jump" && action.playerPosition === this.selectedPosition
    ));
    if (!current || current.type !== "jump") return;
    const includes = current.lifterPositions.includes(position);
    const lifterPositions = includes
      ? current.lifterPositions.filter((item) => item !== position)
      : [...current.lifterPositions, position].slice(-2);
    this.replaceSelectedAction({ ...current, lifterPositions }, "lifters");
  }

  private clearSelectedAction(): void {
    if (!this.selectedPosition) return;
    const plan = getV3CombinationPlan(this.combination);
    plan.phases[this.phaseIndex].actions = plan.phases[this.phaseIndex].actions
      .filter((action) => action.playerPosition !== this.selectedPosition);
    this.persist(plan, "select");
  }

  private replaceSelectedAction(action: CombinationPhaseAction, editorMode: EditorMode): void {
    const plan = getV3CombinationPlan(this.combination);
    const actions = plan.phases[this.phaseIndex].actions
      .filter((item) => item.playerPosition !== action.playerPosition);
    plan.phases[this.phaseIndex].actions = [...actions, action];
    this.persist(plan, editorMode);
  }

  private addPhase(): void {
    const plan = getV3CombinationPlan(this.combination);
    if (plan.phases.length >= LINEOUT_V3_MAX_PHASES) return;
    plan.phases.push({
      id: `phase-${Date.now()}`,
      actions: []
    });
    this.phaseIndex = plan.phases.length - 1;
    this.persist(plan, "select");
  }

  private deletePhase(): void {
    const plan = getV3CombinationPlan(this.combination);
    const lastPhaseIndex = plan.phases.length - 1;
    if (plan.phases.length <= 1 || this.phaseIndex !== lastPhaseIndex) return;
    plan.phases.pop();
    this.phaseIndex = plan.phases.length - 1;
    this.persist(plan, "select");
  }

  private getCurrentActions(): CombinationPhaseAction[] {
    return getV3CombinationPlan(this.combination).phases[this.phaseIndex].actions;
  }

  private describeAction(action: CombinationPhaseAction): string {
    if (action.type === "move") {
      const destination = this.positionForDepth(action.destinationDepthMeters);
      return t("lineout.v3.actionDescription.move")
        .replace("{player}", String(action.playerPosition))
        .replace("{destination}", String(destination));
    }
    if (action.type === "feint") {
      return t("lineout.v3.actionDescription.feint")
        .replace("{player}", String(action.playerPosition));
    }
    return t("lineout.v3.actionDescription.jump")
      .replace("{player}", String(action.playerPosition))
      .replace("{lifters}", action.lifterPositions.join(", ") || "—");
  }

  private positionForDepth(depthMeters: number): number {
    return getLineoutV3PositionForDepth(depthMeters);
  }

  private persist(plan: NonNullable<Combination["plan"]>, editorMode: EditorMode): void {
    const updated = replaceCombinationPlan(
      GameStore.getSave().offensiveCombinations,
      this.combination.id,
      plan
    );
    GameStore.setOffensiveCombinations(updated);
    this.restart({ editorMode });
  }

  private restart(overrides: Partial<CombinationPlanSceneData>): void {
    this.scene.restart({
      combinationId: this.combination.id,
      phaseIndex: this.phaseIndex,
      selectedPosition: this.selectedPosition ?? undefined,
      editorMode: this.editorMode,
      ...overrides
    } satisfies CombinationPlanSceneData);
  }
}
