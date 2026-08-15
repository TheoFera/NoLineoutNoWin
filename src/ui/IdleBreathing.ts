const IDLE_BREATHING_MINIMUM_CYCLE_MS = 1_800;
const IDLE_BREATHING_CYCLE_VARIATION_MS = 800;
const IDLE_BREATHING_INHALE_RATIO = 0.42;
const IDLE_BREATHING_EXHALE_END_RATIO = 0.8;

export type IdleBreathingProfile = {
  amplitudePixels: number;
  cycleMs: number;
  phaseOffsetMs: number;
};

export function createIdleBreathingProfile(playerId: string): IdleBreathingProfile {
  const seed = getIdleAnimationSeed(playerId);
  const cycleMs = IDLE_BREATHING_MINIMUM_CYCLE_MS
    + (seed >>> 1) % (IDLE_BREATHING_CYCLE_VARIATION_MS + 1);
  return {
    amplitudePixels: (1 + seed % 2) * 0.5,
    cycleMs,
    phaseOffsetMs: (seed >>> 12) % cycleMs
  };
}

export function getIdleBreathingCompressionPixels(
  timeMs: number,
  profile: IdleBreathingProfile
): number {
  const phase = ((timeMs + profile.phaseOffsetMs) % profile.cycleMs) / profile.cycleMs;
  const compressionRatio = phase < IDLE_BREATHING_INHALE_RATIO
    ? smoothStep(phase / IDLE_BREATHING_INHALE_RATIO)
    : phase < IDLE_BREATHING_EXHALE_END_RATIO
      ? 1 - smoothStep(
        (phase - IDLE_BREATHING_INHALE_RATIO)
          / (IDLE_BREATHING_EXHALE_END_RATIO - IDLE_BREATHING_INHALE_RATIO)
      )
      : 0;
  return profile.amplitudePixels * compressionRatio;
}

function getIdleAnimationSeed(playerId: string): number {
  let hash = 2_166_136_261;
  for (const character of playerId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function smoothStep(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}
