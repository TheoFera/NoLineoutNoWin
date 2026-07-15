import type { SaveGame, SaveGameV1, SaveGameV2 } from "../models/SaveGame";
import type { MatchStateData } from "../models/Match";
import type { Team } from "../models/Team";
import { DEFAULT_COMBINATIONS } from "../data/defaultCombinations";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import type { Combination } from "../models/Combination";
import { normalizeOffensiveCombinations } from "../rules/CombinationRules";
import { applyMatchToChampionship, createChampionshipState, normalizeChampionshipState } from "../rules/ChampionshipRules";
import { applyPlayerProgression } from "../rules/PlayerProgression";
import { createDefaultPlayerTeam, DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, normalizeTeam } from "../rules/TeamFactory";
import { normalizeDefenseMemory, normalizeDefensivePriority } from "../rules/DefenseSelection";
import { getDivision } from "../rules/DivisionRules";
import { normalizeOffensiveRepertoire } from "../rules/LineoutRepertoire";
import { replaceFailedActiveCombinations } from "../rules/LineoutRepertoire";
import { getLanguage, t } from "../systems/I18n";
import { clearSave, loadGame, saveGame } from "../systems/SaveSystem";
import type { LineoutPosition } from "../models/Combination";
import type { OpponentAiMemory } from "../models/LineoutAI";
import type { SeasonSummary } from "../models/Championship";
import {
  createEmptyOpponentAiMemory,
  normalizeOpponentAiMemory,
  observePlayerDefense,
  observePlayerTarget,
  withVideoObservations
} from "../ai/LineoutMemory";
import { createOpponentAiIdentity } from "../ai/LineoutAiIdentity";

type StoredTeam = Parameters<typeof normalizeTeam>[0];
type StoredSaveGame =
  | (Omit<SaveGameV1, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGameV2, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGame, "playerTeam"> & { playerTeam: StoredTeam });

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
    const offensiveCombinations = normalizeOffensiveCombinations(DEFAULT_COMBINATIONS);
    const division = getDivision("regionale_3");
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision.regionale_3;
    const save: SaveGame = {
      version: 3,
      language: getLanguage(),
      currentDivisionId: "regionale_3",
      season: 1,
      playerTeam: team,
      championship: createChampionshipState("regionale_3", 1, team.name),
      offensiveCombinations,
      offensiveRepertoire: normalizeOffensiveRepertoire(
        offensiveCombinations.map((combination) => combination.id),
        division.offensiveCombinations,
        undefined,
        repertoireLimits.reserve
      ),
      defensivePriority: normalizeDefensivePriority([], team),
      defenseMemory: {},
      opponentAiMemories: {},
      playerLineoutVideoHistory: [],
      opponentTeams: {},
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

  static getOrStoreOpponentTeam(generatedTeam: Team): Team {
    const save = this.getSave();
    const stored = save.opponentTeams[generatedTeam.id];
    if (stored && stored.divisionId === generatedTeam.divisionId) {
      return normalizeTeam(stored);
    }
    const normalized = normalizeTeam(generatedTeam);
    this.save = this.withUpdatedAt({
      ...save,
      opponentTeams: {
        ...save.opponentTeams,
        [normalized.id]: normalized
      }
    });
    saveGame(this.save);
    return normalized;
  }

  static setOffensiveCombinations(combinations: Combination[]): void {
    const save = this.getSave();
    const normalizedCombinations = normalizeOffensiveCombinations(combinations);
    const division = getDivision(save.currentDivisionId);
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[save.currentDivisionId];
    this.save = this.withUpdatedAt({
      ...save,
      offensiveCombinations: normalizedCombinations,
      offensiveRepertoire: normalizeOffensiveRepertoire(
        normalizedCombinations.map((combination) => combination.id),
        division.offensiveCombinations,
        save.offensiveRepertoire,
        repertoireLimits.reserve
      )
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

  static getPreparedOpponentAiMemory(opponentId: string): OpponentAiMemory {
    const save = this.getSave();
    const identity = createOpponentAiIdentity(opponentId, save.currentDivisionId);
    const current = save.opponentAiMemories[opponentId] ?? createEmptyOpponentAiMemory();
    return withVideoObservations(
      current,
      save.playerLineoutVideoHistory,
      identity.videoMatchesAnalyzed
    );
  }

  static observePlayerLineoutTarget(
    opponentId: string,
    combinationId: string,
    targetPosition: LineoutPosition
  ): void {
    const save = this.getSave();
    this.save = this.withUpdatedAt({
      ...save,
      opponentAiMemories: {
        ...save.opponentAiMemories,
        [opponentId]: observePlayerTarget(
          save.opponentAiMemories[opponentId] ?? createEmptyOpponentAiMemory(),
          combinationId,
          targetPosition
        )
      }
    });
    saveGame(this.save);
  }

  static observePlayerDefensiveChoice(
    opponentId: string,
    defensivePosition: LineoutPosition,
    successfulStop: boolean
  ): void {
    const save = this.getSave();
    this.save = this.withUpdatedAt({
      ...save,
      opponentAiMemories: {
        ...save.opponentAiMemories,
        [opponentId]: observePlayerDefense(
          save.opponentAiMemories[opponentId] ?? createEmptyOpponentAiMemory(),
          defensivePosition,
          successfulStop
        )
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

  static completeCurrentMatch(): SeasonSummary | null {
    if (!this.save || !this.match) {
      return null;
    }

    const outcome = applyMatchToChampionship(
      this.save.championship,
      this.match.ourScore,
      this.match.opponentScore,
      this.save.playerTeam.name
    );
    const nextDivision = getDivision(outcome.divisionId);
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[outcome.divisionId];
    const videoObservations = this.match.lineoutHistory
      .filter((entry) => (
        entry.throwingSide === "us"
        && entry.combinationId
        && entry.targetPosition
      ))
      .map((entry) => ({
        combinationId: entry.combinationId as string,
        targetPosition: entry.targetPosition as LineoutPosition
      }));
    const replacement = LINEOUT_BALANCE.ai.returnMatchReplacement;
    const opponentRepertoire = this.match.away.offensiveRepertoire;
    const updatedOpponent = opponentRepertoire
      ? {
        ...this.match.away,
        offensiveRepertoire: replaceFailedActiveCombinations(
          opponentRepertoire,
          Object.values(this.match.opponentCombinationStats).map((stat) => ({
            combinationId: stat.combinationId,
            totalUses: stat.played,
            failedUses: stat.lost
          })),
          replacement.minimumUses,
          replacement.failureRateExclusive,
          replacement.maximumReplacements
        )
      }
      : this.match.away;

    this.save = this.withUpdatedAt({
      ...this.save,
      currentDivisionId: outcome.divisionId,
      season: outcome.season,
      championship: outcome.championship,
      offensiveRepertoire: normalizeOffensiveRepertoire(
        this.save.offensiveCombinations.map((combination) => combination.id),
        nextDivision.offensiveCombinations,
        this.save.offensiveRepertoire,
        repertoireLimits.reserve
      ),
      playerTeam: {
        ...applyPlayerProgression(this.save.playerTeam, this.match.playerUsage),
        divisionId: outcome.divisionId
      },
      playerLineoutVideoHistory: videoObservations.length > 0
        ? [
          ...this.save.playerLineoutVideoHistory,
          {
            opponentId: this.match.away.id,
            playedAt: new Date().toISOString(),
            observations: videoObservations
          }
        ]
        : this.save.playerLineoutVideoHistory,
      opponentTeams: {
        ...this.save.opponentTeams,
        [updatedOpponent.id]: updatedOpponent
      }
    });
    this.match = null;
    saveGame(this.save);
    return outcome.completedSeason ?? null;
  }

  private static normalizeSave(save: StoredSaveGame): SaveGame {
    const playerTeam = normalizeTeam(save.playerTeam);
    const offensiveCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);
    const division = getDivision(save.currentDivisionId);
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[save.currentDivisionId];
    const currentRepertoire = save.version !== 1 ? save.offensiveRepertoire : undefined;
    const opponentAiMemories = save.version === 3
      ? Object.fromEntries(Object.entries(save.opponentAiMemories ?? {}).map(([id, memory]) => [
        id,
        normalizeOpponentAiMemory(memory)
      ]))
      : {};
    return {
      ...save,
      version: 3,
      playerTeam,
      championship: normalizeChampionshipState(save.championship, save.currentDivisionId, save.season, playerTeam.name),
      offensiveCombinations,
      offensiveRepertoire: normalizeOffensiveRepertoire(
        offensiveCombinations.map((combination) => combination.id),
        division.offensiveCombinations,
        currentRepertoire,
        repertoireLimits.reserve
      ),
      defensivePriority: normalizeDefensivePriority(save.defensivePriority, playerTeam),
      defenseMemory: normalizeDefenseMemory(save.defenseMemory, playerTeam),
      opponentAiMemories,
      playerLineoutVideoHistory: save.version === 3
        ? (save.playerLineoutVideoHistory ?? [])
        : [],
      opponentTeams: save.version === 3
        ? Object.fromEntries(Object.entries(save.opponentTeams ?? {}).map(([id, team]) => [
          id,
          normalizeTeam(team)
        ]))
        : {}
    };
  }

  private static withUpdatedAt(save: SaveGame): SaveGame {
    return {
      ...save,
      updatedAt: new Date().toISOString()
    };
  }
}
