# Nest & Next vs. {Provider} {Calculator Name}

A comparison of this calculator's logic against [{Provider}'s {calculator name}]({url}),
with a prioritized list of what we could borrow.

## Bottom line

State, in 3-5 lines or bullets, what kind of tool each is and where the real wins
are. Be concrete about the asymmetry — e.g. they are stronger at X, we are
stronger at Y, so the highest-value moves for us are Z. Verify the framing holds
for this competitor instead of pasting the NerdWallet conclusion.

## What each calculator computes

| Dimension | Nest & Next (this app) | {Provider} |
|---|---|---|
| Core question | {decumulation cash-flow to 95} | {accumulation / on-track} |
| Method | {sim + Monte Carlo} | {…} |
| Tax | {full federal engine} | {…} |
| Social Security | {PIA, claim factors, spousal/survivor} | {…} |
| Pension | {WA DRS Plan 2/3} | {…} |
| Spending | {location line-item budgets} | {…} |
| Returns & inflation | {real return + stress + MC} | {…} |
| Household | {two-spouse, mortality} | {…} |
| Geography | {13 locations} | {…} |
| Real estate | {inherited home sell/rent/live} | {…} |
| Outputs | {tables, fan chart, success prob} | {…} |

### {Provider} default assumptions (for reference)

Include only the values the source actually discloses. Mark anything undisclosed.

| Assumption | Default |
|---|---|
| Retirement age | {…} |
| Life expectancy | {…} |
| Pre-retirement return | {…} |
| Post-retirement return | {…} |
| Inflation | {…} |
| Salary growth | {…} |
| Retirement budget | {…} |
| Recommended contributions | {…} |

## What {Provider} has that we don't

Numbered, concrete items worth learning from.

1. {…}
2. {…}

## What we have that {Provider} doesn't (our edge — keep and lean in)

- {…}
- {…}

## What we could add, by effort

### High value, low effort

1. {Tie to existing code where possible, e.g. "surface `successProb`."}

### Medium effort

1. {…}

### Worth noting — do not copy

- {Where their simplicity sacrifices rigor we should keep.}

## Source references

- Calculation engine: `src/finance/` (`simulate.js`, `plan.js`, `tax.js`,
  `socialSecurity.js`, `pension.js`, `events.js`, `monteCarlo.js`)
- Constants and assumptions: `src/retirementData.js`
- {Provider} calculator: <{url}>
- {Provider} methodology / assumptions page: <{methodology url, if any}>
