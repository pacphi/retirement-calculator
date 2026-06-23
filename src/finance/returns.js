import { RETURN_PRESETS, RETURN_MODEL_DEFAULTS } from "../retirementData.js";

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

/**
 * Resolve the scalar mean that Monte Carlo samples around.
 *
 * For "blended" (default) this equals i.realReturn — MC is unchanged.
 * For "glidepath" the midpoint equity blend is used (progress = 0.5).
 * For "byBucket" the balance-weighted mean across all three buckets is used;
 *   if no bucket balances are available (pre-sim context), falls back to i.realReturn.
 *
 * MC always samples around this scalar so the variability band semantics are
 * unchanged regardless of which return model is selected. The glidepath shape
 * is averaged into the mean for MC — this is an intentional simplification
 * (glidepath is opt-in; MC samples around the blended mean).
 *
 * @param {{ realReturn: number, returnModel?: object, initialBuckets?: object }} i
 * @returns {number}
 */
export function blendedMean(i) {
  const rm = i.returnModel ?? RETURN_MODEL_DEFAULTS;
  const mode = rm.mode ?? "blended";

  if (mode === "glidepath") {
    // Use midpoint progress (0.5) as the representative blend for MC sampling.
    const equityPct = ((rm.equityPctNow ?? 80) + (rm.equityPctAtRetire ?? 40)) / 2 / 100;
    const bondPct = 1 - equityPct;
    return equityPct * (rm.equityReal ?? 0.065) + bondPct * (rm.bondReal ?? 0.02);
  }

  if (mode === "byBucket") {
    const b = i.initialBuckets;
    if (!b) return i.realReturn;
    const total = (b.taxable ?? 0) + (b.deferred ?? 0) + (b.roth ?? 0);
    if (total === 0) return i.realReturn;
    return (
      (b.taxable ?? 0) * (rm.taxableReal ?? i.realReturn) +
      (b.deferred ?? 0) * (rm.deferredReal ?? i.realReturn) +
      (b.roth ?? 0) * (rm.rothReal ?? i.realReturn)
    ) / total;
  }

  // blended (default) — preserves every existing caller unchanged.
  return i.realReturn;
}

/**
 * Resolve the per-year deterministic return for the simulation loop.
 *
 * Mode resolution:
 *   "blended"   (default) → i.realReturn (byte-identical to pre-Task-5 behavior)
 *   "glidepath" → age-interpolated equity % between equityPctNow and equityPctAtRetire.
 *                 ctx must carry { yearsToRetire, totalAccumYears }.
 *   "byBucket"  → balance-weighted mean from ctx.buckets.
 *                 ctx must carry { buckets: { taxable, deferred, roth } }.
 *
 * When mode is absent or unrecognized, falls back to blended → i.realReturn,
 * preserving every existing caller that doesn't pass returnModel.
 *
 * @param {{ realReturn: number, returnModel?: object }} i
 * @param {number} y  - year index (0-based) within the simulation
 * @param {{ yearsToRetire?: number, totalAccumYears?: number, buckets?: object }} ctx
 * @returns {number}
 */
export function resolveYearReturn(i, y, ctx) {
  const rm = i.returnModel ?? RETURN_MODEL_DEFAULTS;
  const mode = rm.mode ?? "blended";

  if (mode === "glidepath") {
    const total = ctx.totalAccumYears ?? 0;
    // progress: 0 at start (full equity tilt), 1 at retirement (bond tilt).
    const progress = total > 0 ? Math.max(0, Math.min(1, (total - (ctx.yearsToRetire ?? 0)) / total)) : 1;
    const equityPct = ((rm.equityPctNow ?? 80) * (1 - progress) + (rm.equityPctAtRetire ?? 40) * progress) / 100;
    const bondPct = 1 - equityPct;
    return equityPct * (rm.equityReal ?? 0.065) + bondPct * (rm.bondReal ?? 0.02);
  }

  if (mode === "byBucket") {
    const b = ctx.buckets ?? {};
    const total = (b.taxable ?? 0) + (b.deferred ?? 0) + (b.roth ?? 0);
    if (total === 0) return i.realReturn;
    return (
      (b.taxable ?? 0) * (rm.taxableReal ?? i.realReturn) +
      (b.deferred ?? 0) * (rm.deferredReal ?? i.realReturn) +
      (b.roth ?? 0) * (rm.rothReal ?? i.realReturn)
    ) / total;
  }

  // blended (default) — preserves every existing caller unchanged.
  return i.realReturn;
}
