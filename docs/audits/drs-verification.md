# DRS Pension Logic Verification

**Date:** 2026-06-17
**Scope:** TRS Plan 2, TRS Plan 3, SERS Plan 2, SERS Plan 3 — benefit formula, AFC, vesting, normal retirement, early-retirement eligibility, and early-retirement factor (ERF) tables.
**Primary sources:** https://www.drs.wa.gov/plan/trs2/, https://www.drs.wa.gov/plan/trs3/, https://www.drs.wa.gov/plan/sers2/, https://www.drs.wa.gov/plan/sers3/

---

## Verification Table

| # | Item | Engine value | Official value | Match? | Source URL |
|---|------|-------------|----------------|--------|------------|
| 1 | Plan 2 benefit formula | 2% × service years × AFC (annual) | 2% × service years × AFC | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 2 | Plan 3 benefit formula (DB portion) | 1% × service years × AFC (annual) | 1% × service years × AFC | ✅ Yes | https://www.drs.wa.gov/plan/trs3/ |
| 3 | AFC definition | Highest 60 consecutive months | Average of 60 consecutive highest-earning months | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 4 | Plan 2 vesting | 5 years | 5 or more years of service | ✅ Yes | https://www.drs.wa.gov/plan/sers2/ |
| 5 | Plan 3 vesting | 10 years (with limited exceptions) | 10 years, OR 5 years with ≥12 months earned after age 44 | ✅ Yes (engine note matches) | https://www.drs.wa.gov/plan/trs3/ |
| 6 | Normal retirement age (Plan 2) | Age 65 (with 5+ yrs) | Age 65 (with 5+ yrs) | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 7 | Normal retirement age (Plan 3) | Age 65 (with 10+ yrs) | Age 65 (with 10+ yrs) | ✅ Yes | https://www.drs.wa.gov/plan/trs3/ |
| 8 | Plan 2 early retirement eligibility | Age 55 with 20+ years | Age 55 with 20+ years | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 9 | Plan 3 early retirement eligibility | Age 55 with 10+ years | Age 55 with 10+ years | ✅ Yes | https://www.drs.wa.gov/plan/trs3/ |
| 10 | ERF under 30 yrs: age 55 | 0.4092 | 0.4092 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 11 | ERF under 30 yrs: age 56 | 0.4450 | 0.4450 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 12 | ERF under 30 yrs: age 57 | 0.4844 | 0.4844 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 13 | ERF under 30 yrs: age 58 | 0.5280 | 0.5280 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 14 | ERF under 30 yrs: age 59 | 0.5760 | 0.5760 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 15 | ERF under 30 yrs: age 60 | 0.6292 | 0.6292 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 16 | ERF under 30 yrs: age 61 | 0.6882 | 0.6882 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 17 | ERF under 30 yrs: age 62 | 0.7538 | 0.7538 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 18 | ERF under 30 yrs: age 63 | 0.8269 | 0.8269 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 19 | ERF under 30 yrs: age 64 | 0.9085 | 0.9085 | ✅ Yes | https://www.drs.wa.gov/plan/trs2/ |
| 20 | ERF 30+ yrs: age 55 | 0.50 | **Depends on hire date** — 0.80 (2008 ERF, hired before May 1 2013) or 0.50 (5% ERF, hired on/after May 1 2013) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 21 | ERF 30+ yrs: age 56 | 0.55 | 0.83 (2008 ERF) or 0.55 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 22 | ERF 30+ yrs: age 57 | 0.60 | 0.86 (2008 ERF) or 0.60 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 23 | ERF 30+ yrs: age 58 | 0.65 | 0.89 (2008 ERF) or 0.65 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 24 | ERF 30+ yrs: age 59 | 0.70 | 0.92 (2008 ERF) or 0.70 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 25 | ERF 30+ yrs: age 60 | 0.75 | 0.95 (2008 ERF) or 0.75 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 26 | ERF 30+ yrs: age 61 | 0.80 | 0.98 (2008 ERF) or 0.80 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 27 | ERF 30+ yrs: age 62 | 0.85 | 1.00 (2008 ERF, full benefit at 62 with 30+ yrs) or 0.85 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 28 | ERF 30+ yrs: age 63 | 0.90 | 1.00 (2008 ERF) or 0.90 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 29 | ERF 30+ yrs: age 64 | 0.95 | 1.00 (2008 ERF) or 0.95 (5% ERF) | ⚠️ Partial | https://www.drs.wa.gov/plan/trs2/ |
| 30 | Plan 3 DC account modeled | Not modeled | Not modeled (correct by design) | ✅ Yes | https://www.drs.wa.gov/plan/trs3/ |

---

## Discrepancies

### DISCREPANCY 1 — 30+ Year ERF Table: Engine implements only one table; DRS publishes two

**Engine value (`DRS_ERF_30_PLUS` in `src/retirementData.js`):**
```
55:0.50, 56:0.55, 57:0.60, 58:0.65, 59:0.70,
60:0.75, 61:0.80, 62:0.85, 63:0.90, 64:0.95, 65:1.0
```
This is exactly the **5% ERF** — the table that applies to members who **entered service on or after May 1, 2013**.

**Official DRS tables (TRS Plan 2 and SERS Plan 2 — same values):**

There are two separate 30+ year ERF tables depending on member hire date:

**Table A — 2008 ERF (hired before May 1, 2013):**

| Age | Factor |
|-----|--------|
| 55  | 0.80   |
| 56  | 0.83   |
| 57  | 0.86   |
| 58  | 0.89   |
| 59  | 0.92   |
| 60  | 0.95   |
| 61  | 0.98   |
| 62  | **1.00** ← full benefit; no reduction at age 62+ with 30+ years |
| 63  | 1.00   |
| 64  | 1.00   |

**Table B — 5% ERF (hired on or after May 1, 2013):**

| Age | Factor |
|-----|--------|
| 55  | 0.50   |
| 56  | 0.55   |
| 57  | 0.60   |
| 58  | 0.65   |
| 59  | 0.70   |
| 60  | 0.75   |
| 61  | 0.80   |
| 62  | 0.85   |
| 63  | 0.90   |
| 64  | 0.95   |

The engine's `DRS_ERF_30_PLUS` table matches Table B (5% ERF) exactly but omits Table A (2008 ERF). The 2008 ERF is substantially more favorable: members with 30+ years who retire at age 60 receive 0.95 (not 0.75), and at age 62 they receive a full, unreduced benefit of 1.00. The engine underestimates pension income for members who entered DRS service before May 1, 2013.

**Correction required:**
- Add a boolean input or membership-date field to distinguish pre-2013 from post-2013 membership.
- Add a second ERF constant (e.g. `DRS_ERF_30_PLUS_2008`) with the 2008 ERF values.
- Route `pensionERF()` through the correct table based on hire date.

**Legislative note:** HB 1056 (2023 session, effective January 1, 2024) improved benefits for members who had retired under the older 3% per-year ERF by adjusting them to the 2008 ERF level, confirming the 2008 ERF remains the operative better table for pre-2013 hires.
Source: https://www.drs.wa.gov/legislation-benefits-retirees-rrtw-newsfeed/

### DISCREPANCY 2 — ERF table applicability: TRS vs. SERS

Both TRS Plan 2 and SERS Plan 2 (and their Plan 3 counterparts) use identical ERF factor values. The engine's single shared table is therefore correct in numeric values for its target plan — it only needs to be split by hire date (see Discrepancy 1). No plan-specific ERF differences were found between TRS and SERS.

---

## Items Confirmed with No Discrepancy

1. Plan 2 benefit formula: 2% × years × AFC — correct.
2. Plan 3 DB multiplier: 1% — correct.
3. AFC definition: 60 consecutive highest-earning months — correct.
4. Plan 2 vesting at 5 years — correct.
5. Plan 3 vesting at 10 years (with age-44 exception noted in eligibility text) — correct.
6. Normal retirement at age 65 for both plans — correct.
7. Plan 2 early retirement: age 55 with 20+ years — correct.
8. Plan 3 early retirement: age 55 with 10+ years — correct.
9. ERF under-30-year table (all 10 factors, ages 55–64) — all correct.
10. Plan 3 DC account not modeled — correct by design.

---

## Recent Legislative Changes (2023–2026) Affecting TRS/SERS Plan 2/3

| Change | Effective | Impact on engine |
|--------|-----------|-----------------|
| HB 1056 (2023): Retirees who used the old 3% ERF had their benefits improved to 2008 ERF levels | Jan 1, 2024 | No change needed; affects retirees already collecting, not projection inputs |
| 2026 legislation: 3% one-time increase for TRS Plan 1 / PERS Plan 1 retirees | July 2026 | No change needed; Plan 1 only — engine models Plan 2/3 only |
| No changes to Plan 2/3 benefit multipliers, AFC definition, vesting rules, or ERF table values were identified in this review | — | — |

Sources: https://www.drs.wa.gov/legislation-benefits-retirees-rrtw-newsfeed/

---

## Confidence Note

**High confidence** on items 1–10 (confirmed, no discrepancy): values were verified directly against the current plan pages on drs.wa.gov for both TRS and SERS.

**High confidence** on the ERF discrepancy: both the 2008 ERF and the 5% ERF tables are published verbatim on the TRS Plan 2, TRS Plan 3, SERS Plan 2, and SERS Plan 3 pages. The May 1, 2013 hire-date cutoff is explicitly stated on each page. The engine's 30+ year table matches the 5% ERF (post-2013) exactly and omits the 2008 ERF (pre-2013) entirely.

**Limitation:** The exact percentage of current DRS members who fall under the pre-2013 vs. post-2013 rule is not ascertainable from public sources; this is a user-input determination. The engine should expose a hire-date or ERF-version selector rather than assume post-2013.
