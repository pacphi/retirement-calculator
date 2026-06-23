import { randomLcg, randomNormal } from "d3-random";
import { quantile } from "d3-array";
import { MC_DEFAULTS } from "../retirementData.js";
import { simulate, steadyState } from "./simulate.js";
import { resolveSocialSecurityScenario, buildPlanInputs } from "./plan.js";
import { blendedMean } from "./returns.js";

export function runMonteCarlo(s, mcOpt = {}) {
  const paths = mcOpt.paths ?? MC_DEFAULTS.paths;
  const seed = mcOpt.seed ?? MC_DEFAULTS.seed;
  const volatility = mcOpt.volatility ?? MC_DEFAULTS.volatility;
  if (paths <= 0) throw new RangeError("runMonteCarlo: paths must be > 0");

  const inp = buildPlanInputs(s);
  const { effHaircut, effCutYear } = resolveSocialSecurityScenario(s);

  const rng = randomLcg(seed);                       // seeded, reproducible
  // Lognormal annual returns: log-return ~ N(mu, volatility) so the gross return
  // exp(...) is always positive (real return can't fall below -100%) and the
  // median path compounds at the blended mean (no arithmetic-vs-geometric overstatement).
  // For the default "blended" returnModel, blendedMean === inp.realReturn — MC is unchanged.
  // For "glidepath", the midpoint equity blend is used as the scalar mean (the glidepath
  // shape is averaged in; variability band semantics are preserved). Opt-in simplification.
  const mu = Math.log(1 + blendedMean(inp));
  const z = randomNormal.source(rng)(0, 1);
  const sample = () => Math.exp(mu + volatility * z()) - 1;
  const horizon = Number(inp.horizonAge) || 95;
  const end = Math.max(0, Math.max(horizon - inp.ageA, horizon - inp.ageB));

  const balancesByYear = Array.from({ length: end + 1 }, () => []);
  const incomes = [];
  const depAges = [];
  // Task 6: collect per-path realized spending when guardrails are on.
  const guardrailsOn = inp.spendingStrategy === "guardrails";
  const realizedSpends = guardrailsOn ? [] : null;
  let lasted = 0;

  for (let p = 0; p < paths; p++) {
    const returns = Array.from({ length: end + 1 }, () => sample());
    const sim = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, returns });
    // Depleted paths contribute bal=0 to the fan — intentional so percentile arrays always have `paths` entries.
    sim.rows.forEach((r, y) => balancesByYear[y].push(r.bal));
    if (sim.depAge === null) { lasted += 1; depAges.push(horizon + 1); }
    else depAges.push(sim.depAge);
    incomes.push(steadyState(inp, sim).net);
    // Task 6: capture this path's median realized non-housing spend (need - housing - extraSpend
    // approximation: use row.need directly as the realized total need, which already reflects
    // the carried spendMult). Use the terminal non-depleted row's need as a representative
    // realized spend level for this path — the multiplier is baked in via spendingNeed.
    if (guardrailsOn) {
      const retRows = sim.rows.filter((r) => r.bal > 0);
      const repRow = retRows.length > 0 ? retRows[retRows.length - 1] : sim.rows[sim.rows.length - 1];
      realizedSpends.push(repRow.need);
    }
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

  // Task 6: compute realized-spending percentiles when guardrails are on.
  // Each path's representative spend already reflects its carried spendMult —
  // computed deterministically per-path under the seeded returns.
  let realizedSpending = null;
  if (guardrailsOn && realizedSpends && realizedSpends.length > 0) {
    const rsSorted = realizedSpends.slice().sort((a, b) => a - b);
    realizedSpending = {
      p10: Math.round(quantile(rsSorted, 0.1)),
      p50: Math.round(quantile(rsSorted, 0.5)),
      p90: Math.round(quantile(rsSorted, 0.9)),
    };
  }

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
    // null when guardrails are off — does not perturb the default MC return shape.
    realizedSpending,
  };
}
