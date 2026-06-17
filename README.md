# Nest & Next

**This is about your money, your home, and what comes next.**

An interactive retirement planning tool for checking whether a household plan works year by year, and how that income compares across several places to live.

It models:

- annual income and spending from today to age 95
- Social Security for two people, including spousal benefits and funding-cut scenarios
- a Washington DRS pension
- federal income tax using 2026 rules
- portfolio growth, contributions, and tax-aware withdrawals
- healthcare costs before and after age 65
- inherited real estate choices: sell, rent, or live in
- cost-of-living comparisons across 14 locations

This is a planning tool, not financial, tax, or legal advice. The UI includes links to the main public sources behind the formulas.

## Run Locally

```bash
pnpm install
pnpm dev
```

## Test

```bash
pnpm test
```

The calculation tests cover the high-risk logic: federal tax, senior deductions, Social Security spousal rules, Washington DRS early-retirement factors, Social Security cuts by year, and tax-aware depletion.

## Project Layout

- `RetirementCalculator.jsx` - React UI
- `src/calculatorCore.js` - calculation engine
- `src/retirementData.js` - constants, source links, location and property assumptions
- `src/calculatorCore.test.js` - formula and simulation tests
- `RetirementCalculator.test.jsx` - UI/source-link/accessibility tests
- `docs/` - product, logic, sources, and audit notes

## License

MIT © 2026 Chris Phillipson. See [LICENSE](LICENSE).
