# Product Requirements Document — "Nest & Next"

> A single-file, interactive retirement planning tool for a U.S. married couple, covering portfolio projection, two-earner Social Security, a Washington State (DRS) teacher pension, 2026 federal tax, age-banded healthcare, cross-border inherited real estate, international cost-of-living comparisons, and a Social Security funding-risk stress test.
>
> **Tagline:** This is about your money, your home, and what comes next.

**Version:** 1.0 (current build) · **Status:** Delivered · **Document type:** Product Requirements Document (capabilities)

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
  - [6.14 Guidance, Notes and Disclaimers](#614-guidance-notes-and-disclaimers)
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
- **NG2** — Not a Monte‑Carlo / sequence‑of‑returns simulator; it uses a steady real‑return assumption.
- **NG3** — Not a multi‑household or multi‑scenario saver; it models one household at a time and holds no persistent storage.
- **NG4** — Not a state‑income‑tax engine for all 50 states; state tax is summarized qualitatively per location, with Washington (no income tax) handled precisely for the resident case.
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
- **FR‑TAX‑06** — Note that Washington has no state income tax, so the resident case omits state tax; other locations summarize state/national income tax qualitatively.

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

### 6.14 Guidance, Notes and Disclaimers

**Description.** Translate the numbers into action and bound their authority.

- **FR‑NOTE‑01** — Provide a "Planner's notes" section with contextual guidance (Texas sell/rent vs. hold; Klagenfurt live‑in advantage; pre‑65 healthcare cliff; Social Security as a sizable but bounded risk; foreign‑inheritance paperwork; treaty/foreign‑tax‑credit caution; sticky high‑tax states).
- **FR‑NOTE‑02** — Provide a persistent disclaimer that outputs are planning estimates, not financial/tax/legal advice, and direct the user to SSA, DRS, and a cross‑border specialist for binding figures.

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
| Macro | Configurable real return (default 5%), inflation (default 2.5%), taxable share of withdrawals (default 70%); single‑household scaling ≈ 64% of couple costs |

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
- **L8** — The "live‑in" housing saving is applied to the spending need generically; for full fidelity the healthcare basis should be matched to the live‑in country.
- **L9** — RMDs use a **commingled‑account simplification**: a single tax‑deferred pool driven by the **older** spouse's age and first‑RMD age, rather than per‑owner accounts. Roth balances are assumed to be the non‑deferred share (exempt). The steady‑state "sustainable income" headline is left on the SWR basis and does not re‑apply the RMD floor — at the steady‑state age a 4% SWR draw already meets or exceeds the ~4.1% RMD, so the floor is non‑binding there.

---

## 11. Out of Scope

- Filing or transmitting any tax return; generating legal documents.
- Long‑term‑care insurance modeling, annuities, or insurance products.
- Detailed Roth‑conversion‑window optimization (offered as a possible future addition, not built).
- A spending "smile" (age‑declining real spending) — not modeled.
- Survivor‑only scenarios (income if one spouse dies) — not modeled in this version.
- Currency‑risk modeling for foreign income/assets beyond a fixed conversion assumption.

---

## 12. Glossary

| Term | Meaning |
| --- | --- |
| **AFC** | Average Final Compensation — average of the teacher's highest 60 consecutive months of pay; the pension base |
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

---

## 13. Companion Documents

- **Logic & Use‑Case Specification** — `02_Logic_UseCases_Retirement_Calculator.md` — the algorithms and formulas behind each capability area in this PRD.
- **Sources & References** — `03_Sources_Retirement_Calculator.md` — every public source consulted, grouped by topic, with links.
