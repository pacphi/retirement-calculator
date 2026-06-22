/**
 * Sum of active lifestyle step deltas for a calendar year. A step turns on at
 * `fromYear` and is permanent thereafter. Deltas are today's (real) dollars and
 * may be negative (a step-down). Disabled steps (`on === false`) are skipped.
 *
 * @param {Array<{fromYear:number, deltaAnnual:number, on?:boolean}>} steps
 * @param {number} cal - calendar year
 * @returns {number}
 */
export function lifestyleStepDelta(steps, cal) {
  return (steps || []).reduce(
    (sum, st) =>
      st && st.on !== false && (Number(st.fromYear) || 0) <= cal
        ? sum + (Number(st.deltaAnnual) || 0)
        : sum,
    0,
  );
}
