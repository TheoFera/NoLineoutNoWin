import type { SaveGame, StoredSaveGame } from "../models/SaveGame";
import type { TutorialState } from "../models/TutorialState";

const SAVE_KEY = "no-lineout-no-win.save.v1";
const TUTORIAL_KEY = "no-lineout-no-win.tutorial.v1";
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

// L'introduction et son réglage existent avant la création de la sauvegarde du club.
export function loadTutorialState(): TutorialState {
  const defaults: TutorialState = { enabled: true, introductionSeen: false };
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<TutorialState> | null;
    return {
      enabled: stored?.enabled !== false,
      introductionSeen: stored?.introductionSeen === true
    };
  } catch {
    return defaults;
  }
}

export function saveTutorialState(state: TutorialState): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(state));
  } catch {
    // Le tutoriel reste utilisable pour cette session si le stockage est indisponible.
  }
}
