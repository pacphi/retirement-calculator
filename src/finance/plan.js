import { LOCATIONS, PROP, TAX_YEAR, TIERS } from "../retirementData.js";
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
    const e = propEcon(key, Number(p.value) || 0);
    out.push({ key, year: Number(p.year) || 2038, type: p.strategy, sell: e.sell, rent: e.rent, live: e.live });
  }
  return out;
}

export function buildPlanInputs(s) {
  const incomeHH = (Number(s.incomeA) || 0) + (Number(s.incomeB) || 0);
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const inher = buildInheritanceInputs(s);
  // tradFrac (the pre-tax/ordinary-income share of withdrawals) is the single source of
  // truth; the pre-tax balance subject to RMDs is simply that share of total savings.
  const savings = Number(s.savings) || 0;
  const tradFrac = Math.min(1, Math.max(0, Number(s.tradFrac) || 0));
  const taxDeferred = savings * tradFrac;
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
