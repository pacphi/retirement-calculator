# retirement-calculator

> Generic ops rules, ruflo CLI, and AQE guidance live in `~/.claude/CLAUDE.md` — not repeated here.

## What this is

"The Ledger & the Atlas" — a **single-file React artifact**, `RetirementCalculator.jsx` (~700 lines),
that projects a U.S. married couple's retirement year-by-year to age 95: two-earner Social Security,
a WA DRS teacher pension, 2026 federal tax, age-banded healthcare (pre-65 ACA bridge), cross-border
inherited real estate (Texas + Austria), a 14-location cost-of-living atlas, and an SS funding-risk
stress test. **Planning-grade, not advice-grade** — the in-app disclaimer must stay.

## Stack & shape

- **Only deps:** React (`useState`, `useMemo`) + `recharts`. No router, no state lib, no backend.
- **No build system.** There is no `package.json`, no test suite, no bundler. The file targets an
  artifact/preview runtime — ignore any `npm run build && npm test` instruction; it does not apply here.
- **Self-contained & deterministic:** all state is in-memory (no `localStorage`/`sessionStorage`),
  same inputs → same outputs (no randomness, no Monte-Carlo).
- **Styling:** inline `style={}` objects + a small set of `rc-*` CSS classes; serif display headings,
  mono figures, restrained palette via the `C` color object.

## File layout (all in `RetirementCalculator.jsx`)

1. **2026 reference constants** at the top — `FED`, `STD`, `BEND`, `SS_CAP`, `PROV`, `ERF_20`,
   `LOCATIONS`, `PROP`, etc. These are the single source of truth for tax/benefit/COL numbers.
2. **Pure math helpers** — `fedTax`, `pia`, `ssAtClaim`, `taxableSS`, `pensionERF`, `benefits`, `simulate`.
   Style is intentionally terse: single-letter args, packed one-liners. Match it; don't "clean it up."
3. **Small UI primitives** — `Field`, `NumberInput`, `Select`, `Segmented`, `Section`.
4. **`export default function RetirementCalculator()`** — the page; `useMemo` drives live recompute.

## Working conventions

- **`docs/` is the spec.** `prd.md` (capabilities, FR-* IDs), `use-cases.md` (formulas/algorithms),
  `sources.md` (where each 2026 number came from). Change behavior → keep these in sync; FR-* IDs are
  stable references.
- **Updating for a new tax year:** edit only the constants block, then verify against `sources.md`.
  Every constant is 2026-dated and source-labeled for exactly this.
- **Financial logic is load-bearing.** Don't alter `simulate`/`benefits`/tax math without checking the
  matching FR/use-case section — these encode real IRS/SSA/DRS rules (e.g. WEP/GPO repealed Jan 2025).
- All figures are **today's dollars** unless explicitly labeled future-dollar.
