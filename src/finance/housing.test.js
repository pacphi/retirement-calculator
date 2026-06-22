// src/finance/housing.test.js
import { describe, expect, it } from "vitest";
import { monthlyPI, payoffYear, housingCostForYear } from "./housing.js";

describe("housing amortization", () => {
  it("computes the standard monthly P&I", () => {
    // $300k, 6%/yr, 30yr → ~$1,798.65/mo
    expect(monthlyPI(300000, 6, 30)).toBeCloseTo(1798.65, 1);
  });
  it("zero rate spreads principal evenly", () => {
    expect(monthlyPI(360000, 0, 30)).toBeCloseTo(1000, 6);
  });
  it("payoff year is start + term", () => {
    expect(payoffYear({ principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 })).toBe(2056);
  });
});

describe("housingCostForYear", () => {
  const mortgage = { tenure: "mortgage", mortgage: { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 }, homeValue: 375000, insuranceAnnual: 1800, maintenancePct: 0.01 };
  it("deflates P&I in real terms and adds real-flat carrying costs", () => {
    const y0 = housingCostForYear(mortgage, 2026, 0.025, 0.012);
    expect(y0.pi).toBeCloseTo(1798.65 * 12, 0);                    // year 0 no deflation
    const y10 = housingCostForYear(mortgage, 2036, 0.025, 0.012);
    expect(y10.pi).toBeCloseTo(1798.65 * 12 / Math.pow(1.025, 10), 0); // deflated
    expect(y0.propertyTax).toBeCloseTo(0.012 * 375000, 6);         // real-flat
  });
  it("zeros P&I from the payoff year on", () => {
    expect(housingCostForYear(mortgage, 2056, 0.025, 0.012).pi).toBe(0);
    expect(housingCostForYear(mortgage, 2057, 0.025, 0.012).pi).toBe(0);
  });
  it("own tenure has no P&I or rent", () => {
    const own = { tenure: "own", mortgage: { principal: 0 }, homeValue: 324000, insuranceAnnual: 0, maintenancePct: 0.01 };
    const c = housingCostForYear(own, 2040, 0.025, 0.012);
    expect(c.pi).toBe(0);
    expect(c.propertyTax).toBeCloseTo(0.012 * 324000, 6);
  });
});
