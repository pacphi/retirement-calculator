import { describe, it, expect } from "vitest";
import { derivePhase, recommendFunds, accountNote, allocateAccounts } from "./investmentAdvisor.js";

describe("derivePhase", () => {
  it("returns accumulation when both spouses are still working", () => {
    expect(derivePhase({ ageA: 50, stopA: 65, ageB: 48, stopB: 62 })).toBe("accumulation");
  });

  it("returns decumulation when both spouses are retired", () => {
    expect(derivePhase({ ageA: 70, stopA: 65, ageB: 68, stopB: 62 })).toBe("decumulation");
  });

  it("returns both when one spouse is retired and the other is not", () => {
    expect(derivePhase({ ageA: 66, stopA: 65, ageB: 55, stopB: 62 })).toBe("both");
  });

  it("treats a spouse at exactly their stop age as retired", () => {
    expect(derivePhase({ ageA: 65, stopA: 65, ageB: 62, stopB: 62 })).toBe("decumulation");
  });
});

describe("recommendFunds", () => {
  it("returns target percentages that sum to 100 for every risk tier × phase combination", () => {
    for (const riskTolerance of ["conservative", "moderate", "aggressive"]) {
      for (const phase of ["accumulation", "decumulation"]) {
        const rec = recommendFunds({ riskTolerance, phase, accreditedInvestor: false });
        const total = rec.reduce((a, r) => a + r.targetPct, 0);
        expect(total).toBeCloseTo(100, 5);
      }
    }
  });

  it("excludes accredited-only funds when accreditedInvestor is false", () => {
    const rec = recommendFunds({ riskTolerance: "aggressive", phase: "accumulation", accreditedInvestor: false });
    expect(rec.some((r) => r.fund.id === "bxpe")).toBe(false);
  });

  it("includes accredited-only funds when accreditedInvestor is true", () => {
    const rec = recommendFunds({ riskTolerance: "aggressive", phase: "accumulation", accreditedInvestor: true });
    expect(rec.some((r) => r.fund.id === "bxpe")).toBe(true);
  });

  it("never recommends a growth/tech-only fund for the conservative tier", () => {
    const rec = recommendFunds({ riskTolerance: "conservative", phase: "accumulation", accreditedInvestor: true });
    expect(rec.some((r) => r.fund.id === "qqq")).toBe(false);
  });

  it("does not throw for any valid riskTolerance×phase combination in the current dataset", () => {
    const riskTiers = ["conservative", "moderate", "aggressive"];
    const phases = ["accumulation", "decumulation"];
    for (const riskTolerance of riskTiers) {
      for (const phase of phases) {
        // Should not throw for both accredited and non-accredited scenarios
        expect(() => recommendFunds({ riskTolerance, phase, accreditedInvestor: false })).not.toThrow();
        expect(() => recommendFunds({ riskTolerance, phase, accreditedInvestor: true })).not.toThrow();
      }
    }
  });
});

describe("accountNote", () => {
  const bondHeavyRec = [
    { fund: { assetClass: "bond" }, targetPct: 40 },
    { fund: { assetClass: "equity" }, targetPct: 60 },
  ];
  const equityOnlyRec = [{ fund: { assetClass: "equity" }, targetPct: 100 }];

  it("flags taxable accounts holding bond funds", () => {
    const note = accountNote({ type: "taxable" }, bondHeavyRec);
    expect(note).toMatch(/tax-advantaged/i);
  });

  it("returns null for tax-advantaged accounts", () => {
    expect(accountNote({ type: "401k" }, bondHeavyRec)).toBeNull();
  });

  it("returns null for taxable accounts with no bond funds in the recommendation", () => {
    expect(accountNote({ type: "taxable" }, equityOnlyRec)).toBeNull();
  });
});

describe("allocateAccounts", () => {
  const rec = [
    { fund: { id: "voo" }, targetPct: 60 },
    { fund: { id: "bnd" }, targetPct: 40 },
  ];

  it("splits each account's balance across the recommendation, summing back to the balance", () => {
    const [result] = allocateAccounts([{ id: "a1", name: "401k", type: "401k", balance: 10000 }], rec);
    const total = result.lines.reduce((a, l) => a + l.amount, 0);
    expect(total).toBeCloseTo(10000, 5);
    expect(result.lines.find((l) => l.fund.id === "voo").amount).toBeCloseTo(6000, 5);
    expect(result.lines.find((l) => l.fund.id === "bnd").amount).toBeCloseTo(4000, 5);
  });

  it("excludes accounts with a zero or negative balance", () => {
    const result = allocateAccounts(
      [{ id: "a1", name: "Empty", type: "taxable", balance: 0 }, { id: "a2", name: "Negative", type: "taxable", balance: -500 }],
      rec
    );
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when there are no accounts", () => {
    expect(allocateAccounts([], rec)).toHaveLength(0);
    expect(allocateAccounts(undefined, rec)).toHaveLength(0);
  });
});
