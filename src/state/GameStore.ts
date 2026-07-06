import type { SaveGame } from "../models/SaveGame";
import type { MatchStateData } from "../models/Match";
import type { Team } from "../models/Team";
import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import type { Combination } from "../models/Combination";
import { normalizeOffensiveCombinations } from "../rules/CombinationRules";
import { applyMatchToChampionship, createChampionshipState, normalizeChampionshipState } from "../rules/ChampionshipRules";
import { applyPlayerProgression } from "../rules/PlayerProgression";
import { createDefaultPlayerTeam, DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, normalizeTeam } from "../rules/TeamFactory";
import { normalizeDefenseMemory, normalizeDefensivePriority } from "../rules/DefenseSelection";
import { getLanguage, t } from "../systems/I18n";
import { clearSave, loadGame, saveGame } from "../systems/SaveSystem";

type StoredSaveGame = Omit<SaveGame, "playerTeam"> & {
  playerTeam: Parameters<typeof normalizeTeam>[0];
};

export class GameStore {
  private static save: SaveGame | null = null;
  private static match: MatchStateData | null = null;

  static boot(): void {
    const loaded = loadGame() as StoredSaveGame | null;
    if (!loaded) {
      this.save = null;
      return;
    }

    this.save = this.normalizeSave(loaded);
    saveGame(this.save);
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

  static createNewSave(
    clubName: string,
    primaryColor = DEFAULT_PRIMARY_COLOR,
    secondaryColor = DEFAULT_SECONDARY_COLOR
  ): SaveGame {
    const now = new Date().toISOString();
    const team = createDefaultPlayerTeam(clubName, { primary: primaryColor, secondary: secondaryColor });
    const save: SaveGame = {
      version: 1,
      language: getLanguage(),
      currentDivisionId: "regionale_3",
      season: 1,
      playerTeam: team,
      championship: createChampionshipState("regionale_3", 1, team.name),
      offensiveCombinations: normalizeOffensiveCombinations(DEFAULT_COMBINATIONS),
      defensivePriority: normalizeDefensivePriority([], team),
      defenseMemory: {},
      createdAt: now,
      updatedAt: now
    };
    this.save = save;
    saveGame(save);
    return save;
  }

  static resetSave(): void {
    this.save = null;
    this.match = null;
    clearSave();
  }

  static setPlayerTeam(team: Team): void {
    const save = this.getSave();
    const normalizedTeam = normalizeTeam(team);
    this.save = this.withUpdatedAt({
      ...save,
      playerTeam: normalizedTeam,
      defensivePriority: normalizeDefensivePriority(save.defensivePriority, normalizedTeam),
      defenseMemory: normalizeDefenseMemory(save.defenseMemory, normalizedTeam)
    });
    saveGame(this.save);
  }

  static setOffensiveCombinations(combinations: Combination[]): void {
    const save = this.getSave();
    this.save = this.withUpdatedAt({
      ...save,
      offensiveCombinations: normalizeOffensiveCombinations(combinations)
    });
    saveGame(this.save);
  }

  static setDefenseMemory(numberOfPlayers: number, playerIds: string[]): void {
    const save = this.getSave();
    this.save = this.withUpdatedAt({
      ...save,
      defenseMemory: {
        ...save.defenseMemory,
        [numberOfPlayers]: playerIds.slice(0, numberOfPlayers)
      }
    });
    saveGame(this.save);
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

  static completeCurrentMatch(): void {
    if (!this.save || !this.match) {
      return;
    }

    const outcome = applyMatchToChampionship(
      this.save.championship,
      this.match.ourScore,
      this.match.opponentScore,
      this.save.playerTeam.name
    );

    this.save = this.withUpdatedAt({
      ...this.save,
      currentDivisionId: outcome.divisionId,
      season: outcome.season,
      championship: outcome.championship,
      playerTeam: {
        ...applyPlayerProgression(this.save.playerTeam, this.match.playerUsage),
        divisionId: outcome.divisionId
      }
    });
    this.match = null;
    saveGame(this.save);
  }

  private static normalizeSave(save: StoredSaveGame): SaveGame {
    const playerTeam = normalizeTeam(save.playerTeam);
    return {
      ...save,
      playerTeam,
      championship: normalizeChampionshipState(save.championship, save.currentDivisionId, save.season, playerTeam.name),
      offensiveCombinations: normalizeOffensiveCombinations(save.offensiveCombinations),
      defensivePriority: normalizeDefensivePriority(save.defensivePriority, playerTeam),
      defenseMemory: normalizeDefenseMemory(save.defenseMemory, playerTeam)
    };
  }

  private static withUpdatedAt(save: SaveGame): SaveGame {
    return {
      ...save,
      updatedAt: new Date().toISOString()
    };
  }
}
