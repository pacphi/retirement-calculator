# Dedupe Format Report — usd0 / usdK extraction

## Shared module created

`src/components/format.js` — exports `usd0` and `usdK`.

## Files updated (18 total)

| File | Imports from format.js |
|---|---|
| `RetirementCalculator.jsx` | `usd0` |
| `src/components/charts/Places.jsx` | `usd0`, `usdK` |
| `src/components/charts/Staircase.jsx` | `usd0`, `usdK` |
| `src/components/charts/PortfolioFlows.jsx` | `usd0`, `usdK` |
| `src/components/charts/Compare.jsx` | `usd0`, `usdK` |
| `src/components/charts/YearByYear.jsx` | `usd0`, `usdK` |
| `src/components/charts/LongRun.jsx` | `usd0`, `usdK` |
| `src/components/charts/IncomeMix.jsx` | `usd0` |
| `src/components/results/RiskTable.jsx` | `usd0` |
| `src/components/results/Stats.jsx` | `usd0` |
| `src/components/results/Headline.jsx` | `usd0` |
| `src/components/results/Inheritance.jsx` | `usd0` |
| `src/components/steps/Advanced.jsx` | `usd0` |
| `src/components/steps/Pension.jsx` | `usd0` |
| `src/components/steps/Household.jsx` | `usd0` |
| `src/components/steps/TravelLongevity.jsx` | `usd0` |
| `src/components/steps/Timing.jsx` | `usd0` |

## Defined-but-unused formatters

No file defined `usdK` without using it. All local `usdK` definitions corresponded to
at least one call site in the same file body.

`IncomeMix.jsx` defined only `usd0` locally (not `usdK`) and uses `usd0` in the body —
no unused-formatter case here either.

## Verification results

- Tests: 192/192 passed (`pnpm test -- --run`)
- Lint: 0 errors (`pnpm lint`; 5 pre-existing warnings in unrelated audit files)
- Build: success (`pnpm build`)
