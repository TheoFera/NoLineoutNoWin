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
  const mirror = appearance.terrainSeed % 2 === 0 ? 1 : -1;
  const toX = (ratio: number): number => left + width * (mirror === 1 ? ratio : 1 - ratio);
  const toY = (ratio: number): number => top + height * ratio;
  const pixel = Math.max(1, Math.round(Math.min(scaleX, scaleY) * 3));

  if (appearance.decoration === "mud") {
    drawPixelPatch(graphics, toX(0.16), toY(0.29), pixel, 0x4b3525, 0.48);
    drawPixelPatch(graphics, toX(0.74), toY(0.65), pixel, 0x3f2f23, 0.4);
    drawPixelPatch(graphics, toX(0.38), toY(0.82), pixel, 0x493123, 0.34);
    drawBootMarks(graphics, toX(0.56), toY(0.46), pixel, 0x553b28, 0.42, mirror);
    return;
  }

  if (appearance.decoration === "worn") {
    graphics.fillStyle(0x9b8b52, 0.25);
    graphics.fillRect(toX(0.46), toY(0.18), pixel * 7, height * 0.64);
    graphics.fillRect(toX(0.62), toY(0.26), pixel * 4, height * 0.42);
    drawPixelPatch(graphics, toX(0.31), toY(0.72), pixel, 0x756239, 0.34);
    drawBootMarks(graphics, toX(0.7), toY(0.32), pixel, 0x6c5932, 0.28, -mirror);
    return;
  }

  if (appearance.decoration === "lush") {
    graphics.fillStyle(0x064e3b, 0.09);
    for (let stripe = 0; stripe < 5; stripe += 1) {
      graphics.fillRect(left, top + height * (0.08 + stripe * 0.2), width, height * 0.08);
    }
    graphics.fillStyle(0x86c95f, 0.24);
    graphics.fillRect(toX(0.2), toY(0.36), pixel * 2, pixel * 4);
    graphics.fillRect(toX(0.8), toY(0.58), pixel * 3, pixel * 5);
    graphics.fillRect(toX(0.47), toY(0.78), pixel * 2, pixel * 3);
    return;
  }

  graphics.fillStyle(0xc7b36a, 0.3);
  graphics.fillRect(toX(0.12), toY(0.16), pixel * 10, pixel * 5);
  graphics.fillRect(toX(0.71), toY(0.52), pixel * 13, pixel * 7);
  graphics.fillRect(toX(0.38), toY(0.81), pixel * 7, pixel * 4);
  graphics.fillStyle(0xe3cd83, 0.26);
  graphics.fillRect(toX(0.76), toY(0.55), pixel * 6, pixel * 2);
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

  const graphics = scene.add.graphics();
  const pixel = Math.max(1, Math.round(Math.min(width / SCREEN_WIDTH, height / SCREEN_HEIGHT) * 2));
  let state = appearance.weatherSeed;
  graphics.fillStyle(0xcde8f4, 0.34);
  for (let index = 0; index < 22; index += 1) {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    const x = left + pixel * 2 + (state % Math.max(1, Math.floor(width - pixel * 5)));
    state = Math.imul(state ^ (state >>> 13), 3266489917) >>> 0;
    const y = top + pixel * 2 + (state % Math.max(1, Math.floor(height - pixel * 8)));
    graphics.fillRect(x, y, pixel, pixel * 3);
    graphics.fillRect(x + pixel, y + pixel * 3, pixel, pixel * 3);
  }
}

function drawPixelPatch(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  pixel: number,
  color: number,
  alpha: number
): void {
  graphics.fillStyle(color, alpha);
  graphics.fillRect(x, y, pixel * 8, pixel * 3);
  graphics.fillRect(x + pixel * 2, y - pixel * 2, pixel * 9, pixel * 7);
  graphics.fillRect(x + pixel * 7, y + pixel * 4, pixel * 6, pixel * 3);
  graphics.fillStyle(0x2b211a, alpha * 0.55);
  graphics.fillRect(x + pixel * 4, y, pixel * 5, pixel * 2);
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
