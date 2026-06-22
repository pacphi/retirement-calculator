import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { US_STATE_TAX, INTL_TAX } from "../retirementData.js";

const bare = {
  ageA: 57, ageB: 48, stopA: 65, stopB: 56, claimA: 65, claimB: 65, pensionAge: 65,
  incomeA: 0, incomeB: 170000, savings: 670000, contrib: 18000, targetPct: 0.28, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 50424, ssFraB: 31592,
  pensionOn: true, plan: 3, pYears: 22, afc: 170000,
  realReturn: 0.05, swr: 0.04, tradFrac: 0.7, inflation: 0.025,
  ssMode: "trustees", ssHaircut: 81, ssCutYear: 2034,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("Wave 2 foundation defaults", () => {
  it("curated state table includes the spread with typed profiles", () => {
    expect(US_STATE_TAX.WA.retireRate).toBe(0);     // no income tax
    expect(US_STATE_TAX.WA.taxesSS).toBe(false);
    expect(US_STATE_TAX.CA.taxesSS).toBe(false);    // CA exempts SS
    expect(US_STATE_TAX.CA.taxesTradWithdrawal).toBe(true);
    expect(US_STATE_TAX.IL.pensionExclusion).toBe("full"); // IL exempts retirement income
  });
  it("buildPlanInputs defaults housing/workLoc/relocationYear", () => {
    const inp = buildPlanInputs(bare);
    expect(inp.housing.tenure).toBe("rent");
    expect(inp.workLoc).toBe("WA");
    expect(typeof inp.relocationYear).toBe("number");
  });
  it("INTL_TAX Austria has correct treaty-aware flags", () => {
    expect(INTL_TAX["Austria"].pensionExclusion).toBe("full");
    expect(INTL_TAX["Austria"].taxesTradWithdrawal).toBe(true);
  });
});
