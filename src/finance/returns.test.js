import { describe, expect, it } from "vitest";
import { resolveReturn, resolveYearReturn, blendedMean } from "./returns.js";

describe("resolveReturn", () => {
  it("maps a known preset to its central real return", () => {
    expect(resolveReturn("balanced")).toBe(0.05);
    expect(resolveReturn("conservative")).toBe(0.035);
    expect(resolveReturn("growth")).toBe(0.065);
  });
  it("falls back to the custom value for 'custom' or unknown presets", () => {
    expect(resolveReturn("custom", 0.042)).toBe(0.042);
    expect(resolveReturn(undefined, 0.05)).toBe(0.05);
  });
});

describe("returnModel", () => {
  it("blended mode returns the single realReturn", () => {
    expect(resolveYearReturn({ realReturn: 0.05, returnModel: { mode: "blended" } }, 3, {})).toBe(0.05);
  });
  it("glidepath interpolates equity from now → retirement", () => {
    const i = { returnModel: { mode: "glidepath", equityPctNow: 80, equityPctAtRetire: 40, equityReal: 0.065, bondReal: 0.02 } };
    // progress 0 (start): 80% equity → 0.8*0.065 + 0.2*0.02 = 0.056
    expect(resolveYearReturn(i, 0, { yearsToRetire: 10, totalAccumYears: 10 })).toBeCloseTo(0.056, 6);
    // progress 1 (at retirement): 40% equity → 0.4*0.065 + 0.6*0.02 = 0.038
    expect(resolveYearReturn(i, 10, { yearsToRetire: 0, totalAccumYears: 10 })).toBeCloseTo(0.038, 6);
  });
  it("byBucket weights per-bucket returns by balance", () => {
    const i = { returnModel: { mode: "byBucket", taxableReal: 0.04, deferredReal: 0.06, rothReal: 0.06 } };
    const r = resolveYearReturn(i, 0, { buckets: { taxable: 100000, deferred: 100000, roth: 0 } });
    expect(r).toBeCloseTo(0.05, 6);
  });
  it("blendedMean equals realReturn for blended (MC unchanged)", () => {
    expect(blendedMean({ realReturn: 0.05, returnModel: { mode: "blended" } })).toBe(0.05);
  });
});
