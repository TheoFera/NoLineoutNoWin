import Phaser from "phaser";
import { COACH_LESSONS, type CoachLesson, type CoachStep } from "../data/CoachTutorial";
import { GameStore } from "../state/GameStore";
import { CharlesCoachOverlay } from "./CharlesCoachOverlay";
import { getCameraRenderScale } from "../systems/HighDensityRendering";
import { t } from "../systems/I18n";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { getCoachRecruitmentTarget } from "../rules/RecruitmentRules";
import { UI } from "./UITheme";

export type CoachTutorialHost = {
  pauseTimers?: boolean;
  onBlocking?: (active: boolean) => void;
  scope: () => string;
  target?: (id: string) => Phaser.Geom.Rectangle | undefined;
  prepareStep?: (step: CoachStep) => void;
};

export class CoachTutorialDirector {
  private lesson?: CoachLesson;
  private step?: CoachStep;
  private overlay?: CharlesCoachOverlay;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private signature = "";
  private liveGesture = false;
  private nextFrame = false;
  private commentUntil = 0;
  private comment?: Phaser.GameObjects.Container;
  private commentKey = "";
  private destroyed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly host: CoachTutorialHost) {
    const scale = getCameraRenderScale(scene);
    this.camera = scene.cameras.add(0, 0, 390 * scale, 844 * scale).setZoom(scale).centerOn(195, 422);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.filterCameras, this);
    scene.events.on("coach-action", this.onAction, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.update(0);
  }

  get paused(): boolean {
    return Boolean(this.overlay?.active && (!this.step?.live || !this.liveGesture));
  }

  get waitingForJump(): boolean { return this.lesson?.id === "defense.jump" && Boolean(this.overlay?.active); }

  isWaitingFor(action: string): boolean { return this.step?.wait === action; }

  private onAction(action: string): void {
    if (action === "throw.started" && this.step?.live) {
      this.liveGesture = true;
      this.overlay?.hideForGesture();
    }
    if (action.startsWith("throw.rejected.")) {
      this.liveGesture = false;
      this.signature = "";
      this.showComment(`coach.comment.${action.split(".").at(-1)}`);
    }
    if (action === this.step?.wait) this.advance();
  }

  private advance(): void {
    if (!this.lesson) return;
    const progress = GameStore.getCoachTutorial();
    if (!progress) return;
    const next = (progress.steps[this.lesson.id] ?? 0) + 1;
    if (!this.lesson.id.startsWith("recovery.")) GameStore.advanceCoachStep(this.lesson.id, next, next >= this.lesson.steps.length);
    this.overlay?.destroy(); this.overlay = undefined;
    this.step = undefined;
    this.signature = "";
    this.liveGesture = false;
    // Ne jamais transmettre le relâchement qui vient de valider à la bulle suivante.
    this.nextFrame = true;
  }

  private findTarget(id: string): Phaser.Geom.Rectangle | undefined {
    const custom = this.host.target?.(id);
    if (custom) return this.toScreen(custom);
    const visit = (objects: Phaser.GameObjects.GameObject[]): Phaser.Geom.Rectangle | undefined => {
      for (const object of objects) {
        if (object === this.overlay || object === this.comment || !object.active) continue;
        if ("visible" in object && !object.visible) continue;
        if (object.getData("tutorial-anchor") === id && "getBounds" in object) {
          return (object as Phaser.GameObjects.Container).getBounds();
        }
        if (object instanceof Phaser.GameObjects.Container) {
          const found = visit(object.list); if (found) return found;
        }
      }
      return undefined;
    };
    const bounds = visit(this.scene.children.list);
    return bounds && this.toScreen(bounds);
  }

  private toScreen(bounds: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle {
    const camera = this.scene.cameras.main;
    const scale = getCameraRenderScale(this.scene);
    const origin = camera.getWorldPoint(camera.x, camera.y);
    const ratio = camera.zoom / scale;
    return new Phaser.Geom.Rectangle((bounds.x - origin.x) * ratio, (bounds.y - origin.y) * ratio,
      bounds.width * ratio, bounds.height * ratio);
  }

  private update(time: number): void {
    if (this.destroyed) return;
    if (this.host.pauseTimers) {
      this.scene.tweens.timeScale = this.paused ? 0 : 1;
      this.scene.time.timeScale = this.paused ? 0 : 1;
    }
    this.filterCameras();
    if (this.nextFrame) { this.nextFrame = false; return; }
    const progress = GameStore.getCoachTutorial();
    if (!progress) { this.clear(); return; }
    if (this.comment && time >= this.commentUntil) { this.comment.destroy(); this.comment = undefined; this.commentKey = ""; }
    const scope = this.host.scope();
    if (progress.pendingComment && ["simulation", "editor.simple", "editor.second"].includes(scope)) {
      this.showComment(progress.pendingComment);
      GameStore.updateCoachTutorial({ pendingComment: undefined });
    }
    if (this.comment) return;
    const lesson = COACH_LESSONS.find((item) => item.scope === scope && progress.matchesCompleted >= item.min
      && (item.max === undefined || progress.matchesCompleted <= item.max)
      && !progress.completed.includes(item.id) && (item.requires ?? []).every((id) => progress.completed.includes(id)))
      ?? this.recoveryLesson(scope);
    if (!lesson) { this.clearOverlay(); return; }
    const index = progress.steps[lesson.id] ?? 0;
    const step = lesson.steps[index];
    if (!step) { GameStore.advanceCoachStep(lesson.id, index, true); return; }
    this.host.prepareStep?.(step);
    const target = step.target ? this.findTarget(step.target) : undefined;
    const destination = step.destination ? this.findTarget(step.destination) : undefined;
    if ((step.target && !target) || (step.destination && !destination)) { this.clearOverlay(); return; }
    const signature = `${lesson.id}:${index}`;
    if (signature !== this.signature || !this.overlay?.active) {
      this.clearOverlay();
      this.lesson = lesson; this.step = step; this.signature = signature;
      let message = t(step.key);
      if (step.key === "coach.compare") {
        const team = GameStore.getSave().playerTeam;
        const player = team.pendingRecruitment;
        message = message.replace("{recruit}", String(player?.role === "field" ? player.strength : ""))
          .replace("{starter}", String(getCoachRecruitmentTarget(team).strength));
      }
      this.overlay = new CharlesCoachOverlay(this.scene, step, message, () => this.advance());
      this.filterCameras();
    }
    this.overlay?.layout(target, destination, step, time);
    this.filterCameras();
  }

  private recoveryLesson(scope: string): CoachLesson | undefined {
    const progress = GameStore.getCoachTutorial();
    if (!progress || progress.matchesCompleted >= 6) return undefined;
    const stage = progress.matchesCompleted;
    let step: CoachStep | undefined;
    const id = stage < 2 ? "charles-simple" : "charles-profonde";
    const practiced = progress.completed.includes(`practice.${stage}`);
    if (scope === "team") {
      if (stage === 3 && !progress.completed.includes("recruit.result")) {
        step = { key: "coach.resume.recruit", target: "team.recruit", wait: "recruit.open" };
      } else if (practiced || stage === 3) {
        step = { key: "coach.resume.match", target: "team.championship", wait: "open.championship" };
      } else step = { key: "coach.resume.team", target: "team.combinations", wait: "open.combinations" };
    } else if (scope === "list" && stage !== 3) {
      step = { key: "coach.resume.list", target: `combination.${id}`, wait: `select.${id}` };
    } else if (scope === "editor.simple" || scope === "editor.second") {
      step = practiced || stage === 3
        ? { key: "coach.resume.match", target: "team.championship", wait: "open.championship" }
        : { key: "coach.resume.practice", target: "combination.train", wait: "train" };
    }
    return step ? { id: `recovery.${scope}`, scope, min: 0, steps: [step] } : undefined;
  }

  showComment(key: string): void {
    if (!GameStore.getCoachTutorial() || this.commentKey === key) return;
    this.comment?.destroy();
    this.commentKey = key;
    const scene = this.scene;
    this.comment = scene.add.container(0, 0).setDepth(2200);
    const bg = scene.add.rectangle(195, 154, 370, 92, 0, 0);
    // La même palette que les autres interventions de Charles.
    bg.setFillStyle(UI.colors.panelDark, 0.98).setStrokeStyle(1, UI.colors.outline);
    const portrait = scene.add.image(48, 194, "charles-encouraging").setOrigin(0.5, 1);
    portrait.setScale(Math.min(64 / portrait.width, 83 / portrait.height));
    this.comment.add([bg, portrait, scene.add.text(90, 121, t(key), {
      font: "15px Arial", color: UI.colors.text, wordWrap: { width: 277 }, lineSpacing: 2,
    })]);
    this.commentUntil = scene.time.now + LINEOUT_BALANCE.tutorial.commentDurationMs;
    this.filterCameras();
  }

  private filterCameras(): void {
    // Le HUD de vol peut créer une caméra pendant scene.update : Charles reste au-dessus.
    Phaser.Utils.Array.BringToTop(this.scene.cameras.cameras, this.camera);
    this.host.onBlocking?.(Boolean(this.overlay?.active));
    const owned = [this.overlay, this.comment].filter((object): object is Phaser.GameObjects.Container => Boolean(object?.active));
    this.camera.ignore(this.scene.children.list.filter((object) => !owned.includes(object as Phaser.GameObjects.Container)));
    for (const camera of this.scene.cameras.cameras) if (camera !== this.camera) camera.ignore(owned);
  }

  private clearOverlay(): void {
    this.overlay?.destroy(); this.overlay = undefined; this.signature = "";
    this.lesson = undefined; this.step = undefined; this.liveGesture = false;
  }
  private clear(): void { this.clearOverlay(); this.comment?.destroy(); this.comment = undefined; }
  private destroy(): void {
    this.destroyed = true; this.clear();
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.filterCameras, this);
    this.scene.events.off("coach-action", this.onAction, this);
    this.scene.cameras.remove(this.camera);
    if (this.host.pauseTimers) { this.scene.tweens.timeScale = 1; this.scene.time.timeScale = 1; }
  }
}
