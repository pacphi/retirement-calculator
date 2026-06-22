import { TAX_YEAR } from "../retirementData.js";

/**
 * Maximum additional uniform annual spend (today's dollars) the plan can absorb
 * and still reach `horizonAge`. Binary-searches a single lifestyle step (from the
 * current year) — the same mechanism as C2 — so the answer is consistent with the
 * lifestyle controls. Negative result ⇒ the plan is already short.
 *
 * @param {object} inp        - buildPlanInputs output
 * @param {function} simulate - the engine
 * @param {number} horizonAge
 * @param {object} ssOpt      - scenario options ({ haircut, cutYear })
 * @returns {{ delta:number, depAge:number|null, lastsToHorizon:boolean }}
 */
export function spendingHeadroom(inp, simulate, horizonAge, ssOpt) {
  const withDelta = (d) => ({
    ...inp,
    lifestyleSteps: [...(inp.lifestyleSteps || []), { id: "_headroom", fromYear: TAX_YEAR, deltaAnnual: d, on: true }],
  });
  const solventAt = (d) => {
    const sim = simulate(withDelta(d), ssOpt);
    return sim.depAge == null || sim.depAge >= horizonAge;
  };

  const base = simulate(inp, ssOpt);
  const baseSolvent = base.depAge == null || base.depAge >= horizonAge;

  // `withDelta(0)` is a genuine no-op — a zero-delta lifestyle step adds 0 to the
  // need — so `solventAt(0) === baseSolvent` and the bracket invariant (lo solvent,
  // hi insolvent) holds in both search directions.
  // Bracket: search up to +$200k/yr of extra spend, or down to -$200k.
  let lo, hi;
  if (baseSolvent) {
    lo = 0; hi = 200000;
    if (solventAt(hi)) return { delta: hi, depAge: simulate(withDelta(hi), ssOpt).depAge, lastsToHorizon: true };
  } else {
    lo = -200000; hi = 0;
    if (!solventAt(lo)) return { delta: lo, depAge: base.depAge, lastsToHorizon: false };
  }

  for (let n = 0; n < 28; n++) {
    const mid = (lo + hi) / 2;
    if (solventAt(mid)) lo = mid; else hi = mid;
  }
  // After bisection `lo` is always the most-extreme solvent delta, so `solventAt(lo)`
  // is trivially true. The honest answer is whether the *baseline* plan reaches the
  // horizon: a solvent base only bisects with a positive delta (⇒ true); an insolvent
  // base only bisects with a negative delta (⇒ false).
  const sim = simulate(withDelta(lo), ssOpt);
  return { delta: Math.round(lo), depAge: sim.depAge, lastsToHorizon: baseSolvent };
}
