export const UI = {
  colors: {
    // Studio TV : surfaces neutres au-dessus des terrains et photos lumineuses.
    background: 0x132730,
    panel: 0x1d3a47,
    panelDark: 0x10232d,
    panelRaised: 0x193440,
    panelAlternate: 0x152e38,
    successSurface: 0x163b2a,
    infoSurface: 0x18364d,
    dangerSurface: 0x3a2428,
    outline: 0x607a86,
    outlineStrong: 0x8aa0a8,
    divider: 0x8aa0a8,
    scrim: 0x071218,
    paper: 0xf3f0e7,
    paperRaised: 0xffffff,
    ink: 0x17242b,
    text: "#f8faf8",
    muted: "#b9c7cb",
    textDisabled: "#7f9198",
    textOnAccent: "#17242b",
    textAccent: "#ffe08a",
    textSuccess: "#baf2cf",
    textInfo: "#c9e2ff",
    textDanger: "#ffc1c1",
    textStroke: "#071218",
    pitch: 0x167a3a,
    line: 0xffffff,
    attack: 0x2563eb,
    defense: 0xdc2626,
    accent: 0xf0b429,
    accentStrong: 0xd99a0b,
    success: 0x2f9b61,
    info: 0x4d8fd7,
    warning: 0xe28a20,
    danger: 0xc94b4b
  },
  font: {
    display: "bold 30px Arial",
    title: "bold 26px Arial",
    subtitle: "bold 18px Arial",
    bodyStrong: "bold 15px Arial",
    body: "15px Arial",
    caption: "bold 11px Arial",
    small: "12px Arial"
  },
  radius: 12,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
  },
  touch: {
    minimum: 48,
    primaryHeight: 56
  },
  motion: {
    pressOffset: 2,
    quickMs: 110
  }
};

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
