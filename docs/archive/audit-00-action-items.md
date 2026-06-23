# Audit Action Items — Aggregated & Prioritized

**Date:** 2026-06-17
**Scope:** `src/finance/*` engine, `src/retirementData.js`, `RetirementCalculator.jsx`, test suite
**Sources:** six parallel audits (links at bottom). This document deduplicates their findings and prioritizes them. Each item cites the audit(s) that raised it — **items flagged by multiple independent audits are higher-confidence.**

---

## Verdict

Three separate conclusions, all true at once:

1. **The core math is correct.** Independent hand-derivation (Sherlock) matched the engine to the cent for the snapshot household (pension $37,400; PIA $4,188.21/mo; her SS $43,557; his spousal $20,941; steady-state tax $7,499). 31/31 property-based invariants held under 200 randomized runs (tax monotonicity, SS caps, ERF bounds, MC percentile ordering, savings monotonicity).

2. **But the engine has real correctness bugs at boundaries and in the steady-state/survivor/Monte-Carlo paths** — several of which change numbers the UI actually displays.

3. **And the default configuration is materially optimistic.** The assumptions audit estimates the stacked default assumptions overstate sustainable income by **~$30k–$50k/yr** vs. a realistic median path — confirming the original "too good to be true" instinct. The headline math is right; the *inputs and framing* flatter the result.

Separately, the **test suite under-constrains the math**: mutation score is **47%** (target 80%). Tests verify shape ("returns rows") but rarely assert dollar values, so sign-flips like `bal -= wd` → `bal += wd` survive uncaught.

---

## Resolution status — ALL 23 ITEMS ADDRESSED (2026-06-17)

Every item was paired through individually (issue → options → user decision → TDD fix → commit). Suite grew to **164 tests, all green**; build clean. Mutation score **47% → 58%** after P2-1.

| ID | Status | Choice & fix | Commit(s) |
|----|--------|--------------|-----------|
| P0-1 | ✅ Fixed | Derive survivor tax-status **and** SS from the simulated row (Option B); dropped now-dead `steadyState` params | `fb02ffc`, `5ea00b4`, `71a5b77` |
| P0-2 | ✅ Fixed | Year-gate inherited rent/live-in income in `steadyState` (Option A) | `3f27a61` |
| P0-3 | ✅ Fixed | Count only the surviving (younger) spouse's pre-65 healthcare (Option A) | `db35c04` |
| P1-1 | ✅ Fixed | Default SS → statement; ssa.gov link, age-67 guidance, live claim-age readout, short-career warning, spouse proration | `870ec51` |
| P1-2 | ✅ Fixed | Kept Austria default (real plan) + US pre-65 healthcare cost-gap disclosure | `170bc46` |
| P1-3 | ✅ Fixed | Location-aware LTC scenario toggle + persistent disclaimer (Option C); cited per-location costs | `7f61228` |
| P1-4 | ✅ Fixed | Survivor pension continues at elected % (default **0% life-only**) | `d15be82` |
| P1-5 | ✅ Fixed | Reframed headline ceiling as return-dependent; surplus = buffer, not a pool | `93c0a6a` |
| P1-6 | ✅ Fixed | Caveat on deterministic headline + MC P50 shown once Monte Carlo is run | `f161261` |
| P1-7 | ✅ Fixed | Lognormal Monte Carlo returns (median compounds at realReturn; no sub-100% draws) | `8fc6fc6` |
| P2-1 | ✅ Fixed | High-leverage numeric assertions; mutation re-run **47%→58%** (SS 41%→78%, tax 70%→75%) | `83c6b23` |
| P2-2 | ✅ Fixed | `runMonteCarlo` throws on `paths <= 0` | `2e20a1e` |
| P2-3 | ✅ Fixed | Configurable plan horizon (default 95) + input clamp + `end>=0` floor | `21384fb` |
| P2-4 | ✅ Fixed | Clamp SS claim age ≥62 + floor PIA/benefits at 0 | `8098252` |
| P2-5 | ✅ Fixed | Floor age consistently in `pensionERF` (no 64.5 discontinuity) | `98653d7` |
| P2-6 | ✅ Fixed | Travel taper from midpoint for ≤10-yr plans | `63dbd5a` |
| P2-7 | ✅ Fixed | Tests for insolvent withdrawal, SS delayed-credit cap, Plan-3 vesting, returns fallback, never-retire | `9e2f64d` |
| P3-1 | ✅ Fixed | Sunset the $6k senior bonus after 2028 (thread calendar year) (Option A) | `016b09c` |
| P3-2 | ✅ Fixed | Location-aware income tax (US state + net-of-treaty foreign) + override; cited rates | `7033e64` |
| P3-3 | ✅ Documented | Stress-path limits noted; defer to Monte Carlo for the downside (Option A) | `5bca46d` |
| P3-4 | ✅ Fixed | Live-in saving credited from the year after inheritance; relocation note | `79e8f56` |
| P3-5 | ✅ Fixed | Discount future-sale proceeds to the steady year; strengthened Austria caveat | `e961213` |
| P3-6 | ✅ Fixed + verified | DRC-cap comment, `erf:null` when pension off, ERF comment, cached depletion tax; **verified DRS Plan 2/3 against drs.wa.gov** — 10/11 match, documented the 30+yr-ERF-by-hire-date limitation | `5febb31` |

**New research added to the repo:** `ltc-research.md` (long-term-care costs by location), `tax-research.md` (state + foreign treaty/FTC rates), `drs-verification.md` (DRS Plan 2/3 confirmation). Their cited figures are folded into `docs/sources.md` §17 (LTC) and §18 (income tax).

**Deferred by choice (not regressions):** the full mutation set (Option B for P2-1) — `simulate.js`/`plan.js` survivors remain; and the 30+yr pre-2013 DRS ERF table (documented, doesn't affect a <30-yr member).

---

## Priority master list

Severity key: **P0** = wrong numbers in plausible configs, fix before trusting output · **P1** = honesty/default that misleads users · **P2** = robustness/edge crash + test hardening · **P3** = docs/cosmetic.

| ID | Pri | Theme | File:line | Fix | Raised by |
|----|-----|-------|-----------|-----|-----------|
| **P0-1** | P0 | `steadyState` uses **married** tax even after survivor transition (~$1,200/yr understated) | `simulate.js:179-198` | Resolve `yearStatus` for the steady row (`row.cal >= survivor.year && survivor.on`) and pass to both `calculateFederalTaxYear` calls, mirroring the `simulate` loop | Correctness (C-1) |
| **P0-2** | P0 | `steadyState` counts **future-dated** inherited rent/live-in income with no year gate → inflates headline | `simulate.js:162-167` | Add `&& p.year <= row.cal` to the `rent` and `live` loops (mirror the guard in `simulate`) | Correctness (C-2) |
| **P0-3** | P0 | Deceased spouse's pre-65 healthcare still added to `need` after survivor death | `simulate.js:62-68` | Pass `isSurvivor` into `spendingNeed`; zero the dead spouse's contribution to `under65` | Correctness (I-1) |
| **P1-1** | P1 | SS **income-estimate overstates** benefit for sub-35-yr careers (~$9.6k–$10.8k/yr for the 22-yr teacher); default SS mode is `estimate`, violating the "prefer statement" rule | `socialSecurity.js:3-8`, `RetirementCalculator.jsx:84,90` | Default `ssModeA/B` to `"statement"`; warn when estimate mode is used; optionally add a "career years" factor `min(yrs,35)/35` | Assumptions (C1), Sherlock (A1) |
| **P1-2** | P1 | Healthcare **defaults to Austria** (~5× cheaper than US pre-65; ~$23k/yr gap) → lowest-cost result by default | `RetirementCalculator.jsx` default `retireLoc`, `plan.js:48-56` | Default `retireLoc` to a US basis (or force explicit choice); persistent warning + surface the HC line | Assumptions (CRIT-5) |
| **P1-3** | P1 | **No long-term care** modeled at all (~70% need it; $50k–$120k/yr) | engine-wide omission | Add an LTC scenario toggle (default $72k/yr × 3yr from age 80) **or** a persistent headline disclaimer | Assumptions (CRIT-12) |
| **P1-4** | P1 | **Pension assumed to continue at 100%** through survivor transition (many elect life-only → $0, or 50% J&S) | `simulate.js:99-106` | Add `pensionSurvivorPct` (0/50/100%, default 50%); apply at survivor year | Assumptions (H3) |
| **P1-5** | P1 | "Could spend up to" still implies a stable ceiling; surplus reads as an accessible pool | `RetirementCalculator.jsx` headline, `simulate.js:200-216` | Reword: capacity is "in addition to guaranteed income, assuming base returns"; surplus is "a buffer for low returns / LTC, not a separate spending pool" | Assumptions (H4) |
| **P1-6** | P1 | Headline/tier sourced from the **deterministic 5%-real run** (never a down year), not the MC median | `plan.js`, `RetirementCalculator.jsx` | Source the headline + tier from Monte Carlo P50, or add a clear "best-case-within-average" disclaimer on the deterministic chart | Assumptions (H1) |
| **P1-7** | P1 | Monte Carlo overstates compound growth ~0.7%/yr (arithmetic vs geometric mean) and allows returns < −100% | `monteCarlo.js:24` | Pass mean `realReturn − volatility²/2`; cap draws at −90% (or sample lognormal) | Assumptions (H2), Sherlock-adjacent |
| **P2-1** | P2 | **Suite under-constrains the math (47% mutation score)** — sign-flips/`*12↔/12`/bracket-boundary mutants survive | `simulate.js`, `tax.js`, `socialSecurity.js`, `pension.js` | Add **numeric** assertions: one `simulate` integration test asserting `income === wages+pension+rent+ss` and concrete `wd/pension/need` values kills ~dozens; add boundary tests per mutation A1–A7, B1–B6, C1–C3, D1–D10, E1–E2 | Mutation (34 items), Coverage |
| **P2-2** | P2 | `monteCarlo` **`paths=0` → NaN** everywhere (div-by-zero, `quantile([])`) | `monteCarlo.js:46-59` | Guard `if (paths <= 0) throw RangeError` (or safe sentinel) | Correctness (I-4), Coverage (#9/E3), Property (minor) |
| **P2-3** | P2 | Both ages > 95 → empty `rows` → `steadyState` crashes on `undefined` last row | `simulate.js:74` | Early-return safe empty result when `end < 0`; null-check in `steadyState` | Correctness (I-6) |
| **P2-4** | P2 | SS benefit has **no floor at claim age 62**; negative PIA for very young claim/negative income | `socialSecurity.js:3-8,10-33` | Floor `claimAge` at 62 (own + spousal); `Math.max(0, …)`; floor `aime` at 0 | Correctness (C-3, I-2, M-4) |
| **P2-5** | P2 | `pensionERF` `Math.round` discontinuity: age 64.5 → full benefit (guard uses raw age, lookup uses rounded) | `pension.js:3-10` | Use `Math.floor` consistently, or round in the `>=65` guard too | Correctness (I-3) |
| **P2-6** | P2 | Travel **taper never fires when `years ≤ 10`** (silent dead toggle) | `events.js:1-9` | Decouple taper pivot from constant 10 (e.g. `floor(years/2)`), or document the `years>10` assumption | Correctness (I-5) |
| **P2-7** | P2 | Uncovered high-risk branches: `solveWithdrawal` insolvent fast-path; SS delayed credit >67 + 36-mo cap; Plan-3 vesting note; `returns[]` guard; `fullyRetAge` fallback | `simulate.js:53,117,146`, `socialSecurity.js:18-20`, `pension.js:17-19` | Add the targeted tests in Coverage #1–5 | Coverage |
| **P3-1** | P3 | Senior bonus applied past its **2028 sunset** (~$1.2k–$2k/yr understated tax from 2029) | `tax.js`, `retirementData.js` | Terminate senior bonus after 2028 unless renewed; document law assumption | Assumptions (M1) |
| **P3-2** | P3 | **No state income tax** for US scenarios (up to $4k–$15k/yr drag) | `tax.js` | Add a flat effective-state-rate input or a sensitivity tile | Assumptions (M2) |
| **P3-3** | P3 | Stress path milder than 2008 actual; only models early-retirement crash, not mid-retirement | `retirementData.js:13`, `simulate.js:7-11` | Offer a steeper alt scenario; document the limitation | Assumptions (M3), Correctness (M-3) |
| **P3-4** | P3 | Live-in saving applied immediately at inheritance year (no transition/relocation cost) | `simulate.js:62-68` | Apply from year+1; note relocation costs omitted | Assumptions (M4) |
| **P3-5** | P3 | Austria 10% sell-net haircut likely light for high-gain property; `sellAfter` not time-discounted | `retirementData.js:79-84`, `simulate.js:163-168` | Strengthen the caveat / expose an adjustable haircut; note FV timing | Assumptions (L1), Sherlock (A3) |
| **P3-6** | P3 | Docs/cosmetic: age-70 DRC cap undocumented; `erf=1` sentinel when pension off; "Plan 2 examples" comment; redundant `taxForYear` call on depletion path | `socialSecurity.js`, `simulate.js:22,53`, `retirementData.js:29` | Comments / minor cleanup | Property, Correctness (M-2,M-5), Sherlock (A2) |

---

## What to fix first (recommended sequence)

1. **P0-1, P0-2, P0-3** — three genuine bugs in `steadyState`/`simulate` that change displayed numbers in plausible configs (survivor on; future-dated inheritance). Small, surgical, high-confidence (Correctness audit, corroborated by the design intent in the plan). **Do these first.**
2. **P2-1** — add numeric assertions to the simulation tests. This is the single highest-leverage quality fix: it both raises the 47% mutation score sharply *and* would have caught P0-class sign errors. Pairs naturally with fixing P0 (write the asserting test, watch it catch the bug).
3. **P1-1, P1-2** — the two CRITICAL default-flattering assumptions (SS estimate for short career; Austria healthcare default). These are why the report looks too good. Mostly default-value + warning changes.
4. **P2-2 … P2-7** — robustness guards + targeted coverage tests (cheap, prevent crashes/silent errors).
5. **P1-3 … P1-7**, then **P3-***  — larger modeling features (LTC, pension survivor %, MC geometric mean, state tax) and docs.

## Confidence cross-check (which findings ≥2 audits agree on)
- SS overstated / wrong default mode → **Assumptions + Sherlock**
- MC `paths=0` NaN → **Correctness + Coverage + Property**
- Weak numeric assertions in simulation → **Mutation + Coverage**
- Stress-path mildness → **Assumptions + Correctness**

## Note on test-suite health
- Mutation score **47%** (events.js 97.8% good; simulate.js 38%, socialSecurity.js 41% weak). Property invariants pass but are coarse — they don't pin exact dollar values, which is why mutants survive. **Both point to the same fix (P2-1): assert concrete numbers.**
- Coverage: lines **89.5%**, finance-module branches **~82%** (the headline 52.5% branch figure is a v8 sandbox artifact).

---

## Individual audit reports
- [01 — Property-based invariants](audit-01-property-based.md) — 31/31 pass; 2 minor
- [02 — Mutation testing](audit-02-mutation.md) — 47% score; 34 important / 5 minor
- [03 — Sherlock correctness](audit-03-sherlock-correctness.md) — math matches to the cent; 1 medium, 3 low/info
- [04 — Assumption soundness](audit-04-assumptions.md) — 15 reviewed, 12 optimistic/misleading; 3 critical
- [05 — Coverage](audit-05-coverage.md) — 13 risk-ranked gaps; 5 important
- [06 — Correctness & boundary risk](audit-06-correctness-review.md) — 15 findings; 3 critical, 6 important

*Audit tooling (`@vitest/coverage-v8`, `fast-check`, Stryker) and scratch test files under `audits/` are uncommitted working-tree changes; revert or keep at your discretion.*
