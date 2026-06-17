import { STRESS_EARLY_DROP, TAX_YEAR } from "../retirementData.js";
import { calculateFederalTaxYear } from "./tax.js";
import { ownBenefitAtClaimMonthly, piaFromIncome, spousalBenefitAtClaimMonthly } from "./socialSecurity.js";
import { drsEligibilityNote, pensionERF, resolveAfc } from "./pension.js";
import { ltcSpendForYear, oneTimeSpendForYear, travelSpendForYear } from "./events.js";

export const stressReturnForYear = (realReturn, yearIndex) => {
  if (yearIndex <= 2) return STRESS_EARLY_DROP;
  if (yearIndex <= 5) return realReturn - 0.02;
  return realReturn;
};

export function benefits(i) {
  const piaA = i.ssModeA === "statement" ? (Number(i.ssFraA) || 0) / 12 : piaFromIncome(i.incomeA);
  const piaB = i.ssModeB === "statement" ? (Number(i.ssFraB) || 0) / 12 : piaFromIncome(i.incomeB);
  const ownA = ownBenefitAtClaimMonthly(piaA, i.claimA) * 12;
  const ownB = ownBenefitAtClaimMonthly(piaB, i.claimB) * 12;
  const spousalA = piaB > piaA ? spousalBenefitAtClaimMonthly(piaB, i.claimA) * 12 : 0;
  const spousalB = piaA > piaB ? spousalBenefitAtClaimMonthly(piaA, i.claimB) * 12 : 0;
  const ssA = Math.max(ownA, spousalA);
  const ssB = Math.max(ownB, spousalB);
  const erf = i.pensionOn ? pensionERF(i.pensionAge, i.pYears, i.plan) : 1;
  const pensionNote = i.pensionOn ? drsEligibilityNote(i.pensionAge, i.pYears, i.plan) : "";
  const multiplier = i.plan === 3 ? 0.01 : 0.02;
  const monthlyAfc = resolveAfc(i) / 12;
  const pension = i.pensionOn ? multiplier * i.pYears * monthlyAfc * erf * 12 : 0;
  return { piaA, piaB, ssA, ssB, pension, erf, pensionNote };
}

const plannedContribution = (i, workA, workB) => ((workA ? 0.5 : 0) + (workB ? 0.5 : 0)) * i.contrib;

const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal, statusOverride) =>
  calculateFederalTaxYear({
    status: statusOverride || i.status,
    ageA: aA,
    ageB: aB,
    wages,
    pension: pens,
    rental: rent,
    socialSecurity: ss,
    grossWithdrawal,
    tradFrac: i.tradFrac,
  }).tax;

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal, statusOverride) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0, statusOverride);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal, statusOverride) >= need;
  if (!covers(hi)) return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride) };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride) };
};

export function spendingNeed(i, ageA, ageB, liveSav = 0, isSurvivor = false) {
  const base = i.incomeHH * i.targetPct;
  const perPersonHC = Math.max(0, (i.hcPre - i.hcPost)) / 2;
  // After a survivor transition only one person remains; assume the younger
  // spouse survives, so only their pre-65 healthcare gap is counted.
  const under65 = isSurvivor
    ? (Math.min(ageA, ageB) < 65 ? 1 : 0)
    : (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0);
  const hcBump = perPersonHC * under65 * 12;
  return Math.max(0.35 * base, base + hcBump - liveSav);
}

export function simulate(i, ssOpt) {
  const haircut = ssOpt.haircut == null ? 1 : ssOpt.haircut;
  const cutYear = ssOpt.cutYear == null ? 9999 : ssOpt.cutYear;
  const { ssA: ssAfull, ssB: ssBfull, pension: pensFull } = benefits(i);
  const end = Math.max(95 - i.ageA, 95 - i.ageB);
  let bal = Number(i.savings) || 0;
  let depAge = null;
  let fullyRetAge = null;
  let balAtFullRet = null;
  const rows = [];

  const retireCal = TAX_YEAR + Math.max(i.stopA - i.ageA, i.stopB - i.ageB);

  for (let y = 0; y <= end; y++) {
    const aA = i.ageA + y;
    const aB = i.ageB + y;
    const cal = TAX_YEAR + y;
    const workA = aA < i.stopA;
    const workB = aB < i.stopB;
    const salA = workA ? i.incomeA : 0;
    const salB = workB ? i.incomeB : 0;
    const wages = salA + salB;
    const pens = i.pensionOn && aB >= i.pensionAge ? pensFull : 0;
    const ssFac = cal >= cutYear ? haircut : 1;
    const ssAy = aA >= i.claimA ? ssAfull * ssFac : 0;
    const ssBy = aB >= i.claimB ? ssBfull * ssFac : 0;
    const isSurvivor = !!(i.survivor && i.survivor.on && cal >= Number(i.survivor.year));
    let ssAyEff = ssAy;
    let ssByEff = ssBy;
    if (isSurvivor) {
      const larger = Math.max(ssAy, ssBy);
      ssAyEff = larger;
      ssByEff = 0;
    }
    const yearStatus = isSurvivor ? "single" : i.status;
    // DRS survivor annuity: in survivor years the pension continues only at the
    // elected percentage (default life-only = 0%).
    const pensEff = isSurvivor ? pens * ((Number(i.survivor.pensionPct ?? 0)) / 100) : pens;
    let rent = 0;
    let liveSav = 0;
    let sellLump = 0;
    for (const p of (i.inher || [])) {
      if (p.type === "rent" && cal >= p.year) rent += p.rent;
      if (p.type === "live" && cal >= p.year) liveSav += p.live;
      if (p.type === "sell" && cal === p.year) sellLump += p.sell;
    }
    const extraSpend =
      travelSpendForYear(i.travel, cal, retireCal)
      + oneTimeSpendForYear(i.events, cal)
      + ltcSpendForYear(i.ltc, aA, i.ltcAnnual);
    const need = spendingNeed(i, aA, aB, liveSav, isSurvivor) + extraSpend;
    const yearReturn = ssOpt.returns
      ? (ssOpt.returns[y] ?? i.realReturn)
      : ssOpt.stress
        ? stressReturnForYear(i.realReturn, y)
        : i.realReturn;
    bal = bal * (1 + yearReturn) + sellLump;

    const plannedContrib = plannedContribution(i, workA, workB);
    const taxBeforeWithdrawal = taxForYear(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, 0, yearStatus);
    const afterTaxBeforeWithdrawal = wages + pensEff + rent + ssAyEff + ssByEff - taxBeforeWithdrawal;
    const contrib = Math.min(plannedContrib, Math.max(0, afterTaxBeforeWithdrawal - need));
    bal += contrib;

    const { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, need, bal, yearStatus);
    bal -= wd;
    if (bal < 1) bal = 0;
    if (!workA && !workB && fullyRetAge === null) {
      fullyRetAge = aA;
      balAtFullRet = bal;
    }
    const afterTaxCash = wages + pensEff + rent + ssAyEff + ssByEff + wd - tax;
    if (bal <= 0 && depAge === null && afterTaxCash < need) depAge = aA;
    rows.push({
      aA, aB, cal, salA, salB, rent, pens: pensEff, ssA: ssAyEff, ssB: ssByEff, survivor: isSurvivor,
      wd: Math.round(wd), bal: Math.round(bal), need: Math.round(need),
      extraSpend: Math.round(extraSpend),
      tax: Math.round(tax), contrib: Math.round(contrib), sellLump: Math.round(sellLump),
    });
  }

  return { rows, depAge, fullyRetAge: fullyRetAge ?? i.ageA, balAtFullRet: balAtFullRet ?? bal };
}

export function steadyStartAgeA(i) {
  const bClaimAsAgeA = i.claimB + (i.ageA - i.ageB);
  const pensionAsAgeA = i.pensionOn ? i.pensionAge + (i.ageA - i.ageB) : i.stopA;
  return Math.max(i.stopA, i.stopB + (i.ageA - i.ageB), i.claimA, bClaimAsAgeA, pensionAsAgeA);
}

export function steadyState(i, sim) {
  const b = benefits(i);
  const startAgeA = steadyStartAgeA(i);
  const startCal = TAX_YEAR + (startAgeA - i.ageA);
  const row = sim.rows.find((r) => r.aA >= startAgeA) ?? sim.rows[sim.rows.length - 1];
  let sellAfter = 0;
  let rentInc = 0;
  let liveSav = 0;
  for (const p of i.inher) {
    if (p.type === "sell" && p.year > row.cal) sellAfter += p.sell;
    if (p.type === "rent" && p.year <= row.cal) rentInc += p.rent;
    if (p.type === "live" && p.year <= row.cal) liveSav += p.live;
  }
  const FV = row.bal + sellAfter;
  const wd = FV * i.swr;
  // The simulated row already has the SS haircut and any survivor step-up
  // applied (the smaller check is zeroed in survivor years), so read SS straight
  // from it rather than recomputing from benefits() — single source of truth.
  const ssA = row.ssA;
  const ssB = row.ssB;
  const ssHouse = ssA + ssB;
  // Pension from the row already reflects any survivor-annuity reduction.
  const pension = row.pens;
  const guaranteed = ssHouse + pension;
  const recurring = guaranteed + rentInc;
  const gross = recurring + wd;
  const ageA = row.aA;
  const ageB = row.aB;
  // The chosen row already carries the survivor flag from the simulation; in a
  // survivor year the household files single, so the headline tax must match.
  const yearStatus = row.survivor ? "single" : i.status;
  const taxDetails = calculateFederalTaxYear({
    status: yearStatus,
    ageA,
    ageB,
    pension,
    rental: rentInc,
    socialSecurity: ssHouse,
    grossWithdrawal: wd,
    tradFrac: i.tradFrac,
  });
  const guaranteedTaxDetails = calculateFederalTaxYear({
    status: yearStatus,
    ageA,
    ageB,
    pension,
    rental: 0,
    socialSecurity: ssHouse,
    grossWithdrawal: 0,
    tradFrac: i.tradFrac,
  });
  const targetNeed = row.need; // sourced from the simulated row so events/healthcare flow through
  const net = gross - taxDetails.tax;
  return {
    FV, wd, ssA, ssB, pension, erf: b.erf, pensionNote: b.pensionNote,
    ssHouse, guaranteed, recurring, rentInc, liveSav, gross,
    net,
    sustainableCapacity: net,
    modeledSpend: targetNeed,
    surplus: Math.max(0, net - targetNeed),
    guaranteedNet: guaranteed - guaranteedTaxDetails.tax,
    tax: taxDetails.tax,
    taxDetails,
    target: i.incomeHH * i.targetPct,
    targetNeed,
    startAgeA,
    startAgeB: ageB,
    startCal: Math.round(startCal),
  };
}
