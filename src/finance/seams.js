/**
 * Wave 0 phase 0D — spending-need seam functions.
 *
 * These functions decompose spendingNeed() into named, composable parts so
 * that later feature waves (housing, smile-curve, lifestyle steps, one-time
 * events) can plug in without touching simulate.js's loop.
 *
 * Floor-handling note
 * -------------------
 * The two spending bases use DIFFERENT floor conventions and composeNeed must
 * preserve them exactly:
 *
 *   LOCATION basis:
 *     base  = living + healthcare          (healthcare IS part of the floor base)
 *     floor = Math.max(0.35 * base, base - liveSav)
 *
 *   INCOME basis:
 *     base  = income * targetPct           (healthcare is NOT part of the floor base)
 *     total = base + hcBump
 *     floor = Math.max(0.35 * base, total - liveSav)
 *
 * composeNeed() therefore accepts an explicit `floorBase` parameter so each
 * basis can pass the correct denominator for the 35 % floor.  When callers
 * pass only `parts`, `floorBase` defaults to the full sum (location convention).
 *
 * @module seams
 */

import { SINGLE_COST_FACTOR, STRESS_EARLY_DROP } from "../retirementData.js";

/**
 * ctx shape accepted by spendingComponents:
 *   { isSurvivor: boolean, survivorAge: number|null }
 *
 * The survivor-age fallback (use the younger spouse when survivorAge is null)
 * is computed here, matching simulate.js's spendingNeed verbatim.
 */

/**
 * Decompose spending into named components.
 *
 * @param {object} i             - Inputs (same object passed to spendingNeed)
 * @param {number} ageA          - Person A's age in the projection year
 * @param {number} ageB          - Person B's age in the projection year
 * @param {{ isSurvivor: boolean, survivorAge: number|null }} ctx
 * @returns {{
 *   nonHousingBase: number,   // living / income portion (no healthcare)
 *   healthcare:     number,   // age-based healthcare annual amount
 *   housing:        number,   // Wave 0: always 0 (seam for future housing wave)
 *   lifestyleSteps: number,   // Wave 0: always 0 (seam for smile/step curve)
 *   events:         number,   // Wave 0: always 0 (seam for extra events)
 *   _floorBase:     number,   // internal: the correct base for the 35 % floor
 * }}
 */
export function spendingComponents(i, ageA, ageB, ctx = {}) {
  const { isSurvivor = false, survivorAge = null } = ctx;

  // Preserve the survivor-age fallback from the original spendingNeed.
  const survAge = survivorAge != null ? survivorAge : Math.min(ageA, ageB);

  // ── LOCATION basis ──────────────────────────────────────────────────────────
  if (i.spendBasis === "location" && i.retLocObj) {
    const L = i.retLocObj;
    const livingMo = Object.values(L.m).reduce((a, b) => a + b, 0);
    const single = isSurvivor || i.status === "single";
    const scale = single ? SINGLE_COST_FACTOR : 1;
    const lifestyle = (Number(i.lifestyle) || 100) / 100;
    const nonHousingBase = livingMo * 12 * scale * lifestyle;

    const hcPer = (age) => (age < 65 ? L.hcPre : L.hcPost) / 2; // couple figures ÷ 2
    const healthcare = (isSurvivor
      ? hcPer(survAge)
      : single ? hcPer(ageA) : hcPer(ageA) + hcPer(ageB)) * 12;

    // Location basis: floor applies to living + healthcare together.
    const _floorBase = nonHousingBase + healthcare;

    return { nonHousingBase, healthcare, housing: 0, lifestyleSteps: 0, events: 0, _floorBase };
  }

  // ── INCOME basis (default) ──────────────────────────────────────────────────
  const nonHousingBase = i.incomeHH * i.targetPct;
  const perPersonHC = Math.max(0, (i.hcPre - i.hcPost)) / 2;
  const under65 = isSurvivor
    ? (survAge < 65 ? 1 : 0)
    : (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0);
  const healthcare = perPersonHC * under65 * 12;

  // Income basis: floor applies to income*targetPct ONLY (not healthcare).
  const _floorBase = nonHousingBase;

  return { nonHousingBase, healthcare, housing: 0, lifestyleSteps: 0, events: 0, _floorBase };
}

/**
 * Compose a spending need from its parts.
 *
 * The 35 % safety floor is applied against `floorBase` (defaults to the full
 * component sum).  This parameter exists solely to honour the income-basis
 * convention where the floor multiplies income*targetPct but the liveSav
 * offset is subtracted from income*targetPct + healthcare.
 *
 * @param {{ nonHousingBase: number, healthcare: number, housing: number,
 *            lifestyleSteps: number, events: number, _floorBase?: number }} parts
 * @param {number} [liveSav=0]   - Annual rent-savings from an inherited home
 * @returns {number}
 */
export function composeNeed(parts, liveSav = 0) {
  const { nonHousingBase, healthcare, housing, lifestyleSteps, events } = parts;
  const total = nonHousingBase + healthcare + housing + lifestyleSteps + events;

  // Use the internal floor base if provided; fall back to total (location convention).
  const floorBase = parts._floorBase != null ? parts._floorBase : total;

  return Math.max(0.35 * floorBase, total - liveSav);
}

/**
 * Resolve the per-year portfolio return for a simulation step.
 *
 * Resolution order (mirrors the inline expression previously in simulate.js):
 *   1. If ssOpt.returns is provided, use ssOpt.returns[y] (falling back to
 *      i.realReturn if the array has no entry at y).
 *   2. Else if ssOpt.stress is set, apply the stress schedule:
 *        y <= 2 → STRESS_EARLY_DROP (-0.10)
 *        y <= 5 → realReturn - 0.02
 *        y >  5 → realReturn
 *   3. Else return i.realReturn.
 *
 * Wave 1 (B1: return presets / variability / glidepath) swaps the body of
 * this function without touching simulate.js.
 *
 * @param {{ realReturn: number }} i   - Inputs object
 * @param {number} y                   - Year index (0-based) within the simulation
 * @param {{ returns?: number[], stress?: boolean }} ssOpt - Scenario options
 * @returns {number}
 */
export function yearReturn(i, y, ssOpt) {
  if (ssOpt.returns) {
    return ssOpt.returns[y] ?? i.realReturn;
  }
  if (ssOpt.stress) {
    if (y <= 2) return STRESS_EARLY_DROP;
    if (y <= 5) return i.realReturn - 0.02;
    return i.realReturn;
  }
  return i.realReturn;
}
