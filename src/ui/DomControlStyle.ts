import { toCssColor, UI } from "./UITheme";

type DomControlStyleOptions = {
  compact?: boolean;
  colorPicker?: boolean;
};

export function applyDomControlStyle(
  control: HTMLInputElement | HTMLSelectElement,
  options: DomControlStyleOptions = {}
): void {
  control.style.position = "fixed";
  control.style.zIndex = "20";
  control.style.border = `2px solid ${toCssColor(UI.colors.outline)}`;
  control.style.borderRadius = `${UI.radius}px`;
  control.style.padding = options.colorPicker ? "0" : options.compact ? "0 12px" : "0 14px";
  control.style.background = options.colorPicker
    ? "rgba(243, 240, 231, 0.94)"
    : toCssColor(UI.colors.paper);
  control.style.color = UI.colors.textOnAccent;
  control.style.boxSizing = "border-box";
  control.style.outline = "none";
  control.style.boxShadow = "0 4px 0 rgba(7, 18, 24, 0.24)";
  if (options.colorPicker) control.style.cursor = "pointer";

  control.addEventListener("focus", () => {
    control.style.borderColor = toCssColor(UI.colors.accent);
  });
  control.addEventListener("blur", () => {
    control.style.borderColor = toCssColor(UI.colors.outline);
  });
}
