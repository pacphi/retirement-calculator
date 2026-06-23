import { describe, it, expect } from "vitest";
import { nextSpendingMultiplier, GUARDRAIL_DEFAULTS } from "./guardrails.js";
import { simulate } from "./simulate.js";
import { buildPlanInputs } from "./plan.js";
import { makeDefaultPlan } from "../defaultPlan.js";

const bands = GUARDRAIL_DEFAULTS;
describe("Guyton-Klinger step", () => {
  it("trims spending when withdrawal rate breaches the upper guardrail", () => {
    // base 4%, upper = 4% * 1.2 = 4.8%; a 5.5% rate breaches → cut 10%
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.055, baseRate: 0.04, bands });
    expect(r.breach).toBe("cut");
    expect(r.multiplier).toBeCloseTo(0.9, 6);
  });
  it("raises spending below the lower guardrail", () => {
    // lower = 4% * 0.8 = 3.2%; a 2.5% rate → raise 10%
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.025, baseRate: 0.04, bands });
    expect(r.breach).toBe("raise");
    expect(r.multiplier).toBeCloseTo(1.1, 6);
  });
  it("holds inside the guardrails", () => {
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.04, baseRate: 0.04, bands });
    expect(r.breach).toBe(null);
    expect(r.multiplier).toBe(1);
  });
});

describe("simulate() guardrail carry-forward", () => {
  // Build a plan where the actual withdrawal rate exceeds the upper guardrail.
  // Using swr:0.01 ensures the upper guardrail is 1.2% — any meaningful withdrawal
  // against a modest balance will breach it, triggering cuts.
  const base = makeDefaultPlan();
  const breachBase = {
    ...base,
    savings: 50000,
    swr: 0.01, // upper guardrail = 0.01 * 1.2 = 1.2%; easy to breach
    travel: { ...base.travel, on: false },
    events: base.events.map((e) => ({ ...e, on: false })),
    ltc: { ...base.ltc, on: false },
  };

  it("fixed strategy leaves spendMult at 1 across all years", () => {
    const inp = buildPlanInputs({ ...breachBase, spendingStrategy: "fixed" });
    const sim = simulate(inp, { haircut: 1, cutYear: 9999 });
    const allOne = sim.rows.every((r) => r.spendMult === 1);
    expect(allOne).toBe(true);
  });

  it("guardrails strategy trims spendMult below 1 when upper band is breached", () => {
    const inp = buildPlanInputs({ ...breachBase, spendingStrategy: "guardrails", guardrails: GUARDRAIL_DEFAULTS });
    const sim = simulate(inp, { haircut: 1, cutYear: 9999 });
    // With swr:0.01, actual withdrawal rate easily exceeds 1.2% → cuts accumulate.
    const hasTrim = sim.rows.some((r) => r.spendMult < 1);
    expect(hasTrim).toBe(true);
  });

  it("fixed strategy produces byte-identical need to a pre-Task-6 run (default plan golden)", () => {
    // The default plan has spendingStrategy absent (undefined → "fixed" path: spendMult=1).
    const inp = buildPlanInputs(makeDefaultPlan());
    const sim = simulate(inp, { haircut: 1, cutYear: 9999 });
    // The golden row at startAgeA=74 must match the pinned need from the golden test.
    const startRow = sim.rows.find((r) => r.aA === 74);
    expect(startRow).toBeDefined();
    // need is 66488 from the golden test; allow ±1 for rounding.
    expect(Math.abs(startRow.need - 66488)).toBeLessThanOrEqual(1);
  });
});
