export const MATCH_SCORE_OVERLAY_LAYOUT = {
  x: 18,
  y: 14,
  width: 354,
  height: 84,
  teamPanelY: 10,
  teamPanelHeight: 68,
  teamPanelWidth: 151,
  centerPanelX: 132,
  centerPanelWidth: 90
} as const;

export const MATCH_SCORE_OVERLAY_DEPTH = 1500;
export const PLAYER_STATS_OVERLAY_DEPTH = 1600;

export function formatMatchMinute(minute: number): string {
  return `${Math.max(0, Math.floor(minute))}'`;
}
