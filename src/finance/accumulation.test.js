import { describe, expect, it } from "vitest";
import { accumulationSummary } from "./accumulation.js";

describe("accumulationSummary", () => {
  const rows = [
    { aA: 60, contrib: 10000, growth: 5000, bal: 115000 },
    { aA: 61, contrib: 10000, growth: 6000, bal: 131000 },
    { aA: 62, contrib: 0, growth: 7000, bal: 138000 }, // both retired
  ];

  it("sums contributions and growth across working years only", () => {
    // OR semantics. stopAgeA=62, ageA=60; stopAgeB=52, ageB=50 → aB = 50 + (aA - 60).
    // Row aA=60: A working (60<62) OR aB=50<52 → included.
    // Row aA=61: A working (61<62) OR aB=51<52 → included.
    // Row aA=62: A retired (62<62 false) AND aB=52<52 false → excluded.
    const s = accumulationSummary(rows, 62, 60, 52, 50);
    expect(s.totalContrib).toBe(20000); // rows at 60 and 61
    expect(s.totalGrowth).toBe(11000);
    expect(s.workingYears).toBe(2);
  });

  it("reports the balance at retirement", () => {
    const s = accumulationSummary(rows, 62, 60, 52, 50);
    expect(s.balAtRet).toBe(131000); // last working row's balance
  });

  it("counts a year where only the younger spouse still works (OR, not AND)", () => {
    // Spouses retire at DIFFERENT times — the distinguishing case for OR vs AND.
    // stopAgeA=61, ageA=60 → A retires after the aA=60 row.
    // stopAgeB=53, ageB=50 → aB = 50 + (aA - 60); B retires after aB=52 (aA=62).
    // Row aA=60: A working (60<61) → included.
    // Row aA=61: A retired (61<61 false) BUT aB=51<53 → still included via spouse B.
    // Row aA=62: A retired AND aB=52<53 → still included via spouse B.
    // Row aA=63: A retired AND aB=53<53 false → excluded (both retired).
    const diffRows = [
      { aA: 60, contrib: 8000, growth: 4000, bal: 100000 },
      { aA: 61, contrib: 4000, growth: 4000, bal: 108000 }, // only B working
      { aA: 62, contrib: 4000, growth: 5000, bal: 117000 }, // only B working
      { aA: 63, contrib: 0, growth: 6000, bal: 123000 }, // both retired
    ];
    const s = accumulationSummary(diffRows, 61, 60, 53, 50);
    expect(s.workingYears).toBe(3); // AND would give 1 (only aA=60)
    expect(s.totalContrib).toBe(16000);
    expect(s.totalGrowth).toBe(13000);
    expect(s.balAtRet).toBe(117000); // last working row (aA=62), the year before both retired
  });

  it("returns zero contrib and growth when both spouses are already retired", () => {
    // aA=65 >= stopAgeA=65 AND aB=55 >= stopAgeB=55 → excluded under OR.
    const retiredRows = [
      { aA: 65, contrib: 0, growth: 5000, bal: 500000 },
    ];
    const s = accumulationSummary(retiredRows, 65, 65, 55, 55);
    expect(s.totalContrib).toBe(0);
    expect(s.totalGrowth).toBe(0);
    expect(s.workingYears).toBe(0);
    expect(s.balAtRet).toBe(0); // no working anchor → no meaningful retirement balance
  });

  it("handles an empty rows array without throwing", () => {
    const s = accumulationSummary([], 62, 60, 52, 50);
    expect(s.totalContrib).toBe(0);
    expect(s.totalGrowth).toBe(0);
    expect(s.workingYears).toBe(0);
    expect(s.balAtRet).toBe(0);
    expect(s.blendedReturn).toBeGreaterThanOrEqual(0);
  });

  it("returns a non-negative blendedReturn for a growing portfolio", () => {
    const s = accumulationSummary(rows, 62, 60, 52, 50);
    expect(s.blendedReturn).toBeGreaterThanOrEqual(0);
  });
});
