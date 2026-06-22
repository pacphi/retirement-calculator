import { describe, expect, it } from "vitest";
import { activeJurisdiction } from "./jurisdiction.js";
import { US_STATE_TAX } from "../retirementData.js";

it("uses the work state before relocation and the retire state after", () => {
  const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046 };
  expect(activeJurisdiction(i, 2030).profile).toBe(US_STATE_TAX.CA);
  expect(activeJurisdiction(i, 2030).isRetirement).toBe(false);
  expect(activeJurisdiction(i, 2050).profile).toBe(US_STATE_TAX.TX);
  expect(activeJurisdiction(i, 2050).isRetirement).toBe(true);
});

describe("activeJurisdiction", () => {
  it("returns the WA profile for workLoc WA (no wage tax but has property tax)", () => {
    const i = { workLoc: "WA", stateCode: "TX", relocationYear: 2046 };
    expect(activeJurisdiction(i, 2030).profile).toBe(US_STATE_TAX.WA);
    expect(activeJurisdiction(i, 2030).propertyTaxRate).toBeCloseTo(0.0087, 4);
  });

  it("returns propertyTaxRate from work state in working years", () => {
    const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046 };
    expect(activeJurisdiction(i, 2030).propertyTaxRate).toBeCloseTo(US_STATE_TAX.CA.propertyTaxRate, 6);
  });

  it("returns propertyTaxRate from retire state in retirement", () => {
    const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046 };
    expect(activeJurisdiction(i, 2050).propertyTaxRate).toBeCloseTo(US_STATE_TAX.TX.propertyTaxRate, 6);
  });

  it("returns 0 propertyTaxRate for international retire location", () => {
    const i = { workLoc: "CA", retireLoc: "Austria", relocationYear: 2046 };
    const j = activeJurisdiction(i, 2050);
    expect(j.propertyTaxRate).toBe(0);
  });

  it("manual stateRate override forces null profile in both periods", () => {
    const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046, stateRate: 5 };
    expect(activeJurisdiction(i, 2030).profile).toBeNull();
    expect(activeJurisdiction(i, 2050).profile).toBeNull();
  });

  it("relocationYear boundary: year equals relocationYear is retirement", () => {
    const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046 };
    expect(activeJurisdiction(i, 2046).isRetirement).toBe(true);
  });
});
