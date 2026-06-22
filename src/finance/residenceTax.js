/**
 * Composed residence-income-tax layer. Composes ON TOP of the federal engine — never
 * forks it. Task 2 ships only the flat-rate fallback (numerically identical to the
 * old in-engine `stateRate × taxableIncome`); Task 6 adds the typed per-source rules.
 *
 * @param {object|null} profile - a US_STATE_TAX entry, INTL_TAX entry, or null for the flat fallback
 * @param {{ taxableIncome:number, ss?:number, pension?:number, deferredWithdrawal?:number, wages?:number, isRetirement?:boolean, ssTaxablePortion?:number, otherOrdinary?:number, flatRate?:number }} base
 * @returns {number}
 */
export function residenceTaxForYear(profile, base) {
  if (!profile) {
    return (Number(base.flatRate) || 0) * (Number(base.taxableIncome) || 0);
  }
  // Task 6 replaces this with type-aware logic; until then, flat on taxable income.
  return (Number(profile.retireRate) || 0) * (Number(base.taxableIncome) || 0);
}
