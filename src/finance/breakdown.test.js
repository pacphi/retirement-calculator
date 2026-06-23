// src/finance/breakdown.test.js
import { describe, expect, it } from "vitest";
import { monthlyBreakdown, yearMilestones } from "./breakdown.js";

describe("monthlyBreakdown", () => {
  it("divides annual figures into an honest per-month rate", () => {
    const row = { salA: 120000, salB: 0, rent: 12000, pens: 24000, ssA: 18000, ssB: 6000,
      wdSpend: 36000, wd: 99999, need: 96000, extraSpend: 12000, tax: 12000 };
    const b = monthlyBreakdown(row);
    expect(b.income.salA).toBeCloseTo(10000, 6);
    expect(b.draw).toBeCloseTo(3000, 6);           // uses wdSpend, not wd
    // living = (need − extraSpend − housing) / 12; housing=0 here so unchanged
    expect(b.expenses.living).toBeCloseTo((96000 - 12000 - 0) / 12, 6);
    expect(b.expenses.extra).toBeCloseTo(1000, 6);
    // expenseTotalMo now includes housing (0 here), so total is unchanged
    expect(b.expenseTotalMo).toBeCloseTo((84000 + 12000 + 12000) / 12, 6);
  });

  it("falls back to wd when wdSpend is absent and tolerates missing fields", () => {
    const b = monthlyBreakdown({ wd: 24000, need: 24000 });
    expect(b.draw).toBeCloseTo(2000, 6);
    expect(b.income.salA).toBe(0);
    expect(Number.isNaN(b.netMo)).toBe(false);
  });

  // Task 9: housing itemization — rent figure visible as its own line
  it("itemizes housing — rent figure visible as its own line (Task 9)", () => {
    const row = { salA: 0, salB: 0, rent: 0, pens: 24000, ssA: 18000, ssB: 6000,
      wdSpend: 36000, need: 96000, extraSpend: 0, tax: 12000,
      housing: 24000, housingRentOrPI: 24000, housingPropertyTax: 0 };
    const b = monthlyBreakdown(row);
    expect(b.expenses.housing).toBeCloseTo(2000, 6);                // 24000 / 12 total
    expect(b.expenses.housingDetail.rentOrPI).toBeCloseTo(2000, 6); // the rent figure, per month
    expect(b.expenses.living).toBeCloseTo((96000 - 24000) / 12, 6); // living excludes housing
  });

  // Task 9: housing=0 rows must still expose the housing fields (zero) so callers don't crash
  it("exposes housing fields as zero when row has no housing (Task 9)", () => {
    const b = monthlyBreakdown({ need: 48000, extraSpend: 0, tax: 6000 });
    expect(b.expenses.housing).toBeCloseTo(0, 6);
    expect(b.expenses.housingDetail.rentOrPI).toBeCloseTo(0, 6);
    expect(b.expenses.housingDetail.propertyTax).toBeCloseTo(0, 6);
    expect(b.expenses.housingDetail.other).toBeCloseTo(0, 6);
  });
});

describe("yearMilestones", () => {
  const base = { aA: 64, aB: 62, ssA: 0, ssB: 0, pens: 0, rmd: 0, sellLump: 0, extraSpend: 0 };
  it("flags an income stream only on its onset year", () => {
    const prev = { ...base, ssA: 0 };
    const row = { ...base, ssA: 18000 };
    const ms = yearMilestones(row, prev);
    expect(ms.find((x) => x.key === "ssA")).toMatchObject({ kind: "income" });
    // no double-fire once already on
    expect(yearMilestones({ ...row }, { ...row })).toEqual([]);
  });
  it("surfaces a home sale as a spend milestone with its amount", () => {
    const ms = yearMilestones({ ...base, sellLump: 250000 }, base);
    expect(ms.find((x) => x.key === "sell")).toMatchObject({ kind: "spend", amount: 250000 });
  });
  it("flags Medicare at 65 and work-stop from inputs", () => {
    const ms = yearMilestones({ ...base, aA: 65 }, base, { stopA: 65 });
    expect(ms.map((x) => x.key)).toEqual(expect.arrayContaining(["med-a", "stop-a"]));
  });

  // Task 9: mortgage payoff milestone — flag-driven path
  it("flags mortgage payoff as a milestone (Task 9)", () => {
    const ms = yearMilestones(
      { aA: 70, housing: 8000, mortgagePaidOff: true },
      { housing: 30000 },
      {}
    );
    expect(ms.some(m => m.key === "payoff")).toBe(true);
  });

  // Task 9: mortgage payoff milestone — piDropped fallback path (NO flag).
  // P&I drops to 0 from a positive prior year → milestone fires without mortgagePaidOff.
  it("flags mortgage payoff via the piDropped fallback when no flag is set (Task 9)", () => {
    const ms = yearMilestones(
      { aA: 70, housing: 8000, housingRentOrPI: 0 }, // current: P&I gone, no mortgagePaidOff flag
      { aA: 69, housing: 30000, housingRentOrPI: 22000 }, // prior: P&I still positive
      {}
    );
    expect(ms.some(m => m.key === "payoff")).toBe(true);
  });
});
