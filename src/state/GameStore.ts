import type { DefenseMemory, SaveGame, SaveGameV1, SaveGameV2, SaveGameV3, SaveGameV4 } from "../models/SaveGame";
import type { MatchStateData } from "../models/Match";
import type { Team } from "../models/Team";
import type { DivisionId } from "../models/Division";
import { LINEOUT_BALANCE } from "../config/LineoutBalance";
import { DIVISIONS } from "../data/divisions";
import type { Combination, OffensiveRepertoire } from "../models/Combination";
import { normalizeOffensiveCombinations } from "../rules/CombinationRules";
import { applyMatchToChampionship, createChampionshipState, normalizeChampionshipState } from "../rules/ChampionshipRules";
import { normalizePlayerProgressionUsage, resolvePlayerProgression } from "../rules/PlayerProgression";
import { createDefaultPlayerTeam, DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, normalizeTeam } from "../rules/TeamFactory";
import {
  isDefensiveLineoutSize,
  createDefaultDefenseMemory,
  normalizeDefenseMemory,
  normalizeDefensiveLayout,
  normalizeDefensivePriority
} from "../rules/DefenseSelection";
import { getDivision } from "../rules/DivisionRules";
import { normalizeOffensiveRepertoire } from "../rules/LineoutRepertoire";
import { replaceFailedActiveCombinations } from "../rules/LineoutRepertoire";
import { getLanguage, t } from "../systems/I18n";
import { clearSave, loadGame, saveGame, setSavePersistenceSuspended } from "../systems/SaveSystem";
import type { LineoutPosition } from "../models/Combination";
import type { OpponentAiMemory } from "../models/LineoutAI";
import type { MatchCompletionSummary } from "../models/PlayerProgression";
import type { TeamPlayerDraft } from "../models/TeamCreation";
import { getGeneratedTeamPlayerAppearance } from "../data/PlayerAppearanceOptions";
import {
  createEmptyOpponentAiMemory,
  normalizeOpponentAiMemory,
  observePlayerDefense,
  observePlayerTarget,
  withVideoObservations
} from "../ai/LineoutMemory";
import { createOpponentAiIdentity } from "../ai/LineoutAiIdentity";
import { toCanonicalLineoutCombinationId } from "../data/LineoutCombinations.ts";
import { DEFAULT_FFR_LEAGUE_ID } from "../data/frenchRugbyLeagues.ts";
import type { FfrLeagueId } from "../models/ClubLocation.ts";
import { generateTeamForDivision } from "../rules/TeamGeneration.ts";
import { createSeededRandom } from "../utils/Random.ts";

type StoredTeam = Parameters<typeof normalizeTeam>[0];
type StoredSaveGame =
  | (Omit<SaveGameV1, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGameV2, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGameV3, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGameV4, "playerTeam"> & { playerTeam: StoredTeam })
  | (Omit<SaveGame, "playerTeam"> & { playerTeam: StoredTeam });

export type TestTeamLevel = "adapted" | "current";

export type TestModeState = {
  divisionId: DivisionId;
  teamLevel: TestTeamLevel;
};

export class GameStore {
  private static save: SaveGame | null = null;
  private static match: MatchStateData | null = null;
  private static testModeOriginalSave: SaveGame | null = null;
  private static testModeState: TestModeState | null = null;

  static boot(): void {
    setSavePersistenceSuspended(false);
    this.testModeOriginalSave = null;
    this.testModeState = null;
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
    secondaryColor = DEFAULT_SECONDARY_COLOR,
    playerDrafts?: readonly TeamPlayerDraft[],
    clubLeagueId: FfrLeagueId = DEFAULT_FFR_LEAGUE_ID
  ): SaveGame {
    const now = new Date().toISOString();
    const team = createDefaultPlayerTeam(
      clubName,
      { primary: primaryColor, secondary: secondaryColor },
      undefined,
      playerDrafts
    );
    const offensiveCombinations = normalizeOffensiveCombinations();
    const save: SaveGame = {
      version: 6,
      language: getLanguage(),
      currentDivisionId: "regionale_3",
      season: 1,
      playerTeam: team,
      clubLeagueId,
      championship: createChampionshipState("regionale_3", 1, team.name, clubLeagueId),
      offensiveCombinations,
      offensiveRepertoire: createEmptyOffensiveRepertoire(),
      defensivePriority: normalizeDefensivePriority([], team),
      defenseMemory: createDefaultDefenseMemory(team),
      opponentAiMemories: {},
      playerLineoutVideoHistory: [],
      opponentTeams: {},
      playerProgressionUsage: {},
      createdAt: now,
      updatedAt: now
    };
    this.save = save;
    saveGame(save);
    return save;
  }

  static resetSave(): void {
    if (this.testModeOriginalSave) {
      this.exitTestMode();
    }
    this.save = null;
    this.match = null;
    clearSave();
  }

  static isTestModeActive(): boolean {
    return this.testModeState !== null;
  }

  static getTestModeState(): Readonly<TestModeState> | null {
    return this.testModeState;
  }

  static enterTestMode(divisionId: DivisionId, teamLevel: TestTeamLevel): boolean {
    if (!this.save) {
      return false;
    }

    const originalSave = this.testModeOriginalSave ?? cloneSave(this.save);
    const playerTeam = teamLevel === "adapted"
      ? createTestTeamForDivision(originalSave.playerTeam, divisionId)
      : { ...cloneSave(originalSave).playerTeam, divisionId };
    const division = getDivision(divisionId);
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[divisionId];
    const offensiveCombinations = normalizeOffensiveCombinations(originalSave.offensiveCombinations);
    const season = Math.max(1, DIVISIONS.findIndex((item) => item.id === divisionId) + 1);

    setSavePersistenceSuspended(true);
    this.testModeOriginalSave = originalSave;
    this.testModeState = { divisionId, teamLevel };
    this.match = null;
    this.save = {
      ...cloneSave(originalSave),
      currentDivisionId: divisionId,
      season,
      playerTeam,
      championship: createChampionshipState(
        divisionId,
        season,
        playerTeam.name,
        originalSave.clubLeagueId ?? DEFAULT_FFR_LEAGUE_ID
      ),
      offensiveCombinations,
      offensiveRepertoire: normalizeOffensiveRepertoire(
        offensiveCombinations.map((combination) => combination.id),
        division.offensiveCombinations,
        originalSave.offensiveRepertoire,
        repertoireLimits.reserve
      ),
      defensivePriority: normalizeDefensivePriority(originalSave.defensivePriority, playerTeam),
      defenseMemory: normalizeDefenseMemory(originalSave.defenseMemory, playerTeam),
      opponentAiMemories: {},
      playerLineoutVideoHistory: [],
      opponentTeams: {},
      playerProgressionUsage: {},
      updatedAt: new Date().toISOString()
    };
    return true;
  }

  static exitTestMode(): boolean {
    if (!this.testModeOriginalSave) {
      return false;
    }

    this.save = this.testModeOriginalSave;
    this.match = null;
    this.testModeOriginalSave = null;
    this.testModeState = null;
    setSavePersistenceSuspended(false);
    return true;
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
      return withOpponentAppearanceVariation(normalizeTeam(stored));
    }
    const normalized = withOpponentAppearanceVariation(normalizeTeam(generatedTeam));
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

  static setDefenseMemory(numberOfPlayers: number, playerIdsBySlot: Array<string | null>): void {
    if (!isDefensiveLineoutSize(numberOfPlayers)) {
      return;
    }
    const save = this.getSave();
    this.save = this.withUpdatedAt({
      ...save,
      defenseMemory: normalizeDefenseMemory({
        ...save.defenseMemory,
        [numberOfPlayers]: normalizeDefensiveLayout(playerIdsBySlot)
      } satisfies DefenseMemory, save.playerTeam)
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

  static completeCurrentMatch(): MatchCompletionSummary | null {
    if (!this.save || !this.match) {
      return null;
    }

    const outcome = applyMatchToChampionship(
      this.save.championship,
      this.match.ourScore,
      this.match.opponentScore,
      this.save.playerTeam.name,
      this.save.clubLeagueId ?? DEFAULT_FFR_LEAGUE_ID
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
        combinationId: toCanonicalLineoutCombinationId(entry.combinationId as string),
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
    const progression = resolvePlayerProgression(
      this.save.playerTeam,
      this.match.playerUsage,
      this.save.playerProgressionUsage
    );

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
        ...progression.team,
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
      },
      playerProgressionUsage: progression.remainingUsage
    });
    this.match = null;
    saveGame(this.save);
    return {
      seasonSummary: outcome.completedSeason ?? null,
      playerProgressions: progression.progressedPlayers
    };
  }

  private static normalizeSave(save: StoredSaveGame): SaveGame {
    const playerTeam = normalizeTeam(save.playerTeam);
    const offensiveCombinations = normalizeOffensiveCombinations(save.offensiveCombinations);
    const division = getDivision(save.currentDivisionId);
    const repertoireLimits = LINEOUT_BALANCE.ai.repertoireByDivision[save.currentDivisionId];
    const clubLeagueId = save.clubLeagueId ?? DEFAULT_FFR_LEAGUE_ID;
    const currentRepertoire = save.version !== 1 ? save.offensiveRepertoire : undefined;
    const hasAiPersistence = save.version === 3 || save.version === 4 || save.version === 6;
    const hasProgressionPersistence = save.version === 4 || save.version === 6;
    const opponentAiMemories = hasAiPersistence
      ? Object.fromEntries(Object.entries(save.opponentAiMemories ?? {}).map(([id, memory]) => [
        id,
        normalizeOpponentAiMemory(memory)
      ]))
      : {};
    return {
      ...save,
      version: 6,
      clubLeagueId,
      playerTeam,
      championship: normalizeChampionshipState(
        save.championship,
        save.currentDivisionId,
        save.season,
        playerTeam.name,
        clubLeagueId
      ),
      offensiveCombinations,
      offensiveRepertoire: isEmptyOffensiveRepertoire(currentRepertoire)
        ? createEmptyOffensiveRepertoire()
        : normalizeOffensiveRepertoire(
          offensiveCombinations.map((combination) => combination.id),
          division.offensiveCombinations,
          currentRepertoire,
          repertoireLimits.reserve
        ),
      defensivePriority: normalizeDefensivePriority(save.defensivePriority, playerTeam),
      defenseMemory: normalizeDefenseMemory(save.defenseMemory, playerTeam),
      opponentAiMemories,
      playerLineoutVideoHistory: hasAiPersistence
        ? (save.playerLineoutVideoHistory ?? []).map((match) => ({
          ...match,
          observations: match.observations.map((observation) => ({
            ...observation,
            combinationId: toCanonicalLineoutCombinationId(observation.combinationId)
          }))
        }))
        : [],
      opponentTeams: hasAiPersistence
        ? Object.fromEntries(Object.entries(save.opponentTeams ?? {}).map(([id, team]) => [
          id,
          withOpponentAppearanceVariation(normalizeTeam(team))
        ]))
        : {},
      playerProgressionUsage: normalizePlayerProgressionUsage(
        playerTeam,
        hasProgressionPersistence ? save.playerProgressionUsage : undefined
      )
    };
  }

  private static withUpdatedAt(save: SaveGame): SaveGame {
    return {
      ...save,
      updatedAt: new Date().toISOString()
    };
  }
}

function withOpponentAppearanceVariation(team: Team): Team {
  const hooker = {
    ...team.hooker,
    appearance: getGeneratedTeamPlayerAppearance(team.id, 0, team.hooker.appearance)
  };
  const fieldPlayers = team.fieldPlayers.map((player, index) => ({
    ...player,
    appearance: getGeneratedTeamPlayerAppearance(team.id, index + 1, player.appearance)
  }));
  const fieldPlayersById = new Map(fieldPlayers.map((player) => [player.id, player]));

  return {
    ...team,
    hooker,
    fieldPlayers,
    lineoutPlayers: team.lineoutPlayers.map((player) => fieldPlayersById.get(player.id) ?? player)
  };
}

function createTestTeamForDivision(team: Team, divisionId: DivisionId): Team {
  const divisionIndex = Math.max(0, DIVISIONS.findIndex((division) => division.id === divisionId));
  const generated = generateTeamForDivision({
    id: team.id,
    name: team.name,
    divisionId,
    colors: team.colors,
    prefix: "test_player_",
    clubModifier: 0,
    rng: createSeededRandom(9_100 + divisionIndex * 97)
  }).team;
  const currentPlayersByNumber = new Map(team.fieldPlayers.map((player) => [player.number, player]));
  const fieldPlayers = generated.fieldPlayers.map((player) => {
    const current = currentPlayersByNumber.get(player.number);
    return current
      ? {
          ...player,
          id: current.id,
          nickname: current.nickname,
          appearance: current.appearance
        }
      : player;
  });
  const playersByNumber = new Map(fieldPlayers.map((player) => [player.number, player]));
  const lineoutPlayers = team.lineoutPlayers
    .map((player) => playersByNumber.get(player.number))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  return {
    ...team,
    divisionId,
    hooker: {
      ...generated.hooker,
      id: team.hooker.id,
      nickname: team.hooker.nickname,
      appearance: team.hooker.appearance
    },
    fieldPlayers,
    lineoutPlayers,
    lineoutStyle: generated.lineoutStyle
  };
}

function cloneSave(save: SaveGame): SaveGame {
  return JSON.parse(JSON.stringify(save)) as SaveGame;
}

function createEmptyOffensiveRepertoire(): OffensiveRepertoire {
  return {
    activeCombinationIds: [],
    reserveCombinationIds: []
  };
}

function isEmptyOffensiveRepertoire(
  repertoire?: Partial<OffensiveRepertoire>
): boolean {
  return Boolean(
    repertoire
    && (repertoire.activeCombinationIds?.length ?? 0) === 0
    && (repertoire.reserveCombinationIds?.length ?? 0) === 0
  );
}
