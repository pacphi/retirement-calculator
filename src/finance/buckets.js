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

export const DEFAULT_WITHDRAWAL_ORDER = ["taxable", "deferred", "roth"];

// Split a gross draw D across buckets in `order`. ordinaryShare = deferred portion / total
// (this is the per-draw tradFrac passed to calculateFederalTaxYear — Roth/taxable principal
// is not ordinary income). taxable-bucket capital-gains tax is out of scope (planning-grade).
export function splitWithdrawal(D, balances, order = DEFAULT_WITHDRAWAL_ORDER) {
  let remaining = Math.max(0, Number(D) || 0);
  const out = { taxable: 0, deferred: 0, roth: 0 };
  for (const bucket of order) {
    const avail = Math.max(0, Number(balances[bucket]) || 0);
    const take = Math.min(remaining, avail);
    out[bucket] = take;
    remaining -= take;
  }
  const total = out.taxable + out.deferred + out.roth;
  return { ...out, total, ordinaryShare: total > 0 ? out.deferred / total : 0 };
}
