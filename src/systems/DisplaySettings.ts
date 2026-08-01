export type RenderResolution = "standard" | "high";

export const DEFAULT_RENDER_RESOLUTION: RenderResolution = "high";

const RENDER_RESOLUTION_KEY = "no-lineout-no-win.render-resolution";

export function getRenderResolution(): RenderResolution {
  if (typeof localStorage === "undefined") {
    return DEFAULT_RENDER_RESOLUTION;
  }

  return localStorage.getItem(RENDER_RESOLUTION_KEY) === "standard" ? "standard" : "high";
}

export function getRenderScale(resolution = getRenderResolution()): 1 | 2 {
  return resolution === "high" ? 2 : 1;
}

export function setRenderResolution(resolution: RenderResolution): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(RENDER_RESOLUTION_KEY, resolution);
  }
}
