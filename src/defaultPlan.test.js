import { describe, it, expect } from "vitest";
import { makeDefaultPlan } from "./defaultPlan.js";
import { calculatePlan } from "./calculatorCore.js";

describe("default plan — golden headline", () => {
  it("pins the default steady-state headline (pre-Wave-3 baseline)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // BASELINE pinned 2026-06-22 (post Wave 2 + caption fix, pre Wave 3).
    // Fill these with the ACTUAL printed values in Step 3 — do not guess.
    expect(Math.round(steady.net)).toBe(139316);
    expect(Math.round(steady.targetNeed)).toBe(66488);
    expect(Math.round(steady.FV)).toBe(1363146);
    expect(steady.startAgeA).toBe(74);
  });
});
