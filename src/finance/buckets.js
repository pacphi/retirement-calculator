// Seed the three sub-balances from total savings. Two input modes (Decision 2):
//   pct: percentages of savings (deferredPct/taxablePct/rothPct, ~100 total)
//   amt: explicit dollar amounts; any remainder vs. savings is absorbed onto taxable
//        (planning-grade reconciliation so the buckets always total the portfolio).
export function seedBuckets(savings, bucketSplit) {
  const S = Math.max(0, Number(savings) || 0);
  const split = bucketSplit || { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 };
  if (split.mode === "amt") {
    const deferred = Math.max(0, Number(split.deferred) || 0);
    const roth = Math.max(0, Number(split.roth) || 0);
    const taxable = Math.max(0, S - deferred - roth);
    return { taxable, deferred, roth };
  }
  const dp = (Number(split.deferredPct) || 0) / 100;
  const rp = (Number(split.rothPct) || 0) / 100;
  const deferred = S * dp;
  const roth = S * rp;
  const taxable = Math.max(0, S - deferred - roth);
  return { taxable, deferred, roth };
}

export const derivedTradFrac = (b) => {
  const total = (b.taxable || 0) + (b.deferred || 0) + (b.roth || 0);
  return total > 0 ? (b.deferred || 0) / total : 0;
};
