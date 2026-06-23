import { describe, it, expect } from "vitest";
import { makeDefaultPlan } from "./defaultPlan.js";
import { calculatePlan } from "./calculatorCore.js";

describe("default plan — golden headline", () => {
  it("pins the default steady-state headline (Wave 3 D1 baseline)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // Wave 3 D1: tax-smart withdrawal order (taxable→deferred→roth) defers ordinary income,
    // lowering early-retirement tax. The modest steady-state draw comes almost entirely from
    // the taxable bucket (ordinaryShare ~0.08 vs the legacy flat 0.7), so the headline net
    // rises and the deferred-balance trajectory (RMD base + after-tax reinvestment) shifts FV.
    // Re-baselined: net 139316 → 146353, FV 1363146 → 1375531. targetNeed/startAgeA unchanged.
    expect(Math.round(steady.net)).toBe(146353);
    expect(Math.round(steady.targetNeed)).toBe(66488);
    expect(Math.round(steady.FV)).toBe(1375531);
    expect(steady.startAgeA).toBe(74);
  });
});
