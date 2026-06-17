import { LOCATIONS, PROP, TAX_YEAR, TIERS } from "../retirementData.js";
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
  return {
    ...s,
    incomeHH,
    inher,
    retLocObj,
    hcPre: retLocObj.hcPre,
    hcPost: retLocObj.hcPost,
    ltcAnnual: retLocObj.ltcAnnual,
    ltc: s.ltc ?? { on: false, startAge: 80, years: 3, annual: null },
    travel: s.travel ?? { on: false, amount: 15000, years: 15, taper: true },
    events: s.events ?? [],
    survivor: s.survivor ?? { on: false, year: 9999 },
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
    steady: steadyState(inp, simChosen),
    sFull: steadyState(inp, simFull),
    sTrust: steadyState(inp, simTrust),
    sNone: steadyState(inp, simNone),
  };
}
