import type { SaveGame, StoredSaveGame } from "../models/SaveGame";

const SAVE_KEY = "no-lineout-no-win.save.v1";
let persistenceSuspended = false;

export function setSavePersistenceSuspended(suspended: boolean): void {
  persistenceSuspended = suspended;
}

export function saveGame(data: SaveGame): void {
  if (persistenceSuspended) return;

  const updated: SaveGame = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(updated));
}

export function loadGame(): StoredSaveGame | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredSaveGame;
    if (parsed.version !== 6) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  if (persistenceSuspended) return;

  localStorage.removeItem(SAVE_KEY);
}
