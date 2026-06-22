/**
 * Composed residence-income-tax layer. Composes ON TOP of the federal engine — never
 * forks it. Task 2 ships only the flat-rate fallback (numerically identical to the
 * old in-engine `stateRate × taxableIncome`); Task 6 adds the typed per-source rules.
 *
 * Typed path (profile != null):
 *   Working years (base.isRetirement === false): wages × profile.wageRate
 *   Retirement years (default / base.isRetirement !== false):
 *     state base = (taxesSS ? ssTaxablePortion : 0)
 *                + max(0, pension − pensionExclusionAmount)   [exclusion:"full" removes all]
 *                + (taxesTradWithdrawal ? deferredWithdrawal : 0)
 *                + otherOrdinary
 *     × profile.retireRate
 *   Roth (the non-deferred share) is NEVER included in the residence base.
 *
 * Flat fallback (profile == null): flatRate × taxableIncome — byte-identical to the
 * pre-Task-6 in-engine stateRate path; unchanged for international overrides / no typed entry.
 *
 * @param {object|null} profile - a US_STATE_TAX entry, INTL_TAX entry, or null for the flat fallback
 * @param {{ taxableIncome?:number, ss?:number, pension?:number, deferredWithdrawal?:number, wages?:number, isRetirement?:boolean, ssTaxablePortion?:number, otherOrdinary?:number, flatRate?:number }} base
 * @returns {number}
 */
export function residenceTaxForYear(profile, base) {
  if (!profile) {
    // Flat fallback: unchanged from Task 2.
    return (Number(base.flatRate) || 0) * (Number(base.taxableIncome) || 0);
  }
  if (base.isRetirement === false) {
    // Working years: wages taxed at the work-state wage rate.
    return (Number(profile.wageRate) || 0) * (Number(base.wages) || 0);
  }
  // Retirement years: income-type-aware base.
  const ss = profile.taxesSS ? (Number(base.ssTaxablePortion ?? base.ss) || 0) : 0;
  const pensionGross = Number(base.pension) || 0;
  const pensionExcl = profile.pensionExclusion === "full"
    ? pensionGross
    : Math.min(pensionGross, Number(profile.pensionExclusion) || 0);
  const pension = Math.max(0, pensionGross - pensionExcl);
  const deferred = profile.taxesTradWithdrawal ? (Number(base.deferredWithdrawal) || 0) : 0;
  const other = Number(base.otherOrdinary) || 0;
  const stateBase = ss + pension + deferred + other;
  return (Number(profile.retireRate) || 0) * Math.max(0, stateBase);
}
