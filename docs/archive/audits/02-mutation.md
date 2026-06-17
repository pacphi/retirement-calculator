# Mutation Testing Audit — Report 02

**Date:** 2026-06-17
**Tool:** Stryker v9 (`@stryker-mutator/core` + `@stryker-mutator/vitest-runner`)
**Scope:** `src/finance/{tax,socialSecurity,pension,simulate,events,plan,monteCarlo}.js`
**Test suite under test:** 43 tests (`pnpm test` → `vitest run`)
**Run time:** ~10 minutes, concurrency 2

---

## Overall Mutation Score

| Metric | Count |
|--------|-------|
| Total mutants generated | 797 |
| Killed | 372 |
| Timed out (counted as killed) | 3 |
| Survived | 389 |
| No coverage | 33 |
| **Mutation score (total)** | **47.05%** |
| **Mutation score (covered only)** | **49.08%** |

A score of 47% is well below the 80% target. The suite has 100% statement coverage on the
logic paths it exercises, but roughly half of all arithmetic and relational mutations go
undetected.

---

## Per-File Scores

| File | Score | Killed | Survived | No Coverage |
|------|-------|--------|----------|-------------|
| `events.js` | **97.83%** | 45 | 1 | 0 |
| `tax.js` | **69.66%** | 62 | 27 | 0 |
| `monteCarlo.js` | 46.81% | 21 | 25 | 0 |
| `pension.js` | 44.71% | 38 | 32 | 15 |
| `plan.js` | 40.65% | 50 | 72 | 1 |
| `socialSecurity.js` | 41.03% | 32 | 37 | 9 |
| `simulate.js` | 38.30% | 124 | 195 | 8 |

`events.js` is the only well-tested file. `simulate.js` is the largest file and the worst
relative performer — it drives the annual cash-flow loop that the entire projection depends
on.

---

## Surviving Mutants — Financial Logic (Important)

These mutants change a formula in a way no test detects. A real bug of the same kind would
produce wrong numbers silently.

### tax.js

| Line | Mutation | Original code | Why it matters |
|------|----------|---------------|----------------|
| 17 | `>` → `>=` (EqualityOperator) | `if (taxableIncome > lo) tax += …` | Boundary: income exactly equal to a bracket floor adds that bracket's tax. Off-by-one could double-count the first dollar of a bracket. |
| 25 | `<=` → `<` (EqualityOperator) | `if (provisional <= t1) return 0;` | SS provisional income at the exact t1 threshold — should pay zero tax but `<` would include it. |
| 26 | `<=` → `<` (EqualityOperator) | `if (provisional <= t2) …` | Same pattern: income exactly at t2 threshold maps to wrong formula tier. |
| 29 | `+` → `-` (ArithmeticOperator) | `… 0.85*(provisional - t2) + Math.min(…)` | Subtraction instead of addition in the 85% SS taxable formula produces a wildly wrong taxable SS amount. |
| 29 | `Math.min` → `Math.max` | Same line | Removes the SS-amount cap in the tier-2 formula. |
| 34 | `>=` → `>` or `<` | `ageA >= 65 ? 1 : 0` | A 65-year-old single filer gets zero senior deductions instead of one. |
| 45 | `>` → `>=` | `if (agi > phaseStart) seniorBonus = …` | Phase-out triggers one dollar early. |
| 45 | `Math.max` → `Math.min` | `Math.max(0, seniorBonus - …)` | Allows seniorBonus to go negative, inflating the deduction above the cap. |
| 45 | `-` → `+` (ArithmeticOperator) | `seniorBonus - (agi - phaseStart) * 0.06` | Phase-out increases bonus instead of reducing it. |
| 64 | `-` → `+` (ArithmeticOperator) | `agi - deduction` | Taxable income = AGI *plus* deduction — pays tax on money not earned. |
| 60 | `+` → `-` (rental, pension) | `wages + pension + rental + …` | Excludes rental or pension from ordinary income. |
| 60 | `*` → `/` (tradFrac) | `grossWithdrawal * tradFrac` | Traditional fraction applied as divisor inverts the Roth/traditional split. |

### socialSecurity.js

| Line | Mutation | Original code | Why it matters |
|------|----------|---------------|----------------|
| 4 | `Math.min` → `Math.max` | `Math.min(income, SS_CAP) / 12` | Removes the SS earnings cap — PIA grows without bound for high earners. |
| 5–7 | `-` → `+` in second bend-point subtraction | `0.32 * Math.max(0, Math.min(aime, BEND[1]) - BEND[0])` | Sign flip in PIA bend-point formula produces incorrect PIA for mid-range earners. |
| 6 | `Math.max` → `Math.min` (second term) | Same line | Changes `max(0, …)` to `min(0, …)` — the 32% segment becomes zero or negative. |
| 7 | `Math.max` → `Math.min` | `0.15 * Math.max(0, aime - BEND[1])` | Eliminates the 15% high-earner segment. |
| 12 | `* 12` → `/ 12` | `(67 - claimAge) * 12` | Converts years-to-months by dividing instead of multiplying — reduction factor 144× too small. |
| 13 | `<=` → `<` | `months <= 36` | Off-by-one on the 36-month boundary between two reduction rate formulas. |
| 15 | `+` → `-` (months-36 term) | `36*(5/9) + (months-36)*(5/12)` | Subtracts instead of adds the second-tier reduction — wrong for claims before age 64. |
| 16 | `* (1 - reduction)` → `/ (1 - reduction)` | `pia * (1 - reduction)` | Benefit grows instead of shrinks when claiming early — completely inverts early-claim penalty. |
| 27 | `>=` → `>` | `if (claimAge >= 67) return fullSpousal` | Spousal claimant at exact age 67 gets a reduced benefit instead of full. |

### pension.js — `pensionERF` (lines 3–9)

| Line | Mutation | Original code | Why it matters |
|------|----------|---------------|----------------|
| 4 | `>=` → `>` | `if (age >= 65) return 1` | A 65-year-old gets ERF < 1 instead of the full factor. |
| 4 | Conditional → `false` | Same guard | ERF check is skipped entirely — age-65 full factor never returned. |
| 5 | Conditional → `false` | `if (age < 55) return 0` | People under 55 get a non-zero ERF. |
| 7 | Conditional → `false` | `plan === 3 ? 10 : 20` | `minEarlyYears` always 20, making Plan 3 need 20 years not 10. |

All `drsEligibilityNote` survivors (lines 12–21) are advisory string returns; they are
Important only in so far as they drive UI messaging about eligibility.

### simulate.js — Core Annual Loop

| Line | Mutation | Original code | Why it matters |
|------|----------|---------------|----------------|
| 14 | `/ 12` → `* 12` | `(ssFraA || 0) / 12` — monthly PIA from annual statement | Annual SS statement converted to annual again instead of monthly — PIA 144× too large. |
| 16–17 | `* 12` → `/ 12` | `ownBenefitAtClaimMonthly(piaA, i.claimA) * 12` | Annual SS benefit computed as monthly ÷ 12 — 144× too small. |
| 18–19 | `>` → `>=` or `<=` | `piaB > piaA` — spousal eligibility | Spousal benefit assigned when PIAs are equal — double-counts SS. |
| 24 | `=== 3` → `!== 3` | `i.plan === 3 ? 0.01 : 0.02` — DRS multiplier | Plan 2 gets the Plan 3 1% multiplier (half pension). |
| 25 | `/ 12` → `* 12` | `resolveAfc(i) / 12` — monthly AFC | Annual pension computed at 144× intended value. |
| 26 | `* 12` → `/ 12` or `/ erf` | `multiplier * pYears * monthlyAfc * erf * 12` | Pension annualized incorrectly or ERF applied as divisor. |
| 30 | `+` → `-` | `(workA?0.5:0) + (workB?0.5:0)` | Contribution when both work becomes zero instead of full match. |
| 46 | `+ss` → `-ss` | `wages + pens + rent + ss` | SS subtracted from income — household income understated by 2× SS. |
| 48 | `>=` → `>` | `if (income - tax >= need)` | Off-by-one: withdrawal triggered even when guaranteed income exactly covers spending. |
| 48 | `-` → `+` | `income - taxNoWithdrawal >= need` | Adds tax to income instead of subtracting — withdrawal never triggered. |
| 52 | `>=` → `>` | bisection `covers()` predicate | Bisection solve off-by-one — withdrawal solve may fail at boundary. |
| 52 | `-` → `+` | `income + withdrawal - tax >= need` | Tax added to income in bisection — finds wrong withdrawal. |
| 64 | `/ 2` → `* 2` | `(hcPre - hcPost) / 2` — per-person healthcare | Per-person pre-Medicare cost doubled; total healthcare bump 4× too high. |
| 64 | `Math.max` → `Math.min` | `Math.max(0, hcPre - hcPost)` | Allows negative per-person HC — Medicare saves become a cost. |
| 64 | `-` → `+` | `hcPre - hcPost` | Pre + Post instead of difference — wrong HC delta. |
| 65 | `+` → `-` | `(ageA<65?1:0) + (ageB<65?1:0)` | Under-65 count goes negative when both are under 65. |
| 65 | `<` → `<=` or `>=` | Age-65 boundary both spouses | Either spouse's Medicare crossover triggers a year early/late. |
| 66 | `* 12` → `/ 12` | `perPersonHC * under65 * 12` | Annual HC bump computed monthly — 144× too small. |
| 67 | `-liveSav` → `+liveSav` | `base + hcBump - liveSav` | Location cost of living added twice instead of subtracted. |
| 92 | `>=` → `>` | `aB >= i.pensionAge` | Pension starts one year late. |
| 94–95 | `>=` → `>` | `aA >= i.claimA`, `aB >= i.claimB` | SS starts one year late for both spouses. |
| 121 | `+` → `-` | `bal * (1 + yearReturn) + sellLump` | Lump sale proceeds subtracted from balance — estate sale destroys balance. |
| 125–136 | Multiple `+` → `-` on income components | afterTaxBeforeWithdrawal, afterTaxCash | Various income streams (rent, SS, pension) subtracted — wildly understates cash flow. |
| 126 | `Math.min` → `Math.max` (contrib) | `Math.min(plannedContrib, surplus)` | Contribution grows with surplus instead of being capped — over-contributes. |
| 127 | `+=` → `-=` (bal += contrib) | Balance increases with contribution | Balance decreases instead of increases when surplus exists. |
| 130 | `-=` → `+=` (bal -= wd) | Balance decreases by withdrawal | Withdrawal *adds* to balance — portfolio never depletes. |
| 137 | Multiple operators on `depAge` guard | `bal <= 0 && depAge === null && afterTaxCash < need` | Depletion age captured prematurely or not at all. |
| 169 | `*` → `/` | `FV * i.swr` | Safe-withdrawal-rate applied as divisor — annual draw ~ $1. |
| 173–176 | `+` → `-` | ssA+ssB, guaranteed+pension, recurring+wd | Key income aggregations subtract components instead of adding them. |

### monteCarlo.js

| Area | Surviving count | Representative mutation |
|------|----------------|------------------------|
| Percentile / sort logic | ~10 | operators on index arithmetic |
| Return / volatility arithmetic | ~8 | `+` ↔ `-`, `*` ↔ `/` |
| Simulation loop bounds | ~7 | `<` ↔ `<=`, off-by-one on trial count |

monteCarlo mutations largely survive because the tests check that the function returns
*something* for the 10th/50th/90th percentiles, but do not assert specific numeric ranges
under controlled random seed.

---

## Surviving Mutants — Minor (Non-Financial Logic)

| File | Area | Count | Notes |
|------|------|-------|-------|
| `plan.js` | String literals ("pre", "post", location names) | ~20 | Cosmetic display/label mutations. |
| `plan.js` | `ArrayDeclaration []` / `ObjectLiteral {}` stubs | ~10 | Plan defaults that are assembled but not asserted on numerically. |
| `pension.js` | `drsEligibilityNote` string returns | ~10 | Advisory messages, not math. |
| `simulate.js` | `StringLiteral ""` (status, pensionNote) | ~5 | Status string fallback mutations. |

---

## Action Items

Each item names the **test to add** and its **severity**.

### CRITICAL — Core Income / Tax Math

| # | File:Line | Mutant type | Severity | Test to add |
|---|-----------|-------------|----------|-------------|
| A1 | `tax.js:17` | `>` → `>=` bracket boundary | Important | `fedTax` with taxableIncome exactly equal to each bracket floor (e.g. $23,200 for MFJ 12% bracket start) — assert tax equals expected value, not `>= 0`. |
| A2 | `tax.js:25–26` | `<` vs `<=` SS thresholds | Important | `taxableSS` with provisional income exactly at t1 and t2 thresholds for both filing statuses — assert returns `0` at t1, and the correct 50%-formula value at t2. |
| A3 | `tax.js:29` | `+` → `-`, `Math.min` → `Math.max` SS tier-2 | Important | `taxableSS` with provisional income well above t2 — assert taxable SS ≤ 0.85 × socialSecurity; use a concrete numeric case (e.g. $100k income, $30k SS MFJ) with expected value. |
| A4 | `tax.js:34` | `>=` → `>` ageA 65 boundary | Important | `seniorEligibleCount("single", 65, 0)` → `1`; `seniorEligibleCount("single", 64, 0)` → `0`. |
| A5 | `tax.js:45` | `Math.max` → `Math.min`, `-` → `+` phase-out | Important | `standardDeduction` with AGI exactly at and above `SENIOR_BONUS_PHASEOUT` — assert deduction decreases as AGI rises, never goes below `STD[status]`. |
| A6 | `tax.js:64` | `-` → `+` taxable income | Important | `calculateFederalTaxYear` smoke test: wages=$60k, no SS, no withdrawal → assert `taxableIncome < agi` (deduction subtracts, not adds). |
| A7 | `tax.js:60` | rental/pension dropped, `tradFrac` inverted | Important | `calculateFederalTaxYear` with rental=$12k and pension=$20k — assert `ordinary` includes both. `tradFrac=0` → `grossWithdrawal` contributes nothing; `tradFrac=1` → full withdrawal in ordinary. |

### CRITICAL — Social Security

| # | File:Line | Mutant type | Severity | Test to add |
|---|-----------|-------------|----------|-------------|
| B1 | `ss.js:4` | `Math.min` → `Math.max` SS cap | Important | `piaFromIncome(SS_CAP * 2)` and `piaFromIncome(SS_CAP)` — assert they return the same PIA (cap enforced). |
| B2 | `ss.js:5–7` | Sign flips in bend-point formula | Important | Three-point test: (1) income below BEND[0] — only 90% segment; (2) income between bends — 90%+32% segments; (3) income above BEND[1] — all three segments. Assert each PIA is strictly greater than the previous. |
| B3 | `ss.js:12` | `* 12` → `/ 12` months conversion | Important | `ownBenefitAtClaimMonthly(1000, 62)` — assert result is between 0 and 1000 (not ~1000/144 or ~144000). |
| B4 | `ss.js:13` | `<=` → `<` at 36-month boundary | Important | Claim age exactly 64 (= 67 − 3 years = 36 months early) — assert result uses the `36*(5/9)` formula, not the extended one. |
| B5 | `ss.js:16` | `* (1-r)` → `/ (1-r)` | Important | `ownBenefitAtClaimMonthly(1000, 62)` < 1000; `ownBenefitAtClaimMonthly(1000, 70)` > 1000. |
| B6 | `ss.js:27` | `>=` → `>` spousal FRA boundary | Important | `spousalBenefitAtClaimMonthly(2000, 67)` → `1000` (full 50%); at age 66 → < 1000. |

### CRITICAL — Pension ERF

| # | File:Line | Mutant type | Severity | Test to add |
|---|-----------|-------------|----------|-------------|
| C1 | `pension.js:4` | `>=` → `>` age-65 boundary | Important | `pensionERF(65, 20)` → `1`; `pensionERF(64, 20)` → value from ERF table (< 1). |
| C2 | `pension.js:5` | Guard removed | Important | `pensionERF(54, 30)` → `0`; `pensionERF(55, 30)` → non-zero. |
| C3 | `pension.js:7` | `plan===3 ? 10 : 20` → always 20 | Important | `pensionERF(60, 15, 3)` — Plan 3, 15 years service, age 60 should return non-zero ERF (10-year min met); `pensionERF(60, 15, 2)` → 0 (20-year min not met). |

### CRITICAL — simulate.js Annual Loop

| # | File:Line | Mutant type | Severity | Test to add |
|---|-----------|-------------|----------|-------------|
| D1 | `simulate.js:14–17` | `/ 12` ↔ `* 12` on SS conversion | Important | `runSimulation` with `ssModeA="statement"`, `ssFraA=24000` — assert annual SS in output row ≈ 24000 (not 288000 or 1667). |
| D2 | `simulate.js:26` | Pension `* 12` ↔ `/ 12`, `/erf` | Important | `runSimulation` with pension on, known pYears and AFC — assert annual pension in first eligible row equals `multiplier × pYears × afc × erf` (round-trip). |
| D3 | `simulate.js:46` | `+ss` → `-ss` | Important | Income row with SS > 0 — assert `income` field equals wages+pension+rent+ss (not minus). |
| D4 | `simulate.js:48,52` | `>=` → `>`, `-` → `+` in solver | Important | Scenario where guaranteed income exactly equals spending need — assert `withdrawal` is 0. |
| D5 | `simulate.js:64–66` | HC delta arithmetic | Important | One spouse under 65, one over 65 — assert `need` increases by approximately `(hcPre−hcPost)/2` compared to both-over-65 case. |
| D6 | `simulate.js:92,94–95` | `>=` → `>` pension/SS start boundary | Important | Assert pension/SS appear in the row where `cal === pensionStartYear`, not one year later. |
| D7 | `simulate.js:121` | `+sellLump` → `-sellLump` | Important | Property sale event — assert balance increases in the sale year, not decreases. |
| D8 | `simulate.js:126–127,130` | contrib/withdrawal sign flips | Important | Surplus year (income > need) — assert balance grows; withdrawal year — assert balance shrinks. |
| D9 | `simulate.js:169` | `FV * swr` → `FV / swr` | Important | `buildSWRProjection` with known FV and SWR — assert `wd ≈ FV * SWR`. |
| D10 | `simulate.js:173–176` | `+` → `-` income aggregations | Important | Any `buildSWRProjection` row — assert `gross = ssA+ssB+pension+rent+wd` numerically. |

### IMPORTANT — monteCarlo.js

| # | Area | Severity | Test to add |
|----|------|----------|-------------|
| E1 | Percentile extraction | Important | Seed the PRNG (mock `d3-random`), run `runMonteCarlo`, assert `p10 < p50 < p90` and that p50 is approximately the median of the trials. |
| E2 | Arithmetic operators in return/vol | Important | With deterministic returns (volatility=0), assert all percentiles converge to the same value as a single-path deterministic simulation. |
| E3 | Loop bounds | Minor | `trials=1` → single value; `trials=0` → returns `{p10:0, p50:0, p90:0}` or throws gracefully. |

### Minor — plan.js / eligibility strings

| # | Area | Severity | Test to add |
|----|------|----------|-------------|
| F1 | `buildPlan` stage/"pre"/"post" strings | Minor | Assert `buildPlan(settings).stage` equals `"pre"` before retirement and `"post"` after. |
| F2 | Location lookup (`retireLoc`) | Minor | Assert `buildPlan({…, retireLoc:"Seattle"}).loc.name === "Seattle"`. |
| F3 | `drsEligibilityNote` vesting thresholds | Minor | Spot-check: Plan 2 with 4 years → vesting message; Plan 3 with 9 years → vesting message; Plan 2 with 5 years → `""`. |

---

## Summary Counts

| Severity | Count |
|----------|-------|
| Important (core math) | 34 action items |
| Minor (guard/label code) | 5 action items |
| **Total** | **39 action items** |

The highest-leverage single change is adding **numeric assertions** to the existing
`simulate.js` integration test — several survivors there die the moment any row's `income`,
`withdrawal`, `pension`, or `need` field is asserted to a concrete expected value rather
than just checking that the simulation returns a non-empty array.

---

## Artifacts

| Artifact | Path |
|----------|------|
| HTML report | `reports/mutation/mutation.html` |
| JSON report | `reports/mutation/mutation.json` |
| Stryker config | `stryker.conf.json` |
| Run history | `.claude/skills/mutation-testing/run-history.json` |
