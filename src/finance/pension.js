import {
  DRS_ERF_30_PLUS, DRS_ERF_UNDER_30, DRS_SURVIVOR_FACTORS,
  FERS_MRA, FERS_STANDARD_MULTIPLIER, FERS_ENHANCED_MULTIPLIER,
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
