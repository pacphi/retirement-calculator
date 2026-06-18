# Nest & Next vs. NerdWallet Retirement Calculator

A comparison of this calculator's logic against [NerdWallet's retirement
calculator](https://www.nerdwallet.com/investing/calculators/retirement-calculator),
with a prioritized list of what we could borrow.

## Bottom line

The two tools solve **different problems**.

- **NerdWallet** is a single-knob *accumulation* tool — "are you saving enough to
  be on track?" — for a generic American saver. It is excellent at onboarding,
  framing, and delivering the one number a normal user wants.
- **Nest & Next** is a year-by-year *decumulation* cash-flow simulator for one
  specific household, modeling federal tax, a WA DRS pension, Social Security,
  inherited real estate, and geography to age 95. The engine is far more
  sophisticated.

The biggest wins for us are **borrowable UX and framing, not borrowable math.**
We should add a simple *surface* over our rigorous *engine* — not trade rigor for
NerdWallet's convenient-but-crude assumptions.

## What each calculator computes

| Dimension | Nest & Next (this app) | NerdWallet |
| --- | --- | --- |
| **Core question** | "Can this household's cash flow cover spending every year to 95, and what's the sustainable income?" | "Will your savings last, and is there a gap?" |
| **Method** | Year-by-year deterministic simulation + Monte Carlo (1000 paths, lognormal returns, seeded) | Two-number projection: "what you'll have" vs "what you'll need" |
| **Tax** | Full federal engine: brackets, standard deduction, senior add-ons, OBBBA $6k bonus with phase-out & 2028 sunset, provisional-income SS taxation, state/foreign rate | None visible (pre-tax framing) |
| **Social Security** | PIA from bend points OR statement input; early/delayed claim factors; spousal cap at 50% of worker PIA; survivor step-up; trust-fund haircut scenarios | Lumped into "other income" |
| **Pension** | WA DRS Plan 2/3 with early-retirement factors, service-year eligibility guards, survivor annuity | Lumped into "other income" |
| **Spending** | Location-specific line-item budgets (13 locations), pre/post-65 healthcare split, LTC episode, travel go-go/slow-go taper, one-time life events | Single "monthly budget" (default 70% of final income) |
| **Returns** | Single real return + stress sequence + Monte Carlo volatility | 6% pre-retirement / 5% post-retirement, 3% inflation, 2% salary growth |
| **Household** | Two-spouse, dual mortality, survivor transitions | Single saver |
| **Time framing** | Real (inflation-adjusted) terms throughout | Nominal, with explicit inflation knob |

### NerdWallet default assumptions (for reference)

| Assumption | Default |
| --- | --- |
| Retirement age | 67 |
| Life expectancy | 95 |
| Pre-retirement return | 6% |
| Post-retirement return | 5% |
| Inflation | 3% |
| Salary growth | 2%/yr |
| Retirement budget | 70% of projected final income |
| Recommended contributions | 10–15% of pre-tax income |

## What NerdWallet has that we don't

1. **A single headline number + verdict.** "You'll have $X, you need $Y, you're
   $Z short." We produce rich tables and fan charts but no single gut-punch
   sentence. This is the #1 thing lay users want.
2. **Accumulation modeling.** NerdWallet projects the *saving years* —
   contributions, employer match, salary growth. Our engine is weak on "the years
   before retirement" (we have `contrib` but no income growth or match).
3. **Contribution-rate guidance.** Recommends 10–15% of pre-tax and shows the gap
   closing as you slide the contribution — an actionable "save $N more/month."
4. **Visible inflation framing.** They expose inflation (3%) and salary growth
   explicitly. We work in real returns (cleaner math) but that is invisible and
   can confuse a lay user — there's no inflation knob to reason about.
5. **Progressive disclosure.** Basic inputs up front; retirement age / life
   expectancy tucked into "Advanced Details." We surface a lot at once.
6. **Percent-based inputs.** Contributions and budget can be entered as a % of
   income, not only as dollars.

## What we have that NerdWallet doesn't (our edge — keep and lean in)

- **One unified tax engine** for both annual depletion and headline income.
  NerdWallet ignores tax entirely.
- **Sequence-of-returns risk** via a stress path plus Monte Carlo success
  probability and depletion-age distribution.
- **Geography as a first-class variable** — cost of living, healthcare, VAT,
  treaty tax, and visa thresholds across 13 locations.
- **Inherited real estate** with sell / rent / live strategies and step-up basis
  notes.
- **Survivor mechanics** — filing-status switch to single, SS step-up, DRS
  survivor annuity.

## What we could add, by effort

### High value, low effort

1. **One-line verdict at the top.** "On plan to age 95" / "Funds deplete at age
   87 — short $X/yr." We already compute `depAge` and `surplus`; just surface
   them as a headline.
2. **Prominent Monte Carlo success probability.** Make `successProb` *the* score
   (e.g. "82% of scenarios succeed") instead of leaving it buried.
3. **A "save more" lever.** Let `contrib` show the gap closing, like NerdWallet's
   slider, for any pre-retirement years.

### Medium effort

1. **A proper accumulation phase.** Model income growth and employer match in the
   working years so the tool serves people 10–20 years out, not just
   at-retirement.
2. **Progressive disclosure / simple mode.** A basic mode (age, savings, spend,
   income) that fills our many inputs with sensible defaults, advanced panels
   collapsed.
3. **Expose inflation explicitly.** Even if we stay in real terms internally, a
   visible 3% knob builds trust and lets us optionally display nominal dollars.

### Worth noting — do not copy

- NerdWallet's 70%-of-income replacement rule is cruder than our after-tax
  line-item budgets. Keep ours.
- Their flat 6/5/3 assumptions ignore taxes and sequence risk. Don't trade our
  rigor for their simplicity — add a simple surface over the rigorous engine.

## Source references

- Calculation engine: `src/finance/` (`simulate.js`, `plan.js`, `tax.js`,
  `socialSecurity.js`, `pension.js`, `events.js`, `monteCarlo.js`)
- Constants and assumptions: `src/retirementData.js`
- NerdWallet calculator: <https://www.nerdwallet.com/investing/calculators/retirement-calculator>
