# Product Requirements Document — "Nest & Next"

> A single-file, interactive retirement planning tool for a U.S. married couple, covering portfolio projection, two-earner Social Security, a Washington State (DRS) teacher pension, 2026 federal tax, age-banded healthcare, cross-border inherited real estate, international cost-of-living comparisons, and a Social Security funding-risk stress test.
>
> **Tagline:** This is about your money, your home, and what comes next.

**Version:** 1.2 (Wave 2) · **Status:** Delivered · **Document type:** Product Requirements Document (capabilities)

---

## Table of Contents

- [1. Document Control](#1-document-control)
- [2. Overview and Purpose](#2-overview-and-purpose)
- [3. Goals and Non-Goals](#3-goals-and-non-goals)
  - [3.1 Goals](#31-goals)
  - [3.2 Non-Goals](#32-non-goals)
- [4. Target Users and Personas](#4-target-users-and-personas)
- [5. Product Principles](#5-product-principles)
- [6. Capability Areas](#6-capability-areas)
  - [6.1 Household and Profile Inputs](#61-household-and-profile-inputs)
  - [6.2 Retirement Timing and Benefit Claiming](#62-retirement-timing-and-benefit-claiming)
  - [6.3 Two-Earner Social Security Engine](#63-two-earner-social-security-engine)
  - [6.4 Washington State DRS Pension Engine](#64-washington-state-drs-pension-engine)
  - [6.5 Federal Income Tax Engine](#65-federal-income-tax-engine)
  - [6.6 Portfolio Projection and Withdrawal Engine](#66-portfolio-projection-and-withdrawal-engine)
  - [6.7 Age-Banded Healthcare and the Pre-65 Bridge](#67-age-banded-healthcare-and-the-pre-65-bridge)
  - [6.8 Social Security Funding-Risk Scenarios](#68-social-security-funding-risk-scenarios)
  - [6.9 Inherited Real Estate Module](#69-inherited-real-estate-module)
  - [6.10 Places: International Cost-of-Living](#610-places-international-cost-of-living)
  - [6.11 Two-Location Side-by-Side Comparison](#611-two-location-side-by-side-comparison)
  - [6.12 Steady-State Income Synthesis and Verdict](#612-steady-state-income-synthesis-and-verdict)
  - [6.13 Visualizations and Charts](#613-visualizations-and-charts)
  - [6.14 Return Assumptions and Monte Carlo Bands (Wave 1 — B1)](#614-return-assumptions-and-monte-carlo-bands-wave-1--b1)
  - [6.15 Sequence-of-Returns Stress Toggle (Wave 1 — B2)](#615-sequence-of-returns-stress-toggle-wave-1--b2)
  - [6.16 Retirement Spending Smile (Wave 1 — C1)](#616-retirement-spending-smile-wave-1--c1)
  - [6.17 Lifestyle Level and Permanent Step-Changes (Wave 1 — C2)](#617-lifestyle-level-and-permanent-step-changes-wave-1--c2)
  - [6.18 Typed Life Events with Emergent Flag (Wave 1 — C3)](#618-typed-life-events-with-emergent-flag-wave-1--c3)
  - [6.19 Accumulation Summary Card (Wave 1 — A3)](#619-accumulation-summary-card-wave-1--a3)
  - [6.20 Live Headroom Read-Out (Wave 1 — E1)](#620-live-headroom-read-out-wave-1--e1)
  - [6.21 Guidance, Notes and Disclaimers](#621-guidance-notes-and-disclaimers)
  - [6.22 Housing and Mortgage Module (Wave 2 — H1)](#622-housing-and-mortgage-module-wave-2--h1)
  - [6.23 Non-Housing Spending Floor Policy (Wave 2 — H2)](#623-non-housing-spending-floor-policy-wave-2--h2)
  - [6.24 Housing-Explicit Spending Need (Wave 2 — H3)](#624-housing-explicit-spending-need-wave-2--h3)
  - [6.25 Inherited Live-In to Owned Tenure (Wave 2 — H4)](#625-inherited-live-in-to-owned-tenure-wave-2--h4)
  - [6.26 Typed Residence Tax — US States (Wave 2 — T1)](#626-typed-residence-tax--us-states-wave-2--t1)
  - [6.27 Typed Residence Tax — International and Treaty (Wave 2 — T2)](#627-typed-residence-tax--international-and-treaty-wave-2--t2)
  - [6.28 Dual-Tax Exposure Panel (Wave 2 — T3)](#628-dual-tax-exposure-panel-wave-2--t3)
  - [6.29 Work-vs-Retire Two-Location Split (Wave 2 — L1)](#629-work-vs-retire-two-location-split-wave-2--l1)
  - [6.30 Relocation Home Transition (Wave 2 — L2)](#630-relocation-home-transition-wave-2--l2)
  - [6.31 Month-View Housing Itemization (Wave 2 — L3)](#631-month-view-housing-itemization-wave-2--l3)
- [7. Reference Data and Assumptions](#7-reference-data-and-assumptions)
- [8. UX and Design Requirements](#8-ux-and-design-requirements)
- [9. Non-Functional Requirements](#9-non-functional-requirements)
- [10. Constraints and Known Limitations](#10-constraints-and-known-limitations)
- [11. Out of Scope](#11-out-of-scope)
- [12. Glossary](#12-glossary)
- [13. Companion Documents](#13-companion-documents)

---

## 1. Document Control

| Field | Value |
| --- | --- |
| Product name | Nest & Next |
| Artifact | `RetirementCalculator.jsx` — single‑file React component |
| Audience | The end user (a married couple planning retirement), and any future maintainer |
| Reference year | 2026 (all tax, benefit, and premium constants) |
| Currency | U.S. dollars, expressed in **today's purchasing power** unless a "future‑dollar" figure is explicitly labeled |
| Companion docs | Logic & Use‑Case Specification; Sources & References |

This PRD describes **what the product does** (capabilities and requirements). The companion Logic & Use‑Case document describes **how each capability computes its result**. The Sources document lists **where the underlying numbers came from**.

---

## 2. Overview and Purpose

The calculator helps a specific household answer one question with nuance: **"If we stop working at these ages, can we live the life we want — and where?"** It does this by mapping every year from the present to age 95, layering each income source as it switches on, charging realistic expenses (including the often‑underestimated pre‑Medicare healthcare gap), and then comparing the resulting after‑tax income to the cost of living in fourteen places around the world.

It also tackles three sources of anxiety the household raised directly:

1. **Healthcare before Medicare.** Retiring before 65 opens a gap where private (ACA marketplace) coverage is expensive; the tool makes that gap explicit and time‑bounded.
2. **Inherited real estate across borders.** A Texas home and a home in Klagenfurt, Austria may be inherited 10–15 years out. The tool models the tax consequences of selling, renting, or living in each, and folds the chosen path into the plan.
3. **Social Security solvency.** The tool lets the user stress‑test partial or zero Social Security funding and see the effect on every dependent number.

The product is intentionally **planning‑grade, not advice‑grade**: it is transparent about its assumptions and simplifications and repeatedly directs the user to authoritative statements (SSA, DRS) and professionals for binding figures.

---

## 3. Goals and Non-Goals

### 3.1 Goals

- **G1 — Year‑by‑year clarity.** Show how household income is composed each year as salaries stop and benefits begin, against a spending need that itself changes with age.
- **G2 — Honest healthcare modeling.** Represent the pre‑65 ("bridge") healthcare cost as distinct from the Medicare‑era cost, and reflect that abroad the dynamic differs.
- **G3 — Place‑aware affordability.** Translate one after‑tax income into a lifestyle verdict across many countries, including taxes and consumption costs.
- **G4 — Cross‑border inheritance reasoning.** Quantify the after‑tax outcome of sell / rent / live‑in for each inherited property and connect it to the plan.
- **G5 — Risk transparency for Social Security.** Allow the user to model a benefit "haircut" and see the cascade through income, longevity, and affordability.
- **G6 — Self‑service iteration.** Every assumption is an editable control; results update live with no save/load friction.

### 3.2 Non-Goals

- **NG1** — Not a tax return, filing tool, or a substitute for a CPA, attorney, or financial advisor.
- **NG2** — ~~Not a Monte‑Carlo / sequence‑of‑returns simulator~~ — Monte Carlo with p10–p90 bands is now built (B1); sequence-of-returns stress is also built (B2). A single deterministic steady-state path remains the default entry point.
- **NG3** — Not a multi‑household or multi‑scenario saver; it models one household at a time and holds no persistent storage.
- **NG4** — Not a state‑income‑tax engine for all 50 states; Wave 2 adds typed residence tax for ~14 curated US states and planning‑grade treaty‑aware international rates; the remaining ~36 states remain qualitative.
- **NG5** — Not an estate‑planning or probate tool; it covers the tax economics of inherited real estate, not the legal mechanics of transfer.

---

## 4. Target Users and Personas

**Primary persona — "The planning couple."** A two‑earner married household in their mid‑40s. One spouse is a Washington public‑school teacher with ~20 years of service in the state pension system; the other earns a private‑sector salary. They save steadily, target a lean retirement spending level, and are open to relocating (domestically or abroad) to stretch their income. They expect to inherit real estate in Texas and Austria roughly 10–15 years out and worry about cross‑border tax and about Social Security's future.

**Secondary persona — "The maintainer."** A developer or analyst who needs to update the 2026 constants in future years, extend the location list, or adjust the tax logic. This persona is served by the companion Logic document and the inline source comments.

---

## 5. Product Principles

- **P1 — Today's dollars by default.** Returns are real (after inflation) and benefits carry cost‑of‑living adjustments, so the headline numbers are stable in purchasing power. Future‑dollar equivalents are shown only where explicitly useful (cost breakdowns).
- **P2 — Show the math's shape.** Every headline is decomposable: the user can see the income mix, the per‑year staircase, and per‑location line items.
- **P3 — Name the uncertainty.** Where a figure is a planning estimate (SS run slightly high, ACA unsubsidized, Austrian sale tax dependent on acquisition date), the UI says so.
- **P4 — One income, many futures.** A single sustainable‑income number is computed once, then tested against many places and many risks.
- **P5 — No dark patterns, no lock‑in.** No persistence, no account, no engagement mechanics; the tool is a calculator, not a service.

---

## 6. Capability Areas

Each capability area below lists functional requirements (FR‑*) and, where useful, acceptance criteria (AC). Requirement IDs are stable references for the companion Logic document.

### 6.1 Household and Profile Inputs

**Description.** Capture the household's current financial starting point and spending intent.

- **FR‑HH‑01** — Accept current age for each spouse independently.
- **FR‑HH‑02** — Accept current annual income for each spouse independently; the household income is their sum.
- **FR‑HH‑03** — Accept combined current investable savings.
- **FR‑HH‑04** — Accept an annual savings contribution, which is contributed while each spouse is still working and ceases as each retires (split half/half between spouses for timing).
- **FR‑HH‑05** — Accept filing status (Married filing jointly or Single), driving all tax thresholds.
- **FR‑HH‑06** — Accept a retirement spending **target as a percentage of current household income** (range 20%–80%), surfaced as both a percentage and an absolute dollar goal.
- **AC** — Changing any input updates all downstream results within the same interaction (no submit step).

### 6.2 Retirement Timing and Benefit Claiming

**Description.** Separate the *stop‑working* decision from the *benefit‑claiming* decision for each spouse.

- **FR‑TIME‑01** — Accept a distinct "stop working" age for each spouse.
- **FR‑TIME‑02** — Accept a distinct Social Security claim age for each spouse (62–70).
- **FR‑TIME‑03** — Accept the pension start age for the pensioned spouse.
- **FR‑TIME‑04** — Reflect timing in the simulation: salary ends at stop age; each benefit begins at its own age.

### 6.3 Two-Earner Social Security Engine

**Description.** Estimate each spouse's own Social Security benefit and apply spousal top‑ups and benefit taxation.

- **FR‑SS‑01** — Compute each spouse's Primary Insurance Amount (PIA) from their income using the 2026 bend‑point formula and taxable‑wage cap.
- **FR‑SS‑02** — Apply early‑claiming reductions and delayed‑retirement credits based on each spouse's claim age relative to Full Retirement Age (67).
- **FR‑SS‑03** — Apply a **spousal benefit top‑up**: the lower earner receives at least 50% of the higher earner's PIA (adjusted for their own claim age) if greater than their own benefit.
- **FR‑SS‑04** — Model that Washington public‑school employees pay into Social Security, so the teacher spouse receives her own benefit; the WEP/GPO offsets do **not** apply (repealed January 2025).
- **FR‑SS‑05** — Compute the taxable portion of Social Security via the provisional‑income thresholds for the filing status.
- **AC** — The benefits box displays each spouse's scheduled (full‑funding) annual benefit.

### 6.4 Washington State DRS Pension Engine

**Description.** Compute the defined‑benefit pension for the teacher spouse.

- **FR‑PEN‑01** — Support TRS (teachers) and SERS (staff) systems, which share the same benefit formula.
- **FR‑PEN‑02** — Support Plan 2 (2% × years × AFC) and Plan 3 (1% × years × AFC) multipliers; note that Plan 3's separate defined‑contribution account is **not** auto‑included and should be added to savings.
- **FR‑PEN‑03** — Accept years of service and Average Final Compensation (AFC = average of the highest 60 consecutive months of pay).
- **FR‑PEN‑04** — Apply early‑retirement reduction factors: full benefit at 65; a steep actuarial reduction table for ages 55–64 with 20–29 years of service; a 5%/year reduction for 30+ years of service.
- **FR‑PEN‑05** — Allow the pension to be toggled off entirely.
- **FR‑PEN‑06** — Display the formula breakdown and the resulting monthly/annual pension.

### 6.5 Federal Income Tax Engine

**Description.** Estimate federal income tax on retirement income using 2026 parameters.

- **FR‑TAX‑01** — Apply the 2026 marginal brackets for the filing status.
- **FR‑TAX‑02** — Apply the 2026 standard deduction plus the age‑65+ additional standard deduction.
- **FR‑TAX‑03** — Apply the temporary senior "bonus" deduction (2025–2028) with its modified‑AGI phase‑out.
- **FR‑TAX‑04** — Treat a configurable share of portfolio withdrawals as ordinary (pre‑tax 401(k)/IRA) income; the remainder as non‑taxable (Roth/basis).
- **FR‑TAX‑05** — Include the taxable portion of Social Security and the full pension and rental income as ordinary income.
- **FR‑TAX‑06** — Washington has no state income tax; the resident case omits state tax. Wave 2 adds a typed residence‑tax layer (FR‑RES‑01..04 below) that **composes on top of the federal engine** — `calculateFederalTaxYear` is never forked; the residence layer is applied as a separate post‑federal computation in `residenceTax.js`. For unconfigured or override paths the layer reduces to the prior flat `addlTaxRate` behavior, preserving backward compatibility.

### 6.6 Portfolio Projection and Withdrawal Engine

**Description.** Roll the portfolio forward year by year to age 95.

- **FR‑SIM‑01** — Grow the portfolio at a configurable real return each year.
- **FR‑SIM‑02** — Add contributions while each spouse works; stop them at retirement.
- **FR‑SIM‑03** — Compute each year's spending need (see 6.7) and meet it first from non‑portfolio income (salaries, pension, Social Security, rental), drawing the shortfall from the portfolio.
- **FR‑SIM‑03b** — Offer two **spending bases** (opt‑in toggle, `% of income` default): (a) a share of household income, or (b) the selected retirement location's cost‑of‑living basket × a **lifestyle %** dial (70–150%), with healthcare applied by age and a single/survivor scaling factor. The default preserves existing plans; switching to the location basis makes the headline and every chart reflect the cost of living where the user retires. One location applies for the whole horizon (no mid‑retirement relocation). **AC** — With `% of income` selected, the plan is numerically identical to before; switching to `Location cost` and changing the place or lifestyle visibly moves the spending‑need line, headline, and the year‑by‑year breakdown.
- **FR‑SIM‑04** — Detect and report the **depletion age** (when the portfolio would hit zero while a shortfall remains), or report "beyond 95".
- **FR‑SIM‑05** — Compute a steady‑state "sustainable income" using a configurable withdrawal rate (3.9% Morningstar 2026 base, 4% classic, or 5.7% flexible) on the portfolio value at full retirement.
- **FR‑SIM‑06** — Produce a parallel projection with Social Security excluded entirely, for the longevity stress comparison.
- **FR‑SIM‑07** — Apply **Required Minimum Distributions** as a post‑solve floor on the year's withdrawal. The pre‑tax (tax‑deferred) portion of savings is the user's "pre‑tax 401(k)/IRA share" (entered as a percent of, or dollar slice of, combined savings — the same figure that sets the ordinary‑income share of withdrawals). RMDs begin at the SECURE 2.0 first‑RMD age derived from birth year (73 for born 1951–1959, **75 for born 1960+**) and equal the prior‑year‑end tax‑deferred balance ÷ the IRS Uniform Lifetime divisor. When a year's RMD exceeds the need‑based deferred draw, the engine forces the extra distribution, taxes it as ordinary income, and **reinvests the after‑tax remainder into the taxable portfolio**; the plan always takes the RMD on schedule, so no excise penalty is incurred in‑plan. With a zero pre‑tax share the path is inert and the timeline is unchanged.
  - **AC** — With the pre‑tax share at 100% and a long horizon, withdrawals and tax step up once the older spouse reaches 75 even when the need‑based draw is small; with the share at 0% the timeline matches the prior (no‑RMD) behavior.
- **FR‑SIM‑08** — Support discretionary **life-event spending** added to the year's need: one-time events (gifts, weddings, home help) and **recurring** events with a cadence and optional end year (e.g. vehicle replacement every ~10 years, ongoing home upkeep). Defaults are provided (all off, today's dollars) and are fully user-editable; recurring events also appear as badges in the year-by-year navigator. **AC** — A vehicle event at $45k every 10 years raises `extraSpend` only in its cadence years; toggling it off restores the prior timeline.

### 6.7 Age-Banded Healthcare and the Pre-65 Bridge

**Description.** Make healthcare cost depend on age, reflecting the jump before Medicare.

- **FR‑HC‑01** — Carry two healthcare figures per location: a **before‑65** (ACA marketplace) cost and a **65+** (Medicare or local) cost.
- **FR‑HC‑02** — In the year‑by‑year timeline, raise the spending need before age 65 by the per‑person pre‑65 healthcare premium for a **chosen retirement location**, applied for each spouse under 65, then drop it at 65.
- **FR‑HC‑03** — Reflect geography correctly: U.S. healthcare falls sharply at 65 (Medicare); European public systems fall modestly; the Bahamas rises with age (no Medicare abroad, age‑rated private cover).
- **FR‑HC‑04** — Expose a "healthcare basis" location selector controlling the magnitude of the bridge bump.
- **AC** — Selecting a U.S. basis produces a visibly higher need before 65 (on the order of ~$17k/yr for two people) that disappears at 65; selecting a European basis produces a much smaller change.

### 6.8 Social Security Funding-Risk Scenarios

**Description.** Let the user model partial or zero Social Security funding and see the cascade.

- **FR‑RISK‑01** — Provide a funding‑scenario control with three modes: **Congress acts (100%)**, **Trustees' projection (81%)**, and **Custom**.
- **FR‑RISK‑02** — In Custom mode, accept a "benefits payable" percentage (0–100%) and a "reduction starts" year.
- **FR‑RISK‑03** — Apply the chosen haircut to Social Security benefits for all years on/after the start year, in both the steady‑state synthesis and the year‑by‑year simulation.
- **FR‑RISK‑04** — Present a risk panel comparing **100% / 81% / 0%** scenarios on: household Social Security, total after‑tax income, and the age savings last.
- **FR‑RISK‑05** — Compute and display a plain‑language takeaway: Social Security's share of income, the dollar impact of the 81% case, and whether the plan stays on track under each scenario.
- **FR‑RISK‑06** — Indicate the active scenario near the headline result.

### 6.9 Inherited Real Estate Module

**Description.** Model two potentially inherited homes and the tax economics of three strategies each.

- **FR‑INH‑01** — Support two properties: a Texas home (default value $790,000) and a Klagenfurt, Austria home (default ~$324,000, ≈ €300,000).
- **FR‑INH‑02** — For each property, accept an include toggle, a today's‑value figure, a year received, and a strategy: **Sell**, **Rent out**, or **Live in**.
- **FR‑INH‑03** — Compute each strategy's after‑tax outcome:
  - **Sell** → net lump sum after taxes and selling costs (Texas ≈ 93% via U.S. basis step‑up; Austria ≈ 90% after transfer + capital‑gains tax).
  - **Rent** → net annual income (Texas ≈ 3.5% of value; Austria ≈ 2.0%).
  - **Live in** → net annual housing saving (rent avoided minus ownership carrying cost); can be negative where property tax is high (Texas).
- **FR‑INH‑04** — Surface concise cross‑border tax notes per strategy (basis step‑up, no Texas estate/inheritance/income tax, $15M federal exemption; Austrian transfer tax ~1.85%, 30% or 4.2% capital‑gains on later sale with no step‑up, foreign tax credit limits, Form 3520).
- **FR‑INH‑05** — Wire the chosen strategy into the timeline: a sale adds a lump sum to the portfolio in its year; renting adds an income band; living‑in reduces the spending need.
- **FR‑INH‑06** — Reflect inheritance effects in the steady‑state synthesis (later sales added to the withdrawal base; rental added to guaranteed income; living‑in surfaced as housing saved).

### 6.10 Places: International Cost-of-Living

**Description.** Translate the after‑tax income into a lifestyle verdict across fourteen places.

- **FR‑ATLAS‑01** — Provide fourteen locations spanning low‑cost Europe, Western Europe, several U.S. cost tiers, and the Caribbean.
- **FR‑ATLAS‑02** — For each location, hold monthly line items (rent for a 2–3BR quiet‑area home, groceries, utilities, transport, dining, entertainment, other) plus the two healthcare bands, a VAT/consumption‑tax note, and an income‑tax note.
- **FR‑ATLAS‑03** — Compute each location's annual cost of living for the selected household size and healthcare basis, and compare it to the after‑tax income.
- **FR‑ATLAS‑04** — Assign a **lifestyle tier** (Tight, Modest, Comfortable, Affluent, Luxurious) from the income‑to‑cost ratio.
- **FR‑ATLAS‑05** — Provide a **Couple / Single** toggle (single scales costs to ~64% of couple) and a **Before‑65 / 65+** healthcare toggle.
- **FR‑ATLAS‑06** — Sort locations by cost and render an income reference line on each bar.
- **FR‑ATLAS‑07** — Expand any location to show line items, total, income‑vs‑budget surplus and multiple, a future‑dollar cost at the projected retirement year, an age‑specific healthcare note, and the tax profile.

### 6.11 Two-Location Side-by-Side Comparison

**Description.** Compare any two locations directly.

- **FR‑CMP‑01** — Provide two location selectors.
- **FR‑CMP‑02** — Render a category‑by‑category monthly table with the cheaper figure highlighted per row, plus monthly and annual totals.
- **FR‑CMP‑03** — Render a summary card per location: annual cost, lifestyle tier, income surplus and multiple, future‑dollar cost, and tax profile.
- **FR‑CMP‑04** — State the annual difference and which location is cheaper, respecting the household‑size and healthcare‑basis toggles.

### 6.12 Steady-State Income Synthesis and Verdict

**Description.** Combine all sources into a single sustainable, after‑tax income and a verdict.

- **FR‑STEADY‑01** — Compute gross sustainable income = portfolio withdrawal (at the chosen rate on the full‑retirement balance plus any later property sales) + household Social Security (after any haircut) + pension + net rental.
- **FR‑STEADY‑02** — Subtract estimated federal tax to yield net sustainable income (the headline).
- **FR‑STEADY‑03** — Display an "on track" verdict comparing guaranteed income + withdrawal to the spending goal.
- **FR‑STEADY‑04** — Show supporting tiles: portfolio at full retirement, guaranteed‑for‑life income, how long savings last (with and without Social Security), and federal tax.
- **FR‑STEADY‑05** — Render an income‑mix bar decomposing gross income into withdrawal, rental, Social Security, and pension.

### 6.13 Visualizations and Charts

**Description.** Make the plan legible at a glance.

- **FR‑VIZ‑01** — **Staircase chart**: stacked areas of each income source by year, with a dashed, healthcare‑aware spending‑need line.
- **FR‑VIZ‑02** — **Balance chart**: portfolio value over time, modeled scenario vs. a Social‑Security‑eliminated worst case, with a marker where an inherited home is sold.
- **FR‑VIZ‑03** — **Places bars**: per‑location cost with an income reference line and tier badge.
- **FR‑VIZ‑04** — **Income‑mix bar** and **comparison table** as above.
- **FR‑VIZ‑05** — Tooltips reveal per‑year composition and the spending need.
- **FR‑VIZ‑06** — **Year-by-year navigator**: an advanceable single-year detail (slider + prev/next + play). For the selected year it shows a *typical month* (the year's totals ÷ 12) as a mirrored bar — non‑portfolio income and the portfolio draw stack upward, expenses (core living, travel/one‑time, taxes) stack downward from a zero baseline, so the portfolio draw visibly bridges the gap — plus a composition donut of income sources and a surplus/net summary. Because the engine is annual, the view is an honest per‑month *rate*: genuinely one‑time items (home sale, first RMD year, Medicare at 65, SS/pension start, work‑stop, survivor transition, depletion) are surfaced as flagged milestone badges for the year rather than placed in a specific month. See UC‑18.

### 6.14 Return Assumptions and Monte Carlo Bands (Wave 1 — B1)

**Description.** Let users choose a named real-return preset and see a probability distribution band on the long-run chart rather than a single deterministic line.

- **FR‑MC‑01** — Provide four return presets selectable in the Advanced step: **Conservative** (~3.5% real), **Balanced** (~5.0% real), **Growth** (~6.5% real), and **Custom** (user-entered value). Source: CFA Institute / Carson Group 60-40 historical-return research.
- **FR‑MC‑02** — Provide a **variability ±%** slider (default ±7%) representing annualised standard deviation applied to the lognormal Monte Carlo paths.
- **FR‑MC‑03** — Run a debounced Monte Carlo simulation (≥200 lognormal paths) automatically whenever inputs change; display the **median** portfolio balance as the primary line, with a shaded **p10–p90** band on the long-run balance chart. The band renders by default without requiring an explicit user action.
- **FR‑MC‑04** — Show the median terminal balance plus the 10th- and 90th-percentile values in the chart headline so the range of outcomes is immediately legible.
- **AC** — Switching from Balanced to Conservative visibly narrows and lowers the band; increasing variability widens it. With variability = 0 the band collapses to the deterministic line, matching the prior single-path output exactly.

### 6.15 Sequence-of-Returns Stress Toggle (Wave 1 — B2)

**Description.** Let users stress-test their plan against a bad first-decade return sequence.

- **FR‑STRESS‑01** — Provide an opt-in **"Bad first decade"** toggle in the Advanced step that overlays a sequence-of-returns stress path on the long-run balance chart.
- **FR‑STRESS‑02** — The stress path applies −10% real returns in retirement years 1–3, `realReturn − 2%` in years 4–6, and the base assumption from year 7 onward (deterministic, illustrative — not a Monte Carlo draw).
- **FR‑STRESS‑03** — Render the stress path as a distinct line (brass/dotted) so it is visually separate from the median Monte Carlo line and the p10–p90 band.
- **FR‑STRESS‑04** — Include a caption noting the stress path is illustrative and milder than historical bear markets; direct users to the Monte Carlo band for a probabilistic range.
- **AC** — Toggling the stress path on shifts the balance line downward in early retirement years and may move the depletion age earlier; toggling it off restores the base projection.

### 6.16 Retirement Spending Smile (Wave 1 — C1)

**Description.** Allow the non-housing spending base to follow an age-shaped trajectory (Blanchett "smile") instead of being held flat in real terms.

- **FR‑SMILE‑01** — Provide a **Retirement spending** step with three shape options: **Flat** (default, existing behavior), **Smile** (Blanchett curve), and **Custom** (user-defined multiplier table).
- **FR‑SMILE‑02** — In Smile mode, scale the non-housing base spending by an age-shaped multiplier: real spending declines through the "go-go" and "slow-go" phases, then upticks in the late-life "no-go" phase. Healthcare costs are added on top of the scaled base (not scaled themselves).
- **FR‑SMILE‑03** — Source the Blanchett curve to peer-reviewed research (Blanchett 2014, *Journal of Financial Planning*). Surface a source caption in the UI near the control.
- **FR‑SMILE‑04** — The Flat default leaves all existing plans numerically unchanged (backward-compatible).
- **AC** — Selecting Smile with default inputs produces lower spending in ages 70–80 and a visible late-life upturn; the staircase chart spending-need line reflects the shape year-by-year.

### 6.17 Lifestyle Level and Permanent Step-Changes (Wave 1 — C2)

**Description.** Let users set an overall lifestyle scaling factor and schedule permanent up- or down-shifts in annual spending.

- **FR‑LSTEP‑01** — Surface a **lifestyle level** percentage dial (default 100%) in the Retirement spending step that scales the non-housing spending base. Range: 50%–150%.
- **FR‑LSTEP‑02** — Allow the user to add **permanent step-change rows** `{ fromYear, deltaAnnual }` that shift the annual spending base up or down from a calendar year onward (e.g. downsizing savings from a chosen year).
- **FR‑LSTEP‑03** — Step-changes are cumulative and permanent: each `fromYear` shifts the running base, and later rows stack on top of earlier ones.
- **FR‑LSTEP‑04** — Step-changes are discretionary and excluded from the floor base (`_floorBase`); they do not affect the 35% spending floor.
- **AC** — Adding a −$6,000/yr step from a chosen year reduces the spending-need line from that year onward on the staircase chart; removing the row restores the prior trajectory.

### 6.18 Typed Life Events with Emergent Flag (Wave 1 — C3)

**Description.** Extend life events with explicit types (gift, purchase, windfall) and an "emergent" flag that separates planned from unplanned spending for scenario comparison.

- **FR‑EVT‑01** — Extend event objects with a **type** field: `gift` (outflow), `purchase` (outflow), or `windfall` (inflow — nets negative against spending need).
- **FR‑EVT‑02** — Add an **emergent** boolean flag per event. Emergent events (e.g. a roof replacement, unexpected medical cost) are excluded from the baseline simulation but included in a parallel **simShock** scenario.
- **FR‑EVT‑03** — Display a **Baseline vs. Shock** comparison that shows the plan with and without emergent events, so the user can see the buffer their plan must carry for surprises.
- **FR‑EVT‑04** — Non-emergent events behave identically to the existing `FR‑SIM‑08` life events; the emergent flag is additive and does not break backward compatibility.
- **AC** — Flagging a $25,000 roof replacement as emergent removes it from the baseline balance but includes it in the shock scenario; the depletion age in the shock scenario may differ from the baseline.

### 6.19 Accumulation Summary Card (Wave 1 — A3)

**Description.** Show a read-out card summarising portfolio growth during the working years, visible while at least one spouse is still working.

- **FR‑ACC‑01** — Display an **accumulation summary** card while the household is in the working phase (i.e. at least one spouse's stop-working age has not yet been reached).
- **FR‑ACC‑02** — The card shows: **projected balance at retirement** (the portfolio value when the last spouse stops working), **total contributed** (sum of all contributions during working years), **total growth** (balance minus contributions minus starting savings), and **effective blended real return** (the IRR of the contribution stream to the retirement balance).
- **FR‑ACC‑03** — "Working years" is defined as years where at least one spouse is still working (OR condition); the card disappears once both have retired.
- **AC** — Increasing the annual contribution visibly raises "total contributed" and "projected balance at retirement"; increasing the real return raises "total growth" and the effective blended return.

### 6.20 Live Headroom Read-Out (Wave 1 — E1)

**Description.** Show, in real time, the maximum sustainable annual spending increase to the plan horizon — or, if the plan is short, the annual shortfall and the depletion age.

- **FR‑HEAD‑01** — Compute and display a **headroom** figure: the maximum additional annual spending the plan can absorb while keeping the portfolio solvent to the horizon age (default 95), given all active inputs.
- **FR‑HEAD‑02** — If the plan is already short (depletion age < horizon), display the **annual shortfall** (how much more guaranteed income or less spending is needed each year) and the **depletion age** instead of headroom.
- **FR‑HEAD‑03** — Recompute headroom live (debounced) whenever any input changes, using the same simulation engine as the main projection.
- **FR‑HEAD‑04** — Surface the headroom read-out prominently near the headline result so it is immediately visible without scrolling.
- **AC** — Increasing the spending target reduces headroom; decreasing it increases headroom. A plan with a depletion age of 88 shows a shortfall figure, not a headroom figure.

### 6.21 Guidance, Notes and Disclaimers

**Description.** Translate the numbers into action and bound their authority.

- **FR‑NOTE‑01** — Provide a "Planner's notes" section with contextual guidance (Texas sell/rent vs. hold; Klagenfurt live‑in advantage; pre‑65 healthcare cliff; Social Security as a sizable but bounded risk; foreign‑inheritance paperwork; treaty/foreign‑tax‑credit caution; sticky high‑tax states).
- **FR‑NOTE‑02** — Provide a persistent disclaimer that outputs are planning estimates, not financial/tax/legal advice, and direct the user to SSA, DRS, and a cross‑border specialist for binding figures.
- **FR‑NOTE‑03** — All Wave 1 controls (Monte Carlo bands, spending smile, lifestyle steps, emergent events, accumulation summary, headroom) are **planning-grade** additions; their source citations appear in the UI near each control and in `docs/sources.md`.
- **FR‑NOTE‑04** — All Wave 2 housing, residence-tax, and relocation features are **planning-grade**. International residence tax uses effective net-of-treaty estimates, not statutory treaty computations. The transition year uses a clean jurisdiction switch (Federal Pension Source Tax Act convention), not a 183-day apportionment. Users should consult a cross-border specialist for binding figures.

### 6.22 Housing and Mortgage Module (Wave 2 — H1)

**Description.** Model the household's primary housing cost explicitly — as rent, mortgage, or owned carrying cost — so it is tracked as a separate engine flow rather than buried in the spending-need percentage.

- **FR‑MORT‑01** — Accept a housing **tenure** selector: `rent`, `mortgage`, or `own` (paid-off).
- **FR‑MORT‑02** — For `mortgage` tenure, accept: home value, down-payment percentage, loan term (years), annual interest rate, and origination year. Compute the fixed monthly P&I via the standard amortization formula; expose `payoffYear` = origination year + term.
- **FR‑MORT‑03** — Mortgage P&I is the engine's **sole nominal cash flow**. It is deflated each year by `(1 + s.inflation)^y` to convert to real dollars and zeroed at `payoffYear`, producing a "housing-cost cliff" that is visible on the staircase chart. `s.inflation` is a real engine input for this purpose — not merely a display label.
- **FR‑MORT‑04** — Rent and `own` carrying costs (property tax, insurance, maintenance) are modeled as **real-flat** amounts, consistent with the rest of the engine.
- **FR‑MORT‑05** — For `mortgage` and `own` tenure, surface a **location property tax** line: `propertyTaxRate × homeValue`, using the county-level rate for the selected retirement location (planning-grade approximation, L14).
- **FR‑MORT‑06** — Display a "Mortgage paid off" milestone badge in the year-by-year navigator at `payoffYear`.
- **AC** — Switching tenure from `rent` to `mortgage` moves rent out of the spending need and replaces it with the amortizing P&I line; the staircase chart shows the cliff when P&I drops to zero at payoff.

### 6.23 Non-Housing Spending Floor Policy (Wave 2 — H2)

**Description.** Refine the 35% spending floor so it applies only to non-housing essentials; housing is always paid in full outside the floor calculation.

- **FR‑FLOOR‑01** — The 35% floor (`0.35 × _floorBase`) applies to **non-housing** spending only. `_floorBase` never includes housing costs.
- **FR‑FLOOR‑02** — Housing (P&I, or rent, or carrying cost) is added to the spending need **after** the floor is applied, so it is always funded in full regardless of how low non-housing costs fall.
- **FR‑FLOOR‑03** — The Wave-0 floor note in `seams.js` is updated to record this Wave 2 decision.
- **AC** — A scenario with a very low non-housing targetPct still pays the full mortgage P&I; the floor cannot suppress housing.

### 6.24 Housing-Explicit Spending Need (Wave 2 — H3)

**Description.** Reframe `targetPct` as a **non-housing lifestyle** percentage (default retuned from 0.40 to 0.28) and add housing as its own explicit line in the spending need, resolving the prior double-count (L8 — RESOLVED).

- **FR‑HEXP‑01** — `targetPct` (and its location-basis equivalent) now represents the **non-housing** lifestyle share. Housing cost is computed separately by FR‑MORT‑01..05 and added outside the lifestyle base.
- **FR‑HEXP‑02** — The default `targetPct` is retuned to 0.28 (from 0.40) to reflect the narrower non-housing scope. Existing plans that have not saved a custom value receive the new default; the UI surfaces this change with an explanatory note.
- **FR‑HEXP‑03** — When the location spending basis is active, the location basket **excludes the rent line** (to avoid double-counting when housing-explicit mode is on); housing is supplied by the tenure module instead.
- **AC** — With housing-explicit mode on and `mortgage` tenure, the staircase shows two distinct need components: non-housing lifestyle and housing P&I. No rent appears in the basket.

### 6.25 Inherited Live-In to Owned Tenure (Wave 2 — H4)

**Description.** When an inherited home is set to "Live in," treat it as an owned-tenure transition rather than applying a generic housing-saving credit.

- **FR‑LIVEIN‑01** — An inherited property with strategy `live` switches the household's housing tenure to `own` (carrying cost only) from the year the property is received. No rent-avoided credit is stacked on top of the housing line.
- **FR‑LIVEIN‑02** — The carrying cost for the inherited home uses the property's `ownRate` constant (Austria: 1.2% of value; Texas: 2.7%). This is the same rate used in UC-9, now routed through the tenure module rather than applied as a spending-need reduction.
- **FR‑LIVEIN‑03** — The old double-count (live-in credit applied inside the spending need while housing was also charged) is eliminated. L8 is marked RESOLVED.
- **AC** — Selecting "Live in" for the Klagenfurt home shows carrying cost (~$3,900/yr on €300k) as the housing line, not a negative spending credit.

### 6.26 Typed Residence Tax — US States (Wave 2 — T1)

**Description.** Replace the flat `addlTaxRate` override with an income-type-aware residence-tax layer for ~14 curated US states, composing on the federal engine without forking it.

- **FR‑RES‑01** — Provide a **US state picker** covering ~14 states with meaningful retirement-income tax profiles (e.g. WA — no income tax; TX — no income tax; CA — highest marginal rate; FL — no income tax; NV — no income tax; OR, MN, VT — tax most retirement income; IL, PA — flat rate, exempt pension; and others).
- **FR‑RES‑02** — For each state, hold per-income-type rates or exemptions: ordinary income rate, pension exemption flag, Social Security exemption flag, and capital-gains treatment.
- **FR‑RES‑03** — The residence-tax layer (`residenceTax.js`) receives the same income breakdown used by the federal engine and applies state rates **after** federal tax is computed. `calculateFederalTaxYear` is never modified; the federal engine is the single source of truth for federal liability.
- **FR‑RES‑04** — For the untyped / override path (`addlTaxRate` set manually), the layer reduces to `ordinaryIncome × addlTaxRate`, matching prior behavior exactly. No existing plan is broken.
- **AC** — Switching from WA to CA raises the residence-tax line by the CA marginal rate on ordinary retirement income; switching to FL returns the layer to zero.

### 6.27 Typed Residence Tax — International and Treaty (Wave 2 — T2)

**Description.** Extend the residence-tax layer to international retirement locations with treaty-aware per-income-type effective rates, keeping the computation planning-grade (no statutory treaty article citations).

- **FR‑TREATY‑01** — For international locations, apply effective net-of-treaty rates per income type: (a) **WA DRS government pension** — excluded from foreign residence tax under the government-employee pension source rule (modeled as `pensionExclusion: "full"`); (b) **IRA/401(k) draws** — residence-taxed at an effective net-of-treaty rate (after a modeled Foreign Tax Credit offset); (c) **Social Security** — per the bilateral treaty flag for the selected country; (d) **Roth withdrawals** — never taxed by the residence country.
- **FR‑TREATY‑02** — The engine does not compute any specific treaty article; it applies **planning-grade effective rates** only. Austria's effective rate is modeled at approximately 0% after the FTC and is explicitly captioned "verify with a cross-border specialist" in the UI.
- **FR‑TREATY‑03** — The `activeJurisdiction(i, cal)` function returns the correct residence-country record for each simulation year, switching at `relocationYear` (FR‑RELO‑01).
- **FR‑TREATY‑04** — The dual-tax exposure panel (FR‑DTAX‑01) surfaces the worldwide US taxation obligation, FTC estimate, and filing flags separately from the residence-tax computation.
- **AC** — Selecting Austria as retirement location: pension line shows 0 residence tax (government-pension exclusion); IRA draws show a small residual after the FTC; Roth shows 0. Selecting a country with no US treaty shows a higher effective rate on IRA draws.

### 6.28 Dual-Tax Exposure Panel (Wave 2 — T3)

**Description.** For international retirement, surface the worldwide US tax obligation, Foreign Tax Credit, government-pension source rule, and cross-border filing flags as a planning-grade informational panel.

- **FR‑DTAX‑01** — When the retirement location is outside the US, display a **Dual-Tax Exposure** panel showing: (a) estimated US worldwide tax on all income (US citizens taxed globally); (b) estimated Foreign Tax Credit from residence-country tax paid; (c) net US tax after FTC; (d) the government-pension source rule note (WA DRS pension taxable only by the US under treaty); (e) applicable filing flags — Form 3520 (foreign trusts/gifts), FBAR (foreign accounts > $10k), FATCA (foreign assets > threshold).
- **FR‑DTAX‑02** — The panel is **planning-grade only**. It carries a persistent "Consult a cross-border tax specialist" disclaimer and does not produce a tax return or binding liability estimate.
- **FR‑DTAX‑03** — Filing flags are informational; the engine does not model penalties or compliance costs.
- **AC** — With an Austrian retirement location, the panel shows the FTC largely offsetting US tax on Austrian-source income; the government-pension line shows zero Austrian tax and full US tax; Form 3520 / FBAR flags appear if the user has indicated foreign accounts.

### 6.29 Work-vs-Retire Two-Location Split (Wave 2 — L1)

**Description.** Allow the household to specify separate work and retirement locations with a relocation year, so the correct tax jurisdiction is applied in each life phase.

- **FR‑RELO‑01** — Accept `workLoc`, `retireLoc`, and `relocationYear`. Before `relocationYear`, wages are taxed at `workLoc`'s residence-tax rate; from `relocationYear` onward, retirement income is taxed at `retireLoc`'s rate.
- **FR‑RELO‑02** — `workLoc` is a **tax jurisdiction only** — it does not change the cost-of-living basket or spending need (L12).
- **FR‑RELO‑03** — The pre-65 ACA healthcare bridge gates on **not working** (i.e. both spouses retired), not on age alone, from `relocationYear` onward. This fixes the prior bug where wages were taxed at the retirement state's rate and the ACA bridge fired at the wrong age.
- **FR‑RELO‑04** — When `workLoc === retireLoc` (no relocation), behavior is identical to the pre-Wave-2 single-location path.
- **AC** — A CA → NV move at `relocationYear` shows CA income-tax rates on wages before the move and zero NV income tax on retirement income after; the staircase shows a visible residence-tax cliff at the relocation year.

### 6.30 Relocation Home Transition (Wave 2 — L2)

**Description.** At relocation, handle the work-location home (if owned or mortgaged) — default sell with net proceeds to portfolio, or keep as rental — and switch to the retirement-location housing.

- **FR‑HTRANS‑01** — When `workLoc ≠ retireLoc` and the work-home tenure is `mortgage` or `own`, offer a **home transition** selector at relocation: `sell` (default) or `keep as rental`.
- **FR‑HTRANS‑02** — **Sell (default):** net proceeds = estimated sale value × 0.93 − remaining mortgage balance. The net amount is added to the portfolio in `relocationYear`; work-home P&I is zeroed from that year; housing switches to `retireLoc` tenure.
- **FR‑HTRANS‑03** — **Keep as rental:** the work-home mortgage P&I continues as a landlord cost; net rental income (work-home `rentYield × value`) is added to the income stream. Property tax, insurance, and upkeep on the retained home are not modeled (L13).
- **FR‑HTRANS‑04** — Sale value is user-estimated and captioned as a planning-grade figure; the 93% net factor encodes typical selling costs (~6–7%) and assumes no capital-gains tax for a primary residence (§121 exclusion, subject to the 2-of-5-year use test).
- **FR‑HTRANS‑05** — When `workLoc === retireLoc` and the home is mortgaged, the mortgage spans the work-to-retire boundary unchanged; no transition is triggered.
- **AC** — Selling the work home at relocation adds the net proceeds to the portfolio balance visible on the balance chart; a "Home sold at relocation" milestone badge appears in the navigator for `relocationYear`.

### 6.31 Month-View Housing Itemization (Wave 2 — L3)

**Description.** Show housing costs as distinct labeled sub-lines in the monthly breakdown navigator, separate from core living expenses.

- **FR‑MHOUSING‑01** — In the year-by-year monthly breakdown (FR‑VIZ‑06), display housing as its own expense sub-line: **Rent** (for `rent` tenure) or **Mortgage P&I** + **Property tax** (for `mortgage`/`own` tenure), labeled accordingly.
- **FR‑MHOUSING‑02** — Housing sub-lines are separate from the "Core living" expense bar; the month view shows three expense categories: Housing, Core living (non-housing lifestyle), and Taxes.
- **FR‑MHOUSING‑03** — A **"Mortgage paid off"** milestone badge appears in the navigator for `payoffYear` (see FR‑MORT‑06).
- **AC** — In a mortgage year, the expense side of the mirrored bar shows both a "Mortgage P&I" segment and a "Core living" segment; in the payoff year a milestone badge appears; after payoff only "Property tax / carrying cost" remains under Housing.

---

## 7. Reference Data and Assumptions

All constants are 2026 values. The companion Sources document links each to its origin.

| Domain | Key constants used |
| --- | --- |
| Federal tax | 2026 marginal brackets (Single and MFJ); standard deduction $16,100 / $32,200; age‑65 additional standard deduction; senior bonus deduction $6,000 (per eligible filer, 2025–2028) with MAGI phase‑out |
| Social Security | PIA bend points $1,286 and $7,749; taxable wage cap $184,500; Full Retirement Age 67; early/delayed factors; benefit‑taxation provisional‑income thresholds ($25k/$34k single, $32k/$44k MFJ) |
| SS solvency | Combined trust funds projected depletion ~2034 with ~81% of scheduled benefits payable (OASI alone ~2033, ~77%), declining over time, absent Congressional action |
| WA DRS pension | Plan 2 = 2%/yr, Plan 3 = 1%/yr; AFC = highest 60 consecutive months; full benefit at 65; early‑retirement factor table for 20–29 years; 5%/yr for 30+ years |
| Withdrawal rate | 3.9% (Morningstar 2026 base), 4% (classic), 5.7% (flexible guardrails) |
| Healthcare | Medicare 2026 Part B $202.90/mo each; couple Medicare‑era ≈ $900–1,150/mo; pre‑65 ACA couple ≈ $2,000–2,600/mo (benchmark Silver ~$1,400/person at 62–64); Medicare does not cover care abroad |
| Cost of living | Fourteen locations, monthly couple line items in USD, with VAT and income‑tax notes |
| Inheritance — US/TX | Basis step‑up to date‑of‑death value; no Texas estate/inheritance/income tax; federal estate exemption $15M/person ($30M couple); Texas property tax ~1.7%/yr |
| Inheritance — Austria | No inheritance tax (abolished 2008); transfer tax + registration ≈ 1.85% on inheriting; later sale taxed 30% of gain or 4.2% of price (pre‑2002), no step‑up; 5‑of‑10‑year primary‑residence exemption |
| Macro | Configurable real return (default 5%), inflation (default 2.5%), taxable share of withdrawals (default 70%); single‑household scaling ≈ 64% of couple costs. **Wave 2 note:** `s.inflation` graduates from a display‑only label to a real engine input: mortgage P&I is the engine's sole nominal cash flow, deflated each year by `(1 + inflation)^y` and zeroed at payoff. All other costs remain real‑flat. |

---

## 8. UX and Design Requirements

- **UX‑01** — Mobile‑first, responsive single‑column layout that expands to a two‑column (inputs / results) layout on wider screens.
- **UX‑02** — Live recalculation: no save/submit; every control updates results immediately.
- **UX‑03** — Inputs grouped into clear steps: household, timing & benefits, pension, inheritance, and an optional "assumptions" panel.
- **UX‑04** — Progressive disclosure: advanced assumptions and per‑location breakdowns are collapsed by default.
- **UX‑05** — Editorial, legible visual style (serif display headings, sans body, monospace figures), restrained color, and accessible contrast.
- **UX‑06** — Charts are interactive (tooltips, legends) and degrade gracefully on narrow screens.
- **UX‑07** — Numbers are formatted consistently ($ thousands abbreviated where space‑constrained), and negative values are clearly signed.

---

## 9. Non-Functional Requirements

- **NFR‑01 — Self‑contained.** A single `.jsx` file with no external state services; renders in the target artifact environment.
- **NFR‑02 — No browser storage.** No `localStorage`/`sessionStorage`; all state is in‑memory for the session.
- **NFR‑03 — Deterministic.** Identical inputs always produce identical outputs (no randomness).
- **NFR‑04 — Performant.** All projections (multiple full‑life simulations) recompute within an interaction frame on a typical device.
- **NFR‑05 — Maintainable.** 2026 constants are centralized and labeled with their source domain for annual updates.
- **NFR‑06 — Accessible.** Honors reduced‑motion preferences; controls are keyboard/tap friendly.

---

## 10. Constraints and Known Limitations

- **L1** — Social Security is estimated from current income treated as a career‑average proxy; it tends to run slightly high. Users should reconcile with their SSA statement.
- **L2** — No sequence‑of‑returns or market‑volatility modeling; a single real return is assumed.
- **L3** — Pre‑65 ACA figures are **unsubsidized**; real cost can be much lower if taxable income is managed to qualify for premium tax credits.
- **L4** — State income tax is precise only for the Washington resident case (none); elsewhere it is qualitative.
- **L5** — Inheritance outcomes use **simplified net factors**; the Austrian sale tax in particular depends on the decedent's acquisition date (Altvermögen vs. Neuvermögen) and currency‑basis effects, which require a specialist.
- **L6** — Cost‑of‑living figures are aggregated planning estimates that vary by city, neighborhood, and lifestyle.
- **L7** — Single‑person scaling is a flat factor, not a re‑costed budget.
- **L8** — ~~The "live‑in" housing saving is applied to the spending need generically; for full fidelity the healthcare basis should be matched to the live‑in country.~~ **RESOLVED (Wave 2):** the housing‑explicit spending model (FR‑HEXP‑01) separates housing from the non‑housing lifestyle base; live‑in tenure uses owned carrying cost, not a generic saving credit. The old double‑count is eliminated.
- **L9** — RMDs use a **commingled‑account simplification**: a single tax‑deferred pool driven by the **older** spouse's age and first‑RMD age, rather than per‑owner accounts. Roth balances are assumed to be the non‑deferred share (exempt). The steady‑state "sustainable income" headline is left on the SWR basis and does not re‑apply the RMD floor — at the steady‑state age a 4% SWR draw already meets or exceeds the ~4.1% RMD, so the floor is non‑binding there.
- **L10** — The relocation transition year is simplified: income, tax, and costs are not apportioned within the year (no 183‑day partial‑year split). The Federal Pension Source Tax Act convention (clean jurisdiction switch at the year boundary) is the modeling license for this simplification; a cross‑border specialist should be consulted for binding residency determinations.
- **L11** — International residence tax is an **effective net‑of‑treaty planning‑grade estimate**, not a statutory treaty computation. No treaty article is cited as authoritative; the engine applies per‑income‑type flags (government pension excluded abroad, IRA/401(k) draws at an effective net rate, Social Security per treaty flag, Roth never taxed). Austria's effective rate is modeled optimistically (~0 after the Foreign Tax Credit) and is explicitly flagged "verify with a cross‑border specialist."
- **L12** — The working‑years cost‑of‑living basket does **not** switch to the work location; `workLoc` is a tax jurisdiction only, not a cost basket. Spending need during working years continues to reflect the retirement location (or the income‑basis default).
- **L13** — "Keep as rental" at relocation: only the work‑home mortgage P&I is charged as a landlord cost; property tax, insurance, and maintenance on the retained home are not yet modeled.
- **L14** — Property tax and local income tax rates are county‑level approximations and may not match the filer's exact municipality.

---

## 11. Out of Scope

- Filing or transmitting any tax return; generating legal documents.
- Long‑term‑care insurance modeling, annuities, or insurance products.
- Detailed Roth‑conversion‑window optimization (offered as a possible future addition, not built).
- ~~A spending "smile" (age‑declining real spending) — not modeled~~ — now implemented (C1).
- Survivor‑only scenarios (income if one spouse dies) — not modeled in this version.
- Currency‑risk modeling for foreign income/assets beyond a fixed conversion assumption.

---

## 12. Glossary

| Term | Meaning |
| --- | --- |
| **AFC** | Average Final Compensation — average of the teacher's highest 60 consecutive months of pay; the pension base |
| **Amortization cliff** | The drop in monthly housing cost when the last mortgage payment is made and P&I falls to zero |
| **activeJurisdiction** | Engine function returning the correct residence-country tax record for a given simulation year |
| **AGI / MAGI** | (Modified) Adjusted Gross Income — drives deduction phase‑outs and benefit taxation |
| **Altvermögen / Neuvermögen** | Austrian "old"/"new" real estate (acquired before / after 31 March 2002), determining the capital‑gains method on sale |
| **Bend points** | Income breakpoints in the Social Security PIA formula |
| **Bridge years** | The pre‑65 period after retiring but before Medicare eligibility |
| **DRS** | Washington State Department of Retirement Systems |
| **ERF** | Early Retirement Factor — actuarial reduction for claiming a pension before 65 |
| **Grunderwerbsteuer (GrESt)** | Austrian real‑estate transfer tax |
| **Haircut** | A proportional reduction applied to scheduled Social Security benefits |
| **ImmoESt** | Austrian real‑estate capital‑gains tax on a sale |
| **OASI / OASDI** | Old‑Age & Survivors Insurance (retirement) / plus Disability Insurance |
| **PIA** | Primary Insurance Amount — the Social Security benefit at Full Retirement Age |
| **Step‑up in basis** | U.S. reset of an inherited asset's cost basis to its date‑of‑death value |
| **Steady state** | The long‑run period after both spouses have retired and all benefits flow |
| **SWR** | Safe Withdrawal Rate |
| **TRS / SERS** | Washington Teachers' / School Employees' Retirement Systems |
| **FTC** | Foreign Tax Credit — US tax credit for income tax paid to a foreign residence country |
| **FBAR** | FinCEN Report 114 — required when foreign financial accounts exceed $10,000 at any point in the year |
| **FATCA** | Foreign Account Tax Compliance Act — Form 8938 filing threshold for foreign financial assets |
| **Government-pension source rule** | Treaty convention under which a government-employer pension (e.g. WA DRS) is taxable only by the country of the government that paid it (the US), not the country of residence |
| **Housing-explicit need** | Wave 2 spending model where mortgage/rent/carrying cost is a separate engine line outside the lifestyle percentage |
| **Net-of-treaty rate** | Planning-grade effective residence-tax rate on a given income type after accounting for treaty exemptions and the Foreign Tax Credit; not a statutory treaty article computation |
| **P&I** | Principal and Interest — the fixed monthly mortgage payment computed by the amortization formula |
| **payoffYear** | The calendar year in which the last mortgage payment is made and P&I drops to zero |
| **residenceTax.js** | Module implementing the typed residence-tax layer that composes on the federal engine without forking it |
| **retireLoc / workLoc** | The retirement-location and work-location jurisdiction selectors introduced in Wave 2 |
| **Tenure** | Housing arrangement: `rent`, `mortgage`, or `own` (paid-off carrying cost) |

---

## 13. Companion Documents

- **Logic & Use‑Case Specification** — `02_Logic_UseCases_Retirement_Calculator.md` — the algorithms and formulas behind each capability area in this PRD.
- **Sources & References** — `03_Sources_Retirement_Calculator.md` — every public source consulted, grouped by topic, with links.
