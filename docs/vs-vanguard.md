# Nest & Next vs. Vanguard Retirement Income Calculator

A comparison of this calculator's logic against [Vanguard's Retirement Income
Calculator](https://investor.vanguard.com/tools-calculators/retirement-income-calculator),
with a prioritized list of what we could borrow.

## Bottom line

The two tools sit at opposite ends of the rigor/simplicity spectrum.

- **Vanguard** is a fast, deterministic *gut-check*: project a nest egg, apply the
  **4% rule** (spend ~4% of the initial balance per year), inflate at a flat 3%,
  and compare "what you'll have" vs. "what you'll need" in *today's pre-tax
  dollars*. One projection, no probabilities, no tax.
- **Nest & Next** is a year-by-year *after-tax cash-flow simulator* with a full
  federal tax engine, Social Security and WA DRS pension mechanics, geography, and
  Monte Carlo success probability to age 95.

Notably, Vanguard's public tool is **less sophisticated than NerdWallet's** in one
respect — it's a static 4%-rule snapshot rather than a balance-depletion
projection — yet **stronger in framing**: it speaks in clear "monthly income you'll
have vs. need" terms. (Vanguard *does* offer Monte Carlo modeling in other
products, but not in this calculator.) Our wins are the same shape as before:
**borrow the plain-spoken framing, not the math.**

## What each calculator computes

| Dimension | Nest & Next (this app) | Vanguard |
| --- | --- | --- |
| Core question | "Will after-tax cash flow cover spending every year to 95?" | "Will my projected income roughly meet my income goal?" |
| Method | Year-by-year deterministic sim + Monte Carlo (1000 paths, seeded) | Single deterministic projection |
| Sustainable spending | Configurable safe-withdrawal rate (`i.swr`) **plus** full annual depletion sim | Fixed **4% rule** on the initial nest egg |
| Tax | Full federal engine: brackets, std deduction, senior add-ons, OBBBA $6k bonus, provisional-income SS taxation, state/foreign rate | None — results in **pre-tax** dollars |
| Social Security | PIA from bend points or statement; claim-age factors; spousal cap; survivor step-up; trust-fund haircut scenarios | Estimated from earnings history; claim age 62+ |
| Pension | WA DRS Plan 2/3 with early-retirement factors and survivor annuity | Generic pension, assumed to grow with inflation |
| Spending | Location-specific line-item budgets (13 locations), pre/post-65 healthcare, LTC, travel taper, life events | Income-replacement % of projected final income |
| Returns & inflation | Real return + stress sequence + Monte Carlo volatility | Flat return assumption; 3% inflation; results in today's dollars |
| Household | Two-spouse, dual mortality, survivor transition to single filing | Single income-replacement framing |
| Geography | Cost of living, healthcare, VAT, treaty tax, visa thresholds across 13 locations | US-generic |
| Real estate | Inherited home with sell / rent / live strategies and step-up basis notes | Absent |
| Outputs | Tables, balance fan chart, MC success probability, depletion age | Monthly income you'll have vs. need (today's pre-tax dollars) |

### Vanguard default assumptions (disclosed)

| Assumption | Default |
| --- | --- |
| Inflation | 3% annually |
| Withdrawal rule | ~4% of initial nest egg per year |
| Analysis type | Deterministic (single projection, not probabilistic) |
| Income need | Current income inflated at 3%, × chosen replacement %, shown in today's dollars |
| Pension growth | Grows with inflation until retirement |
| Social Security | Based on earnings history; claim age 62+ |
| Rate of return | Not clearly disclosed on the page |
| Life expectancy | Not disclosed (4% rule sidesteps an explicit horizon) |
| Salary growth | Not disclosed |
| Tax treatment | Not modeled; advises consulting a tax advisor |
| Output framing | "Today's pre-tax dollars," monthly |

## What Vanguard has that we don't

1. **A crisp income-vs-need headline.** "You'll have $X/mo, you need $Y/mo" in
   today's dollars is instantly legible. We compute the equivalents (`net`,
   `targetNeed`, `surplus` in `steadyState`) but don't lead with one such line.
2. **Today's-dollars framing for the lay user.** Vanguard converts everything back
   to present-value monthly dollars. We work in real terms internally (correct)
   but never surface a single "in today's money" income figure as the headline.
3. **The 4% rule as an approachable mental model.** It's cruder than our depletion
   sim, but users *understand* it. We already have a configurable SWR (`i.swr` in
   `steadyState`) — we could expose it as an optional "simple 4% view" toggle.
4. **Radically short onboarding.** A handful of inputs to a result. Our input
   surface is large.

## What we have that Vanguard doesn't (our edge — keep and lean in)

- **After-tax truth.** A unified federal (+ state/foreign) tax engine drives both
  the annual depletion and the headline income. Vanguard's pre-tax numbers
  overstate spendable income — often materially.
- **Sequence-of-returns risk.** Monte Carlo `successProb`, a balance fan, and a
  depletion-age distribution. The 4% rule hides this risk entirely.
- **Real Social Security and pension mechanics** — claim-age timing, spousal caps,
  survivor step-up, DRS early-retirement factors — vs. Vanguard's inflation-grown
  approximations.
- **Geography as a first-class variable** — cost of living, healthcare, and tax
  across 13 locations.
- **Inherited real estate** with sell / rent / live strategies.
- **Survivor mechanics** — filing-status switch, SS step-up, pension survivor
  annuity.

## What we could add, by effort

### High value, low effort

1. **A "today's-dollars monthly income vs. need" headline.** Mirror Vanguard's one
   legible line. We already compute `net` and `targetNeed` per `steadyState` —
   divide by 12 and present "You'll have $X/mo, you need $Y/mo." Highest-impact,
   lowest-risk.
2. **A "simple 4% view" toggle.** Surface the existing `i.swr` path as an optional
   plain-English readout ("At a 4% withdrawal rate, your nest egg supports
   ~$Z/yr") for users who want the familiar rule of thumb before the full sim.
3. **Lead with Monte Carlo success probability.** `successProb` already exists;
   make it the headline score the way Vanguard makes income-vs-need the headline.

### Medium effort

1. **Optional nominal (today's-dollars) display.** Keep real-terms math internally,
   but let users flip headline figures into present-value dollars, since that's the
   framing Vanguard trained them to expect.
2. **A replacement-rate quick mode.** Let users start from "I want X% of my income"
   as a shortcut that pre-fills our richer spending model, then reveal the
   location/line-item budget underneath.
3. **Progressive disclosure / simple mode.** A minimal entry path (age, savings,
   income, target) that defaults the rest, with advanced panels collapsed.

### Worth noting — do not copy

- **Pre-tax results.** Vanguard's omission of taxes is its biggest weakness; our
  after-tax engine is a differentiator. Never report pre-tax spendable income.
- **The bare 4% rule as the engine.** Fine as an *optional view*, but it ignores
  sequence risk, taxes, and a real horizon. Keep our depletion sim + Monte Carlo
  as the source of truth.

## Source references

- Calculation engine: `src/finance/` (`simulate.js`, `plan.js`, `tax.js`,
  `socialSecurity.js`, `pension.js`, `events.js`, `monteCarlo.js`)
- Constants and assumptions: `src/retirementData.js`
- Vanguard calculator: <https://investor.vanguard.com/tools-calculators/retirement-income-calculator>
