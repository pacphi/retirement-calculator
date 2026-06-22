import { TAX_YEAR, HOME_SELL_NET, HOME_RENT_YIELD } from "../retirementData.js";
import { composeNeed, spendingComponents, yearReturn } from "./seams.js";
import { remainingBalance, housingCostForYear } from "./housing.js";
import { calculateFederalTaxYear } from "./tax.js";
import { residenceTaxForYear } from "./residenceTax.js";
import { ownBenefitAtClaimMonthly, piaFromIncome, spousalBenefitAtClaimMonthly } from "./socialSecurity.js";
import { drsEligibilityNote, pensionERF, resolveAfc } from "./pension.js";
import { ltcSpendForYear, oneTimeSpendForYear, travelSpendForYear } from "./events.js";
import { requiredMinimum, rmdStartAge } from "./rmd.js";
import { activeJurisdiction } from "./jurisdiction.js";

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
// flatStateRate: optional per-year override for the flat-path stateRate (used in
// working years to apply the work-state wageRate instead of i.taxRate).
const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal, statusOverride, year, profile, flatStateRate = null) => {
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
  // Flat path: use flatStateRate if provided (working-year wage face), else fall back to i.taxRate.
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
    stateRate: flatStateRate ?? i.taxRate,
  }).tax;
};

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal, statusOverride, year, profile, flatStateRate = null) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0, statusOverride, year, profile, flatStateRate);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal, statusOverride, year, profile, flatStateRate) >= need;
  const taxAtHi = taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile, flatStateRate);
  if (income + hi - taxAtHi < need) return { withdrawal: hi, tax: taxAtHi };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile, flatStateRate) };
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
    // Per-year jurisdiction: compute once per year; used for housing property-tax rate
    // and for the tax face (working-year wage rate vs. retirement typed profile).
    // I2 (known limitation, deferred to Task 10 docs): the cost-of-living BASKET does not
    // switch work↔retire here — workLoc is a US tax-state code, not a LOCATIONS basket entry,
    // so a clean work-location basket isn't modeled. Working-years cost basis stays as-is.
    const jur = activeJurisdiction(i, cal);

    // Resolve the effective housing inputs for this year (Task 8).
    //
    // Before relocationYear: the WORK residence (i.housing).
    // From relocationYear on: the RETIREMENT residence — never i.housing, so a SOLD work
    // home's mortgage P&I can't leak past the move (I1 fix). Order of precedence:
    //   inheritedOwnOverride (Task 5 live-in) > i.retireHousing > defaultRetireRent.
    // defaultRetireRent is a rent config seeded from the retire location's basket; when the
    // household has no explicit retirement home AND relocation is a real transition (work home
    // is owned/mortgaged and being sold), this is what they live in post-move.
    const reloAction = i.housing?.relocation?.action ?? "none";
    const reloSaleValue = Number(i.housing?.relocation?.saleValue) || 0;
    const jurisdictionDiffers = i.workLoc !== (i.stateCode ?? i.retireLoc);
    const workHomeOwned = i.housing?.tenure === "mortgage" || i.housing?.tenure === "own";
    // A GENUINE relocation transition (the work home is disposed of and the household moves)
    // requires: a different retire jurisdiction, an owned/mortgaged work home, AND a real
    // disposition — a "sell" with a positive saleValue, or "keep" (rent it out). A "sell" with
    // saleValue 0 and no retireHousing means the user simply didn't configure a move, so the
    // home stays the residence throughout (e.g. a US homeowner who set a stateCode but isn't
    // relocating). An explicit retireHousing also signals a move.
    const relocationTransition =
      jurisdictionDiffers && workHomeOwned
      && (reloAction === "keep" || (reloAction === "sell" && reloSaleValue > 0) || i.retireHousing != null);
    const defaultRetireRent = {
      tenure: "rent",
      rent: i.retLocObj?.m?.rent ?? i.housing?.rent ?? 0,
      mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
      homeValue: 0, insuranceAnnual: 0, maintenancePct: 0,
    };
    // From relocationYear on the residence is NEVER i.housing when a real transition occurred
    // (so a sold/kept work home's residence cost can't leak — I1). It is retireHousing if set,
    // else a rent config at the retire location. With no transition, the dwelling is unchanged
    // (retireHousing if explicitly set, else i.housing).
    const retireResidence = relocationTransition
      ? (i.retireHousing ?? defaultRetireRent)
      : (i.retireHousing ?? i.housing);
    const baseHousing = cal < i.relocationYear ? i.housing : retireResidence;
    const effectiveHousing = inheritedOwnOverride ?? baseHousing;

    // Task 8 relocation transition at relocationYear. Only fires when the retire location
    // genuinely differs and the work home is owned/mortgaged.
    //   "sell": realize NET proceeds = HOME_SELL_NET × saleValue − remaining mortgage balance,
    //           added to the portfolio via the existing sellLump bucket. Work P&I stops because
    //           the residence switched off i.housing above (I1).
    //   "keep": no lump; the work home is retained as a rental — gross rental income is added and
    //           the work mortgage P&I continues (as a landlord cost on the kept property).
    //   "none": no transition.
    let keepRentalIncome = 0;
    let keepMortgageCost = 0;
    if (relocationTransition) {
      if (reloAction === "sell" && cal === i.relocationYear) {
        const owed = remainingBalance(i.housing.mortgage, i.relocationYear);
        sellLump += Math.max(0, HOME_SELL_NET * reloSaleValue - owed);
      } else if (reloAction === "keep" && cal >= i.relocationYear) {
        // Kept as a rental from the move on: gross rental income offset by the continuing
        // work mortgage P&I (deflated, zeroed at payoff — same as housingCostForYear). Only
        // the P&I component is a landlord cost here; property tax/insurance/maintenance on a
        // kept rental are out of scope (planning-grade), so we charge P&I only.
        keepRentalIncome += HOME_RENT_YIELD * (Number(i.housing.homeValue) || 0);
        if (i.housing.tenure === "mortgage") {
          keepMortgageCost += housingCostForYear(i.housing, cal, i.inflation, 0).pi;
        }
      }
    }

    // Task 8 "keep" transition: the kept work home is a rental. Its gross rental income
    // joins the rental path (taxed as rental, same as inherited-rental income); its
    // continuing mortgage P&I is an extra spending obligation (landlord cost).
    rent += keepRentalIncome;
    const extraSpend =
      travelSpendForYear(i.travel, cal)
      + oneTimeSpendForYear(i.events, cal, { includeEmergent: ssOpt.includeEmergent ?? false })
      + ltcSpendForYear(i.ltc, aA, i.ltcAnnual)
      + keepMortgageCost;
    const survAge = lifeOn && isSurvivor ? (survivorIsA ? aA : aB) : null;
    // Wave 2 (Task 4): thread inflation + activePropertyTaxRate so housingCostForYear
    // inside spendingComponents can deflate mortgage P&I and compute property tax.
    // i.inflation is a real engine input that deflates nominal P&I only — it does
    // not compound rent, insurance, maintenance, or any other spending line.
    //
    // Task 5: when a live-in inheritance is active, override with inheritedOwnOverride.
    // Task 8: use the jurisdiction's propertyTaxRate (work state in working years,
    // retire state from relocationYear on). Inherited-owned overrides keep rate=0
    // (PROP.ownRate already bundles all carrying costs).
    const overrideActive = effectiveHousing !== baseHousing;
    const iEffective = (effectiveHousing !== i.housing) ? { ...i, housing: effectiveHousing } : i;
    // I1 fix: PROP.ownRate already bundles property tax + insurance + maintenance into
    // maintenancePct, so don't apply the state property-tax rate again to an inherited
    // owned home — that would double-count property tax. The inherited owned carrying cost
    // is therefore ownRate × homeValue exactly, for both international and US homes.
    const effPropertyTaxRate = overrideActive ? 0 : jur.propertyTaxRate;
    const need = spendingNeed(iEffective, aA, aB, 0, isSurvivor, survAge, {
      retireAgeA,
      cal,
      inflation: i.inflation,
      propertyTaxRate: effPropertyTaxRate,
      // Task 8 (v3 §4): the pre-65 ACA healthcare bridge applies ONLY to a person who is
      // NOT working — while employed they carry employer insurance. Thread each spouse's
      // working flag so spendingComponents can gate the bridge per person instead of by age
      // alone (which wrongly fired the bridge during still-employed pre-65 years).
      workingA: workA,
      workingB: workB,
    }) + extraSpend;
    const yr = yearReturn(i, y, ssOpt);
    // The deferred pool's prior year-end value is the IRS base for this year's RMD.
    const defBalStart = defBal;
    const growth = bal * yr; // investment growth this year (excludes the sale lump)
    bal = bal * (1 + yr) + sellLump;
    defBal = defBal * (1 + yr); // sale proceeds are taxable savings, not deferred

    const plannedContrib = plannedContribution(i, workA, workB);
    // yearProfile: typed profile for retirement years; null for working years (flat path).
    // Working-year state tax uses the work-state wageRate (0 for WA) via flatStateRate.
    // This fixes a pre-Task-8 bug where i.taxRate (the retire location's addlTaxRate,
    // e.g. 0.05 for Austria) was incorrectly applied to working years spent in WA.
    const yearProfile = jur.isRetirement ? jur.profile : null;
    // Working years: use the work-state wageRate as the flat stateRate; retirement years
    // with a typed profile use stateRate:0 + residenceTaxForYear (yearProfile path above).
    // Retirement years with null profile (manual override / no INTL entry) keep i.taxRate.
    const flatStateRate = jur.isRetirement ? null : (jur.profile?.wageRate ?? 0);
    const taxBeforeWithdrawal = taxForYear(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, 0, yearStatus, cal, yearProfile, flatStateRate);
    const afterTaxBeforeWithdrawal = wages + pensEff + rent + ssAyEff + ssByEff - taxBeforeWithdrawal;
    const contrib = Math.min(plannedContrib, Math.max(0, afterTaxBeforeWithdrawal - need));
    bal += contrib;
    defBal += contrib * i.tradFrac;

    const olderAge = olderAgeNow + y;
    const rmd = (defBalStart > 0 && olderAge >= rmdStart) ? requiredMinimum(defBalStart, olderAge) : 0;

    let { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, need, bal, yearStatus, cal, yearProfile, flatStateRate);
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
          // Flat path: use flatStateRate for working years, i.taxRate for retirement flat path.
          const rmdStateRate = jur.isRetirement ? i.taxRate : (jur.profile?.wageRate ?? 0);
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
            stateRate: rmdStateRate,
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
    // Task 9: compute housing breakdown parts for the row so monthlyBreakdown can itemize them.
    // housingCostForYear is already called inside spendingComponents via seams; we call it once
    // more here with the same effective inputs to surface the parts on the row. This is a pure
    // derivation (same inputs → same result) and adds no simulation state.
    const housingBreakdown = housingCostForYear(effectiveHousing, cal, i.inflation, effPropertyTaxRate);
    // For renters: housingRentOrPI is the annual rent (housingBreakdown.other includes rent).
    // For mortgage: housingRentOrPI is the deflated P&I (housingBreakdown.pi).
    // For owned outright: pi=0, other=insurance+maintenance, so housingRentOrPI=0.
    const housingRentOrPI = effectiveHousing?.tenure === "rent"
      ? (Number(effectiveHousing.rent) || 0) * 12
      : housingBreakdown.pi;
    const prevHousingRentOrPI = rows.length > 0 ? (rows[rows.length - 1].housingRentOrPI ?? 0) : null;
    const mortgagePaidOff = effectiveHousing?.tenure === "mortgage"
      && housingRentOrPI === 0
      && prevHousingRentOrPI != null && prevHousingRentOrPI > 0;
    rows.push({
      aA, aB, cal, salA, salB, rent, pens: pensEff, ssA: ssAyEff, ssB: ssByEff, survivor: isSurvivor,
      wd: Math.round(wdTotal), wdSpend: Math.round(wd), bal: Math.round(bal), need: Math.round(need),
      extraSpend: Math.round(extraSpend),
      tax: Math.round(tax), contrib: Math.round(contrib), sellLump: Math.round(sellLump),
      rmd: Math.round(rmd), forcedRmd: Math.round(forcedRmd), defBal: Math.round(defBal),
      growth: Math.round(growth),
      // Housing breakdown (Task 9): annual total + non-overlapping parts for itemized view.
      housing: Math.round(housingBreakdown.total),
      housingRentOrPI: Math.round(housingRentOrPI),
      housingPropertyTax: Math.round(housingBreakdown.propertyTax),
      mortgagePaidOff,
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
  // simulation rows. The steady-state row is always a retirement year (cal >= relocationYear
  // for any reasonable plan), so use activeJurisdiction at row.cal for the profile.
  // When null (manual override / no INTL entry), keep the flat i.taxRate path (unchanged).
  const retireProf = activeJurisdiction(i, row.cal).profile;
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
