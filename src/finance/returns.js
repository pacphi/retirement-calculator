import { RETURN_PRESETS } from "../retirementData.js";

/**
 * Resolve the central real return. A known preset key wins; otherwise the
 * caller's custom numeric value is used. Wave 3 extends this module with
 * glidepath/blend; Wave 1 only resolves the preset → central rate.
 *
 * @param {string} preset  - "conservative" | "balanced" | "growth" | "custom"
 * @param {number} custom  - user's custom real return (used when preset unknown)
 * @returns {number}
 */
export function resolveReturn(preset, custom) {
  if (preset && RETURN_PRESETS[preset]) return RETURN_PRESETS[preset].realReturn;
  return Number(custom) || 0;
}
