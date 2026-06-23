import { useMemo } from "react";
import { calculatePlan, monthlyTotal, tierFor } from "../calculatorCore.js";
import { accumulationSummary } from "../finance/accumulation.js";
import { retirementDwellingAnnualCost } from "../finance/housing.js";
import { spendingHeadroom } from "../finance/headroom.js";
import { buildPlanInputs } from "../finance/plan.js";
import { simulate } from "../finance/simulate.js";
import { LOCATIONS, SINGLE_COST_FACTOR } from "../retirementData.js";
import { C, SRC } from "../components/theme.js";

/**
 * usePlan(s)
 *
 * Pure plan-derivation hook. Wraps the calculatePlan call and all the
 * downstream derived-array useMemos that were previously inline in
 * RetirementCalculator.jsx. Dependency arrays are byte-identical to the
 * originals so recomputation timing is unchanged.
 *
 * @param {object} s - Full plan state from the root component
 * @param {boolean} couple - Whether to model as a couple (for locRows)
 * @param {string}  stage  - "pre" | "post" (for locRows)
 * @returns Derivation results consumed by the composition root and panels
 */
export function usePlan(s, couple, stage) {
  const calc = useMemo(() => calculatePlan(s), [s]);

  const {
    incomeHH, inher, simChosen, simFull, simTrust, simNone, simStress, simShock,
    steady, sFull, sTrust, sNone, effHaircut, effCutYear,
  } = calc;

  // Aliases used throughout the root JSX
  const simSS = simChosen;
  const simNo  = simNone;

  const sFactor = couple ? 1 : SINGLE_COST_FACTOR;

  const locRows = useMemo(() => {
    const hh = retirementDwellingAnnualCost(buildPlanInputs(s));
    const annualCost = (l) => {
      const base = monthlyTotal(l, stage) * 12 * sFactor;
      if (hh.basis === "rent") return base; // local rent stands; no substitution
      const localRentAnnual = (l.m.rent || 0) * 12 * sFactor; // remove this location's rent slice
      return base - localRentAnnual + hh.annual; // add YOUR fixed carrying cost
    };
    return LOCATIONS.map(l => {
      const cost = annualCost(l);
      const ratio = steady.net / cost;
      return { ...l, cost, ratio, tier: tierFor(ratio), hh };
    }).sort((a, b) => a.cost - b.cost);
  }, [s, steady.net, sFactor, stage]);

  const firstEvent = Math.min(s.stopA, s.stopB + (s.ageA - s.ageB));

  const compRows = useMemo(() => simSS.rows
    .filter(r => r.aA >= firstEvent - 2)
    .map(r => ({
      age: r.aA, ageB: r.aB,
      "Salary (you)": Math.round(r.salA), "Salary (spouse)": Math.round(r.salB),
      "Rental": Math.round(r.rent), "Pension": Math.round(r.pens),
      "SS (you)": Math.round(r.ssA), "SS (spouse)": Math.round(r.ssB),
      "Portfolio": (r.wdSpend ?? r.wd), need: r.need, extraSpend: r.extraSpend || 0,
    })), [simSS, firstEvent]);

  const hasEmergent = (s.events || []).some(e => e.on && e.emergent);

  const balRows = useMemo(() => simSS.rows.map((r, idx) => ({
    age: r.aA,
    withSS: r.bal,
    withoutSS: simNo.rows[idx] ? simNo.rows[idx].bal : 0,
    stress: simStress.rows[idx] ? simStress.rows[idx].bal : 0,
    shock: simShock.rows[idx] ? simShock.rows[idx].bal : 0,
  })), [simSS, simNo, simStress, simShock]);

  const invRows = useMemo(() => simSS.rows.map(r => ({
    age: r.aA,
    // Wave 3 D1: three real buckets for the stacked composition view.
    taxableBal: r.taxableBal ?? Math.max(0, (r.bal ?? 0) - (r.defBal ?? 0)),
    deferredBal: r.deferredBal ?? (r.defBal ?? 0),
    rothBal: r.rothBal ?? 0,
    // Legacy two-band keys (tax-deferred vs after-tax) kept for back-compat.
    deferred: r.defBal ?? 0,
    afterTax: Math.max(0, r.bal - (r.defBal ?? 0)),
    contrib: r.contrib || 0,
    growth: Math.max(0, r.growth || 0),
    spendDraw: -(r.wdSpend ?? r.wd ?? 0),
    forcedRmd: -(r.forcedRmd || 0),
    rmd: r.rmd || 0,
    // Wave 3 D2: years where guaranteed income exceeds need; surplus reinvested into taxable.
    reinvest: r.reinvest || 0,
  })), [simSS]);

  const incomeStack = useMemo(() => [
    { name: "Savings draw", value: Math.round(steady.wd), color: C.brass },
    ...(steady.rentInc > 0 ? [{ name: "Rental", value: Math.round(steady.rentInc), color: SRC.rent }] : []),
    { name: "Social Security", value: Math.round(steady.ssHouse), color: C.viridian },
    ...(s.pensionOn ? [{ name: "WA pension", value: Math.round(steady.pension), color: C.ink }] : []),
  ], [steady.wd, steady.rentInc, steady.ssHouse, steady.pension, s.pensionOn]);

  const headroom = useMemo(
    () => spendingHeadroom(calc.inp, simulate, Number(s.horizonAge) || 95, { haircut: effHaircut, cutYear: effCutYear }),
    [calc.inp, effHaircut, effCutYear, s.horizonAge],
  );

  const accumulation = useMemo(
    () => accumulationSummary(simSS.rows, s.stopA, s.ageA, s.stopB, s.ageB),
    [simSS, s.stopA, s.ageA, s.stopB, s.ageB],
  );

  // Year-1 retirement housing annual cost — used by the total-replacement slider.
  const retireHousingAnnual = useMemo(
    () => retirementDwellingAnnualCost(buildPlanInputs(s)).annual,
    [s],
  );

  return {
    calc,
    // calc destructure — exposed with identical names
    incomeHH, inher,
    simChosen, simFull, simTrust, simNone, simStress,
    steady, sFull, sTrust, sNone,
    effHaircut, effCutYear,
    // aliases
    simSS, simNo,
    // derived arrays
    locRows, compRows, balRows, invRows, incomeStack,
    hasEmergent,
    // pass-through used by caller
    sFactor,
    headroom,
    accumulation,
    retireHousingAnnual,
  };
}
