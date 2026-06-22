import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { RETURN_PRESETS, SMILE_DEFAULTS } from "../retirementData.js";

const bareState = {
  ageA: 57, ageB: 48, stopA: 65, stopB: 56, claimA: 65, claimB: 65, pensionAge: 65,
  incomeA: 0, incomeB: 170000, savings: 670000, contrib: 18000, targetPct: 0.4, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 50424, ssFraB: 31592,
  pensionOn: true, plan: 3, pYears: 22, afc: 170000,
  realReturn: 0.05, swr: 0.04, tradFrac: 0.7, inflation: 0.025,
  ssMode: "trustees", ssHaircut: 81, ssCutYear: 2034,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("buildPlanInputs Wave 1 defaults", () => {
  it("defaults spendingShape to flat and lifestyleSteps to empty for a bare state", () => {
    const inp = buildPlanInputs(bareState);
    expect(inp.spendingShape).toEqual({ mode: "flat" });
    expect(inp.lifestyleSteps).toEqual([]);
    expect(inp.volatility).toBe(0.12);
    expect(inp.returnPreset).toBe("custom");
  });

  it("constants exist and are source-bracketed", () => {
    expect(RETURN_PRESETS.balanced.realReturn).toBe(0.05);
    expect(SMILE_DEFAULTS.upturnAge).toBe(85);
  });
});
