# Property-Based Testing Audit — Retirement Calculator Engine

**Date:** 2026-06-17
**Tool:** fast-check v4 (fixed seed 42, 200 runs per property; 20 runs for Monte Carlo properties)
**Test file:** `audits/property/engine.property.test.js`
**Engine under test:** `src/calculatorCore.js` and all modules under `src/finance/`

---

## Summary

| # | Invariant | Tested by | Status | Counterexample |
|---|-----------|-----------|--------|----------------|
| 1a | `fedTax(0, status) === 0` | Invariant 1 | PASS | — |
| 1b | `fedTax` is never negative | Invariant 1 | PASS | — |
| 1c | `fedTax` is monotonically non-decreasing | Invariant 1 | PASS | — |
| 2a | `steadyState().surplus >= 0` | Invariant 2 | PASS | — |
| 2b | `steadyState().modeledSpend >= 0` | Invariant 2 | PASS | — |
| 3a | Higher `savings` ⟹ `depAge` not earlier | Invariant 3 | PASS | — |
| 3b | Higher `savings` ⟹ ending balance not lower | Invariant 3 | PASS | — |
| 4 | `taxableSS` in `[0, 0.85 * SS]` | Invariant 4 | PASS | — |
| 5a | Spousal benefit ≤ 50% of worker PIA | Invariant 5 | PASS | — |
| 5b | Spousal benefit exactly 50% PIA at FRA or later | Invariant 5 | PASS | — |
| 5c | Delayed claiming increases own benefit, not spousal | Invariant 5 | PASS | — |
| 6a | `pensionERF` in `[0, 1]` | Invariant 6 | PASS | — |
| 6b | `pensionERF === 1` for age ≥ 65 | Invariant 6 | PASS | — |
| 6c | `pensionERF === 0` for age < 55 | Invariant 6 | PASS | — |
| 7a | `travelSpendForYear === 0` when travel is disabled | Invariant 7 | PASS | — |
| 7b | Result is exactly one of `{0, amount, 0.5*amount}` | Invariant 7 | PASS | — |
| 7c | Result is `0` before retirement calendar year | Invariant 7 | PASS | — |
| 7d | Result is `0` after travel window ends | Invariant 7 | PASS | — |
| 8a | `balanceFan`: `p10 ≤ p50 ≤ p90` every year | Invariant 8 | PASS | — |
| 8b | `sustainableIncome`: `p10 ≤ p50 ≤ p90` | Invariant 8 | PASS | — |
| 8c | `successProb` in `[0, 1]` across varied paths/vol | Invariant 8 | PASS | — |
| 8d | `p10 ≤ p50` holds across multiple MC seeds | Invariant 8 | PASS | — |
| 9a | Post-survivor `ssA+ssB ≤ max(pre.ssA, pre.ssB)` | Invariant 9 | PASS | — |
| 9b | Combined SS never increases after survivor event | Invariant 9 | PASS | — |
| 10a | `piaFromIncome` is non-negative | Invariant 10 | PASS | — |
| 10b | `piaFromIncome` is monotonically non-decreasing | Invariant 10 | PASS | — |
| 11a | `ownBenefitAtClaimMonthly` is non-negative | Invariant 11 | PASS | — |
| 11b | DRC is capped at 36 months: benefit at 70 = benefit at 72 | Invariant 11 | PASS | — |
| 12a | `calculateFederalTaxYear().deduction ≥ base STD deduction` | Invariant 12 | PASS | — |
| 12b | `calculateFederalTaxYear().taxableIncome ≥ 0` | Invariant 12 | PASS | — |
| 13 | All `simulate()` rows: `bal ≥ 0` and `need ≥ 0` | Invariant 13 | PASS | — |

**Total properties tested: 31 — Passed: 31 — Failed: 0**

---

## Result by invariant group

### Invariant 1 — `fedTax`: zero-at-zero, non-negative, monotonic (3 properties, PASS)

The progressive bracket engine is structurally sound. Because it accumulates marginal tax additively from sorted brackets, it cannot produce a non-zero value at income 0, cannot produce a negative value, and cannot decrease as income rises. All three properties confirmed across 200 seeds × 2 statuses.

### Invariant 2 — `steadyState`: `surplus ≥ 0`, `modeledSpend ≥ 0` (2 properties, PASS)

`surplus` is explicitly clamped via `Math.max(0, net - targetNeed)` in `simulate.js:207`. `modeledSpend` passes through `spendingNeed()` which itself has a `Math.max(0.35 * base, …)` floor, so it cannot go negative. Both structural guards confirmed.

### Invariant 3 — Savings monotonicity (2 properties, PASS)

The depletion-ordering and ending-balance ordering both hold. The engine does not exhibit any anomalous interaction (e.g., tax bracket jumps at higher balances causing a net worse outcome) within the tested range.

### Invariant 4 — `taxableSS` in `[0, 0.85 * SS]` (1 property, PASS)

The provisional-income formula's two-tier structure (`0.5*` up to T1, `0.85*` for the remainder) is arithmetically bounded. Confirmed for all `otherIncome` in `[0, 5,000,000]`, `SS` in `[0, 100,000]`, both statuses.

### Invariant 5 — Spousal benefit cap (3 properties, PASS)

`spousalBenefitAtClaimMonthly` correctly returns `0.5 * workerPia` at or after FRA (67) and never returns more than that for any later age. The delayed-credit contrast test confirms the design asymmetry: `ownBenefitAtClaimMonthly` increases for ages 67–70 while `spousalBenefitAtClaimMonthly` is flat — exactly the statutory rule.

### Invariant 6 — `pensionERF` bounds (3 properties, PASS)

The function's three guard clauses (`age >= 65 → 1`, `age < 55 → 0`, lookup otherwise) are exhaustively correct. No `DRS_ERF_UNDER_30` or `DRS_ERF_30_PLUS` lookup returns a value outside `[0, 1]`.

### Invariant 7 — `travelSpendForYear` discrete output (4 properties, PASS)

The function can only return `0`, `amount`, or `0.5 * amount`. All four structural paths (disabled, pre-retirement, in-window, post-window) were confirmed across 200 randomised travel configs and calendar/retirement year pairs.

### Invariant 8 — Monte Carlo ordering and `successProb` (4 properties, PASS)

Percentile ordering is a mathematical consequence of how `quantile` sorts the array. `successProb = lasted / paths` is arithmetically in `[0, 1]`. Confirmed across 20 path-count and volatility combinations plus 20 random MC seeds.

### Invariant 9 — Survivor transition (2 properties, PASS)

After the survivor year the engine sets `ssAyEff = max(ssAy, ssBy)` and `ssByEff = 0`. This is strictly ≤ the combined pre-survivor total and ≤ the max individual check, both confirmed under 20 random `ssFraA`/`ssFraB` combinations.

### Invariants 10–13 — Supporting function invariants (7 properties, PASS)

- `piaFromIncome`: non-negative and monotone (the three-segment AIME formula with non-negative weights is inherently monotone once income is capped at `SS_CAP`).
- `ownBenefitAtClaimMonthly`: the DRC is capped at `min(months_past_FRA, 36)`, so claims at age 72 produce the same result as age 70.
- `calculateFederalTaxYear`: deduction always ≥ base STD (senior add-ons only increase it); taxable income is clamped via `Math.max(0, …)`.
- `simulate` rows: `bal` is clamped to 0 when depleted; `need` has a `0.35 * base` floor inside `spendingNeed()`.

---

## Surprising findings

**None that constitute a bug.** Three observations worth noting:

1. **`ownBenefitAtClaimMonthly` DRC cap silently accepts ages > 70.** The implementation uses `Math.min((claimAge - 67) * 12, 36)`, which means claiming at 72 gives the same benefit as 70. This is correct per SSA rules (DRC stops accruing after 70), but the function does not reject or warn on ages above 70. In the UI this is currently harmless, but callers supplying `claimAge: 75` would silently get the 70-equivalent — not wrong for the model, but a latent footgun if the function is reused.

2. **`steadyState` surplus is structurally guaranteed `≥ 0` only by the clamp.** The underlying `net - targetNeed` can be substantially negative for low-savings inputs; the clamp hides real shortfalls. This is intentional design (the UI shows a separate deficit indicator), but property testing confirmed the clamp is always applied — no code path bypasses it.

3. **Monte Carlo percentile ordering relies on `d3-array`'s `quantile`.** If the sorted array ever contains `NaN` (e.g., from a `realReturn` that produces `Infinity * 0`), ordering could silently break. The current generator range (`realReturn` fixed at 0.05 in the MC base state) does not expose this. A future test variant randomising `realReturn` within MC would be valuable.

---

## Action items

| Severity | File : line | Finding | Suggested fix |
|----------|-------------|---------|---------------|
| Minor | `src/finance/socialSecurity.js:10` | `ownBenefitAtClaimMonthly` silently accepts `claimAge > 70` and returns the 70-equivalent without warning | Add a guard or JSDoc note: `if (claimAge > 70) claimAge = 70;` or document the cap explicitly |
| Minor | `src/finance/monteCarlo.js:16` | `realReturn` and `volatility` are not validated; extreme values (`NaN`, `Infinity`) could corrupt percentile arrays | Validate or clamp `realReturn` and `volatility` at the `runMonteCarlo` entry point |

---

## Test run details

```
Test Files  1 passed (1)
     Tests  31 passed (31)
  Start at  2026-06-17 10:30:31
  Duration  601 ms
```

Seed: 42 · fast-check v4.8.0 · Vitest v4.1.9
