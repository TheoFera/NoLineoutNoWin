import Phaser from "phaser";
import type {
  Combination,
  CombinationPhaseAction,
  LineoutPosition
} from "../models/Combination";
import { getCombinationDisplayName, normalizeOffensiveCombinations, replaceCombinationPlan } from "../rules/CombinationRules";
import { getV3CombinationPlan } from "../rules/LineoutV3Combination";
import { getLineoutV3DepthForPosition, getLineoutV3PositionForDepth } from "../rules/LineoutV3Geometry";
import { GameStore } from "../state/GameStore";
import { t } from "../systems/I18n";
import { navigateTo } from "../systems/Navigation";
import { UIButton } from "../ui/UIButton";
import { UI } from "../ui/UITheme";

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
    const combinations = normalizeOffensiveCombinations(GameStore.getSave().offensiveCombinations);
    this.combination = combinations.find((item) => item.id === this.combinationId) ?? combinations[0];
    if (!this.combination) {
      navigateTo(this, "CombinationListScene");
      return;
    }
    const plan = getV3CombinationPlan(this.combination);
    this.phaseIndex = Phaser.Math.Clamp(this.phaseIndex, 0, plan.phases.length - 1);

    this.add.rectangle(195, 422, 390, 844, 0x07111a);
    this.add.rectangle(195, 60, 354, 82, 0x10271b, 0.98).setStrokeStyle(2, UI.colors.accent);
    this.add.text(195, 42, getCombinationDisplayName(this.combination, t), {
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

    new UIButton(this, 103, 794, 164, 42, t("lineout.v3.editPlacement"), () => {
      navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "edit",
        combinationId: this.combination.id
      });
    }, { variant: "secondary" });
    new UIButton(this, 287, 794, 164, 42, t("lineout.v3.practiceCombination"), () => {
      navigateTo(this, "LineoutScene", {
        mode: "training",
        trainingMode: "practice",
        combinationId: this.combination.id
      });
    });
  }

  private renderPhaseControls(phaseCount: number): void {
    new UIButton(this, 46, 122, 46, 38, "‹", () => this.restart({
      phaseIndex: Math.max(0, this.phaseIndex - 1)
    }), { variant: "secondary", fontSize: 24 });
    this.add.text(195, 122, t("lineout.v3.phase")
      .replace("{current}", String(this.phaseIndex + 1))
      .replace("{total}", String(phaseCount)), {
      font: "bold 16px Arial",
      color: UI.colors.text
    }).setOrigin(0.5);
    new UIButton(this, 344, 122, 46, 38, "›", () => this.restart({
      phaseIndex: Math.min(phaseCount - 1, this.phaseIndex + 1)
    }), { variant: "secondary", fontSize: 24 });
    new UIButton(this, 92, 166, 132, 34, t("lineout.v3.addPhase"), () => this.addPhase());
    new UIButton(this, 242, 166, 132, 34, t("lineout.v3.deletePhase"), () => this.deletePhase(), {
      variant: "secondary"
    });
  }

  private renderActions(actions: CombinationPhaseAction[]): void {
    this.add.rectangle(195, 300, 350, 218, 0x0f1c29, 0.96).setStrokeStyle(1, 0x64748b);
    this.add.text(34, 206, t("lineout.v3.phaseActions"), {
      font: "bold 14px Arial",
      color: "#facc15"
    });
    const body = actions.length === 0
      ? t("lineout.v3.noAction")
      : actions.map((action) => this.describeAction(action)).join("\n");
    this.add.text(34, 238, body, {
      font: "14px Arial",
      color: UI.colors.text,
      lineSpacing: 9,
      wordWrap: { width: 320 }
    });
  }

  private renderPlayerButtons(): void {
    this.add.text(195, 430, t("lineout.v3.choosePlayer"), {
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
      new UIButton(this, 39 + (position - 1) * 52, 474, 46, 54, label, () => {
        this.handlePlayerChoice(lineoutPosition);
      }, { variant: selected ? "primary" : "secondary", fontSize: 11 });
    }
  }

  private renderActionControls(): void {
    const disabledHint = this.selectedPosition === null
      ? t("lineout.v3.selectPlayerHint")
      : t("lineout.v3.selectedPlayer").replace("{position}", String(this.selectedPosition));
    this.add.text(195, 522, disabledHint, {
      font: "12px Arial",
      color: UI.colors.muted
    }).setOrigin(0.5);
    new UIButton(this, 52, 566, 84, 38, t("lineout.v3.actionMove"), () => this.chooseMove());
    new UIButton(this, 147, 566, 84, 38, t("lineout.v3.actionFeint"), () => this.setSimpleAction("feint"));
    new UIButton(this, 242, 566, 84, 38, t("lineout.v3.actionJump"), () => this.chooseJump());
    new UIButton(this, 337, 566, 84, 38, t("lineout.v3.actionClear"), () => this.clearSelectedAction(), {
      variant: "secondary"
    });

    if (this.editorMode === "move") this.renderDestinations();
    if (this.editorMode === "lifters") this.renderLifterHelp();
  }

  private renderDestinations(): void {
    this.add.text(195, 616, t("lineout.v3.chooseDestination"), {
      font: "bold 13px Arial",
      color: "#facc15"
    }).setOrigin(0.5);
    for (let position = 1; position <= 7; position += 1) {
      new UIButton(this, 39 + (position - 1) * 52, 660, 44, 40, String(position), () => {
        this.setMoveDestination(position as LineoutPosition);
      }, { variant: "secondary" });
    }
  }

  private renderLifterHelp(): void {
    const jump = this.getCurrentActions().find((action) => (
      action.type === "jump" && action.playerPosition === this.selectedPosition
    ));
    const lifters = jump?.type === "jump" ? jump.lifterPositions.join(", ") || "—" : "—";
    this.add.text(195, 626, `${t("lineout.v3.chooseLifters")}\n${t("lineout.v3.currentLifters")} ${lifters}`, {
      font: "bold 13px Arial",
      color: "#facc15",
      align: "center",
      lineSpacing: 7
    }).setOrigin(0.5);
    new UIButton(this, 195, 700, 180, 40, t("button.confirm"), () => this.restart({ editorMode: "select" }));
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
    plan.phases.splice(this.phaseIndex + 1, 0, {
      id: `phase-${Date.now()}`,
      actions: []
    });
    this.phaseIndex += 1;
    this.persist(plan, "select");
  }

  private deletePhase(): void {
    const plan = getV3CombinationPlan(this.combination);
    if (plan.phases.length === 1) {
      plan.phases[0].actions = [];
      this.persist(plan, "select");
      return;
    }
    plan.phases.splice(this.phaseIndex, 1);
    this.phaseIndex = Math.min(this.phaseIndex, plan.phases.length - 1);
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
