import Phaser from "phaser";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { GAME_HEIGHT, GAME_WIDTH } from "../config/DisplayConfig";
import { UI_DEPTH } from "./UIDepth";
import { UI } from "./UITheme";

export class LineoutResultPulse extends Phaser.GameObjects.Graphics {
  constructor(scene: Phaser.Scene, won: boolean) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(UI_DEPTH.overlayContent + 1).setAlpha(0);
    const { edgeWidthPixels, edgeOpacity, edgeFalloffExponent } = LINEOUT_BALANCE.gameplayV3.resultFeedback;
    const color = won ? UI.colors.success : UI.colors.danger;

    // Des bandes de plus en plus transparentes laissent le centre du terrain libre.
    // Les coins sont dessinés une seule fois pour conserver une luminosité uniforme.
    for (let inset = 0; inset < edgeWidthPixels; inset += 1) {
      const opacity = edgeOpacity * Math.pow(1 - inset / edgeWidthPixels, edgeFalloffExponent);
      const width = GAME_WIDTH - inset * 2;
      const height = GAME_HEIGHT - inset * 2 - 2;
      this.fillStyle(color, opacity);
      this.fillRect(inset, inset, width, 1);
      this.fillRect(inset, GAME_HEIGHT - inset - 1, width, 1);
      this.fillRect(inset, inset + 1, 1, height);
      this.fillRect(GAME_WIDTH - inset - 1, inset + 1, 1, height);
    }
  }

  play(onComplete: () => void): void {
    const timing = LINEOUT_BALANCE.gameplayV3.resultFeedback;
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: timing.riseDurationMs,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          delay: timing.holdDurationMs,
          duration: timing.fadeDurationMs,
          ease: "Sine.easeInOut",
          onComplete
        });
      }
    });
  }
}
