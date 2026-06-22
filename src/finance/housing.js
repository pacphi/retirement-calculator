import { TAX_YEAR } from "../retirementData.js";

/** Standard monthly mortgage P&I. 0 if principal/term ≤ 0; rate 0 ⇒ even principal. */
export function monthlyPI(principal, ratePct, termYears) {
  const P = Number(principal) || 0;
  const n = (Number(termYears) || 0) * 12;
  if (P <= 0 || n <= 0) return 0;
  const r = (Number(ratePct) || 0) / 100 / 12;
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

/** Calendar year P&I ends (P&I is 0 from this year on). */
export function payoffYear(mortgage) {
  const start = Number(mortgage?.startYear) || TAX_YEAR;
  return start + (Number(mortgage?.termYears) || 0);
}

/**
 * Annual real housing cost in calendar year `cal`. Mortgage P&I is the one nominal
 * flow — deflated by (1+inflation)^(cal−TAX_YEAR) and zeroed from payoffYear on.
 * Rent / property tax / insurance / maintenance are real-flat.
 *
 * The four returned fields are NON-OVERLAPPING: `other` excludes propertyTax, so
 * `total = pi + propertyTax + other` (= pi + rent + propertyTax + insurance + maintenance).
 *
 * @returns {{ total:number, pi:number, propertyTax:number, other:number }}
 */
export function housingCostForYear(housing, cal, inflation, propertyTaxRate = 0) {
  if (!housing) return { total: 0, pi: 0, propertyTax: 0, other: 0 };
  const homeValue = Number(housing.homeValue) || 0;
  const propertyTax = (Number(propertyTaxRate) || 0) * homeValue;
  const insurance = Number(housing.insuranceAnnual) || 0;
  const maintenance = (Number(housing.maintenancePct) || 0) * homeValue;

  let pi = 0;
  let rent = 0;
  if (housing.tenure === "mortgage") {
    const m = housing.mortgage || {};
    if (cal < payoffYear(m)) {
      const nominalAnnual = monthlyPI(m.principal, m.ratePct, m.termYears) * 12;
      pi = nominalAnnual / Math.pow(1 + (Number(inflation) || 0), cal - TAX_YEAR);
    }
  } else if (housing.tenure === "rent") {
    rent = (Number(housing.rent) || 0) * 12;
  }
  // "own" ⇒ no pi/rent.
  const other = rent + insurance + maintenance;
  return { total: pi + propertyTax + other, pi, propertyTax, other };
}
