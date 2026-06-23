# Logic & Use-Case Specification — "Nest & Next"

> The computational logic behind every capability area of the calculator, written as a set of use cases. Each use case states its purpose, inputs, processing logic (with formulas), outputs, and edge cases. This document is the companion to the PRD; requirement IDs (FR‑*) cross‑reference it.
>
> **Tagline:** This is about your money, your home, and what comes next.

**Version:** 1.1 (Wave 1) · **Reference year:** 2026 · **Companion docs:** PRD; Sources & References

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
  - [3.18 UC-18 Year-by-Year Monthly Breakdown](#318-uc-18-year-by-year-monthly-breakdown)
- [4. Life Events & Downside Modeling](#4-life-events--downside-modeling)
  - [4.1 Discretionary Travel Spending](#41-discretionary-travel-spending)
  - [4.2 One-Time and Recurring Life Events](#42-one-time-and-recurring-life-events)
  - [4.3 Survivor Transition](#43-survivor-transition)
  - [4.4 Sequence-of-Returns Stress Path](#44-sequence-of-returns-stress-path)
  - [4.5 Headline Reconciliation: Modeled Spend, Capacity, and Surplus](#45-headline-reconciliation-modeled-spend-capacity-and-surplus)
  - [4.6 Long-Term Care](#46-long-term-care)
- [5. Worked Example: The Default Scenario](#5-worked-example-the-default-scenario)
- [6. Known Simplifications and Rationale](#6-known-simplifications-and-rationale)
- [7. Wave 1 Use Cases (B1, B2, C1, C2, C3, A3, E1)](#7-wave-1-use-cases-b1-b2-c1-c2-c3-a3-e1)
  - [UC-19 Return Presets and Monte Carlo Band (B1)](#uc-19-return-presets-and-monte-carlo-band-b1)
  - [UC-20 Sequence-of-Returns Stress Toggle (B2)](#uc-20-sequence-of-returns-stress-toggle-b2)
  - [UC-21 Retirement Spending Smile (C1)](#uc-21-retirement-spending-smile-c1)
  - [UC-22 Lifestyle Level and Permanent Step-Changes (C2)](#uc-22-lifestyle-level-and-permanent-step-changes-c2)
  - [UC-23 Typed Life Events with Emergent Flag (C3)](#uc-23-typed-life-events-with-emergent-flag-c3)
  - [UC-24 Accumulation Summary Card (A3)](#uc-24-accumulation-summary-card-a3)
  - [UC-25 Live Headroom Read-Out (E1)](#uc-25-live-headroom-read-out-e1)

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

**Inputs.** `spendBasis` (`"income"` default, or `"location"`); for income: `incomeHH`, `targetPct`; for location: the chosen location's cost basket `m` and `lifestyle` %. Both bases use the location's `hcPre`/`hcPost` (monthly couple healthcare), each spouse's age in the year, filing status, and any active live‑in housing saving.

**Logic.** Two opt‑in bases, selected by `spendBasis` in `spendingNeed()` (`src/finance/simulate.js`).

*Income basis (default):*

```js
base = incomeHH * targetPct
perPersonHC = max(0, (hcPre - hcPost)) / 2          // monthly premium per person <65
under65 = (ageA < 65 ? 1 : 0) + (ageB < 65 ? 1 : 0)
hcBump = perPersonHC * under65 * 12                 // annual bridge premium
need = max(0.35 * base, base + hcBump - liveSaving) // live-in reduces the need
```

*Location basis (opt‑in):* derive the need from the selected place's cost‑of‑living basket instead.

```js
living = sum(location.m) * 12 * scale * (lifestyle/100)   // scale = SINGLE_COST_FACTOR (0.64) if single/survivor, else 1
hcPer  = (age) => (age < 65 ? hcPre : hcPost) / 2          // hcPre/hcPost are couple-level
hc     = (single ? hcPer(soleAge) : hcPer(ageA) + hcPer(ageB)) * 12
need   = max(0.35 * (living + hc), living + hc - liveSaving)
```

Healthcare lives in `hcPre`/`hcPost`, **not** in the basket `m`, so summing them does not double‑count. `lifestyle` scales living costs only, not healthcare. Per‑year ages drive the pre‑/post‑65 healthcare step automatically.

**Outputs.** The year‑specific spending `need`.

**Edge cases.** The `max(0, …)` floors the income‑basis bump at zero where post‑65 cost exceeds pre‑65 (e.g., the Bahamas). Both bases floor the whole need at 35% of base so live‑in savings can't drive it implausibly low. The location basis uses one location for the **whole horizon** — **mid‑retirement relocation is not modeled**; the only location‑driven year‑to‑year change is the age‑65 healthcare step. Single‑person scaling is a flat factor (`SINGLE_COST_FACTOR`), not a per‑line‑item adjustment.

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

### 3.18 UC-18 Year-by-Year Monthly Breakdown

**Purpose.** Let the user advance through the plan one year at a time and see a "typical month" of income vs. expenses for the selected year, building intuition the whole-life charts can't.

**Implements.** FR‑VIZ‑06.

**Inputs.** A simulation row (`simChosen.rows[selected]`), the prior row (for milestone detection), the plan inputs (`stopA`/`stopB`), and the depletion age.

**Logic.** Implemented in `src/finance/breakdown.js`.

- `monthlyBreakdown(row)` — the engine is **annual-only**, so each figure is an honest per-month *rate* = the row's annual value ÷ 12:
  - **Income (non-portfolio):** `salA`, `salB`, `rent`, `pens`, `ssA`, `ssB`.
  - **Portfolio draw (reconciler):** `wdSpend ?? wd` — the gap-filler between income and expenses.
  - **Expenses:** core living = `need − extraSpend`; extra = `extraSpend` (travel/events/LTC); taxes = `tax`.
  - **Net:** `(incomeTotal + draw) − expenseTotal`. ≈ $0 in a binding retirement year (the draw is solved to meet the need); a positive surplus in working years (which the engine routes to contributions).
- `yearMilestones(row, prevRow, inputs, depAge)` — flags transitions by comparing to the prior row: SS start (you/spouse), pension start, RMDs begin, Medicare at 65, work-stop, home sale (with amount), survivor-year onset, depletion. These are **flagged for the year, not placed in a month**, because the model has no intra-year timing.

**Outputs.** A mirrored bar (income/draw up, expenses down from zero), a composition donut of income sources, a surplus/net summary, milestone badges (including recurring events from UC‑4.2, e.g. a car purchase), and an annual-totals context line — all for one selected year, navigable via slider / prev-next / play. A **view toggle** switches between "Typical month" (÷12) and "Full year" (annual totals); the section is **collapsible**; and clicking a year on the Staircase (UC‑17) jumps the navigator to it.

**Edge cases.**

- Zero-value series are dropped from the bars, donut, and legend.
- The selected year is clamped to the simulated range; it defaults to the first fully-retired year.
- **Location.** Figures reflect location only to the extent the engine's `need` does: the selected healthcare basis (`retireLoc` → `hcPre`/`hcPost`, UC‑8) and any inherited-home live-in saving (`liveSav`). The per-location cost-of-living tables (UC‑15) are **not** the spend basis, and **mid-retirement relocation is not modeled** — one healthcare basis applies across the horizon, with the only location-driven year-to-year change being the pre‑65 → 65 healthcare step. *(A future enhancement to derive the spend from the Places cost tables is tracked separately.)*

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

### 4.2 One-Time and Recurring Life Events

**Purpose.** Model large after-tax outflows — both one-time (gifts, home-purchase help, milestone celebrations) and recurring (a new car every ~10 years, ongoing home upkeep) — in the years they occur.

**Inputs.** `events[]` — an array of event objects `{ id, label, on, year, amount, everyYears?, untilYear? }`. Defaults cover common milestones (child weddings, home help, grandchild seed) plus a recurring **Vehicle replacement** ($45,000 every 10 years) and **Home upkeep (owners only)** ($6,000/yr); all **off by default**. `everyYears` absent ⇒ one-time. Users edit labels, year/start year, amount, repeat cadence, and an optional until-year, and add/remove events. All amounts are in today's (real) dollars.

**Logic** (`scheduledSpendForYear`, `src/finance/events.js`; `oneTimeSpendForYear` is a back-compat alias).

```js
function fires(e, cal) {
  if (!e.on || cal < e.year) return false
  if (e.everyYears > 0)                                   // recurring
    return cal <= (e.untilYear ?? Infinity) && (cal - e.year) % e.everyYears === 0
  return cal === e.year                                   // one-time
}
scheduledSpendForYear = (events, cal) =>
  events.reduce((sum, e) => fires(e, cal) ? sum + (Number(e.amount) || 0) : sum, 0)
```

The total for the calendar year is added to the spending `need` alongside travel. Because `need` is an after-tax target, the solver grosses up the portfolio withdrawal to cover taxes on the extra draw. Recurring events also surface as flagged badges in the year-by-year navigator (UC‑18).

**Edge cases.** Events are deterministic. One-time events (no `everyYears`) behave exactly as before. Recurring events fire on `(cal − year) % everyYears === 0` from `year` through `untilYear` (or the whole horizon if unset). **"Home upkeep (owners only)"** is labelled, not auto-suppressed — it applies whether the household owns or rents, so a renter should leave it off (the model has no explicit home-ownership flag). An event with `on = false` is never included; same-year events accumulate.

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

Figures are private-pay, pre-subsidy, in today's dollars; public LTC programs (Austria Pflegegeld, France APA, Netherlands WLZ, US Medicaid) reduce real out-of-pocket cost, so the modeled figure is conservative abroad. Per-location amounts and citations are in `docs/sources.md` §17 and `docs/archive/audits/ltc-research.md`.

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
| Monte Carlo uses lognormal paths | Standard model for equity-like returns; matches CFA research | Fat tails and autocorrelation are not captured; treat bands as planning ranges |
| Blanchett smile uses a smooth polynomial | Calibrated to published research; sufficient for planning | Individual spending trajectories vary; healthcare spikes are modeled separately |
| Lifestyle steps applied outside floor base | Keeps discretionary shifts separate from the core need | A very large negative step could produce a need below the 35% floor (clamped) |
| Emergent events excluded from baseline | Allows clean baseline vs. shock comparison | Users must actively flag events as emergent; the model does not auto-classify |
| Accumulation IRR uses a single portfolio | Reasonable for a combined household savings view | Commingled accounts obscure per-spouse contribution timing |
| Headroom solved by bisection on annual spend | Consistent with the main simulation engine; deterministic | Headroom ignores Monte Carlo variability — use the p10 band for a stress floor |

---

## 7. Wave 1 Use Cases (B1, B2, C1, C2, C3, A3, E1)

The following use cases document the seven planning-grade features added in Wave 1. Each follows the same template as Section 3.

---

### UC-19 Return Presets and Monte Carlo Band (B1)

**Purpose.** Let users choose a named return assumption and see the range of portfolio outcomes as an auto-rendered probability band rather than a single line.

**Implements.** FR‑MC‑01, FR‑MC‑02, FR‑MC‑03, FR‑MC‑04.

**Inputs.** `returnPreset` (`"conservative"` | `"balanced"` | `"growth"` | `"custom"`); `customReturn` (used when preset is `"custom"`); `variability` (annual std dev, default 0.07); all existing simulation inputs.

**Logic** (`src/finance/monteCarlo.js`).

```js
resolveReturn(preset, custom):
  { conservative: 0.035, balanced: 0.05, growth: 0.065, custom }[preset]

// Run N=200 lognormal paths; per-year return for path k:
r_k_y ~ lognormal( ln(1+mu) - 0.5*sigma^2, sigma )
  where mu = resolveReturn(preset, custom), sigma = variability

// Collect terminal or per-year balances; derive p10, p50, p90 across paths.
```

The debounced runner fires on any input change. Chart renders the p50 line as the primary balance trace; a shaded region fills between p10 and p90.

**Outputs.** Per-year `{ p10, p50, p90 }` balance arrays; headline median terminal balance plus the p10–p90 range label.

**Scenario.** *"The couple wants to know whether the Balanced preset changes their outlook vs. the Growth assumption they have been using, and how wide the uncertainty band is."* They switch from Growth (6.5%) to Balanced (5.0%): the median line drops and the p10 floor falls noticeably, revealing a tighter buffer. Increasing variability from 7% to 12% widens the band further. Returning variability to 0% collapses the band to the deterministic line — confirming the Monte Carlo is additive, not replacing the base model.

**Edge cases.** With `returnPreset = "custom"` and `variability = 0`, the result matches the pre-Wave-1 deterministic output exactly. Paths where the balance hits zero are counted toward the depletion-probability stat but do not error.

---

### UC-20 Sequence-of-Returns Stress Toggle (B2)

**Purpose.** Overlay a single illustrative "bad first decade" path on the balance chart to show the directional impact of sequence-of-returns risk.

**Implements.** FR‑STRESS‑01, FR‑STRESS‑02, FR‑STRESS‑03, FR‑STRESS‑04.

**Inputs.** `stress` boolean toggle (Advanced step); `realReturn`; all simulation inputs.

**Logic.** `stressReturnForYear(realReturn, yearIndex)` — see Section 4.4. The stress simulation is run in parallel with the base; only the balance array differs.

**Outputs.** A brass dotted line on the long-run balance chart; the stress-path depletion age (if earlier than base).

**Scenario.** *"The couple worries about retiring into a downturn like 2000–02. They enable the stress toggle to see how much earlier their savings might deplete."* With defaults, the stress path depletes roughly 3–5 years earlier than the deterministic base. They note the disclaimer that −10% is milder than the actual 2000–02 sequence and use the Monte Carlo p10 band for a broader distribution. They leave the toggle on as a persistent sanity check while adjusting other inputs.

**Edge cases.** The stress path applies only from the first retirement year (`yearIndex = 0`); pre-retirement years use the base return. With both the stress toggle and the Monte Carlo band active, the chart shows three distinct traces: p10/p50/p90 band, base deterministic line, and stress line — each visually distinct.

---

### UC-21 Retirement Spending Smile (C1)

**Purpose.** Shape the non-housing spending base to follow the Blanchett curve — declining in real terms through the go-go and slow-go phases, then upticking in the late-life no-go phase — with healthcare added on top.

**Implements.** FR‑SMILE‑01, FR‑SMILE‑02, FR‑SMILE‑03, FR‑SMILE‑04.

**Inputs.** `spendingShape` (`"flat"` | `"smile"` | `"custom"`); `retireAge` (the age the smile anchors to); per-year ages; all existing `need` inputs.

**Logic** (`src/finance/spendingShape.js`).

```js
smileMultiplier(age, retireAge, shape):
  if shape === "flat"   -> 1.0
  if shape === "smile"  -> polynomial calibrated to Blanchett (2014)
                           // ~1.0 at retireAge, declining to ~0.85 at retireAge+15,
                           // rising to ~0.95 at retireAge+30
  if shape === "custom" -> user-supplied multiplier table (linear interpolation)

need_y = smileMultiplier(age_y, retireAge, shape) * _floorBase + hcBump_y + extraSpend_y
```

Healthcare (`hcBump_y`) and discretionary extras (`extraSpend_y`) are **not** scaled by the multiplier.

**Outputs.** A year-specific `need` that follows the smile curve; the staircase chart spending-need dashed line visibly bows down then up.

**Scenario.** *"The couple reads about the Blanchett spending smile and wants to model lower real spending in their 70s (fewer travel impulses, less entertainment) with a healthcare uptick in their late 80s."* They switch from Flat to Smile: the staircase need-line dips from ages 72–82 and then curves back up. The headroom figure (UC‑25) increases in the middle years, reflecting the lower draw. They confirm the late-life uptick is captured separately by enabling the LTC episode (Section 4.6) on top.

**Edge cases.** `spendingShape = "flat"` (default) leaves all outputs numerically identical to the pre-Wave-1 baseline. The smile multiplier is floored at a minimum so the need never drops below the 35% floor base. Custom shape requires at least two anchor points; the engine interpolates linearly between them.

---

### UC-22 Lifestyle Level and Permanent Step-Changes (C2)

**Purpose.** Scale the overall spending level and schedule permanent up- or down-shifts in annual spending from chosen years.

**Implements.** FR‑LSTEP‑01, FR‑LSTEP‑02, FR‑LSTEP‑03, FR‑LSTEP‑04.

**Inputs.** `lifestyleLevel` (percentage, default 100%); `lifestyleSteps[]` — array of `{ fromYear, deltaAnnual }` objects; all existing `need` inputs.

**Logic** (`src/finance/lifestyleSteps.js`).

```js
lifestyleStepDelta(steps, cal):
  steps
    .filter(s => cal >= s.fromYear)
    .reduce((sum, s) => sum + s.deltaAnnual, 0)

need_y = smileMultiplier * (_floorBase * lifestyleLevel/100)
       + lifestyleStepDelta(lifestyleSteps, cal_y)
       + hcBump_y + extraSpend_y
```

Step deltas are cumulative: each active row's `deltaAnnual` is summed. Steps are applied after the smile multiplier and outside `_floorBase`, so they do not affect the 35% floor.

**Outputs.** A per-year `need` that reflects the lifestyle scale and any permanent shifts; changes are visible on the staircase need-line from the chosen `fromYear`.

**Scenario.** *"The couple plans to downsize from their primary home in 2035, cutting housing-related spending by $8,000/yr permanently. They also set lifestyle to 90% to reflect a leaner retirement than their current income suggests."* They add a step `{ fromYear: 2035, deltaAnnual: -8000 }` and set `lifestyleLevel = 90`. The staircase shows the need-line stepping down sharply in 2035; the headroom figure improves. They later add a second step `{ fromYear: 2045, deltaAnnual: +4000 }` for anticipated higher maintenance costs — the model stacks both.

**Edge cases.** An empty `lifestyleSteps` array (default `[]`) with `lifestyleLevel = 100` produces identical output to the pre-Wave-1 baseline. A delta large enough to push `need` below the 35% floor is clamped silently; the UI warns if the floor is binding.

---

### UC-23 Typed Life Events with Emergent Flag (C3)

**Purpose.** Classify life events by type (gift, purchase, windfall) and separate planned from unplanned spending using an "emergent" flag, enabling a Baseline vs. Shock comparison.

**Implements.** FR‑EVT‑01, FR‑EVT‑02, FR‑EVT‑03, FR‑EVT‑04.

**Inputs.** `events[]` — extended with `type` (`"gift"` | `"purchase"` | `"windfall"`) and `emergent` (boolean); `ssOpt` and all simulation inputs.

**Logic** (`src/finance/events.js`).

```js
// Baseline simulation: exclude emergent events
baselineEvents = events.filter(e => !e.emergent)

// Shock simulation: include all events
shockEvents = events

// Windfall events net negative (reduce need):
effectiveAmount(e) = e.type === "windfall" ? -Math.abs(e.amount) : Math.abs(e.amount)
```

The UI renders a **Baseline vs. Shock** overlay on the long-run balance chart: when at least one emergent event is active, a dashed clay line shows the shock-scenario portfolio balance alongside the baseline, so the user can see the buffer their plan must carry for surprises.

**Outputs.** Two simulation runs: `simBaseline` (no emergent events) and `simShock` (all events); the shock balance is overlaid as a dashed line on the long-run chart when any emergent event is enabled.

**Scenario.** *"The couple knows they'll need a roof replacement (~$25,000) and a furnace (~$12,000) sometime in their early 70s but can't be sure of the year. They flag both as emergent purchases."* The baseline shows their plan without these shocks; the shock scenario subtracts both in the flagged year. The depletion age in the shock scenario shifts 18 months earlier, confirming the plan has enough buffer to absorb both — but only just. They decide to raise their contribution by $1,000/yr and re-check the shock delta.

**Edge cases.** A windfall event (e.g. an unexpected inheritance of $50,000) reduces the shock-scenario need in its year, potentially making the shock balance *better* than baseline. Non-emergent events are included in both simulations unchanged; the emergent flag is purely additive. An event with `emergent = false` and `type` set behaves identically to the pre-Wave-1 life events.

---

### UC-24 Accumulation Summary Card (A3)

**Purpose.** Show a read-out of working-phase portfolio growth — projected retirement balance, total contributed vs. total growth, and effective blended real return — while at least one spouse is still working.

**Implements.** FR‑ACC‑01, FR‑ACC‑02, FR‑ACC‑03.

**Inputs.** The simulation rows from today through the last working year; `stopA`, `stopB`, `ageA`, `ageB`, `savings`, `contrib`, `realReturn`.

**Logic** (`src/finance/accumulation.js`).

```js
accumulationSummary(rows, stopAgeA, ageA, stopAgeB, ageB):
  workingRows = rows.filter(r => r.aA < stopAgeA || r.aB < stopAgeB)
  balAtRetirement = workingRows.at(-1).bal
  totalContributed = workingRows.reduce((s, r) => s + r.contrib, 0)
  totalGrowth = balAtRetirement - savings - totalContributed
  effectiveReturn = IRR([-savings, ...workingRows.map(r => r.contrib), balAtRetirement])
```

The card is visible only while `workingRows` is non-empty (i.e. at least one spouse has not yet reached their stop-working age).

**Outputs.** Card with four tiles: projected balance at retirement, total contributed, total growth, effective blended real return.

**Scenario.** *"The younger spouse is considering whether to increase their 401(k) contribution from $10,000 to $15,000 per year. They want to see how much the extra $5,000/yr compounds over their remaining 17 working years."* With contributions raised, the accumulation card shows the projected retirement balance rising by ~$130,000 (reflecting both the extra principal and compound growth), while the effective blended return stays the same — isolating the contribution effect from the return assumption.

**Edge cases.** Once both spouses have retired, the card is hidden. If `stopA == stopB` (simultaneous retirement), the card disappears in the same year. With `savings = 0` and `contrib = 0`, all tiles show $0 / 0%.

---

### UC-25 Live Headroom Read-Out (E1)

**Purpose.** Show the maximum additional annual spending the plan can absorb to the horizon — or the annual shortfall and depletion age if the plan is already short — recomputed live on every input change.

**Implements.** FR‑HEAD‑01, FR‑HEAD‑02, FR‑HEAD‑03, FR‑HEAD‑04.

**Inputs.** All simulation inputs; `horizonAge` (default 95); `ssOpt`.

**Logic** (`src/finance/headroom.js`).

```js
spendingHeadroom(inp, simulate, horizonAge, ssOpt):
  // Binary-search for the largest delta such that the portfolio survives to horizonAge
  lo = 0; hi = 500_000
  while hi - lo > 100:
    mid = (lo + hi) / 2
    sim = simulate({ ...inp, extraAnnualSpend: mid }, ssOpt)
    if sim.depAge == null || sim.depAge >= horizonAge: lo = mid
    else: hi = mid
  headroom = lo

  // If the base plan already depletes before horizonAge, show shortfall instead:
  baseSim = simulate(inp, ssOpt)
  if baseSim.depAge != null && baseSim.depAge < horizonAge:
    return { mode: "shortfall", depAge: baseSim.depAge, annualShortfall: -headroom }
  return { mode: "headroom", value: headroom }
```

The read-out is debounced (~300ms) to avoid re-running on every keystroke.

**Outputs.** Either `{ mode: "headroom", value }` (plan solvent to horizon) or `{ mode: "shortfall", depAge, annualShortfall }` (plan depletes early); rendered prominently near the headline.

**Scenario.** *"After enabling the spending smile (UC‑21) and a −$8,000 lifestyle step (UC‑22), the couple wants to know how much annual spending they could still add — perhaps a more generous travel budget — before their plan breaks."* The headroom read-out shows $14,200/yr of additional capacity. They add a travel event of $10,000/yr and watch the headroom drop to $4,200, confirming there is still a buffer. They then enable a $25,000 emergent roof replacement (UC‑23) in the shock scenario: the headroom panel updates automatically, showing how the buffer shrinks under the shock.

**Edge cases.** If the base plan has no depletion age (balance positive at 95 with zero extra spend), headroom is the maximum spend increase before the first depletion. If the plan already depletes at or before the current year, `annualShortfall` is the amount by which guaranteed income falls short of the modeled need. Headroom ignores Monte Carlo variability — users should cross-check against the p10 band (UC‑19) for a stress-adjusted floor.

---

## 8. Wave 2 Use Cases (H1–H4, T1–T3, L1–L3)

The following use cases document the Wave 2 "Place & Housing" features. Each follows the same template as Section 3.

---

### UC-26 Housing and Mortgage Module (H1)

**Purpose.** Model the household's primary housing cost as an explicit engine flow — rent, amortizing mortgage, or paid-off carrying cost — separate from the lifestyle spending percentage.

**Implements.** FR‑MORT‑01..06.

**Inputs.** `housing.tenure` (`"rent"` | `"mortgage"` | `"own"`); for `mortgage`: `homeValue`, `downPct`, `loanTermYears`, `annualRate`, `originationYear`; `s.inflation` (now a real engine input).

**Logic** (`src/finance/housing.js`).

```js
// Monthly P&I (standard amortization)
principal = homeValue * (1 - downPct)
monthlyRate = annualRate / 12
n = loanTermYears * 12
monthlyPI = principal * monthlyRate * (1 + monthlyRate)^n
           / ((1 + monthlyRate)^n - 1)
annualPI_nominal = monthlyPI * 12

// Real deflation each simulation year y (y=0 is origination year)
annualPI_real(y) = annualPI_nominal / (1 + s.inflation)^y

// Zero at payoff
payoffYear = originationYear + loanTermYears
housingCostForYear(y, cal) =
  tenure === "rent"     ? rentAmount                          // real-flat
  tenure === "own"      ? homeValue * ownRate                 // real-flat carrying cost
  cal < payoffYear      ? annualPI_real(cal - originationYear) // deflated P&I
                        : homeValue * ownRate                  // carrying cost post-payoff
```

**Outputs.** `housingCostForYear` — the real housing cost for each simulation year; `payoffYear`; `remainingBalance(cal)` for the relocation transition (UC‑28).

**Scenario.** *"The couple is currently renting but plans to buy a $650,000 home with 20% down on a 30-year mortgage at 6.5% before retiring. They want to see the housing-cost cliff when the mortgage is paid off at age 77."* They set tenure to `mortgage` and enter the loan parameters. The staircase chart shows real P&I declining each year (nominal payment constant, but worth less in real terms) and a sharp drop at `payoffYear` to carrying-cost only (~$7,000/yr property tax + insurance). The headroom figure improves noticeably after payoff.

**Edge cases.** `annualRate = 0` is guarded (returns equal principal payments). `downPct = 1.0` (fully paid off at origination) behaves as `own` from year 0. `s.inflation = 0` leaves P&I flat in real terms (matching the nominal payment exactly).

---

### UC-27 Non-Housing Floor Policy and Housing-Explicit Need (H2, H3)

**Purpose.** Apply the 35% spending floor to non-housing essentials only; add housing as its own line outside the floor; reframe `targetPct` as the non-housing lifestyle share.

**Implements.** FR‑FLOOR‑01..03, FR‑HEXP‑01..03.

**Inputs.** `targetPct` (non-housing lifestyle, default 0.28); `housing.tenure` and cost from UC‑26; `spendBasis`; existing healthcare and floor logic.

**Logic** (`src/finance/simulate.js` — `composeNeed`).

```js
// Non-housing base (lifestyle only)
nonHousingBase = incomeHH * targetPct   // income basis
               | locationBasket * lifestyle/100  // location basis (rent excluded from basket)

// Floor applies to non-housing only
floored = max(0.35 * nonHousingBase, nonHousingBase + hcBump)

// Housing added outside the floor — always paid in full
need = floored + housingCostForYear(y, cal)
```

**Outputs.** `need` decomposed into `nonHousingNeed` and `housingCost` — both visible in the staircase chart and monthly navigator.

**Scenario.** *"The couple wants to understand what happens to their spending need when they switch from the old 40% income target to the new housing-explicit model with a 28% non-housing lifestyle share and a separate mortgage line."* With the new defaults, the staircase shows two components stacked on the need line: a lower lifestyle floor and a housing P&I band above it. Total need is similar at first; after payoff the housing band drops away entirely, revealing the floor-only need in their late 70s.

**Edge cases.** A very low `targetPct` (e.g. 0.15) may push `nonHousingBase` below `0.35 × nonHousingBase` — the floor clamps it. Housing is added after the clamp, so a $2,000/mo mortgage is always in the need regardless of lifestyle level.

---

### UC-28 Inherited Live-In to Owned Tenure (H4)

**Purpose.** When an inherited home is set to "Live in," switch housing tenure to owned carrying cost rather than applying a stacked rent-avoided credit.

**Implements.** FR‑LIVEIN‑01..03.

**Inputs.** Inherited property with `strategy = "live"`, `value`, `ownRate` (from `PROP` constants), `year` received.

**Logic.**

```js
// From the year the property is received, tenure overrides to "own"
if (prop.strategy === "live" && cal >= prop.year) {
  housing.tenure = "own"
  housing.homeValue = prop.value
  housing.ownRate = PROP[prop.key].ownRate
  // no liveSaving credit applied — carrying cost IS the housing line
}
```

**Outputs.** Housing cost = `ownRate × value` from `prop.year`; no rent-avoided credit in the spending need.

**Scenario.** *"The couple inherits the Klagenfurt home in 2038 and chooses to live in it. Under Wave 2 the housing line switches from their prior rent amount to the Austrian carrying cost (~€3,900/yr ≈ $4,200/yr at the model's fixed rate) — a large drop from US rent levels. The staircase shows the housing band shrinking sharply at inheritance year."* They compare this to the "Rent" strategy ($6,480/yr net income) and the "Sell" lump sum (~$291,600 added to the portfolio). The carrying-cost path is far cheaper than US housing but yields no rental income — the right choice depends on their lifestyle preferences.

**Edge cases.** If both properties are set to "Live in," the engine uses the later-received property's `ownRate` (only one primary home at a time). The Texas live-in path produces a positive carrying cost (~$21,300/yr) because property tax exceeds the equivalent rent saving — the UI flags this in a warning color.

---

### UC-29 Typed Residence Tax — US States (T1)

**Purpose.** Apply income-type-aware state income tax rates from the curated ~14-state picker, composing on the federal engine.

**Implements.** FR‑RES‑01..04.

**Inputs.** `retireLoc` (or `workLoc` for working years); the year's income breakdown (ordinary, pension, SS, Roth); `residenceTax.js` state table.

**Logic** (`src/finance/residenceTax.js`).

```js
residenceTaxForYear(profile, base) {
  // profile = { ordinaryRate, pensionExempt, ssExempt, rothExempt }
  // base = { ordinary, pension, ss, roth }
  taxable = base.ordinary * (1 - profile.ordinaryRate_exempt_frac)
          + (profile.pensionExempt ? 0 : base.pension)
          + (profile.ssExempt      ? 0 : base.ss)
  // Roth always exempt
  return taxable * profile.ordinaryRate
}
```

**Outputs.** Annual residence-tax amount added to the year's total tax; shown as a separate line in the monthly breakdown.

**Scenario.** *"The couple is deciding between retiring in Texas (no state income tax) versus California (up to 13.3% on ordinary income). They enter the same income profile for each and compare the after-tax income."* Selecting CA as `retireLoc` reduces net sustainable income by roughly $8,000–$12,000/yr on a $120,000 gross income, making several locations drop one lifestyle tier. Switching to TX or NV shows zero state tax and immediately improves the headline. The staircase chart shows the residence-tax wedge as a distinct colored band between gross income and the spending need.

**Edge cases.** When `retireLoc` is WA or TX (no income tax), `profile.ordinaryRate = 0` and the layer is inert — identical to the pre-Wave-2 behavior. The `addlTaxRate` manual override path bypasses the per-type logic and applies a flat rate to ordinary income, preserving backward compatibility.

---

### UC-30 Typed Residence Tax — International and Treaty (T2)

**Purpose.** Apply planning-grade treaty-aware effective rates by income type for international retirement locations.

**Implements.** FR‑TREATY‑01..04.

**Inputs.** International `retireLoc`; per-year income breakdown; treaty profile for the selected country (`pensionExclusion`, `iraEffectiveRate`, `ssExempt`, `rothExempt`).

**Logic.**

```js
// Government DRS pension: taxable only by the US (source rule) — 0 residence tax
pensionResidenceTax = 0   // pensionExclusion === "full"

// IRA/401(k) draws: residence-taxed at effective net-of-treaty rate (after FTC)
iraResidenceTax = base.ordinary * profile.iraEffectiveRate

// Social Security: per treaty flag
ssResidenceTax = profile.ssExempt ? 0 : base.ss * profile.ssRate

// Roth: never taxed
// Total residence tax:
residenceTax = pensionResidenceTax + iraResidenceTax + ssResidenceTax
```

**Outputs.** Per-type residence-tax breakdown; effective rate caption in the UI; "Consult a cross-border specialist" disclaimer.

**Scenario.** *"The couple is considering retiring to Klagenfurt, Austria. They want to see the combined US worldwide tax and Austrian residence tax on their income mix (DRS pension, IRA draws, Social Security, Roth)."* The model shows: DRS pension — 0 Austrian tax (government-pension source rule), full US tax; IRA draws — small Austrian residual after the FTC (~0–3% effective); SS — exempt under the US-Austria treaty; Roth — 0 in both jurisdictions. The dual-tax panel (UC‑31) then reconciles the FTC to show net US liability. Austria's effective rate is flagged "verify" in the UI (L11).

**Edge cases.** A country with no US tax treaty has no `ssExempt` flag and no FTC-offsetting rate; IRA draws are taxed at the full local marginal rate. With `iraEffectiveRate = 0` and `ssExempt = true` (e.g. a treaty-favorable country), the residence layer is near-zero and the plan resembles a WA-resident scenario.

---

### UC-31 Dual-Tax Exposure Panel (T3)

**Purpose.** For international retirees, surface worldwide US taxation, the Foreign Tax Credit, government-pension source rule, and cross-border filing flags in a planning-grade panel.

**Implements.** FR‑DTAX‑01..03.

**Inputs.** International `retireLoc`; the year's federal tax (UC‑6); residence tax (UC‑30); income breakdown.

**Logic.**

```js
// US worldwide tax = federal tax on all global income (computed by existing engine)
usTax = federalTaxYear(income, status)

// FTC = residence tax paid abroad (capped at the US tax on the same income)
ftc = min(residenceTax, usTax * foreignIncomeShare)

// Net US tax after FTC
netUSTax = usTax - ftc

// Filing flags (informational only)
flags = [
  hasForeignAccounts > 10000 ? "FBAR (FinCEN 114)" : null,
  hasForeignAssets > threshold ? "FATCA (Form 8938)" : null,
  hasForeignTrustGifts ? "Form 3520" : null,
].filter(Boolean)
```

**Outputs.** Panel with: US worldwide tax, FTC, net US tax, government-pension source-rule note, filing flags. Persistent disclaimer: "Planning-grade estimate only. Consult a cross-border tax specialist."

**Scenario.** *"The couple has moved to Austria and wants to understand their full US tax picture — they know US citizens are taxed worldwide and want to see how the Foreign Tax Credit reduces their US bill."* The panel shows US tax of ~$18,000 on their $120,000 gross income; FTC of ~$3,000 from Austrian tax paid on IRA draws; net US tax ~$15,000. The DRS pension note explains it is taxable only by the US — the Austrian side is zero. FBAR and FATCA flags appear because they have Austrian bank accounts. The disclaimer directs them to a cross-border specialist for binding figures.

**Edge cases.** If the FTC equals or exceeds the US tax on foreign-source income, net US tax on that income is zero (but the FTC cannot create a US tax refund). The panel is hidden when `retireLoc` is a US state (no dual-tax exposure for domestic retirees).

---

### UC-32 Work-vs-Retire Two-Location Split (L1)

**Purpose.** Apply the correct tax jurisdiction each year: work-location rates during earning years, retirement-location rates after relocation.

**Implements.** FR‑RELO‑01..04.

**Inputs.** `workLoc`, `retireLoc`, `relocationYear`; per-year simulation calendar.

**Logic** (`activeJurisdiction` in `src/finance/residenceTax.js`).

```js
activeJurisdiction(i, cal) {
  // i = simulation year index, cal = calendar year
  return cal < relocationYear ? jurisdictionFor(workLoc)
                              : jurisdictionFor(retireLoc)
}

// ACA bridge gates on not-working, not age alone (post-Wave-2)
acaBridgeActive(y) = !working(y) && spouseAge(y) < 65
```

**Outputs.** Per-year jurisdiction record used by `residenceTaxForYear`; correct ACA bridge trigger.

**Scenario.** *"The couple earns income in California but plans to retire to Nevada in 2032. They want to confirm that their wages are taxed at CA rates before the move and that Nevada's zero income tax applies from 2032 onward — and that the ACA bridge fires when they stop working, not when they turn 65."* With `workLoc = CA` and `retireLoc = NV`, the staircase shows a CA residence-tax band on wage years and a zero band from 2032. The ACA bridge appears the year the last spouse retires (2032), regardless of age, and drops at 65 as before.

**Edge cases.** `workLoc === retireLoc` (no relocation): `activeJurisdiction` always returns the same record; behavior is identical to pre-Wave-2 single-location path. `relocationYear` before the current year: the work-loc tax phase is never shown (already past); the engine uses `retireLoc` for all years.

---

### UC-33 Relocation Home Transition (L2)

**Purpose.** At relocation, sell the work home (default) or keep it as a rental, and switch to retirement-location housing.

**Implements.** FR‑HTRANS‑01..05.

**Inputs.** `workLoc ≠ retireLoc`; work-home tenure (`mortgage` or `own`); `homeTransition` (`"sell"` | `"keep"`); `homeValue`, `remainingBalance(relocationYear)`.

**Logic.**

```js
// Sell path (default)
if (homeTransition === "sell") {
  sellNet = homeValue * 0.93 - remainingBalance(relocationYear)
  portfolio += sellNet                    // added to balance in relocationYear
  workPI = 0                              // work-home P&I zeroed from relocationYear
  // switch to retireLoc housing tenure
}

// Keep as rental path
if (homeTransition === "keep") {
  rentalIncome += homeValue * workLocRentYield   // net rental income
  landlordCost  = remainingBalance > 0 ? annualPI : ownRate * homeValue
  // property tax / insurance / upkeep on retained home NOT modeled (L13)
}
```

**Outputs.** Portfolio bump (sell path) or rental income + landlord cost (keep path); "Home sold at relocation" milestone badge; work-home P&I zero from `relocationYear`.

**Scenario.** *"The couple owns their Seattle home (worth $900,000 with $320,000 remaining on the mortgage) and plans to retire to Tucson, AZ in 2031. They want to see the effect of selling at the move: net proceeds of ~$837,000 − $320,000 = ~$517,000 added to the portfolio, eliminating the $2,800/mo mortgage payment and freeing up the balance sheet for the Tucson housing cost."* The balance chart shows a step up at 2031; the staircase drops the P&I band and replaces it with the Tucson rent or mortgage line. They also explore the "keep as rental" path: rental income offsets the remaining P&I, but the net is small ($1,200/yr surplus) and they note that property tax and upkeep on the Seattle home are not modeled (L13) — the real-world economics are worse than shown.

**Edge cases.** `workLoc === retireLoc`: no transition is triggered; the mortgage continues unchanged. `sellNet < 0` (underwater mortgage): the portfolio decreases by the shortfall — the UI flags this. `homeTransition = "keep"` with no remaining mortgage: the landlord cost is `ownRate × homeValue`; rental income net of that cost is the relevant figure.

---

### UC-34 Month-View Housing Itemization (L3)

**Purpose.** Show housing costs as distinct sub-lines in the monthly breakdown navigator, separate from core living expenses.

**Implements.** FR‑MHOUSING‑01..03.

**Inputs.** The year's `housingCostForYear` (from UC‑26); `tenure`; `payoffYear`; `monthlyBreakdown` row.

**Logic** (`src/finance/breakdown.js`).

```js
// Expense side of the monthly mirrored bar
expenses = {
  housing: housingCostForYear(y, cal) / 12,   // Rent -or- P&I + property tax
  coreLiving: (need - housingCost - extraSpend) / 12,
  extra: extraSpend / 12,
  taxes: tax / 12,
}

// Milestone badge
milestones = [
  ...existingMilestones,
  cal === payoffYear ? { label: "Mortgage paid off", type: "housing" } : null,
].filter(Boolean)
```

**Outputs.** Monthly breakdown with Housing as a named sub-line; "Mortgage paid off" badge at `payoffYear`.

**Scenario.** *"The couple wants to see their month-by-month housing cost alongside core living in their early retirement years — and to confirm that the navigator flags the year their mortgage is paid off."* In the navigator for age 65 (pre-payoff), the expense bar shows three segments: Housing ($2,400/mo P&I), Core living ($1,800/mo non-housing lifestyle), and Taxes ($1,200/mo). In the payoff year (age 77), a "Mortgage paid off" badge appears and the Housing segment drops to $580/mo (property tax + insurance only). The headroom figure improves noticeably from that year onward.

**Edge cases.** `tenure = "rent"`: the Housing sub-line shows the rent amount; no payoff badge. `tenure = "own"` (paid off from the start): Housing shows carrying cost only; no payoff badge (payoffYear is undefined). Zero-value sub-lines are suppressed from the bar and legend consistent with existing behavior (UC‑18).
