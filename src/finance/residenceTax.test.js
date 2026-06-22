import { describe, expect, it } from "vitest";
import { residenceTaxForYear } from "./residenceTax.js";

describe("residenceTaxForYear (flat fallback — Task 2)", () => {
  it("with no profile applies the flat rate to taxable income (identity with today)", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0.05 })).toBeCloseTo(5000, 6);
  });
  it("zero rate ⇒ zero", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0 })).toBe(0);
  });
});
