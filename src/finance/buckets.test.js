import { describe, it, expect } from "vitest";
import { seedBuckets, derivedTradFrac, splitWithdrawal, DEFAULT_WITHDRAWAL_ORDER } from "./buckets.js";

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

describe("splitWithdrawal — order-dependent gross→ordinary mapping", () => {
  const bal = { taxable: 100000, deferred: 200000, roth: 50000 };
  it("draws taxable first by default", () => {
    const s = splitWithdrawal(80000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.taxable).toBe(80000);
    expect(s.deferred).toBe(0);
    expect(s.ordinaryShare).toBe(0); // no ordinary income yet — all from taxable
  });
  it("spills into deferred once taxable is exhausted", () => {
    const s = splitWithdrawal(150000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.taxable).toBe(100000);
    expect(s.deferred).toBe(50000);
    expect(s.ordinaryShare).toBeCloseTo(50000 / 150000, 6);
  });
  it("roth is last and tax-free", () => {
    const s = splitWithdrawal(330000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.roth).toBe(30000);
    expect(s.ordinaryShare).toBeCloseTo(200000 / 330000, 6); // only deferred is ordinary
  });
  it("honors a custom order", () => {
    const s = splitWithdrawal(150000, bal, ["deferred", "taxable", "roth"]);
    expect(s.deferred).toBe(150000);
    expect(s.ordinaryShare).toBe(1);
  });
});
