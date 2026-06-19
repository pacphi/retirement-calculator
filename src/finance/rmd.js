import { UNIFORM_LIFETIME } from "../retirementData.js";

// SECURE 2.0 first-RMD age: 73 for those born 1951-1959, 75 for 1960 and later.
export const rmdStartAge = (birthYear) => (birthYear >= 1960 ? 75 : 73);

// IRS Uniform Lifetime Table divisor. The published table starts at age 72; clamp
// younger ages to the first row and ages past the last row to its (smallest) divisor.
export const uniformLifetimeFactor = (ageRaw) => {
  const age = Math.floor(ageRaw);
  const ages = Object.keys(UNIFORM_LIFETIME).map(Number);
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  const clamped = Math.min(max, Math.max(min, age));
  return UNIFORM_LIFETIME[clamped];
};

// Required minimum distribution = prior-year-end pre-tax balance / Uniform Lifetime factor.
export const requiredMinimum = (deferredBalance, age) =>
  (Number(deferredBalance) || 0) / uniformLifetimeFactor(age);
