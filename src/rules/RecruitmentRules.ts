import { LINEOUT_BALANCE } from "../config/LineoutBalance.ts";
import { PLAYER_NICKNAMES } from "../data/defaultNames.ts";
import { getGeneratedTeamPlayerAppearance } from "../data/PlayerAppearanceOptions.ts";
import type { Player } from "../models/Player.ts";
import type { Team } from "../models/Team.ts";
import { getNextDivision } from "./DivisionRules.ts";
import { generateLineoutRoster } from "./TeamGeneration.ts";
import { pickOne, randomFloat, randomInt, type RandomSource } from "../utils/Random.ts";

export function getRecruitmentBandProbabilities(): number[] {
  return [...LINEOUT_BALANCE.recruitment.levelProbabilities];
}

function getUnusedNickname(players: Player[], rng: RandomSource): string {
  const used = new Set(players.map((player) => player.nickname.trim().toLocaleLowerCase("fr")));
  const available = PLAYER_NICKNAMES.filter((name) => !used.has(name.toLocaleLowerCase("fr")));
  if (available.length) return pickOne(available, rng);
  // Banc illimité : conserver un nom distinct même après épuisement de la liste.
  const base = pickOne(PLAYER_NICKNAMES, rng);
  let suffix = 2;
  let name = `${base} ${suffix}`;
  while (used.has(name.toLocaleLowerCase("fr"))) {
    suffix++;
    name = `${base.slice(0, 11 - String(suffix).length)} ${suffix}`;
  }
  return name;
}

export function generateRecruit(team: Team, rng: RandomSource, forcedBand?: number): { player: Player; band: number } {
  const roll = randomFloat(0, 1, rng);
  const chances = getRecruitmentBandProbabilities();
  const band = forcedBand ?? (roll < chances[0] ? 0 : roll < chances[0] + chances[1] ? 1 : 2);
  let divisionId = team.divisionId;
  for (let step = 0; step < band; step++) divisionId = getNextDivision(divisionId);
  const allPlayers = [team.hooker, ...team.fieldPlayers, ...(team.reserveHookers ?? [])];
  let sequence = allPlayers.length + 1;
  while (allPlayers.some((p) => p.id === `${team.id}_recruit_${sequence}`)) sequence++;
  const id = `${team.id}_recruit_${sequence}`;
  const nickname = getUnusedNickname(allPlayers, rng);
  // Réutiliser le générateur initial, y compris ses spécialités, points forts et corrections.
  // Aucun répertoire tactique n'est généré pour une recrue individuelle.
  const roster = generateLineoutRoster({ divisionId, prefix: id, hookerId: id,
    hookerNickname: nickname, clubModifier: 0, rng });
  const generated: Player = randomFloat(0, 1, rng) < LINEOUT_BALANCE.recruitment.hookerProbability
    ? roster.hooker : pickOne(roster.fieldPlayers, rng);
  const appearance = getGeneratedTeamPlayerAppearance(id, randomInt(0, 100000, rng), generated.appearance);
  const player: Player = generated.role === "hooker"
    ? { ...generated, id, nickname, appearance }
    : { ...generated, id, nickname, appearance, number: Math.max(8, ...team.fieldPlayers.map((p) => p.number)) + 1 };
  return { player, band };
}

export function acceptRecruit(team: Team, nickname?: string): Team {
  if (!team.pendingRecruitment) return team;
  const player = { ...team.pendingRecruitment, nickname: nickname?.trim().slice(0, 12) || team.pendingRecruitment.nickname };
  const next = { ...team, pendingRecruitment: undefined, pendingRecruitmentBand: undefined };
  return player.role === "hooker"
    ? { ...next, reserveHookers: [...(team.reserveHookers ?? []), player] }
    : { ...next, fieldPlayers: [...team.fieldPlayers, player] };
}

export function getRecruitmentProfile(player: Player): string {
  if (player.role === "hooker") return "hooker";
  // Le poste d'origine est conservé lorsque le numéro de maillot change.
  return player.rugbyPosition ?? (player.number === 1 || player.number === 3 ? "prop"
    : player.number === 4 || player.number === 5 ? "secondRow" : "backRow");
}

export function generateRecruitmentWheel(team: Team, rng: RandomSource): Array<{
  player: Player; band: number; probability: number;
}> {
  const probabilities = getRecruitmentBandProbabilities();
  return [0, 0, 0, 1, 1, 2].map((band) => ({
    ...generateRecruit(team, rng, band), probability: probabilities[band] / [3, 2, 1][band]
  }));
}
