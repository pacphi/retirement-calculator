# Nest & Next — Addendum: Separate where you _earn_ from where you _retire_ (v3)

_Amends `enhancement-plan-v2.md` §1–§3 and the cost-of-living model. Short and surgical: the place
you earn during the working years and the place you live in retirement are different jurisdictions
with different tax and cost consequences. The model currently binds everything to one `retireLoc`,
which is both wrong and a missed lever. This addendum splits them._

---

## 1. The principle (and why it's not optional)

**You're taxed by where you live, not where you earned it.** Retirement-plan and pension income
(401(k)/IRA distributions, private and most public pensions) is sourced to your **state of residence
at the time of distribution** — and under the federal **Pension Source Tax Act of 1996** a former
work-state generally **cannot** tax your retirement income once you've genuinely changed residence.
([Wealthvieu](https://wealthvieu.com/retirement/best-places-to-retire/state-taxes-on-retirement-income/);
[CountryTaxCalc](https://www.countrytaxcalc.com/tax-guides/usa/roth-ira-conversion-tax-by-state-2026/))
Wages, by contrast, are taxed by the **work** state in the year you earn them.

So the two arcs sit in two tax worlds:

- **Working years →** taxed where you _earn_ (state tax on **wages**, cost of living at the work
  location).
- **Retirement years →** taxed where you _live_ (state tax on **retirement income by type**, cost of
  living + property tax + healthcare bridge at the retirement location).

The magnitude makes this the most controllable variable in the whole plan. Two retirees with an
identical $120k income, same assets, same Social Security: the California one pays roughly **$7,200
more per year** than the Wyoming one — about **$180k over a 25-year retirement.**
([Income Lab, 2026](https://incomelaboratory.com/state-retirement-taxes-guide/)) Across states the
spread runs **$5,000–$30,000+/yr.**
([CountryTaxCalc](https://www.countrytaxcalc.com/tax-guides/us-state-retirement-tax-comparisons/))
The classic, well-trodden pattern — earn in a high-tax state, retire to a no-tax one (FL, TX, NV, WY
lead retiree migration) — is exactly what a two-location model lets the household _see_.

## 2. What's wrong today

`simulate()` applies a single `i.taxRate` (the retirement location's `addlTaxRate`, or the manual
override) to **every** year — including the working years when `wages > 0`. Concretely, the WA-teacher
default earns in Washington (no wage tax) but the engine would tax those wages at, say, Austria's or
California's retirement rate if that's the chosen `retireLoc`. The v2 typed-tax work (§3) makes the
_retirement_ side honest but still inherits this single-location binding. The cost-of-living basis is
similarly conflated: the working-years spending that nets against contributions is a
location-independent replacement rate, when it should reflect the **work** location.

## 3. The two-location model

Add a second binding and a boundary:

- **`workLoc`** — where the household lives/works during accumulation. Drives state tax on **wages**
  and the **working-years** cost of living. Defaults to the current location (WA for the teacher
  persona → zero wage tax, which is the realistic default).
- **`retireLoc`** — where they live in retirement (already exists). Drives the **typed retirement-income
  tax** (§3.1 of v2), **property tax** (§3.2), retirement cost of living, the **pre-65 healthcare
  bridge**, and LTC costs.
- **`relocationYear`** — the handoff. Defaults to the year the household fully retires / the second
  earner stops; user-adjustable (you might relocate before or after the last paycheck).

**Key simplification, well-grounded:** because federal law bars the old work-state from taxing
retirement income, the model can cleanly **switch jurisdictions at `relocationYear`** — work-state
rules before, retire-state rules after — without trying to apportion retirement income back to the
work state. That's both correct and simpler than a blended rate.

## 4. How it changes the engine

Small, surgical, and it removes a bug rather than adding mass:

- **Pick the active jurisdiction by year.** In the loop, `activeLoc = cal < relocationYear ? workLoc
: retireLoc`. (Years are already iterated; this is a per-year selector.)
- **Apply the right _face_ of the tax profile.** The v2 typed `taxProfile` already carries both a
  wage aspect and a retirement-income aspect. In working years the state layer taxes **wages** (and
  any incidental income) under the work-state's wage rules; in retirement years it taxes
  **SS/pension/withdrawals by type** under the retire-state's rules (Roth always exempt). The
  **federal engine is untouched** — federal tax doesn't depend on state — so the one-tax-engine
  invariant holds; only the composed state layer switches its source.
- **Choose the cost-of-living basis by year.** Working-years `need` uses the work location; retirement
  `need` uses the retirement location. This also lets the **pre-65 healthcare bridge** be gated
  correctly — it applies only in the post-retirement, pre-Medicare gap at the **retirement** location
  (where you've actually moved), instead of today's age-only gate that can add a bridge cost while
  still employed and insured.
- **Property tax / housing** (v2 §2–3.2) keys off `retireLoc` for the retirement years; if a mortgage
  spans the relocation, its payoff math is unchanged (it's tied to the loan, not the place), but the
  **property-tax rate** switches to the retirement jurisdiction at relocation.

Net: one new per-year branch, one selector for the cost basis, and the v2 tax layer gains a
work-vs-retire toggle it was already shaped to support.

## 5. How it changes v2

- **§3.1 (typed state tax)** — unchanged in shape; now applied to **two** jurisdictions. Each
  jurisdiction's `taxProfile` serves whichever face the year needs. A no-income-tax state is all-zero
  for both; Illinois taxes wages at 4.95% but exempts all retirement income (so it flips friendly at
  relocation); California taxes wages progressively _and_ taxes pension/401(k) in retirement (exempts
  SS). The "$5–30k/yr by location" read-out becomes a **contrast** between the two locations, which is
  the insight you're after.
- **§2.3 (housing-explicit need)** — the non-housing lifestyle base is now drawn at the **active**
  location's cost of living, so the working-years contribution math nets against work-location living
  costs and the retirement need reflects the destination.
- **§1 (accumulation)** — wage state tax now actually reduces working-years take-home correctly,
  which feeds the contribution cap (`contrib = min(planned, after-tax income − need)`). For a WA
  earner this is zero; for a CA earner it's material and was previously mis-modeled.

## 6. UI surface

- In **Step one**, add **"Where you live & earn now"** (a location/US-state selector) next to the
  existing income inputs; keep **"Where you'll retire"** where it is.
- Add a **relocation year** control near the retirement-timing inputs, defaulting to full retirement,
  with a one-line note that it's when the tax/cost basis switches.
- On the **staircase**, mark the **relocation boundary** (a thin vertical rule, like the depletion
  line) so the user sees the year the tax/cost world changes — often a visible step in after-tax
  income.
- The **Places** comparison stays a retirement-location tool (unchanged); optionally show a small
  "vs. earning in {workLoc}" delta so the arbitrage is explicit.

## 7. Updated control → engine → viz (new/changed rows)

| Control            | New state            | Engine touch point                                          | Charts                        |
| ------------------ | -------------------- | ----------------------------------------------------------- | ----------------------------- |
| Where you earn now | `workLoc`            | per-year jurisdiction selector; wage-tax face               | staircase (working-years net) |
| Where you retire   | `retireLoc` (exists) | retirement-income tax face; property tax; healthcare bridge | Places, staircase             |
| Relocation year    | `relocationYear`     | jurisdiction + cost-basis switch boundary                   | staircase boundary rule       |

**Sequencing:** fold this into **v1.3 (housing + place)** right alongside the typed state-tax work —
they share the `taxProfile` plumbing, and doing them together avoids building the single-location
version twice. It's a small delta on top of §3.

## 8. New invariants & caveats

- **Clean switch, planning-grade.** Model one jurisdiction per year with the switch at
  `relocationYear`. Don't attempt part-year apportionment; instead caption that the **transition year
  is simplified** — real domicile changes hinge on **183-day** (and stricter) residency tests, and
  "sticky" states (CA, NY, VA) audit departing residents.
  ([Kiplinger](https://www.kiplinger.com/taxes/new-wealth-taxes-and-residency-rules-after-moving);
  [United Capital](https://unitedcapitalwealth.com/insights/retirement-planning/changing-state-residency-tax-purposes/))
  This is professional territory — keep the existing "consult a specialist" framing.
- **Federal source-tax rule is the modeling license.** State it in-app: once you've genuinely changed
  residence, your former work-state generally can't tax your retirement income — which is _why_ the
  clean switch is defensible.
- **One-time relocation cost is still unmodeled** (already disclaimed). Worth a small optional
  `relocationCost` one-time event at `relocationYear`, reusing the events mechanism.
- **Default to honesty for the persona.** Ship with `workLoc = Washington` (no wage tax) so the
  default plan is correct out of the box; the change only bites when a user picks a wage-taxing work
  state, which is the case it's meant to fix.

## 9. Bonus the split unlocks (note, not core)

Because retirement income is taxed by residence **at distribution**, separating the locations makes a
real optimization visible: the gap between retiring and claiming — or relocating to a no-tax state
**before** taking large distributions or **Roth conversions** — can move tens of thousands. A $100k
Roth conversion costs ~$13,300 in California state tax and **$0** in Florida/Texas.
([CountryTaxCalc](https://www.countrytaxcalc.com/tax-guides/usa/roth-ira-conversion-tax-by-state-2026/))
Not core to this round, but once `workLoc`/`retireLoc`/`relocationYear` exist, a "convert/claim after
the move" toggle is a natural, high-value follow-on.

---

### One line

Bind earnings to the work location and spending-plus-retirement-income to the retirement location,
switch jurisdictions at the relocation year, and the plan stops taxing your paychecks at your
future home's rate — while finally showing the earn-here / retire-there arbitrage that's worth
five to six figures over a retirement.
