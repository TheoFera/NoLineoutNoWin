import type { FieldPlayer, Hooker } from "../models/Player";
import type { JerseyColors, Team } from "../models/Team";
import { PLAYER_NICKNAMES } from "../data/defaultNames";
import { randomInt } from "../utils/Random";
import { clamp } from "../utils/Clamp";

const DEFAULT_FIELD_PLAYER_NUMBERS = [1, 3, 4, 5, 6, 7, 8, 16, 17, 18];
const DEFAULT_TEAM_SIZE = DEFAULT_FIELD_PLAYER_NUMBERS.length;
const DEFAULT_LINEOUT_SIZE = 7;

export const DEFAULT_PRIMARY_COLOR = 0x2563eb;
export const DEFAULT_SECONDARY_COLOR = 0xffffff;

type StoredTeamShape = Omit<Team, "fieldPlayers" | "lineoutPlayers"> & {
  fieldPlayers?: FieldPlayer[];
  lineoutPlayers?: FieldPlayer[];
};

function statAround(base: number): number {
  return clamp(randomInt(base - 12, base + 12), 10, 95);
}

function normalizeJerseyColors(colors?: Partial<JerseyColors>): JerseyColors {
  return {
    primary: colors?.primary ?? DEFAULT_PRIMARY_COLOR,
    secondary: colors?.secondary ?? DEFAULT_SECONDARY_COLOR
  };
}

function buildFieldPlayer(number: number, index: number, prefix: string, base: number): FieldPlayer {
  return {
    id: `${prefix}${index + 1}`,
    role: "field",
    number,
    nickname: PLAYER_NICKNAMES[index] ?? `J${number}`,
    height: randomInt(number <= 3 ? 176 : 184, number <= 3 ? 190 : 202),
    width: randomInt(number <= 3 ? 92 : 82, number <= 3 ? 110 : 102),
    jump: statAround(base + (number === 4 || number === 5 ? 8 : 0)),
    lift: statAround(base + (number === 1 || number === 3 ? 8 : 0)),
    hands: statAround(base)
  };
}

function dedupePlayers(players: FieldPlayer[]): FieldPlayer[] {
  const seen = new Set<string>();
  return players.filter((player) => {
    if (seen.has(player.id)) {
      return false;
    }

    seen.add(player.id);
    return true;
  });
}

function mergeFieldPlayers(primary: FieldPlayer[], fallback: FieldPlayer[]): FieldPlayer[] {
  return dedupePlayers([...primary, ...fallback]).slice(0, DEFAULT_TEAM_SIZE);
}

function normalizeLineoutPlayers(fieldPlayers: FieldPlayer[], currentLineoutPlayers?: FieldPlayer[]): FieldPlayer[] {
  const currentIds = new Set((currentLineoutPlayers ?? []).map((player) => player.id));
  const selected: FieldPlayer[] = [];

  for (const player of currentLineoutPlayers ?? []) {
    const matching = fieldPlayers.find((fieldPlayer) => fieldPlayer.id === player.id);
    if (!matching) {
      continue;
    }

    if (selected.some((item) => item.id === matching.id)) {
      continue;
    }

    selected.push(matching);
    if (selected.length === DEFAULT_LINEOUT_SIZE) {
      return selected;
    }
  }

  for (const player of fieldPlayers) {
    if (currentIds.has(player.id) && selected.some((item) => item.id === player.id)) {
      continue;
    }

    if (selected.some((item) => item.id === player.id)) {
      continue;
    }

    selected.push(player);
    if (selected.length === DEFAULT_LINEOUT_SIZE) {
      return selected;
    }
  }

  return selected.slice(0, DEFAULT_LINEOUT_SIZE);
}

export function createDefaultHooker(id: string, nickname: string, base = 45): Hooker {
  return {
    id,
    role: "hooker",
    number: 2,
    nickname,
    height: randomInt(168, 183),
    width: randomInt(78, 92),
    throwing: statAround(base)
  };
}

export function createDefaultFieldPlayers(base = 45, prefix = "p"): FieldPlayer[] {
  return DEFAULT_FIELD_PLAYER_NUMBERS.map((number, index) => buildFieldPlayer(number, index, prefix, base));
}

export function createDefaultLineoutPlayers(base = 45, prefix = "p"): FieldPlayer[] {
  return createDefaultFieldPlayers(base, prefix).slice(0, DEFAULT_LINEOUT_SIZE);
}

export function createDefaultPlayerTeam(name: string, colors?: Partial<JerseyColors>): Team {
  const fieldPlayers = createDefaultFieldPlayers(45, "p");

  return {
    id: "player_team",
    name,
    divisionId: "regionale_3",
    colors: normalizeJerseyColors(colors),
    hooker: createDefaultHooker("h2", "Dédé", 45),
    fieldPlayers,
    lineoutPlayers: fieldPlayers.slice(0, DEFAULT_LINEOUT_SIZE)
  };
}

export function normalizeTeam(team: StoredTeamShape): Team {
  const defaultFieldPlayers = createDefaultFieldPlayers(45, "p");
  const fieldPlayers = mergeFieldPlayers(team.fieldPlayers ?? team.lineoutPlayers ?? [], defaultFieldPlayers);
  const lineoutPlayers = normalizeLineoutPlayers(fieldPlayers, team.lineoutPlayers);

  return {
    id: team.id,
    name: team.name,
    divisionId: team.divisionId,
    colors: normalizeJerseyColors(team.colors),
    hooker: team.hooker,
    fieldPlayers,
    lineoutPlayers
  };
}
