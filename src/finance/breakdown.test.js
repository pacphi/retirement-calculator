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
    expect(b.expenses.living).toBeCloseTo((96000 - 12000) / 12, 6);
    expect(b.expenses.extra).toBeCloseTo(1000, 6);
    expect(b.expenseTotalMo).toBeCloseTo((84000 + 12000 + 12000) / 12, 6);
  });

  it("falls back to wd when wdSpend is absent and tolerates missing fields", () => {
    const b = monthlyBreakdown({ wd: 24000, need: 24000 });
    expect(b.draw).toBeCloseTo(2000, 6);
    expect(b.income.salA).toBe(0);
    expect(Number.isNaN(b.netMo)).toBe(false);
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
});
