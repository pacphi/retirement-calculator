---
name: calculator-comparison
description: >-
  Produce a competitive-analysis document comparing this project's "Nest & Next"
  retirement calculator against another provider's calculator or methodology
  documentation. Use this whenever the user supplies a URL (or PDF/doc) to a
  third-party retirement, pension, FIRE, or financial-planning calculator and
  asks to compare, contrast, benchmark, or analyze it against ours — e.g.
  "compare us to Fidelity's calculator", "how does Vanguard's retirement tool
  differ from ours", "competitive analysis vs <provider>", or "what can we learn
  from <url>". Writes the result into this project's docs/ directory — default
  filename docs/vs-<provider>.md, or an explicit filename if the user names one —
  following the established structure and house style. Trigger even if the user
  only pastes a calculator URL and says "compare this" without naming the output
  file.
---

# Calculator Comparison

Generate a structured competitive-analysis doc that compares **our** retirement
calculator (this repo) against a **competitor's** calculator or methodology, then
write it to `docs/vs-<provider>.md`.

The goal is decision-useful product analysis, not a feature checklist: lead with
the strategic takeaway, make differences scannable, and end with an
effort-ranked list of what we could borrow. The reference doc
`docs/vs-nerdwallet.md` (if present) is the canonical example of the expected
output — match its depth and tone.

## Workflow

Work in this order. Steps 1 and 2 can run in parallel since they read different
sources.

### 1. Re-learn our own engine (don't assume from memory)

Our capabilities evolve, so read the source rather than relying on prior context.
The engine is pure and well-factored — skim these to build an accurate picture of
what we actually model:

- `src/retirementData.js` — constants, default assumptions, tax brackets, SS bend
  points, DRS factors, locations, tiers. This is where most "what we assume"
  facts live.
- `src/finance/simulate.js` — the year-by-year decumulation simulation, spending
  need, survivor transitions, withdrawal solver.
- `src/finance/tax.js` — federal tax engine, SS taxation, deductions.
- `src/finance/socialSecurity.js` — PIA, claim-age factors, spousal/survivor.
- `src/finance/pension.js` — WA DRS pension and early-retirement factors.
- `src/finance/monteCarlo.js` — success probability, balance fan, depletion age.
- `src/finance/events.js` and `plan.js` — travel/LTC/life events, plan assembly.
- `CLAUDE.md` — the calculation rules and product framing ("planning-grade, not
  advice-grade"). Honor these when describing what we do and why.

Capture our position on each comparison dimension (see the dimension list below)
so the table is grounded in real code, not guesses.

### 2. Extract the competitor's methodology from the URL

Use WebFetch on the provided URL with an extraction prompt that asks for:
inputs requested; default assumptions (returns pre/post-retirement, inflation,
salary growth, life expectancy, retirement age, replacement-rate / budget rule,
recommended savings rate, employer match); the calculation method (single
projection vs. simulation vs. Monte Carlo); how it judges "on track"; tax and
Social Security handling; outputs shown; and any stated limitations.

Notes on sources:
- A marketing/calculator page often hides methodology. If the fetched page is
  thin, look for a linked "methodology", "assumptions", "how this works", or
  "disclosures" page and fetch that too.
- If WebFetch returns a cross-host redirect, re-fetch the redirect URL.
- If the URL is a PDF, read it with the PDF reader instead of WebFetch.
- Record what you could NOT determine rather than inventing values — an honest
  "not disclosed" is more useful than a guess, and our docs are source-linked by
  convention.

### 3. Write the comparison doc

**Output location and filename.** Always write into this project's `docs/`
directory. The filename is a parameter:

- If the user specifies an output filename (e.g. "name it vs-vanguard.md"), use
  exactly that, placed in `docs/`.
- Otherwise default to `docs/vs-<provider>.md`, where `<provider>` is a lowercase
  slug of the provider name (e.g. `vs-fidelity.md`, `vs-vanguard.md`,
  `vs-empower.md`).

Never write these docs anywhere but `docs/`. If the target file already exists,
ask whether to overwrite or version it.

Use the template at `references/comparison-template.md` as the skeleton. Keep the
house style established in `docs/vs-nerdwallet.md`:

- **Lead with the bottom line** — one short section stating what kind of tool each
  is and where the real wins are. Most comparisons land on the same shape: the
  competitor is a simpler accumulation/onboarding tool; ours is a richer
  decumulation simulator. Say so plainly, but verify it actually holds for this
  competitor — some (e.g. Boldin/NewRetirement, ProjectionLab) are also detailed
  simulators, and the takeaway flips.
- **Comparison table** — one row per dimension (below), our column first.
- **A reference table of the competitor's default assumptions** when disclosed.
- **What the competitor has that we don't** — numbered, concrete.
- **What we have that they don't** — our edge; keep and lean in.
- **What we could add, by effort** — grouped High value / low effort, Medium
  effort, and a "worth noting — do not copy" bucket. Tie each suggestion to real
  code we already have where possible (e.g. "we already compute `successProb`,
  just surface it"), because the most actionable suggestions reuse existing
  machinery.
- **Source references** — link the competitor URL and cite our source files.

Be terse and scannable: tables and bullets over prose, define jargon on first
use, no filler. This matches the project's documentation conventions and the
prompt-evaluation guidance the repo operates under.

## Comparison dimensions

Use these as the table's rows (add/drop as the competitor warrants):

| Dimension | What to capture |
|---|---|
| Core question | Accumulation ("save enough?") vs. decumulation ("will cash flow last?") |
| Method | Single projection / deterministic simulation / Monte Carlo |
| Tax | Bracket engine, SS taxation, deductions — or none |
| Social Security | Bend points, claim-age factors, spousal/survivor — or lumped in |
| Pension | Modeled (which plans) or generic "other income" |
| Spending | Replacement-rate rule vs. line-item / location-aware budgets |
| Returns & inflation | Fixed rates vs. stress + volatility; real vs. nominal framing |
| Household | Single saver vs. two-spouse with mortality/survivor |
| Geography | Cost-of-living / healthcare / tax by location, or US-generic |
| Real estate | Home equity, inheritance, sell/rent/live — or absent |
| Outputs | Single verdict, charts, success probability, tables |

## Quality bar

A good comparison doc lets a product owner decide *what to build next* in five
minutes. If the "what we could add" section is vague or just restates the
competitor's features, it has failed — every item should be specific enough to
turn into a ticket, and ranked so the cheap high-value wins are obvious.
