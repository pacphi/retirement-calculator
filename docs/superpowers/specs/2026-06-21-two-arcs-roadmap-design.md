# Two Arcs Roadmap — Design Spec

_Date: 2026-06-21 · Branch: `feat/two-arcs-roadmap` · Source: `docs/ideas/enhancement-plan.md`,
`enhancement-plan-v2.md`, `enhancement-plan-v3-addendum.md`_

## 1. Goal

Implement the complete three-plan roadmap that turns "Nest & Next" from a steady-state calculator
into two legible, reactive arcs — **accumulation** (working years) and **decumulation** (retirement
years) — as a sequence of **collision-free parallel waves** on top of a decomposed component
architecture, developed test-first.

This spec defines **all** waves. Execution proceeds **one wave at a time**, with a check-in before
each subsequent wave. Wave 0 (foundation) is executed first.

## 2. Decisions taken (from brainstorming)

- **Scope:** Everything in all three plans (multi-release roadmap, architected in full, executed in
  sequenced waves).
- **Uncommitted exploration:** Treated as **unproven exploration, not the golden path**. It is
  captured on this branch at commit `23a966a` (178 tests pass at that snapshot). Wave 0 runs TDD
  due-diligence against the new full-roadmap scope and decides keep / rework / scrap per feature.
- **Monolith:** Extract `RetirementCalculator.jsx` (~1294 lines) into focused components **before**
  feature work, so features land in separate files and parallelize cleanly.

## 3. Invariants (must not regress)

1. **Real-dollar consistency.** The model is in today's dollars. The _only_ sanctioned nominal flow
   is mortgage P&I, which is deflated explicitly each year and zeroed at payoff (`s.inflation`
   graduates from a display label to a real engine input — documented at the boundary).
2. **One federal tax engine.** `calculateFederalTaxYear` stays the single source for projection and
   headline. The state-tax layer **composes on top**; it never forks federal logic.
3. **Determinism.** The deterministic projection stays seedless and date-free. All randomness lives
   in `monteCarlo.js` behind the fixed seed. Auto-running MC is debounced and never leaks into the
   deterministic snapshot tests assert on.
4. **Planning-grade honesty.** Every new assumption (return presets, smile curve, guardrail bands,
   contribution limits, state tax profiles, property tax rates) gets a dated, source-linked constant
   in `retirementData.js` and an in-app caption. The "consult a specialist" framing stays.
5. **Tests + docs in lockstep.** Each engine change updates `calculatorCore.test.js`; each control
   gets an accessible-label check in `RetirementCalculator.test.jsx`; `docs/prd.md` and
   `docs/use-cases.md` are reconciled in the same change.

## 4. Architecture

### 4.1 Engine seams (the key to non-collision)

`simulate.js`'s year loop is the serialization bottleneck. It is refactored **once** (Wave 0) into an
orchestrator that composes pluggable functions, each living in its own module so features attach to a
**stable seam** instead of editing the loop repeatedly.

Seams:

- **Spending composition** — `spendingNeed()` becomes
  `nonHousingBase(smile) + housing + healthcare + lifestyleSteps + events`, each a composable
  sub-function.
- **Return model** — `yearReturn(inputs, y, buckets)` resolves preset/variability/glidepath/blend.
- **Withdrawal / buckets** — withdrawal strategy maps a gross draw to taxable income, order-dependent.
- **State-tax layer** — composes on the federal result using a typed `taxProfile`.
- **Jurisdiction selector** — picks work vs retire location/cost basis by `relocationYear`.
- **Contributions** — `plannedContribution()` returns a total and a per-bucket split.
- **Spending strategy** — fixed-need vs guardrail branch.

### 4.2 New engine modules (each a separate file → parallelizable)

| Module                          | Owns                                                                    | Plan ref        |
| ------------------------------- | ----------------------------------------------------------------------- | --------------- |
| `finance/returns.js`            | return presets, variability band, glidepath, blended-by-bucket return   | B1, B2, v2 §1.2 |
| `finance/spending/smile.js`     | age-shaped real spending multiplier                                     | C1              |
| `finance/spending/lifestyle.js` | base lifestyle level + step changes                                     | C2              |
| `finance/housing.js`            | amortization, payoff year, real-deflated P&I, property tax, tenure      | v2 §2           |
| `finance/buckets.js`            | taxable/deferred/roth balances + withdrawal ordering + surplus reinvest | D1, D2          |
| `finance/contributions.js`      | per-vehicle streams, 2026 limits, catch-ups, employer match             | A1, A2, v2 §1.1 |
| `finance/stateTax.js`           | typed `taxProfile` state layer (composes on federal)                    | v2 §3, v3       |
| `finance/guardrails.js`         | Guyton-Klinger dynamic spending                                         | E2              |
| `finance/headroom.js`           | root-find max sustainable spending delta                                | E1              |
| `finance/jurisdiction.js`       | work-vs-retire location selection by `relocationYear`                   | v3              |

`finance/breakdown.js` (month-by-month derivation) already exists from exploration; Wave 0 validates it.

### 4.3 UI component decomposition

- `components/theme.js` — `C`, `SRC`, fonts, `inputStyle`.
- `components/atoms/` — Field, NumberInput, Select, Segmented, Section, AssumptionIcon, Chevron,
  NestLogo.
- `components/steps/` — existing six steps + new StepContributions, StepHousing,
  StepSpendingStrategy, StepLocationTax.
- `components/charts/` — Staircase, YearByYear, PortfolioFlows, LongRun, Places, Compare, IncomeMix.
- `components/results/` — Headline, Stats, RiskTable, Inheritance, AccumulationSummary, HeadroomCard.
- `hooks/` — usePlan, useMonteCarlo.
- `RetirementCalculator.jsx` — thin composition root (~200 lines) wiring state + components.

New features each add **their own** step + chart/result file and wire one line into the composition
root. Theme tokens stay centralized so all new UI matches the existing brass/viridian/clay aesthetic.

## 5. Wave plan (task DAG)

### Wave 0 — Foundation (serial, single-owner; unblocks everything) ✅ COMPLETE (2026-06-22)

Ordered so we never extract components around code we might scrap:

- `0c` **TDD due-diligence first** on the three uncommitted features (location-basis spend,
  year-by-year navigator + `breakdown.js`, recurring events) → decide keep / rework / scrap against
  full-roadmap scope. Lock the verdict with characterization tests before touching structure.
- `0a` Extract `theme.js` + atoms.
- `0b` Extract charts/results/steps into components; shrink composition root (387 lines, down from ~1294).
- `0d` Define engine seams in `simulate.js` + `plan.js`.
- Gate: `pnpm lint` + `pnpm test` green (192/192); behavior unchanged (characterization tests).

Parallel waves use `git worktree` isolation (confirmed acceptable) so concurrent subagents don't
collide on shared files.

### Wave 1 — Additive features (fully parallel; disjoint files)

B1 returns/variability-by-default · B2 sequence stress toggle · C1 smile · C2 lifestyle steps ·
C3 typed/emergent events · E1 headroom · A3 accumulation summary. Each: own engine module + own
tests + own UI component. Shared touch limited to append-only constants in `retirementData.js` and
the wiring of one seam interface.

### Wave 2 — Place & housing (parallel within; depends on Wave 0 seams)

First land the shared `taxProfile` data shape (tiny sub-task), then parallelize: housing/mortgage
module · typed state tax · property tax · work-vs-retire two-location split · month-by-month
refinement (incl. housing-explicit need recomposition and inherited live-in → owned override).
_Floor policy required:_ when `housing > 0`, decide whether the 0.35 spending floor applies to total
(incl. housing) or non-housing only, then update `_floorBase` in `seams.js` `composeNeed` accordingly.

### Wave 3 — Engine depth (most invasive; short serial chain at the end)

A1/A2 multi-vehicle + limits → D1 buckets + withdrawal order → D2 surplus reinvest → v2 §1.2
glidepath → E2 guardrails. Each still in its own module; sequenced because they depend on the
three-bucket model.

### Parallelization mechanism

Within a wave, dispatch one subagent per module (engine + tests + UI component), each in its own
files, coordinated TDD (RED tests first, then GREEN). Cross-wave dependencies are the only
serialization. Use `git worktree` isolation for any wave where agents would otherwise touch the seam
file concurrently. Commit intentionally per logical unit.

## 6. Testing strategy

- Strict TDD per module: failing engine test in `calculatorCore.test.js` (or a new per-module test
  file) before implementation; UI checks via accessible labels in `RetirementCalculator.test.jsx`.
- Determinism preserved; no dates/randomness/storage/network/chart-layout dependence in tests.
- `pnpm check` (lint + typecheck + markdown lint + link check + test) is the wave gate.

## 7. Out of explicit scope / risks

- Mid-retirement relocation beyond the single work→retire switch is not modeled (the v3 split is one
  clean jurisdiction switch at `relocationYear`; transition year is simplified — captioned).
- State property/income tax are county-local approximations, captioned as planning-grade.
- Roth-conversion optimization remains a noted follow-on, not core.
