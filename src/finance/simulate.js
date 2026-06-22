import { TAX_YEAR, US_STATE_TAX, INTL_TAX } from "../retirementData.js";
import { composeNeed, spendingComponents, yearReturn } from "./seams.js";
import { calculateFederalTaxYear } from "./tax.js";
import { residenceTaxForYear } from "./residenceTax.js";
import { ownBenefitAtClaimMonthly, piaFromIncome, spousalBenefitAtClaimMonthly } from "./socialSecurity.js";
import { drsEligibilityNote, pensionERF, resolveAfc } from "./pension.js";
import { ltcSpendForYear, oneTimeSpendForYear, travelSpendForYear } from "./events.js";
import { requiredMinimum, rmdStartAge } from "./rmd.js";

/**
 * Resolve the typed residence-tax profile for retirement years.
 * An explicit `stateRate` override always wins ⇒ returns null so the flat i.taxRate
 * path (which already reflects the override) applies (per brief: "manual override →
 * keep the flat stateRate path"). Otherwise US stateCode wins over INTL_TAX; returns
 * null when no typed entry exists (flat path — identical to pre-Task-6 behaviour).
 * Task 8 will supply the per-year profile via activeJurisdiction; for now we resolve
 * it once from the plan inputs so the retirement years are type-aware.
 */
function retirementProfile(i) {
  // Manual override: power-user stateRate bypasses the typed rules (flat path).
  if (i.stateRate != null && i.stateRate !== "") return null;
  if (i.stateCode && US_STATE_TAX[i.stateCode]) return US_STATE_TAX[i.stateCode];
  if (i.retireLoc && INTL_TAX[i.retireLoc]) return INTL_TAX[i.retireLoc];
  return null;
}

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

// profile: a typed US_STATE_TAX or INTL_TAX entry, or null for the flat fallback.
// When profile is provided the year is a full-retirement year (no wages), so the
// federal engine is called with stateRate:0 and residenceTaxForYear adds the typed
// residence layer on top. The federal engine is NEVER forked.
const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal, statusOverride, year, profile) => {
  if (profile) {
    // Typed retirement path: federal (stateRate:0) + residence layer composed separately.
    const fedResult = calculateFederalTaxYear({
      status: statusOverride || i.status,
      ageA: aA,
      ageB: aB,
      wages,
      pension: pens,
      rental: rent,
      socialSecurity: ss,
      grossWithdrawal,
      tradFrac: i.tradFrac,
      year,
      stateRate: 0,
    });
    // Thread the deferred-withdrawal share into the residence base so income-type
    // rules (taxesTradWithdrawal, pensionExclusion) apply to the correct slice.
    const deferredWithdrawal = grossWithdrawal * (Number(i.tradFrac) || 0);
    const residenceTax = residenceTaxForYear(profile, {
      isRetirement: true,
      ss,
      ssTaxablePortion: fedResult.taxableSocialSecurity,
      pension: pens,
      deferredWithdrawal,
    });
    return fedResult.federalTax + residenceTax;
  }
  // Flat path: unchanged from pre-Task-6 (working years, no typed entry, or manual override).
  return calculateFederalTaxYear({
    status: statusOverride || i.status,
    ageA: aA,
    ageB: aB,
    wages,
    pension: pens,
    rental: rent,
    socialSecurity: ss,
    grossWithdrawal,
    tradFrac: i.tradFrac,
    year,
    stateRate: i.taxRate,
  }).tax;
};

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal, statusOverride, year, profile) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0, statusOverride, year, profile);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal, statusOverride, year, profile) >= need;
  const taxAtHi = taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile);
  if (income + hi - taxAtHi < need) return { withdrawal: hi, tax: taxAtHi };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile) };
};

export function spendingNeed(i, ageA, ageB, liveSav = 0, isSurvivor = false, survivorAge = null, ctx = {}) {
  const parts = spendingComponents(i, ageA, ageB, { isSurvivor, survivorAge, ...ctx });
  return composeNeed(parts, liveSav);
}

export function simulate(i, ssOpt) {
  const haircut = ssOpt.haircut == null ? 1 : ssOpt.haircut;
  const cutYear = ssOpt.cutYear == null ? 9999 : ssOpt.cutYear;
  const { ssA: ssAfull, ssB: ssBfull, pension: pensFull } = benefits(i);
  const horizon = Number(i.horizonAge) || 95;
  const end = Math.max(0, Math.max(horizon - i.ageA, horizon - i.ageB));
  let bal = Number(i.savings) || 0;
  // Track the pre-tax (tax-deferred) sub-balance separately so RMDs can be computed off
  // the IRS "prior year-end" base. Commingled-account simplification: one deferred pool,
  // RMDs driven by the older spouse's age (documented in docs/prd.md).
  let defBal = Math.min(bal, Number(i.taxDeferred) || 0);
  const olderAgeNow = Math.max(i.ageA, i.ageB);
  const rmdStart = rmdStartAge(TAX_YEAR - olderAgeNow);
  let depAge = null;
  let fullyRetAge = null;
  let balAtFullRet = null;
  const rows = [];

  // Life-expectancy model: derive each spouse's death year, who survives, and the
  // first/last death. The plan stops at the last death (capped by the horizon).
  const lifeOn = !!(i.life && i.life.on);
  const dYearA = lifeOn ? TAX_YEAR + (Number(i.life.deathAgeA) - i.ageA) : Infinity;
  const dYearB = lifeOn ? TAX_YEAR + (Number(i.life.deathAgeB) - i.ageB) : Infinity;
  const firstDeathCal = Math.min(dYearA, dYearB);
  const survivorIsA = dYearA >= dYearB; // A outlives (or ties) B
  const lifePensionPct = lifeOn ? Number(i.life.pensionPct ?? 0) : 0;
  const endEff = lifeOn
    ? Math.min(end, Math.max(0, Math.max(dYearA, dYearB) - TAX_YEAR))
    : end;

  const retireAgeA = Math.max(i.stopA, i.stopB + (i.ageA - i.ageB));
  // Typed retirement-year profile resolved once. null → flat stateRate path (unchanged).
  // Task 8 will replace this with a per-year activeJurisdiction lookup.
  const retireProf = retirementProfile(i);

  for (let y = 0; y <= endEff; y++) {
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
    const isSurvivor = lifeOn
      ? cal >= firstDeathCal
      : !!(i.survivor && i.survivor.on && cal >= Number(i.survivor.year));
    let ssAyEff = ssAy;
    let ssByEff = ssBy;
    if (isSurvivor) {
      const larger = Math.max(ssAy, ssBy);
      ssAyEff = larger;
      ssByEff = 0;
    }
    const yearStatus = isSurvivor ? "single" : i.status;
    // DRS survivor annuity: the pension steps down to the elected percentage only
    // once the pension-holder (spouse B) has died. If B is the survivor it stays
    // whole. Legacy survivor model lacks an identity, so it reduces from the death
    // year as before.
    const pensHolderDead = lifeOn ? cal >= dYearB : isSurvivor;
    const survPensionPct = lifeOn ? lifePensionPct : Number(i.survivor?.pensionPct ?? 0);
    const pensEff = pensHolderDead ? pens * (survPensionPct / 100) : pens;
    let rent = 0;
    let sellLump = 0;
    // Task 5 (Wave 2): track the first active "live" entry so we can build an
    // inheritedOwnOverride below. Only the first active entry is used (one home at a time).
    let inheritedOwnOverride = null;
    for (const p of (i.inher || [])) {
      if (p.type === "rent" && cal >= p.year) rent += p.rent;
      if (p.type === "live" && cal > p.year && inheritedOwnOverride === null) {
        // Year+1 convention: skip the relocation/transition year (same as the old liveSav logic).
        // Build an owned-tenure override using the inherited home's value and the household's
        // insurance/maintenance rates. Property-tax rate comes from activePropertyTaxRate,
        // which is already 0 for international properties (Austria) per Task 4 / plan.js.
        // The old flat liveSav credit is REMOVED here — the override replaces it with an
        // explicit owned carrying cost, preventing double-counting.
        inheritedOwnOverride = {
          tenure: "own",
          homeValue: p.homeValue || 0,
          insuranceAnnual: i.housing?.insuranceAnnual || 0,
          maintenancePct: p.ownRate || (i.housing?.maintenancePct || 0),
        };
      }
      if (p.type === "sell" && cal === p.year) sellLump += p.sell;
    }
    // Resolve the effective housing inputs for this year. When a live-in inheritance is
    // active, use the inheritedOwnOverride (Task 5); otherwise use i.housing as before.
    // Task 8 will extend this to compose: cal < relocationYear ? housing : (inheritedOwnOverride ?? retireHousing ?? defaultRetireRent).
    const effectiveHousing = inheritedOwnOverride ?? i.housing;
    const extraSpend =
      travelSpendForYear(i.travel, cal)
      + oneTimeSpendForYear(i.events, cal, { includeEmergent: ssOpt.includeEmergent ?? false })
      + ltcSpendForYear(i.ltc, aA, i.ltcAnnual);
    const survAge = lifeOn && isSurvivor ? (survivorIsA ? aA : aB) : null;
    // Wave 2 (Task 4): thread inflation + activePropertyTaxRate so housingCostForYear
    // inside spendingComponents can deflate mortgage P&I and compute property tax.
    // i.inflation is a real engine input that deflates nominal P&I only — it does
    // not compound rent, insurance, maintenance, or any other spending line.
    //
    // Task 5: when a live-in inheritance is active, override i.housing with the
    // inheritedOwnOverride so spendingComponents prices the inherited home as owned
    // (carrying cost only) rather than applying the old flat liveSav credit.
    const overrideActive = effectiveHousing !== i.housing;
    const iEffective = overrideActive ? { ...i, housing: effectiveHousing } : i;
    // I1 fix: PROP.ownRate already bundles property tax + insurance + maintenance into
    // maintenancePct, so don't apply the state property-tax rate again to an inherited
    // owned home — that would double-count property tax (e.g. a US "tx" home once Task
    // 7/8 turns on US property tax). The inherited owned carrying cost is therefore
    // ownRate × homeValue exactly, for both international (rate already 0) and US homes.
    const effPropertyTaxRate = overrideActive ? 0 : i.activePropertyTaxRate;
    const need = spendingNeed(iEffective, aA, aB, 0, isSurvivor, survAge, {
      retireAgeA,
      cal,
      inflation: i.inflation,
      propertyTaxRate: effPropertyTaxRate,
    }) + extraSpend;
    const yr = yearReturn(i, y, ssOpt);
    // The deferred pool's prior year-end value is the IRS base for this year's RMD.
    const defBalStart = defBal;
    const growth = bal * yr; // investment growth this year (excludes the sale lump)
    bal = bal * (1 + yr) + sellLump;
    defBal = defBal * (1 + yr); // sale proceeds are taxable savings, not deferred

    const plannedContrib = plannedContribution(i, workA, workB);
    // Pass the typed profile only for full-retirement years (both spouses stopped working).
    // Working years keep the flat stateRate path; Task 8 will add the work-state wage face.
    const yearProfile = (!workA && !workB) ? retireProf : null;
    const taxBeforeWithdrawal = taxForYear(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, 0, yearStatus, cal, yearProfile);
    const afterTaxBeforeWithdrawal = wages + pensEff + rent + ssAyEff + ssByEff - taxBeforeWithdrawal;
    const contrib = Math.min(plannedContrib, Math.max(0, afterTaxBeforeWithdrawal - need));
    bal += contrib;
    defBal += contrib * i.tradFrac;

    const olderAge = olderAgeNow + y;
    const rmd = (defBalStart > 0 && olderAge >= rmdStart) ? requiredMinimum(defBalStart, olderAge) : 0;

    let { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, need, bal, yearStatus, cal, yearProfile);
    bal -= wd;
    // RMD floor: a required distribution can only raise the year's draw. Any forced
    // amount beyond the need-based deferred draw is fully taxable ordinary income; the
    // after-tax surplus is reinvested into the taxable bucket.
    const needDeferredDraw = wd * i.tradFrac;
    let forcedRmd = 0;
    if (rmd > needDeferredDraw) {
      forcedRmd = Math.min(Math.min(rmd, defBal), Math.max(0, bal)) - needDeferredDraw;
      if (forcedRmd < 0) forcedRmd = 0;
      if (forcedRmd > 0) {
        // The forced amount is fully-taxable ordinary income. Recompute the year's tax
        // with it added (tradFrac 1 on the deferred draw), so the only extra tax is the
        // RMD's incremental burden. The after-tax remainder is reinvested into the
        // taxable bucket; the gross leaves the (tax-deferred) portfolio.
        const taxOld = tax;
        const rmdGrossWithdrawal = needDeferredDraw + forcedRmd;
        if (yearProfile) {
          // Typed path: federal (stateRate:0) + residence layer. tradFrac:1 because the
          // entire RMD draw is from the deferred pool (fully ordinary income).
          const rmdFedResult = calculateFederalTaxYear({
            status: yearStatus,
            ageA: aA,
            ageB: aB,
            wages,
            pension: pensEff,
            rental: rent,
            socialSecurity: ssAyEff + ssByEff,
            grossWithdrawal: rmdGrossWithdrawal,
            tradFrac: 1,
            year: cal,
            stateRate: 0,
          });
          const rmdResidenceTax = residenceTaxForYear(yearProfile, {
            isRetirement: true,
            ss: ssAyEff + ssByEff,
            ssTaxablePortion: rmdFedResult.taxableSocialSecurity,
            pension: pensEff,
            deferredWithdrawal: rmdGrossWithdrawal, // tradFrac:1 → full draw is deferred
          });
          tax = rmdFedResult.federalTax + rmdResidenceTax;
        } else {
          tax = calculateFederalTaxYear({
            status: yearStatus,
            ageA: aA,
            ageB: aB,
            wages,
            pension: pensEff,
            rental: rent,
            socialSecurity: ssAyEff + ssByEff,
            grossWithdrawal: rmdGrossWithdrawal,
            tradFrac: 1,
            year: cal,
            stateRate: i.taxRate,
          }).tax;
        }
        const afterTaxForced = Math.max(0, forcedRmd - Math.max(0, tax - taxOld));
        bal -= forcedRmd;
        bal += afterTaxForced;
      }
    }
    defBal = Math.max(0, defBal - (needDeferredDraw + forcedRmd));
    const wdTotal = wd + forcedRmd;
    if (bal < 1) bal = 0;
    if (!workA && !workB && fullyRetAge === null) {
      fullyRetAge = aA;
      balAtFullRet = bal;
    }
    const afterTaxCash = wages + pensEff + rent + ssAyEff + ssByEff + wdTotal - tax;
    if (bal <= 0 && depAge === null && afterTaxCash < need) depAge = aA;
    rows.push({
      aA, aB, cal, salA, salB, rent, pens: pensEff, ssA: ssAyEff, ssB: ssByEff, survivor: isSurvivor,
      wd: Math.round(wdTotal), wdSpend: Math.round(wd), bal: Math.round(bal), need: Math.round(need),
      extraSpend: Math.round(extraSpend),
      tax: Math.round(tax), contrib: Math.round(contrib), sellLump: Math.round(sellLump),
      rmd: Math.round(rmd), forcedRmd: Math.round(forcedRmd), defBal: Math.round(defBal),
      growth: Math.round(growth),
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
  for (const p of i.inher) {
    // Discount a future sale's proceeds back to the steady-state year so the SWR
    // base isn't inflated by money not yet received.
    if (p.type === "sell" && p.year > row.cal) sellAfter += p.sell / Math.pow(1 + (Number(i.realReturn) || 0), p.year - row.cal);
    if (p.type === "rent" && p.year <= row.cal) rentInc += p.rent;
    // Task 5 (Wave 2): "live" entries no longer produce a flat liveSav credit.
    // The inherited home is modelled as an owned tenure override in simulate(),
    // so its carrying cost is already baked into row.need. No accumulation here.
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
  // SINGLE-TAX-SOURCE invariant: the headline must use the SAME tax computation as the
  // simulation rows. Resolve the typed retirement profile exactly as the rows do; when
  // present, compute federal (stateRate:0) + the typed residence layer separately so the
  // headline and the rows agree on residence tax (e.g. Austria → 0 via treaty/FTC).
  // When null (manual override / no INTL entry), keep the flat i.taxRate path (unchanged).
  const retireProf = retirementProfile(i);
  // Compose federal-only details + the typed residence layer into a tax-details-shaped
  // object whose .tax is federalTax + residence tax (mirrors taxForYear in the rows).
  const composeTyped = (fedResult, deferredWithdrawal) => {
    const residenceTax = residenceTaxForYear(retireProf, {
      isRetirement: true,
      ss: ssHouse,
      ssTaxablePortion: fedResult.taxableSocialSecurity,
      pension,
      deferredWithdrawal,
    });
    return { ...fedResult, stateTax: residenceTax, tax: fedResult.federalTax + residenceTax };
  };
  const taxDetails = retireProf
    ? composeTyped(
        calculateFederalTaxYear({
          status: yearStatus, ageA, ageB, pension, rental: rentInc, socialSecurity: ssHouse,
          grossWithdrawal: wd, tradFrac: i.tradFrac, year: row.cal, stateRate: 0,
        }),
        wd * (Number(i.tradFrac) || 0),
      )
    : calculateFederalTaxYear({
        status: yearStatus, ageA, ageB, pension, rental: rentInc, socialSecurity: ssHouse,
        grossWithdrawal: wd, tradFrac: i.tradFrac, year: row.cal, stateRate: i.taxRate,
      });
  const guaranteedTaxDetails = retireProf
    ? composeTyped(
        calculateFederalTaxYear({
          status: yearStatus, ageA, ageB, pension, rental: 0, socialSecurity: ssHouse,
          grossWithdrawal: 0, tradFrac: i.tradFrac, year: row.cal, stateRate: 0,
        }),
        0, // no withdrawal in the guaranteed-only base
      )
    : calculateFederalTaxYear({
        status: yearStatus, ageA, ageB, pension, rental: 0, socialSecurity: ssHouse,
        grossWithdrawal: 0, tradFrac: i.tradFrac, year: row.cal, stateRate: i.taxRate,
      });
  const targetNeed = row.need; // sourced from the simulated row so events/healthcare flow through
  const net = gross - taxDetails.tax;
  return {
    FV, wd, ssA, ssB, pension, erf: i.pensionOn ? b.erf : null, pensionNote: b.pensionNote,
    ssHouse, guaranteed, recurring, rentInc, liveSav: 0, gross,
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
