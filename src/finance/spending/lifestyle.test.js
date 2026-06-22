import { describe, expect, it } from "vitest";
import { lifestyleStepDelta } from "./lifestyle.js";

describe("lifestyleStepDelta", () => {
  const steps = [
    { id: "a", fromYear: 2030, deltaAnnual: 15000 },
    { id: "b", fromYear: 2040, deltaAnnual: -8000 },
  ];
  it("sums step deltas active by the calendar year", () => {
    expect(lifestyleStepDelta(steps, 2029)).toBe(0);
    expect(lifestyleStepDelta(steps, 2035)).toBe(15000);
    expect(lifestyleStepDelta(steps, 2041)).toBe(7000); // 15000 - 8000
  });
  it("ignores disabled steps and tolerates empty/undefined", () => {
    expect(lifestyleStepDelta([{ fromYear: 2030, deltaAnnual: 9000, on: false }], 2031)).toBe(0);
    expect(lifestyleStepDelta(undefined, 2031)).toBe(0);
  });
});
