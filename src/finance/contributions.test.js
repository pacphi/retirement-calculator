import { describe, it, expect } from "vitest";
import { vehicleLimit, rothIraAllowed, contributionPlan, realRaiseFactor } from "./contributions.js";

describe("2026 contribution limits", () => {
  it("401k base under 50", () => expect(vehicleLimit("401k", 49)).toBe(24500));
  it("401k with 50+ catch-up", () => expect(vehicleLimit("401k", 55)).toBe(32500));
  it("401k super catch-up 60-63", () => expect(vehicleLimit("401k", 61)).toBe(35750));
  it("401k reverts to standard catch-up at 64", () => expect(vehicleLimit("401k", 64)).toBe(32500));
  it("IRA base + catch-up", () => {
    expect(vehicleLimit("ira", 40)).toBe(7500);
    expect(vehicleLimit("ira", 50)).toBe(8600);
  });
  it("HSA family + 55 catch-up", () => {
    expect(vehicleLimit("hsaFamily", 40)).toBe(8750);
    expect(vehicleLimit("hsaFamily", 55)).toBe(9750);
  });
});

describe("Roth IRA phase-out", () => {
  it("fully allowed below MFJ floor", () => expect(rothIraAllowed(200000, "married").allowed).toBe(true));
  it("disallowed above MFJ ceiling", () => expect(rothIraAllowed(260000, "married").allowed).toBe(false));
  it("partial in the band", () => {
    const r = rothIraAllowed(247000, "married"); // midpoint of 242k–252k
    expect(r.phaseFrac).toBeCloseTo(0.5, 2);
  });
});

describe("real raise", () => {
  it("is 1 at year 0", () => expect(realRaiseFactor(0.02, 0)).toBe(1));
  it("compounds in real terms", () => expect(realRaiseFactor(0.02, 10)).toBeCloseTo(1.21899, 4));
});

describe("contributionPlan — Simple vs Detailed", () => {
  it("Simple mode splits the single number by the initial deferred share", () => {
    const i = { contribMode: "simple", contrib: 18000, bucketSplit: { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 }, realRaise: 0 };
    const p = contributionPlan(i, { ageA: 57, ageB: 48, year: 2026 });
    expect(p.total).toBe(18000);
    expect(p.byBucket.deferred).toBeCloseTo(12600, 6);
    expect(p.byBucket.taxable).toBeCloseTo(5400, 6);
    expect(p.byBucket.roth).toBe(0);
  });

  it("Detailed mode sums streams into buckets and adds employer match", () => {
    const i = {
      contribMode: "detailed",
      contribStreams: [
        { id: "1", vehicle: "401k", owner: "B", amount: 20000, roth: false },
        { id: "2", vehicle: "ira", owner: "B", amount: 7000, roth: true },
      ],
      employerMatch: { pct: 50, capPct: 6 },
      incomeB: 170000, realRaise: 0,
    };
    const p = contributionPlan(i, { ageA: 57, ageB: 48, year: 2026 });
    // deferred = 401k 20000 + match min(50% of 20000, 6% of 170000=10200) = 10000 → 30000
    expect(p.byBucket.deferred).toBe(30000);
    expect(p.byBucket.roth).toBe(7000); // Roth IRA stream
    expect(p.employerMatch).toBe(10000);
  });

  it("flags an over-limit stream and clamps it", () => {
    const i = { contribMode: "detailed", contribStreams: [{ id: "1", vehicle: "ira", owner: "B", amount: 99999, roth: false }], realRaise: 0 };
    const p = contributionPlan(i, { ageA: 40, ageB: 40, year: 2026 });
    expect(p.byBucket.deferred).toBe(7500); // clamped to IRA base
    expect(p.flags.some((f) => /limit/i.test(f))).toBe(true);
  });

  it("HSA stream routes to deferred (pre-tax; planning-grade simplification — no dedicated HSA bucket)", () => {
    const i = {
      contribMode: "detailed",
      contribStreams: [{ id: "1", vehicle: "hsaFamily", owner: "A", amount: 8750, roth: false }],
      realRaise: 0,
    };
    const p = contributionPlan(i, { ageA: 45, ageB: 45, year: 2026 });
    expect(p.byBucket.deferred).toBe(8750);
    expect(p.byBucket.taxable).toBe(0);
    expect(p.byBucket.roth).toBe(0);
  });
});
