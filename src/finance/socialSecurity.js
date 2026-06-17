import { BEND, SS_CAP } from "../retirementData.js";

export const piaFromIncome = (income) => {
  const aime = Math.min(Number(income) || 0, SS_CAP) / 12;
  return 0.9 * Math.min(aime, BEND[0])
    + 0.32 * Math.max(0, Math.min(aime, BEND[1]) - BEND[0])
    + 0.15 * Math.max(0, aime - BEND[1]);
};

// A short SS-covered career drags the real 35-year AIME below current income.
// This is the honest fallback for the income estimate: scale the full-career PIA
// (annualized) by coveredYears/35, capped at 35. Statement values are still best.
export const proratedFraEstimate = (income, coveredYears) =>
  piaFromIncome(income) * 12 * (Math.min(Math.max(0, Number(coveredYears) || 0), 35) / 35);

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
