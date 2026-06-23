# Correctness & Boundary-Risk Audit — 06

**Date:** 2026-06-17  
**Scope:** `src/finance/` modules + `src/retirementData.js`  
**Method:** Full manual code read + exhaustive boundary probe scripts (no engine changes)  
**Auditor:** Claude Sonnet 4.6 via agentic code review

---

## Summary

| Severity   | Count |
|------------|-------|
| Critical   | 3     |
| Important  | 6     |
| Minor      | 6     |
| **Total**  | **15**|

---

## Critical Findings

### C-1: `steadyState` uses `i.status` (married) for tax even when survivor is active

**File:** `src/finance/simulate.js` lines 179–198  
**What is wrong:** `steadyState()` always passes `status: i.status` to both `calculateFederalTaxYear` calls. When `i.survivor.on` is true and the steady-state row falls at or after `survivor.year`, the household has already transitioned to single filing, but the tax calculation continues using married brackets.  
**Why it matters:** Single tax brackets are narrower. On $60,000 of taxable income, married tax is ~$6,704 vs. single ~$7,912 — a $1,208/year understatement. This makes the survivor plan look better than it is. The `sustainableCapacity`, `net`, `surplus`, and `guaranteedNet` outputs are all affected.  
**Boundary test:** Configure `survivor: { on: true, year: 2030 }` with `startAgeA > 2030 - TAX_YEAR + ageA`. Assert `plan.steady.tax` (survivor scenario) is greater than the non-survivor equivalent at the same income.  
**Fix direction:** Resolve `yearStatus` for the steady-state row (check `row.cal >= Number(i.survivor.year) && i.survivor?.on`) and pass it as `status` to both `calculateFederalTaxYear` calls, consistent with how `simulate()` threads `yearStatus`.

---

### C-2: `steadyState` includes rent and live-savings from properties that have not yet become available

**File:** `src/finance/simulate.js` lines 162–167  
**What is wrong:** The rent-income and live-savings loops in `steadyState` have no year gate:

```js
if (p.type === 'rent') rentInc += p.rent;   // NO year check
if (p.type === 'live') liveSav += p.live;   // NO year check
```

By contrast, `simulate()` correctly gates these: `if (p.type === 'rent' && cal >= p.year)`. An inheritance property whose availability year is **after** `row.cal` (the steady-state anchor year) is still counted in `rentInc` and `liveSav`, inflating `recurring`, `gross`, `net`, `sustainableCapacity`, and `surplus`.  
**Why it matters:** If the Texas home inheritance starts in 2040 but steady-state starts in 2035, five years of phantom rental income are added to the headline figure. Users see an optimistic income projection that does not match the simulation.  
**Boundary test:** Configure a rent property with `year = steadyState.startCal + 5`. Assert `plan.steady.rentInc` equals only the income from properties available at or before `startCal`.  
**Fix direction:** Add `&& p.year <= row.cal` to the `rent` and `live` conditions in `steadyState`, mirroring the guard in `simulate`.

---

### C-3: `ownBenefitAtClaimMonthly` computes a negative benefit for `claimAge` below ~48

**File:** `src/finance/socialSecurity.js` lines 10–23  
**What is wrong:** The reduction formula for early claiming (`claimAge < 67`) is unbounded below. For every 12 months below FRA beyond 36, the `(5/12)/100` rate continues to reduce the factor without a floor:

- At `claimAge = 50`: reduction ≈ 0.90 → benefit = 10% of PIA (very low but positive).  
- At `claimAge ≈ 47` and below: reduction exceeds 1.0 → negative PIA is returned.

SSA's minimum claim age is 62. No guard enforces this minimum.  
**Why it matters:** If a user enters `claimA: 40` (possible via direct state manipulation or a future feature), `ssAfull` becomes negative. This flows into `solveWithdrawal` as negative SS income, causing the solver to demand larger withdrawals than necessary. `depAge` would be set prematurely.  
**Boundary test:** `ownBenefitAtClaimMonthly(1000, 45)` — assert the result is `>= 0` (currently returns approximately `−$50`).  
**Fix direction:** Add `if (claimAge < 62) claimAge = 62;` or `return Math.max(0, pia * (1 - reduction));` in `ownBenefitAtClaimMonthly`. Similarly guard `spousalBenefitAtClaimMonthly`.

---

## Important Findings

### I-1: `spendingNeed` counts the deceased spouse's healthcare cost after survivor transition

**File:** `src/finance/simulate.js` lines 62–68  
**What is wrong:** `spendingNeed(i, aA, aB, liveSav)` computes `under65` as:

```js
const under65 = (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0);
```

After the survivor transition, person B is deceased, but `aB` continues to increment in the `simulate` loop (it is tracked but no longer represents a living person). If `aB < 65` when the survivor transition occurs, the spending need is inflated by one extra `perPersonHC` pre-Medicare healthcare premium for the duration until `aB` would have reached 65.  
**Why it matters:** For a scenario where the younger spouse dies before age 65, spending needs are overstated by up to `(hcPre - hcPost) / 2 * 12` per year (can be thousands of dollars annually), making the plan appear tighter than it is.  
**Boundary test:** Simulate with `survivor: { on: true, year: 2030 }`, `ageB: 48`. Check that rows after 2030 do not include the deceased spouse's healthcare bump.  
**Fix direction:** Pass `isSurvivor` into `spendingNeed` (or compute it there) and zero out `ageB`'s contribution to `under65` when in survivor mode.

---

### I-2: `piaFromIncome` returns a negative PIA for negative income input

**File:** `src/finance/socialSecurity.js` lines 3–8  
**What is wrong:** `piaFromIncome(income)` uses `Math.min(Number(income) || 0, SS_CAP)`. For `income = -10000`, `Number(-10000) = -10000`, which is not falsy, so the `|| 0` guard does not fire. `aime = -10000/12 = -833`. The PIA calculation returns `0.9 * min(-833, 1286) = -750/month` annually.  
**Why it matters:** A negative PIA flows as negative SS income, reducing the apparent need for withdrawals. The plan would look artificially better (negative SS reduces taxable income, driving negative tax in extreme cases). While `incomeA/incomeB` are typically non-negative, the lack of a floor is a robustness gap.  
**Boundary test:** `piaFromIncome(-50000)` — assert result `>= 0`.  
**Fix direction:** `const aime = Math.min(Math.max(0, Number(income) || 0), SS_CAP) / 12;`

---

### I-3: `pensionERF` has a sharp rounding discontinuity at age 64.5

**File:** `src/finance/pension.js` lines 3–10  
**What is wrong:** `pensionERF` uses `Math.round(age)` to look up the ERF table. This creates a discontinuity: age 64.4 maps to ERF 0.9085, but age 64.5 maps to ERF 1.0 (treated as ≥65 via the table key 65). An age of 64.5 passed as `pensionAge` would give a 10-percentage-point bonus relative to the same age rounded down.  

More specifically: the `age >= 65` guard at line 4 uses the **raw** (unrounded) age, while the table lookup uses `Math.round(age)`. So:
- age 64.5: not caught by `age >= 65` guard → reaches `DRS_ERF_UNDER_30[Math.round(64.5)]` = `DRS_ERF_UNDER_30[65]` = 1.0. Result: full unreduced pension.
- age 64.4: same path → `DRS_ERF_UNDER_30[64]` = 0.9085.

**Why it matters:** The UI likely passes integer ages, so this is low probability in practice. But it represents a semantic mismatch between the guard and the lookup that could produce surprising results if pensionAge is ever derived programmatically (e.g., `ageB + yearsUntilRetirement` for a non-integer gap).  
**Boundary test:** `pensionERF(64.5, 20, 2)` — assert result equals `DRS_ERF_UNDER_30[64]` (0.9085), not 1.0.  
**Fix direction:** Apply `Math.floor` consistently (DRS ages are integer calendar ages), or apply `Math.round` to the `age >= 65` guard as well: `if (Math.round(age) >= 65) return 1;`

---

### I-4: `runMonteCarlo` divides by zero and produces `NaN` for `paths = 0`

**File:** `src/finance/monteCarlo.js` lines 46–59  
**What is wrong:** When `paths = 0` (degenerate input), the `for (let p = 0; p < 0; p++)` loop does not execute. `balancesByYear` contains arrays of length 0. `quantile([], 0.1)` in d3-array returns `undefined`. `Math.round(undefined)` returns `NaN`. `successProb = 0 / 0 = NaN`. Every output field becomes `NaN`, which will crash the UI's chart renderers with silent errors.  
**Why it matters:** A `paths = 0` call (e.g., a user typing "0" in a future MC configuration UI) would silently corrupt the entire result object rather than returning an error or empty result.  
**Boundary test:** `runMonteCarlo(state, { paths: 0 })` — assert an error is thrown or a safe empty result is returned.  
**Fix direction:** Add a guard at the top: `if (paths <= 0) throw new RangeError('paths must be > 0');` or return a sentinel `{ paths: 0, successProb: null, balanceFan: [] }`.

---

### I-5: Travel taper never activates when `years <= 10`

**File:** `src/finance/events.js` lines 1–9  
**What is wrong:** `travelSpendForYear` tapers only when `travel.taper && idx >= 10`. The valid index range is `0` to `years - 1`. If `years <= 10`, the maximum valid `idx` is `years - 1 <= 9`, which never satisfies `idx >= 10`. The taper flag has no effect regardless of its value.  
**Why it matters:** A user who sets `years = 8` and `taper = true` expects to see gradual reduction, but the model applies full budget for all 8 years. The UI may even label the toggle as active while it has zero effect.  
**Boundary test:** `travelSpendForYear({ on: true, amount: 15000, years: 10, taper: true }, retireCal + 9, retireCal)` — `idx = 9`, `years = 10`: the last valid year should (per user intent) taper but does not.  
**Fix direction:** Separate the taper pivot from the constant `10`. Example: `if (travel.taper && idx >= Math.floor(years / 2))` — or expose the pivot year as a configurable property. Document the current behavior explicitly if the `years > 10` assumption is intentional.

---

### I-6: Empty `rows` when both spouses' ages exceed 95

**File:** `src/finance/simulate.js` line 74  
**What is wrong:** `end = Math.max(95 - i.ageA, 95 - i.ageB)`. When both `ageA > 95` and `ageB > 95`, both terms are negative and `end` is the **less negative** value (e.g., for ageA=97, ageB=96: end = max(-2, -1) = -1). The `for (let y = 0; y <= end; y++)` loop body never executes, producing `rows = []`.  
**Why it matters:** `steadyState` falls back to `sim.rows[sim.rows.length - 1]` when no row satisfies `r.aA >= startAgeA`. With `rows = []`, `sim.rows[sim.rows.length - 1]` is `undefined`, causing a runtime crash in `steadyState`.  
**Boundary test:** `simulate({ ...state, ageA: 96, ageB: 96 }, ...)` — assert `rows.length === 0` is handled gracefully, and `steadyState` returns a safe empty result.  
**Fix direction:** Add `if (end < 0) return { rows: [], depAge: null, fullyRetAge: i.ageA, balAtFullRet: 0 };` at the start of `simulate`. Add a corresponding null-check in `steadyState`.

---

## Minor Findings

### M-1: `steadyState` uses `guaranteedTaxDetails` without rental income but `liveSav` is not excluded either

**File:** `src/finance/simulate.js` lines 189–197  
`guaranteedTaxDetails` calculates tax on guaranteed income with `rental: 0` (correct — it models life without portfolio or rental). However, `liveSav` (savings from living in an inherited home) is accumulated in `steadyState` but is not used in the `targetNeed` calculation within `steadyState` itself — `targetNeed = row.need` comes from the simulated row, which does incorporate `liveSav`. This is correct and consistent but would be easy to misread. A comment would help.

---

### M-2: `erf` is reported as `1` in `benefits()` when `pensionOn = false`

**File:** `src/finance/simulate.js` line 22  
`const erf = i.pensionOn ? pensionERF(...) : 1;`  
When pension is disabled, `erf = 1` is a sentinel (not a meaningful value) but is returned in the `steadyState` result as `erf: b.erf`. UI consumers seeing `erf = 100%` when pension is off could mislead users into thinking a pension is fully credited rather than absent.  
**Fix direction:** Return `erf: i.pensionOn ? b.erf : null` in `steadyState`, and guard the display accordingly.

---

### M-3: `stressReturnForYear` applies penalty to pre-retirement working years

**File:** `src/finance/simulate.js` lines 7–11  
`stressReturnForYear` indexes by `y` (the loop counter, not years-since-retirement). If the couple is still working during years 0–2, the stress crash still hits the portfolio balance in those years. However, during working years, `bal` is growing via `contrib`, so the net effect is smaller than the headline `-10%` implies. The behavior is not inherently wrong but differs from the common sequence-of-returns framing, which applies the crash specifically to retirement years, not pre-retirement accumulation. This should be documented.

---

### M-4: `spousalBenefitAtClaimMonthly` allows claim ages below 62

**File:** `src/finance/socialSecurity.js` lines 25–33  
Like `ownBenefitAtClaimMonthly` (C-3), `spousalBenefitAtClaimMonthly` has no floor at 62. For `claimAge = 61`, the reduction formula calculates a benefit below the SSA minimum. While less likely to go negative (the spousal formula uses a different rate), the value is legally invalid.  
**Fix direction:** `if (claimAge < 62) return spousalBenefitAtClaimMonthly(workerPia, 62);`

---

### M-5: Binary search in `solveWithdrawal` makes 3 extra `taxForYear` calls on the non-covers path

**File:** `src/finance/simulate.js` lines 53–59  
When `!covers(hi)` (portfolio cannot cover the need), the function returns immediately but recalculates `taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride)` as a final call, even though `taxForYear(..., hi, ...)` was already computed inside `covers(hi)` at line 53. This redundant call is not a correctness issue but doubles the tax computation work on the depletion path.  
**Fix direction:** Cache the tax result from the `!covers(hi)` check: `const taxAtHi = taxForYear(...); if (!covers(hi, taxAtHi)) return { withdrawal: hi, tax: taxAtHi };` with a revised `covers` signature.

---

### M-6: `retireCal` can be in the past when both spouses are already retired at plan start

**File:** `src/finance/simulate.js` line 81  
`retireCal = TAX_YEAR + Math.max(i.stopA - i.ageA, i.stopB - i.ageB)`. If both spouses have already retired (e.g., `ageA = 68, stopA = 65`), both differences are negative and `retireCal < TAX_YEAR`. The travel window `idx = cal - retireCal` then starts at a positive value in year 0, meaning the user is already partway through their travel window at plan start. This is arguably correct (travel started when they retired, before the plan was modeled), but it is a subtle behavior that the user and any test asserting `extraSpend` in year 0 should be aware of.

---

## Action Items

### Fixes (prioritize by severity)

| # | File | Description | Severity |
|---|------|-------------|----------|
| A1 | `src/finance/simulate.js` | Resolve `yearStatus` in `steadyState` for survivor scenario and pass to both `calculateFederalTaxYear` calls | Critical |
| A2 | `src/finance/simulate.js` | Add `&& p.year <= row.cal` guard to `rent` and `live` loops in `steadyState` | Critical |
| A3 | `src/finance/socialSecurity.js` | Floor `claimAge` at 62 in both `ownBenefitAtClaimMonthly` and `spousalBenefitAtClaimMonthly`; return `Math.max(0, ...)` | Critical |
| A4 | `src/finance/simulate.js` | Pass `isSurvivor` context to `spendingNeed` to exclude deceased spouse from `under65` HC count | Important |
| A5 | `src/finance/socialSecurity.js` | Floor `aime` at 0 in `piaFromIncome` to prevent negative PIA | Important |
| A6 | `src/finance/pension.js` | Align `Math.round` usage: apply rounding consistently in both the `>= 65` guard and the ERF lookup, or switch to `Math.floor` | Important |
| A7 | `src/finance/monteCarlo.js` | Guard `paths <= 0` at function entry | Important |
| A8 | `src/finance/events.js` | Document (or fix) the taper dead-zone when `years <= 10` | Important |
| A9 | `src/finance/simulate.js` | Guard empty `rows` when both ages > 95; null-check `sim.rows[last]` in `steadyState` | Important |
| A10 | `src/finance/simulate.js` | Document `erf = 1` sentinel in `benefits()` when `pensionOn = false`; return `null` from `steadyState` | Minor |
| A11 | `src/finance/simulate.js` | Document that `stressReturnForYear` applies to all years (including pre-retirement accumulation) | Minor |

### Tests to add

| # | Suite | Test | Guards |
|---|-------|------|--------|
| T1 | `simulate.js` | `steadyState` with `survivor.on=true` and `startAgeA > survivor.year - TAX_YEAR + ageA` → `steady.tax` should be higher than married equivalent | A1 |
| T2 | `simulate.js` | Rent property with `year > steadyState.startCal` → `steady.rentInc` excludes future-year property | A2 |
| T3 | `socialSecurity.js` | `ownBenefitAtClaimMonthly(1000, 40)` → result `>= 0` | A3 |
| T4 | `socialSecurity.js` | `spousalBenefitAtClaimMonthly(2000, 55)` → result `>= 0` | A3/M4 |
| T5 | `simulate.js` | Survivor at `ageB < 65` → no post-survivor rows include deceased spouse's HC bump in `need` | A4 |
| T6 | `socialSecurity.js` | `piaFromIncome(-10000)` → result `>= 0` | A5 |
| T7 | `pension.js` | `pensionERF(64.5, 20, 2)` → result equals `DRS_ERF_UNDER_30[64]` (0.9085) | A6 |
| T8 | `monteCarlo.js` | `runMonteCarlo(state, { paths: 0 })` → throws or returns safe sentinel | A7 |
| T9 | `events.js` | `travelSpendForYear({ on:true, amount:15000, years:10, taper:true }, retireCal+9, retireCal)` → documents actual behavior (full budget, taper never fires) | A8 |
| T10 | `simulate.js` | `simulate({ ...state, ageA: 96, ageB: 96 }, ...)` → no crash, `rows.length === 0` | A9 |
| T11 | `simulate.js` | `steadyState` called with empty `rows` simulation → returns safe default | A9 |

---

## Numerical Robustness Notes

- **Binary search (32 iterations):** Precision is `bal / 2^32 ≈ 2.3e-10 × bal`. For a $2M portfolio, precision is $0.00046. Adequate for annual integer rounding.
- **`Math.round` accumulation:** Rounding is applied only to the pushed row output, not to the live `bal`, `tax`, or `wd` variables. No accumulation error in the calculation path.
- **Monte Carlo quantile:** d3-array's `quantile` on sorted arrays of size ≥ 1 is well-defined. The paths-0 case (A7) is the only degenerate failure. With paths=1, percentiles all equal the single value, which is correct.
- **`taxableSS` continuity:** Verified numerically continuous at both `t1` and `t2` thresholds. No discontinuity.
- **Federal tax brackets:** Verified against the 2026 married bracket structure. `fedTax(100800, "married") = 11600` matches the test assertion.
