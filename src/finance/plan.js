import { LOCATIONS, PROP, RETURN_MODEL_DEFAULTS, TAX_YEAR, TIERS, US_STATE_TAX } from "../retirementData.js";
import { seedBuckets, derivedTradFrac } from "./buckets.js";
import { resolveReturn } from "./returns.js";
import { simulate, steadyState } from "./simulate.js";

export const lineItems = (l, stage) => [
  ["Rent -- 2-3BR, quiet area", l.m.rent],
  ["Groceries", l.m.groceries],
  ["Utilities + internet", l.m.utilities],
  [stage === "pre" ? "Healthcare -- before 65" : "Healthcare -- 65+", stage === "pre" ? l.hcPre : l.hcPost],
  ["Transport", l.m.transport],
  ["Dining out", l.m.dining],
  ["Entertainment", l.m.entertainment],
  ["Other / household", l.m.misc],
];

export const monthlyTotal = (l, stage) =>
  Object.values(l.m).reduce((a, b) => a + b, 0) + (stage === "pre" ? l.hcPre : l.hcPost);

export const tierFor = (ratio) => TIERS.find((t) => ratio < t.max);

export const propEcon = (key, value) => {
  const m = PROP[key];
  return { sell: value * m.sellNet, rent: value * m.rentYield, live: m.rentMo * 12 - value * m.ownRate };
};

export function resolveSocialSecurityScenario(s) {
  const effHaircut = s.ssMode === "full"
    ? 1
    : s.ssMode === "trustees"
      ? 0.81
      : Math.max(0, Math.min(1, (Number(s.ssHaircut) || 0) / 100));
  const effCutYear = s.ssMode === "full" ? 9999 : (Number(s.ssCutYear) || 2034);
  return { effHaircut, effCutYear };
}

export function buildInheritanceInputs(s) {
  const out = [];
  for (const key of ["tx", "at"]) {
    const p = s[key];
    if (!p.on) continue;
    const value = Number(p.value) || 0;
    const e = propEcon(key, value);
    const m = PROP[key];
    // Task 5 (Wave 2): carry the home value and property-tax rate into "live" entries
    // so simulate.js can build an inheritedOwnOverride (owned carrying cost) for that year.
    // US properties use ownRate as a combined carrying-cost rate (property tax + insurance +
    // maintenance) — we model it as maintenance for the override since property tax is
    // handled separately via activePropertyTaxRate. International properties (e.g. "at")
    // carry 0 property-tax rate because the retirement jurisdiction is international and
    // its carrying cost is captured entirely in ownRate.
    out.push({
      key,
      year: Number(p.year) || 2038,
      type: p.strategy,
      sell: e.sell,
      rent: e.rent,
      live: e.live,
      // Fields used only when type === "live" (Task 5 tenure override):
      homeValue: value,
      ownRate: m.ownRate,
    });
  }
  return out;
}

export function buildPlanInputs(s) {
  const incomeHH = (Number(s.incomeA) || 0) + (Number(s.incomeB) || 0);
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const inher = buildInheritanceInputs(s);
  // Bucket seeding (Task 2): bucketSplit drives the three-bucket split; tradFrac and
  // taxDeferred are now DERIVED from the seeded buckets (back-compat for simulate.js
  // and contributionPlan consumers that still read these keys).
  const savings = Number(s.savings) || 0;
  const _tfrac = (s.tradFrac != null && s.tradFrac !== "") ? Math.min(1, Math.max(0, Number(s.tradFrac))) : 0.7;
  const bucketSplit = s.bucketSplit ?? { mode: "pct", deferredPct: Math.round(_tfrac * 100), taxablePct: Math.round((1 - _tfrac) * 100), rothPct: 0 };
  const initialBuckets = seedBuckets(savings, bucketSplit);
  const tradFrac = derivedTradFrac(initialBuckets); // DERIVED OUTPUT (was an input)
  const taxDeferred = initialBuckets.deferred;
  return {
    ...s,
    tradFrac,
    taxDeferred,
    incomeHH,
    inher,
    retLocObj,
    hcPre: retLocObj.hcPre,
    hcPost: retLocObj.hcPost,
    ltcAnnual: retLocObj.ltcAnnual,
    horizonAge: Number(s.horizonAge) || 95,
    // Additional effective income-tax rate (US state, or net-of-treaty foreign):
    // explicit override wins, else the selected location's modeled rate.
    taxRate: (s.stateRate != null && s.stateRate !== "") ? (Number(s.stateRate) || 0) : (retLocObj.addlTaxRate ?? 0),
    ltc: s.ltc ?? { on: false, startAge: 80, years: 3, annual: null },
    travel: s.travel ?? { on: false, amount: 15000, years: 15, taper: true },
    events: s.events ?? [],
    survivor: s.survivor ?? { on: false, year: 9999, pensionPct: 0 },
    life: s.life ?? { on: false, deathAgeA: 95, deathAgeB: 95, pensionPct: 0 },
    returnPreset: s.returnPreset ?? "custom",
    realReturn: resolveReturn(s.returnPreset ?? "custom", s.realReturn),
    volatility: (s.volatility != null && s.volatility !== "") ? Number(s.volatility) : 0.12,
    spendingShape: s.spendingShape ?? { mode: "flat" },
    lifestyleSteps: s.lifestyleSteps ?? [],
    workLoc: s.workLoc ?? "WA",
    relocationYear: Number(s.relocationYear) || (TAX_YEAR + 20),
    stateCode: s.stateCode ?? null,
    // Wave 2 (Task 4): resolve the effective property-tax rate for the retirement
    // jurisdiction. US states carry it in US_STATE_TAX; international locations
    // model it as 0. Falls back to 0 when stateCode is absent or unknown.
    activePropertyTaxRate: (s.stateCode && US_STATE_TAX[s.stateCode]?.propertyTaxRate) || 0,
    housing: (() => {
      const base = s.housing ?? {
        tenure: "rent",
        rent: null,
        mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
        homeValue: 0,
        insuranceAnnual: 0,
        maintenancePct: 0.01,
      };
      // Seed default rent from the retire location's basket when tenure is "rent"
      // and no explicit rent has been entered (Wave 2, Task 4).
      const withRent = (base.tenure === "rent" && base.rent == null)
        ? { ...base, rent: retLocObj.m.rent }
        : base;
      // Seed housing.relocation defaults (Task 8): action="sell", saleValue=0.
      if (!withRent.relocation) {
        return { ...withRent, relocation: { action: "sell", saleValue: 0 } };
      }
      return withRent;
    })(),
    // Retirement housing: the dwelling after relocation. When the user has explicitly
    // set retireHousing, use it. Otherwise fall back to i.housing itself (same dwelling
    // — covers the single-location case where work and retire residence are the same home).
    // Task 8: simulate.js will switch to retireHousing from relocationYear onward.
    retireHousing: s.retireHousing ?? null,
    contribMode: s.contribMode ?? "simple",
    contribStreams: s.contribStreams ?? [],
    employerMatch: s.employerMatch ?? { pct: 0, capPct: 0 },
    realRaise: Number(s.realRaise) || 0,
    bucketSplit,
    initialBuckets,
    // Wave 3 D1: tax-smart withdrawal order (default taxable→deferred→roth).
    withdrawalOrder: s.withdrawalOrder ?? ["taxable", "deferred", "roth"],
    // Wave 3 Task 5: return model (opt-in; default "blended" preserves all existing results).
    returnModel: s.returnModel ?? RETURN_MODEL_DEFAULTS,
  };
}

export function calculatePlan(s) {
  const inp = buildPlanInputs(s);
  const { incomeHH, inher, retLocObj } = inp;
  const { effHaircut, effCutYear } = resolveSocialSecurityScenario(s);
  const trustCut = Number(s.ssCutYear) || 2034;
  const simChosen = simulate(inp, { haircut: effHaircut, cutYear: effCutYear });
  const simFull = simulate(inp, { haircut: 1, cutYear: 9999 });
  const simTrust = simulate(inp, { haircut: 0.81, cutYear: trustCut });
  const simNone = simulate(inp, { haircut: 0, cutYear: TAX_YEAR });
  const simStress = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, stress: true });
  const simShock = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, includeEmergent: true });
  return {
    incomeHH,
    retLocObj,
    inher,
    inp,
    effHaircut,
    effCutYear,
    simChosen,
    simFull,
    simTrust,
    simNone,
    simStress,
    simShock,
    steady: steadyState(inp, simChosen),
    sFull: steadyState(inp, simFull),
    sTrust: steadyState(inp, simTrust),
    sNone: steadyState(inp, simNone),
  };
}
