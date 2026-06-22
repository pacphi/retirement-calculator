# Exploration Verdict: Wave 0 Characterization Tests

**Date:** 2026-06-21  
**Phase:** Wave 0 Phase 0C (Seam lock)  
**Branch:** feat/two-arcs-roadmap

---

## Overview

Tasks 1–3 added characterization tests that froze the current behavior of three exploratory features. All tests **passed unchanged** against the current implementation, confirming each feature is correct against its documented contract and ready to be **KEPT** as a stable foundation.

---

## Feature 1: Location-Cost Spending Basis

**Location:** `src/finance/simulate.js` (`spendingNeed` function)  
**Characterization Test Guard:** `describe("spendingNeed location basis (seam contract for 0D)", ...)` block in `src/calculatorCore.test.js`  
**Test Count:** 3 test cases

### Test cases

1. **Couple pre-65:** Sums cost-of-living basket plus age-based healthcare for a married couple under 65.
2. **Survivor + single factor:** Confirms `SINGLE_COST_FACTOR` applied and single healthcare calculation.
3. **Lifestyle scaling + live-in saving:** Validates lifestyle multiplier applies only to living costs (not healthcare); `liveSav` subtracted from total.

### Verdict (Feature 1)

**KEEP** — All three tests pass unchanged. The location-basis branch of `spendingNeed` matches its documented formula: `basket*12*scale*lifestyle + healthcareByAge`, floored at `0.35*base`, with `liveSav` subtracted.

### Seam note (Feature 1)

Task 12 will recompose `spendingNeed` into composable parts (nonHousingBase / healthcare / housing / lifestyleSteps / events) and **MUST preserve this contract numerically**. The 3rd test pins direction (toBeLessThan) not magnitude — tighten if Task 12 needs a stronger guard.

---

## Feature 2: Year-by-Year / Month-by-Month Navigator

**Location:** `src/finance/breakdown.js` (`monthlyBreakdown()` and `yearMilestones()` functions)  
**Characterization Test Guard:** `src/finance/breakdown.test.js` (entire test file)  
**Test Count:** 5 test cases (2 for monthlyBreakdown, 3 for yearMilestones)

### Tests

**monthlyBreakdown:**

1. Divides annual figures into honest per-month rates; prioritizes `wdSpend` over `wd`.
2. Falls back to `wd` when `wdSpend` absent; tolerates missing fields.

**yearMilestones:**

1. Flags income stream onset only in the first year (no double-fire).
2. Surfaces home sale as spend milestone with amount.
3. Flags Medicare eligibility at 65 and work-stop from inputs.

### Verdict (Feature 2)

**KEEP** — All five tests pass unchanged. `monthlyBreakdown()` and `yearMilestones()` correctly derive presentational breakdowns from annual simulation rows.

### Seam note (Feature 2)

`monthlyBreakdown` and `yearMilestones` are presentational derivations (not financial engines). The YearByYear UI component (Task 8) depends on this contract and will consume both functions directly.

---

## Feature 3: Recurring Life Events

**Location:** `src/finance/events.js` (`scheduledSpendForYear()` and `oneTimeSpendForYear` alias)  
**Characterization Test Guard:** `describe("recurring events (seam contract for Wave 1 C3)", ...)` block in `src/calculatorCore.test.js`  
**Test Count:** 3 test cases

### Test cases

1. **Cadence firing within window + off-cadence silence:** Event fires on `year + (n × everyYears)` where `0 ≤ n`; no `untilYear` runs to horizon; outside window silenced.
2. **No everyYears → one-time event:** Absence of `everyYears` triggers back-compat alias `oneTimeSpendForYear()` (fires once in specified year).
3. **Disabled events skip:** Events with `on: false` are excluded.

### Verdict (Feature 3)

**KEEP** — All three tests pass unchanged. Cadence, windowing, defaults, and back-compat alias (`oneTimeSpendForYear`) are now locked.

### Seam note (Feature 3)

Wave 1 C3 (typed/emergent events) extends this module. Cadence + `untilYear` windowing + back-compat alias are now locked and must not regress.

---

## Summary Table

| Feature | Test File / Block | Test Count | Verdict  |
| ------- | ----------------- | ---------- | -------- |
| Location-cost spending basis | `src/calculatorCore.test.js` — "seam contract for 0D" | 3 | **KEEP** |
| Year-by-year / month-by-month navigator | `src/finance/breakdown.test.js` | 5 | **KEEP** |
| Recurring life events | `src/calculatorCore.test.js` — "Wave 1 C3" | 3 | **KEEP** |

---

## Downstream Constraints

- **Task 8 (YearByYear extraction):** Depends on `breakdown.js` contract (monthlyBreakdown, yearMilestones).
- **Task 12 (Spending recomposition):** Must preserve location-basis `spendingNeed` contract numerically.
- **Wave 1 C3 (Typed events):** Must not regress cadence, windowing, or back-compat alias behavior.

All three features are **production-ready and locked as stable foundations** for downstream work.
