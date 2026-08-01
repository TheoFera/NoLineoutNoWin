import Phaser from "phaser";

const REFEREE_WHISTLE_KEY = "referee-whistle";
const REFEREE_WHISTLE_URL = "whistle.mp3";

let fallbackWhistle: HTMLAudioElement | undefined;

export function playClick(scene: Phaser.Scene): void {
  // À remplacer par un vrai son quand assets/sounds/click.mp3 existe.
  scene.sound.stopByKey("click");
}

export function prepareGameAudio(scene: Phaser.Scene): void {
  const soundManager = scene.sound;
  if (
    soundManager instanceof Phaser.Sound.WebAudioSoundManager
    && soundManager.context.state !== "running"
  ) {
    void soundManager.context.resume().catch(() => undefined);
  }
}

export function playRefereeWhistle(scene: Phaser.Scene): void {
  const soundManager = scene.sound;
  const play = () => {
    if (!scene.cache.audio.exists(REFEREE_WHISTLE_KEY)) {
      playFallbackWhistle();
      return;
    }

    soundManager.stopByKey(REFEREE_WHISTLE_KEY);
    if (!soundManager.play(REFEREE_WHISTLE_KEY, { volume: 1 })) {
      playFallbackWhistle();
    }
  };

  if (
    soundManager instanceof Phaser.Sound.WebAudioSoundManager
    && soundManager.context.state !== "running"
  ) {
    void soundManager.context.resume().then(play).catch(playFallbackWhistle);
    return;
  }

  play();
}

function playFallbackWhistle(): void {
  fallbackWhistle ??= new Audio(REFEREE_WHISTLE_URL);
  fallbackWhistle.currentTime = 0;
  fallbackWhistle.volume = 1;
  void fallbackWhistle.play().catch(() => undefined);
}
