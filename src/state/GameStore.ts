import type { SaveGame } from "../models/SaveGame";
import type { MatchStateData } from "../models/Match";
import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import { createDefaultPlayerTeam } from "../rules/TeamFactory";
import { t } from "../systems/I18n";
import { loadGame, saveGame } from "../systems/SaveSystem";

export class GameStore {
  private static save: SaveGame | null = null;
  private static match: MatchStateData | null = null;

  static boot(): void {
    this.save = loadGame();
  }

  static hasSave(): boolean {
    return this.save !== null;
  }

  static getSave(): SaveGame {
    if (!this.save) {
      this.createNewSave(t("club.defaultName"));
    }
    return this.save as SaveGame;
  }

  static createNewSave(clubName: string): SaveGame {
    const now = new Date().toISOString();
    const team = createDefaultPlayerTeam(clubName);
    const save: SaveGame = {
      version: 1,
      language: "fr",
      currentDivisionId: "regionale_3",
      season: 1,
      playerTeam: team,
      offensiveCombinations: DEFAULT_COMBINATIONS,
      defensivePriority: team.lineoutPlayers.map((player) => player.id),
      defenseMemory: {},
      createdAt: now,
      updatedAt: now
    };
    this.save = save;
    saveGame(save);
    return save;
  }

  static persist(): void {
    if (this.save) saveGame(this.save);
  }

  static setMatch(match: MatchStateData): void {
    this.match = match;
  }

  static clearMatch(): void {
    this.match = null;
  }

  static getMatch(): MatchStateData | null {
    return this.match;
  }
}
