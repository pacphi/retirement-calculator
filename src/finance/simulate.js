import { TAX_YEAR } from "../retirementData.js";
import { composeNeed, spendingComponents, yearReturn } from "./seams.js";
import { housingCostForYear, resolveDwelling } from "./housing.js";
import { calculateFederalTaxYear } from "./tax.js";
import { residenceTaxForYear } from "./residenceTax.js";
import { ownBenefitAtClaimMonthly, piaFromIncome, spousalBenefitAtClaimMonthly } from "./socialSecurity.js";
import { drsEligibilityNote, pensionERF, resolveAfc } from "./pension.js";
import { ltcSpendForYear, oneTimeSpendForYear, travelSpendForYear } from "./events.js";
import { requiredMinimum, rmdStartAge } from "./rmd.js";
import { activeJurisdiction } from "./jurisdiction.js";
import { contributionPlan, realRaiseFactor } from "./contributions.js";
import { seedBuckets, splitWithdrawal, DEFAULT_WITHDRAWAL_ORDER } from "./buckets.js";

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

// profile: a typed US_STATE_TAX or INTL_TAX entry, or null for the flat fallback.
// When profile is provided the year is a full-retirement year (no wages), so the
// federal engine is called with stateRate:0 and residenceTaxForYear adds the typed
// residence layer on top. The federal engine is NEVER forked.
// flatStateRate: optional per-year override for the flat-path stateRate (used in
// working years to apply the work-state wageRate instead of i.taxRate).
// tradFracForDraw: the per-draw ordinary share. Wave 3 D1 makes this order-dependent —
// callers pass a function of the gross draw (deferred portion / total under the active
// withdrawal order). Working-year/flat callers (wd=0) pass a constant i.tradFrac so their
// behavior is unchanged. Defaults to i.tradFrac when not supplied.
const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal, statusOverride, year, profile, flatStateRate = null, tradFracForDraw = null) => {
  const tradFrac = tradFracForDraw ? tradFracForDraw(grossWithdrawal) : (Number(i.tradFrac) || 0);
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
      tradFrac,
      year,
      stateRate: 0,
    });
    // Thread the deferred-withdrawal share into the residence base so income-type
    // rules (taxesTradWithdrawal, pensionExclusion) apply to the correct slice.
    const deferredWithdrawal = grossWithdrawal * tradFrac;
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
    tradFrac,
    year,
    stateRate: flatStateRate ?? i.taxRate,
  }).tax;
};

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal, statusOverride, year, profile, flatStateRate = null, tradFracForDraw = null) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0, statusOverride, year, profile, flatStateRate, tradFracForDraw);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal, statusOverride, year, profile, flatStateRate, tradFracForDraw) >= need;
  const taxAtHi = taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile, flatStateRate, tradFracForDraw);
  if (income + hi - taxAtHi < need) return { withdrawal: hi, tax: taxAtHi };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride, year, profile, flatStateRate, tradFracForDraw) };
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
  // Wave 3 D1: three real sub-balances {taxable, deferred, roth}, drawn in a tax-smart
  // withdrawal order (default taxable→deferred→roth). RMDs act on the deferred bucket only.
  // The deferred bucket is still the IRS "prior year-end" RMD base. `bal` is a derived
  // mirror (sum of buckets) refreshed after every mutation so depletion/rows read it.
  const balOf = (b) => b.taxable + b.deferred + b.roth;
  const order = i.withdrawalOrder || DEFAULT_WITHDRAWAL_ORDER;
  let buckets = i.initialBuckets ? { ...i.initialBuckets } : seedBuckets(Number(i.savings) || 0, i.bucketSplit);
  let bal = balOf(buckets);
  let defBal = buckets.deferred;
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
    // The inline block has been extracted to resolveDwelling() in housing.js (Wave 2.5 Task 2).
    // ctx carries the two loop-locals that are also used outside the dwelling block
    // (inheritedOwnOverride from the inher loop; propertyTaxRate from activeJurisdiction).
    const dw = resolveDwelling(i, cal, { inheritedOwnOverride, propertyTaxRate: jur.propertyTaxRate });
    const effectiveHousing = dw.housing;
    sellLump += dw.sellLump;
    const keepRentalIncome = dw.keepRentalIncome;
    const keepMortgageCost = dw.keepMortgageCost;

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
    const overrideActive = dw.overrideActive;
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
    // The deferred pool's prior year-end value is the IRS base for this year's RMD,
    // captured BEFORE growth (Wave 3 D1: this is buckets.deferred).
    const defBalStart = buckets.deferred;
    const growth = bal * yr; // investment growth this year (excludes the sale lump)
    // Grow each bucket by the year return; sale proceeds land in taxable (sale proceeds
    // are taxable savings, not deferred).
    buckets.taxable = buckets.taxable * (1 + yr) + sellLump;
    buckets.deferred = buckets.deferred * (1 + yr);
    buckets.roth = buckets.roth * (1 + yr);
    bal = balOf(buckets);
    defBal = buckets.deferred;

    // Compute the authoritative per-bucket split on the rrf-scaled streams BEFORE applying
    // the affordability cap. In Simple mode the plan just carries `i.contrib` (the
    // plannedContrib already applied realRaiseFactor via plannedContribution). In Detailed
    // mode the streams have been rrf-scaled inside plannedContribution's scaled copy;
    // we need the same scaled copy here so bucket totals are consistent.
    const rrf = realRaiseFactor(i.realRaise ?? 0, y);
    const scaledI = (i.contribMode ?? "simple") === "detailed"
      ? { ...i, contribStreams: (i.contribStreams || []).map((s) => ({ ...s, amount: (Number(s.amount) || 0) * rrf })) }
      : { ...i, contrib: (Number(i.contrib) || 0) * ((workA ? 0.5 : 0) + (workB ? 0.5 : 0)) * rrf };
    const plannedSplit = contributionPlan(scaledI, { ageA: aA, ageB: aB, year: cal });
    const plannedContrib = plannedSplit.total;
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
    // Scale byBucket proportionally when the affordability cap reduces contrib below the
    // planned total. This keeps buckets summing to the actual deposited amount (not the
    // planned total) and avoids a redundant second contributionPlan call with wrong inputs.
    // Simple mode: byBucket.deferred ≈ contrib * tradFrac (behavior-identical when realRaise:0).
    // Task 3 will consume the full byBucket for multi-bucket deposits.
    const capFrac = plannedContrib > 0 ? contrib / plannedContrib : 0;
    const contribByBucket = {
      deferred: plannedSplit.byBucket.deferred * capFrac,
      taxable:  plannedSplit.byBucket.taxable  * capFrac,
      roth:     plannedSplit.byBucket.roth     * capFrac,
    };
    // Wave 3 D1: deposit each bucket's share (employer match already folded into
    // deferred by Task 1). `bal`/`defBal` mirrors refresh from the buckets afterward.
    buckets.taxable += contribByBucket.taxable;
    buckets.deferred += contribByBucket.deferred;
    buckets.roth += contribByBucket.roth;
    bal = balOf(buckets);
    defBal = buckets.deferred;

    const olderAge = olderAgeNow + y;
    const rmd = (defBalStart > 0 && olderAge >= rmdStart) ? requiredMinimum(defBalStart, olderAge) : 0;

    // Wave 3 D1: the per-draw ordinary share is order-dependent — the deferred PORTION of
    // the draw (under the active withdrawal order) is the only ordinary income. Roth and
    // taxable principal are not ordinary. The solver computes its tax with this same split.
    const tradFracForDraw = (D) => splitWithdrawal(D, buckets, order).ordinaryShare;
    let { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pensEff, rent, ssAyEff + ssByEff, need, bal, yearStatus, cal, yearProfile, flatStateRate, tradFracForDraw);
    // Split the solved spending draw across buckets in order and decrement each.
    const wdSplit = splitWithdrawal(wd, buckets, order);
    buckets.taxable -= wdSplit.taxable;
    buckets.deferred -= wdSplit.deferred;
    buckets.roth -= wdSplit.roth;
    bal = balOf(buckets);
    // RMD floor: a required distribution can only raise the year's draw. Any forced
    // amount beyond the need-based deferred draw is fully taxable ordinary income; the
    // after-tax surplus is reinvested into the taxable bucket. The need-based deferred
    // draw is the deferred PORTION of the spending draw under the active order.
    const needDeferredDraw = wdSplit.deferred;
    let forcedRmd = 0;
    if (rmd > needDeferredDraw) {
      // Mirror the pre-Wave-3 cap exactly: deferred-pre-spending = buckets.deferred (now
      // post-spending) + needDeferredDraw; total = current `bal` (post-spending draw).
      forcedRmd = Math.min(Math.min(rmd, buckets.deferred + needDeferredDraw), Math.max(0, bal)) - needDeferredDraw;
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
        // Wave 3 D1: the forced gross leaves the deferred bucket; the after-tax remainder
        // is reinvested into the taxable bucket (the gross leaves the tax-deferred pool).
        buckets.deferred = Math.max(0, buckets.deferred - forcedRmd);
        buckets.taxable += afterTaxForced;
        bal = balOf(buckets);
      }
    }
    defBal = Math.max(0, buckets.deferred);
    const wdTotal = wd + forcedRmd;
    // Wave 3 D2: general surplus reinvest — any RETIREMENT year where guaranteed after-tax
    // income (pension + SS + rental) already covers the need (no portfolio draw needed),
    // reinvest the surplus into the taxable bucket. Working years are excluded: wages are
    // not guaranteed lifetime income and the contrib path already handles that surplus.
    // Distinct from the RMD forced-surplus path above (forced-draw case); this is the
    // no-withdrawal, fully-retired surplus case.
    let reinvest = 0;
    if (wd === 0 && !workA && !workB) {
      const surplus = afterTaxBeforeWithdrawal - need;
      if (surplus > 0) { buckets.taxable += surplus; reinvest = surplus; }
    }
    bal = balOf(buckets);
    if (bal < 1) { buckets = { taxable: 0, deferred: 0, roth: 0 }; bal = 0; defBal = 0; }
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
      wd: Math.round(wdTotal), wdSpend: Math.round(wd), reinvest: Math.round(reinvest), bal: Math.round(bal), need: Math.round(need),
      extraSpend: Math.round(extraSpend),
      tax: Math.round(tax), contrib: Math.round(contrib), sellLump: Math.round(sellLump),
      rmd: Math.round(rmd), forcedRmd: Math.round(forcedRmd), defBal: Math.round(defBal),
      // Wave 3 D1: explicit per-bucket composition so steadyState + the chart can read
      // the same buckets the rows drew from (SINGLE-TAX-SOURCE). defBal === deferredBal.
      taxableBal: Math.round(buckets.taxable),
      deferredBal: Math.round(buckets.deferred),
      rothBal: Math.round(buckets.roth),
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
  // SINGLE-TAX-SOURCE (Wave 3 D1): the headline withdrawal draws from the SAME buckets in
  // the SAME order as the simulated row, so its ordinary share is order-dependent — not the
  // legacy flat i.tradFrac. Read the row's per-bucket composition and split the headline draw.
  const order = i.withdrawalOrder || DEFAULT_WITHDRAWAL_ORDER;
  const wdTradFrac = splitWithdrawal(
    wd,
    { taxable: row.taxableBal ?? 0, deferred: row.deferredBal ?? 0, roth: row.rothBal ?? 0 },
    order,
  ).ordinaryShare;
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
          grossWithdrawal: wd, tradFrac: wdTradFrac, year: row.cal, stateRate: 0,
        }),
        wd * wdTradFrac,
      )
    : calculateFederalTaxYear({
        status: yearStatus, ageA, ageB, pension, rental: rentInc, socialSecurity: ssHouse,
        grossWithdrawal: wd, tradFrac: wdTradFrac, year: row.cal, stateRate: i.taxRate,
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
