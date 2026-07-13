import {
  DRS_ERF_30_PLUS, DRS_ERF_UNDER_30, DRS_SURVIVOR_FACTORS,
  FERS_MRA, FERS_STANDARD_MULTIPLIER, FERS_ENHANCED_MULTIPLIER,
  CALSTRS_AGE_FACTOR_2AT60, CALSTRS_AGE_FACTOR_2AT62, CALSTRS_CAREER_FACTOR_BONUS, CALSTRS_CAP,
  CALPERS_AGE_FACTOR_CLASSIC_2AT55, CALPERS_AGE_FACTOR_PEPRA_2AT62,
  TX_TRS_MULTIPLIER, TX_TRS_NORMAL_AGE, TX_TRS_RULE_OF_80, TX_TRS_EARLY_REDUCTION_PER_YEAR,
  TX_TRS_MIN_EARLY_AGE, TX_TRS_MIN_YEARS, TX_TRS_LONG_SERVICE_YEARS,
  TX_TRS_LONG_SERVICE_REDUCTION_PER_YEAR, TX_TRS_LONG_SERVICE_FLOOR_AGE,
  NYSTRS_TIER6, NYSTRS_MIN_AGE, NYSTRS_MIN_YEARS, NYSTRS_UNREDUCED_AGE,
  NYSTRS_LONG_SERVICE_UNREDUCED_AGE, NYSTRS_LONG_SERVICE_YEARS, NYSTRS_EARLY_RETIREMENT_ANCHORS,
  OHIO_STRS_MULTIPLIER, OHIO_STRS_UNREDUCED_AGE, OHIO_STRS_UNREDUCED_MIN_YEARS,
  OHIO_STRS_UNREDUCED_LONG_SERVICE_YEARS,
  MILITARY_MIN_YEARS, MILITARY_HIGH3_BASE, MILITARY_HIGH3_PER_YEAR, MILITARY_BRS_MULTIPLIER,
} from "../retirementData.js";

export const pensionERF = (ageRaw, years, plan = 2) => {
  const age = Math.floor(ageRaw); // DRS uses integer calendar ages; floor guard + lookup consistently
  if (age >= 65) return 1;
  if (age < 55) return 0;
  if (years >= 30) return DRS_ERF_30_PLUS[age] ?? 0;
  const minEarlyYears = plan === 3 ? 10 : 20;
  if (years < minEarlyYears) return 0;
  return DRS_ERF_UNDER_30[age] ?? 0;
};

/**
 * DRS joint-and-survivor option factor — the permanent reduction to the member's
 * benefit for electing survivor coverage (Options 2/3/4). Exact published factors
 * at the 100% / 66.67% / 50% options for the member−beneficiary age difference
 * (clamped to the published −20…+40 range); a non-standard elected percentage is
 * interpolated between the neighboring published options (and toward 1.0 below
 * 50%, though DRS itself only offers 50/66.67/100).
 *
 * @param {number} electedPct - survivor share elected (0–100; 0 = single life)
 * @param {number} ageDiffRaw - member age minus beneficiary age (negative = beneficiary older)
 * @returns {number} factor in (0, 1]
 */
export const survivorOptionFactor = (electedPct, ageDiffRaw) => {
  const pct = Number(electedPct) || 0;
  if (pct <= 0) return 1;
  const { minDiff, maxDiff, j100, j66, j50 } = DRS_SURVIVOR_FACTORS;
  const d = Math.min(maxDiff, Math.max(minDiff, Math.round(Number(ageDiffRaw) || 0)));
  const i = d - minDiff;
  if (pct >= 100) return j100[i];
  if (pct >= 66.67) return j66[i] + (j100[i] - j66[i]) * (pct - 66.67) / (100 - 66.67);
  if (pct >= 50) return j50[i] + (j66[i] - j50[i]) * (pct - 50) / (66.67 - 50);
  return 1 + (j50[i] - 1) * (pct / 50);
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

// Generic defined-benefit fallback (docs/research/pension-systems-data.md §1) — for any employer
// pension not specifically modeled. Modeled flat in real terms across the horizon, the same
// convention this engine already uses for every other guaranteed-income source (DRS pension,
// Social Security): the whole simulation runs in today's dollars, so a COLA assumption at or
// above the plan's inflation rate is equivalent to "flat real" and needs no special handling. A
// COLA meaningfully below inflation would erode in real terms over time — modeling that drift is
// a future enhancement, not attempted here; `genericCola` is captured for user intent/UI display
// but the engine currently treats the benefit as flat real regardless of its value.
export const genericPensionAnnual = (monthlyBenefit) => (Number(monthlyBenefit) || 0) * 12;

// FERS (Federal Employees Retirement System) accrual. Source: docs/research/pension-systems-data.md §2.
export const fersMultiplier = (age, years) =>
  age >= 62 && years >= 20 ? FERS_ENHANCED_MULTIPLIER : FERS_STANDARD_MULTIPLIER;

// Immediate-retirement eligibility paths (OPM: FERS Eligibility) — MRA+30, 60+20, or 62+5.
// The MRA+10 reduced-immediate path is not modeled as a separate option (see the FERS_MRA
// comment in retirementData.js); a member who would qualify only under MRA+10 is treated as
// ineligible here rather than approximated with a fabricated reduction.
export const fersEligible = (age, years) => {
  if (age >= 62 && years >= 5) return true;
  if (age >= 60 && years >= 20) return true;
  if (age >= FERS_MRA && years >= 30) return true;
  return false;
};

export const fersEligibilityNote = (age, years) =>
  fersEligible(age, years)
    ? ""
    : `FERS immediate retirement in this simplified model needs age 62+ with 5+ years, 60+ with 20+ years, or ${FERS_MRA}+ with 30+ years of service (the reduced MRA+10 path isn't modeled).`;

export const fersPensionAnnual = (age, years, high3Salary) =>
  fersEligible(age, years) ? fersMultiplier(age, years) * years * (Number(high3Salary) || 0) : 0;

// --- CalSTRS. Source: docs/research/pension-systems-data.md §3. -----------------------------

const lookupAgeFactor = (table, ageRaw) => {
  const age = Math.floor(Number(ageRaw) || 0);
  const ages = Object.keys(table).map(Number);
  if (!ages.length) return 0;
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  if (age < minAge) return 0;
  return table[Math.min(age, maxAge)] ?? 0;
};

export const calstrsAgeFactor = (age, tier = "2at60") =>
  lookupAgeFactor(tier === "2at62" ? CALSTRS_AGE_FACTOR_2AT62 : CALSTRS_AGE_FACTOR_2AT60, age);

// Survivor election is NOT modeled for CalSTRS: reductions are actuarial by member/beneficiary
// age with no published flat-factor table (docs/research/pension-systems-data.md §3, "Not found").
export const calstrsPensionAnnual = (age, years, finalComp, tier = "2at60") => {
  const factor = calstrsAgeFactor(age, tier);
  if (factor <= 0) return 0;
  const careerBonus = tier === "2at60" && (Number(years) || 0) >= 30 ? CALSTRS_CAREER_FACTOR_BONUS : 0;
  const effectiveFactor = Math.min(factor + careerBonus, CALSTRS_CAP);
  return effectiveFactor * (Number(years) || 0) * (Number(finalComp) || 0);
};

export const calstrsEligibilityNote = (age, years, tier = "2at60") => {
  if (calstrsAgeFactor(age, tier) > 0) return "";
  return tier === "2at60"
    ? "CalSTRS 2% at 60 retirement starts at age 50 with 30+ years of service, or age 55 with 5+ years."
    : "CalSTRS 2% at 62 (PEPRA) retirement starts at age 55 with 5+ years of service.";
};

// --- CalPERS. Source: docs/research/pension-systems-data.md §4. No single canonical formula --
// exists (flagged explicitly in the research brief) -- these are two REPRESENTATIVE tiers, not
// "the" CalPERS formula. Survivor options are actuarial by age, like CalSTRS -- not modeled.

export const calpersAgeFactor = (age, tier = "classic2at55") =>
  lookupAgeFactor(tier === "pepra2at62" ? CALPERS_AGE_FACTOR_PEPRA_2AT62 : CALPERS_AGE_FACTOR_CLASSIC_2AT55, age);

export const calpersPensionAnnual = (age, years, finalComp, tier = "classic2at55") => {
  const factor = calpersAgeFactor(age, tier);
  return factor > 0 ? factor * (Number(years) || 0) * (Number(finalComp) || 0) : 0;
};

export const calpersEligibilityNote = (age, years, tier = "classic2at55") => {
  if (calpersAgeFactor(age, tier) > 0) return "";
  return tier === "pepra2at62"
    ? "This representative CalPERS PEPRA tier (2% at 62) starts at age 52 with 5+ years of service."
    : "This representative CalPERS Classic tier (2% at 55) starts at age 50 with 5+ years of service.";
};

// --- Texas TRS. Source: docs/research/pension-systems-data.md §5. Current (post-Sept-2014) tier.

export const txTrsRuleOf80Met = (age, years) => (Number(age) || 0) + (Number(years) || 0) >= TX_TRS_RULE_OF_80;

export const txTrsEligible = (age, years) => {
  const a = Number(age) || 0, y = Number(years) || 0;
  if (a >= 65 && y >= TX_TRS_MIN_YEARS) return true;
  if (a >= TX_TRS_NORMAL_AGE && y >= TX_TRS_MIN_YEARS && txTrsRuleOf80Met(a, y)) return true;
  if (a >= TX_TRS_MIN_EARLY_AGE && y >= TX_TRS_MIN_YEARS) return true; // early, reduced
  if (y >= TX_TRS_LONG_SERVICE_YEARS) return true; // early, reduced (any age)
  return false;
};

// Reduction: 2%/yr below age 50 under the 30+-years-any-age path. Otherwise (the 55+/5yr
// early path), 5%/yr below the member's actual unreduced age -- which, absent Rule of 80,
// is 65 (NOT 62: without Rule of 80 there is no unreduced path at 62, only at 65). A member
// aged 62-64 who hasn't met Rule of 80 is therefore still reduced, against the 65 floor, not
// given a full pension. Unreduced (factor 1) at 65+5yrs, or 62+ meeting Rule of 80.
export const txTrsReductionFactor = (age, years) => {
  const a = Number(age) || 0, y = Number(years) || 0;
  if (a >= 65 || (a >= TX_TRS_NORMAL_AGE && txTrsRuleOf80Met(a, y))) return 1;
  if (y >= TX_TRS_LONG_SERVICE_YEARS) {
    const shortfall = Math.max(0, TX_TRS_LONG_SERVICE_FLOOR_AGE - a);
    return Math.max(0, 1 - shortfall * TX_TRS_LONG_SERVICE_REDUCTION_PER_YEAR);
  }
  const shortfall = Math.max(0, 65 - a);
  return Math.max(0, 1 - shortfall * TX_TRS_EARLY_REDUCTION_PER_YEAR);
};

export const txTrsPensionAnnual = (age, years, avgSalary5) =>
  txTrsEligible(age, years)
    ? TX_TRS_MULTIPLIER * (Number(years) || 0) * (Number(avgSalary5) || 0) * txTrsReductionFactor(age, years)
    : 0;

export const txTrsEligibilityNote = (age, years) =>
  txTrsEligible(age, years)
    ? ""
    : `Texas TRS retirement in this simplified model needs age 55+ with ${TX_TRS_MIN_YEARS}+ years, ${TX_TRS_LONG_SERVICE_YEARS}+ years at any age, or age 65+ with ${TX_TRS_MIN_YEARS}+ years.`;

// --- NYSTRS Tier 6. Source: docs/research/pension-systems-data.md §6. -----------------------

export const nystrsPensionFactor = (years) => {
  const y = Number(years) || 0;
  if (y < 20) return y * NYSTRS_TIER6.under20;
  if (y === 20) return 20 * NYSTRS_TIER6.at20;
  return NYSTRS_TIER6.over20Base + (y - 20) * NYSTRS_TIER6.over20PerYear;
};

// Linear interpolation between the sourced anchor points (see the NYSTRS_EARLY_RETIREMENT_ANCHORS
// comment in retirementData.js) -- not a fabricated table, but an explicit approximation of the
// published age-by-age reduction schedule pending a full transcription from the Tier 6 PDF.
export const nystrsEarlyRetirementFactor = (ageRaw, years) => {
  const age = Math.floor(Number(ageRaw) || 0);
  if (age >= NYSTRS_UNREDUCED_AGE) return 1;
  if ((Number(years) || 0) >= NYSTRS_LONG_SERVICE_YEARS && age >= NYSTRS_LONG_SERVICE_UNREDUCED_AGE) return 1;
  const anchors = Object.keys(NYSTRS_EARLY_RETIREMENT_ANCHORS).map(Number).sort((a, b) => a - b);
  const minAnchor = anchors[0];
  if (age <= minAnchor) return NYSTRS_EARLY_RETIREMENT_ANCHORS[minAnchor];
  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i], hi = anchors[i + 1];
    if (age >= lo && age <= hi) {
      const loVal = NYSTRS_EARLY_RETIREMENT_ANCHORS[lo], hiVal = NYSTRS_EARLY_RETIREMENT_ANCHORS[hi];
      return loVal + (hiVal - loVal) * (age - lo) / (hi - lo);
    }
  }
  return 1;
};

export const nystrsEligible = (age, years) => (Number(age) || 0) >= NYSTRS_MIN_AGE && (Number(years) || 0) >= NYSTRS_MIN_YEARS;

export const nystrsPensionAnnual = (age, years, fas) =>
  nystrsEligible(age, years)
    ? nystrsPensionFactor(years) * (Number(fas) || 0) * nystrsEarlyRetirementFactor(age, years)
    : 0;

export const nystrsEligibilityNote = (age, years) =>
  nystrsEligible(age, years)
    ? ""
    : `NYSTRS Tier 6 retirement needs age ${NYSTRS_MIN_AGE}+ with ${NYSTRS_MIN_YEARS}+ years of service.`;

// --- Ohio STRS. Source: docs/research/pension-systems-data.md §7. Unreduced path ONLY -- the
// reduced/actuarial path has no published per-year table (see the OHIO_STRS_* comment in
// retirementData.js), so it is deliberately NOT modeled here rather than guessed.

export const ohioStrsUnreducedEligible = (age, years) => {
  const a = Number(age) || 0, y = Number(years) || 0;
  return (a >= OHIO_STRS_UNREDUCED_AGE && y >= OHIO_STRS_UNREDUCED_MIN_YEARS) || y >= OHIO_STRS_UNREDUCED_LONG_SERVICE_YEARS;
};

export const ohioStrsPensionAnnual = (age, years, fas5) =>
  ohioStrsUnreducedEligible(age, years) ? OHIO_STRS_MULTIPLIER * (Number(years) || 0) * (Number(fas5) || 0) : 0;

export const ohioStrsEligibilityNote = (age, years) =>
  ohioStrsUnreducedEligible(age, years)
    ? ""
    : `Ohio STRS in this simplified model only computes the unreduced benefit: age ${OHIO_STRS_UNREDUCED_AGE}+ with ${OHIO_STRS_UNREDUCED_MIN_YEARS}+ years, or ${OHIO_STRS_UNREDUCED_LONG_SERVICE_YEARS}+ years at any age. The reduced/early path isn't modeled because STRS Ohio doesn't publish a flat per-year reduction table (it's actuarial, via the plan's own estimator) -- use the generic defined-benefit pension instead if you qualify only for reduced retirement.`;

// --- Military (Legacy High-3 / BRS). Source: docs/research/pension-systems-data.md §8. Hard
// 20-year cliff under EITHER system -- no partial vesting below 20 years, unlike every other
// pension modeled in this file.

export const militaryEligible = (years) => (Number(years) || 0) >= MILITARY_MIN_YEARS;

export const militaryPensionAnnual = (years, high3Pay, planType = "highThree") => {
  if (!militaryEligible(years)) return 0;
  const y = Number(years) || 0, pay = Number(high3Pay) || 0;
  if (planType === "brs") return MILITARY_BRS_MULTIPLIER * y * pay;
  return (MILITARY_HIGH3_BASE + MILITARY_HIGH3_PER_YEAR * (y - MILITARY_MIN_YEARS)) * pay;
};

export const militaryEligibilityNote = (years) =>
  militaryEligible(years)
    ? ""
    : `Military retired pay requires ${MILITARY_MIN_YEARS}+ years of service under either Legacy High-3 or the Blended Retirement System -- there is no partial pension below that cliff (a BRS member still keeps their vested TSP balance).`;
