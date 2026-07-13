# retirement-calculator

## What this is

"Nest & Next" is a React retirement planning tool for a U.S. household. Tagline: "This is about your money, your home, and what comes next." It projects annual cash flow to age 95, including Social Security, a Washington DRS pension, portfolio withdrawals, healthcare before and after 65, inherited real estate, federal tax, and location-based cost of living.

The app is still planning-grade, not advice-grade. Keep the in-app disclaimer and source links visible.

## Current structure

- `RetirementCalculator.jsx` - React UI and chart/table rendering.
- `src/components/theme.js` - the only source of UI color. Light and dark palettes live as CSS variables (`THEME_CSS`); every exported color is a `var(--…)` reference, so never concatenate hex alpha onto them — use the `tint()` helper instead. The header toggle stamps `data-theme` on `<html>`; the default follows `prefers-color-scheme`, and print always forces light. Categorical series colors are entity-fixed (salary blue, pension aqua, Social Security yellow/green, portfolio withdrawal violet, rental orange) and validated for colorblind separation in both modes.
- `src/retirementData.js` - source-linked 2026 constants and planning assumptions.
- `src/calculatorCore.js` - pure calculation engine.
- `src/investmentData.js` - curated, source-cited investment fund dataset (no runtime network calls); refresh process in `docs/investment-data-refresh.md`.
- `src/investmentAdvisor.js` - pure fund-recommendation logic (phase derivation, allocation, per-account split).
- `src/calculatorCore.test.js` - deterministic formula and simulation tests.
- `RetirementCalculator.test.jsx` - user-facing UI checks with React Testing Library.
- `docs/` - product, logic, source, and audit documentation.

## Calculation rules

- Use one federal tax engine for both annual depletion and headline income.
- Treat spending needs as after-tax spending.
- Spending need defaults to income × targetPct (+ pre-65 healthcare bump). An opt-in "location" basis instead derives it from the selected location's cost-of-living basket × lifestyle %, with healthcare applied by age and a single/survivor scale (`SINGLE_COST_FACTOR`). One location applies for the whole horizon — relocation is not modeled.
- Apply age-65 deductions only to filers who are actually 65+ in the modeled year.
- Prefer SSA statement inputs for Social Security. The income-based PIA estimate is only a fallback.
- Spousal Social Security benefits cap at 50% of the worker PIA at FRA and do not receive delayed retirement credits.
- Use current WA DRS early-retirement factors and service-year eligibility guards.
- A DRS survivor election is never free: electing a survivor percentage applies the published TRS 2/3 joint-and-survivor factor (member−beneficiary age difference, `DRS_SURVIVOR_FACTORS`) to the benefit from day one; the survivor receives the elected share of the reduced benefit; the benefit pops back to single life if the beneficiary dies first; and a vested member's pre-retirement death pays the RCW 41.32.895 survivor annuity regardless of the election.
- Keep rental income separate from guaranteed lifetime benefits.
- Monthly views are an honest per-month rate (the year's annual figure ÷ 12); the engine has no intra-year timing, so genuinely one-time items (home sale, first RMD, age-65, survivor) are flagged as year milestones, not placed in a month. Derivation lives in `src/finance/breakdown.js` and is unit-tested; chart layout is not.
- Investment recommendations derive phase from existing ages, not a separate input: `accumulation` while both spouses are below their stop-working age, `decumulation` once both are at/above it, `both` (shown side-by-side) during the retirement-transition year one spouse crosses before the other. Each risk tier × phase maps to a target equity/bond split (`ALLOCATION_SPLIT` in `src/investmentData.js`); some funds are phase-specific (e.g. growth/tech funds are accumulation-only), so the fund list itself changes between phases, not just the weights. Accredited-only funds (`accreditedOnly: true`) are filtered in exactly one place, `recommendFunds()` in `src/investmentAdvisor.js`, and never render unless the user checks the accreditation box on the Investments step.

## Test strategy

The test suite follows the current Vitest and Testing Library guidance:

- Pure financial logic is tested directly in `src/calculatorCore.test.js`.
- UI behavior is tested through accessible labels, links, and buttons, not component internals.
- Tests should remain deterministic: no dates, randomness, storage, live network calls, or dependency on chart layout.

Run:

```bash
pnpm test
```

## Maintenance

When changing formulas, update the matching tests and docs. When updating annual constants, cite the source in `src/retirementData.js` and `docs/sources.md`.
