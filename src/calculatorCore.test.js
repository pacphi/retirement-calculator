import { describe, expect, it } from "vitest";
import {
  afcIsAuto,
  benefits,
  calculateFederalTaxYear,
  calculatePlan,
  fedTax,
  pensionERF,
  resolveAfc,
  spousalBenefitAtClaimMonthly,
  standardDeduction,
  taxableSS,
  travelSpendForYear,
} from "./calculatorCore.js";

const baseState = {
  ageA:45, ageB:45, stopA:62, stopB:60, claimA:67, claimB:67, pensionAge:65,
  incomeA:90000, incomeB:75000, savings:300000, contrib:18000, targetPct:0.30, status:"married",
  ssModeA:"estimate", ssModeB:"estimate", ssFraA:36000, ssFraB:30000,
  pensionOn:true, system:"TRS", plan:2, pYears:20, afc:78000,
  realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
  ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
  retireLoc:"US -- national average",
  tx:{ on:true, value:790000, year:2038, strategy:"rent" },
  at:{ on:true, value:324000, year:2040, strategy:"live" },
};

describe("federal tax", () => {
  it("uses 2026 married brackets", () => {
    expect(fedTax(100800, "married")).toBeCloseTo(11600, 2);
  });

  it("gates senior deductions by actual age", () => {
    expect(standardDeduction({ status:"married", ageA:64, ageB:64, agi:100000 })).toBe(32200);
    expect(standardDeduction({ status:"married", ageA:65, ageB:64, agi:100000 })).toBe(39850);
    expect(standardDeduction({ status:"married", ageA:65, ageB:65, agi:100000 })).toBe(47500);
  });

  it("calculates taxable Social Security with the federal provisional-income cap", () => {
    expect(taxableSS(20000, 30000, "married")).toBe(1500);
    expect(taxableSS(60000, 30000, "married")).toBe(25500);
  });

  it("does not grant senior deductions before age 65 in early retirement", () => {
    const tax = calculateFederalTaxYear({
      status:"married",
      ageA:62,
      ageB:62,
      grossWithdrawal:50000,
      tradFrac:1,
      socialSecurity:20000,
    });
    expect(tax.deduction).toBe(32200);
  });
});

describe("Social Security", () => {
  it("caps spousal benefits at 50% at FRA instead of adding delayed credits", () => {
    expect(spousalBenefitAtClaimMonthly(3000, 67)).toBe(1500);
    expect(spousalBenefitAtClaimMonthly(3000, 70)).toBe(1500);
  });

  it("reduces spousal benefits to 32.5% of the worker PIA at age 62 when FRA is 67", () => {
    expect(spousalBenefitAtClaimMonthly(3000, 62)).toBeCloseTo(975, 2);
  });

  it("applies a custom 0% funding scenario only from the selected cut year", () => {
    const plan = calculatePlan({
      ...baseState,
      ageA:60,
      ageB:60,
      claimA:62,
      claimB:62,
      stopA:61,
      stopB:61,
      pensionOn:false,
      ssMode:"custom",
      ssHaircut:0,
      ssCutYear:2030,
      tx:{ ...baseState.tx, on:false },
      at:{ ...baseState.at, on:false },
    });
    const firstClaimYear = plan.simChosen.rows.find((r) => r.cal === 2028);
    const cutYear = plan.simChosen.rows.find((r) => r.cal === 2030);
    expect(firstClaimYear.ssA + firstClaimYear.ssB).toBeGreaterThan(0);
    expect(cutYear.ssA + cutYear.ssB).toBe(0);
  });

  it("does not reduce steady-state Social Security before a future custom cut year", () => {
    const plan = calculatePlan({
      ...baseState,
      ssMode:"custom",
      ssHaircut:50,
      ssCutYear:2099,
    });
    expect(plan.steady.ssHouse).toBeCloseTo(plan.sFull.ssHouse, 2);
  });
});

describe("WA DRS pension", () => {
  it("uses current DRS early-retirement factors and eligibility guards", () => {
    expect(pensionERF(55, 20, 2)).toBe(0.4092);
    expect(pensionERF(55, 19, 2)).toBe(0);
    expect(pensionERF(62, 30, 2)).toBe(0.85);
  });

  it("seeds AFC from the spouse's income when none is entered", () => {
    expect(afcIsAuto({ afc: null })).toBe(true);
    expect(afcIsAuto({ afc: "" })).toBe(true);
    expect(afcIsAuto({ afc: undefined })).toBe(true);
    expect(resolveAfc({ afc: null, incomeB: 75000 })).toBe(75000);
  });

  it("uses an explicit AFC entry over the income seed", () => {
    expect(afcIsAuto({ afc: 78000 })).toBe(false);
    expect(resolveAfc({ afc: 78000, incomeB: 75000 })).toBe(78000);
    expect(resolveAfc({ afc: 0, incomeB: 75000 })).toBe(0);
  });

  it("computes the same pension from a seeded AFC as from the matching explicit AFC", () => {
    const seeded = benefits({ ...baseState, afc: null, incomeB: 75000 });
    const explicit = benefits({ ...baseState, afc: 75000 });
    expect(seeded.pension).toBeCloseTo(explicit.pension, 6);
  });
});

describe("travel spending", () => {
  it("pays the full budget in the first 10 retirement years", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2034, 2034)).toBe(15000); // year 1
    expect(travelSpendForYear(t, 2043, 2034)).toBe(15000); // year 10
  });

  it("tapers to half for the slow-go years 11..N", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2044, 2034)).toBe(7500); // year 11
    expect(travelSpendForYear(t, 2048, 2034)).toBe(7500); // year 15
  });

  it("stops after the travel window and before retirement", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2049, 2034)).toBe(0); // year 16
    expect(travelSpendForYear(t, 2033, 2034)).toBe(0); // pre-retirement
  });

  it("returns 0 when travel is disabled and honors a flat (non-taper) budget", () => {
    expect(travelSpendForYear({ on: false, amount: 15000, years: 15, taper: true }, 2034, 2034)).toBe(0);
    expect(travelSpendForYear({ on: true, amount: 20000, years: 15, taper: false }, 2046, 2034)).toBe(20000);
  });
});

describe("full plan", () => {
  it("anchors steady-state income after selected benefits have actually started", () => {
    const plan = calculatePlan(baseState);
    expect(plan.steady.startAgeA).toBe(67);
    expect(plan.steady.startAgeB).toBe(67);
  });

  it("uses tax-aware yearly depletion rows", () => {
    const plan = calculatePlan({
      ...baseState,
      ageA:64,
      ageB:64,
      stopA:64,
      stopB:64,
      claimA:64,
      claimB:64,
      pensionOn:false,
      savings:100000,
      contrib:0,
      targetPct:0.65,
      tx:{ ...baseState.tx, on:false },
      at:{ ...baseState.at, on:false },
    });
    const firstRetiredRow = plan.simChosen.rows.find((r) => r.aA === 64);
    expect(firstRetiredRow.tax).toBeGreaterThan(0);
    expect(firstRetiredRow.wd).toBeGreaterThan(0);
  });
});
