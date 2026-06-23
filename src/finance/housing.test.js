// src/finance/housing.test.js
import { describe, expect, it } from "vitest";
import { monthlyPI, payoffYear, housingCostForYear, remainingBalance, resolveDwelling, retirementDwellingAnnualCost } from "./housing.js";

describe("housing amortization", () => {
  it("computes the standard monthly P&I", () => {
    // $300k, 6%/yr, 30yr → ~$1,798.65/mo
    expect(monthlyPI(300000, 6, 30)).toBeCloseTo(1798.65, 1);
  });
  it("zero rate spreads principal evenly", () => {
    expect(monthlyPI(360000, 0, 30)).toBeCloseTo(1000, 6);
  });
  it("payoff year is start + term", () => {
    expect(payoffYear({ principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 })).toBe(2056);
  });
});

describe("housingCostForYear", () => {
  const mortgage = { tenure: "mortgage", mortgage: { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 }, homeValue: 375000, insuranceAnnual: 1800, maintenancePct: 0.01 };
  it("deflates P&I in real terms and adds real-flat carrying costs", () => {
    const y0 = housingCostForYear(mortgage, 2026, 0.025, 0.012);
    expect(y0.pi).toBeCloseTo(1798.65 * 12, 0);                    // year 0 no deflation
    const y10 = housingCostForYear(mortgage, 2036, 0.025, 0.012);
    expect(y10.pi).toBeCloseTo(1798.65 * 12 / Math.pow(1.025, 10), 0); // deflated
    expect(y0.propertyTax).toBeCloseTo(0.012 * 375000, 6);         // real-flat
  });
  it("zeros P&I from the payoff year on", () => {
    expect(housingCostForYear(mortgage, 2056, 0.025, 0.012).pi).toBe(0);
    expect(housingCostForYear(mortgage, 2057, 0.025, 0.012).pi).toBe(0);
  });
  it("own tenure has no P&I or rent", () => {
    const own = { tenure: "own", mortgage: { principal: 0 }, homeValue: 324000, insuranceAnnual: 0, maintenancePct: 0.01 };
    const c = housingCostForYear(own, 2040, 0.025, 0.012);
    expect(c.pi).toBe(0);
    expect(c.propertyTax).toBeCloseTo(0.012 * 324000, 6);
  });
});

describe("remainingBalance", () => {
  const m = { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 };
  it("computes the outstanding mortgage balance partway through the term", () => {
    expect(remainingBalance(m, 2026)).toBeCloseTo(300000, 0);  // start
    expect(remainingBalance(m, 2056)).toBe(0);                  // paid off
    expect(remainingBalance(m, 2041)).toBeGreaterThan(0);       // mid-term
    expect(remainingBalance(m, 2041)).toBeLessThan(300000);
  });
  it("returns 0 for no-principal mortgage", () => {
    expect(remainingBalance({}, 2030)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveDwelling — characterization tests
// Captures the EXACT behavior of the inline block formerly in simulate.js.
// Fixtures use the real i.housing.relocation shape (not a top-level field).
// ctx carries { inheritedOwnOverride, propertyTaxRate } — pre-computed loop
// locals that the caller already has before calling resolveDwelling.
// ---------------------------------------------------------------------------

describe("resolveDwelling — characterization", () => {
  // Shared: a renter in Washington working until 2046, relocating to Texas.
  const rentHousing = { tenure: "rent", rent: 1650, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 };
  const baseRenter = {
    housing: rentHousing,
    retireHousing: null,
    relocationYear: 2046,
    workLoc: "WA",
    stateCode: "TX",
    retireLoc: null,
    retLocObj: null,
    inher: [],
    inflation: 0.025,
  };

  it("should_returnWorkHome_when_calIsBeforeRelocationYear", () => {
    // Arrange
    const i = { ...baseRenter };
    const cal = 2030;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert
    expect(d.housing.tenure).toBe("rent");
    expect(d.transition).toBe("none");
    expect(d.sellLump).toBe(0);
    expect(d.keepRentalIncome).toBe(0);
    expect(d.keepMortgageCost).toBe(0);
  });

  it("should_returnRentNoTransition_when_renterReachesRelocationYear", () => {
    // Arrange — renter relocating: no owned work home, so no real transition
    const i = { ...baseRenter };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert: no relocationTransition (work home is rent, not owned/mortgaged)
    expect(d.housing.tenure).toBe("rent");
    expect(d.transition).toBe("none");
    expect(d.sellLump).toBe(0);
  });

  it("should_sellAndReturnRetireRent_when_mortgagedWorkHomeIsSoldAtRelocationYear", () => {
    // Arrange — mortgaged WA home sold at move year; retirement is renting in TX
    const i = {
      housing: {
        tenure: "mortgage",
        mortgage: { principal: 300000, ratePct: 5, termYears: 30, startYear: 2026 },
        homeValue: 500000,
        insuranceAnnual: 2000,
        maintenancePct: 0.01,
        relocation: { action: "sell", saleValue: 600000 },
      },
      retireHousing: { tenure: "rent", rent: 2000, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
      relocationYear: 2046,
      workLoc: "WA",
      stateCode: "TX",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
    };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert
    expect(d.housing.tenure).toBe("rent");
    expect(d.transition).toBe("sell");
    expect(d.sellLump).toBeGreaterThan(0);           // NET proceeds deposited
    expect(d.keepRentalIncome).toBe(0);
    expect(d.keepMortgageCost).toBe(0);
  });

  it("should_returnNetSaleProceeds_when_sellTransitionFires", () => {
    // Arrange — verify the sell lump is HOME_SELL_NET * saleValue − remaining balance
    // HOME_SELL_NET = 0.93, saleValue = 600000 → gross = 558000 − remaining balance at 2046
    const mortgage = { principal: 300000, ratePct: 5, termYears: 30, startYear: 2026 };
    const i = {
      housing: {
        tenure: "mortgage",
        mortgage,
        homeValue: 500000,
        insuranceAnnual: 2000,
        maintenancePct: 0.01,
        relocation: { action: "sell", saleValue: 600000 },
      },
      retireHousing: { tenure: "rent", rent: 2000, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
      relocationYear: 2046,
      workLoc: "CA",       // CA→TX: different jurisdiction
      stateCode: "TX",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
    };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);
    const owed = remainingBalance(mortgage, 2046);
    const expectedLump = Math.max(0, 0.93 * 600000 - owed);

    // Assert
    expect(d.sellLump).toBeCloseTo(expectedLump, 1);
    expect(d.transition).toBe("sell");
  });

  it("should_keepRentalIncomeAndMortgageCost_when_keepTransitionIsActive", () => {
    // Arrange — owned WA home kept as rental from relocationYear on
    // HOME_RENT_YIELD = 0.035, homeValue = 500000 → keepRentalIncome = 17500
    const mortgage = { principal: 300000, ratePct: 5, termYears: 30, startYear: 2026 };
    const i = {
      housing: {
        tenure: "mortgage",
        mortgage,
        homeValue: 500000,
        insuranceAnnual: 2000,
        maintenancePct: 0.01,
        relocation: { action: "keep", saleValue: 0 },
      },
      retireHousing: { tenure: "rent", rent: 2000, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
      relocationYear: 2046,
      workLoc: "CA",
      stateCode: "TX",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
    };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert
    expect(d.transition).toBe("keep");
    expect(d.keepRentalIncome).toBeCloseTo(0.035 * 500000, 1);
    expect(d.keepMortgageCost).toBeGreaterThan(0);   // mortgage still running at 2046
    expect(d.housing.tenure).toBe("rent");            // living in the retire housing
    expect(d.sellLump).toBe(0);
  });

  it("should_useInheritedOwnOverride_when_ctxProvidesOne", () => {
    // Arrange — an inherited-live-in home overrides the base housing
    const inheritedOwnOverride = {
      tenure: "own",
      homeValue: 400000,
      insuranceAnnual: 1500,
      maintenancePct: 0.01,
    };
    const i = { ...baseRenter, relocationYear: 2026 }; // already past relocation
    const cal = 2030;
    const ctx = { inheritedOwnOverride, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert — effectiveHousing is the override, not the renter housing
    expect(d.housing.tenure).toBe("own");
    expect(d.housing.homeValue).toBe(400000);
  });

  it("should_returnNoTransition_when_workAndRetireLocAreSame", () => {
    // Arrange — same jurisdiction: no real relocation transition even with owned home
    const i = {
      housing: {
        tenure: "own",
        homeValue: 400000,
        insuranceAnnual: 1500,
        maintenancePct: 0.01,
        relocation: { action: "sell", saleValue: 500000 },
      },
      retireHousing: null,
      relocationYear: 2046,
      workLoc: "WA",
      stateCode: "WA",    // same as workLoc → jurisdictionDiffers = false
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
    };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert — no transition; home stays as-is
    expect(d.transition).toBe("none");
    expect(d.sellLump).toBe(0);
    expect(d.housing.tenure).toBe("own");
  });

  it("should_returnNoTransition_when_sellSaleValueIsZeroAndNoRetireHousing", () => {
    // Arrange — sell action with saleValue=0 and no retireHousing: user hasn't configured a move
    const i = {
      housing: {
        tenure: "mortgage",
        mortgage: { principal: 300000, ratePct: 5, termYears: 30, startYear: 2026 },
        homeValue: 500000,
        insuranceAnnual: 2000,
        maintenancePct: 0.01,
        relocation: { action: "sell", saleValue: 0 },
      },
      retireHousing: null,
      relocationYear: 2046,
      workLoc: "WA",
      stateCode: "TX",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
    };
    const cal = 2046;
    const ctx = { inheritedOwnOverride: null, propertyTaxRate: 0 };

    // Act
    const d = resolveDwelling(i, cal, ctx);

    // Assert — sell+saleValue=0 with no retireHousing → no real transition
    expect(d.transition).toBe("none");
    expect(d.sellLump).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// retirementDwellingAnnualCost — unit tests
// Verifies basis classification and annual cost computation for each tenure.
// ---------------------------------------------------------------------------

describe("retirementDwellingAnnualCost", () => {
  it("should_returnRentBasisAndAnnualRentCost_when_householdIsRenter", () => {
    // Arrange
    const rent = 1650;
    const i = {
      housing: {
        tenure: "rent",
        rent,
        homeValue: 0,
        insuranceAnnual: 0,
        maintenancePct: 0,
        relocation: { action: "sell", saleValue: 0 },
      },
      retireHousing: null,
      relocationYear: 2046,
      workLoc: "WA",
      stateCode: null,
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
      activePropertyTaxRate: 0,
      ageA: 57, ageB: 48, stopA: 65, stopB: 56,
    };

    // Act
    const result = retirementDwellingAnnualCost(i);

    // Assert
    expect(result.basis).toBe("rent");
    expect(result.annual).toBeCloseTo(rent * 12, 0);
    expect(typeof result.note).toBe("string");
  });

  it("should_returnMortgageBasisAndPositiveAnnual_when_householdHasMortgage", () => {
    // Arrange
    const i = {
      housing: {
        tenure: "mortgage",
        mortgage: { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 },
        homeValue: 375000,
        insuranceAnnual: 1800,
        maintenancePct: 0.01,
        relocation: { action: "sell", saleValue: 0 },
      },
      retireHousing: null,
      relocationYear: 9999, // no relocation — use work home at retirement
      workLoc: "WA",
      stateCode: "WA",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
      activePropertyTaxRate: 0.012,
      ageA: 57, ageB: 48, stopA: 65, stopB: 56,
    };

    // Act
    const result = retirementDwellingAnnualCost(i);

    // Assert
    expect(result.basis).toBe("mortgage");
    expect(result.annual).toBeGreaterThan(0);
    expect(typeof result.note).toBe("string");
  });

  it("should_returnOwnBasisAndCarryingCostOnly_when_householdOwnsOutright", () => {
    // Arrange — own-outright: annual = propertyTax + insurance + maintenance; no rent, no P&I
    const homeValue = 400000;
    const propertyTaxRate = 0.012;
    const insuranceAnnual = 1500;
    const maintenancePct = 0.01;
    const expectedAnnual = propertyTaxRate * homeValue + insuranceAnnual + maintenancePct * homeValue;
    const i = {
      housing: {
        tenure: "own",
        homeValue,
        insuranceAnnual,
        maintenancePct,
        mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
        relocation: { action: "sell", saleValue: 0 },
      },
      retireHousing: null,
      relocationYear: 9999,
      workLoc: "WA",
      stateCode: "WA",
      retireLoc: null,
      retLocObj: null,
      inher: [],
      inflation: 0.025,
      activePropertyTaxRate: propertyTaxRate,
      ageA: 57, ageB: 48, stopA: 65, stopB: 56,
    };

    // Act
    const result = retirementDwellingAnnualCost(i);

    // Assert
    expect(result.basis).toBe("own");
    expect(result.annual).toBeCloseTo(expectedAnnual, 1);
    expect(result.annual).not.toBeCloseTo(0, 0); // no rent, no P&I — but carrying costs present
  });
});
