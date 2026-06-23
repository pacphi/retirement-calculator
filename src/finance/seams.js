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
 * Wave 2 floor policy (Task 4 — confirmed, do not revert)
 * --------------------------------------------------------
 * Housing (rent / mortgage P&I / property tax / insurance / maintenance) is a
 * hard obligation added OUTSIDE the 0.35 safety floor.  The floor and any
 * live-in savings credit apply to NON-HOUSING essentials only.  _floorBase
 * NEVER includes the housing component — housing is always added on top of the
 * max() expression, paid in full regardless of liveSav.
 *
 * @module seams
 */

import { SINGLE_COST_FACTOR, STRESS_EARLY_DROP } from "../retirementData.js";
import { smileMultiplier } from "./spending/smile.js";
import { lifestyleStepDelta } from "./spending/lifestyle.js";
import { housingCostForYear } from "./housing.js";
import { resolveYearReturn } from "./returns.js";

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
 *   housing:        number,   // Annual housing cost (rent / P&I / property tax / insurance / maintenance)
 *   lifestyleSteps: number,   // Wave 0: always 0 (seam for smile/step curve)
 *   events:         number,   // Wave 0: always 0 (seam for extra events)
 *   _floorBase:     number,   // internal: the correct base for the 35 % floor
 * }}
 */
export function spendingComponents(i, ageA, ageB, ctx = {}) {
  const {
    isSurvivor = false,
    survivorAge = null,
    retireAgeA = Infinity,
    cal = null,
    inflation,
    propertyTaxRate,
    // Task 8 (v3 §4): per-person working flags. A still-working spouse carries employer
    // insurance, so the pre-65 ACA bridge does NOT apply to them. Default false (retired)
    // preserves pre-Task-8 behaviour for callers that don't pass these (e.g. headline/steady).
    workingA = false,
    workingB = false,
  } = ctx;

  // Preserve the survivor-age fallback from the original spendingNeed.
  const survAge = survivorAge != null ? survivorAge : Math.min(ageA, ageB);

  // Housing cost — computed once regardless of basis (Wave 2, Task 4).
  // Uses cal from the simulation loop; zero when cal is null (pre-sim contexts).
  // inflation deflates mortgage P&I only; rent/tax/insurance/maintenance are real-flat.
  const housing = (cal != null)
    ? housingCostForYear(
        i.housing,
        cal,
        inflation != null ? inflation : (i.inflation || 0),
        propertyTaxRate != null ? propertyTaxRate : (i.activePropertyTaxRate || 0),
      ).total
    : 0;

  // ── LOCATION basis ──────────────────────────────────────────────────────────
  if (i.spendBasis === "location" && i.retLocObj) {
    const L = i.retLocObj;
    // Exclude rent from the basket when housing is active (tenure is set), so
    // rent isn't double-counted — the housing line owns it.
    const housingActive = i.housing && i.housing.tenure !== undefined;
    const livingMo = Object.entries(L.m).reduce((a, [k, v]) =>
      (housingActive && k === "rent") ? a : a + v, 0);
    const single = isSurvivor || i.status === "single";
    const scale = single ? SINGLE_COST_FACTOR : 1;
    const lifestyle = (Number(i.lifestyle) || 100) / 100;
    const smile = smileMultiplier(ageA, retireAgeA, i.spendingShape);
    const nonHousingBase = livingMo * 12 * scale * lifestyle * smile;

    // Task 8: the pre-65 ACA figure (hcPre) applies to a person only when under 65 AND not
    // working; a still-working pre-65 person uses the post-65/Medicare figure (employer-insured).
    const hcPer = (age, working) => ((age < 65 && !working) ? L.hcPre : L.hcPost) / 2; // couple figures ÷ 2
    const healthcare = (isSurvivor
      ? hcPer(survAge, false)
      : single ? hcPer(ageA, workingA) : hcPer(ageA, workingA) + hcPer(ageB, workingB)) * 12;

    // Location basis: floor applies to living + healthcare together (housing excluded — Wave 2).
    const _floorBase = nonHousingBase + healthcare;

    return { nonHousingBase, healthcare, housing, lifestyleSteps: cal != null ? lifestyleStepDelta(i.lifestyleSteps, cal) : 0, events: 0, _floorBase };
  }

  // ── INCOME basis (default) ──────────────────────────────────────────────────
  // targetPct is reframed as the NON-HOUSING share of income (Wave 2, Task 4).
  // Default changed: 0.40 → 0.28 in RetirementCalculator.jsx.
  const smile = smileMultiplier(ageA, retireAgeA, i.spendingShape);
  const nonHousingBase = i.incomeHH * i.targetPct * smile;
  const perPersonHC = Math.max(0, (i.hcPre - i.hcPost)) / 2;
  // Task 8: count a person in the pre-65 ACA bridge only if under 65 AND not working
  // (a still-working spouse carries employer insurance). A survivor is retired.
  const under65 = isSurvivor
    ? (survAge < 65 ? 1 : 0)
    : ((ageA < 65 && !workingA) ? 1 : 0) + ((ageB < 65 && !workingB) ? 1 : 0);
  const healthcare = perPersonHC * under65 * 12;

  // Income basis: floor applies to income*targetPct ONLY (not healthcare, not housing).
  const _floorBase = nonHousingBase;

  return { nonHousingBase, healthcare, housing, lifestyleSteps: cal != null ? lifestyleStepDelta(i.lifestyleSteps, cal) : 0, events: 0, _floorBase };
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
  const nonHousingTotal = nonHousingBase + healthcare + lifestyleSteps + events;
  const floorBase = parts._floorBase != null ? parts._floorBase : nonHousingBase + healthcare;

  // Floor policy (Wave 2, Task 4 — confirmed, do not revert):
  // The 0.35 safety floor and live-in savings credit apply to NON-HOUSING
  // essentials only.  Housing (rent / mortgage P&I / property tax / insurance /
  // maintenance) is a hard obligation added in full OUTSIDE the floor.
  const nonHousing = Math.max(0.35 * floorBase, nonHousingTotal - liveSav);
  return nonHousing + (Number(housing) || 0);
}

/**
 * Apply the stress-test return schedule for a given year index.
 *
 * Schedule:
 *   y <= 2 → STRESS_EARLY_DROP (-0.10)
 *   y <= 5 → realReturn - 0.02
 *   y >  5 → realReturn
 *
 * Single source of truth — simulate.js imports this rather than defining its own.
 *
 * @param {number} realReturn  - The base real return rate
 * @param {number} yearIndex   - Year index (0-based) within the simulation
 * @returns {number}
 */
export function stressReturnForYear(realReturn, yearIndex) {
  if (yearIndex <= 2) return STRESS_EARLY_DROP;
  if (yearIndex <= 5) return realReturn - 0.02;
  return realReturn;
}

/**
 * Resolve the per-year portfolio return for a simulation step.
 *
 * Resolution order:
 *   1. If ssOpt.returns is provided, use ssOpt.returns[y] (falling back to
 *      i.realReturn if the array has no entry at y). MC paths win — always first.
 *   2. Else if ssOpt.stress is set, apply the stress schedule via
 *      stressReturnForYear(realReturn, y). Stress wins over the return model.
 *   3. Else delegate to resolveYearReturn(i, y, ctx) which applies the
 *      returnModel (blended / glidepath / byBucket). Blended default returns
 *      i.realReturn — byte-identical to pre-Task-5 behavior.
 *
 * Wave 3 Task 5: extended signature to accept ctx = { yearsToRetire,
 * totalAccumYears, buckets } so glidepath and byBucket can resolve per-year.
 * ctx defaults to {} so every existing call site without ctx still compiles.
 *
 * @param {{ realReturn: number, returnModel?: object }} i   - Inputs object
 * @param {number} y                   - Year index (0-based) within the simulation
 * @param {{ returns?: number[], stress?: boolean }} ssOpt - Scenario options
 * @param {{ yearsToRetire?: number, totalAccumYears?: number, buckets?: object }} [ctx]
 * @returns {number}
 */
export function yearReturn(i, y, ssOpt, ctx = {}) {
  if (ssOpt.returns) {
    return ssOpt.returns[y] ?? i.realReturn;
  }
  if (ssOpt.stress) {
    return stressReturnForYear(i.realReturn, y);
  }
  return resolveYearReturn(i, y, ctx);
}
