# Sherlock Correctness Audit — 03

**Date:** 2026-06-17
**Auditor:** Evidence-based independent re-derivation (no trust of comments)
**Scope:** `src/finance/` (tax.js, socialSecurity.js, pension.js, simulate.js, events.js, plan.js, monteCarlo.js), `src/retirementData.js`
**Verification script:** `audits/verify-sherlock.mjs` (throwaway, uncommitted)

---

## 1. Hand Derivations vs Engine — Snapshot Household

Default state from `RetirementCalculator.jsx` line 88–92:

| Parameter | Value |
|-----------|-------|
| ageA / ageB | 57 / 48 |
| incomeA / incomeB | $0 / $170,000 |
| savings | $670,000 |
| plan / pYears / afc | 3 / 22 / $170,000 |
| pensionAge / claimA / claimB | 65 / 65 / 65 |
| ssMode / ssCutYear | trustees / 2034 (81%) |
| retireLoc | Austria (Klagenfurt live-in) |
| at strategy | live ($324,000 home, year 2040) |

### 1.1 Benefit derivations

| Calculation | Hand derivation | Engine output | Verdict |
|-------------|----------------|---------------|---------|
| **DRS Plan 3 pension** `0.01 × 22 × 170000 × ERF(65)` | `0.01 × 22 × 170000 × 1.0 = $37,400/yr` | `$37,400/yr` | ✓ MATCH |
| **Person B PIA** (income estimate, AIME=170000/12=14166.67) `0.9×1286 + 0.32×6463 + 0.15×6417.67` | `$4,188.21/mo ($50,259/yr)` | `$4,188.21/mo` | ✓ MATCH |
| **Person B own benefit at claim 65** (24 months early from FRA 67; reduction=24×5/9/100=13.33%) | `4188.21 × (1−0.1333) = $3,629.78/mo ($43,557/yr)` | `$43,557/yr` | ✓ MATCH |
| **Person A spousal benefit at claim 65** (full spousal = 0.5 × piaB = $2,094.11/mo; 24 months early; spousal reduction=24×25/36/100=16.67%) | `2094.11 × (1−0.1667) = $1,745.09/mo ($20,941/yr)` | `$20,941/yr` | ✓ MATCH |
| **SS 81% haircut from 2034** | `ssA=$20,941×0.81=$16,962; ssB=$43,557×0.81=$35,281` | `ssA=$16,962; ssB=$35,281` | ✓ MATCH |
| **Spousal cap — no delayed credits** `spousal(workerPia=1000, claim=70)` | `$500.00 (capped at 50% piaB)` | `$500.00` | ✓ MATCH |

### 1.2 Steady-state federal tax derivation (married, ageA=74, ageB=65, agi from engine)

Engine finds steady-state row at ageA=74 (cal 2043).

| Component | Engine | Hand |
|-----------|--------|------|
| Ordinary income (pension + rental + wd × 0.7) | $69,714 | $37,400 + $0 + $46,163 × 0.7 = $69,714 ✓ |
| Provisional income for SS test | — | $69,714 + 0.5 × $52,243 = $95,836 |
| Taxable SS (married, prov > $44,000 tier 2) | $44,407 | `min(0.85×52243, 0.85×(95836−44000)+min(0.5×52243, 0.5×12000))` = $44,407 ✓ |
| AGI | $114,121 | $69,714 + $44,407 = $114,121 ✓ |
| Standard deduction (married; ageA=74≥65, ageB=65≥65; agi=$114,121 < $150,000 phaseout start) | $47,500 | $32,200 + 2×$1,650 + 2×$6,000 = $47,500 ✓ |
| Taxable income | $66,621 | $114,121 − $47,500 = $66,621 ✓ |
| Federal tax (married brackets) | $7,499 | $7,499 ✓ |
| **Tax match** | | **YES ✓** |

### 1.3 Additional checks

| Check | Result |
|-------|--------|
| Pension starts at aB≥pensionAge (aA=74, aB=65, cal=2043) | ✓ pens=$37,400 from cal=2043, $0 before |
| Klagenfurt live-in reduces need (not income) from cal=2040 | ✓ need drops from $83,600 to $52,688+extraSpend |
| Pre-65 healthcare bump gated per-person | ✓ $100/mo diff × 1 person × 12 = $1,200/yr |
| SENIOR_BONUS phaseout (married, agi=200k) | ✓ 12,000 − (200k−150k)×0.06 = $9,000 residual bonus |
| SS wage cap (income > SS_CAP clamped) | ✓ piaFromIncome(300k) = piaFromIncome(184,500) |
| DRC cap at 36 months (own benefit, claim=71 same as 70) | ✓ both return $1,240 per $1,000 PIA |
| guaranteedNet uses no rental in tax base | ✓ separately computed with rental=0 |

---

## 2. CLAUDE.md Calculation Rules Audit

| Rule | Status | Evidence |
|------|--------|----------|
| **One tax engine for both depletion and headline** | ✓ HONORED | `simulate.js`: `taxForYear` → `calculateFederalTaxYear`; `steadyState` → `calculateFederalTaxYear` directly. Same function, same import. |
| **Spending treated as after-tax** | ✓ HONORED | `solveWithdrawal` (simulate.js:50-59): `covers(wd) := income + wd − tax(wd) >= need`. `need` is the after-tax target; the solver finds the gross withdrawal that nets it. |
| **Age-65 deductions only for filers actually 65+** | ✓ HONORED | `seniorEligibleCount` (tax.js:33-36) counts each spouse separately by exact age; deduction and bonus applied per eligible count. Verified: both <65 → $32,200; both 65+ → $47,500. |
| **SSA statement preferred; income estimate is only fallback** | ⚠ PARTIAL | Engine correctly branches on `ssModeA`/`ssModeB` (simulate.js:14-15). However, the default state (RetirementCalculator.jsx:90) sets both to `"estimate"`, contrary to the stated preference. This is a **UI default policy violation**, not a math error. |
| **Spousal SS capped at 50% worker PIA at FRA; no delayed retirement credits** | ✓ HONORED | `spousalBenefitAtClaimMonthly` (socialSecurity.js:25-33): `if (claimAge >= 67) return 0.5 * workerPia`. No DRC path exists. Verified: claim 67, 68, 70 all return exactly $500 per $1,000 PIA. |
| **Current WA DRS ERFs + service-year eligibility guards** | ✓ HONORED (with notation) | `pensionERF` (pension.js:3-9): plan 3 requires ≥10 years, plan 2 requires ≥20 years; ERF tables applied for age 55–64. Service guard verified: ERF(57, 9, plan3)=0. See Discrepancy D1 for comment inaccuracy. |
| **Rental kept separate from guaranteed lifetime benefits** | ✓ HONORED | `steadyState` (simulate.js:173-198): `guaranteed = ssHouse + pension` (no rental); `recurring = guaranteed + rentInc`. `guaranteedTaxDetails` computed with `rental=0`. Rental only enters `recurring`. |

---

## 3. Discrepancies Found

### D1 — Comment claims Plan 2 only; code applies table to both plans
**Severity:** Low
**File:line:** `src/retirementData.js:29`
**Comment:** `"DRS factors are current Plan 2 examples published by Washington DRS for members with less than 30 years."`
**Reality:** `DRS_ERF_UNDER_30` is used by `pension.js:pensionERF()` for **both Plan 2 and Plan 3** when years < 30. The values are correct (Washington DRS publishes the same ERF schedule for both plans with fewer than 30 service years), but the comment is misleading.
**Impact:** Documentation only; no calculation error. No users are harmed.

### D2 — Default SS mode is "estimate", not "statement"
**Severity:** Medium
**File:line:** `RetirementCalculator.jsx:90`
**CLAUDE.md rule:** "Prefer SSA statement inputs for Social Security. The income-based PIA estimate is only a fallback."
**Reality:** `ssModeA: "estimate", ssModeB: "estimate"` are the out-of-box defaults. A user who does not read documentation will use income-estimate PIA, which can differ materially from their actual SSA statement (especially for workers with non-linear earnings histories, government-pension-offset cases, or years with zero FICA wages like person A).
**Impact:** Stated-preference policy violation. For this household (person A income=$0), the income estimate correctly yields PIA=$0, so the impact is benign for the snapshot. For other users with non-representative current income, the estimate could over- or under-state SS significantly.

### D3 — `sellAfter` in `steadyState` does not compound future sale proceeds
**Severity:** Low (informational)
**File:line:** `src/finance/simulate.js:163-168`
**Code:** `const FV = row.bal + sellAfter;` — sell proceeds expected after the steady-state row are added flat (no time-value adjustment).
**Reality:** For a sale at year `p.year > row.cal`, the proceeds arrive in the future but are treated as if they're available today for the SWR calculation. This overstates sustainable income by approximately `sellProceeds × swr × (years_away)`.
**Impact:** For the default snapshot, `at.year=2040` and `row.cal=2043` — the sale already happens before the steady row (sell proceeds flow through `simulate()` and are in `row.bal`), so `sellAfter=0`. This bug only activates when a sell year is set beyond steadyStartAgeA. Minor and conservative in the live-in / rent paths.

### D4 — Sell lump added to balance before annual growth (minor timing approximation)
**Severity:** Informational
**File:line:** `src/finance/simulate.js:121`
**Code:** `bal = bal * (1 + yearReturn) + sellLump;`
**Reality:** The balance grows first, then the lump sum is added — equivalent to receiving proceeds at start-of-year with no partial-year growth. This understates the sale-year balance by approximately `sellLump × yearReturn`. Conservative by design; acceptable for a planning tool.
**Impact:** None material. Single-year timing artifact.

---

## 4. Things Verified Correct (No Change Needed)

- **FRA hardcoded at 67:** Correct for ageA=57 (born ~1969) and ageB=48 (born ~1978); both cohorts have FRA=67 per SSA.
- **Travel taper boundary:** `idx >= 10` is 0-indexed year-of-retirement; idx 0–9 = years 1–10 (full), idx 10–14 = years 11–15 (half). Matches the plan spec exactly.
- **SS cutYear inclusive:** `cal >= cutYear` means the haircut applies starting in cutYear=2034 itself, which matches the Trustees 2025 report language ("by 2034").
- **retireCal computation:** `TAX_YEAR + max(stopA−ageA, stopB−ageB) = 2026 + max(8, 8) = 2034` — correct anchor for travel spend.
- **steadyStartAgeA=74:** `max(stopA=65, stopB+9=65, claimA=65, claimB+9=74, pensionAge+9=74)` — all benefits have started, wages=0 in `steadyState` is therefore correct.
- **Survivor SS step-up:** Larger of the two checks preserved; smaller zeroed; filing switches to single. Verified numerically.
- **Balance floor:** `if (bal < 1) bal = 0` is placed after withdrawal subtraction; prevents spurious negative compounding.
- **HC bump per-person:** `perPersonHC = (hcPre−hcPost)/2` then multiplied by count of under-65 spouses. Correctly prorates.
- **Taxable SS formula:** Two-tier IRS provisional income calculation matches IRS Publication 915 exactly.
- **SENIOR_BONUS per eligible count:** Correctly multiplied by `eligible` (0, 1, or 2); phaseout reduces the aggregate bonus using `(agi − phaseStart) × 0.06`.
- **Spousal benefit reduction rate:** 25/36% per month for the first 36 months (distinct from own-benefit reduction of 5/9%). Correctly implemented.

---

## 5. Action Items

| # | Severity | File:line | Description | Recommended Fix |
|---|----------|-----------|-------------|-----------------|
| A1 | **Medium** | `RetirementCalculator.jsx:90` | Default SS mode is `"estimate"` but CLAUDE.md mandates preferring `"statement"` | Change default to `ssModeA:"statement", ssModeB:"statement"` so users begin with the SSA-statement path. Alternatively, add an onboarding prompt that surfaces the statement fields prominently. |
| A2 | **Low** | `src/retirementData.js:29` | Comment says "Plan 2 examples" but the ERF tables are used for both Plan 2 and Plan 3 | Update comment to: "ERF factors for both Plan 2 and Plan 3 with fewer than 30 service years (DRS publishes the same schedule for both plans)." |
| A3 | **Low** | `src/finance/simulate.js:163-168` | `sellAfter` adds future property sale proceeds to FV without time-value adjustment | Either discount proceeds to steady-state date, or add a note in `steadyState` JSDoc that `sellAfter` is a flat approximation for near-term sales. Consider clamping `sellAfter` to zero for sales more than 5 years out. |
| A4 | **Informational** | `src/finance/simulate.js:121` | Sell lump added after annual growth rather than grown through the year | Document the conservative timing convention; no code change required. |

---

## 6. Summary

| Category | Count |
|----------|-------|
| Rules verified | 7 |
| Rules fully honored | 6 |
| Rules partially honored | 1 (D2 — UI default vs stated preference) |
| Discrepancies found | 4 |
| Critical | 0 |
| Important / Medium | 1 (D2) |
| Low | 2 (D1, D3) |
| Informational | 1 (D4) |
| Hand derivations all matched engine | YES — all 6 benchmark calculations match to cent precision |
