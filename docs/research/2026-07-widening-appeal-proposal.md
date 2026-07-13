# Widening Appeal: From "WA Educator Couple" to a National (and Global-Curious) Tool

**Status:** Proposal / research — not yet scoped into implementation.
**Date:** 2026-07-13
**Author:** Research pass via Claude Code, grounded in the current codebase (`src/retirementData.js`, `RetirementCalculator.jsx`) and external market research (see Sources at the end of each section).

## Why this doc exists

Nest & Next currently defaults one spouse into a Washington State DRS (TRS 2/3) pension, models exactly 14 locations (9 US, 8 international — all clustered in Western Europe plus one Caribbean and one catch-all Bahamas entry), and its header copy ("This is about your money, your home, and what comes next.") doesn't signal who else the tool is for. The calculation engine is generalized enough (`US_STATE_TAX`, `INTL_TAX`, `inheritanceRulesForPlace`) that widening the audience is mostly a **data and copy** problem, not a rebuild — the pension toggle already exists (`hasPension`-style gating in `src/finance/pension.js` / `Pension.jsx`), and `LOCATIONS` is already a flat array any location can join.

This proposal maps out what a broader, still-planning-grade, still-source-cited tool could look like.

---

## Table of Contents

1. [Positioning & headline copy](#1-positioning--headline-copy)
2. [Widening the US persona base](#2-widening-the-us-persona-base)
3. [New locations: Asia, Australia/NZ, Africa, South America](#3-new-locations-asia-australianz-africa-south-america)
4. [Data pipeline for keeping location & pension data fresh](#4-data-pipeline-for-keeping-location--pension-data-fresh)
5. [Feature additions beyond data](#5-feature-additions-beyond-data)
6. [Priority roadmap (effort-ordered)](#6-priority-roadmap-effort-ordered)
7. [Non-goals and guardrails](#7-non-goals-and-guardrails)

---

## 1. Positioning & headline copy

**Current:** H1 "Nest & Next", subhead "This is about your money, your home, and what comes next." Neutral copy, but the *default* pension persona (WA DRS) is what a first-time visitor sees pre-filled, which reads as "this is a Washington teacher's tool" even though it's a toggle.

**Problem:** the tagline is fine and doesn't need to change structurally, but nothing on first paint tells a non-WA, non-pension household that the tool applies to them. The fix is less about the headline text and more about what's *pre-selected* underneath it (see §2) — but a small wording pass helps set expectations immediately.

**Recommended directions** (pick one, keep it short — this app's voice is calm and factual, not marketing-speak):

| Option | Text | Why |
|---|---|---|
| A — scope-first | "This is about your money, your home, and what comes next — wherever you've worked, and wherever you're headed." | Directly answers "does this apply to me" without listing personas |
| B — plain | Keep current tagline; add a one-line eyebrow above the wizard's first step: "Works with Social Security, any employer pension or none, and 401(k)/IRA savings — in the US or abroad." | Cheapest change; puts the scope claim where intent is highest (step 1), not competing with the hero |
| C — no change | Leave as-is; rely on the wizard's first question ("Do you have a pension?") to do the work | Zero-cost; relies on discoverability |

**Recommendation:** B. It's a one-line addition near the wizard entry point, doesn't touch the hero's tone, and immediately de-risks the "is this only for WA teachers" bounce. Pair it with making the pension step's default `hasPension` state **off** (see §2.1) so the first thing a non-pension household sees isn't a pre-filled DRS pension to delete.

---

## 2. Widening the US persona base

### 2.1 Make "no pension" the true default (quick win)

Today the WA DRS pension is the shipped default and is toggled off by the user. For the ~84% of private-sector workers who have no defined-benefit pension (only 16% of private-sector workers have one, vs. three-quarters of state/local government workers — BLS, via [FEDweek/SSA policy summary](https://www.ssa.gov/policy/docs/ssb/v65n1/v65n1p17.html)), defaulting *into* a niche WA public-pension profile is the single biggest "this isn't for me" signal in the product. Flipping the default to no-pension, with WA DRS as one selectable preset among several, costs almost nothing and immediately reframes the tool as general-purpose.

### 2.2 Generalize the pension step beyond WA DRS

`src/finance/pension.js` and `Pension.jsx` are WA-DRS-specific (TRS 2/3 factors, survivor election tables in `retirementData.js`). To serve other pensioned households without misrepresenting their formula, add a **pension type selector** with a few well-known, well-documented systems plus a generic fallback:

- **Federal (FERS)** — `High-3 × years of service × 1.0–1.1%` multiplier, MRA 55–57, distinct from WA DRS's tiered factor tables ([OPM computation](https://www.opm.gov/retirement-center/fers-information/computation/)).
- **State teacher systems** — CalSTRS (largest educator-only fund, 965k members), Texas TRS (1.9M members), NYSTRS, Ohio STRS. These are the natural "next WA DRS" additions since the app already has a teacher-pension UX pattern to extend, not invent. ([CalSTRS at a glance](http://www.calstrs.com/calstrs-at-a-glance), [Texas TRS](https://praxisrock.com/insights/largest-us-public-pension-funds))
- **Military pension (High-3 / BRS)** — a very different accrual and COLA structure, large and distinct audience.
- **Generic defined-benefit** — user enters a known monthly benefit + COLA assumption directly, with no formula behind it, for the "my employer's pension isn't in your list" case. This one generic path arguably captures 80% of the value at 20% of the effort — it doesn't require modeling any specific plan's factor tables, just accepting a number and a COLA%.

**Sequencing:** ship the generic defined-benefit path first (cheap, unblocks everyone), then add FERS as the second formula-backed system (federal employees are a large, well-documented, single-formula population), then state teacher systems opportunistically since each one requires sourcing its own early-retirement/survivor factor tables the way `DRS_SURVIVOR_FACTORS` already does for WA.

### 2.3 Broaden the household shape assumption

The engine already models a two-earner household with independent pension/SS/age inputs — that's good. Worth confirming (not assumed here) whether single-filer and single-earner-couple paths are already smooth through the wizard, since a meaningful share of the "wider US population" is single retirees, not just dual-income couples.

### 2.4 State tax coverage

`US_STATE_TAX` currently covers 15 states (WA, TX, FL, NV, WY, SD, TN, IL, PA, MS, CO, CA, NY, NJ, MN). That's a reasonable spread of no-tax, low-tax, and high-tax states, but misses large-population states like Ohio, Georgia, North Carolina, Virginia, Michigan, and Arizona — all popular retirement-relocation states. Filling these out is pure data entry against the same sourced pattern (`SOURCES.kiplingerStateTax`, `SOURCES.taxFoundationProperty`) already in place — no new logic.

---

## 3. New locations: Asia, Australia/NZ, Africa, South America

The current `LOCATIONS` array has zero entries in Asia, Oceania, Africa, or mainland South America (Bahamas is the only non-Europe/non-US entry, filed under "Caribbean"). External research shows this is exactly where American retiree interest is growing fastest.

### 3.1 What the research says

- International Living's 2026 Global Retirement Index (35th year) ranks **Greece #1** for the first time, with Portugal, Italy, France, and Spain also top-10 — all already modeled in this app. Panama (#2) and Costa Rica (#3) are the highest-ranked *new* candidates, prized for proximity to the US and lower cost of living. ([internationalliving.com](https://internationalliving.com/the-best-places-to-retire/), [Forbes](https://www.forbes.com/sites/alexledsom/2025/12/04/the-best-places-to-retire-for-americans-in-2026-as-per-new-index/))
- **Asia is the fastest-growing region for US retirees**: per U.S. News & World Report, 8 of the world's 10 most affordable retirement destinations are now in Asia. Chiang Mai, Thailand (~$1,200/mo for a couple) and Vietnam's Hoi An/Da Nang corridor (~$1,000–1,500/mo) are the standout affordability plays; Malaysia's MM2H visa program and the Philippines' SRRV program are the standout *visa-for-retirees* plays.
- **Latin America** remains the largest existing expat retiree base: Mexico (~$2,400–4,000/mo for a couple), Panama's Pensionado visa (just $1,000/mo pension income required, with legally mandated senior discounts), and Costa Rica (~$1,600–2,200/mo single) are the three most-searched destinations after Western Europe.
- Uruguay and Colombia appear repeatedly in "best for Americans" indices as lower-drama alternatives to Mexico/Panama with strong healthcare and more stable currencies.

### 3.2 Proposed new `LOCATIONS` entries (by priority)

| Tier | Location | Region | Why this one |
|---|---|---|---|
| 1 | Mexico (Lake Chapala / Mérida corridor) | Latin America | #1 existing US retiree population abroad; huge search demand |
| 1 | Panama (Panama City + Boquete/Coronado) | Latin America | #2 IL ranking; simplest visa (Pensionado, $1,000/mo) |
| 1 | Costa Rica | Latin America | #3 IL ranking; Pura Vida brand recognition |
| 2 | Thailand (Chiang Mai) | Asia | Cheapest widely-viable option; well-trodden retiree infrastructure |
| 2 | Vietnam (Da Nang/Hoi An) | Asia | Fastest-rising affordability story |
| 2 | Malaysia (Penang / KL, MM2H visa) | Asia | Best-documented long-stay visa program in Asia |
| 3 | Philippines (SRRV visa) | Asia | English-speaking, low minimum pension-income visa threshold |
| 3 | Australia | Oceania | High interest, high cost — good contrast case against "cheap" destinations; strong healthcare |
| 3 | Uruguay | Latin America | Stable-currency alternative to Argentina; growing US retiree base |
| 4 | South Africa (Cape Town) | Africa | Only broadly English-language, infrastructure-mature African option with real expat retiree volume |
| 4 | Colombia (Medellín) | Latin America | High growth in digital-nomad-to-retiree pipeline; strong healthcare-cost story |
| 4 | New Zealand | Oceania | Smaller retiree visa pathway than Australia; include only if Australia validates demand |
| 5 | Japan | Asia | High interest but the hardest visa/tax picture for US retirees (no dedicated retiree visa) — lowest ROI per engineering hour |

**Why this order:** Tier 1 requires the least new *tax-treaty* modeling risk relative to payoff (Mexico/Panama/Costa Rica all have well-documented, non-worldwide-taxation-heavy treatment of US pension income, similar in shape to the Bahamas entry already in the app). Tier 2/3 requires more careful `INTL_TAX` sourcing (Thailand and Vietnam both tax foreign-sourced pension remittances under evolving rules — needs a cross-border-tax-literate source before shipping, same caveat the app already states for Austria/Netherlands). Japan is placed last because, unlike every other candidate, it has no simple retiree-visa story to anchor the "who is this for" framing the way Panama's Pensionado or Malaysia's MM2H do.

**Sources:** [Global Citizen Solutions 2026 Retirement Index](https://www.globalcitizensolutions.com/top-10-countries-to-retire-abroad-for-americans/), [International Living 2026 Index](https://internationalliving.com/the-best-places-to-retire/), [Boldin cost rankings](https://www.boldin.com/retirement/best-places-to-retire-in-the-world/), [Greenback Tax Services tax-friendly countries](https://www.greenbacktaxservices.com/knowledge-center/tax-free-incentives-retirement-countries/)

---

## 4. Data pipeline for keeping location & pension data fresh

The app already has a precedent for this: `docs/investment-data-refresh.md` documents a manual, source-cited refresh process for `src/investmentData.js`. The same pattern — **curated, cited, no runtime network calls** — should extend to `LOCATIONS` and `US_STATE_TAX`/`INTL_TAX`, for the same reasons: this is a planning-grade tool where a wrong live number is worse than a slightly-stale cited one, and the CLAUDE.md test-strategy rule against live network calls in tests would otherwise be violated by any runtime fetch.

**Proposed pipeline (annual cadence, matching `TAX_YEAR` bumps already done for `US_STATE_TAX`):**

1. **Cost-of-living baskets** — Numbeo is the standard source (12,792 cities, 9.8M+ crowdsourced prices, commercial-use API available — [numbeo.com/common/api.jsp](https://www.numbeo.com/common/api.jsp)). Pull once a year into a staging script (not a runtime dependency), hand-review against the existing `m:{rent, groceries, utilities, ...}` basket shape, and commit as literal data — exactly how `investmentData.js` is refreshed today. A paid Numbeo API tier is worth costing out once >20 locations exist; below that, manual entry from Numbeo's public site is cheap enough.
2. **Tax/visa rules** — these are lower-frequency-changing and higher-stakes-if-wrong than cost baskets, so keep them fully manual with an explicit source citation per field, the same convention already used in `INTL_TAX`'s per-country comments (e.g. "Portugal: addlTaxRate 0.03 ... verify — the old NHR regime closed in 2024"). This is not automatable without material accuracy risk; the annual manual pass is the right cost/risk tradeoff for a planning-grade tool.
3. **Refresh trigger** — same as investment data: a documented `docs/location-data-refresh.md` process, run once a year or when a source visibly changes (e.g., a country closes a retiree visa program), not on a schedule that implies real-time accuracy.
4. **Versioning signal** — consider stamping each `LOCATIONS` entry with a `dataAsOf` year (mirrors `TAX_YEAR`) so the UI can show "cost data as of 2026" next to the location picker, setting honest expectations without requiring live data.

---

## 5. Feature additions beyond data

Ranked by how directly they serve "wider audience," not by novelty:

- **Pension type selector** (§2.2) — the single highest-leverage feature; unlocks federal, state-teacher, military, and generic-DB households without misrepresenting any specific plan.
- **Multi-currency display toggle** — once Asia/Latin America locations exist, showing local-currency equivalents (even as a static informational conversion, not live FX) helps users sanity-check the numbers against what they see in country-specific retiree forums.
- **Visa-income-threshold callout** — several of the new Tier 1–3 locations have explicit minimum pension/passive-income requirements for their retiree visas (Panama $1,000/mo, Spain's Non-Lucrative Visa ~€28,800/yr already noted in-app). Surfacing "does your modeled income clear this location's visa minimum?" as a simple pass/fail chip next to the location picker is a small UI addition with outsized trust value — it's the kind of detail that signals the tool actually understands the persona, not just the spreadsheet math.
- **"No pension" onboarding path** — beyond just defaulting it off (§2.1), consider a first-question framing like "Do you or your spouse have a pension from an employer?" with Yes/No/Not sure, rather than requiring the user to find and toggle a WA-DRS-shaped form off.
- **Regional cost-of-living presets independent of tax treaty depth** — it's fine to ship a Tier 2/3 location's cost basket before its full `INTL_TAX` treaty modeling is done, using a conservative placeholder rate with a clear "tax treatment not yet modeled — consult a cross-border advisor" caption, the same honesty pattern already used for the Austria ImmoESt caveat. This decouples "add a place people can explore" from "fully model its tax law," letting geographic breadth ship faster than treaty-accuracy work.

---

## 6. Priority roadmap (effort-ordered)

**Easy (data/copy only, no new calculation logic):**

1. Default `hasPension` to off; keep WA DRS as an opt-in preset (§2.1)
2. Add the one-line scope eyebrow near the wizard's first step (§1, Option B)
3. Fill out `US_STATE_TAX` for OH, GA, NC, VA, MI, AZ (§2.4)
4. Add Mexico, Panama, Costa Rica to `LOCATIONS` + `inheritanceRulesForPlace` region logic already handles non-US entries generically (§3.2 Tier 1)
5. Stamp `dataAsOf` year on `LOCATIONS` entries (§4.4)

**Medium (new data + light new logic):**

6. Generic defined-benefit pension path (user-entered monthly benefit + COLA%) (§2.2)
7. Add Thailand, Vietnam, Malaysia to `LOCATIONS` + `INTL_TAX`, sourced carefully (§3.2 Tier 2)
8. Visa-income-threshold callout chip (§5)
9. `docs/location-data-refresh.md` pipeline doc, mirroring the investment-data-refresh pattern (§4)

**Complex (new formula-backed logic, requires sourcing a new factor table per system):**

10. FERS pension formula + MRA rules as a second formula-backed pension system (§2.2)
11. State teacher systems (CalSTRS, Texas TRS, NYSTRS, Ohio STRS) each with their own early-retirement/survivor factor tables (§2.2)
12. Military pension (High-3 / BRS) formula (§2.2)
13. Philippines, Australia, Uruguay, South Africa, Colombia, New Zealand `LOCATIONS` + `INTL_TAX` (§3.2 Tier 3–4)
14. Multi-currency display toggle (§5)
15. Japan `LOCATIONS` entry (§3.2 Tier 5) — deliberately last; weakest visa story, highest tax-modeling ambiguity

---

## 7. Non-goals and guardrails

- **Not a rebuild.** The engine's shape (`LOCATIONS` array, `US_STATE_TAX`/`INTL_TAX` parallel schemas, `inheritanceRulesForPlace`'s US/foreign branch) already generalizes to new personas and places. This is a data-and-copy expansion, not an architecture change.
- **Stay planning-grade.** Every new location or pension system needs the same "verify with a professional" captioning already used for Austria's ImmoESt and Portugal's closed NHR regime — breadth should not come at the cost of the app's existing honesty about estimate uncertainty.
- **No live network calls.** Per the project's test strategy (deterministic, no live network calls) and the existing investment-data-refresh precedent, all new cost-of-living and tax data ships as curated, cited, committed constants — not a runtime API integration.
- **One location for the whole horizon still applies.** Relocation-mid-plan modeling is explicitly out of scope today (per CLAUDE.md) and nothing in this proposal changes that; each new location is just another static basket to select, not a new "when do we move" dimension.
