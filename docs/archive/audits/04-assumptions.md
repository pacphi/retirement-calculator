# Assumption-Soundness Audit — "Nest & Next" Retirement Calculator

**Mode:** Bach (BS-detection) + Linus (technical precision)
**Calibration:** Level 2 (Harsh) — planning-grade tool with real household stakes
**Date:** 2026-06-17
**Scope:** Modeling assumptions only. Code style, UI layout, and test quality are out of scope.

---

## Summary Scorecard

| # | Assumption | Verdict | Bias direction | Magnitude |
|---|-----------|---------|---------------|-----------|
| 1 | SS PIA from current income — ignoring short/partial career | **Misleading** | Overstates SS | $500–$1,800/yr per affected spouse |
| 2 | Deterministic flat real return, no volatility in base path | Optimistic | Understates depletion risk | Scenario-dependent; large |
| 3 | Monte Carlo: arithmetic-normal, independent, unbounded | Optimistic | Understates tail risk | P10 corridor too narrow |
| 4 | Stress path: −10% yrs 1–3 only | Optimistic | Understates sustained bear | Moderate |
| 5 | Healthcare default inflates emigration scenario | Misleading | Flatters cost by $15k–$25k/yr | High (pre-65 US gap) |
| 6 | Taxes: 2026 brackets held flat in real terms forever | Optimistic | Misses bracket creep | Low–Moderate |
| 7 | No state-income-tax model for US stays | Optimistic | Understates tax drag | Varies; up to $6k–$15k/yr |
| 8 | Survivor: pension continues at 100%, default OFF | Optimistic | Understates survivor income drop | $5k–$30k/yr if DRS cuts |
| 9 | Austria property: 10% haircut for cross-border tax | Optimistic | Understates transaction cost | Low–moderate |
| 10 | Live-in treated as phantom income reducing need | Optimistic | Hides out-of-pocket cost gaps | Low (35% floor guards it) |
| 11 | "Could spend up to" headline | Borderline Misleading | Creates false ceiling framing | Qualitative |
| 12 | No long-term care cost | Missing | Omission flatters long-run plan | $50k–$120k/yr if needed |
| 13 | Both spouses to 95 — symmetric run | Mildly Optimistic | Ignores mortality correlation | Low in base; handled by survivor toggle |
| 14 | AFC defaults to current income, held flat in real terms | Defensible (barely) | Small pension understatement or overstatement depending on career arc | Low |
| 15 | WEP/GPO repealed — no offset on teacher SS | Defensible | Accurate since Jan 2025 | N/A |

---

## Detailed Findings

---

### 1. Social Security PIA: Current-Income Shortcut (CRITICAL)

**File:** `src/finance/socialSecurity.js:3–8`, `src/finance/simulate.js:14`

**What the code does.**
`piaFromIncome(income)` takes the user's *current* annual income, caps it at `SS_CAP` ($184,500), divides by 12, and passes the result directly through the bend-point formula as if it were AIME (Average Indexed Monthly Earnings over the highest 35 years). The UI defaults Person A to income-estimate mode (`ssModeA:"estimate"`), but Person B (the teacher with a DRS pension) is also set to estimate mode in the default state.

**Why it is wrong.**

The SSA AIME is the average of the *highest 35 indexed earnings years*, not current income. This shortcut is wrong in two separable ways:

1. **Shorter-than-35-year career.** If a spouse has worked 22 years, SSA fills the remaining 13 years with zeros. A 22-year career at $170k/yr produces a real AIME substantially below $170k/12 because the zero-years drag the average down.

   Rough quantification for Person B (the teacher, default $170k income, 22 DRS years):
   - Shortcut AIME: $170,000 / 12 = **$14,167/mo**
   - Realistic AIME (22 yrs at $170k indexed, 13 zeros): ≈ $170,000 × 22/35 / 12 = **$8,905/mo**
   - Bend-point PIA difference: the shortcut AIME sits deep in the 15%-credit band (above $7,749/mo). Reducing AIME from $14,167 to $8,905 saves the model approximately **$800–$900/mo PIA**, meaning the tool *overstates* Person B's own SS benefit by roughly **$9,600–$10,800/yr** before claiming adjustments — a very large number relative to a ~$49,500/yr spending base.

2. **Stopping work at 56.** Person B stops at 56 in the default scenario, 9+ years before claiming. Those 9 zero-income years after stopping but before claiming further erode AIME if she had fewer than 35 high-income years when she stopped. The code does not model this at all.

**What correct looks like.**
The SSA statement ("my Social Security" account) gives the actual PIA directly. The model already supports statement mode (`ssModeB:"statement"` + `ssFraB`) but defaults Person B to estimate mode — the dangerous path.

**Action item (CRITICAL).**
- Show a persistent in-line warning whenever income-estimate mode is active: "This is a rough estimate. If the career is less than 35 years, the real benefit is likely lower. Enter your SSA statement value for accuracy."
- Default both spouses to statement mode, or at minimum require explicit acknowledgment before using income-estimate mode.
- Expose a "career years" field so `piaFromIncome` can apply the ratio correction (multiply AIME by `min(careerYears, 35) / 35`) as a better fallback.

---

### 2. Deterministic Base Return (HIGH)

**File:** `src/finance/simulate.js:70–147`, specifically the per-year `bal = bal * (1 + yearReturn)` applied to `i.realReturn` (default 5%)

**What the code does.**
The base simulation applies a constant real return of 5% every year with no variance. A 5% perpetual real return compounding for 30–50 years produces a dramatically larger terminal balance than a realistic distribution of outcomes, because the model never experiences sequence drag in the base case — only the stress overlay does.

**Why it is wrong.**
A deterministic 5% real return is above the long-run historical average for a balanced portfolio (typically 4–5% real for a 60/40, but with wide year-to-year variation). More importantly, real retirement outcomes are driven by *path*, not by long-run average. Even if the expected return is 5%, the deterministic path is always more optimistic than the median stochastic path because of the asymmetry of compounding losses. The base headline number — and thus the "Comfortable" or "Affluent" tier label — is derived from the deterministic run, not the Monte Carlo median.

**The visible symptom: results look too good.** A deterministic 5%-real compounding machine never has a down year in the base case. The balance chart shows a steady upward curve in the base scenario, which is empirically wrong for any real portfolio over a 40-year horizon.

**Action item (HIGH).**
- Make the headline income figure and tier label source from the Monte Carlo P50 run, not the deterministic run. The deterministic run is fine as one reference scenario, but it should not be the headline.
- Alternatively, add a clear disclaimer on the base chart: "This assumes steady 5% real returns every year — a best-case-within-average outcome, not a realistic median."

---

### 3. Monte Carlo: No Fat Tails, No Serial Correlation, Unbounded Downside (HIGH)

**File:** `src/finance/monteCarlo.js:16`, `src/retirementData.js:15`

**What the code does.**
```js
const sample = randomNormal.source(rng)(inp.realReturn, volatility);
// volatility default = 0.12
// returns are i.i.d. each year
```
Each year's return is drawn independently from `N(realReturn, 0.12)`. There are three problems:

1. **Fat tails.** Real equity returns are leptokurtic (fat-tailed). A normal distribution with σ=0.12 materially underestimates the probability of extreme negative years (e.g., −30% to −50%), so the P10 balance corridor is too optimistic.

2. **No serial correlation.** Equity returns exhibit volatility clustering and mean-reversion over multi-year horizons. The model treats each year as independent, which understates the probability of multi-year drawdown sequences (exactly the scenario that kills retirement plans).

3. **Arithmetic mean, not geometric.** Passing `realReturn = 0.05` as the mean of a normal distribution makes the *arithmetic* mean return 5%, but the *geometric* (compound) mean of `N(0.05, 0.12)` is approximately `0.05 - 0.12²/2 = 0.043`. The model is overestimating expected compound growth by roughly 0.7% per year.

4. **Allows returns < −100%.** `randomNormal` is unbounded below. In rare draws, annual returns below −100% are possible, producing a negative portfolio balance that gets snapped to 0. This is a mathematical artifact, not a real outcome, and inflates apparent success by clipping unrealistic ruin scenarios.

**Action item (HIGH).**
- Correct the mean: pass `realReturn - volatility²/2` as the distribution mean so the geometric mean matches the intended real return assumption.
- Cap draws at −90% (or lognormal sampling) to avoid sub-zero artifacts.
- Document in the UI that Monte Carlo uses independent normal draws and understates tail risk relative to historical data. If fat-tail modeling is not added, the P10 corridor should be labeled "optimistic lower bound, not worst case."

---

### 4. Sequence-of-Returns Stress Path: Too Short, Too Mild (MEDIUM)

**File:** `src/retirementData.js:13`, `src/finance/simulate.js:7–11`

**What the code does.**
```js
export const stressReturnForYear = (realReturn, yearIndex) => {
  if (yearIndex <= 2) return -0.10;       // years 1–3: −10%
  if (yearIndex <= 5) return realReturn - 0.02;  // years 4–6: mild recovery
  return realReturn;                       // year 7 onward: back to base
};
```

**Why it is under-specified.**
The 2000–2002 dot-com bust produced three consecutive years of −9%, −12%, and −22% real S&P 500 returns. The 2008–2009 crisis produced −37% in a single year. A −10%/yr three-year stress is milder than both of those realized scenarios and recovers to full base-rate after only 6 years. A household retiring in 2000 with this stress path modeled would have appeared to recover by 2006; in reality many such portfolios were still below water into 2012.

The stress path is also deterministic (always years 1–3 of retirement), which cannot capture a mid-retirement crash at age 75 — a different but equally dangerous sequence-risk scenario.

**Action item (MEDIUM).**
- Steepen the stress: consider −15% in year 1 and −25% in year 2 (closer to 2008 magnitude) as an alternative stress scenario.
- Add a note in the UI that the stress path is an illustration, not the worst historical case, and is less severe than the 2008 drawdown.
- Document explicitly in `docs/use-cases.md` section 4.4 that the stress path does not simulate a mid-retirement crash.

---

### 5. Healthcare: Default Location Inflates Non-US Scenario (CRITICAL)

**File:** `src/retirementData.js:56–71`, `src/finance/plan.js:48–56`

**What the code does.**
The default `retireLoc` in the UI state (from the superpowers plan `src`) is `"Austria"`, with `hcPre: 520` and `hcPost: 420` (monthly, couple). The ACA pre-65 cost for the US national average is `hcPre: 2450` — nearly **5× higher**.

The headline income, spending need, and all tier labels are computed using whichever location's healthcare the user has selected. By defaulting to Austria, the pre-65 spending need is $520×12 = $6,240/yr versus the US national average of $2,450×12 = $29,400/yr — a **$23,160/yr difference in modeled spending need** before any other adjustments.

**Why this is misleading.**
This couple has a concrete Austrian residence (the Klagenfurt home) but also a Texas property and explicit US-retirement scenarios listed in the location table. The default Austria selection means the plan headline shows the lowest healthcare cost available in the model, systematically producing the most favorable-looking result. A user who interprets the default as "what my plan looks like" and later stays in the US faces a $23k/yr cost gap that is invisible in the default view.

Separately: the `hcPre` figures for Austria ($520/mo) are for Austrian public health insurance for residents. A US citizen living in Austria pre-65 typically cannot immediately access full public health coverage at the same premium as an Austrian citizen — the startup cost and waiting-period situation varies by residency status. The $520/mo figure may understate even the Austrian scenario.

**Action item (CRITICAL).**
- Default the healthcare basis (`retireLoc`) to the US national average, or require an explicit user choice before running the plan.
- Add a persistent warning when a non-US location is selected: "This uses [country] healthcare costs. If you remain in the US pre-65, ACA costs are approximately $2,450/month for a couple at national average."
- Surface the healthcare cost line explicitly in the spending breakdown so users cannot miss it.

---

### 6. Federal Tax Brackets Held Flat in Real Terms Forever (MEDIUM)

**File:** `src/retirementData.js:31–34`, `src/finance/tax.js:49–67`

**What the code does.**
The 2026 brackets are encoded as nominal thresholds. The model uses `realReturn` (net of inflation) to grow the portfolio, and benefit amounts carry real COLAs, so everything is in today's dollars — in principle the bracket thresholds should drift with inflation, and they do because the model is in real terms. This is actually correct *if* brackets are inflation-indexed, which they currently are under the 2026 law.

**The real risk: the TCJA/senior bonus expiration and future law changes.** The $6,000 senior bonus is a 2025–2028 provision (`use-cases.md` section 3.7 acknowledges this, but only in a parenthetical). From 2029 onward, this $12,000 per-couple deduction disappears. The model applies it for the full 40-year horizon, understating future taxes by roughly **$1,200–$2,000/yr** (at 10–22% marginal rate on the lost deduction) from 2029 onward.

Additionally, the `STD` values and brackets used are 2026 figures. If a future Congress allows inflation indexing to lapse, real bracket creep occurs. The model does not model this risk at all.

**Action item (MEDIUM).**
- Hard-terminate the senior bonus in the tax engine after 2028 unless re-extended. This is a foreseeable legislative sunset, not a tail risk — it is written into current law.
- Document that all tax projections assume 2026 law in perpetuity, which is a favorable assumption.

---

### 7. No State Income Tax (MEDIUM)

**File:** `src/finance/tax.js` — federal only; `src/retirementData.js:56–71` — qualitative notes only

**What the code does.**
The tax engine is entirely federal. State taxes appear only as qualitative text in the `LOCATIONS` table (e.g., "Up to about 13.3% state tax" for California). The tax calculation used for the headline, the withdrawal solver, and the Monte Carlo engine is federal-only.

**Why this matters for a US scenario.**
If this couple chooses a US state with income tax (not Texas, not Florida, but something like Virginia or Oregon where the pension and SS are partially taxable), the actual tax drag can be $4,000–$15,000/yr above the modeled federal-only figure. The headline income number and the tier label (Comfortable, Affluent) would be overstated.

**Action item (MEDIUM).**
- Add a state tax overlay input: a flat effective state rate (e.g., 0–10%) applied to the same taxable income base. This does not require a 50-state engine — a single percentage field is sufficient.
- Or at minimum, show a sensitivity tile: "Adding X% state tax would reduce after-tax income by approximately $Y/yr."

---

### 8. Survivor: Pension Assumed to Continue at Full Rate, Default OFF (HIGH)

**File:** `src/finance/simulate.js:99–106`, use-cases.md section 4.3

**What the code does.**
The survivor transition keeps the DRS pension at full value when one spouse dies (`pens` continues unchanged). WA DRS Plan 2 offers a survivor benefit option, but it requires electing a lower monthly pension at retirement — typically reducing the member's own benefit by 5–20% to fund a 50–100% joint-and-survivor annuity. If the member chose the higher "life only" option (more common for higher earners, since it maximizes their own benefit), the pension drops to $0 on their death.

Additionally, the survivor toggle defaults to `off`. A couple where the teacher/pension holder predeceases the other spouse faces: (1) the Social Security step-up correctly modeled, but (2) a pension that may drop to $0 or 50% rather than continuing at 100%. This is not a fringe scenario — it is a core retirement risk for defined-benefit holders.

**Action item (HIGH).**
- Add a `pensionSurvivorPct` field (0%, 50%, 100%) to let users model the survivor annuity election.
- Default the pension survivor rate to 50% — the most common election — and display the resulting reduction in the member's base pension.
- Change the survivor toggle default to `on` with a default year of, say, the younger spouse's age 85 — forcing users to actively think about this scenario rather than miss it by default.

---

### 9. Austria Property: 10% Haircut Is Probably Light (LOW)

**File:** `src/retirementData.js:79–84`, `src/finance/plan.js:21–23`

**What the code does.**
`PROP.at.sellNet = 0.90` — the model keeps 90% of the property value net after selling the Austrian property. The note correctly caveats "a cross-border tax professional should verify."

**Why 10% may understate costs.**
Austrian real-estate transaction costs on a sale include: ImmoESt (capital-gains tax) at 30% of nominal gain if acquired by the decedent after 2012, plus 3.5% real-estate transfer tax at inheritance (on the Grundstückswert), plus ~1.5% registration fee, plus agent commissions (~3%). For an Altvermögen property (acquired before 2012), the alternative 4.2% flat rate applies instead. The 10% haircut captures a limited scenario — primarily selling costs and a small gains estimate — and could easily be 20–35% for a property with large nominal appreciation since the decedent's acquisition date.

**Action item (LOW).**
- Change the Austria property card note from "estimate keeps 10% aside" to "this estimate may substantially understate costs for properties with large gains since acquisition; the actual rate depends on the decedent's acquisition date and original currency cost basis."
- Optionally expose a user-adjustable `sellNet` slider for the Austrian property.

---

### 10. Live-In Treated as Phantom Income Reducing Need (MEDIUM)

**File:** `src/finance/simulate.js:62–68`, `src/finance/plan.js:21–23`

**What the code does.**
```js
export function spendingNeed(i, ageA, ageB, liveSav = 0) {
  const base = i.incomeHH * i.targetPct;
  ...
  return Math.max(0.35 * base, base + hcBump - liveSav);
}
```
The `liveSav` (live-in saving = avoided rent minus Austrian ownership cost) directly reduces the spending need. The floor `0.35 * base` prevents it from going negative. The "Austria live-in" saving is computed as `rentMo * 12 - value * ownRate` = $1,650×12 − $324,000×0.012 ≈ $15,912/yr.

**What is defensible.** If the couple truly lives in the Austrian home and therefore pays no rent, this correctly removes that cost from the need. The 35% floor prevents the saving from erasing essential non-housing spend.

**What is optimistic.** The `ownRate = 0.012` (1.2% of property value for ownership costs) is conservative — Austrian property ownership costs for a foreign owner can include property tax, insurance, repairs, and Hausverwaltung fees that are closer to 1.5–2%. More importantly, the model applies this saving from the moment the property is inherited (`cal >= p.year`), with no ramp-up, transition cost, or relocation cost. Moving a US household to Austria has one-time costs (international freight, visa legal fees, temporary housing) that are not modeled.

**Action item (LOW–MEDIUM).**
- Apply the live-in saving only from the year after the inheritance year, to account for the transition year.
- Note in the UI that relocation costs are not modeled.

---

### 11. "Could Spend Up To" Headline: Still Structurally Misleading (HIGH)

**File:** `src/finance/simulate.js:200–216` (`steadyState`), `docs/use-cases.md` section 4.5

**What the code does.**
The reconciliation introduced `modeledSpend`, `sustainableCapacity`, and `surplus`. The UI now says: "You're modeling spending of X/yr; you could spend up to Y/yr at your withdrawal rate. The Z/yr you don't spend is what compounds in the chart below."

**Why this is still misleading in two ways.**

First, `sustainableCapacity` = `net` = `gross - tax`, where `gross = (FV * swr) + pension + SS + rent`. This is the amount you *could* withdraw at the chosen SWR. But the SWR is applied to `FV` — the portfolio balance at the steady-state anchor year. If that anchor year is early (e.g., age 67 when the last benefit starts), and the portfolio is still growing, the SWR-based "capacity" is calculated off a larger balance than what exists at full retirement. Conversely, if the anchor year is used while the balance is still declining from early pre-SS draws, the SWR is applied to a smaller balance. The framing `could spend up to` suggests a stable ceiling, but the ceiling itself is path-dependent.

Second, the `surplus` is described as "what compounds in the chart below." This is accurate but can be read as "this money is available and growing for me to use later." In reality, the surplus remains invested and its spendability in later years depends on the same SWR constraint being applied again at that later date. A user who reads "Z/yr surplus is compounding" may treat it as an accessible buffer when it is really a deferred portfolio balance subject to sequence risk.

**Action item (HIGH).**
- Replace "could spend up to Y/yr at your withdrawal rate" with "at your withdrawal rate, the plan can sustain Y/yr *in addition to* your guaranteed income — this is the sustainable ceiling assuming the portfolio performs at the base return."
- Replace the surplus description with: "The difference stays invested. It provides a buffer against lower returns, unmodeled expenses, or long-term care costs — it is not a separate spending pool."

---

### 12. Long-Term Care: Completely Absent (CRITICAL)

**File:** None — this assumption exists only by omission.

**What is missing.**
A couple aged 57/48 planning to 95 has a high probability that at least one spouse requires some form of long-term care (LTC). SSA actuarial data suggests roughly 70% of people turning 65 will need some long-term care in their lifetime; the average LTC period is 3 years, and the cost of skilled nursing care (2026) ranges from $50,000–$120,000/yr depending on location and level of care. For an Austria-based scenario, Austrian long-term care (Pflegegeld) provides partial coverage but nursing-home private costs can still be EUR 3,000–5,000/month above public subsidy.

The model's `need` calculation has no LTC line item and the location tables do not include a care-cost figure. A plan showing "Comfortable" or "Affluent" with $100k+ surplus over a 40-year horizon could be completely consumed by a 5-year LTC episode for one spouse.

**Action item (CRITICAL).**
- Add an LTC scenario toggle: if enabled, add a user-specified annual LTC cost (default $72,000/yr, national median 2026 for home health aide) for a user-specified duration (default 3 years) starting at a user-specified age (default 80).
- If not implemented, add a persistent disclaimer on the headline: "This plan does not model long-term care costs, which average $50,000–$120,000/yr and are needed by 70% of retirees. Your actual plan should account for this risk."

---

### 13. Both Spouses Modeled to Age 95 (LOW)

**File:** `src/finance/simulate.js:74` — `end = Math.max(95 - i.ageA, 95 - i.ageB)`

**What the code does.**
Both spouses run to the calendar year where the *older* one reaches 95. This is correct for the couple scenario, but the survivor toggle defaults off, so the base plan treats both as alive to 95.

**Why it is mildly optimistic.**
A couple both reaching 95 is statistically unlikely. SSA period life tables (2024) put life expectancy for a 57-year-old male at ~84 years and a 48-year-old female at ~88. The probability both reach 95 is roughly 8–12%. However, *financial planning for longevity* conventionally does plan to 90–95 as a conservative floor, so this is not clearly wrong — it is an acknowledged and reasonable choice. The survivor toggle, when enabled, handles the income impact; the issue is only that it defaults off.

**Action item (LOW).**
- Default the survivor toggle to `on` (addressed in finding 8). This single change handles the practical concern here.

---

### 14. AFC Defaults to Current Income, Held Flat in Real Terms (DEFENSIBLE)

**File:** `src/finance/pension.js:28–30`

```js
export const resolveAfc = (i) =>
  afcIsAuto(i) ? Number(i.incomeB) || 0 : Number(i.afc) || 0;
```

**Verdict: Defensible.** Using current income as a proxy for final average compensation is a reasonable planning assumption in a real-dollar model where wages are held flat in real terms (i.e., the model already assumes no real wage growth). The `docs/use-cases.md` section 6 acknowledges this. It slightly overstates the AFC if real wages decline late-career, and understates it if there is real wage growth. The user can override with an explicit AFC value. This is not a material error.

---

### 15. WEP/GPO Repeal (DEFENSIBLE)

**File:** `src/finance/simulate.js:14` — comment "WEP/GPO repealed January 2025"

**Verdict: Correct and defensible.** The Social Security Fairness Act was signed January 5, 2025, repealing WEP and GPO for affected workers. No SS offset is applied to the teacher spouse. This is accurate current law. No action needed.

---

## Action Items by Severity

### CRITICAL (implement before presenting results to any user)

| ID | Action | File(s) | Effort |
|----|--------|---------|--------|
| C1 | Warn when SS is in income-estimate mode for a career shorter than 35 years; show estimated shortfall; strongly prompt for SSA statement | `src/finance/socialSecurity.js`, `RetirementCalculator.jsx` | Medium |
| C2 | Default healthcare basis to US national average, not Austria; require explicit user choice for international scenarios | `RetirementCalculator.jsx` (default state), UI | Low |
| C3 | Add persistent LTC disclaimer to headline, or implement LTC scenario toggle | `RetirementCalculator.jsx`, `src/finance/simulate.js` | Medium–High |

### HIGH (implement before sharing plan results with others)

| ID | Action | File(s) | Effort |
|----|--------|---------|--------|
| H1 | Source headline income and tier label from Monte Carlo P50, not deterministic run | `RetirementCalculator.jsx`, `src/finance/plan.js` | Medium |
| H2 | Fix Monte Carlo geometric mean: pass `realReturn - σ²/2` as distribution mean; cap draws at −90% | `src/finance/monteCarlo.js` | Low |
| H3 | Add `pensionSurvivorPct` field; show pension reduction under survivor election; change survivor default to `on` | `RetirementCalculator.jsx`, `src/finance/simulate.js` | Medium |
| H4 | Fix "could spend up to" framing: reword to avoid implying a stable ceiling; reword surplus description | `RetirementCalculator.jsx` | Low |

### MEDIUM

| ID | Action | File(s) | Effort |
|----|--------|---------|--------|
| M1 | Terminate senior bonus deduction after 2028 per current law; add disclaimer about legislative risk | `src/finance/tax.js`, `src/retirementData.js` | Low |
| M2 | Add state-tax flat-rate input (0–15%) or sensitivity tile | `src/finance/tax.js`, `RetirementCalculator.jsx` | Medium |
| M3 | Steepen or document the stress path magnitude vs. 2008 actual; add note that mid-retirement crash is not modeled | `src/finance/simulate.js`, `docs/use-cases.md` | Low |
| M4 | Apply live-in saving from year+1 of inheritance, not year of inheritance; note relocation costs omitted | `src/finance/simulate.js` | Low |

### LOW

| ID | Action | File(s) | Effort |
|----|--------|---------|--------|
| L1 | Strengthen Austria sell-net caveat: 10% may understate gain taxes materially; expose adjustable haircut | `src/retirementData.js`, `RetirementCalculator.jsx` | Low |

---

## What Makes This Plan Look Better Than Reality — Summary

The model systematically stacks several optimistic assumptions simultaneously in the default configuration:

1. Austrian healthcare costs (5× lower than US pre-65) applied to a default US-domiciled scenario.
2. SS income estimated from current salary for a shorter-career spouse — likely $9,600–$10,800/yr too high for Person B.
3. Deterministic 5%-real returns, never a down year in the base case.
4. Monte Carlo geometry overstates expected compound return by ~0.7%/yr.
5. Pension continues at 100% through survivor transition.
6. Senior bonus deduction applied in perpetuity (it expires in 2028 absent renewal).
7. No state income tax in US scenarios.
8. No long-term care costs.

Individually, each of these may be explainable. Stacked together on the same household, the cumulative bias in the "Comfortable/Affluent" framing is material — potentially $30,000–$50,000/yr overstated sustainable income relative to a realistic, median-path projection.

---

*Audit conducted under the brutal-honesty-review standard: attack the assumptions, not the authors. The existing code quality, modular architecture, and source documentation are solid. These findings are about what the model implicitly promises users, not about how it is built.*
