# Nest & Next — Architecture Review & Enhancement Plan

_Two arcs, made legible: the accumulation years where retirement savings compound, and the
decumulation years where they're drawn down, reinvested, and stress-tested against a life that
doesn't spend in a straight line._

---

## 1. Executive summary

Nest & Next is already an unusually honest planning tool: a pure, deterministic calculation
engine (`src/finance/*`) feeding a single large React view (`RetirementCalculator.jsx`), with
every constant source-linked and a real test suite (118 passing) guarding the high-risk math.

But it answers a **steady-state** question — _"what is the one sustainable income this household
can support, and where does it stretch?"_ The requirements here ask it to answer two **dynamic,
time-varying** questions instead:

1. **The working years as an arc.** How does retirement saving — spread across 401(k), IRA, Roth,
   and taxable vehicles — actually _accumulate_ year by year, under a return assumption that is
   anchored to history and carries explicit variability?
2. **The retirement years as an arc.** How is the nest egg drawn down _and_ reinvested when
   spending is **not** flat — when lifestyle rises, large purchases land, and life events (planned
   and emergent) hit — and how far does the money go when those things change?

The good news: the engine's bones already support this. `simulate()` is a true year-by-year loop
that already tracks two tax buckets, contributions, growth, RMDs, and reinvestment of forced
distributions. The work is **less about rebuilding and more about three targeted upgrades**:

| #     | Upgrade                        | Where it lives today                                              | What changes                                                                                  |
| ----- | ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **A** | Multi-vehicle accumulation     | one flat `contrib` + one portfolio-wide `tradFrac`                | a small set of contribution streams, each with its own tax bucket and limit                   |
| **B** | Return-with-variability slider | single `realReturn` point + a separate, opt-in Monte Carlo button | a return assumption seeded from history with a variability band wired into the _default_ view |
| **C** | Non-flat retirement spending   | flat `base = incomeHH × targetPct` + a few overlays               | a spending-smile curve, lifestyle-change controls, and guardrail reactivity                   |

Everything below is specific to _this_ codebase: the actual functions, the actual state fields,
and exactly how each new control threads `buildPlanInputs → simulate → row outputs → chart arrays
→ JSX`.

---

## 2. Current architecture — deep dive

### 2.1 The shape of the system

```text
index.html → src/App.jsx → RetirementCalculator.jsx   (the only component; ~1,100 lines)
                                   │
                                   ├── useState(s)            one flat state object, ~40 fields
                                   ├── useMemo(calculatePlan) recomputed on every keystroke
                                   └── Web Worker → runMonteCarlo (off-thread, opt-in)

src/calculatorCore.js  ── re-exports everything from src/finance/*
src/finance/
  tax.js            2026 federal engine (brackets, taxable SS, senior deductions, OBBBA bonus)
  socialSecurity.js PIA from bend points, claim-age reduction/credits, spousal cap
  pension.js        WA DRS early-retirement factors, AFC resolution
  events.js         travel taper, one-time events, LTC episode
  rmd.js            SECURE 2.0 start age + Uniform Lifetime divisors
  simulate.js       THE ENGINE — the year-by-year loop + steady-state synthesis
  plan.js           buildPlanInputs, scenario fan-out, calculatePlan orchestration
  monteCarlo.js     lognormal return sampling over the same simulate()
  mcWorker.js       worker shim
src/retirementData.js  every constant, each with a source comment + SOURCES map
```

The separation is clean and worth preserving: **all money math is framework-free and pure**, so
it's unit-testable without React, and the UI is a thin (if large) projection of that math. This is
the single most valuable property of the codebase and every recommendation below keeps it.

### 2.2 The engine: `simulate(i, ssOpt)`

This is the heart. One loop, `y = 0 … endEff`, one row per year. Each iteration:

1. Ages, calendar year, who's still working (`aA < i.stopA`), salaries, pension eligibility.
2. Social Security with the funding haircut and survivor step-up applied.
3. Inheritance effects (rent / live-in saving / sale lump) and the extra-spend overlays
   (`travel + events + LTC`).
4. **Spending need** via `spendingNeed()` — the flat base plus the pre-65 healthcare bump.
5. **Growth**: `bal = bal × (1 + yearReturn) + sellLump`, with the deferred sub-bucket grown in
   parallel.
6. **Contribution** (working years only): `contrib = min(plannedContrib, max(0, afterTaxIncome −
need))` — i.e. you save what's planned, capped by what's left after the year's spending.
7. **Withdrawal**: `solveWithdrawal()` binary-searches the gross draw that, after tax, exactly
   meets the need.
8. **RMD floor**: if the required minimum exceeds the need-based deferred draw, force the extra,
   tax it as ordinary income, and **reinvest the after-tax remainder into the taxable bucket**.
9. Push a fully-decomposed row: salaries, rent, pension, both SS checks, withdrawal, balance,
   need, tax, contribution, sale lump, RMD, deferred balance, growth.

**Two architectural facts that govern everything that follows:**

- **The whole model is in real (today's) dollars with one `realReturn`.** `s.inflation` is used
  _only_ to render "future-dollar equivalent" labels in the cost breakdowns (`inflFactor` in the
  component) — it never enters `simulate()`. Salaries and contributions are held flat in real
  terms. This is a legitimate, defensible modeling choice (it matches the PRD's "today's dollars
  by default" principle), and it keeps the SWR math clean. **Any new feature must respect this
  invariant or explicitly convert at the boundary**, or the numbers stop being comparable.
- **There is exactly one portfolio with one pre-tax fraction.** `tradFrac` is a single 0–1 share
  applied uniformly: it splits the _whole balance_ into "deferred" vs "after-tax," and it's also
  the ordinary-income share of _every_ withdrawal. There is no notion of separate 401(k) / IRA /
  Roth / brokerage accounts, no contribution limits, no employer match, and no withdrawal
  _sequencing_ (Roth-last, etc.). This is the single biggest gap relative to the new requirements.

### 2.3 Accumulation today

Accumulation is real but coarse. `plannedContribution(i, workA, workB) = (0.5·workA + 0.5·workB)
× i.contrib` — one dollar figure, split 50/50 by who's still working, with no raises, no
vehicle-level detail, and no match. The contribution lands in `bal`, and `tradFrac` of it lands in
`defBal`. The "Inside the portfolio → Cash flow" chart already visualizes contributions and growth
above the zero line, so the _surface_ for an accumulation story exists — it's the _inputs_ behind
it that are thin.

### 2.4 Decumulation today

Decumulation is genuinely good and already does more than the requirements assume:

- **Drawdown is need-driven**, not rate-driven: `solveWithdrawal()` finds the exact gross draw to
  meet after-tax need given all other income. The 4%/SWR figure is used _only_ for the steady-state
  "sustainable capacity" headline, not for the year-by-year drawdown.
- **Reinvestment already happens in one place**: when an RMD is forced above what's needed, the
  after-tax surplus is reinvested into the taxable bucket (`bal += afterTaxForced`). So the engine
  already understands "draw more than you spend, reinvest the rest" — it's just currently limited
  to the RMD case.
- **Expenses are already not perfectly flat**: the pre-65 healthcare bump, the travel go-go/slow-go
  taper, one-time events, and an LTC episode all modulate the need. What's missing is a _general_
  age-shape (the spending smile) and _interactive lifestyle changes_.

### 2.5 State and UI binding

One `useState(s)` object holds ~40 fields. `set(k) => v => setS(p => ({...p, [k]: v}))` is the
universal setter; `setProp(key, field)` handles nested objects. `calc = useMemo(() =>
calculatePlan(s), [s])` recomputes the entire scenario fan-out (chosen / full / trustees / none /
stress) on every change, then the JSX reads derived arrays (`compRows`, `balRows`, `invRows`,
`locRows`) off it. It's a clean unidirectional flow; the cost is that `RetirementCalculator.jsx` is
a 1,100-line monolith mixing UI atoms, derived data, and ~10 result panels.

### 2.6 Visualization inventory

Already present: the headline sustainable-income card; four stat tiles; the SS-cut risk table; the
inheritance cards; **the staircase** (income by source, year by year, with the dashed need line);
**inside the portfolio** (cash-flow / tax-buckets / buckets+RMD views); **the long run**
(balance with/without SS + stress); the Monte Carlo fan; the Places list; the side-by-side compare;
and the income-mix bar. The two charts the new work most affects are the **staircase** (the
year-by-year need line) and **inside the portfolio** (contributions, growth, draw, buckets).

### 2.7 Honest assessment against the new requirements

| Requirement                                       | Today                                             | Gap                                                              |
| ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Working-years accumulation, year by year          | Engine loops and charts contributions+growth      | Visible, but driven by one flat number                           |
| 401(k) / IRA / Roth / others as distinct vehicles | One portfolio, one `tradFrac`                     | **Not modeled** — biggest gap                                    |
| Return tied to historical gains + variability %   | Single `realReturn` slider; MC is separate/opt-in | Variability exists but is walled off from the default view       |
| Retirement drawdown                               | `solveWithdrawal`, need-driven, tax-aware         | **Strong already**                                               |
| Reinvestment in retirement                        | RMD surplus only                                  | Needs a general surplus→reinvest path                            |
| Expenses not flat / lifestyle increases           | Healthcare bump, travel taper, events, LTC        | No general spending-smile; no interactive lifestyle step-up      |
| Large purchases / planned + emergent events       | One-time `events[]` exist                         | Good base; needs richer typing + "emergent" stress               |
| "How far does the money go if I spend more?"      | Static depletion age recomputes on input          | Needs a first-class, reactive **headroom** read-out + guardrails |

---

## 3. The vision: make the two arcs first-class

Reframe the product around the two arcs the requirements describe, each grounded in research:

- **The accumulation arc.** A return assumption anchored to history. A diversified 60/40-style mix
  has historically delivered on the order of **~5% real** over long horizons, but with meaningful
  dispersion across markets and decades (Japan ~3% real; US higher) and short-window volatility
  that long windows smooth out. ([CFA Institute, 2025](https://rpc.cfainstitute.org/research/reports/2025/performance-of-the-60-40-portfolio);
  [Carson Group, 2026](https://www.carsongroup.com/insights/blog/the-60-40-portfolio-a-historical-powerhouse-or-a-rate-dependent-misinterpretation/))
  That's the empirical basis for "a slider tied to historical gains plus a variability percentage."

- **The decumulation arc.** Real retiree spending is **not flat** — it follows a "retirement
  spending smile": it declines through the active **go-go** years, bottoms in the **slow-go** years
  (Blanchett finds roughly a **~25% real decline by the mid-80s** for a representative household),
  then drifts back up in the **no-go** years as healthcare rises.
  ([Retirement Researcher](https://retirementresearcher.com/retirement-spending-smile/);
  [Kitces](https://www.kitces.com/blog/estimating-changes-in-retirement-expenditures-and-the-retirement-spending-smile/);
  [Blanchett 2026, Financial Planning Review](https://onlinelibrary.wiley.com/doi/full/10.1002/cfp2.70032))
  And when markets or spending move, **dynamic "guardrail" withdrawal rules** (Guyton-Klinger) let a
  plan _react_: spending is trimmed when the withdrawal rate drifts too high and raised when the
  portfolio outperforms, which is exactly the "react to additions or increased spending" behavior
  requested. ([Morningstar](https://www.morningstar.com/retirement/want-boost-your-retirement-income-guardrails-could-help);
  [Kitces](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/))

These aren't bolt-ons; they're the organizing idea. Below, each becomes a concrete control with a
defined UI surface and calculation path.

---

## 4. Enhancement plan — control by control

Format for each: **what it is → UI surface → state field → calculation impact → visualization
impact**. Grouped A–E. Effort tags are rough: S (≤½ day), M (1–2 days), L (3–5 days).

### A. Working years: multi-vehicle accumulation

#### A1. Contribution streams (replaces the single `contrib`) — **L**

- **What.** Move from one flat number to a small list of named contribution streams, each tagged to
  a tax bucket: `401k_pretax`, `401k_roth`, `ira`, `roth_ira`, `taxable`, plus an optional employer
  `match`. Keep the simple "one number" mode as a default for users who don't want detail.
- **UI.** In _Step one_, a "Contributions" sub-panel: a compact table of rows (vehicle select •
  annual amount • who it belongs to). A "Simple / Detailed" `Segmented` toggle keeps the current
  single-slider experience as the default and reveals the table on demand. Show live annual-limit
  hints per vehicle (e.g. IRS 401(k)/IRA limits, with the 50+ catch-up auto-applied from `ageA`/
  `ageB`).
- **State.** Add `contribStreams: [{id, vehicle, owner:"A"|"B", amount}]` and `employerMatch:
{pct, capPct}`. Keep `contrib` as a derived sum for backward compatibility and existing tests.
- **Calculation.** Replace `plannedContribution()` so it returns both a total _and_ a per-bucket
  split, then in `simulate()`:
  - drop the contribution into the right sub-balances (introduce `rothBal`/`taxableBal` alongside
    today's `defBal`; see D1),
  - stop each stream when its owner stops working (`workA`/`workB` already computed),
  - apply the match as a function of the pre-tax 401(k) stream up to the cap.
    This makes `tradFrac` an _output_ (the deferred share of the resulting balance) rather than an
    input, which is more honest and removes a confusing control.
- **Visualization.** The "Inside the portfolio → Cash flow" chart's `contrib` bar becomes a small
  stack by vehicle; the "Tax buckets" view gains a third (Roth) band instead of folding Roth into
  "after-tax."

#### A2. Salary-growth / contribution escalation — **M**

- **What.** Optional real raise rate so contributions and salaries aren't perfectly flat. Kept off
  by default to preserve the "today's dollars, flat real" baseline.
- **UI.** One slider in the advanced panel: "Real salary growth — 0%/yr" (range 0–3%).
- **State.** `realRaise: 0`.
- **Calculation.** In the loop, scale `salA`/`salB` and each contribution stream by `(1+realRaise)^y`
  while working. Because the model is real-dollar, this is a _real_ raise on top of inflation —
  label it that way to avoid double-counting.
- **Visualization.** Naturally lifts the rising contribution bars in the accumulation years; add a
  faint "contributions to date" cumulative line to the cash-flow chart so the _accumulation arc_
  reads as an arc, not just yearly bars.

#### A3. "Accumulation summary" read-out — **S**

- **What.** A headline for the working years symmetric to the existing retirement headline: projected
  balance at each spouse's stop-work age, total contributed vs total growth, and the effective
  blended return realized.
- **UI.** A new stat card above the staircase, shown while `yearsToRet > 0`.
- **State.** None — derive from `simChosen.rows`.
- **Calculation.** Sum `contrib` and `growth` across working-year rows; read `balAtFullRet`.
- **Visualization.** Card only; reuses existing row data.

### B. Return tied to historical gains + variability

#### B1. Return assumption with a variability band (the requested slider) — **L**

- **What.** Reframe the lone `realReturn` slider as a two-part control: a **central return** anchored
  to a historical preset, and a **variability %** (return volatility) that's _always_ expressed in
  the default view as a band — not hidden behind the opt-in Monte Carlo button.
- **UI.** In _Step six / advanced_: a preset `Segmented` ("Conservative ~3.5% • Balanced ~5% •
  Growth ~6.5% • Custom") that sets the central real return from historical 60/40-style ranges, plus
  a "Variability — ±X%" slider (maps to the lognormal `volatility` that `monteCarlo.js` already
  consumes, default ~12%). A one-line caption cites the historical basis so the anchor is legible and
  defensible.
- **State.** `returnPreset`, keep `realReturn` as the central value, and promote `volatility` from
  the `MC_DEFAULTS` constant into editable state.
- **Calculation.** Two things, no new engine:
  1. The central `realReturn` continues to drive the deterministic projection exactly as today.
  2. **Auto-run the existing Monte Carlo** (already off-thread in `mcWorker`) on a debounce whenever
     inputs settle, so the variability band is present by default instead of requiring a click. The
     band is the p10–p90 fan `monteCarlo.js` already produces.
- **Visualization.** The "long run" balance chart gains a shaded p10–p90 ribbon behind the
  deterministic line (the data already exists in `mc.balanceFan`); the headline shows the median and
  the 10th–90th range inline (the text already does this when `mc` is present — make it the default,
  not the post-click state). This directly satisfies "a slider tied to historical market gains plus
  some variability as a percentage slider."

#### B2. Sequence-of-returns clarity — **S**

- **What.** Make the existing `stressReturnForYear` (a −10% early-years shock) a labeled, toggleable
  "bad first decade" scenario rather than a quiet dotted line, since sequence risk is the single
  biggest decumulation danger and the engine already models it.
- **UI.** A toggle + a short explainer on the "long run" chart.
- **State.** `showStress` (already effectively rendered; just surface the control).
- **Calculation.** None — `simStress` is already computed in `calculatePlan`.
- **Visualization.** Promote the stress line's legend/label; tie its on/off to the toggle.

### C. Retirement years: spending that isn't flat

#### C1. The spending smile — **L**

- **What.** Replace the flat retirement `base` with an age-shaped real-spending curve: a configurable
  annual real decline through the go-go/slow-go years with a late-life upturn, defaulting to
  Blanchett-style values (~−1%/yr early, accelerating, then turning back up), and able to be turned
  off to recover today's flat behavior.
- **UI.** In a new _Retirement spending_ section: a `Segmented` ("Flat • Spending smile • Custom")
  and, in custom, two small inputs (early real decline %/yr, late-life upturn age). A sparkline shows
  the resulting curve so the shape is legible before you read the charts.
- **State.** `spendingShape: {mode:"flat"|"smile"|"custom", earlyDecline, upturnAge}`.
- **Calculation.** This is the cleanest possible insertion point: `spendingNeed()` already returns
  the per-year need. Add an age-indexed multiplier there (only for retirement years — gate on "not
  working") so the base is scaled by the smile factor before the healthcare bump and event overlays
  are added. Everything downstream (withdrawal solve, depletion, charts) updates for free because it
  all reads `need`.
- **Visualization.** The staircase's dashed need line stops being flat-then-stepped and takes the
  smile shape — which is exactly the "expenses are not zero-sum each month" intuition made visible.
  Keep the healthcare bump and events rendered _on top_ so users see base vs. discretionary vs.
  shock.

#### C2. Lifestyle level + step-changes — **M**

- **What.** A first-class "lifestyle" control: the base discretionary spend, plus the ability to
  add a permanent step-up/step-down at a chosen age ("we'll spend $15k/yr more once the house is
  paid off / once we're settled abroad").
- **UI.** A slider for the base lifestyle level (re-using `targetPct` semantics but framed as a
  dollar lifestyle), and an "Add a lifestyle change" button that appends `{fromYear, deltaAnnual}`
  rows — mirroring the existing `events[]` add/remove pattern, which is already a clean, tested UI
  idiom.
- **State.** `lifestyleSteps: [{id, fromYear, deltaAnnual}]`.
- **Calculation.** In `spendingNeed()` / the loop, add the sum of active step deltas (any step with
  `fromYear ≤ cal`) to the need. Permanent, so it compounds with the smile.
- **Visualization.** Each step shows as a labeled riser on the need line; the depletion age and
  headroom (E1) react immediately — the core "how far does the money go when lifestyle increases"
  question.

#### C3. Large purchases & life events — planned and emergent — **M**

- **What.** Extend today's `events[]` from "one-time gift" to typed items: `gift`, `purchase`
  (car, boat, second home down-payment), `windfall` (negative-cost inflow), and a distinct
  **emergent** flag for unplanned shocks used in stress views.
- **UI.** Enrich the _Family milestones_ rows with a type select and a "planned / emergent" toggle.
  Keep the existing add/remove/label affordances — they're already accessible and tested.
- **State.** Extend each event with `type` and `emergent:boolean`.
- **Calculation.** `oneTimeSpendForYear()` already sums event amounts in a given year — extend it to
  net windfalls (negative) and to optionally _exclude_ emergent items from the baseline plan while
  _including_ them in a "with shocks" scenario (a sibling to `simStress`).
- **Visualization.** Planned events keep the existing gold reference dots on the staircase; emergent
  events render only in the stress overlay, so users see "baseline plan" vs. "plan if life happens."

### D. Drawdown, reinvestment, and withdrawal sequencing

#### D1. Three real buckets + withdrawal ordering — **L**

- **What.** Split today's single balance into `taxableBal`, `deferredBal`, `rothBal` and draw them
  in a tax-smart order (commonly taxable → deferred → Roth), so the tax engine sees the _right_
  ordinary-income share each year instead of a flat `tradFrac` on every dollar.
- **UI.** A "Withdrawal order" control (preset orders + "custom") in the advanced panel; most users
  never touch it, but it makes the Roth/traditional story real.
- **State.** `withdrawalOrder: ["taxable","deferred","roth"]`; seed the three balances from the
  contribution streams (A1) instead of from `tradFrac`.
- **Calculation.** This is the most invasive engine change and should be sequenced last. Today
  `solveWithdrawal()` assumes a fixed `tradFrac` on the gross draw. The replacement solves for the
  _net_ need by pulling from buckets in order, where only the deferred portion is ordinary income and
  Roth is tax-free. The existing binary search still works; what changes is the function that maps a
  gross draw to taxable income (it becomes order-dependent). RMDs continue to act on `deferredBal`
  only — which is _more_ correct than today, because Roth is genuinely RMD-exempt.
- **Visualization.** The "Tax buckets" chart becomes a true three-band stack that visibly drains in
  order; the tooltip can show "this year's draw came X from taxable, Y from deferred, Z from Roth."

#### D2. General surplus reinvestment — **S**

- **What.** Generalize the reinvestment the engine _already_ does for RMD surplus so that **any**
  year where guaranteed income (SS + pension + rent) exceeds the (now smile-shaped) need reinvests
  the after-tax surplus into the taxable bucket.
- **UI.** None required (it's a correctness improvement); optionally a toggle "Reinvest surplus
  income."
- **State.** `reinvestSurplus: true`.
- **Calculation.** After the withdrawal solve, if `afterTaxGuaranteed − need > 0`, add it to
  `taxableBal` (and to `bal`). The RMD path already demonstrates the exact mechanic; this widens it.
- **Visualization.** Shows up as a positive contribution-like bar _in retirement years_ on the
  cash-flow chart — making "drawdown AND reinvestment" visible in one view, as requested.

### E. Reactivity: how far does the money go?

#### E1. Live "headroom" read-out — **S**

- **What.** A always-on answer to "how far will the money go?": depletion age (already computed),
  plus the **maximum sustainable spending increase** before the plan fails at the chosen horizon,
  recomputed live as any C-control moves.
- **UI.** A prominent read-out near the headline: "You can raise spending by up to **$X/yr** and
  still last to {horizon}," flipping to "Spending $Y/yr over budget; savings run out at age Z" when
  short.
- **State.** None — derived.
- **Calculation.** Binary-search the lifestyle delta (C2) that drives `depAge` to the horizon — the
  same root-finding pattern `solveWithdrawal()` already uses, run once over `simulate()`.
- **Visualization.** Read-out card; optionally a faint "headroom" band on the staircase.

#### E2. Guyton-Klinger guardrails (dynamic withdrawals) — **L**

- **What.** An optional dynamic-spending mode: instead of always meeting a fixed need, the plan
  _reacts_ — trimming spending when the withdrawal rate drifts above an upper guardrail and raising
  it when the portfolio outperforms (rate falls below a lower guardrail). This is the research-backed
  way to model "react to additions or increasing spending."
- **UI.** A "Spending strategy" `Segmented` ("Fixed need • Guardrails"), with guardrail thresholds
  and cut/raise percentages in advanced (sensible defaults: ±20% bands, 10% adjustments).
- **State.** `spendingStrategy`, `guardrails: {upperPct, lowerPct, cutPct, raisePct}`.
- **Calculation.** Add a branch in the loop: track a running spending level; each year compute the
  current withdrawal rate; if it breaches a guardrail, adjust the spending level and carry it
  forward. This composes naturally with the Monte Carlo path runner (each MC path applies its own
  guardrail adjustments), which is precisely how this is meant to be evaluated — the band shows how
  often and how hard spending gets adjusted.
- **Visualization.** In MC mode, show the distribution of realized spending (not just balances), so
  users see the trade-off: a higher starting spend in exchange for variability. Annotate guardrail
  breaches on the path.

---

## 5. Control → UI → calculation matrix (at a glance)

| Control                  | New state                         | Engine touch point                                  | Charts affected                   |
| ------------------------ | --------------------------------- | --------------------------------------------------- | --------------------------------- |
| A1 Contribution streams  | `contribStreams`, `employerMatch` | `plannedContribution`, bucket seeding in `simulate` | Inside-the-portfolio (both views) |
| A2 Salary growth         | `realRaise`                       | salary/contrib scaling in loop                      | Cash-flow (accumulation)          |
| A3 Accumulation summary  | —                                 | sums over working rows                              | new stat card                     |
| B1 Return + variability  | `returnPreset`, `volatility`      | `realReturn` (det.) + auto MC                       | Long-run ribbon, headline         |
| B2 Sequence stress       | `showStress`                      | already `simStress`                                 | Long-run                          |
| C1 Spending smile        | `spendingShape`                   | `spendingNeed` multiplier                           | Staircase need line               |
| C2 Lifestyle steps       | `lifestyleSteps`                  | additive need in loop                               | Staircase risers, headroom        |
| C3 Events typed/emergent | `events[].type/emergent`          | `oneTimeSpendForYear`                               | Staircase dots, stress overlay    |
| D1 Buckets + order       | `withdrawalOrder`, 3 balances     | `solveWithdrawal` tax mapping                       | Tax-buckets (3 bands)             |
| D2 Surplus reinvest      | `reinvestSurplus`                 | post-solve reinvest                                 | Cash-flow (retirement inflows)    |
| E1 Headroom              | —                                 | root-find over `simulate`                           | headline read-out                 |
| E2 Guardrails            | `spendingStrategy`, `guardrails`  | loop spending branch + MC                           | MC spending distribution          |

---

## 6. Sequencing & dependencies

Build in an order that keeps the engine honest and the tests green at every step:

1. **B1 + B2 (return & variability), C1 (spending smile), E1 (headroom).** These are the highest
   value-to-risk: they ride on existing fields (`realReturn`, `volatility`, `need`, `depAge`) and the
   existing Monte Carlo, and they immediately deliver the two requested experiences (variability
   slider, non-flat retirement spend, "how far does it go"). Mostly additive; low blast radius.
2. **C2 + C3 (lifestyle steps, typed/emergent events) + A3 (accumulation summary).** Reuse the
   well-tested `events[]` add/remove idiom; additive to `spendingNeed`.
3. **A1 + A2 (multi-vehicle accumulation, salary growth).** Introduces the three sub-balances and
   makes `tradFrac` an output; this is where the working-years vehicle detail lands.
4. **D1 (withdrawal ordering) then D2 (general reinvest).** The deepest engine surgery; do it once
   the three buckets from A1 exist so ordering has something to order. D2 generalizes a mechanic
   the engine already proves.
5. **E2 (guardrails).** Last, because it's most valuable _on top of_ variability (B1) and buckets
   (D1), and it composes with the MC runner.

A pragmatic split: **a non-breaking "v1.2" (steps 1–2)** that delivers the visible requirements with
near-zero engine risk, then **a "v2.0" engine refactor (steps 3–5)** for true multi-vehicle and
dynamic-withdrawal fidelity.

---

## 7. Invariants to protect (don't regress these)

- **Real-dollar consistency.** New flows must stay in today's dollars or convert explicitly at the
  boundary. If A2's "real raise" or any nominal figure sneaks in un-deflated, every comparison breaks.
- **One tax engine.** Keep `calculateFederalTaxYear` as the single source for both projection and
  headline (per `CLAUDE.md`). D1's bucket ordering changes the _input_ to it, not the engine.
- **Determinism for tests.** The deterministic projection must remain seedless and date-free; all
  randomness stays inside `monteCarlo.js` behind the fixed seed. Auto-running MC (B1) must be
  debounced and must not leak into the deterministic snapshot the tests assert on.
- **Planning-grade honesty.** Every new assumption (return preset basis, smile curve, guardrail
  bands) needs a source-linked caption and a constant in `retirementData.js`, matching the existing
  discipline. The spending smile and guardrails especially should name their research basis in-app.
- **Tests & docs move in lockstep.** Per the repo's own rule: each engine change updates
  `calculatorCore.test.js`; each new control gets a `RetirementCalculator.test.jsx` check via
  accessible labels; `docs/prd.md` (which already lists Monte Carlo and survivor modeling as "out of
  scope" even though they now exist) should be reconciled so the FR-\* list matches reality.

---

## 8. One-paragraph recommendation

Start with the spending smile (C1), the return-with-variability default (B1), and the live headroom
read-out (E1). Those three, all additive and low-risk, convert the tool from "one steady number" to
"two legible arcs that react" — and they directly answer the brief: variability tied to history,
retirement spending that isn't flat, and an instant read on how far the money goes when life changes.
Then layer in lifestyle steps and richer events, and only afterward undertake the multi-vehicle /
withdrawal-ordering engine refactor, which is the deepest change but also the one with the clearest
upgrade path because the engine already tracks two buckets and already reinvests surplus.
