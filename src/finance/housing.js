import { TAX_YEAR, HOME_SELL_NET, HOME_RENT_YIELD } from "../retirementData.js";

/**
 * Outstanding mortgage principal at the start of calendar year `cal`.
 * Formula: P·[(1+r)^n − (1+r)^p] / ((1+r)^n − 1), where r=monthly rate,
 * n=total months, p=months elapsed (clamped to [0,n]). Returns 0 if before
 * startYear payments or after payoff.
 */
export function remainingBalance(mortgage, cal) {
  const m = mortgage || {};
  const P = Number(m.principal) || 0;
  const n = (Number(m.termYears) || 0) * 12;
  if (P <= 0 || n <= 0) return 0;
  const startYear = Number(m.startYear) || TAX_YEAR;
  const p = Math.max(0, Math.min(n, (cal - startYear) * 12));
  if (p >= n) return 0; // paid off
  const r = (Number(m.ratePct) || 0) / 100 / 12;
  if (r === 0) return P * (1 - p / n);
  const f = Math.pow(1 + r, n);
  const fp = Math.pow(1 + r, p);
  return P * (f - fp) / (f - 1);
}

/** Standard monthly mortgage P&I. 0 if principal/term ≤ 0; rate 0 ⇒ even principal. */
export function monthlyPI(principal, ratePct, termYears) {
  const P = Number(principal) || 0;
  const n = (Number(termYears) || 0) * 12;
  if (P <= 0 || n <= 0) return 0;
  const r = (Number(ratePct) || 0) / 100 / 12;
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

/** Calendar year P&I ends (P&I is 0 from this year on). */
export function payoffYear(mortgage) {
  const start = Number(mortgage?.startYear) || TAX_YEAR;
  return start + (Number(mortgage?.termYears) || 0);
}

/**
 * Annual real housing cost in calendar year `cal`. Mortgage P&I is the one nominal
 * flow — deflated by (1+inflation)^(cal−TAX_YEAR) and zeroed from payoffYear on.
 * Rent / property tax / insurance / maintenance are real-flat.
 *
 * The four returned fields are NON-OVERLAPPING: `other` excludes propertyTax, so
 * `total = pi + propertyTax + other` (= pi + rent + propertyTax + insurance + maintenance).
 *
 * @returns {{ total:number, pi:number, propertyTax:number, other:number }}
 */
export function housingCostForYear(housing, cal, inflation, propertyTaxRate = 0) {
  if (!housing) return { total: 0, pi: 0, propertyTax: 0, other: 0 };
  const homeValue = Number(housing.homeValue) || 0;
  const propertyTax = (Number(propertyTaxRate) || 0) * homeValue;
  const insurance = Number(housing.insuranceAnnual) || 0;
  const maintenance = (Number(housing.maintenancePct) || 0) * homeValue;

  let pi = 0;
  let rent = 0;
  if (housing.tenure === "mortgage") {
    const m = housing.mortgage || {};
    if (cal < payoffYear(m)) {
      const nominalAnnual = monthlyPI(m.principal, m.ratePct, m.termYears) * 12;
      pi = nominalAnnual / Math.pow(1 + (Number(inflation) || 0), cal - TAX_YEAR);
    }
  } else if (housing.tenure === "rent") {
    rent = (Number(housing.rent) || 0) * 12;
  }
  // "own" ⇒ no pi/rent.
  const other = rent + insurance + maintenance;
  return { total: pi + propertyTax + other, pi, propertyTax, other };
}

/**
 * Resolve the effective dwelling and relocation cash effects for a given
 * calendar year. Extracted from simulate.js (lines ~206-259) so both the
 * projection loop and Places (Task 3) can call the same logic.
 *
 * @param {object} i     - Plan inputs (housing, retireHousing, relocationYear,
 *                         workLoc, stateCode, retireLoc, retLocObj, inher, inflation).
 * @param {number} cal   - Calendar year being resolved.
 * @param {object} ctx   - Pre-computed loop locals:
 *                           inheritedOwnOverride: object|null  (from the inher loop)
 *                           propertyTaxRate: number            (accepted for caller symmetry;
 *                             not consumed here — callers apply property tax via housingCostForYear)
 *
 * @returns {{
 *   housing:          object,           // effectiveHousing for this year
 *   overrideActive:   boolean,          // true when inheritedOwnOverride displaced baseHousing
 *   sellLump:         number,           // net home-sale proceeds (0 unless sell fires this year)
 *   keepRentalIncome: number,           // gross rental income from kept work home (0 or HOME_RENT_YIELD × homeValue)
 *   keepMortgageCost: number,           // landlord P&I on kept mortgage (0 or deflated annual P&I)
 *   transition:       "none"|"sell"|"keep",
 * }}
 */
export function resolveDwelling(i, cal, ctx) {
  const { inheritedOwnOverride } = ctx;

  // Determine whether a genuine relocation transition applies.
  // Mirrors simulate.js verbatim — do not alter the conditions.
  const reloAction = i.housing?.relocation?.action ?? "none";
  const reloSaleValue = Number(i.housing?.relocation?.saleValue) || 0;
  const jurisdictionDiffers = i.workLoc !== (i.stateCode ?? i.retireLoc);
  const workHomeOwned = i.housing?.tenure === "mortgage" || i.housing?.tenure === "own";
  const relocationTransition =
    jurisdictionDiffers && workHomeOwned
    && (reloAction === "keep" || (reloAction === "sell" && reloSaleValue > 0) || i.retireHousing != null);

  const defaultRetireRent = {
    tenure: "rent",
    rent: i.retLocObj?.m?.rent ?? i.housing?.rent ?? 0,
    mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
    homeValue: 0, insuranceAnnual: 0, maintenancePct: 0,
  };

  // From relocationYear on the residence is NEVER i.housing when a real transition
  // occurred (I1 fix). Order of precedence:
  //   inheritedOwnOverride > retireHousing > defaultRetireRent (transition)
  //                        > retireHousing > i.housing          (no transition)
  const retireResidence = relocationTransition
    ? (i.retireHousing ?? defaultRetireRent)
    : (i.retireHousing ?? i.housing);
  const baseHousing = cal < i.relocationYear ? i.housing : retireResidence;
  const effectiveHousing = inheritedOwnOverride ?? baseHousing;

  // Compute relocation cash effects — only when a real transition fired.
  let sellLump = 0;
  let keepRentalIncome = 0;
  let keepMortgageCost = 0;
  let transition = "none";

  if (relocationTransition) {
    if (reloAction === "sell" && cal === i.relocationYear) {
      const owed = remainingBalance(i.housing.mortgage, i.relocationYear);
      sellLump = Math.max(0, HOME_SELL_NET * reloSaleValue - owed);
      transition = "sell";
    } else if (reloAction === "keep" && cal >= i.relocationYear) {
      keepRentalIncome = HOME_RENT_YIELD * (Number(i.housing.homeValue) || 0);
      if (i.housing.tenure === "mortgage") {
        keepMortgageCost = housingCostForYear(i.housing, cal, i.inflation, 0).pi;
      }
      transition = "keep";
    }
  }

  return {
    housing: effectiveHousing,
    overrideActive: effectiveHousing !== baseHousing,
    sellLump,
    keepRentalIncome,
    keepMortgageCost,
    transition,
  };
}
