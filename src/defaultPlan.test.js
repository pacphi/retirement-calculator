import { describe, it, expect } from "vitest";
import { makeDefaultPlan } from "./defaultPlan.js";
import { calculatePlan } from "./calculatorCore.js";

describe("default plan — golden headline", () => {
  it("pins the default steady-state headline (Wave 3 D1 baseline)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // Wave 4 default re-baseline: targetPct 0.28→0.3318 (60% total replacement), tradFrac
    // 0.7→0.9, rent 1650→3800/mo, relocationYear 2046→2035, travel slow/end years pushed out.
    // Higher spending + earlier residence tax + more deferred lower net & FV; need rises.
    // net 148312 → 123799, targetNeed 66488 → 75294, FV 1401304 → 924585. startAgeA unchanged.
    expect(Math.round(steady.net)).toBe(123799);
    expect(Math.round(steady.targetNeed)).toBe(75294);
    expect(Math.round(steady.FV)).toBe(924585);
    expect(steady.startAgeA).toBe(74);
  });
});
