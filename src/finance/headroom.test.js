import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { simulate } from "./simulate.js";
import { spendingHeadroom } from "./headroom.js";

const richState = {
  ageA: 60, ageB: 60, stopA: 60, stopB: 60, claimA: 62, claimB: 62, pensionAge: 65,
  incomeA: 0, incomeB: 0, savings: 5000000, contrib: 0, targetPct: 0.4, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 0, ssFraB: 0,
  pensionOn: false, plan: 3, pYears: 0, afc: 0,
  realReturn: 0.04, swr: 0.04, tradFrac: 0.5, inflation: 0.025,
  ssMode: "full", ssHaircut: 100, ssCutYear: 9999,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("spendingHeadroom", () => {
  it("reports positive headroom for a well-funded plan", () => {
    const inp = buildPlanInputs(richState);
    const h = spendingHeadroom(inp, simulate, 95, { haircut: 1, cutYear: 9999 });
    expect(h.delta).toBeGreaterThan(0);
    expect(h.lastsToHorizon).toBe(true);
  });
  it("reports a small/negative headroom for a thin plan", () => {
    const inp = buildPlanInputs({ ...richState, savings: 200000 });
    const h = spendingHeadroom(inp, simulate, 95, { haircut: 1, cutYear: 9999 });
    expect(h.delta).toBeLessThan(spendingHeadroom(buildPlanInputs(richState), simulate, 95, { haircut: 1, cutYear: 9999 }).delta);
  });
  it("reports negative delta and lastsToHorizon:false for an already-insolvent plan", () => {
    // Large income-basis need (0.4 × $200k) against a tiny portfolio and no SS/pension:
    // the baseline plan depletes well before the horizon.
    const insolventState = { ...richState, savings: 80000, incomeB: 200000, stopA: 60, stopB: 60 };
    const inp = buildPlanInputs(insolventState);
    // Sanity-check the fixture is genuinely short before asserting the contract.
    expect(simulate(inp, { haircut: 1, cutYear: 9999 }).depAge).toBeLessThan(95);
    const h = spendingHeadroom(inp, simulate, 95, { haircut: 1, cutYear: 9999 });
    expect(h.delta).toBeLessThan(0);
    expect(h.lastsToHorizon).toBe(false);
  });
});
