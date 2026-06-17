# retirement-calculator

## What this is

"Nest & Next" is a React retirement planning tool for a U.S. household. Tagline: "This is about your money, your home, and what comes next." It projects annual cash flow to age 95, including Social Security, a Washington DRS pension, portfolio withdrawals, healthcare before and after 65, inherited real estate, federal tax, and location-based cost of living.

The app is still planning-grade, not advice-grade. Keep the in-app disclaimer and source links visible.

## Current structure

- `RetirementCalculator.jsx` - React UI and chart/table rendering.
- `src/retirementData.js` - source-linked 2026 constants and planning assumptions.
- `src/calculatorCore.js` - pure calculation engine.
- `src/calculatorCore.test.js` - deterministic formula and simulation tests.
- `RetirementCalculator.test.jsx` - user-facing UI checks with React Testing Library.
- `docs/` - product, logic, source, and audit documentation.

## Calculation rules

- Use one federal tax engine for both annual depletion and headline income.
- Treat spending needs as after-tax spending.
- Apply age-65 deductions only to filers who are actually 65+ in the modeled year.
- Prefer SSA statement inputs for Social Security. The income-based PIA estimate is only a fallback.
- Spousal Social Security benefits cap at 50% of the worker PIA at FRA and do not receive delayed retirement credits.
- Use current WA DRS early-retirement factors and service-year eligibility guards.
- Keep rental income separate from guaranteed lifetime benefits.

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
