# Investment Recommendations — Design

## Purpose

Add an optional wizard step and report section that recommends investment
funds tailored to a couple's risk tolerance and where they are in their
work/retirement timeline (accumulation vs. decumulation). Recommendations
are drawn from a static, curated, source-cited fund dataset — consistent
with the rest of the app's planning-grade (not advice-grade) approach.

## Non-goals

- No live market-data fetching. This app is client-side only, has no
  backend/proxy, and has never made a network call; live fetching would
  introduce CORS, API-key exposure, and new runtime failure modes that
  don't fit the existing static-data architecture.
- No personalized/fiduciary financial advice. This is factual, source-cited
  educational content with strong disclaimers, matching the rest of the app.
- No true portfolio optimization — allocation is a simple rule table
  (risk tier × phase → target equity/bond split), not a solver.

## Architecture

Follows existing app patterns exactly:

- **`src/investmentData.js`** (new) — curated fund dataset + defaults,
  parallel to `retirementData.js`. Source-cited constants only.
- **`src/investmentAdvisor.js`** (new) — pure calculation module, parallel
  to `calculatorCore.js`. Given `{ riskTolerance, accounts, phase }`,
  returns target allocation + per-account fund assignments. No React,
  fully unit-testable in isolation.
- **`src/components/steps/Investments.jsx`** (new) — wizard step: risk
  tolerance selector, accredited-investor self-attestation checkbox,
  and an editable list of investment accounts.
- **`src/components/results/InvestmentRecommendations.jsx`** (new) —
  report section: renders allocation tables and per-account breakdowns
  produced by `investmentAdvisor.js`.
- Registered in `src/nav/stepRegistry.jsx` (new step `investments`, after
  `advanced`) and `src/nav/reportRegistry.jsx` (new section
  `investmentRecommendations`, after `portfolio`).

## Data model (plan state additions)

Added to `DEFAULT_PLAN` in `src/defaultPlan.js`:

```js
riskTolerance: 'moderate',        // 'conservative' | 'moderate' | 'aggressive'
accreditedInvestor: false,        // self-attestation; unlocks aggressive-tier
                                   // private-market entries when true
investmentAccounts: []            // array of account records, see below
```

Account record shape (array-of-records, same pattern as `properties` /
`events` — incrementing `useRef` id sequence, `addAccount` / `removeAccount`
/ `setAccount` helpers in `RetirementCalculator.jsx`):

```js
{
  id: 1,
  name: 'Fidelity 401(k)',
  type: '401k',   // '401k' | '403b' | 'traditional_ira' | 'roth_ira'
                   // | 'taxable' | 'hsa'
  balance: 50000,
}
```

## Curated fund dataset (`src/investmentData.js`)

```js
{
  id: 'vanguard-voo',
  name: 'Vanguard S&P 500 ETF',
  ticker: 'VOO',
  provider: 'Vanguard',
  vehicle: 'ETF',
  category: 'US Total Market Index',
  annualizedReturn: 0.137,   // 5-yr, as of research date
  returnBasis: '5-yr annualized, as of 2026 research',
  expenseRatio: 0.0003,
  riskTiers: ['conservative', 'moderate', 'aggressive'],
  phases: ['accumulation', 'decumulation'],
  citation: '...',
  signupUrl: 'https://investor.vanguard.com/...',
}
```

`riskTiers` and `phases` are arrays so one fund can serve multiple
tiers/phases (a total-market index fits everywhere; a growth/tech fund
fits moderate+aggressive/accumulation only; a bond/income fund fits
decumulation-leaning tiers). Aggressive-tier private-market entries
(interval funds, BDCs, etc.) are filtered out entirely unless
`accreditedInvestor === true`, and always render with an explicit
illiquidity/accreditation-requirement disclaimer.

### Maintainer refresh workflow

Static data goes stale. Document a repeatable process in
`docs/investment-data-refresh.md`:

1. A reusable research prompt template (risk-tier criteria, phase
   criteria, required output shape matching the schema above) to hand to
   a research agent/skill.
2. Run the candidate output through the `brutal-honesty-review` skill
   (or an agentic-qe validation pass) before merging — skeptically check
   return claims, minimums, accreditation requirements, and links.
3. Update `investmentData.js` and cite sources the same way
   `retirementData.js` does today (`docs/sources.md`).

This is a documented maintainer process, not runtime code — no fetch
calls ship in the app.

## Phase detection

Derived automatically from existing plan fields (current age, retirement
age — already collected in the `timing` step), not a new input:

- **`accumulation`** — not yet retired.
- **`decumulation`** — retired.
- **Both, shown side-by-side** — during the retirement-transition year.

## Allocation logic (`investmentAdvisor.js`)

A small rule table maps `{ riskTolerance × phase }` → target equity/bond
split, e.g.:

| Risk × Phase | Equity | Bond/Income |
|---|---|---|
| Conservative / Accumulation | 60% | 40% |
| Conservative / Decumulation | 40% | 60% |
| Moderate / Accumulation | 75% | 25% |
| Moderate / Decumulation | 55% | 45% |
| Aggressive / Accumulation | 85% | 15% (+ optional private-markets slice if accredited) |
| Aggressive / Decumulation | 65% | 35% |

Each side of the split is filled with curated funds matching the
tier/phase tags. Each `investmentAccounts` entry receives a
balance-weighted dollar allocation across the recommended funds, plus a
tax-efficiency note derived from `type` (e.g., "consider holding
bond/income funds in tax-advantaged accounts rather than taxable").

Edge cases: zero accounts (show allocation guidance without a per-account
table), zero/negative balance (exclude from weighting, flag in UI),
aggressive tier without accreditation (silently drops private-market
entries, no error).

## Report content

Per phase block: allocation table (fund, ticker, provider, vehicle,
target %, citation, "Get started" link), then a per-account breakdown
table. A dedicated disclaimer banner ("planning-grade, not advice-grade,
not a fiduciary recommendation, past performance ≠ future results") plus
the accreditation-gate warning where the aggressive tier applies.

## Testing

- `src/investmentAdvisor.test.js` — pure logic: allocation math for each
  risk×phase combination, balance-weighting, accreditation gating, edge
  cases (zero accounts, zero/negative balance).
- `src/components/steps/Investments.test.jsx` and
  `src/components/results/InvestmentRecommendations.test.jsx` — RTL,
  following the `Household.test.js` / `BridgeSummary.test.jsx`
  convention: build real plan data via `calculatePlan(makeDefaultPlan())`,
  assert on rendered text/links via `screen.getByText`, no chart-layout
  assertions.
- `src/defaultPlan.test.js` — update golden snapshot for the new default
  fields (`riskTolerance`, `accreditedInvestor`, `investmentAccounts`).
