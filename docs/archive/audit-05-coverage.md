# Coverage Audit — Retirement Calculator Engine

**Date:** 2026-06-17
**Branch:** fix/address-logic-issues

## Command Used

```bash
pnpm exec vitest run --coverage --coverage.provider=v8 \
  --coverage.include='src/**' \
  --coverage.include='RetirementCalculator.jsx' \
  --coverage.reporter=text \
  --coverage.reporter=json-summary
```

All 129 tests passed across 6 test files.

---

## Overall Coverage

| Metric     | Covered | Total | %      |
|------------|---------|-------|--------|
| Statements | 1907    | 2225  | 85.70% |
| Branches   | 2880    | 5485  | 52.50% |
| Functions  | 417     | 584   | 71.40% |
| Lines      | 1630    | 1821  | 89.51% |

> Note: the inflated denominator (Total) and the duplicate sandbox-copy rows in the v8 report are artefacts of Vitest's v8 worker sandboxing — each file appears three times (two worktree sandbox paths + the real `src/` path). The canonical per-file numbers below are taken from the `retirement-calculator/src/finance/` tree only.

---

## Per-File Coverage (canonical `src/finance/` + UI file)

| File                          | % Lines | % Branches | % Functions | Uncovered Lines           |
|-------------------------------|---------|------------|-------------|---------------------------|
| `src/finance/events.js`       | 100%    | 88.0%      | 100%        | L3–4, L13 (branch only)   |
| `src/finance/mcWorker.js`     | 0%      | 100%       | 0%          | L3–6 (entire file)        |
| `src/finance/monteCarlo.js`   | 96.0%   | 55.6%      | 100%        | L30                       |
| `src/finance/pension.js`      | 94.1%   | 67.4%      | 100%        | L17                       |
| `src/finance/plan.js`         | 100%    | 69.4%      | 100%        | L8–26, L31, L40–48, L67  |
| `src/finance/simulate.js`     | 100%    | 88.2%      | 100%        | L17, L146, L159–164       |
| `src/finance/socialSecurity.js` | 88.9% | 91.7%      | 100%        | L19–20                    |
| `src/finance/tax.js`          | 100%    | 92.9%      | 100%        | L34, L41                  |
| `RetirementCalculator.jsx`    | 77.6%   | 59.5%      | 61.2%       | ~L298–416, L569–589       |

---

## Risk-Ranked Gap List

Gaps are ranked by financial-correctness risk (High → Low). UI/cosmetic gaps appear last.

### 1. `src/finance/simulate.js` L53 — Binary-search exhaustion path (`!covers(hi)`)
**Risk: Important**
`solveWithdrawal` falls back to `{ withdrawal: hi, ... }` when the full balance still cannot
cover spending after tax. This is the portfolio-depletion fast-path — the most financially
significant outcome. It fires when a household is insolvent (bal < need after full withdrawal).
No test verifies: (a) that `withdrawal === bal`, (b) that `depAge` is set correctly in that
row, or (c) that the returned tax is computed on `hi` rather than some stale value.

### 2. `src/finance/simulate.js` L117 — `ssOpt.returns[y] ?? i.realReturn` null-coalesce branch
**Risk: Important**
Inside the Monte Carlo path, `ssOpt.returns[y]` falls back to `i.realReturn` if the returns
array is shorter than the simulation horizon (`end`). The Monte Carlo builder always supplies
`end+1` entries so this branch is unreachable from the public API — but the engine silently
swallows a mismatch instead of throwing. A test with a short returns array would pin this
guard contract.

### 3. `src/finance/pension.js` L17 — Plan 3 early-retirement eligibility guard (`drsEligibilityNote`)
**Risk: Important**
`drsEligibilityNote` is exercised only indirectly via `benefits()`. The Plan 3 branch at L17
(`plan === 3 && years < 10`) and the Plan 3-specific note string at L18 are not directly
asserted. A wrong threshold (e.g., off-by-one from 10 → 9) would silently pass.
The function is exported; it should be called directly with `(55, 9, 3)` and `(55, 10, 3)`.

### 4. `src/finance/socialSecurity.js` L19–20 — Delayed-credit cap (own benefit > FRA)
**Risk: Important**
`ownBenefitAtClaimMonthly` has no test for `claimAge > 67`. Lines 18–20 compute the 8%/year
delayed credit (`months * (2/3) / 100`). The cap at 36 months is also untested. Claiming at
70 is a common planning scenario; an off-by-one in the `Math.min(..., 36)` cap would
silently over-credit delayed benefits.

### 5. `src/finance/simulate.js` L146 — `fullyRetAge ?? i.ageA` fallback
**Risk: Important**
If both persons never stop working before age 95 (stopA/stopB both > 95 + ageA/ageB),
`fullyRetAge` stays `null` and the fallback fires. This is an edge case but the returned
`fullyRetAge: i.ageA` then misrepresents when steady state begins. Currently untested.

### 6. `src/finance/plan.js` branches — `lineItems`, `monthlyTotal`, `tierFor`, `propEcon` (L8–48)
**Risk: Moderate**
`lineItems` (pre vs post healthcare label), `monthlyTotal`, `tierFor` (spending tier lookup),
and `propEcon` (sell/rent/live returns for inherited real estate) all show as uncovered. These
drive the UI budget breakdowns and location comparisons. A mis-keyed `hcPre`/`hcPost` or
wrong `TIERS` lookup would produce silent wrong numbers in the presentation layer.

### 7. `src/finance/plan.js` L67 — `calculatePlan` "full" SS scenario branch
**Risk: Moderate**
`resolveSocialSecurityScenario` is tested for `"trustees"` and `"custom"` modes but not
`"full"`. The `effCutYear = 9999` path is implicit in many tests but never the explicit
subject of an assertion. A regression that changed the `"full"` branch to return a real
cut year would silently reduce projected SS income.

### 8. `src/finance/simulate.js` L159–164 — `steadyState` row-not-found fallback
**Risk: Moderate**
`sim.rows.find(r => r.aA >= startAgeA) ?? sim.rows[sim.rows.length - 1]` falls back to the
last row when no row reaches `startAgeA`. This happens when both persons die (age 95 cap)
before all benefits start — an edge case possible with high stop ages. Untested.

### 9. `src/finance/monteCarlo.js` L30 — `depAge === null` branch (paths that last to 95+)
**Risk: Moderate**
`if (sim.depAge === null) { lasted += 1; depAges.push(96); }` — the "never depleted" branch.
The existing deterministic test (`successProb in [0,1]`) does not explicitly assert that a
high-savings scenario has `successProb === 1.0` or that depletion age is correctly pushed to
96. A regression swapping `null` for `undefined` in `simulate.js` would break aggregation
silently.

### 10. `src/finance/events.js` L3–4, L13 — taper-at-year-10 and `reduce` short-circuit
**Risk: Low**
L13 is the `e && e.on` guard inside `oneTimeSpendForYear`. Partially covered but the
short-circuit (event object is falsy/null in the array) is unexercised. Low financial risk.

### 11. `src/finance/tax.js` L34, L41 — Senior bonus phaseout and single-filer senior deduction
**Risk: Moderate**
`standardDeduction` at L34 (`agi > phaseStart` → phaseout) and L41 (single-filer senior
addon path) have branch misses. The phaseout reduces the deduction above a threshold; if the
AGI comparison used `>=` instead of `>` it would still pass all current tests.

### 12. `src/finance/mcWorker.js` — entire file uncovered (0% lines/functions)
**Risk: Low**
This is the Web Worker entry point used in the browser. It is not a calculation engine;
it proxies `runMonteCarlo` from a `postMessage` handler. Not invokable in jsdom. Risk is
operational (UI thread communication) rather than financial-logic correctness.

### 13. `RetirementCalculator.jsx` L298–416, L569–589 — UI rendering and handler branches
**Risk: Minor**
Missing coverage in the React component: tab-switching handlers, form-field rendering for
disabled controls, the help-text panel, and the location cost table. None affect calculation
correctness.

---

## Action Items

| # | Severity  | File : Location | Gap | Test to Add |
|---|-----------|-----------------|-----|-------------|
| 1 | Important | `simulate.js:53` | `!covers(hi)` — binary-search insolvent fast-path | Test with `savings:0, targetPct:1.0` → assert `wd === bal` for the first retired row and `depAge` is set |
| 2 | Important | `socialSecurity.js:18–20` | Delayed credit for claim at 70; 36-month cap | Call `ownBenefitAtClaimMonthly(pia, 70)` and `(pia, 71.5)` (> 3yr cap); assert expected multipliers |
| 3 | Important | `pension.js:17–19` | Plan 3 `drsEligibilityNote` eligibility threshold | Call `drsEligibilityNote(55, 9, 3)` → note; `drsEligibilityNote(55, 10, 3)` → `""` |
| 4 | Important | `simulate.js:117` | `returns[y] ?? realReturn` null-coalesce guard | Call `simulate(inp, { returns: [] })` → all rows use `realReturn`; no crash |
| 5 | Important | `simulate.js:146` | `fullyRetAge ?? i.ageA` never-retire fallback | `stopA:200, stopB:200` → `fullyRetAge === i.ageA` |
| 6 | Moderate  | `plan.js:8–26` | `lineItems`, `monthlyTotal`, `tierFor`, `propEcon` | Direct unit tests for each; assert `monthlyTotal(loc,"pre") > monthlyTotal(loc,"post")` |
| 7 | Moderate  | `plan.js:67` | `ssMode:"full"` SS scenario path | `calculatePlan({...baseState, ssMode:"full"})` → `effHaircut===1`, `effCutYear===9999` |
| 8 | Moderate  | `simulate.js:159–164` | `steadyState` row-not-found fallback | Pass a sim with all rows `aA < startAgeA`; assert result equals last row data |
| 9 | Moderate  | `monteCarlo.js:30` | `depAge === null` lasted-to-95 count | `runMonteCarlo` with very high savings → `successProb === 1`, `depletionAge.p10 >= 96` |
| 10| Moderate  | `tax.js:34,41` | Senior bonus phaseout; single-filer senior deduction | `standardDeduction({status:"married", ageA:70, ageB:70, agi:200000})` (tests phaseout); `standardDeduction({status:"single", ageA:66, ageB:0, agi:50000})` |
| 11| Low       | `events.js:13` | Null/falsy event in array | `oneTimeSpendForYear([null, {on:true,year:2030,amount:1000}], 2030)` → `1000` |
| 12| Minor     | `RetirementCalculator.jsx` | UI tab/handler branches | Add RTL tests for tab navigation, disabled-field rendering, help panel |
| 13| Minor     | `mcWorker.js` | Entire file (Web Worker proxy) | Not needed in unit suite; acceptable gap — mark as excluded in coverage config |

---

## Summary

- **Overall lines/branches:** 89.51% / 52.50%
- **Finance-module lines/branches (canonical):** ~96% / ~82%
- **Risk-ranked gaps identified:** 13 (5 Important, 5 Moderate, 3 Low/Minor)
- **Severity breakdown:** Important: 5, Moderate: 5, Low: 1, Minor: 2
- **Highest-risk uncovered path:** `solveWithdrawal` insolvent fast-path (`simulate.js:53`) — the binary-search bail-out that fires when a portfolio cannot cover spending; wrong behavior here silently under-reports `depAge`.

The branch coverage figure (52.5%) is substantially depressed by the v8 sandbox duplication
artefact. The canonical finance-module branch coverage is approximately **82%**, which is a
more representative planning baseline.
