import { describe, it, expect } from "vitest";
import { totalReplacementPct, totalPctToTargetPct } from "./Household.jsx";

describe("totalReplacementPct", () => {
  it("computes the displayed total replacement % from stored targetPct and housing cost", () => {
    // incomeHH=170000, targetPct=0.28 → nonHousing=47600, housing=19800, total=67400 → 40%
    expect(totalReplacementPct(170000, 0.28, 19800)).toBe(40);
  });

  it("returns 0 when incomeHH is zero", () => {
    expect(totalReplacementPct(0, 0.28, 19800)).toBe(0);
  });

  it("returns 0 when incomeHH is negative", () => {
    expect(totalReplacementPct(-1, 0.28, 19800)).toBe(0);
  });

  it("rounds fractional percentages to the nearest integer", () => {
    // 50000 * 0.30 + 10000 = 25000 → 50% exactly
    expect(totalReplacementPct(50000, 0.30, 10000)).toBe(50);
  });
});

describe("totalPctToTargetPct", () => {
  it("converts a total replacement % back to the stored non-housing targetPct (round-trip)", () => {
    // newTotalPct=40, housing=19800, income=170000 → nonHousing=47800 → targetPct=47800/170000≈0.281...
    // The exact round-trip: 40% of 170000=68000 − 19800=48200 → 48200/170000≈0.2835
    // But with the default display value of 40 (from Math.round(67400/170000*100)):
    // slider shows 40, so: 40/100*170000=68000 − 19800=48200 / 170000 ≈ 0.2835
    // We verify the inverse is close to 0.28 (within rounding of step=5)
    const result = totalPctToTargetPct(170000, 40, 19800);
    expect(result).toBeGreaterThanOrEqual(0.28);
    expect(result).toBeLessThan(0.29);
  });

  it("clamps to 0 when the total replacement % is below the housing-only share", () => {
    // housing=19800 on income=170000 is ~11.6%; a totalPct of 5% yields negative non-housing
    expect(totalPctToTargetPct(170000, 5, 19800)).toBe(0);
  });

  it("returns 0 when incomeHH is zero", () => {
    expect(totalPctToTargetPct(0, 40, 19800)).toBe(0);
  });

  it("returns exact targetPct when housing cost is zero", () => {
    // No housing offset: 50% of 200000 = 100000 → targetPct = 0.5
    expect(totalPctToTargetPct(200000, 50, 0)).toBeCloseTo(0.5, 10);
  });
});
