import type { JerseyColors } from "../models/Team";

export const JERSEY_COLOR_SIMILARITY_THRESHOLD = 100;

export function areJerseyColorsTooSimilar(firstColor: number, secondColor: number): boolean {
  const redDifference = getRed(firstColor) - getRed(secondColor);
  const greenDifference = getGreen(firstColor) - getGreen(secondColor);
  const blueDifference = getBlue(firstColor) - getBlue(secondColor);
  const distanceSquared = redDifference ** 2 + greenDifference ** 2 + blueDifference ** 2;

  return distanceSquared <= JERSEY_COLOR_SIMILARITY_THRESHOLD ** 2;
}

export function getContrastingOpponentColors(
  playerColors: JerseyColors,
  opponentColors: JerseyColors
): JerseyColors {
  if (!areJerseyColorsTooSimilar(playerColors.primary, opponentColors.primary)) {
    return { ...opponentColors };
  }

  return {
    primary: opponentColors.secondary,
    secondary: opponentColors.primary
  };
}

function getRed(color: number): number {
  return (color >> 16) & 0xff;
}

function getGreen(color: number): number {
  return (color >> 8) & 0xff;
}

function getBlue(color: number): number {
  return color & 0xff;
}
