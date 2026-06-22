import { US_STATE_TAX, INTL_TAX } from "../retirementData.js";

/**
 * Resolve the active tax jurisdiction for a given calendar year.
 *
 * Before relocationYear: working jurisdiction (workLoc US state).
 * From relocationYear on: retirement jurisdiction (stateCode US state, or INTL_TAX
 * by retireLoc, or null for the flat-path fallback).
 *
 * Returns { profile, propertyTaxRate, isRetirement }.
 *   profile: a typed US_STATE_TAX or INTL_TAX entry, or null (flat-path fallback).
 *   propertyTaxRate: from the active US-state profile, or 0 for international/none.
 *   isRetirement: true when cal >= i.relocationYear.
 *
 * The manual stateRate override always forces null (flat path), same as Task 6.
 */
export function activeJurisdiction(i, cal) {
  const isRetirement = cal >= (i.relocationYear ?? Infinity);

  // Manual override: power-user stateRate bypasses typed rules on BOTH sides.
  if (i.stateRate != null && i.stateRate !== "") {
    return { profile: null, propertyTaxRate: 0, isRetirement };
  }

  if (isRetirement) {
    // Retirement side: stateCode wins, then INTL_TAX, then null (flat path).
    const profile = i.stateCode && US_STATE_TAX[i.stateCode]
      ? US_STATE_TAX[i.stateCode]
      : (i.retireLoc && INTL_TAX[i.retireLoc] ? INTL_TAX[i.retireLoc] : null);
    const propertyTaxRate = (profile && !profile.isInternational)
      ? (profile.propertyTaxRate || 0)
      : 0;
    return { profile, propertyTaxRate, isRetirement };
  } else {
    // Working side: workLoc US state, or null.
    const profile = i.workLoc && US_STATE_TAX[i.workLoc] ? US_STATE_TAX[i.workLoc] : null;
    const propertyTaxRate = profile ? (profile.propertyTaxRate || 0) : 0;
    return { profile, propertyTaxRate, isRetirement };
  }
}
