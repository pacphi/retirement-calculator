/**
 * Working-years accumulation summary, symmetric to the retirement headline.
 *
 * Working years = years where EITHER spouse is still working (OR semantics):
 * the household keeps accumulating until the LAST spouse stops. A row counts
 * while `aA < stopAgeA OR aB < stopAgeB`, where `aB = ageB + (r.aA - ageA)`.
 * Sums contributions and growth over those rows; balance at retirement is the
 * last working row's balance — the year before BOTH spouses are retired.
 *
 * @param {Array<{aA:number, contrib:number, growth:number, bal:number}>} rows
 * @param {number} stopAgeA
 * @param {number} ageA
 * @param {number} stopAgeB
 * @param {number} ageB
 * @returns {{ totalContrib:number, totalGrowth:number, balAtRet:number, blendedReturn:number, workingYears:number }}
 */
export function accumulationSummary(rows, stopAgeA, ageA, stopAgeB, ageB) {
  const working = (rows || []).filter((r) => {
    const aB = ageB + (r.aA - ageA);
    return r.aA < stopAgeA || aB < stopAgeB;
  });
  const totalContrib = working.reduce((s, r) => s + (r.contrib || 0), 0);
  const totalGrowth = working.reduce((s, r) => s + (r.growth || 0), 0);
  const balAtRet = working.length ? working[working.length - 1].bal : 0;
  // Effective blended real return realized over the working years (geometric).
  const startBal = working.length ? Math.max(1, balAtRet - totalContrib - totalGrowth) : 1;
  const n = working.length || 1;
  const blendedReturn = working.length === 0
    ? 0
    : Math.pow(Math.max(1e-9, balAtRet / startBal), 1 / n) - 1;
  return { totalContrib, totalGrowth, balAtRet, blendedReturn, workingYears: working.length };
}
