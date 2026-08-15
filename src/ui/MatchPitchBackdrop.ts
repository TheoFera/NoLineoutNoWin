import Phaser from "phaser";

export const MATCH_PITCH_TEXTURE_KEY = "lineout-pitch-background";

const MATCH_PITCH_TEXTURE_PATH = "assets/images/lineout-pitch-training.png";
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;

type PitchDecoration = "clean" | "mud" | "worn" | "lush" | "dry";
export type MatchWeather = "clear" | "overcast" | "rain";

export type MatchPitchAppearance = {
  tint: number;
  terrainOverlayColor: number;
  terrainOverlayAlpha: number;
  decoration: PitchDecoration;
  terrainSeed: number;
  weather: MatchWeather;
  weatherSeed: number;
};

const HOME_PITCH_APPEARANCE: MatchPitchAppearance = {
  tint: 0xffffff,
  terrainOverlayColor: 0xffffff,
  terrainOverlayAlpha: 0,
  decoration: "clean",
  terrainSeed: 0,
  weather: "clear",
  weatherSeed: 0
};

export const MATCH_WEATHER_PROBABILITIES: Readonly<Record<MatchWeather, number>> = {
  clear: 50,
  overcast: 30,
  rain: 20
};

const AWAY_PITCHES: ReadonlyArray<Pick<
  MatchPitchAppearance,
  "tint" | "terrainOverlayColor" | "terrainOverlayAlpha" | "decoration"
>> = [
  {
    tint: 0xb4d9aa,
    terrainOverlayColor: 0x4a3927,
    terrainOverlayAlpha: 0.12,
    decoration: "mud"
  },
  {
    tint: 0xd3ca82,
    terrainOverlayColor: 0x8a7438,
    terrainOverlayAlpha: 0.1,
    decoration: "worn"
  },
  {
    tint: 0x9cddb4,
    terrainOverlayColor: 0x0f5f3a,
    terrainOverlayAlpha: 0.1,
    decoration: "lush"
  },
  {
    tint: 0xd8b76b,
    terrainOverlayColor: 0x9a7132,
    terrainOverlayAlpha: 0.13,
    decoration: "dry"
  }
];

export function getMatchPitchAppearance(
  venueTeamId: string,
  matchId: string,
  isPlayerHomeMatch: boolean
): MatchPitchAppearance {
  const terrainSeed = hashString(`terrain:${venueTeamId}`);
  const terrain = isPlayerHomeMatch
    ? HOME_PITCH_APPEARANCE
    : AWAY_PITCHES[terrainSeed % AWAY_PITCHES.length];
  const weatherSeed = hashString(`meteo:${matchId}`);
  return {
    tint: terrain.tint,
    terrainOverlayColor: terrain.terrainOverlayColor,
    terrainOverlayAlpha: terrain.terrainOverlayAlpha,
    decoration: terrain.decoration,
    terrainSeed,
    weather: getWeatherForRoll(weatherSeed % 100),
    weatherSeed
  };
}

export function getTrainingPitchAppearance(): MatchPitchAppearance {
  return HOME_PITCH_APPEARANCE;
}

function getWeatherForRoll(roll: number): MatchWeather {
  if (roll < MATCH_WEATHER_PROBABILITIES.clear) return "clear";
  if (roll < MATCH_WEATHER_PROBABILITIES.clear + MATCH_WEATHER_PROBABILITIES.overcast) {
    return "overcast";
  }
  return "rain";
}

export function preloadMatchPitchBackdrop(scene: Phaser.Scene): void {
  if (!scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.load.image(MATCH_PITCH_TEXTURE_KEY, MATCH_PITCH_TEXTURE_PATH);
  }
}

export function renderMatchPitchBackdrop(
  scene: Phaser.Scene,
  overlayAlpha: number,
  appearance: MatchPitchAppearance = HOME_PITCH_APPEARANCE
): void {
  scene.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x09131c);

  if (scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, MATCH_PITCH_TEXTURE_KEY)
      .setDisplaySize(SCREEN_WIDTH, SCREEN_HEIGHT)
      .setTint(appearance.tint);
  }

  renderTerrainColorWash(scene, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, appearance);
  renderPitchDecorations(scene, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, appearance);

  scene.add.rectangle(
    SCREEN_WIDTH / 2,
    SCREEN_HEIGHT / 2,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    0x020617,
    overlayAlpha
  );
  renderWeatherEffects(scene, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, appearance);
}

export function renderPitchSurface(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  appearance: MatchPitchAppearance = HOME_PITCH_APPEARANCE
): void {
  if (scene.textures.exists(MATCH_PITCH_TEXTURE_KEY)) {
    scene.add.image(x, y, MATCH_PITCH_TEXTURE_KEY)
      .setDisplaySize(width, height)
      .setTint(appearance.tint);
  } else {
    scene.add.rectangle(x, y, width, height, 0x1f6d45);
  }

  renderTerrainColorWash(scene, x - width / 2, y - height / 2, width, height, appearance);
  renderPitchDecorations(scene, x - width / 2, y - height / 2, width, height, appearance);
  renderWeatherEffects(scene, x - width / 2, y - height / 2, width, height, appearance);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function renderTerrainColorWash(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number,
  appearance: MatchPitchAppearance
): void {
  if (appearance.terrainOverlayAlpha <= 0) return;
  scene.add.rectangle(
    left + width / 2,
    top + height / 2,
    width,
    height,
    appearance.terrainOverlayColor,
    appearance.terrainOverlayAlpha
  );
}

function renderPitchDecorations(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number,
  appearance: MatchPitchAppearance
): void {
  if (appearance.decoration === "clean") return;

  const graphics = scene.add.graphics();
  const scaleX = width / SCREEN_WIDTH;
  const scaleY = height / SCREEN_HEIGHT;
  const pixel = Math.max(1, Math.round(Math.min(scaleX, scaleY) * 2));
  const random = createSeededRandom(appearance.terrainSeed);
  const randomX = (): number => left + width * (0.1 + random() * 0.8);
  const randomY = (): number => top + height * (0.08 + random() * 0.84);

  if (appearance.decoration === "mud") {
    for (let index = 0; index < 4; index += 1) {
      drawScatteredPixelPatch(
        graphics,
        randomX(),
        randomY(),
        width * (0.035 + random() * 0.03),
        height * (0.012 + random() * 0.014),
        pixel,
        [0x33251b, 0x4b3525, 0x62452d],
        0.34 + random() * 0.12,
        18 + Math.floor(random() * 10),
        random
      );
    }
    drawBootMarks(
      graphics,
      randomX(),
      randomY(),
      pixel,
      0x553b28,
      0.38,
      random() < 0.5 ? -1 : 1
    );
    return;
  }

  if (appearance.decoration === "worn") {
    for (let index = 0; index < 2; index += 1) {
      drawScatteredPixelPatch(
        graphics,
        randomX(),
        randomY(),
        width * (0.018 + random() * 0.015),
        height * (0.16 + random() * 0.08),
        pixel,
        [0x756239, 0x8c7744, 0xa18d52],
        0.24,
        52,
        random
      );
    }
    drawScatteredPixelPatch(
      graphics,
      randomX(),
      randomY(),
      width * 0.055,
      height * 0.025,
      pixel,
      [0x695633, 0x806c3e, 0xa08a50],
      0.32,
      25,
      random
    );
    drawBootMarks(
      graphics,
      randomX(),
      randomY(),
      pixel,
      0x6c5932,
      0.3,
      random() < 0.5 ? -1 : 1
    );
    return;
  }

  if (appearance.decoration === "lush") {
    for (let stripe = 0; stripe < 5; stripe += 1) {
      drawBrokenPixelBand(
        graphics,
        left,
        top + height * (0.08 + stripe * 0.2 + random() * 0.025),
        width,
        pixel,
        stripe % 2 === 0 ? 0x064e3b : 0x7dbb57,
        0.09,
        random
      );
    }
    for (let index = 0; index < 5; index += 1) {
      drawScatteredPixelPatch(
        graphics,
        randomX(),
        randomY(),
        width * 0.018,
        height * 0.012,
        pixel,
        [0x3f8f4d, 0x72b957, 0x91c968],
        0.22,
        8,
        random
      );
    }
    return;
  }

  for (let index = 0; index < 5; index += 1) {
    drawScatteredPixelPatch(
      graphics,
      randomX(),
      randomY(),
      width * (0.03 + random() * 0.035),
      height * (0.012 + random() * 0.018),
      pixel,
      [0xb99d55, 0xc7b36a, 0xe3cd83],
      0.25 + random() * 0.08,
      16 + Math.floor(random() * 14),
      random
    );
  }
}

function renderWeatherEffects(
  scene: Phaser.Scene,
  left: number,
  top: number,
  width: number,
  height: number,
  appearance: MatchPitchAppearance
): void {
  if (appearance.weather === "clear") {
    scene.add.rectangle(left + width / 2, top + height / 2, width, height, 0xf7d794, 0.035);
    return;
  }

  const overlayColor = appearance.weather === "rain" ? 0x21394c : 0x536878;
  const overlayAlpha = appearance.weather === "rain" ? 0.2 : 0.12;
  scene.add.rectangle(left + width / 2, top + height / 2, width, height, overlayColor, overlayAlpha);
  if (appearance.weather !== "rain") return;

  const pixel = Math.max(1, Math.round(Math.min(width / SCREEN_WIDTH, height / SCREEN_HEIGHT) * 2));
  let state = appearance.weatherSeed;
  const nextRandom = (): number => {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    return state / 0xffffffff;
  };
  for (let index = 0; index < 22; index += 1) {
    const drop = scene.add.graphics();
    drop.fillStyle(0xcde8f4, 0.42);
    drop.fillRect(0, 0, pixel, pixel * 3);
    drop.fillRect(pixel, pixel * 3, pixel, pixel * 3);
    drop.setPosition(
      left + pixel * 2 + nextRandom() * Math.max(1, width - pixel * 7),
      top + nextRandom() * Math.max(1, height - pixel * 7)
    );
    animateRainDrop(scene, drop, left, top, width, height, pixel, nextRandom);
  }
}

function animateRainDrop(
  scene: Phaser.Scene,
  drop: Phaser.GameObjects.Graphics,
  left: number,
  top: number,
  width: number,
  height: number,
  pixel: number,
  nextRandom: () => number
): void {
  const bottomY = top + height - pixel * 6;
  const remainingRatio = Phaser.Math.Clamp((bottomY - drop.y) / Math.max(1, height), 0.08, 1);
  const fullDurationMs = 620 + nextRandom() * 360;
  const horizontalDrift = pixel * (3 + nextRandom() * 4);
  scene.tweens.add({
    targets: drop,
    x: Phaser.Math.Clamp(drop.x + horizontalDrift, left + pixel, left + width - pixel * 3),
    y: bottomY,
    duration: fullDurationMs * remainingRatio,
    ease: "Linear",
    onComplete: () => {
      if (!drop.active || !scene.sys.isActive()) return;
      drop.setPosition(
        left + pixel + nextRandom() * Math.max(1, width - pixel * 5),
        top
      );
      animateRainDrop(scene, drop, left, top, width, height, pixel, nextRandom);
    }
  });
}

function createSeededRandom(seed: number): () => number {
  let state = (seed ^ 0x9e3779b9) >>> 0 || 1;
  return (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

function drawScatteredPixelPatch(
  graphics: Phaser.GameObjects.Graphics,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  pixel: number,
  colors: readonly number[],
  alpha: number,
  count: number,
  random: () => number
): void {
  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random());
    const x = Math.round((centerX + Math.cos(angle) * radiusX * distance) / pixel) * pixel;
    const y = Math.round((centerY + Math.sin(angle) * radiusY * distance) / pixel) * pixel;
    const size = random() < 0.78 ? 1 : 2;
    graphics.fillStyle(
      colors[Math.floor(random() * colors.length)],
      alpha * (0.62 + random() * 0.38)
    );
    graphics.fillRect(x, y, pixel * size, pixel * (random() < 0.86 ? 1 : 2));
  }
}

function drawBrokenPixelBand(
  graphics: Phaser.GameObjects.Graphics,
  left: number,
  y: number,
  width: number,
  pixel: number,
  color: number,
  alpha: number,
  random: () => number
): void {
  let x = left + random() * pixel * 4;
  while (x < left + width) {
    const segmentWidth = pixel * (2 + Math.floor(random() * 5));
    graphics.fillStyle(color, alpha * (0.55 + random() * 0.45));
    graphics.fillRect(x, y + Math.round((random() - 0.5) * pixel * 2), segmentWidth, pixel);
    x += segmentWidth + pixel * (2 + Math.floor(random() * 5));
  }
}

function drawBootMarks(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  pixel: number,
  color: number,
  alpha: number,
  direction: number
): void {
  graphics.fillStyle(color, alpha);
  for (let index = 0; index < 4; index += 1) {
    graphics.fillRect(
      x + direction * index * pixel * 4,
      y + index * pixel * 5,
      pixel * 2,
      pixel * 4
    );
  }
}
