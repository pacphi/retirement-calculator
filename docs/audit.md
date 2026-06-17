# Brutal-Honest Audit — Implementation vs. Documentation & Claims

> **Scope:** `RetirementCalculator.jsx` (the only source file) checked line-by-line against
> `docs/prd.md`, `docs/use-cases.md`, `docs/sources.md`, `README.md`, and `CLAUDE.md`.
> **Mode:** Linus (technical correctness) + Bach (claim/BS detection). Attack the work, not the author.
> **Date:** 2026-06-16 · **Reviewer:** automated code audit

---

## Verdict

**The documentation is unusually honest and the math mostly does what the specs say — but the
headline and the longevity chart are computed by two engines that disagree about tax, and that
disagreement is never disclosed.** The PRD/use-cases are a genuinely high-quality spec (the worked
example in `use-cases.md §4` reproduces exactly against the code — verified to the dollar). The real
problems are (1) the year-by-year projection charges **zero tax**, making "savings last beyond 95"
optimistic and inconsistent with the after-tax headline; (2) the headline applies **65+ senior
deductions unconditionally**, even for early-retirement years; and (3) two UI controls and one
accessibility claim promise more than the code delivers.

Nothing here is fraud. Several items are *disclosed simplifications*. But "planning-grade, transparent
about its simplifications" (PRD P3, §5) is the product's core promise, and the two tax issues are
exactly the kind of simplification the §5 table was built to list — and doesn't.

---

## Findings by severity

| # | Severity | Finding | Claim it breaks |
|---|----------|---------|-----------------|
| 1 | **HIGH** | Year-by-year sim charges no tax; headline does → longevity overstated, engines inconsistent | use-cases §5 (undisclosed), PRD P2/P3 |
| 2 | **HIGH** | Steady-state applies age-65+ senior deductions + senior bonus unconditionally | PRD FR-TAX-02 |
| 3 | **MEDIUM** | Atlas location rows are non-keyboard `<div onClick>`; reduced-motion only half-honored | NFR-06, UX-06 |
| 4 | **MEDIUM** | TRS/SERS selector is a no-op; computation never reads `system` | PRD FR-PEN-01 (presented as a choice) |
| 5 | **LOW** | Spousal top-up earns delayed-retirement credits it can't have (claim > 67) | use-cases UC-3 |
| 6 | **LOW** | `pensionERF` applies the 20–29-yr reduction table to <20-yr service silently | PRD FR-PEN-04 |
| 7 | **LOW** | "Guaranteed for life … COLA-adjusted" mislabels flat real rental income | UI tile, FR-STEADY-04 |
| 8 | **LOW** | PRD §13 cites companion files (`02_…md`, `03_…md`) that don't exist | PRD §13 |

Weighted total (HIGH=2, MED=1, LOW=0.5): **8.0** — well past the 3-point floor.

---

## HIGH-1 — Two tax engines, one of them silent

**What's broken.** `simulate()` (jsx:94–132) computes the running balance and depletion age with
`wd = max(0, need − nonPort)` and **never deducts a cent of tax** — salaries, pension, Social Security,
and taxable withdrawals are all spent gross. But `cs()` (jsx:240–247) computes the *headline* net
income by subtracting `fedTax(...)`. So the screen shows, side by side:

- "Sustainable income … **$X/yr after federal tax**" (taxed), and
- "Savings last (with SS): **beyond 95**" (from the untaxed sim).

**Why it's wrong.** Spending (`need`) is an after-tax concept; funding it from a 70%-taxable portfolio
requires grossing up withdrawals for the tax owed. The sim skips that gross-up, so every projected
withdrawal is too small, the balance survives too long, and the depletion age is optimistic. The
"even a 0% Social Security scenario leaves savings lasting beyond 95" reassurance (risk panel,
jsx:547) inherits the same optimism.

**Why it matters.** This is the product's central output — *can we retire, and for how long* — and it's
computed tax-free while the headline right above it is taxed. `use-cases.md §5` lists seven
simplifications (state tax, PIA proxy, single-scaling…) but **not** "the year-by-year projection ignores
all federal tax." For a tool whose stated principle is "name the uncertainty" (PRD P3), this is the
omission that most deserves a line.

**How to fix.** Either (a) gross up `wd` by an effective tax rate inside `simulate()` so the projection
and headline agree, or (b) at minimum add a row to the `§5` table and a one-line UI footnote on the
balance chart: *"Longevity shown pre-tax; the income figure above is after tax."* Option (b) is honest
and cheap; option (a) is correct.

---

## HIGH-2 — Senior deductions applied to people who aren't seniors

**What's broken.** In `cs()` (jsx:243–245):
```js
let ded = STD[s.status] + SENIOR_ADDON[s.status];      // age-65+ add-on, always
let bonus = SENIOR_BONUS*(s.status==="married"?2:1);   // 2025–28 senior bonus, always
```
Both the age-65 additional standard deduction and the senior "bonus" deduction are applied
unconditionally — regardless of the spouses' actual ages.

**Why it's wrong.** The headline is labeled "Sustainable income, **once everyone's retired**" — and with
the shipped defaults that's age **60–62**, not 65. At 60–62 neither senior deduction is available, yet
the model grants ~$3.3k (add-on) + $12k (bonus) of deductions, understating tax and overstating the
net headline for the pre-65 retirement years. PRD FR-TAX-02 explicitly says "age-65+ additional
standard deduction"; the code drops the age gate.

**How to fix.** Gate `SENIOR_ADDON`/`SENIOR_BONUS` on `fullyRetAge >= 65` (or compute the steady state
at a representative 65+ age and say so). At least document that the headline assumes 65+ tax treatment.

---

## MEDIUM-3 — Accessibility claims outrun the code

**What's broken.**
- Atlas rows expand via `<div className="rc-loc" onClick=…>` (jsx:639) — not focusable, not
  Enter/Space-activatable. A keyboard or screen-reader user cannot open any location breakdown.
- The reduced-motion guard (jsx:358) disables only `.rc-stat`'s rise animation; the `.rc-exp` fade and
  `.rc-loc:hover` transition are untouched.

**Why it's wrong.** NFR-06 claims "Honors reduced-motion preferences; controls are keyboard/tap
friendly" and UX-06 claims charts "degrade gracefully." The segmented toggles and property cards *do*
use real `<button>`s (good), but the single most-used interaction in the Atlas — expanding a place — is
mouse-only, and charts have no text alternative. "Accessible" is overstated.

**How to fix.** Make `rc-loc` a `<button>` (or add `role="button"` + `tabIndex={0}` + key handler);
extend the reduced-motion block to `.rc-exp`. Soften the NFR if full a11y isn't in scope.

---

## MEDIUM-4 — A control that controls nothing

**What's broken.** `system` ("TRS"/"SERS") is in state (jsx:190), rendered as a segmented picker
(jsx:430), and **never read** by `benefits()` or `pensionERF()`. Toggling it changes no number.

**Why it's wrong.** PRD FR-PEN-01 frames TRS vs SERS as a supported choice. It's defensible that they
"share the same benefit formula" (PRD says so) — but then the control is decorative, and a user who
flips it expecting a different result gets silent no-op. That erodes the "show the math's shape" trust
(P2).

**How to fix.** Either remove the selector, or label it "(same formula — informational)" so it doesn't
imply a computation.

---

## LOW findings

- **LOW-5 — Spousal benefit over-credits delayed claiming.** `ssAtClaim(0.5*piaB, claimA)` (jsx:87)
  runs the half-PIA through the *same* function that adds +2/3%/mo delayed-retirement credits past FRA.
  Real spousal benefits do **not** earn DRCs — they top out at 50% at FRA. With a claim age > 67 the
  model inflates the spousal amount. UC-3 documents the rule it implements but not this artifact.

- **LOW-6 — Pension ERF table misapplied below 20 years.** `pensionERF` (jsx:82) routes any service
  under 30 years and age 55–64 into the `ERF_20` table, which the docs label "20–29 yrs service." A
  user entering 8 years gets the 20–29-year reduction factors with no guard or note. (Also: vesting
  minimums aren't modeled — sub-vesting service still produces a pension.)

- **LOW-7 — "COLA-adjusted" overclaims.** The "Guaranteed for life" tile (jsx:493) labels SS + pension
  + rental "COLA-adjusted," but rental is a flat `value × yield` in today's dollars and DRS COLA is
  capped — neither is a true CPI COLA. Cosmetic, but it's a numeric-trust surface.

- **LOW-8 — Dangling doc references.** PRD §13 points to `02_Logic_UseCases_Retirement_Calculator.md`
  and `03_Sources_Retirement_Calculator.md`; the actual files are `use-cases.md` and `sources.md`.
  Fix the cross-references.

---

## What's actually right (credit where due)

- **The worked example reproduces exactly.** `use-cases.md §4` — spending base $49,500, pre-65 bump
  +$17,400, Klagenfurt live-in +$15,912, Texas rental $27,650 — all verified against the constants and
  formulas to the dollar. That's rare.
- **Determinism (NFR-03) and no-storage (NFR-02) are true.** No `Math.random`, no `Date`, no
  `localStorage`/`sessionStorage` anywhere. Honest claims.
- **14 locations (FR-ATLAS-01), tier thresholds, SWR options, the 100/81/0 risk panel, the double-count
  guard on post-retirement property sales (UC-12), and the half/half contribution taper all match spec.**
- **README marketing is defensible.** Every bullet ("stacked year by year," "pre-65 bridge built in,"
  "stress-test a SS cut," "live answers, no accounts") maps to real, working code. No vaporware.
- **Single-source 2026 constants** are centralized and source-labeled exactly as `CLAUDE.md`/NFR-05
  promise.

---

## Recommended priority

1. **Disclose or fix the tax inconsistency (HIGH-1)** — one footnote closes the biggest honesty gap.
2. **Gate the senior deductions on age (HIGH-2).**
3. **Make Atlas rows keyboard-operable (MEDIUM-3)** — small diff, real inclusion win.
4. Clean up the no-op selector and the LOW doc/label items in a single housekeeping pass.

*This audit is itself a planning-grade estimate of correctness, not a formal verification. Figures and
line numbers are against the source as read on 2026-06-16.*
