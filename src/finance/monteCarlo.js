import { randomLcg, randomNormal } from "d3-random";
import { quantile } from "d3-array";
import { LOCATIONS, MC_DEFAULTS } from "../retirementData.js";
import { simulate, steadyState } from "./simulate.js";
import { resolveSocialSecurityScenario, buildInheritanceInputs } from "./plan.js";

export function runMonteCarlo(s, mcOpt = {}) {
  const paths = mcOpt.paths ?? MC_DEFAULTS.paths;
  const seed = mcOpt.seed ?? MC_DEFAULTS.seed;
  const volatility = mcOpt.volatility ?? MC_DEFAULTS.volatility;

  const incomeHH = (Number(s.incomeA) || 0) + (Number(s.incomeB) || 0);
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const inher = buildInheritanceInputs(s);
  const inp = {
    ...s, incomeHH, inher, hcPre: retLocObj.hcPre, hcPost: retLocObj.hcPost,
    travel: s.travel ?? { on: false, amount: 15000, years: 15, taper: true },
    events: s.events ?? [],
    survivor: s.survivor ?? { on: false, year: 9999 },
  };
  const { effHaircut, effCutYear } = resolveSocialSecurityScenario(s);

  const rng = randomLcg(seed);                       // seeded, reproducible
  const sample = randomNormal.source(rng)(inp.realReturn, volatility);
  const end = Math.max(95 - inp.ageA, 95 - inp.ageB);

  const balancesByYear = Array.from({ length: end + 1 }, () => []);
  const incomes = [];
  const depAges = [];
  let lasted = 0;

  for (let p = 0; p < paths; p++) {
    const returns = Array.from({ length: end + 1 }, () => sample());
    const sim = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, returns });
    sim.rows.forEach((r, y) => balancesByYear[y].push(r.bal));
    if (sim.depAge === null) { lasted += 1; depAges.push(96); }
    else depAges.push(sim.depAge);
    incomes.push(steadyState(inp, sim, effHaircut, effCutYear).net);
  }

  const balanceFan = balancesByYear.map((vals, y) => {
    const sorted = vals.slice().sort((a, b) => a - b);
    return {
      age: inp.ageA + y,
      p10: Math.round(quantile(sorted, 0.1)),
      p50: Math.round(quantile(sorted, 0.5)),
      p90: Math.round(quantile(sorted, 0.9)),
    };
  });
  const incSorted = incomes.slice().sort((a, b) => a - b);
  const depSorted = depAges.slice().sort((a, b) => a - b);

  return {
    paths, seed,
    successProb: lasted / paths,
    balanceFan,
    sustainableIncome: {
      p10: Math.round(quantile(incSorted, 0.1)),
      p50: Math.round(quantile(incSorted, 0.5)),
      p90: Math.round(quantile(incSorted, 0.9)),
    },
    depletionAge: {
      p10: Math.round(quantile(depSorted, 0.1)),
      p50: Math.round(quantile(depSorted, 0.5)),
    },
  };
}
