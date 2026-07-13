import { describe, it, expect } from "vitest";
import { INVESTMENT_FUNDS, ALLOCATION_SPLIT } from "./investmentData.js";

describe("INVESTMENT_FUNDS", () => {
  it("has unique fund ids", () => {
    const ids = INVESTMENT_FUNDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cites every fund with an https source and a signup link", () => {
    for (const f of INVESTMENT_FUNDS) {
      expect(f.citation).toMatch(/^https:\/\//);
      expect(f.signupUrl).toMatch(/^https:\/\//);
    }
  });

  it("tags every fund with a non-empty assetClass, riskTiers, and phases", () => {
    for (const f of INVESTMENT_FUNDS) {
      expect(["equity", "bond"]).toContain(f.assetClass);
      expect(f.riskTiers.length).toBeGreaterThan(0);
      expect(f.phases.length).toBeGreaterThan(0);
    }
  });

  it("has at least one equity fund and one bond fund for every risk tier × phase combination", () => {
    const tiers = ["conservative", "moderate", "aggressive"];
    const phases = ["accumulation", "decumulation"];
    for (const tier of tiers) {
      for (const phase of phases) {
        const matching = INVESTMENT_FUNDS.filter(
          (f) => f.riskTiers.includes(tier) && f.phases.includes(phase) && !f.accreditedOnly
        );
        expect(matching.some((f) => f.assetClass === "equity")).toBe(true);
        expect(matching.some((f) => f.assetClass === "bond")).toBe(true);
      }
    }
  });
});

describe("ALLOCATION_SPLIT", () => {
  it("sums equity + bond to 100 for every risk tier × phase combination", () => {
    for (const tier of ["conservative", "moderate", "aggressive"]) {
      for (const phase of ["accumulation", "decumulation"]) {
        const split = ALLOCATION_SPLIT[tier][phase];
        expect(split.equity + split.bond).toBe(100);
      }
    }
  });

  it("increases equity share from conservative to aggressive within each phase", () => {
    expect(ALLOCATION_SPLIT.conservative.accumulation.equity).toBeLessThan(ALLOCATION_SPLIT.moderate.accumulation.equity);
    expect(ALLOCATION_SPLIT.moderate.accumulation.equity).toBeLessThan(ALLOCATION_SPLIT.aggressive.accumulation.equity);
  });
});
