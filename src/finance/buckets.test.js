import { describe, it, expect } from "vitest";
import { seedBuckets, derivedTradFrac } from "./buckets.js";

describe("seedBuckets", () => {
  it("pct mode splits savings 70/30/0 by default", () => {
    const b = seedBuckets(670000, { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 });
    expect(b.deferred).toBeCloseTo(469000, 6);
    expect(b.taxable).toBeCloseTo(201000, 6);
    expect(b.roth).toBe(0);
    expect(b.deferred + b.taxable + b.roth).toBeCloseTo(670000, 6);
  });
  it("amt mode uses explicit labeled amounts", () => {
    const b = seedBuckets(670000, { mode: "amt", deferred: 400000, taxable: 200000, roth: 70000 });
    expect(b).toEqual({ deferred: 400000, taxable: 200000, roth: 70000 });
  });
  it("amt mode reconciles a mismatched total onto taxable (planning-grade)", () => {
    const b = seedBuckets(670000, { mode: "amt", deferred: 400000, taxable: 200000, roth: 0 });
    expect(b.taxable).toBe(270000); // absorbs the 70k remainder so the buckets total to savings
  });
});

describe("derivedTradFrac", () => {
  it("is the deferred share of the total", () => {
    expect(derivedTradFrac({ deferred: 469000, taxable: 201000, roth: 0 })).toBeCloseTo(0.7, 6);
  });
  it("is 0 for an empty portfolio", () => {
    expect(derivedTradFrac({ deferred: 0, taxable: 0, roth: 0 })).toBe(0);
  });
});
