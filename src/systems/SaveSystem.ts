import type { SaveGame, StoredSaveGame } from "../models/SaveGame";

const SAVE_KEY = "no-lineout-no-win.save.v1";

export function saveGame(data: SaveGame): void {
  const updated: SaveGame = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
}

export function loadGame(): StoredSaveGame | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSaveGame;
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
