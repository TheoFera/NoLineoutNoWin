export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const PLAYER_VISUAL_SCALE = 1.1;

// Taille commune à l'entraînement et au gestionnaire du groupe touche.
export const TRAINING_PLAYER_SIZE = {
  width: Math.round(GAME_WIDTH * 0.125 * PLAYER_VISUAL_SCALE),
  height: Math.round(GAME_HEIGHT * 0.14 * PLAYER_VISUAL_SCALE)
} as const;
