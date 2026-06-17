import {
  BEND,
  DRS_ERF_30_PLUS,
  DRS_ERF_UNDER_30,
  FED,
  LOCATIONS,
  PROP,
  PROV,
  SENIOR_ADDON_MARRIED_PER_PERSON,
  SENIOR_ADDON_SINGLE,
  SENIOR_BONUS,
  SENIOR_BONUS_PHASEOUT,
  SS_CAP,
  STD,
  TAX_YEAR,
  TIERS,
} from "./retirementData.js";

export const lineItems = (l, stage) => [
  ["Rent -- 2-3BR, quiet area", l.m.rent],
  ["Groceries", l.m.groceries],
  ["Utilities + internet", l.m.utilities],
  [stage === "pre" ? "Healthcare -- before 65" : "Healthcare -- 65+", stage === "pre" ? l.hcPre : l.hcPost],
  ["Transport", l.m.transport],
  ["Dining out", l.m.dining],
  ["Entertainment", l.m.entertainment],
  ["Other / household", l.m.misc],
];

export const monthlyTotal = (l, stage) =>
  Object.values(l.m).reduce((a, b) => a + b, 0) + (stage === "pre" ? l.hcPre : l.hcPost);

export const tierFor = (ratio) => TIERS.find((t) => ratio < t.max);

export const travelSpendForYear = (travel, cal, retireCal) => {
  if (!travel || !travel.on) return 0;
  const amount = Number(travel.amount) || 0;
  const years = Number(travel.years) || 0;
  const idx = cal - retireCal; // 0-based year of retirement
  if (idx < 0 || idx >= years) return 0;
  if (travel.taper && idx >= 10) return 0.5 * amount;
  return amount;
};

export const oneTimeSpendForYear = (events, cal) =>
  (events || []).reduce(
    (sum, e) => (e && e.on && Number(e.year) === cal ? sum + (Number(e.amount) || 0) : sum),
    0,
  );

export const propEcon = (key, value) => {
  const m = PROP[key];
  return { sell: value * m.sellNet, rent: value * m.rentYield, live: m.rentMo * 12 - value * m.ownRate };
};

export const fedTax = (taxableIncome, status) => {
  const brackets = FED[status];
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i][0];
    const hi = i < brackets.length - 1 ? brackets[i + 1][0] : Infinity;
    if (taxableIncome > lo) tax += (Math.min(taxableIncome, hi) - lo) * brackets[i][1];
  }
  return tax;
};

export const piaFromIncome = (income) => {
  const aime = Math.min(Number(income) || 0, SS_CAP) / 12;
  return 0.9 * Math.min(aime, BEND[0])
    + 0.32 * Math.max(0, Math.min(aime, BEND[1]) - BEND[0])
    + 0.15 * Math.max(0, aime - BEND[1]);
};

export const ownBenefitAtClaimMonthly = (pia, claimAge) => {
  if (claimAge < 67) {
    const months = (67 - claimAge) * 12;
    const reduction = months <= 36
      ? months * (5 / 9) / 100
      : (36 * (5 / 9) + (months - 36) * (5 / 12)) / 100;
    return pia * (1 - reduction);
  }
  if (claimAge > 67) {
    const months = Math.min((claimAge - 67) * 12, 36);
    return pia * (1 + months * (2 / 3) / 100);
  }
  return pia;
};

export const spousalBenefitAtClaimMonthly = (workerPia, claimAge) => {
  const fullSpousal = 0.5 * workerPia;
  if (claimAge >= 67) return fullSpousal;
  const months = (67 - claimAge) * 12;
  const reduction = months <= 36
    ? months * (25 / 36) / 100
    : (36 * (25 / 36) + (months - 36) * (5 / 12)) / 100;
  return fullSpousal * (1 - reduction);
};

export const taxableSS = (otherIncome, socialSecurity, status) => {
  const provisional = otherIncome + 0.5 * socialSecurity;
  const [t1, t2] = PROV[status];
  if (provisional <= t1) return 0;
  if (provisional <= t2) return Math.min(0.5 * socialSecurity, 0.5 * (provisional - t1));
  return Math.min(
    0.85 * socialSecurity,
    0.85 * (provisional - t2) + Math.min(0.5 * socialSecurity, 0.5 * (t2 - t1)),
  );
};

export const seniorEligibleCount = (status, ageA, ageB) => {
  if (status === "single") return ageA >= 65 ? 1 : 0;
  return (ageA >= 65 ? 1 : 0) + (ageB >= 65 ? 1 : 0);
};

export const standardDeduction = ({ status, ageA, ageB, agi }) => {
  const eligible = seniorEligibleCount(status, ageA, ageB);
  const seniorAddon = status === "single"
    ? (eligible ? SENIOR_ADDON_SINGLE : 0)
    : eligible * SENIOR_ADDON_MARRIED_PER_PERSON;
  let seniorBonus = eligible * SENIOR_BONUS;
  const phaseStart = SENIOR_BONUS_PHASEOUT[status];
  if (agi > phaseStart) seniorBonus = Math.max(0, seniorBonus - (agi - phaseStart) * 0.06);
  return STD[status] + seniorAddon + seniorBonus;
};

export const calculateFederalTaxYear = ({
  status,
  ageA,
  ageB,
  wages = 0,
  pension = 0,
  rental = 0,
  grossWithdrawal = 0,
  tradFrac = 0.7,
  socialSecurity = 0,
}) => {
  const ordinary = wages + pension + rental + grossWithdrawal * tradFrac;
  const taxableSocialSecurity = taxableSS(ordinary, socialSecurity, status);
  const agi = ordinary + taxableSocialSecurity;
  const deduction = standardDeduction({ status, ageA, ageB, agi });
  const taxableIncome = Math.max(0, agi - deduction);
  const tax = fedTax(taxableIncome, status);
  return { ordinary, taxableSocialSecurity, agi, deduction, taxableIncome, tax };
};

export const pensionERF = (age, years, plan = 2) => {
  if (age >= 65) return 1;
  if (age < 55) return 0;
  if (years >= 30) return DRS_ERF_30_PLUS[Math.round(age)] ?? 0;
  const minEarlyYears = plan === 3 ? 10 : 20;
  if (years < minEarlyYears) return 0;
  return DRS_ERF_UNDER_30[Math.round(age)] ?? 0;
};

export const drsEligibilityNote = (age, years, plan = 2) => {
  if (plan === 2 && years < 5) return "Plan 2 generally needs 5 years of service to vest.";
  if (plan === 3 && years < 10) return "Plan 3 generally needs 10 years to vest, with limited exceptions.";
  if (age < 55) return "DRS retirement cannot start before age 55 in this simplified model.";
  if (age < 65 && years < (plan === 3 ? 10 : 20)) {
    return plan === 3
      ? "Plan 3 early retirement needs at least 10 years of service."
      : "Plan 2 early retirement before 65 needs at least 20 years of service.";
  }
  return "";
};

// AFC is the DRS member's (spouse / person B) average final compensation. When the
// user hasn't entered one, fall back to the spouse's current income: the model holds
// wages flat in real terms, so today's salary is the planning proxy for final-average
// pay. An explicit numeric entry always overrides the seed.
export const afcIsAuto = (i) => i.afc === null || i.afc === undefined || i.afc === "";
export const resolveAfc = (i) =>
  afcIsAuto(i) ? Number(i.incomeB) || 0 : Number(i.afc) || 0;

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

const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal) =>
  calculateFederalTaxYear({
    status: i.status,
    ageA: aA,
    ageB: aB,
    wages,
    pension: pens,
    rental: rent,
    socialSecurity: ss,
    grossWithdrawal,
    tradFrac: i.tradFrac,
  }).tax;

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal) >= need;
  if (!covers(hi)) return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi) };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi) };
};

export function spendingNeed(i, ageA, ageB, liveSav = 0) {
  const base = i.incomeHH * i.targetPct;
  const perPersonHC = Math.max(0, (i.hcPre - i.hcPost)) / 2;
  const under65 = (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0);
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
    let rent = 0;
    let liveSav = 0;
    let sellLump = 0;
    for (const p of i.inher) {
      if (p.type === "rent" && cal >= p.year) rent += p.rent;
      if (p.type === "live" && cal >= p.year) liveSav += p.live;
      if (p.type === "sell" && cal === p.year) sellLump += p.sell;
    }

    const retireCal = TAX_YEAR + Math.max(i.stopA - i.ageA, i.stopB - i.ageB);
    const extraSpend =
      travelSpendForYear(i.travel, cal, retireCal) + oneTimeSpendForYear(i.events, cal);
    const need = spendingNeed(i, aA, aB, liveSav) + extraSpend;
    bal = bal * (1 + i.realReturn) + sellLump;

    const plannedContrib = plannedContribution(i, workA, workB);
    const taxBeforeWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ssAy + ssBy, 0);
    const afterTaxBeforeWithdrawal = wages + pens + rent + ssAy + ssBy - taxBeforeWithdrawal;
    const contrib = Math.min(plannedContrib, Math.max(0, afterTaxBeforeWithdrawal - need));
    bal += contrib;

    const { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pens, rent, ssAy + ssBy, need, bal);
    bal -= wd;
    if (bal < 1) bal = 0;
    if (!workA && !workB && fullyRetAge === null) {
      fullyRetAge = aA;
      balAtFullRet = bal;
    }
    const afterTaxCash = wages + pens + rent + ssAy + ssBy + wd - tax;
    if (bal <= 0 && depAge === null && afterTaxCash < need) depAge = aA;
    rows.push({
      aA, aB, cal, salA, salB, rent, pens, ssA: ssAy, ssB: ssBy,
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

export function steadyState(i, sim, haircut, cutYear = 9999) {
  const b = benefits(i);
  const startAgeA = steadyStartAgeA(i);
  const startCal = TAX_YEAR + (startAgeA - i.ageA);
  const row = sim.rows.find((r) => r.aA >= startAgeA) ?? sim.rows[sim.rows.length - 1];
  let sellAfter = 0;
  let rentInc = 0;
  let liveSav = 0;
  for (const p of i.inher) {
    if (p.type === "sell" && p.year > row.cal) sellAfter += p.sell;
    if (p.type === "rent") rentInc += p.rent;
    if (p.type === "live") liveSav += p.live;
  }
  const FV = row.bal + sellAfter;
  const wd = FV * i.swr;
  const ssFactor = row.cal >= cutYear ? haircut : 1;
  const ssA = b.ssA * ssFactor;
  const ssB = b.ssB * ssFactor;
  const ssHouse = ssA + ssB;
  const guaranteed = ssHouse + b.pension;
  const recurring = guaranteed + rentInc;
  const gross = recurring + wd;
  const ageA = row.aA;
  const ageB = row.aB;
  const taxDetails = calculateFederalTaxYear({
    status: i.status,
    ageA,
    ageB,
    pension: b.pension,
    rental: rentInc,
    socialSecurity: ssHouse,
    grossWithdrawal: wd,
    tradFrac: i.tradFrac,
  });
  const guaranteedTaxDetails = calculateFederalTaxYear({
    status: i.status,
    ageA,
    ageB,
    pension: b.pension,
    rental: 0,
    socialSecurity: ssHouse,
    grossWithdrawal: 0,
    tradFrac: i.tradFrac,
  });
  const targetNeed = spendingNeed(i, ageA, ageB, liveSav);
  return {
    FV, wd, ssA, ssB, pension: b.pension, erf: b.erf, pensionNote: b.pensionNote,
    ssHouse, guaranteed, recurring, rentInc, liveSav, gross,
    net: gross - taxDetails.tax,
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

export function resolveSocialSecurityScenario(s) {
  const effHaircut = s.ssMode === "full"
    ? 1
    : s.ssMode === "trustees"
      ? 0.81
      : Math.max(0, Math.min(1, (Number(s.ssHaircut) || 0) / 100));
  const effCutYear = s.ssMode === "full" ? 9999 : (Number(s.ssCutYear) || 2034);
  return { effHaircut, effCutYear };
}

export function buildInheritanceInputs(s) {
  const out = [];
  for (const key of ["tx", "at"]) {
    const p = s[key];
    if (!p.on) continue;
    const e = propEcon(key, Number(p.value) || 0);
    out.push({ key, year: Number(p.year) || 2038, type: p.strategy, sell: e.sell, rent: e.rent, live: e.live });
  }
  return out;
}

export function calculatePlan(s) {
  const incomeHH = (Number(s.incomeA) || 0) + (Number(s.incomeB) || 0);
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const inher = buildInheritanceInputs(s);
  const inp = { ...s, incomeHH, inher, hcPre: retLocObj.hcPre, hcPost: retLocObj.hcPost };
  const { effHaircut, effCutYear } = resolveSocialSecurityScenario(s);
  const trustCut = Number(s.ssCutYear) || 2034;
  const simChosen = simulate(inp, { haircut: effHaircut, cutYear: effCutYear });
  const simFull = simulate(inp, { haircut: 1, cutYear: 9999 });
  const simTrust = simulate(inp, { haircut: 0.81, cutYear: trustCut });
  const simNone = simulate(inp, { haircut: 0, cutYear: TAX_YEAR });
  return {
    incomeHH,
    retLocObj,
    inher,
    inp,
    effHaircut,
    effCutYear,
    simChosen,
    simFull,
    simTrust,
    simNone,
    steady: steadyState(inp, simChosen, effHaircut, effCutYear),
    sFull: steadyState(inp, simFull, 1, 9999),
    sTrust: steadyState(inp, simTrust, 0.81, trustCut),
    sNone: steadyState(inp, simNone, 0, TAX_YEAR),
  };
}
