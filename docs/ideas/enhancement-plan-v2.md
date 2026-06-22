# Nest & Next — Refined Enhancement Plan (v2)

_Companion to `enhancement-plan.md`. The first plan established the two-arc vision (accumulation /
decumulation) and the engine-level path for variability, the spending smile, and guardrails. This
round goes deep on the four areas you called out: **vehicle-level saving clarity**, a real
**housing & mortgage** module, **location-aware retirement taxation**, and a **year-by-year /
month-by-month** income-vs-expense view you can flex by lifestyle. Where v2 and v1 overlap, v2
wins._

---

## 0. What changed in this round, in one breath

You sharpened both arcs:

- **Working years** are now explicitly about _"what can we actually put into each savings vehicle,
  and what does it earn?"_ — so accumulation needs real per-vehicle contributions, 2026 limits, and
  return clarity, not one flat number.
- **Retirement years** become **place-bound**: _where you intend to live when retirement starts_
  drives **state income tax** (which depends on the _type_ of income), **property tax**, and
  **living expenses** — on top of federal. And housing itself (rent vs. mortgage vs. owned outright)
  is a first-class, location-priced cost with its own payoff timeline.
- You want to **see** it at two resolutions — year by year _and_ month by month — and **flex** it
  live by spending more or less.

One architectural consequence threads through everything below: **housing forces inflation into the
engine.** Today `s.inflation` only labels charts; a fixed-dollar mortgage payment that ends at
payoff is inherently _nominal_, so the engine must finally deflate it into real terms each year.
That's a feature, not a tax: the housing-cost cliff at payoff becomes one of the most legible events
in the whole plan.

---

## 1. Working years — saving vehicles & their returns, made clear

This refines **§4.A** of v1. The goal you named is _clarity_: how much goes into each vehicle, what
the IRS lets you put there, what the employer adds, and what it all earns.

### 1.1 Per-vehicle contributions with live 2026 limits — **L**

- **What.** Each contribution is tagged to a vehicle with its own annual limit and tax bucket. The
  app validates against the real limits and auto-applies the age-based catch-ups, so the user sees
  _"you're $4,200 under your 401(k) max"_ rather than guessing.
- **2026 limits to encode** (IRS Notice 2025-67 —
  [IRS](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)):

  | Vehicle | Base (2026) | Catch-up 50+ | Super catch-up 60–63 | Tax bucket |
  |---|---|---|---|---|
  | 401(k)/403(b)/457(b) elective | $24,500 | +$8,000 → $32,500 | +$11,250 → $35,750 | deferred (or Roth) |
  | 401(k) total (employee+employer, §415(c)) | $72,000 | — | — | deferred (+Roth) |
  | Traditional / Roth IRA | $7,500 | +$1,100 → $8,600 | — | deferred / Roth |
  | HSA | $4,400 self / $8,750 family | +$1,000 (age 55+) | — | triple-tax-advantaged |
  | Roth IRA income phase-out | single $153k–$168k · MFJ $242k–$252k | — | — | Roth |

  Two 2026 rules worth encoding because they change the _bucket_, not just the amount: **high earners**
  (>$150k prior-year FICA wages) must make 401(k) **catch-ups as Roth**, and **Roth IRA eligibility
  phases out** at the ranges above. ([Fidelity](https://www.fidelity.com/learning-center/personal-finance/401k-catch-up-contributions-high-earners);
  [Schwab](https://www.schwab.com/learn/story/what-to-know-about-catch-up-contributions))
- **UI.** The "Contributions" sub-panel from v1.A1, with a per-row limit meter (filled bar + "$X of
  $Y max") that recolors if over-limit. Catch-up tiers light up automatically from `ageA`/`ageB`.
  Keep "Simple / Detailed" so the one-slider default survives.
- **State.** `contribStreams:[{id,vehicle,owner,amount}]`, `employerMatch:{pct,capPct}`. Store limits
  as a dated table in `retirementData.js` (`CONTRIB_LIMITS_2026`) with a source comment, exactly like
  the existing tax constants.
- **Calculation.** `plannedContribution()` returns a per-bucket split; each stream stops at its
  owner's `stop` age; the match is applied to the pre-tax 401(k) stream up to the cap and itself is
  pre-tax. Over-limit amounts are clamped (and surfaced in the UI) so projections stay honest.
- **Visualization.** The accumulation cash-flow chart's `contrib` bar becomes a per-vehicle stack;
  a "% of max used" read-out per vehicle answers "are we leaving tax-advantaged room on the table?"

### 1.2 Return clarity: blended, by bucket, optional glidepath — **M**

- **What.** Keep v1's single real-return-with-variability slider as the default (anchored to the
  historical ~5% real 60/40 band), but add an optional **per-bucket expected return** or a simple
  **glidepath** (more equity early, more bonds near retirement) for users who want the detail you
  asked to "get clear on."
- **UI.** A "Return detail: Blended / By bucket / Glidepath" toggle in advanced. Glidepath shows a
  two-point control (equity % now → equity % at retirement).
- **State.** `returnModel:{mode, perBucket?, glidepath?}`.
- **Calculation.** In `simulate()`, the single `yearReturn` becomes a weighted blend of bucket
  balances × bucket returns (or the glidepath's age-interpolated return). Monte Carlo (v1.B1) samples
  around the _blended_ mean, so the variability band still works unchanged.
- **Visualization.** An "accumulation summary" card (v1.A3) gains a contributed-vs-growth split and
  the realized blended return, so the working years read as a clear compounding story.

> **Clarity read-out (the point of this section):** at each spouse's stop-work age, show _projected
> balance by vehicle_, _total contributed vs. total growth_, and _effective blended return_ — the
> accumulation-side mirror of the retirement headline.

---

## 2. Housing & mortgage — the missing module

Today housing is **implicit and double-counted**: the replacement-rate need (`base = incomeHH ×
targetPct`) bundles housing _and_ the Places comparison adds a location `m.rent` line on top. The
only explicit housing logic is the inherited-home "live-in" saving in `PROP`. You're right that this
deserves to be first-class.

### 2.1 Housing tenure: rent / mortgage / own outright — **L**

- **What.** A primary-residence housing status with three modes, each with its own cost shape:
  - **Rent** — a monthly rent (seedable from the chosen location's `m.rent`), rising with inflation.
  - **Mortgage** — principal, rate, term (or start date), producing a **fixed monthly P&I** that
    **ends at payoff**, plus property tax + insurance + maintenance.
  - **Own outright** — no P&I; just property tax + insurance + maintenance.
- **UI.** A "Housing" section: a `Segmented` for tenure, then mode-specific inputs. For a mortgage,
  show the two things you asked for prominently: **monthly payment** and **years/months to payoff**
  (with the payoff calendar year), computed live from the amortization formula. A small note shows
  the real-terms decline ("$2,100/mo today ≈ $1,500/mo real by payoff at 2.5% inflation").
- **State.** `housing:{tenure, rent?, mortgage:{principal, ratePct, termYears, startYear}, homeValue,
  insuranceAnnual, maintenancePctOrAnnual}`.
- **Calculation — the math, made explicit:**
  - Monthly P&I (standard amortization): `M = P · r(1+r)^n / ((1+r)^n − 1)`, with `r` = monthly rate,
    `n` = term in months. Remaining balance and the **payoff year** fall straight out; expose payoff
    year so the UI and charts can mark it.
  - **Property tax = effective rate × home value**, location-dependent (§3.2). Because home value and
    the assessment roughly track inflation, property tax is ~flat in _real_ terms — model it as a
    real annual constant `rate × homeValue`.
  - **Mortgage P&I is nominal and fixed**, so each year deflate it: `realPI(y) = M·12 / (1+inflation)^y`,
    and it **drops to $0 the year after payoff**. Insurance/maintenance are modeled real-flat.
  - Add the resulting annual housing cost into `spendingNeed()` as an explicit component, and
    **remove housing from the implicit replacement rate** so it isn't double-counted (see 2.3).
- **Visualization.** Housing becomes a labeled band on the staircase's need line, and the **payoff
  year shows as a downward step** — the "housing cost cliff" — which is exactly the kind of legible,
  plan-shaping event the tool is built to show. The mortgage payoff also frees cash flow that the
  surplus-reinvestment path (v1.D2) can redeploy.

### 2.2 Reconcile with inherited real estate — **S**

- **What.** The inherited-home **live-in** strategy already credits a housing saving (`live =
  rentMo·12 − value·ownRate`). With an explicit housing module, "inherit and live in the Klagenfurt
  home" should _switch the primary housing tenure to owned_ (no rent/P&I, just that home's carrying
  cost) rather than applying a generic saving on top.
- **Calculation.** When an inherited "live" event is active, override `housing.tenure → own` from its
  year, using the inherited home's value for property tax. Removes the v1 double-application risk
  noted in PRD limitation **L8**.
- **Visualization.** The staircase's housing band visibly drops to carrying-cost-only at the
  inheritance year — making the "living in it is the prize" planner's note quantitatively true.

### 2.3 Make the spending need housing-explicit — **M** _(enabling change)_

- **What.** Reframe `targetPct` as **non-housing lifestyle** and add housing as its own line, so the
  rent-vs-mortgage-vs-own choice actually moves `need` and the month view can itemize it.
- **UI.** Relabel the slider "Retire on this share of income" → "Non-housing lifestyle (% of income)"
  with a hint that housing is set separately below.
- **Calculation.** `spendingNeed()` becomes `nonHousingBase (smile-shaped) + housing + healthcare
  bump + events`. Everything downstream already reads `need`, so charts/withdrawal/depletion update
  for free.
- **Risk.** This shifts a headline definition; gate it behind the housing feature and update the
  affected tests and `docs/use-cases.md` in the same change.

---

## 3. Location-aware retirement taxation

This is the deepest correctness upgrade. Today location tax is a single blended `addlTaxRate` (or a
manual `stateRate` override) applied flatly to taxable income. But **state tax of retirement income
depends on the _type_ of income**, and the swings are large — _"where you live in retirement can
mean a $3,000–$10,000+/yr difference in after-tax income."_
([myannuitystore](https://myannuitystore.com/retirement-planning/states-that-dont-tax-retirement-income/))

### 3.1 A typed state-tax profile (replaces the flat rate) — **L**

- **What.** Give each jurisdiction a `taxProfile` describing _how_ it taxes each income type, not one
  blended number. The 2026 landscape this must capture
  ([Kiplinger](https://www.kiplinger.com/retirement/601819/states-that-wont-tax-your-pension);
  [Empower](https://www.empower.com/the-currency/money/states-that-dont-tax-retirement-income)):
  - **9 no-income-tax states** (AK, FL, NV, NH, SD, TN, TX, WA, WY) — all retirement income state-free.
  - **States that exempt most retirement income** but tax wages (IL, IA for 55+, MS, PA; **MI** fully
    phased in for 2026).
  - **Only 8 states still tax Social Security** in 2026 (CO, CT, MN, MT, NM, RI, UT, VT — **WV**
    eliminated it 2026); the other 42 + DC don't.
  - **Pension exclusions** (full or capped) in a dozen-plus states; **Roth withdrawals are tax-free
    everywhere** (already true federally in the engine).
- **UI.** When the retirement location is in the US, surface a **state selector** (separate from the
  international location list) that loads its `taxProfile`; show a plain-language line ("Texas: no
  state income tax — SS, pension, and withdrawals are state-tax-free"). Keep the manual override for
  power users and the qualitative note for non-US locations.
- **State / data.** Add `taxProfile` to each jurisdiction in `retirementData.js`:
  `{ taxesSS:bool, pensionExclusion:number|"full", taxesTradWithdrawal:bool, flatRate?:number,
  brackets?:[...] }`. Roth is implicitly exempt. Add a `US_STATE_TAX` table for the state case, each
  row source-linked.
- **Calculation.** Extend `calculateFederalTaxYear` (or wrap it) so the state layer taxes its **own
  base**: include SS only if `taxesSS`, apply the pension exclusion, include the deferred share of
  withdrawals if `taxesTradWithdrawal`, never tax Roth. This keeps the **one-tax-engine** invariant
  (the federal engine is untouched; the state layer composes on top) while making the per-source
  treatment honest. The existing `tradFrac`/bucket split (v1.D1) already tells the state layer which
  withdrawal dollars are deferred vs. Roth.
- **Visualization.** The Places list and side-by-side compare gain a true **"state tax on _your_
  income mix"** figure instead of a blended rate — so moving the retirement state visibly moves
  after-tax income and the depletion age. This directly answers "where you intend to live has an
  impact."

> **Scope note (worth a decision):** the current `LOCATIONS` array mixes _countries_ (Europe,
> Caribbean) with a few _US buckets_. Your emphasis on US state tax + property tax suggests adding a
> **US-state dimension**. Cleanest: keep the international list for the "retire abroad" story, and add
> a dedicated **US-state picker** (50 states + DC) that activates when "United States" is the chosen
> region, each carrying its `taxProfile` and `propertyTaxRate`. The typed `taxProfile` shape serves
> both worlds, so the engine doesn't fork.

### 3.2 Location-dependent property tax + living expenses — **M**

- **What.** Property tax (housing, §2) reads its **effective rate from the location**, and the
  living-expense basis is the chosen retirement location's cost-of-living — _as of where you intend
  to live when retirement starts_.
- **Data.** Add `propertyTaxRate` per US jurisdiction. 2026 effective-rate anchors (Tax Foundation /
  ATTOM — [Tax Foundation](https://taxfoundation.org/data/all/state/property-taxes-by-state-county/);
  [ATTOM](https://www.attomdata.com/news/market-trends/figuresfriday/top-10-u-s-counties-with-highest-effective-property-tax-rates-in-2025/)):
  national average **~0.85–0.9%** of home value; high end **NJ ~2.1%, IL ~2.0%, CT ~1.8%, NH, VT**;
  low end **HI ~0.3%, AL ~0.38%, NV ~0.47%, SC/AZ/CO ~0.48%**. Caption that property tax is _local_
  (county/city), so the state figure is a planning-grade approximation — consistent with the app's
  existing honesty about cost-of-living estimates.
- **Calculation.** `propertyTax = propertyTaxRate × homeValue`, fed into the housing cost (§2.1).
  Living expenses already flow through the Places line items; the refinement is that the **retirement
  location selected at retirement start** is the basis, and the existing healthcare-bridge logic
  already keys off it.
- **Visualization.** Property tax appears inside the housing band; the Places comparison can show
  "income tax + property tax on your plan" as a combined location-tax figure, which is the real
  apples-to-apples retirees care about.

---

## 4. Year-by-year and month-by-month, flexed by lifestyle

### 4.1 Month-by-month drill-down — **M**

- **What.** A monthly view of income vs. expenses for a **selected retirement year** — the resolution
  you asked for. Keep the **annual engine as the single source of truth** and _distribute_ each annual
  figure across 12 months with sensible patterns, rather than building a parallel monthly simulation
  (which would threaten determinism and double engine complexity).
- **UI.** On the staircase (or a new "A year in detail" panel): a year selector (defaulting to the
  first full retirement year), then a 12-row table / small stacked bar — income streams (SS, pension,
  rental, portfolio draw) vs. expenses (housing incl. mortgage P&I, healthcare, living, events).
- **State.** `detailYear` (UI-only).
- **Calculation.** A derivation layer over the chosen `simChosen` row: SS/pension/rent spread evenly
  monthly; mortgage P&I is a flat monthly figure; property tax distributed (often 1–2 installments —
  configurable, default even); one-time events land in their month; portfolio draw is the monthly
  residual that balances the month. Label it clearly as a **distribution of the annual figures**, not
  an independent monthly model.
- **Visualization.** A clean income-vs-expense monthly chart with a running surplus/shortfall line —
  the "are we cash-flow positive month to month?" read, including the months a big event or an
  insurance/property-tax installment lands.

### 4.2 Lifestyle play — spend more / spend less, live — **S** _(extends v1.C2/E1)_

- **What.** A prominent lifestyle slider that moves non-housing spending up or down, with the
  **headroom read-out** (v1.E1) recomputing live: _"raise spending by up to $X/yr and still last to
  {horizon}"_ or _"$Y/yr over — savings run out at age Z."_
- **Calculation.** Lifestyle delta flows into `need`; headroom binary-searches the max sustainable
  delta over `simulate()` (same root-finding pattern as `solveWithdrawal`). Location-aware, so the
  same lifestyle in Texas vs. California shows a different headroom because state tax + property tax +
  living costs differ.
- **Visualization.** Both the year-by-year staircase and the month-by-month view re-render as the
  slider moves; the headroom card flips green/clay. This is the "play with the numbers" experience.

---

## 5. Updated control → UI → calculation → visualization matrix (new & changed)

| Control | New state | Engine touch point | Charts affected |
|---|---|---|---|
| Per-vehicle contributions + limits | `contribStreams`, `employerMatch`, `CONTRIB_LIMITS_2026` | `plannedContribution`, bucket seeding | Accumulation cash-flow (per-vehicle stack) |
| Return detail / glidepath | `returnModel` | blended `yearReturn` in loop; MC mean | Accumulation summary, long-run band |
| Housing tenure (rent/mortgage/own) | `housing{…}` | new housing component in `spendingNeed`; amortization + payoff; **inflation deflator** | Staircase housing band + payoff cliff |
| Inherited live-in → owned | (reuse `inher`) | tenure override from inheritance year | Staircase housing-band drop |
| Housing-explicit need | relabel `targetPct` | `spendingNeed` recomposition | Staircase (no double-count) |
| Typed state tax profile | `taxProfile`, `US_STATE_TAX`, US-state picker | state layer composed on `calculateFederalTaxYear` | Places, compare, headline net |
| Location property tax | `propertyTaxRate` | `propertyTax = rate × homeValue` into housing | Housing band, Places location-tax |
| Month-by-month view | `detailYear` (UI) | derivation over annual row (no engine change) | New monthly income/expense chart |
| Lifestyle play + headroom | `lifestyleSteps` (v1) | `need` delta; root-find headroom | Staircase, month view, headroom card |

---

## 6. Revised sequencing (merges v1 + v2)

1. **Foundations that unlock the rest.** Housing-explicit need (§2.3) and the typed `taxProfile`
   shape (§3.1) — both are enabling refactors with bounded blast radius. Pair with v1's spending
   smile (C1) and variability default (B1), which still lead on value-to-risk.
2. **Housing module** (§2.1–2.2) + **location property tax** (§3.2). Housing is the centerpiece of
   this round and the reason inflation enters the engine; do it once the need is housing-explicit.
3. **Location-aware state tax** (§3.1 full) + **US-state picker**. Composes on the federal engine;
   delivers the "$3k–$10k/yr by location" insight.
4. **Month-by-month view** (§4.1) + **lifestyle play / headroom** (§4.2). Mostly derivation + UI atop
   the now-richer annual rows.
5. **Vehicle-level accumulation & limits** (§1.1) and **return detail** (§1.2). This is the v1
   multi-vehicle work, now with 2026 limits; sequence with v1.D1 (buckets + withdrawal order) since
   they share the three-bucket model.
6. **Guardrails** (v1.E2) last, atop variability + buckets.

A pragmatic shipping split:

- **v1.2 (low engine risk):** spending smile, variability-by-default, headroom, typed-tax-profile
  shape, housing-explicit need. Visible wins, additive.
- **v1.3 (housing + place):** full housing/mortgage module, property tax, US-state tax picker,
  month-by-month view. This is the bulk of _this_ round's asks.
- **v2.0 (engine depth):** multi-vehicle accumulation + limits, withdrawal ordering, glidepath,
  guardrails.

---

## 7. New invariants & risks to hold

- **Nominal vs. real — the mortgage is the one nominal flow.** The engine is real-dollar; a fixed
  mortgage payment is nominal and must be deflated each year and zeroed at payoff. Property tax,
  insurance, and maintenance are real-flat. Getting this wrong makes the housing cliff appear in the
  wrong year or the wrong size. This is also the moment `s.inflation` graduates from a display label
  to a real engine input — document that explicitly.
- **No double-counting housing.** Housing must be removed from the implicit replacement-rate need the
  same change it's added explicitly (§2.3), and the inherited live-in saving must convert to a tenure
  override (§2.2), not stack on top.
- **State tax stays planning-grade and source-typed.** Encode the _type-aware_ rules (taxes SS? taxes
  pension? caps?) with a source link per state, and caption that property/income tax are
  county-local approximations. Don't imply statutory precision the data doesn't support — match the
  app's existing honesty (PRD principle **P3**).
- **One tax engine.** The state layer **composes on** `calculateFederalTaxYear`; it must not fork the
  federal logic. Both projection and headline keep using the same call (CLAUDE.md rule).
- **Month view is a distribution, not a second model.** Keep the annual engine authoritative;
  the monthly breakdown derives from it and says so, preserving determinism and testability.
- **Limits are dated constants.** 2026 contribution limits live in `retirementData.js` with a source
  comment and a `_YEAR` suffix, like the tax constants, so the annual refresh is a one-file change.
- **Tests + docs in lockstep.** Each engine change updates `calculatorCore.test.js`; each control
  gets an accessible-label check in `RetirementCalculator.test.jsx`; reconcile `docs/prd.md` and
  `docs/use-cases.md` (housing, state-tax typing, month view, and the now-real role of inflation are
  all new FRs).

---

## 8. Recommendation

Lead this round with the two enabling refactors — **housing-explicit need** and the **typed
state-tax profile** — because they unlock the headline asks without large risk, then build the
**housing/mortgage module** (with its payoff cliff and the inflation it brings into the engine) and
the **US-state tax + property tax** layer. Those three turn "one steady number, mostly abroad" into
"_here's our money month by month in the place we actually plan to live, and here's how far it goes
if we spend more._" The **month-by-month view** and **lifestyle play** then ride on top as
derivation and UI, and the deeper **vehicle-level accumulation** and **withdrawal-ordering** work
lands last, where the three-bucket model pays off for both saving clarity and tax-smart drawdown.
