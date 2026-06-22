import { describe, expect, it } from "vitest";
import { smileMultiplier } from "./smile.js";

const shape = { mode: "smile", earlyDecline: 0.01, upturnAge: 85, lateUpturn: 0.01 };

describe("smileMultiplier", () => {
  it("is 1 while working or when flat", () => {
    expect(smileMultiplier(60, 65, shape)).toBe(1);                 // pre-retirement
    expect(smileMultiplier(80, 65, { mode: "flat" })).toBe(1);      // flat mode
  });
  it("declines ~1%/yr through the go-go/slow-go years", () => {
    expect(smileMultiplier(65, 65, shape)).toBeCloseTo(1, 6);       // year 0
    expect(smileMultiplier(75, 65, shape)).toBeCloseTo(0.9, 6);     // -10% by 75
  });
  it("never falls below the floor", () => {
    expect(smileMultiplier(120, 65, shape)).toBeGreaterThanOrEqual(0.75);
  });
  it("drifts back up after the upturn age", () => {
    const trough = smileMultiplier(85, 65, shape);
    expect(smileMultiplier(90, 65, shape)).toBeGreaterThan(trough);
    expect(smileMultiplier(200, 65, shape)).toBeLessThanOrEqual(1);
  });
  it("tolerates a shape with no sub-keys (bare flat fallback)", () => {
    expect(smileMultiplier(75, 65, { mode: "flat" })).toBe(1);
  });
  it("tolerates a shape with mode smile but no sub-keys (uses SMILE_DEFAULTS)", () => {
    const result = smileMultiplier(75, 65, { mode: "smile" });
    expect(result).toBeCloseTo(0.9, 6); // 10 years * 0.01 default decline
  });
});
