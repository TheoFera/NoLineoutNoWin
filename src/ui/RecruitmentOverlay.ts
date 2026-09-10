import Phaser from "phaser";
import { GameStore } from "../state/GameStore";
import { acceptRecruit, generateRecruitmentWheel, getRecruitmentProfile } from "../rules/RecruitmentRules";
import { MATH_RANDOM_SOURCE, randomFloat } from "../utils/Random";
import { t } from "../systems/I18n";
import { UI } from "./UITheme";
import { UIButton } from "./UIButton";
import { UIRoundedRectangle } from "./UIRoundedRectangle";
import { renderSquadPlayer, renderRecruitmentPortrait } from "./SquadPlayerView";
import { applyDomControlStyle } from "./DomControlStyle";
import { UI_DEPTH } from "./UIDepth";
import { PlayerStatsOverlay } from "./PlayerStatsOverlay";

export class RecruitmentOverlay extends Phaser.GameObjects.Container {
  private nameInput?: HTMLInputElement;
  private spin?: Phaser.Tweens.Tween;
  private revealTweens: Phaser.Tweens.Tween[] = [];
  private readonly resizeInput = (): void => {
    if (!this.nameInput) return;
    const bounds = this.scene.game.canvas.getBoundingClientRect();
    Object.assign(this.nameInput.style, {
      left: `${bounds.left + bounds.width * 45 / 390}px`, top: `${bounds.top + bounds.height * 425 / 844}px`,
      width: `${bounds.width * 300 / 390}px`, height: `${bounds.height * 44 / 844}px`,
      fontSize: `${18 * bounds.width / 390}px`
    });
  };

  constructor(scene: Phaser.Scene, private readonly onClose: () => void) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayPanel);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.once("destroy", () => {
      this.spin?.stop();
      this.revealTweens.forEach((tween) => tween.stop());
      this.nameInput?.remove();
      window.removeEventListener("resize", this.resizeInput);
      scene.scale.off("resize", this.resizeInput);
      scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    });
    if (GameStore.getSave().playerTeam.pendingRecruitment) this.renderResult();
    else this.renderWheel();
  }

  toggleClose(): void {
    const team = GameStore.getSave().playerTeam;
    if (team.pendingRecruitment && this.nameInput) {
      GameStore.setPlayerTeam({ ...team, pendingRecruitment: { ...team.pendingRecruitment,
        nickname: this.nameInput.value.trim().slice(0, 12) || team.pendingRecruitment.nickname } });
    }
    this.close();
  }

  private renderFrame(title: string, result = false): void {
    this.removeAll(true);
    // Le banc et le bouton de recrutement restent visibles et accessibles.
    this.add(this.scene.add.rectangle(195, 323, 390, 618, UI.colors.scrim, 0.25).setInteractive());
    this.add(new UIRoundedRectangle(this.scene, 195, 323, 366, 618, UI.colors.panelDark, 1)
      .setStrokeStyle(2, UI.colors.outline));
    this.text(195, result ? 56 : 43, title, result ? 19 : 23, 330);
  }

  private renderWheel(): void {
    this.renderFrame(t("recruit.title"));
    const team = GameStore.getSave().playerTeam;
    const offers = generateRecruitmentWheel(team, MATH_RANDOM_SOURCE);
    this.text(195, 83, t("recruit.hint"), 13, 310);
    const wheel = this.scene.add.container(195, 286);
    this.add(wheel);
    wheel.add(this.scene.add.circle(0, 0, 160, UI.colors.panelRaised).setStrokeStyle(4, UI.colors.outline));
    const colors = [UI.colors.accent, UI.colors.info, UI.colors.success, UI.colors.outline, UI.colors.warning, UI.colors.panelRaised];
    const chancePositions = [
      { x: 44, y: -126 }, { x: 123, y: -62 }, { x: 123, y: 62 },
      { x: 0, y: 145 }, { x: -123, y: 62 }, { x: -123, y: -62 }
    ];
    // Dessiner d'abord toutes les cases : aucun fond ne recouvre le portrait d'une case voisine.
    offers.forEach((_, index) => {
      const start = Phaser.Math.DegToRad(-120 + index * 60);
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(colors[index]).lineStyle(1.5, UI.colors.outlineStrong);
      graphics.slice(0, 0, 150, start, start + Math.PI / 3, false).fillPath().strokePath();
      wheel.add(graphics);
    });
    offers.forEach((offer, index) => {
      const start = Phaser.Math.DegToRad(-120 + index * 60);
      const end = start + Math.PI / 3;
      const mid = (start + end) / 2;
      const x = Math.cos(mid) * 91;
      const y = Math.sin(mid) * 91;
      wheel.add(renderRecruitmentPortrait(this.scene, x, y + 6, offer.player, team.colors));
      const stars = this.scene.add.text(x, y + 21, "★".repeat(offer.band + 1), {
        font: "bold 17px Arial", color: UI.colors.textAccent, stroke: UI.colors.textStroke, strokeThickness: 2
      }).setOrigin(0.5);
      const profile = this.scene.add.text(x, y + 38, t(`recruit.profile.${getRecruitmentProfile(offer.player)}`), {
        font: "bold 11px Arial", color: UI.colors.text, stroke: UI.colors.textStroke, strokeThickness: 2
      }).setOrigin(0.5);
      const chance = this.scene.add.text(chancePositions[index].x, chancePositions[index].y,
        `${Math.round(offer.probability * 100)} %`, { font: "bold 11px Arial", color: UI.colors.text,
          stroke: UI.colors.textStroke, strokeThickness: 2 }).setOrigin(0.5);
      wheel.add([stars, profile, chance]);
    });
    this.add(this.scene.add.circle(195, 286, 32, UI.colors.panelDark).setStrokeStyle(2, UI.colors.outlineStrong));
    const ball = this.scene.add.graphics({ x: 195, y: 286 });
    ball.fillStyle(UI.colors.paper).fillEllipse(0, 0, 25, 41);
    ball.lineStyle(2, UI.colors.panelDark).lineBetween(0, -14, 0, 14);
    for (const y of [-6, 0, 6]) ball.lineBetween(-4, y, 4, y);
    this.add(ball.setAngle(35));
    this.add(this.scene.add.triangle(195, 126, 0, 0, 26, 0, 13, 26, UI.colors.accent));
    const launch = new UIButton(this.scene, 195, 551, 314, 54, t("recruit.spin"), () => {
      launch.setEnabled(false);
      const roll = randomFloat(0, 1, MATH_RANDOM_SOURCE);
      let cumulative = 0;
      let selected = offers.length - 1;
      for (let index = 0; index < offers.length; index++) {
        cumulative += offers[index].probability;
        if (roll < cumulative) { selected = index; break; }
      }
      const offer = offers[selected];
      GameStore.setPlayerTeam({ ...GameStore.getSave().playerTeam,
        pendingRecruitment: offer.player, pendingRecruitmentBand: offer.band });
      this.spin = this.scene.tweens.add({ targets: wheel, angle: 1800 - selected * 60,
        duration: 3600, ease: "Cubic.easeOut", onComplete: () => {
          this.renderResult();
        }
      });
    }, { variant: "primary" });
    this.add(launch);
  }

  private renderResult(): void {
    const team = GameStore.getSave().playerTeam;
    const player = team.pendingRecruitment;
    if (!player) { this.close(); return; }
    this.renderFrame(t("recruit.result"), true);
    const band = Math.max(0, Math.min(2, team.pendingRecruitmentBand ?? 0));
    this.renderRevealGlow(band);
    const revealedPlayer = renderSquadPlayer(this.scene, 195, 303, player, team.colors, 185, undefined, false)
      .setAlpha(0).setScale(0.7);
    this.add(revealedPlayer);
    this.revealTweens.push(this.scene.tweens.add({ targets: revealedPlayer, alpha: 1, scale: 1,
      delay: 120, duration: 500 + band * 150, ease: "Back.easeOut" }));
    const stats = new PlayerStatsOverlay(this.scene, team.colors);
    stats.setPlayerData({ name: player.nickname, role: t(`recruit.profile.${getRecruitmentProfile(player)}`), colors: team.colors,
      stats: player.role === "hooker" ? [{ label: t("team.throwing"), value: player.throwing }] : [
        { label: t("team.stat.speed"), value: player.speed },
        { label: t("team.stat.strength"), value: player.strength },
        { label: t("team.stat.technique"), value: player.technique }
      ] });
    this.add(stats.setPosition(38, 329).setScale(314 / 354));
    this.createNameInput();
    this.add(new UIButton(this.scene, 195, 519, 300, 48, t("recruit.keep"), () => {
      GameStore.setPlayerTeam(acceptRecruit(GameStore.getSave().playerTeam, this.nameInput?.value));
      this.close();
    }, { variant: "primary" }));
    this.add(new UIButton(this.scene, 195, 583, 300, 44, t("recruit.decline"), () => {
      GameStore.setPlayerTeam({ ...GameStore.getSave().playerTeam,
        pendingRecruitment: undefined, pendingRecruitmentBand: undefined });
      this.close();
    }));
  }

  private createNameInput(): void {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 12;
    input.value = GameStore.getSave().playerTeam.pendingRecruitment?.nickname ?? "";
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.setAttribute("aria-label", t("recruit.playerName"));
    applyDomControlStyle(input);
    (this.scene.game.canvas.parentElement ?? document.body).appendChild(input);
    this.nameInput = input;
    window.addEventListener("resize", this.resizeInput);
    this.scene.scale.on("resize", this.resizeInput);
    this.resizeInput();
  }

  private renderRevealGlow(band: number): void {
    const glow = this.scene.add.graphics({ x: 195, y: 216 });
    for (let index = 0; index < 6 + band * 6; index++) {
      const angle = index * Math.PI * 2 / (6 + band * 6);
      glow.fillStyle(UI.colors.accent, 0.035 + band * 0.055);
      glow.fillTriangle(0, 0, Math.cos(angle) * 134, Math.sin(angle) * 100,
        Math.cos(angle + 0.22) * 134, Math.sin(angle + 0.22) * 100);
    }
    this.add(glow.setAlpha(0).setScale(0.45));
    this.revealTweens.push(this.scene.tweens.add({ targets: glow, alpha: 1, scale: 1,
      angle: 10 + band * 20, duration: 700 + band * 400, ease: "Sine.easeOut" }));
    const count = [8, 28, 64][band];
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const sparkle = this.scene.add.star(195, 216, 4, 2, 4 + band * 2,
        index % 3 === 0 ? UI.colors.paper : UI.colors.accent).setAlpha(0);
      this.add(sparkle);
      this.revealTweens.push(this.scene.tweens.add({ targets: sparkle,
        x: 195 + Math.cos(angle) * (75 + band * 20 + index % 4 * 5),
        y: 216 + Math.sin(angle) * 86 + 12, angle: 160 + index * 13,
        alpha: { from: 1, to: 0 }, scale: { from: 0.4, to: 1.3 },
        delay: 100 + index % (4 + band * 4) * 65,
        duration: 650 + band * 450 + index % 3 * 150, ease: "Cubic.easeOut",
        onComplete: () => sparkle.destroy() }));
    }
  }

  private close(): void { this.destroy(); this.onClose(); }

  private text(x: number, y: number, value: string, size: number, width = 320): void {
    this.add(this.scene.add.text(x, y, value, {
      font: `bold ${size}px Arial`, color: UI.colors.text, align: "center", wordWrap: { width }
    }).setOrigin(0.5));
  }
}
