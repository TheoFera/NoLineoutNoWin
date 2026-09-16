import Phaser from "phaser";
import type { Player } from "../models/Player";
import type { Team } from "../models/Team";
import { TRAINING_PLAYER_SIZE } from "../config/DisplayConfig";
import { GameStore } from "../state/GameStore";
import { getTeamBenchPlayers, exchangeSquadPlayers, STARTER_FIELD_NUMBERS, getSquadLevel, removeSquadPlayer } from "../rules/TeamSelection";
import { SquadOverview } from "../ui/SquadOverview";
import { canBeLineoutJumper, canBeLineoutLifter } from "../rules/LineoutPlayerRoles";
import { navigateTo } from "../systems/Navigation";
import { t } from "../systems/I18n";
import { getTrainingPitchAppearance, preloadMatchPitchBackdrop, renderPitchSurface } from "../ui/MatchPitchBackdrop";
import { UIButton } from "../ui/UIButton";
import { PlayerStatsOverlay } from "../ui/PlayerStatsOverlay";
import { UI } from "../ui/UITheme";
import { UIRoundedRectangle } from "../ui/UIRoundedRectangle";
import { renderSquadPlayer, renderBenchPlayerPortrait } from "../ui/SquadPlayerView";
import { RecruitmentOverlay } from "../ui/RecruitmentOverlay";
import { RugbyPlayer } from "../ui/RugbyPlayer";
import { animateSquadTravel, type SquadTravelPosition } from "../ui/SquadTravel";
import { CombinationListOverlay } from "../ui/CombinationListOverlay";
import { getActiveOffensiveCombinations, getAvailableOffensiveCombinations, renameCombination } from "../rules/CombinationRules";
import { getDivision } from "../rules/DivisionRules";
import { UI_DEPTH } from "../ui/UIDepth";
import { CoachTutorialDirector } from "../ui/CoachTutorialDirector";
import { preloadCharlesIntroduction } from "../ui/CharlesIntroductionOverlay";
import { coachAction, coachControl } from "../ui/CoachTutorialEvents";
import { getCoachRecruitmentTarget } from "../rules/RecruitmentRules";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";

const PAGE_SIZE = 4;
const STARTER_POSITIONS = [
  { number: 7, x: 100, y: 285 },
  { number: 8, x: 195, y: 246 },
  { number: 9, x: 290, y: 285 },
  { number: 4, x: 138, y: 424 },
  { number: 5, x: 252, y: 424 },
  { number: 1, x: 100, y: 564 },
  { number: 2, x: 195, y: 606 },
  { number: 3, x: 290, y: 564 }
];

type SquadToken = {
  player: Player;
  reserve: boolean;
  view: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
  homeX: number;
  homeY: number;
  height: number;
  benchMask?: Phaser.Display.Masks.GeometryMask;
};

type SquadDrag = {
  token: SquadToken;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

export class TeamScene extends Phaser.Scene {
  private team!: Team;
  private page = 0;
  private tokens: SquadToken[] = [];
  private controls: UIButton[] = [];
  private inspector?: PlayerStatsOverlay;
  private overview?: SquadOverview;
  private inspectedId?: string;
  private drag?: SquadDrag;
  private dropHighlight?: Phaser.GameObjects.Ellipse;
  private recruitment?: RecruitmentOverlay;
  private recruitButton?: UIButton;
  private combinations?: CombinationListOverlay;

  constructor() { super("TeamScene"); }

  preload(): void { preloadMatchPitchBackdrop(this); preloadCharlesIntroduction(this); }

  create(data: { squadTravel?: SquadTravelPosition[]; combinationOverlayOpen?: boolean } = {}): void {
    this.input.enabled = true;
    this.page = 0;
    this.drag = undefined;
    this.inspectedId = undefined;
    this.renderScene();
    animateSquadTravel(this, data.squadTravel, this.tokens.filter((token) => !token.reserve).map((token) => {
      const body = token.view.getData("squadBody") as RugbyPlayer;
      return {
        id: token.player.id, x: token.homeX, y: token.homeY,
        move: (x: number, y: number, progress: number) => {
          token.view.setPosition(x, y).setDepth(y);
          body.setPose("hand").setWalkingFrame(Math.floor(progress * 8) % 2 ? "gauche" : "droite");
        },
        finish: () => { body.setWalkingFrame(undefined).setPose("stand_front"); }
      };
    }));
    this.input.on("pointermove", this.movePlayer, this);
    this.input.on("pointerup", this.releasePlayer, this);
    this.input.on("pointerupoutside", this.releasePlayer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", this.movePlayer, this);
      this.input.off("pointerup", this.releasePlayer, this);
      this.input.off("pointerupoutside", this.releasePlayer, this);
      this.drag = undefined;
    });
    if (this.team.pendingRecruitment) this.openRecruitment();
    else if (data.combinationOverlayOpen) this.openCombinations();
    new CoachTutorialDirector(this, {
      scope: () => this.recruitment?.coachScope ?? (this.combinations ? "list" : "team"),
      onBlocking: (active) => this.recruitment?.setCoachGuidance(active),
      target: (id) => {
        if (id !== "recruit.target" && id !== "recruit.bench") return undefined;
        const playerId = id === "recruit.bench" ? GameStore.getCoachTutorial()?.firstRecruitId
          : getCoachRecruitmentTarget(this.team).id;
        return this.tokens.find((token) => token.player.id === playerId)?.hit.getBounds();
      }
    });
  }

  private renderScene(): void {
    GameStore.prepareCoachTeam();
    this.children.removeAll(true);
    this.recruitment = undefined;
    this.recruitButton = undefined;
    this.combinations = undefined;
    this.inspectedId = undefined;
    this.tokens = [];
    this.controls = [];
    this.dropHighlight = undefined;
    this.team = GameStore.getSave().playerTeam;
    renderPitchSurface(this, 195, 422, 390, 844, getTrainingPitchAppearance());
    this.add.zone(195, 422, 390, 844).setDepth(-1).setInteractive().on("pointerdown", () => {
      this.inspectedId = undefined;
      this.inspector?.setVisible(false);
      this.overview?.showOverview();
    });
    const pitchLines = this.add.graphics().lineStyle(2, UI.colors.paper, 0.85);
    for (const y of [114, 634]) {
      for (let x = 0; x < 390; x += 30) pitchLines.lineBetween(x, y, x + 18, y);
    }
    STARTER_POSITIONS.forEach(({ number, x, y }) => {
      // L'emplacement visuel suit la place du titulaire, même après recrutement.
      const index = (STARTER_FIELD_NUMBERS as readonly number[]).indexOf(number);
      const player = number === 2 ? this.team.hooker : this.team.lineoutPlayers[index];
      this.renderPlayer(player, x, y, false, TRAINING_PLAYER_SIZE.height);
    });
    this.renderBench();
    this.controls.push(new UIButton(this, 103, 809, 174, 48, t("button.combinations"), () =>
      this.openCombinations(), { icon: "combinations", fontSize: 18 }));
    this.controls.push(new UIButton(this, 287, 809, 174, 48, t("menu.championship"), () =>
      navigateTo(this, "ChampionshipScene", { returnTo: "TeamScene",
        returnData: { combinationOverlayOpen: Boolean(this.combinations) } }), { icon: "championship", fontSize: 18 }));
    coachControl(this.controls[this.controls.length - 2], "team.combinations", "open.combinations");
    coachControl(this.controls[this.controls.length - 1], "team.championship", "open.championship");
    this.inspector = new PlayerStatsOverlay(this, this.team.colors).setVisible(false);
    this.overview = new SquadOverview(this, getSquadLevel(this.team));
    const progress = GameStore.getCoachTutorial();
    if (progress?.steps["recruit.need"] === 1 && !progress.completed.includes("recruit.need")) {
      this.inspectPlayer(getCoachRecruitmentTarget(this.team));
    }
  }

  private renderPlayer(player: Player, x: number, y: number, reserve: boolean, height: number): void {
    const view = (reserve
      ? renderBenchPlayerPortrait(this, x, y, player, this.team.colors)
      : renderSquadPlayer(this, x, y, player, this.team.colors, height)).setDepth(y);
    const hit = this.add.zone(x, y - height * 0.43, reserve ? 62 : 76, reserve ? 76 : height * 0.8)
      .setDepth(y + 1).setInteractive({ useHandCursor: true });
    let benchMask: Phaser.Display.Masks.GeometryMask | undefined;
    if (reserve) {
      const clip = this.add.graphics().fillStyle(0xffffff)
        .fillRoundedRect(x - 30, y - 67, 60, 74, UI.radius - 1).setVisible(false);
      benchMask = clip.createGeometryMask();
      view.setMask(benchMask);
      view.once(Phaser.GameObjects.Events.DESTROY, () => benchMask?.destroy());
    }
    const token = { player, reserve, view, hit, homeX: x, homeY: y, height, benchMask };
    this.tokens.push(token);
    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.drag || this.recruitment || this.combinations) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.drag = { token, pointerId: pointer.id, startX: point.x, startY: point.y, moved: false };
    });
  }

  private renderBench(): void {
    const bench = getTeamBenchPlayers(this.team);
    const pages = Math.max(1, Math.ceil(bench.length / PAGE_SIZE));
    this.page = Math.min(this.page, pages - 1);
    new UIRoundedRectangle(this, 195, 712, 366, 136, UI.colors.panelDark, 0.96)
      .setStrokeStyle(1, UI.colors.outline);
    this.add.text(26, 668, t("squad.bench"), { font: UI.font.subtitle, color: UI.colors.text }).setOrigin(0, 0.5);
    if (pages > 1) {
      this.controls.push(new UIButton(this, 330, 668, 64, 32, `${this.page + 1} / ${pages} ›`, () => {
        if (this.recruitment) return;
        this.page = (this.page + 1) % pages;
        this.renderScene();
      }, { fontSize: 12 }));
    }
    const visible = bench.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    visible.forEach((player, index) => {
      const x = 55 + index * 70;
      new UIRoundedRectangle(this, x, 732, 62, 76, UI.colors.panelRaised, 0.65)
        .setStrokeStyle(1, UI.colors.outline);
      this.renderPlayer(player, x, 762, true, 70);
      // Bordure au-dessus du portrait, dont le masque suit l'intérieur arrondi.
      new UIRoundedRectangle(this, x, 732, 62, 76, UI.colors.panelRaised, 0)
        .setStrokeStyle(1, UI.colors.outline).setDepth(764);
    });
    this.recruitButton = new UIButton(this, 55 + visible.length * 70, 732, 62, 76,
      "", () => this.openRecruitment(), { icon: "recruit", accessibleLabel: t("squad.recruit") });
    this.controls.push(this.recruitButton);
    coachControl(this.recruitButton, "team.recruit", "recruit.open");
    const tutorial = GameStore.getCoachTutorial();
    if (tutorial && tutorial.matchesCompleted < LINEOUT_BALANCE.tutorial.recruitmentAfterMatches) this.recruitButton.setEnabled(false);
  }

  private movePlayer(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id) return;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (!drag.moved && Phaser.Math.Distance.Between(point.x, point.y, drag.startX, drag.startY) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      // Le joueur doit pouvoir sortir de sa carte pendant l'échange.
      drag.token.view.clearMask();
      this.controls.forEach((button) => button.setEnabled(false));
      this.inspector?.setVisible(false);
      this.inspectedId = undefined;
    }
    drag.token.view.setPosition(drag.token.homeX + point.x - drag.startX, drag.token.homeY + point.y - drag.startY)
      .setDepth(1200);
    this.overview?.showTrash(this.overview.containsPoint(point.x, point.y));
    this.dropHighlight?.destroy();
    this.dropHighlight = undefined;
    const target = this.findDropTarget(point.x, point.y, drag.token);
    if (target) {
      this.dropHighlight = this.add.ellipse(target.homeX, target.homeY - target.height * 0.43, 70, target.height * 0.9)
        .setStrokeStyle(3, UI.colors.accent).setDepth(1100);
    }
  }

  private findDropTarget(x: number, y: number, source: SquadToken): SquadToken | undefined {
    return this.tokens.find((target) => target !== source && !(target.reserve && source.reserve)
      && target.player.role === source.player.role && target.hit.getBounds().contains(x, y));
  }

  private releasePlayer(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id) return;
    this.drag = undefined;
    this.controls.forEach((button) => button.setEnabled(true));
    this.dropHighlight?.destroy();
    this.dropHighlight = undefined;
    if (!drag.moved) { this.inspectPlayer(drag.token.player); return; }
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.overview?.containsPoint(point.x, point.y)) {
      const result = removeSquadPlayer(this.team, drag.token.player.id);
      if (!result.error) GameStore.setPlayerTeam(result.team);
      this.renderScene();
      if (result.error) this.overview?.showError(t(`squad.removeError.${result.error}`));
      return;
    }
    this.overview?.showOverview();
    const target = this.findDropTarget(point.x, point.y, drag.token);
    if (target) {
      const tutorial = GameStore.getCoachTutorial();
      if (tutorial?.firstRecruitId === drag.token.player.id && !target.reserve
        && target.player.id === getCoachRecruitmentTarget(this.team).id) coachAction(this, "recruit.swap");
      GameStore.setPlayerTeam(exchangeSquadPlayers(this.team, drag.token.player.id, target.player.id));
      this.renderScene();
      return;
    }
    drag.token.view.setPosition(drag.token.homeX, drag.token.homeY).setDepth(drag.token.homeY);
    if (drag.token.benchMask) drag.token.view.setMask(drag.token.benchMask);
  }

  private inspectPlayer(player: Player): void {
    if (this.inspectedId === player.id) {
      this.inspectedId = undefined;
      this.inspector?.setVisible(false);
      this.overview?.showOverview();
      return;
    }
    this.inspectedId = player.id;
    this.overview?.setVisible(false);
    const roles = player.role === "hooker" ? [t("lineout.hookerLabel")] : [
      ...(canBeLineoutJumper(player) ? [t("lineout.role.jumper")] : []),
      ...(canBeLineoutLifter(player) ? [t("lineout.role.lifter")] : [])
    ];
    this.inspector?.setPlayerData({
      name: getTeamBenchPlayers(this.team).some((reserve) => reserve.id === player.id)
        ? player.nickname : `${t("team.numberPrefix")}${player.number} · ${player.nickname}`,
      role: roles.join(" • "), colors: this.team.colors,
      stats: player.role === "hooker" ? [{ label: t("team.throwing"), value: player.throwing }] : [
        { label: t("team.stat.speed"), value: player.speed },
        { label: t("team.stat.strength"), value: player.strength },
        { label: t("team.stat.technique"), value: player.technique }
      ]
    });
    this.inspector?.setVisible(true);
    if (player.id === getCoachRecruitmentTarget(this.team).id) coachAction(this, "inspect.recruitTarget");
  }

  private openRecruitment(): void {
    const tutorial = GameStore.getCoachTutorial();
    if (tutorial && tutorial.matchesCompleted < LINEOUT_BALANCE.tutorial.recruitmentAfterMatches) return;
    if (this.recruitment) { this.recruitment.toggleClose(); return; }
    this.combinations?.destroy();
    this.combinations = undefined;
    const existingIds = new Set(getTeamBenchPlayers(this.team).map((player) => player.id));
    this.inspector?.setVisible(false);
    this.inspectedId = undefined;
    this.recruitment = new RecruitmentOverlay(this, () => {
      const bench = getTeamBenchPlayers(GameStore.getSave().playerTeam);
      const addedIndex = bench.findIndex((player) => !existingIds.has(player.id));
      if (addedIndex >= 0) this.page = Math.floor(addedIndex / PAGE_SIZE);
      this.renderScene();
    });
    this.add.rectangle(195, 422, 390, 844, UI.colors.scrim, 0.64)
      .setDepth(UI_DEPTH.overlayBackdrop).setInteractive();
    this.recruitButton?.setDepth(UI_DEPTH.overlayContent + 1);
  }

  private travelPositions(): SquadTravelPosition[] {
    return this.tokens.filter((token) => !token.reserve).map((token) => ({
      id: token.player.id, x: token.view.x, y: token.view.y
    }));
  }

  private openCombinations(): void {
    if (this.recruitment) this.recruitment.toggleClose();
    if (this.combinations) { this.combinations.destroy(); this.combinations = undefined; return; }
    const save = GameStore.getSave();
    const activeCombinations = getActiveOffensiveCombinations(save.offensiveCombinations, save.offensiveRepertoire);
    const close = (): void => { this.combinations?.destroy(); this.combinations = undefined; };
    this.combinations = new CombinationListOverlay(this, {
      combinations: activeCombinations.length ? activeCombinations : getAvailableOffensiveCombinations(
        save.offensiveCombinations, getDivision(save.currentDivisionId).offensiveCombinations),
      initialTab: "attack", selectedCombinationId: "", selectedDefensiveSize: 7,
      onClose: close,
      onRename: (id, name) => {
        GameStore.setOffensiveCombinations(renameCombination(GameStore.getSave().offensiveCombinations, id, name));
        close(); this.openCombinations();
      },
      onSelectCombination: (combinationId) => navigateTo(this, "LineoutScene", {
        mode: "training", trainingMode: "edit", combinationId, squadTravel: this.travelPositions()
      }),
      onSelectDefensiveSize: (defensiveSize) => navigateTo(this, "LineoutScene", {
        mode: "training", trainingMode: "defense-edit", defensiveSize, squadTravel: this.travelPositions()
      })
    }).setDepth(UI_DEPTH.overlayBackdrop);
    this.inspector?.setVisible(false);
    this.inspectedId = undefined;
    this.overview?.showOverview();
  }
}
