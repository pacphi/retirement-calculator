import { CONTRIB_LIMITS_2026 } from "../retirementData.js";

const L = CONTRIB_LIMITS_2026;

// Resolve the annual limit for a vehicle at a given age (catch-up tiers auto-apply).
// SECURE 2.0: the 60–63 super catch-up replaces (not stacks on) the standard 50+ catch-up.
// HSA catch-up is additive (IRS § 223(b)(3)) and independent of the 401k/IRA tiers.
export function vehicleLimit(vehicle, age) {
  const v = L[vehicle];
  if (!v) return Infinity; // unknown vehicle: no clamp
  let limit = v.base;
  if (age >= 60 && age <= 63 && v.superCatchUp60to63) {
    // Super catch-up (SECURE 2.0): replaces the standard 50+ catch-up.
    limit += v.superCatchUp60to63;
  } else if (age >= 50 && v.catchUp50) {
    limit += v.catchUp50;
  }
  // HSA catch-up is a separate additive tier (age 55+), independent of 401k/IRA.
  if (age >= 55 && v.catchUp55) limit += v.catchUp55;
  return limit;
}

// Roth IRA MAGI phase-out: returns allowed flag + the linear allowed fraction in the band.
export function rothIraAllowed(magi, status) {
  const band = L.rothIraPhaseOut[status === "married" ? "married" : "single"];
  const [lo, hi] = band;
  if (magi <= lo) return { allowed: true, phaseFrac: 1 };
  if (magi >= hi) return { allowed: false, phaseFrac: 0 };
  return { allowed: true, phaseFrac: (hi - magi) / (hi - lo) };
}

export const realRaiseFactor = (realRaise, y) => Math.pow(1 + (Number(realRaise) || 0), y);

const ownerAge = (owner, ctx) => (owner === "A" ? ctx.ageA : ctx.ageB);

// Resolve the per-bucket contribution split for a year. Simple mode keeps the single
// `contrib` number split by the initial deferred share; Detailed mode sums typed streams.
export function contributionPlan(i, ctx) {
  const flags = [];
  const byBucket = { taxable: 0, deferred: 0, roth: 0 };
  let employerMatch = 0;

  if (i.contribMode !== "detailed") {
    // Simple: one number, split by the initial-balance deferred share so the default
    // reproduces today's `defBal += contrib * tradFrac`.
    const split = i.bucketSplit || { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 };
    const defFrac = split.mode === "pct"
      ? (Number(split.deferredPct) || 0) / 100
      : (Number(split.deferred) || 0) / Math.max(1, (Number(split.deferred) || 0) + (Number(split.taxable) || 0) + (Number(split.roth) || 0));
    const taxFrac = split.mode === "pct" ? (Number(split.taxablePct) || 0) / 100 : 1 - defFrac;
    const total = Number(i.contrib) || 0;
    byBucket.deferred = total * defFrac;
    byBucket.taxable = total * taxFrac;
    byBucket.roth = Math.max(0, total - byBucket.deferred - byBucket.taxable);
    return { total, byBucket, employerMatch: 0, flags };
  }

  // Detailed: typed streams. Roth flag (or vehicle "roth401k"/Roth IRA) routes to the roth bucket.
  for (const s of (i.contribStreams || [])) {
    const amount = Number(s.amount) || 0;
    if (amount <= 0) continue;
    const limit = vehicleLimit(s.vehicle, ownerAge(s.owner, ctx));
    const capped = Math.min(amount, limit);
    if (capped < amount) flags.push(`${s.vehicle} (${s.owner}) over 2026 limit — clamped to $${limit.toLocaleString()}`);
    const bucket = s.roth ? "roth" : (s.vehicle === "ira" || s.vehicle === "401k" ? "deferred" : "taxable");
    byBucket[bucket] += capped;
    // Employer match applies to pre-tax 401k streams only.
    if (s.vehicle === "401k" && !s.roth && i.employerMatch) {
      const wage = s.owner === "A" ? (Number(i.incomeA) || 0) : (Number(i.incomeB) || 0);
      const m = Math.min(capped * (Number(i.employerMatch.pct) || 0) / 100, wage * (Number(i.employerMatch.capPct) || 0) / 100);
      employerMatch += m;
      byBucket.deferred += m; // employer match is always pre-tax
    }
  }
  const total = byBucket.taxable + byBucket.deferred + byBucket.roth;
  return { total, byBucket, employerMatch, flags };
}
