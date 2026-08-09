import type { FfrLeagueId } from "../models/ClubLocation";

export const DEFAULT_FFR_LEAGUE_ID: FfrLeagueId = "occitanie";

export const FFR_LEAGUES: ReadonlyArray<{
  id: FfrLeagueId;
  translationKey: `league.${FfrLeagueId}`;
}> = [
  { id: "auvergne_rhone_alpes", translationKey: "league.auvergne_rhone_alpes" },
  { id: "bourgogne_franche_comte", translationKey: "league.bourgogne_franche_comte" },
  { id: "bretagne", translationKey: "league.bretagne" },
  { id: "centre_val_de_loire", translationKey: "league.centre_val_de_loire" },
  { id: "corse", translationKey: "league.corse" },
  { id: "grand_est", translationKey: "league.grand_est" },
  { id: "hauts_de_france", translationKey: "league.hauts_de_france" },
  { id: "normandie", translationKey: "league.normandie" },
  { id: "nouvelle_aquitaine", translationKey: "league.nouvelle_aquitaine" },
  { id: "occitanie", translationKey: "league.occitanie" },
  { id: "pays_de_la_loire", translationKey: "league.pays_de_la_loire" },
  { id: "provence_alpes_cote_d_azur", translationKey: "league.provence_alpes_cote_d_azur" },
  { id: "ile_de_france", translationKey: "league.ile_de_france" }
];

export function isFfrLeagueId(value: string): value is FfrLeagueId {
  return FFR_LEAGUES.some((league) => league.id === value);
}
