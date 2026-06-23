import { describe, it, expect } from "vitest";
import { makeDefaultPlan } from "./defaultPlan.js";
import { calculatePlan } from "./calculatorCore.js";

describe("default plan — golden headline", () => {
  it("pins the default steady-state headline (Wave 3 D1 baseline)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // Wave 3 D2: general surplus reinvest captures after-tax guaranteed-income surplus in
    // the taxable bucket each retirement year where wd===0. This raises the steady-state
    // taxable balance and FV, so net rises. targetNeed and startAgeA are unchanged.
    // Re-baselined: net 146353 → 148312, FV 1375531 → 1401304. targetNeed/startAgeA unchanged.
    expect(Math.round(steady.net)).toBe(148312);
    expect(Math.round(steady.targetNeed)).toBe(66488);
    expect(Math.round(steady.FV)).toBe(1401304);
    expect(steady.startAgeA).toBe(74);
  });
});
