# Logic & Use-Case Specification — "Nest & Next"

> The computational logic behind every capability area of the calculator, written as a set of use cases. Each use case states its purpose, inputs, processing logic (with formulas), outputs, and edge cases. This document is the companion to the PRD; requirement IDs (FR‑*) cross‑reference it.
>
> **Tagline:** This is about your money, your home, and what comes next.

**Version:** 1.0 · **Reference year:** 2026 · **Companion docs:** PRD; Sources & References

---

## Table of Contents

- [1. How to Read This Document](#1-how-to-read-this-document)
- [2. Notation and Shared Constants](#2-notation-and-shared-constants)
- [3. Use Cases](#3-use-cases)
  - [3.1 UC-1 Household Income Aggregation](#31-uc-1-household-income-aggregation)
  - [3.2 UC-2 Social Security PIA and Claiming](#32-uc-2-social-security-pia-and-claiming)
  - [3.3 UC-3 Spousal Benefit Top-Up](#33-uc-3-spousal-benefit-top-up)
  - [3.4 UC-4 Taxation of Social Security Benefits](#34-uc-4-taxation-of-social-security-benefits)
  - [3.5 UC-5 Washington DRS Pension and Early-Retirement Factors](#35-uc-5-washington-drs-pension-and-early-retirement-factors)
  - [3.6 UC-6 Federal Income Tax](#36-uc-6-federal-income-tax)
  - [3.7 UC-7 Senior Deductions and Bonus Phase-Out](#37-uc-7-senior-deductions-and-bonus-phase-out)
  - [3.8 UC-8 Healthcare-Aware Spending Need](#38-uc-8-healthcare-aware-spending-need)
  - [3.9 UC-9 Inheritance Strategy Economics](#39-uc-9-inheritance-strategy-economics)
  - [3.10 UC-10 Year-by-Year Portfolio Simulation](#310-uc-10-year-by-year-portfolio-simulation)
  - [3.11 UC-11 Social Security Funding Scenarios](#311-uc-11-social-security-funding-scenarios)
  - [3.12 UC-12 Steady-State Income Synthesis](#312-uc-12-steady-state-income-synthesis)
  - [3.13 UC-13 Cost-of-Living Total and Lifestyle Tiers](#313-uc-13-cost-of-living-total-and-lifestyle-tiers)
  - [3.14 UC-14 Inflation and Future-Dollar Conversion](#314-uc-14-inflation-and-future-dollar-conversion)
  - [3.15 UC-15 Places Affordability and Sorting](#315-uc-15-places-affordability-and-sorting)
  - [3.16 UC-16 Two-Location Comparison](#316-uc-16-two-location-comparison)
  - [3.17 UC-17 Chart Data Derivation](#317-uc-17-chart-data-derivation)
- [4. Life Events & Downside Modeling](#4-life-events--downside-modeling)
  - [4.1 Discretionary Travel Spending](#41-discretionary-travel-spending)
  - [4.2 One-Time Life Events](#42-one-time-life-events)
  - [4.3 Survivor Transition](#43-survivor-transition)
  - [4.4 Sequence-of-Returns Stress Path](#44-sequence-of-returns-stress-path)
  - [4.5 Headline Reconciliation: Modeled Spend, Capacity, and Surplus](#45-headline-reconciliation-modeled-spend-capacity-and-surplus)
  - [4.6 Long-Term Care](#46-long-term-care)
- [5. Worked Example: The Default Scenario](#5-worked-example-the-default-scenario)
- [6. Known Simplifications and Rationale](#6-known-simplifications-and-rationale)

---

## 1. How to Read This Document

Each use case follows the same template:

- **Purpose** — what the capability is for.
- **Implements** — the PRD requirement(s) it satisfies.
- **Inputs** — the parameters consumed.
- **Logic** — the step‑by‑step computation, with formulas in code blocks.
- **Outputs** — what it produces.
- **Edge cases** — boundary behavior and guards.

Formulas are written in a pseudo‑JavaScript that mirrors the implementation. Money is in U.S. dollars and, unless a use case says otherwise, in **today's purchasing power** (the real‑return and COLA assumptions keep income and costs in the same units).

---

## 2. Notation and Shared Constants

```text
incomeA, incomeB        spouse annual incomes
incomeHH                household income = incomeA + incomeB
ageA, ageB              current ages
stopA, stopB            stop-working ages
claimA, claimB          Social Security claim ages (62–70)
status                  "married" | "single"
targetPct               spending goal as a share of incomeHH (0.20–0.80)
savings                 current investable portfolio
contrib                 annual savings while working
realReturn (r)          real (after-inflation) portfolio return, default 0.05
swr                     safe withdrawal rate (0.039 | 0.04 | 0.057)
tradFrac                taxable share of withdrawals, default 0.70
inflation               default 0.025
```

```text
FED[status]   2026 marginal brackets [threshold, rate], Single and MFJ
STD           standard deduction: single 16,100 ; married 32,200
SENIOR_ADDON  age-65 additional std deduction: single 2,050 ; married 3,300
SENIOR_BONUS  6,000 per eligible filer (2025–2028), MAGI phase-out
BEND          PIA bend points [1,286 , 7,749] (monthly)
SS_CAP        taxable wage cap 184,500
PROV[status]  SS-taxation provisional thresholds: single [25k,34k] ; married [32k,44k]
ERF_20        early-retirement factors for 20–29 yrs service, ages 55–64
```

```text
PROP.tx  { sellNet 0.93, rentYield 0.035, ownRate 0.027, rentMo 1500 }
PROP.at  { sellNet 0.90, rentYield 0.020, ownRate 0.012, rentMo 1650 }
sFactor  household scaling: couple 1.0 ; single 0.64
TIERS    income/cost ratio → { <0.8 Tight, <1.15 Modest, <1.7 Comfortable,
                                <2.6 Affluent, else Luxurious }
```

---

## 3. Use Cases

### 3.1 UC-1 Household Income Aggregation

**Purpose.** Establish the household income that anchors the spending goal and the Social Security estimates.

**Implements.** FR‑HH‑02, FR‑HH‑06.

**Inputs.** `incomeA`, `incomeB`, `targetPct`.

**Logic.**

```js
incomeHH = (incomeA || 0) + (incomeB || 0)
spendingGoal = incomeHH * targetPct
```

**Outputs.** `incomeHH`; `spendingGoal` (the base spending need before age/healthcare adjustments).

**Edge cases.** Empty inputs coerce to 0. `targetPct` is bounded by the slider to 0.20–0.80.

---

### 3.2 UC-2 Social Security PIA and Claiming

**Purpose.** Estimate each spouse's annual Social Security benefit from income and claim age.

**Implements.** FR‑SS‑01, FR‑SS‑02, FR‑SS‑04.

**Inputs.** `incomeA`, `incomeB`, `claimA`, `claimB`.

**Logic — Primary Insurance Amount (PIA).** Average indexed monthly earnings are approximated by capping income at the wage base and dividing by 12; the bend‑point formula then applies.

```js
function pia(inc) {
  a = min(inc, SS_CAP) / 12
  return 0.90 * min(a, 1286)
       + 0.32 * max(0, min(a, 7749) - 1286)
       + 0.15 * max(0, a - 7749)
}
```

**Logic — claim-age adjustment.** Full Retirement Age (FRA) is 67. Claiming early reduces the benefit by 5/9 of 1% per month for the first 36 months and 5/12 of 1% per month beyond; claiming late adds 2/3 of 1% per month (8%/yr) up to age 70.

```js
function ssAtClaim(p, c) {                 // p = PIA, c = claim age
  if (c < 67) {
    m = (67 - c) * 12
    r = m <= 36 ? m*(5/9)/100
                : (36*(5/9) + (m-36)*(5/12)) / 100
    return p * (1 - r)
  }
  if (c > 67) {
    m = min((c - 67) * 12, 36)             // credits stop accruing at 70
    return p * (1 + m*(2/3)/100)
  }
  return p
}
```

Each spouse's own benefit is annualized: `ssOwn = ssAtClaim(pia(income), claim) * 12`.

**Outputs.** Each spouse's own annual Social Security benefit (before spousal top‑up).

**Edge cases.** Claim ages are bounded 62–70 by input minimums. The teacher spouse is treated as fully covered by Social Security (WEP/GPO repealed January 2025), so no offset is applied.

---

### 3.3 UC-3 Spousal Benefit Top-Up

**Purpose.** Ensure the lower earner receives at least half the higher earner's PIA where that exceeds their own benefit.

**Implements.** FR‑SS‑03.

**Inputs.** Both PIAs, both claim ages, both own benefits from UC‑2.

**Logic.**

```js
ssA = ssAtClaim(piaA, claimA) * 12
ssB = ssAtClaim(piaB, claimB) * 12
ssA = max(ssA, piaB > piaA ? ssAtClaim(0.5 * piaB, claimA) * 12 : 0)
ssB = max(ssB, piaA > piaB ? ssAtClaim(0.5 * piaA, claimB) * 12 : 0)
```

The spousal amount is itself reduced if claimed before FRA (via `ssAtClaim` on the half‑PIA).

**Outputs.** `ssA`, `ssB` — each spouse's final annual benefit; `ssHouse = ssA + ssB`.

**Edge cases.** When incomes are equal, neither top‑up applies. The model uses a simplified spousal rule (half of the higher PIA) and does not model survivor benefits.

---

### 3.4 UC-4 Taxation of Social Security Benefits

**Purpose.** Determine how much of the household's Social Security is federally taxable.

**Implements.** FR‑SS‑05, FR‑TAX‑05.

**Inputs.** `otherOrdinaryIncome` (taxable withdrawals + pension + rental), `ssHouse`, `status`.

**Logic.** Provisional income = other income + half of Social Security; thresholds `[t1, t2]` depend on filing status.

```js
function taxableSS(other, ss, status) {
  pr = other + 0.5*ss
  [t1, t2] = PROV[status]                 // married [32k,44k] ; single [25k,34k]
  if (pr <= t1) return 0
  if (pr <= t2) return min(0.5*ss, 0.5*(pr - t1))
  return min(0.85*ss, 0.85*(pr - t2) + min(0.5*ss, 0.5*(t2 - t1)))
}
```

**Outputs.** Taxable Social Security dollars, fed into AGI (UC‑12).

**Edge cases.** Caps ensure no more than 85% of benefits become taxable, per federal rule.

---

### 3.5 UC-5 Washington DRS Pension and Early-Retirement Factors

**Purpose.** Compute the teacher spouse's annual defined‑benefit pension.

**Implements.** FR‑PEN‑01..06.

**Inputs.** `pensionOn`, `plan` (2 or 3), `pYears`, `afc`, `pensionAge`.

**Logic — early-retirement factor (ERF).**

```js
function pensionERF(age, years) {
  if (age >= 65) return 1
  if (years >= 30) return max(0, 1 - 0.05*(65 - age))   // 5%/yr for 30+ yrs
  if (age < 55) return 0
  return ERF_20[round(age)]                              // steep table, 20–29 yrs
}
// ERF_20 (multiplier retained): 55:.39 56:.42 57:.45 58:.49 59:.54
//                               60:.59 61:.66 62:.73 63:.82 64:.91 65:1
```

**Logic — benefit.**

```js
multiplier = (plan === 3 ? 0.01 : 0.02)        // Plan 3 = 1%/yr, Plan 2 = 2%/yr
pension = pensionOn ? multiplier * pYears * afc * pensionERF(pensionAge, pYears) : 0
```

**Outputs.** Annual pension (and monthly = annual/12). Displayed with the formula breakdown.

**Edge cases.** If `pensionOn` is false, pension = 0 and it is omitted from the income mix. Plan 3's separate defined‑contribution balance is not modeled; users are told to fold it into `savings`. The pension is **not** subject to the Social Security haircut (UC‑11).

---

### 3.6 UC-6 Federal Income Tax

**Purpose.** Estimate federal income tax on taxable income.

**Implements.** FR‑TAX‑01.

**Inputs.** Taxable income `ti`, `status`.

**Logic.**

```js
function fedTax(ti, status) {
  brackets = FED[status]                  // array of [threshold, marginalRate]
  tax = 0
  for each bracket i:
    lo = brackets[i].threshold
    hi = next bracket threshold or Infinity
    if (ti > lo) tax += (min(ti, hi) - lo) * brackets[i].rate
  return tax
}
```

2026 MFJ thresholds used: 10% from $0, 12% from $24,800, 22% from $100,800, 24% from $211,400, 32% from $403,550, 35% from $512,450, 37% from $768,700 (Single thresholds are roughly half, per the 2026 schedule).

**Outputs.** Federal tax dollars.

**Edge cases.** `ti` is floored at 0 before the call.

---

### 3.7 UC-7 Senior Deductions and Bonus Phase-Out

**Purpose.** Apply the deductions available to a retired couple, including the temporary senior bonus.

**Implements.** FR‑TAX‑02, FR‑TAX‑03.

**Inputs.** `agi`, `status`.

**Logic.**

```js
deduction = STD[status] + SENIOR_ADDON[status]         // base + age-65 add-on
bonus = SENIOR_BONUS * (status === "married" ? 2 : 1)  // $6,000 per eligible filer
phaseStart = status === "married" ? 150000 : 75000
if (agi > phaseStart) bonus = max(0, bonus - (agi - phaseStart) * 0.06)
deduction += bonus
taxableIncome = max(0, agi - deduction)
```

**Outputs.** Total deduction and resulting taxable income for UC‑6.

**Edge cases.** The bonus phases out at 6 cents per dollar of MAGI over the threshold and cannot go negative. The bonus is a 2025–2028 provision and would be removed in a future build for later years.

---

### 3.8 UC-8 Healthcare-Aware Spending Need

**Purpose.** Make the annual spending need depend on age, capturing the costly pre‑Medicare years.

**Implements.** FR‑HC‑01..04.

**Inputs.** `incomeHH`, `targetPct`, the chosen retirement location's `hcPre`/`hcPost` (monthly couple healthcare), each spouse's age in the year, and any active live‑in housing saving.

**Logic.**

```js
base = incomeHH * targetPct
perPersonHC = max(0, (hcPre - hcPost)) / 2          // monthly premium per person <65
under65 = (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0)
hcBump = perPersonHC * under65 * 12                 // annual bridge premium
need = max(0.35 * base, base + hcBump - liveSaving) // live-in reduces the need
```

**Outputs.** The year‑specific spending `need`.

**Edge cases.** The `max(0, …)` floors the bump at zero where post‑65 cost exceeds pre‑65 (e.g., the Bahamas), so no negative bump is applied. The whole need is floored at 35% of the base so live‑in savings cannot drive it implausibly low. The bump uses the **healthcare‑basis** location selected for the timeline, which the user should set to where they actually expect to live.

---

### 3.9 UC-9 Inheritance Strategy Economics

**Purpose.** Quantify the after‑tax outcome of sell / rent / live‑in for each inherited property.

**Implements.** FR‑INH‑03.

**Inputs.** Property key (`tx` or `at`) and today's `value`; the per‑property constants.

**Logic.**

```js
function propEcon(key, value) {
  m = PROP[key]                                   // sellNet, rentYield, ownRate, rentMo
  sell = value * m.sellNet                        // net lump sum after tax + costs
  rent = value * m.rentYield                      // net annual rental income
  live = m.rentMo * 12 - value * m.ownRate        // annual housing saving (may be < 0)
  return { sell, rent, live }
}
```

Texas constants encode the U.S. basis step‑up and high property tax: `sellNet 0.93` (≈7% selling costs, ~$0 capital gains), `rentYield 0.035`, `ownRate 0.027` (property tax + upkeep ≈ rent → small/negative `live`). Austria constants encode the transfer + capital‑gains taxes and tiny property tax: `sellNet 0.90`, `rentYield 0.020`, `ownRate 0.012` (large positive `live`).

**Outputs.** The three strategy figures, shown on the property card with the chosen one highlighted, plus a tax note per strategy.

**Edge cases.** A negative `live` value is displayed in a warning color, signaling that owning costs more cash than renting (the Texas case).

---

### 3.10 UC-10 Year-by-Year Portfolio Simulation

**Purpose.** Roll the household forward from today to age 95, computing income, spending, withdrawals, and the running balance.

**Implements.** FR‑SIM‑01..06, FR‑INH‑05, FR‑HC‑02.

**Inputs.** All household, timing, pension, inheritance, healthcare‑basis, and assumption parameters, plus a Social Security option `{ on, haircut, cutYear }` (UC‑11).

**Logic (per year `y`, for `y = 0 … max(95-ageA, 95-ageB)`).**

```js
aA = ageA + y;  aB = ageB + y;  cal = 2026 + y
workA = aA < stopA;  workB = aB < stopB
salA = workA ? incomeA : 0;  salB = workB ? incomeB : 0
pens = (pensionOn && aB >= pensionAge) ? pensionFull : 0

ssFactor = cal >= cutYear ? haircut : 1            // UC-11
ssAy = (on && aA >= claimA) ? ssAfull * ssFactor : 0
ssBy = (on && aB >= claimB) ? ssBfull * ssFactor : 0

// inheritance effects this year
for each active property p:
  if p.type == "rent" and cal >= p.year:  rent     += p.rent
  if p.type == "live" and cal >= p.year:  liveSav  += p.live
  if p.type == "sell" and cal == p.year:  sellLump += p.sell

need     = healthcareAwareNeed(aA, aB, liveSav)    // UC-8
nonPort  = salA + salB + pens + ssAy + ssBy + rent

bal = bal * (1 + realReturn)                       // grow
bal += ((workA?0.5:0) + (workB?0.5:0)) * contrib   // contribute while working
bal += sellLump                                    // one-time inheritance sale
wd  = min( max(0, need - nonPort), max(0, bal) )    // draw the shortfall
bal -= wd

if (!workA && !workB && fullyRetAge is unset) { fullyRetAge = aA; balAtFullRet = bal }
if (bal <= 0 && depAge unset && need > nonPort)  depAge = aA
record row { aA, aB, cal, salA, salB, rent, pens, ssAy, ssBy, wd, bal, need, sellLump }
```

**Outputs.** An array of yearly rows; `depAge` (or "beyond 95"); `fullyRetAge` and `balAtFullRet` (used by UC‑12).

**Edge cases.** Withdrawals never exceed the available balance. Contributions are split half per still‑working spouse, so they taper rather than cliff when spouses retire in different years. A sale lump sum is available to offset that year's draw. Balances below $1 are snapped to 0.

---

### 3.11 UC-11 Social Security Funding Scenarios

**Purpose.** Apply a proportional Social Security reduction (haircut) from a chosen year, threaded through the whole model.

**Implements.** FR‑RISK‑01..06.

**Inputs.** `ssMode` ("full" | "trustees" | "custom"), `ssHaircut` (0–100), `ssCutYear`.

**Logic — resolve the effective scenario.**

```js
effHaircut = ssMode == "full"     ? 1
           : ssMode == "trustees" ? 0.81
           :                        clamp(ssHaircut/100, 0, 1)
effCutYear = ssMode == "full" ? 9999 : (ssCutYear || 2034)
```

The simulation (UC‑10) multiplies each spouse's benefit by `effHaircut` for all years `cal ≥ effCutYear`. The steady state (UC‑12) applies `effHaircut` directly, since the long run is past the cut year.

**Logic — risk comparison.** Four simulations and steady states are computed: **Full (100%)**, **Trustees (81% from cut year)**, **Custom/Chosen**, and **None (0%)**. The risk panel tabulates, for 100% / 81% / 0%: household Social Security, after‑tax income, and the age savings last; and computes a takeaway:

```js
ssShareOfIncome = sFull.ssHouse / sFull.gross
dropAt81        = sFull.net - sTrust.net
onTrackAt81     = (sTrust.guaranteed + sTrust.withdrawal) >= goal
```

**Outputs.** Headline reflects the chosen scenario; the risk panel shows all three; a scenario chip states the active assumption.

**Edge cases.** A 0% custom haircut is equivalent to "Social Security off". `effCutYear` of 9999 means the haircut never triggers (the full case).

---

### 3.12 UC-12 Steady-State Income Synthesis

**Purpose.** Combine every source into one sustainable, after‑tax annual income for the long run.

**Implements.** FR‑STEADY‑01..05.

**Inputs.** A simulation's `balAtFullRet` and `fullyRetAge`; the household's benefits and pension; the inheritance set; `swr`, `tradFrac`, `status`; the effective haircut.

**Logic.**

```js
fullCal = 2026 + (fullyRetAge - ageA)
sellAfter = Σ p.sell  for sell-properties received AFTER fullCal   // not already in balance
rentInc   = Σ p.rent  for rent-properties
liveSav   = Σ p.live  for live-in properties

FV = balAtFullRet + sellAfter
withdrawal = FV * swr

ssA = ssA_full * haircut;  ssB = ssB_full * haircut;  ssHouse = ssA + ssB
guaranteed = ssHouse + pension + rentInc
gross = guaranteed + withdrawal

ordinary = withdrawal*tradFrac + pension + rentInc     // taxable ordinary income
taxableSocial = taxableSS(ordinary, ssHouse, status)   // UC-4
agi = ordinary + taxableSocial
deduction = seniorDeductions(agi, status)              // UC-7
tax = fedTax(max(0, agi - deduction), status)          // UC-6
net = gross - tax                                      // the headline number
```

**Outputs.** `net` (headline sustainable income), `gross`, `guaranteed`, `withdrawal`, `tax`, `ssHouse`, `rentInc`, `liveSav`, and `FV`; plus the "on track" verdict (`guaranteed + withdrawal ≥ goal`).

**Edge cases.** Sales **before** full retirement are already reflected in `balAtFullRet`, so only later sales are added to `FV` to avoid double counting. Living‑in adds no income; it is surfaced separately as housing saved and reduces the spending need in the timeline (UC‑8).

---

### 3.13 UC-13 Cost-of-Living Total and Lifestyle Tiers

**Purpose.** Compute a location's annual cost for the chosen household size and healthcare basis, and label the lifestyle it affords.

**Implements.** FR‑ATLAS‑03, FR‑ATLAS‑04, FR‑ATLAS‑05.

**Inputs.** A location's monthly line items and `hcPre`/`hcPost`; `stage` (pre/post‑65); `couple` flag; the household's net income.

**Logic.**

```js
sFactor = couple ? 1 : 0.64
monthly = Σ(rent, groceries, utilities, transport, dining, entertainment, other)
        + (stage == "pre" ? hcPre : hcPost)
annualCost = monthly * 12 * sFactor

ratio = net / annualCost
tier  = first TIERS entry whose max > ratio
        // <0.8 Tight, <1.15 Modest, <1.7 Comfortable, <2.6 Affluent, else Luxurious
```

**Outputs.** `annualCost`, `ratio`, and the lifestyle `tier` (label + color).

**Edge cases.** Single scaling is a flat 0.64 multiplier across all categories (a deliberate simplification). The healthcare line is the only category that changes with `stage`.

---

### 3.14 UC-14 Inflation and Future-Dollar Conversion

**Purpose.** Show what a cost would be in nominal dollars at the projected retirement year, while keeping the core model in today's dollars.

**Implements.** FR‑ATLAS‑07.

**Inputs.** `inflation`, `fullyRetAge`, `ageA`, an annual cost.

**Logic.**

```js
yearsToRet = max(0, fullyRetAge - ageA)
retYear    = 2026 + yearsToRet
inflFactor = (1 + inflation) ^ yearsToRet
futureCost = annualCost * inflFactor
```

**Outputs.** `retYear`, `inflFactor`, and the future‑dollar cost shown in each breakdown.

**Edge cases.** Only display figures are inflated; income, withdrawals, and the headline remain in today's dollars because the return is real and benefits carry COLAs.

---

### 3.15 UC-15 Places Affordability and Sorting

**Purpose.** Render all locations ranked by cost, each compared to income.

**Implements.** FR‑ATLAS‑06, FR‑ATLAS‑07.

**Inputs.** All locations' costs (UC‑13), the net income.

**Logic.**

```js
rows = locations
        .map(l => ({ ...l, cost: annualCost(l), ratio: net/cost, tier: tierFor(ratio) }))
        .sort((a, b) => a.cost - b.cost)
barMax = max(net, mostExpensiveCost) * 1.05
// each bar fills cost/barMax; an income reference line sits at net/barMax
surplus = net - cost                        // shown per location, signed
```

**Outputs.** Sorted location rows with bars, tier badges, surplus, multiple (`net/cost`), future cost, healthcare note, and tax profile on expansion.

**Edge cases.** The income line and bars share a scale so the visual comparison is honest across locations.

---

### 3.16 UC-16 Two-Location Comparison

**Purpose.** Put two locations side by side at the line‑item level.

**Implements.** FR‑CMP‑01..04.

**Inputs.** Two selected locations, `stage`, `couple`, net income.

**Logic.**

```js
for each category row:
  av = A.item * sFactor;  bv = B.item * sFactor
  highlight = av <= bv ? A : B               // cheaper cell emphasized
totalsA = annualCost(A);  totalsB = annualCost(B)
cheaper = totalsA <= totalsB ? A : B
annualDifference = |totalsA - totalsB|
// summary card per location: cost, tier, surplus, multiple, future cost, tax profile
```

**Outputs.** The comparison table, totals, the cheaper‑by‑$X/yr headline, and two summary cards.

**Edge cases.** Selecting the same location twice prompts the user to pick two different places.

---

### 3.17 UC-17 Chart Data Derivation

**Purpose.** Shape the simulation output into the chart series.

**Implements.** FR‑VIZ‑01..05.

**Inputs.** The simulation rows (chosen and "none" scenarios), the steady state.

**Logic.**

- **Staircase**: from the first benefit/stop event onward, each row contributes stacked values for Salary (you), Salary (spouse), Rental, Pension, SS (you), SS (spouse), and Portfolio draw; the dashed line plots the per‑year `need` (UC‑8), which steps up before 65 and down after.
- **Balance**: per‑year `bal` from the chosen scenario (modeled SS) and the "none" scenario (SS eliminated); a marker is placed where `sellLump > 0`.
- **Income mix**: the steady‑state composition (withdrawal, rental, Social Security, pension) as a single proportional bar.

**Outputs.** Chart‑ready arrays for the staircase, balance, and income‑mix visuals.

**Edge cases.** The staircase begins a couple of years before the first event so the step changes are visible. Series that are zero (e.g., rental when no property is rented) are hidden from the legend.

---

## 4. Life Events & Downside Modeling

This section documents the four features added in the Tasks 1–8 pass: discretionary travel spending, one-time life events, a survivor-transition mode, and a sequence-of-returns stress path. It also clarifies how the headline reconciles modeled spend, sustainable capacity, and surplus.

### 4.1 Discretionary Travel Spending

**Purpose.** Budget a "go-go" travel phase that tapers naturally as retirement matures.

**Inputs.** `travel.on` (toggle), `travel.amount` (dollars/year, default $15,000), `travel.years` (number of years, default 15), `travel.taper` (boolean, default true). All amounts are in today's (real) dollars.

**Logic.**

```js
retireCal = TAX_YEAR + max(stopA - ageA, stopB - ageB)   // first year both are retired

function travelSpendForYear(travel, cal, retireCal) {
  idx = cal - retireCal                                   // 0-based retirement year
  if (!travel.on || idx < 0 || idx >= travel.years) return 0
  if (travel.taper && idx >= 10) return 0.5 * travel.amount
  return travel.amount
}
```

Travel spending is added to the year's spending `need`, which is then covered by the existing after-tax solver (salary, benefits, and if necessary a grossed-up portfolio withdrawal).

**Rationale.** The taper from full to 50% after year 10 reflects the well-documented go-go/slow-go/no-go pattern in retirement spending research. All amounts are user-overrideable; no external citation anchors any specific dollar figure.

**Edge cases.** Travel is active only during the years `[0, years)` counting from the first year both spouses are retired. If the toggle is off (`travel.on = false`) the function returns 0 for every year.

---

### 4.2 One-Time Life Events

**Purpose.** Model large, discrete after-tax outflows (gifts, home-purchase help, milestone celebrations) in the years they occur.

**Inputs.** `events[]` — an array of event objects `{ id, label, on, year, amount }`. Defaults are provided for common milestones (child weddings, home-purchase help, grandchild 529 seed); all are **off by default**. Users can edit labels, years, and amounts, and add or remove events dynamically. All amounts are in today's (real) dollars.

**Logic.**

```js
function oneTimeSpendForYear(events, cal) {
  return events.reduce(
    (sum, e) => (e.on && Number(e.year) === cal ? sum + (Number(e.amount) || 0) : sum),
    0,
  )
}
```

The total for the calendar year is added to the spending `need` for that year alongside travel. Because `need` is an after-tax target, the solver grosses up the portfolio withdrawal automatically to cover taxes on the extra draw.

**Edge cases.** Events are deterministic — they fire in exactly the year specified and are zero in all other years. An event with `on = false` is never included. Multiple events in the same calendar year accumulate correctly.

---

### 4.3 Survivor Transition

**Purpose.** Model the household income and tax change that follows the death of one spouse.

**Inputs.** `survivor.on` (toggle, default false), `survivor.year` (the calendar year the transition takes effect).

**Logic.**

```js
isSurvivor = survivor.on && cal >= survivor.year

if (isSurvivor) {
  larger = max(ssAy, ssBy)
  ssAyEff = larger      // household keeps the larger Social Security benefit
  ssByEff = 0           // the smaller benefit is dropped
  yearStatus = "single" // federal tax brackets switch to single-filer tables
}
```

The pension is assumed to continue at the same level (the model does not apply survivorship reductions to the DRS defined-benefit). All downstream calculations — federal tax, the healthcare-aware spending need, and the portfolio solver — receive the updated `yearStatus` and benefit amounts.

**Edge cases.** When the toggle is off, `yearStatus` and both SS amounts remain unchanged for the entire timeline. The transition is permanent once the `survivor.year` threshold is crossed; there is no provision for a remarriage scenario.

---

### 4.4 Sequence-of-Returns Stress Path

**Purpose.** Illustrate how a bad-return sequence in the first years of retirement can deplete a portfolio faster than the long-run average return suggests.

**Inputs.** `stress` flag passed to `simulate()`; `realReturn` from the household inputs.

**Logic.**

```js
function stressReturnForYear(realReturn, yearIndex) {
  if (yearIndex <= 2) return -0.10       // years 1-3: −10% (STRESS_EARLY_DROP)
  if (yearIndex <= 5) return realReturn - 0.02  // years 4-6: realReturn − 2%
  return realReturn                      // year 7 onward: base assumption
}
```

`yearIndex` is 0-based from simulation start (year 1 of retirement = index 0). The stress simulation is run in parallel with the base simulation and shown as a **brass dotted line** on the long-run portfolio balance chart.

**Important:** This is a **deterministic, illustrative scenario** — not a forecast, a Monte Carlo draw, or a probability-weighted outcome. Its purpose is to show the directional effect of sequence risk so users can judge whether their plan has enough buffer. Do not interpret the stress-path balance as a likely outcome.

**Known limits.** The −10% magnitude is **milder than real bear markets** (2000–02 was roughly −9%/−12%/−22% real; 2008 was about −37% in a single year), and it models a crash **only at the start of retirement** — not a mid-retirement downturn (e.g. at age 75), which is an equally dangerous but differently-timed sequence risk. For the realistic downside distribution — including crashes at any point — use the **Monte Carlo** run, whose lognormal paths and p10 / worst-case-depletion outputs capture what this single illustrative line cannot.

---

### 4.5 Headline Reconciliation: Modeled Spend, Capacity, and Surplus

**Purpose.** Separate what the household actually plans to spend from what the portfolio could support, so the difference is not mistaken for additional spendable income.

The steady-state report now surfaces three distinct quantities:

| Field | Definition |
| --- | --- |
| `modeledSpend` | The household's projected spending `need` in the steady-state year — the healthcare-aware base plus any active travel or events. |
| `sustainableCapacity` | After-tax income the portfolio can sustain at the chosen withdrawal rate (`net = gross − tax`). |
| `surplus` | `max(0, sustainableCapacity − modeledSpend)` — the portion of sustainable capacity not consumed by the modeled spend. |

The surplus compounds inside the portfolio rather than being paid out. It represents planning headroom — for unmodeled expenses, long-term care, inflation surprises, or bequest — and should not be treated as additional spendable income in the year it appears.

**Edge cases.** Surplus is floored at 0; the report does not show a negative surplus (that condition surfaces separately as the plan being short of the spending need).

### 4.6 Long-Term Care

Long-term care (LTC) is **off by default** and surfaced as a persistent disclaimer (≈70% of 65-year-olds need some LTC; an episode can run $50k–$200k/yr). When enabled, the model adds one LTC episode to spending need — keyed to the older spouse reaching `startAge` (default 80) for `years` (default 3) — which forces grossed-up portfolio withdrawals and shows the drawdown.

The annual cost **defaults to the selected location** (the private-pay nursing-home figure on each `LOCATIONS` entry, `ltcAnnual`), overrideable per scenario:

```text
ltcSpendForYear(ltc, ageA, locAnnual):
  if !ltc.on -> 0
  if ageA < startAge or ageA >= startAge + years -> 0
  return ltc.annual (explicit override) ?? locAnnual (selected location)
```

Figures are private-pay, pre-subsidy, in today's dollars; public LTC programs (Austria Pflegegeld, France APA, Netherlands WLZ, US Medicaid) reduce real out-of-pocket cost, so the modeled figure is conservative abroad. Per-location amounts and citations are in `docs/sources.md` §17 and `docs/audits/ltc-research.md`.

---

## 5. Worked Example: The Default Scenario

Using the shipped defaults (both spouses 45; incomes $90k and $75k; savings $300k; saving $18k/yr; 30% spending goal; stop work at 62/60; claim Social Security at 67; Plan 2 pension, 20 years, AFC $78k, start 65; Social Security modeled at the Trustees' 81% from 2034; Texas home rented, Klagenfurt home lived‑in; U.S.‑national healthcare basis):

1. **Spending base** = $165,000 × 30% = **$49,500/yr**.
2. **Pre‑65 bump** (U.S. national basis): per‑person premium = ($2,450 − $1,000)/2 = $725/mo; with both under 65 → +$17,400/yr. So the **need before 65 ≈ $66,900**, before the live‑in saving.
3. **Klagenfurt live‑in** saving ≈ $19,800 − ($324,000 × 1.2%) ≈ **+$15,900/yr**, applied from receipt; it pulls the pre‑65 need down to ≈ **$50,988** and the post‑65 need to ≈ **$33,588**.
4. **Texas rental** ≈ $790,000 × 3.5% ≈ **$27,650/yr** of income from receipt, covering most of the need so portfolio draws stay small.
5. **Social Security** at 81% from 2034 trims household benefits ~19% versus full funding; the risk panel shows the plan stays on track and that even a 0% scenario leaves savings lasting beyond 95 — because the pension, rental, and savings carry the load.

This illustrates the interaction the tool is designed to expose: the pre‑65 cliff raises the early draw, the inheritance choices reshape both income and need, and the Social Security scenario stress‑tests the whole structure.

---

## 6. Known Simplifications and Rationale

| Simplification | Why it is acceptable here | Where to be careful |
| --- | --- | --- |
| Single real return (no volatility) | Keeps the model legible and stable in today's dollars | Real markets vary; a depletion age is a guide, not a guarantee |
| Income used as career‑average proxy for PIA | Avoids requiring a full earnings history | Tends to overstate Social Security; reconcile with the SSA statement |
| Flat 0.64 single‑household scaling | A reasonable rule of thumb for shared fixed costs | A re‑costed single budget would differ by category |
| Simplified spousal rule, no survivor benefit | Sufficient for two living earners | Survivor planning (delaying to 70) is noted but not simulated |
| Net inheritance factors (TX 0.93, AT 0.90) | Captures the dominant tax effects cleanly | Austrian sale tax depends on the decedent's acquisition date and currency basis |
| Unsubsidized pre‑65 ACA figures | Conservative planning floor | Managing taxable income can unlock subsidies that lower the real cost |
| Qualitative state tax (except WA) | Avoids a 50‑state engine | High‑tax states (CA/NY) can materially change the resident outcome |
| Live‑in saving applied to the generic need | Captures the housing economics | For full fidelity, set the healthcare basis to the live‑in country |
