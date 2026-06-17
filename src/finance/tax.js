import {
  FED,
  PROV,
  SENIOR_ADDON_MARRIED_PER_PERSON,
  SENIOR_ADDON_SINGLE,
  SENIOR_BONUS,
  SENIOR_BONUS_PHASEOUT,
  SENIOR_BONUS_SUNSET,
  STD,
} from "../retirementData.js";

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

export const standardDeduction = ({ status, ageA, ageB, agi, year }) => {
  const eligible = seniorEligibleCount(status, ageA, ageB);
  const seniorAddon = status === "single"
    ? (eligible ? SENIOR_ADDON_SINGLE : 0)
    : eligible * SENIOR_ADDON_MARRIED_PER_PERSON;
  // The $6,000 senior bonus is a temporary 2025–2028 provision; it lapses after that.
  const bonusActive = year == null || year <= SENIOR_BONUS_SUNSET;
  let seniorBonus = bonusActive ? eligible * SENIOR_BONUS : 0;
  const phaseStart = SENIOR_BONUS_PHASEOUT[status];
  if (seniorBonus > 0 && agi > phaseStart) seniorBonus = Math.max(0, seniorBonus - (agi - phaseStart) * 0.06);
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
  year,
}) => {
  const ordinary = wages + pension + rental + grossWithdrawal * tradFrac;
  const taxableSocialSecurity = taxableSS(ordinary, socialSecurity, status);
  const agi = ordinary + taxableSocialSecurity;
  const deduction = standardDeduction({ status, ageA, ageB, agi, year });
  const taxableIncome = Math.max(0, agi - deduction);
  const tax = fedTax(taxableIncome, status);
  return { ordinary, taxableSocialSecurity, agi, deduction, taxableIncome, tax };
};
