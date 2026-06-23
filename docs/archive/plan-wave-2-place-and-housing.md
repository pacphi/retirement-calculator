# Wave 2 — Place & Housing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the retirement plan **place-bound and housing-explicit**: a first-class housing/mortgage module (which brings inflation into the engine as the one sanctioned nominal flow), a typed income-type-aware state-tax layer that composes on the federal engine, location property tax, a work-vs-retire two-location jurisdiction split, the inherited-live-in→owned tenure override, and a richer month-by-month view — all attaching to the Wave 0 seams.

**Architecture:** Land the shared shapes first (typed `taxProfile` + curated US state data; the state-tax composition seam; new state fields). Then build the housing module and **recompose the spending need to be housing-explicit (default-on)**, which re-baselines the persona's headline. Then the typed state-tax application, property tax, and the work/retire jurisdiction switch compose on top. Finally the month view and docs. Unlike Waves 0–1, Wave 2 **intentionally changes default numbers** — tasks re-baseline tests rather than assert numeric identity, except where noted.

**Tech Stack:** React 19, Vite, Vitest 4 + @testing-library/react 16, Recharts 3, pure ES-module finance engine under `src/finance/**` re-exported by `src/calculatorCore.js`.

## Decisions baked in (confirmed with the user)

1. **Floor policy (the carried-forward constraint).** When housing > 0, the 0.35 floor applies to **non-housing essentials only**; housing (rent / mortgage P&I / property tax / insurance / maintenance) is a hard obligation **always paid in full, added OUTSIDE the floor `max`**:
   `need = Math.max(0.35 * nonHousingFloorBase, nonHousingTotal − liveSav) + housing`.
2. **State tax granularity.** A **curated ~14-state** `US_STATE_TAX` table (the spread from no-tax to high-tax), each source-linked, with a planning-grade **effective flat rate** per state plus type flags (`taxesSS`, `pensionExclusion`, `taxesTradWithdrawal`, `wageRate`). Not all 50.
3. **Housing-explicit need = DEFAULT-ON.** `targetPct` is reframed as **non-housing lifestyle**, housing becomes its own line. The default `targetPct` is **retuned `0.40 → 0.28`** so the persona's total need stays comparable; the default persona gets a sensible housing config (rent at the retire location, overridden to owned by the inherited Klagenfurt live-in from 2040). The default headline WILL move — Task 4 reports the exact before/after and re-baselines tests.
4. **Two-location split included.** `workLoc` / `retireLoc` / `relocationYear`; per-year `activeLoc = cal < relocationYear ? workLoc : retireLoc` drives the residence-tax face (wages vs. retirement-income) and the cost-of-living basis. Default `workLoc = "WA"` (no wage tax) preserves the working-years numbers; the retirement side moves per (3).

5. **Unified treaty-aware residence-tax layer (US state OR foreign).** The typed `taxProfile` shape serves **both** worlds. The composing layer is `residenceTax.js` (generic over any profile), not US-only. International locations (Austria, Portugal, …) get the same typed profile — treaty-aware:
   - **Government pension** (the engine's `pension` field IS the WA DRS government pension) → under the treaty's government-service article it is taxable **only by the US**, so a foreign residence does **not** tax it: encode as `pensionExclusion: "full"` on every international profile.
   - **Private pension / IRA / 401(k) deferred withdrawals** → typically taxable by the **residence** country, net of the US Foreign Tax Credit (FTC): `taxesTradWithdrawal: true` with an **effective net-of-treaty** `retireRate`.
   - **Social Security** → per treaty, set `taxesSS` per location.
   - **Roth** → tax-free everywhere (the non-deferred withdrawal share is never in the residence base).
   This is **planning-grade, not a treaty engine**: effective net-of-treaty rates + per-type flags, never statutory article computation. It is paired with a **dual-taxation exposure panel** (Task 6) that surfaces the qualitative considerations (US worldwide taxation still applies; FTC mechanics; the government-pension source rule; Form 3520 / FBAR / FATCA filing flags), each source-linked, keeping the "consult a cross-border specialist" framing. The US federal engine already models US worldwide taxation; this layer adds only the residence-country increment.

## Global Constraints

- **Real-dollar consistency — ONE nominal flow.** The engine stays in today's dollars; the **only** nominal flow is mortgage P&I, deflated each projection year `realPI(y) = annualPI / (1 + inflation)^y` and **zeroed the year after payoff**. `s.inflation` graduates from a display label to a real engine input — document this at the boundary. Property tax, insurance, maintenance, and rent are **real-flat**. (Spec §3.1; v2 §7.)
- **One federal tax engine.** `calculateFederalTaxYear` is NEVER forked. The typed **residence-tax** layer (US state OR foreign jurisdiction) **composes on top** via a new `finance/residenceTax.js`; when no typed profile is active the result reduces to today's flat `stateRate × taxableIncome` exactly. The US federal engine already models US worldwide taxation for citizens abroad; the residence layer adds only the residence-country increment (net of treaty/FTC for international). It never computes treaty articles statutorily — effective rates + per-type flags only. (Spec §3.2; v2 §7; v3 treaty depth confirmed.)
- **Determinism.** Deterministic projection stays seedless/date-free; all randomness only in `monteCarlo.js`. (Spec §3.3.)
- **Planning-grade honesty.** Every new assumption (amortization, state `taxProfile`s, property-tax rates, the jurisdiction switch) gets a dated, source-linked constant in `src/retirementData.js` + an in-app caption. Captions must state: the transition year is simplified (no part-year apportionment; 183-day residency tests are professional territory), property/income tax are county-local approximations, and the federal Pension Source Tax Act is the modeling license for the clean switch. Keep the "consult a specialist" framing. (Spec §3.4; v3 §8.)
- **No double-counting housing.** Housing is removed from the implicit replacement-rate need the SAME change it's added explicitly (Task 4); for the location basis, rent is removed from the cost-of-living basket; the inherited live-in saving converts to a tenure override (Task 5), not a stacked credit. (v2 §7.)
- **Tests + docs lockstep.** Each engine change updates `calculatorCore.test.js`; each new control gets an accessible-label check in `RetirementCalculator.test.jsx`; `docs/prd.md` + `docs/use-cases.md` reconciled (Task 10). Because the default projection changes, re-baselined tests must assert the NEW intended values with a comment explaining the Wave-2 reshape.
- **Behavior-change discipline.** Tasks 1–2 are behavior-preserving (shapes + a reduce-to-identity state-tax seam). Task 4 onward intentionally change defaults; every such task states the before/after in its report and re-baselines, never silently mutates an assertion.
- **No attribution trailer** in commits. **Wave gate:** `pnpm lint && pnpm lint:md && pnpm typecheck && pnpm test && pnpm build && pnpm links` all green. **Theme:** brass `#B5852C` / viridian `#1E7A5E` / clay `#BE4A2B`; Inter / Newsreader / JetBrains Mono via `src/components/theme.js`; keep disclaimers + source links visible.

---

## Engine background (read before starting)

- `src/finance/tax.js` — `calculateFederalTaxYear({status, ageA, ageB, wages, pension, rental, grossWithdrawal, tradFrac, socialSecurity, year, stateRate})` returns `{ordinary, taxableSocialSecurity, agi, deduction, taxableIncome, federalTax, stateTax, tax}`. **Today `stateTax = stateRate × taxableIncome` is computed INSIDE.** Wave 2 leaves federal logic untouched but routes state tax through a composing layer (Task 2).
- `src/finance/simulate.js` — the year loop. `taxForYear`/`solveWithdrawal` call `calculateFederalTaxYear`. `spendingNeed → spendingComponents/composeNeed` (seams.js) builds `need`; the `housing`/`lifestyleSteps`/`events` slots already exist in `composeNeed` (housing currently 0). The inheritance loop (`for (const p of i.inher)`) handles `rent`/`live`/`sell`. `i.taxRate` is the flat state rate applied every year (the v3 bug: wages taxed at the retire-state rate).
- `src/finance/seams.js` — `spendingComponents(i, ageA, ageB, ctx)` returns `{nonHousingBase, healthcare, housing, lifestyleSteps, events, _floorBase}`; `composeNeed(parts, liveSav)` = `Math.max(0.35*_floorBase, total − liveSav)`. **Task 4 changes composeNeed to add housing OUTSIDE the max.**
- `src/finance/plan.js` — `buildPlanInputs` (defaults, `taxRate` from `stateRate` override or `retLocObj.addlTaxRate`), `calculatePlan` (scenario fan-out).
- `src/finance/breakdown.js` — `monthlyBreakdown(row)` / `yearMilestones(...)`; Task 9 extends these to itemize housing.
- `src/retirementData.js` — `LOCATIONS` (international + a few US buckets, each with `m{rent,...}`, `hcPre/hcPost`, `addlTaxRate`), `PROP` (inherited tx/at homes: `ownRate`, `rentMo`, `sellNet`, `rentYield`), `SINGLE_COST_FACTOR`, `SOURCES`.

---

## File structure (created/modified this wave)

**Foundation (Tasks 1–2):**

- Modify: `src/retirementData.js` — `US_STATE_TAX` (curated US taxProfiles + property-tax rates), `INTL_TAX` (treaty-aware taxProfiles + `exposureNotes` for the existing international `LOCATIONS`), `DEFAULT_HOUSING`, `SOURCES` entries; retune default not here (Task 4 owns the state default).
- Create: `src/finance/residenceTax.js` + `src/finance/residenceTax.test.js` — `residenceTaxForYear(profile, base)` (generic over US-state OR foreign profiles).
- Modify: `src/finance/tax.js` — keep federal pure; route the existing flat `stateRate` through `residenceTaxForYear` so the default reduces to identity.
- Modify: `RetirementCalculator.jsx`, `src/finance/plan.js` — new state fields + `buildPlanInputs` defaults (housing, workLoc, retireLoc, relocationYear, stateCode).

**Housing (Tasks 3–5, 7):**

- Create: `src/finance/housing.js` + `src/finance/housing.test.js` — amortization, payoff, real-deflated P&I, property tax, tenure carrying cost.
- Modify: `src/finance/seams.js`, `src/finance/simulate.js` — housing component + floor policy + inflation deflator threaded.
- Create: `src/components/steps/Housing.jsx` — tenure Segmented + mortgage/own/rent inputs; payoff read-out.
- Modify: `src/components/charts/Staircase.jsx` — housing band + payoff-cliff marker.

**Location tax + jurisdiction (Tasks 6, 8):**

- Modify: `src/finance/residenceTax.js` — type-aware retirement-income application (US state AND foreign/treaty profiles).
- Create: `src/finance/jurisdiction.js` + `src/finance/jurisdiction.test.js` — `activeJurisdiction(i, cal)` resolving a US-state OR international profile + property rate + isRetirement.
- Modify: `src/finance/simulate.js`, `src/finance/plan.js` — per-year jurisdiction switch; wage vs retirement face.
- Create: `src/components/steps/LocationTax.jsx` — work-state + retire-state pickers + relocation year.
- Create: `src/components/results/DualTaxExposure.jsx` — qualitative dual-taxation exposure panel for the active international retirement location (worldwide US tax, FTC, govt-pension source rule, Form 3520 / FBAR / FATCA flags), source-linked.
- Modify: `src/components/charts/Places.jsx`, `Compare.jsx` — combined income+property tax on the user's mix.

**Month view (Task 9):**

- Modify: `src/finance/breakdown.js` + `src/finance/breakdown.test.js` — itemize housing (P&I, property tax) + events in-month.
- Modify: `src/components/charts/YearByYear.jsx` — housing rows in the monthly itemization.

**Docs (Task 10):**

- Modify: `docs/prd.md`, `docs/use-cases.md`.

---

## Execution order & parallelization

```text
T1 (shapes + state data) ── serial
T2 (state-tax composition seam, reduce-to-identity) ── serial, after T1
   │
   ├── Housing chain:  T3 (housing.js) → T4 (housing-explicit need + floor + DEFAULT-ON re-baseline) → T5 (inherited live-in→own) → T7 (property tax into housing)
   └── Tax chain:      T6 (typed state-tax application + US-state picker) → T8 (work/retire jurisdiction split)
   │
T9 (month-by-month, needs housing in rows) ── after T4
T10 (docs + full gate) ── serial, last
Final whole-branch review (opus)
```

The Housing chain and Tax chain are parallel worktree groups; within each, serial (shared `seams.js`/`simulate.js`/`plan.js`). T4 is the behavior-changing pivot — everything after it baselines against the new defaults. Model routing: data transcription → haiku; engine/integration → sonnet; final review → opus.

---

## PHASE 1 — Foundation

### Task 1: Shared shapes — curated state data + new state fields + plan defaults

**Files:**

- Modify: `src/retirementData.js` (append `US_STATE_TAX`, `DEFAULT_HOUSING`, `SOURCES` entries)
- Modify: `RetirementCalculator.jsx` (initial state: `housing`, `workLoc`, `relocationYear`, `stateCode`)
- Modify: `src/finance/plan.js` (`buildPlanInputs` defaults)
- Create: `src/finance/plan.wave2.test.js`

**Interfaces:**

- Produces: `US_STATE_TAX: { [code]: { name, wageRate, taxesSS, pensionExclusion, taxesTradWithdrawal, retireRate, propertyTaxRate } }`. `wageRate`/`retireRate` are planning-grade **effective** flat rates on the relevant taxable base; `pensionExclusion` is a dollar cap, `"full"`, or `0`. No-income-tax states have all rates 0.
- Produces: `DEFAULT_HOUSING = { tenure: "rent", rent: null, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01 }`.
- Produces: state fields `housing` (DEFAULT_HOUSING-shaped), `workLoc` (US state code or "INTL"), `relocationYear`, `stateCode` (retire US state, or null for international).

- [ ] **Step 1: Write the failing test**

```js
// src/finance/plan.wave2.test.js
import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { US_STATE_TAX } from "../retirementData.js";

const bare = {
  ageA: 57, ageB: 48, stopA: 65, stopB: 56, claimA: 65, claimB: 65, pensionAge: 65,
  incomeA: 0, incomeB: 170000, savings: 670000, contrib: 18000, targetPct: 0.28, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 50424, ssFraB: 31592,
  pensionOn: true, plan: 3, pYears: 22, afc: 170000,
  realReturn: 0.05, swr: 0.04, tradFrac: 0.7, inflation: 0.025,
  ssMode: "trustees", ssHaircut: 81, ssCutYear: 2034,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("Wave 2 foundation defaults", () => {
  it("curated state table includes the spread with typed profiles", () => {
    expect(US_STATE_TAX.WA.retireRate).toBe(0);     // no income tax
    expect(US_STATE_TAX.WA.taxesSS).toBe(false);
    expect(US_STATE_TAX.CA.taxesSS).toBe(false);    // CA exempts SS
    expect(US_STATE_TAX.CA.taxesTradWithdrawal).toBe(true);
    expect(US_STATE_TAX.IL.pensionExclusion).toBe("full"); // IL exempts retirement income
  });
  it("buildPlanInputs defaults housing/workLoc/relocationYear", () => {
    const inp = buildPlanInputs(bare);
    expect(inp.housing.tenure).toBe("rent");
    expect(inp.workLoc).toBe("WA");
    expect(typeof inp.relocationYear).toBe("number");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/plan.wave2.test.js` → FAIL (`US_STATE_TAX` undefined).

- [ ] **Step 3: Append `US_STATE_TAX` + `DEFAULT_HOUSING` + sources to `retirementData.js`**

```js
// --- Wave 2: location tax + housing ------------------------------------------

// Curated planning-grade US state income-tax profiles (2026). Rates are EFFECTIVE
// approximations on the relevant base, not statutory brackets — state income/property
// tax is county-local and varies; captioned in-app. `wageRate` applies to wages
// (working years); `retireRate` applies to the retirement taxable base after the
// per-type rules (taxesSS, pensionExclusion, taxesTradWithdrawal); Roth is always exempt.
// Sources: SOURCES.kiplingerStateTax, SOURCES.taxFoundationProperty, SOURCES.incomeLabStates.
export const US_STATE_TAX = {
  WA: { name: "Washington",   wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0087 },
  TX: { name: "Texas",        wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0163 },
  FL: { name: "Florida",      wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0082 },
  NV: { name: "Nevada",       wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0048 },
  WY: { name: "Wyoming",      wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0056 },
  SD: { name: "South Dakota", wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0108 },
  TN: { name: "Tennessee",    wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0066 },
  IL: { name: "Illinois",     wageRate: 0.0495, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.0495, propertyTaxRate: 0.0208 },
  PA: { name: "Pennsylvania", wageRate: 0.0307, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.0307, propertyTaxRate: 0.0149 },
  MS: { name: "Mississippi",  wageRate: 0.044,  taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.044,  propertyTaxRate: 0.0079 },
  CO: { name: "Colorado",     wageRate: 0.044,  taxesSS: true,  pensionExclusion: 24000,  taxesTradWithdrawal: true,  retireRate: 0.044,  propertyTaxRate: 0.0049 },
  CA: { name: "California",   wageRate: 0.08,   taxesSS: false, pensionExclusion: 0,      taxesTradWithdrawal: true,  retireRate: 0.08,   propertyTaxRate: 0.0068 },
  NY: { name: "New York",     wageRate: 0.065,  taxesSS: false, pensionExclusion: 20000,  taxesTradWithdrawal: true,  retireRate: 0.065,  propertyTaxRate: 0.0172 },
  NJ: { name: "New Jersey",   wageRate: 0.06,   taxesSS: false, pensionExclusion: 100000, taxesTradWithdrawal: true,  retireRate: 0.06,   propertyTaxRate: 0.0223 },
  MN: { name: "Minnesota",    wageRate: 0.068,  taxesSS: true,  pensionExclusion: 0,      taxesTradWithdrawal: true,  retireRate: 0.068,  propertyTaxRate: 0.0102 },
};

// Treaty-aware international residence-tax profiles, keyed by LOCATIONS name. SAME typed
// shape as US_STATE_TAX so residenceTax.js doesn't fork. Planning-grade EFFECTIVE
// net-of-treaty residence rates — NOT statutory treaty articles. Conventions for a US
// citizen abroad (US federal worldwide tax is modeled separately by the engine):
//   - Government pension (the engine's `pension` = WA DRS) is US-only under the treaty's
//     government-service article ⇒ pensionExclusion:"full" (residence does not tax it).
//   - Private/IRA deferred withdrawals are residence-taxed net of the US FTC ⇒
//     taxesTradWithdrawal per location, at the effective `retireRate`.
//   - Social Security per treaty (taxesSS per location). Roth is exempt everywhere.
// exposureNotes drive the DualTaxExposure panel. Sources: SOURCES.usModelTreaty,
// SOURCES.irsFtc, SOURCES.irsForm3520, SOURCES.fbar.
export const INTL_TAX = {
  "Austria": { name: "Austria", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0.0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you stay liable for US federal tax on worldwide income; the US–Austria treaty + Foreign Tax Credit prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Austria.", residenceTaxed: "Austria can tax IRA/401(k) distributions as a resident; the US FTC generally offsets the US tax on the same dollars (effective added rate modeled ~0 here — verify).", filing: "Inheriting the Klagenfurt home over $100k triggers IRS Form 3520 (report-only); foreign accounts may trigger FBAR/FATCA." } },
  // Add the remaining international LOCATIONS (Greece, Portugal, Spain, Italy, France,
  // Netherlands, Bahamas, Bulgaria/Romania) with effective net-of-treaty rates seeded
  // from their existing LOCATIONS.addlTaxRate and a one-line exposureNotes set each.
};

// Primary-residence housing. Mortgage P&I is the engine's ONE nominal flow (deflated
// each year, zeroed after payoff). Rent / property tax / insurance / maintenance are
// real-flat. maintenancePct is an annual % of home value. Source: SOURCES.taxFoundationProperty.
export const DEFAULT_HOUSING = {
  tenure: "rent",                 // "rent" | "mortgage" | "own"
  rent: null,                     // null ⇒ seed from active location's m.rent
  mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
  homeValue: 0,
  insuranceAnnual: 0,
  maintenancePct: 0.01,
};
```

Add to `SOURCES`:

```js
  kiplingerStateTax: "https://www.kiplinger.com/retirement/601819/states-that-wont-tax-your-pension",
  taxFoundationProperty: "https://taxfoundation.org/data/all/state/property-taxes-by-state-county/",
  incomeLabStates: "https://incomelaboratory.com/state-retirement-taxes-guide/",
  pensionSourceTaxAct: "https://www.law.cornell.edu/uscode/text/4/114",
  usModelTreaty: "https://home.treasury.gov/policy-issues/tax-policy/international-tax",
  irsFtc: "https://www.irs.gov/individuals/international-taxpayers/foreign-tax-credit",
  irsForm3520: "https://www.irs.gov/forms-pubs/about-form-3520",
  fbar: "https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar",
```

Also add to the Step 1 test: `expect(INTL_TAX["Austria"].pensionExclusion).toBe("full");` and `expect(INTL_TAX["Austria"].taxesTradWithdrawal).toBe(true);` (import `INTL_TAX`).

- [ ] **Step 4: Add state fields in `RetirementCalculator.jsx`**

Insert into the initial `useState` (after the Wave 1 fields):

```js
    workLoc: "WA", relocationYear: 2046, stateCode: null,
    housing: { tenure: "rent", rent: null, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01 },
```

(`relocationYear` 2046 ≈ the persona's full-retirement year; `stateCode` null = retire abroad/Austria. Task 8 wires the UI; Task 4 wires housing into the engine.)

- [ ] **Step 5: Default the fields in `buildPlanInputs` (`plan.js`)**

Add to the returned object:

```js
    workLoc: s.workLoc ?? "WA",
    relocationYear: Number(s.relocationYear) || (TAX_YEAR + 20),
    stateCode: s.stateCode ?? null,
    housing: s.housing ?? { tenure: "rent", rent: null, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01 },
```

- [ ] **Step 6: Run + commit**

Run: `pnpm test -- src/finance/plan.wave2.test.js && pnpm test` → new test PASS; all prior tests still PASS (nothing consumes the new fields yet).

```bash
pnpm lint
git add src/retirementData.js RetirementCalculator.jsx src/finance/plan.js src/finance/plan.wave2.test.js
git commit -m "feat(wave2): foundation — curated US_STATE_TAX, DEFAULT_HOUSING, new place/housing state fields"
```

### Task 2: State-tax composition seam (reduce-to-identity)

**Files:**

- Create: `src/finance/residenceTax.js` + `src/finance/residenceTax.test.js`
- Modify: `src/finance/tax.js` (route flat `stateRate` through the seam)
- Modify: `src/calculatorCore.js` (re-export)

**Interfaces:**

- Produces: `residenceTaxForYear(profile, base) -> number`. **This task only implements the flat-rate fallback**: `profile == null` ⇒ `(Number(profile?.flatRate ?? base.flatRate) || 0) * base.taxableIncome`. Typed per-source logic is Task 6. Signature is final now so Task 6 fills the body: `base = { taxableIncome, ss, pension, deferredWithdrawal, wages, isRetirement, flatRate }`.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/residenceTax.test.js
import { describe, expect, it } from "vitest";
import { residenceTaxForYear } from "./residenceTax.js";

describe("residenceTaxForYear (flat fallback — Task 2)", () => {
  it("with no profile applies the flat rate to taxable income (identity with today)", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0.05 })).toBeCloseTo(5000, 6);
  });
  it("zero rate ⇒ zero", () => {
    expect(residenceTaxForYear(null, { taxableIncome: 100000, flatRate: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/residenceTax.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement the flat fallback (`residenceTax.js`)**

```js
/**
 * Composed state-income-tax layer. Composes ON TOP of the federal engine — never
 * forks it. Task 2 ships only the flat-rate fallback (numerically identical to the
 * old in-engine `stateRate × taxableIncome`); Task 6 adds the typed per-source rules.
 *
 * @param {object|null} profile - a US_STATE_TAX entry, or null for the flat fallback
 * @param {{ taxableIncome:number, flatRate?:number }} base
 * @returns {number}
 */
export function residenceTaxForYear(profile, base) {
  if (!profile) {
    return (Number(base.flatRate) || 0) * (Number(base.taxableIncome) || 0);
  }
  // Task 6 replaces this with type-aware logic; until then, flat on taxable income.
  return (Number(profile.retireRate) || 0) * (Number(base.taxableIncome) || 0);
}
```

- [ ] **Step 4: Route `calculateFederalTaxYear`'s state tax through the seam (`tax.js`)**

Replace the inline `const stateTax = (Number(stateRate) || 0) * taxableIncome;` with:

```js
  const stateTax = residenceTaxForYear(null, { taxableIncome, flatRate: stateRate });
```

Import `residenceTaxForYear` at the top of `tax.js`. The federal computation is untouched; this is a pure indirection so the value is identical. (Task 6/8 will let callers pass a typed profile by composing OUTSIDE `calculateFederalTaxYear`; this task keeps the existing signature working byte-identically.)

- [ ] **Step 5: Run + verify identity**

Run: `pnpm test -- src/finance/residenceTax.test.js && pnpm test`
Expected: new tests PASS; **all prior tests numerically identical** (the flat path is unchanged).

- [ ] **Step 6: Re-export + commit**

Add `export { residenceTaxForYear } from "./finance/residenceTax.js";` to `calculatorCore.js`.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): extract state tax into a composing residenceTax.js seam (reduce-to-identity flat path)"
```

---

## PHASE 2 — Housing chain

### Task 3: Housing module (amortization, payoff, real-deflated P&I, carrying cost)

**Files:**

- Create: `src/finance/housing.js` + `src/finance/housing.test.js`
- Modify: `src/calculatorCore.js` (re-export)

**Interfaces:**

- Produces:
  - `monthlyPI(principal, ratePct, termYears) -> number` — standard amortization `M = P·r(1+r)^n/((1+r)^n−1)`; returns 0 if principal/term ≤ 0; rate 0 ⇒ `principal/(termYears*12)`.
  - `payoffYear(mortgage) -> number` — `startYear + termYears` (calendar year P&I ends; P&I is 0 from `payoffYear` onward, i.e. the year after the last payment year).
  - `housingCostForYear(housing, cal, inflation, propertyTaxRate) -> { total, pi, propertyTax, other }` — the annual real housing cost in calendar year `cal`. P&I is nominal-deflated `monthlyPI*12 / (1+inflation)^(cal−TAX_YEAR)` and **0 from payoffYear on**; rent (tenure "rent"), property tax (`propertyTaxRate × homeValue`, real-flat), insurance, maintenance (`maintenancePct × homeValue`) are real-flat. Tenure "own" ⇒ no P&I/rent, just property tax + insurance + maintenance.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/housing.test.js
import { describe, expect, it } from "vitest";
import { monthlyPI, payoffYear, housingCostForYear } from "./housing.js";

describe("housing amortization", () => {
  it("computes the standard monthly P&I", () => {
    // $300k, 6%/yr, 30yr → ~$1,798.65/mo
    expect(monthlyPI(300000, 6, 30)).toBeCloseTo(1798.65, 1);
  });
  it("zero rate spreads principal evenly", () => {
    expect(monthlyPI(360000, 0, 30)).toBeCloseTo(1000, 6);
  });
  it("payoff year is start + term", () => {
    expect(payoffYear({ principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 })).toBe(2056);
  });
});

describe("housingCostForYear", () => {
  const mortgage = { tenure: "mortgage", mortgage: { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 }, homeValue: 375000, insuranceAnnual: 1800, maintenancePct: 0.01 };
  it("deflates P&I in real terms and adds real-flat carrying costs", () => {
    const y0 = housingCostForYear(mortgage, 2026, 0.025, 0.012);
    expect(y0.pi).toBeCloseTo(1798.65 * 12, 0);                    // year 0 no deflation
    const y10 = housingCostForYear(mortgage, 2036, 0.025, 0.012);
    expect(y10.pi).toBeCloseTo(1798.65 * 12 / Math.pow(1.025, 10), 0); // deflated
    expect(y0.propertyTax).toBeCloseTo(0.012 * 375000, 6);         // real-flat
  });
  it("zeros P&I from the payoff year on", () => {
    expect(housingCostForYear(mortgage, 2056, 0.025, 0.012).pi).toBe(0);
    expect(housingCostForYear(mortgage, 2057, 0.025, 0.012).pi).toBe(0);
  });
  it("own tenure has no P&I or rent", () => {
    const own = { tenure: "own", mortgage: { principal: 0 }, homeValue: 324000, insuranceAnnual: 0, maintenancePct: 0.01 };
    const c = housingCostForYear(own, 2040, 0.025, 0.012);
    expect(c.pi).toBe(0);
    expect(c.propertyTax).toBeCloseTo(0.012 * 324000, 6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/housing.test.js` → FAIL.

- [ ] **Step 3: Implement `housing.js`**

```js
import { TAX_YEAR } from "../retirementData.js";

/** Standard monthly mortgage P&I. 0 if principal/term ≤ 0; rate 0 ⇒ even principal. */
export function monthlyPI(principal, ratePct, termYears) {
  const P = Number(principal) || 0;
  const n = (Number(termYears) || 0) * 12;
  if (P <= 0 || n <= 0) return 0;
  const r = (Number(ratePct) || 0) / 100 / 12;
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

/** Calendar year P&I ends (P&I is 0 from this year on). */
export function payoffYear(mortgage) {
  const start = Number(mortgage?.startYear) || TAX_YEAR;
  return start + (Number(mortgage?.termYears) || 0);
}

/**
 * Annual real housing cost in calendar year `cal`. Mortgage P&I is the one nominal
 * flow — deflated by (1+inflation)^(cal−TAX_YEAR) and zeroed from payoffYear on.
 * Rent / property tax / insurance / maintenance are real-flat.
 *
 * @returns {{ total:number, pi:number, propertyTax:number, other:number }}
 */
export function housingCostForYear(housing, cal, inflation, propertyTaxRate = 0) {
  if (!housing) return { total: 0, pi: 0, propertyTax: 0, other: 0 };
  const homeValue = Number(housing.homeValue) || 0;
  const propertyTax = (Number(propertyTaxRate) || 0) * homeValue;
  const insurance = Number(housing.insuranceAnnual) || 0;
  const maintenance = (Number(housing.maintenancePct) || 0) * homeValue;

  let pi = 0;
  let rent = 0;
  if (housing.tenure === "mortgage") {
    const m = housing.mortgage || {};
    if (cal < payoffYear(m)) {
      const nominalAnnual = monthlyPI(m.principal, m.ratePct, m.termYears) * 12;
      pi = nominalAnnual / Math.pow(1 + (Number(inflation) || 0), cal - TAX_YEAR);
    }
  } else if (housing.tenure === "rent") {
    rent = (Number(housing.rent) || 0) * 12;
  }
  // "own" ⇒ no pi/rent.
  const other = rent + propertyTax + insurance + maintenance;
  return { total: pi + other, pi, propertyTax, other };
}
```

- [ ] **Step 4: Run to verify pass + commit**

Run: `pnpm test -- src/finance/housing.test.js` → PASS. Add `export * from "./finance/housing.js";` (or named re-exports) to `calculatorCore.js`. Then:

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): housing module — amortization, payoff year, real-deflated P&I, carrying costs"
```

### Task 4: Housing-explicit need recomposition + floor policy (DEFAULT-ON — re-baselines)

> **This is the behavior-changing pivot.** It reframes `targetPct` as non-housing, adds the explicit housing line, applies the agreed floor policy, removes rent double-counting, retunes the default `targetPct 0.40 → 0.28`, seeds the persona's default housing, and **re-baselines** the affected tests. The report MUST state the default headline before/after.

**Files:**

- Modify: `src/finance/seams.js` (`spendingComponents` housing slot + `composeNeed` floor policy)
- Modify: `src/finance/simulate.js` (thread `cal`/`inflation`/`propertyTaxRate` into the housing component)
- Modify: `src/finance/plan.js` (resolve active `propertyTaxRate`; seed default housing rent from location)
- Modify: `RetirementCalculator.jsx` (default `targetPct: 0.40 → 0.28`; default housing config for the persona)
- Create: `src/components/steps/Housing.jsx` (tenure + inputs + payoff read-out)
- Modify: `src/components/charts/Staircase.jsx` (housing band + payoff-cliff caption)
- Modify: `src/finance/calculatorCore.test.js`, `RetirementCalculator.test.jsx` (re-baseline)

**Interfaces:**

- Consumes: `housingCostForYear` (Task 3); `ctx.cal` (exists), new `ctx.inflation`, `ctx.propertyTaxRate`.
- Produces: `spendingComponents` returns a real `housing` value; `composeNeed` applies the floor to non-housing and adds housing OUTSIDE the max. `_floorBase` stays the non-housing base (income×targetPct or location living+hc), NEVER including housing.

- [ ] **Step 1: Write the failing test (floor policy + housing addition)**

```js
// in src/calculatorCore.test.js — new describe
import { spendingComponents, composeNeed } from "./finance/seams.js";
describe("housing-explicit need + floor policy (Wave 2 Task 4)", () => {
  it("adds housing OUTSIDE the 0.35 non-housing floor", () => {
    // non-housing base 40k, housing 24k, liveSav 0 → floor on 40k only, housing added on top
    const parts = { nonHousingBase: 40000, healthcare: 0, housing: 24000, lifestyleSteps: 0, events: 0, _floorBase: 40000 };
    expect(composeNeed(parts, 0)).toBeCloseTo(40000 + 24000, 6);
  });
  it("floor discounts only non-housing; housing still paid in full", () => {
    // liveSav 100k would zero non-housing, but floor holds it at 0.35*40k, and housing is still added
    const parts = { nonHousingBase: 40000, healthcare: 0, housing: 24000, lifestyleSteps: 0, events: 0, _floorBase: 40000 };
    expect(composeNeed(parts, 100000)).toBeCloseTo(0.35 * 40000 + 24000, 6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/calculatorCore.test.js -t "floor policy"` → FAIL (housing currently inside the max).

- [ ] **Step 3: Change `composeNeed` (floor policy)**

```js
export function composeNeed(parts, liveSav = 0) {
  const { nonHousingBase, healthcare, housing, lifestyleSteps, events } = parts;
  const nonHousingTotal = nonHousingBase + healthcare + lifestyleSteps + events;
  const floorBase = parts._floorBase != null ? parts._floorBase : nonHousingBase + healthcare;
  // Floor policy (Wave 2, confirmed): the 0.35 floor and live-in savings apply to
  // NON-HOUSING essentials only. Housing (rent / mortgage P&I / property tax / insurance /
  // maintenance) is a hard obligation, added in full OUTSIDE the floor.
  const nonHousing = Math.max(0.35 * floorBase, nonHousingTotal - liveSav);
  return nonHousing + (Number(housing) || 0);
}
```

- [ ] **Step 4: Compute the housing component in `spendingComponents`**

Import `housingCostForYear`. Before returning, in BOTH bases:

```js
  const housing = (cal != null)
    ? housingCostForYear(i.housing, cal, i.inflation, i.activePropertyTaxRate).total
    : 0;
```

For the **location basis**, remove rent from the living basket so it isn't double-counted (housing now owns it): replace `Object.values(L.m).reduce(...)` with a sum that excludes `L.m.rent` when `i.housing` is active (tenure !== undefined). For the **income basis**, `nonHousingBase = i.incomeHH * i.targetPct` is already non-housing once `targetPct` is reframed (Step 7). Return `housing` in the parts object (replacing the literal `0`).

- [ ] **Step 5: Thread `inflation` + `activePropertyTaxRate` through `simulate.js`**

In `simulate.js`, pass them in the spendingNeed ctx: `{ retireAgeA, cal, inflation: i.inflation, propertyTaxRate: i.activePropertyTaxRate }` (Task 8 sets `i.activePropertyTaxRate` per jurisdiction; until then default it in plan.js to the retire location's rate or 0). Document that `i.inflation` is now a real engine input (deflates P&I only).

- [ ] **Step 6: Resolve `activePropertyTaxRate` + seed default rent in `plan.js`**

In `buildPlanInputs`, add `activePropertyTaxRate: (s.stateCode && US_STATE_TAX[s.stateCode]?.propertyTaxRate) || 0`, and if `housing.tenure === "rent" && housing.rent == null`, seed `housing.rent` from `retLocObj.m.rent`.

- [ ] **Step 7: Retune the default + re-baseline**

In `RetirementCalculator.jsx`, change `targetPct: 0.40` → `targetPct: 0.28` and set the default `housing` for the persona (rent at retire location, seeded). Run the FULL suite; existing tests that asserted the old default need/headline will fail — **re-baseline each to the new intended value**, adding a comment: `// Wave 2: targetPct reframed as non-housing (0.28) + explicit housing line.` In the report, record the default headline before/after (e.g. sustainable net $X → $Y) so the change is auditable.

- [ ] **Step 8: Housing UI + Staircase band**

Create `src/components/steps/Housing.jsx`: a `Segmented` tenure (Rent / Mortgage / Own), mode-specific inputs, and a live **payoff read-out** ("Monthly P&I $X · paid off 2056 · ≈ $Y/mo real by payoff") using `monthlyPI`/`payoffYear`. Mount it in the input panel. In `Staircase.jsx`, render a caption noting the housing band and the payoff-year downward step. Accessible labels: "Housing", "Tenure", "Mortgage principal", "Mortgage rate", "Mortgage term".

- [ ] **Step 9: RTL + full suite + commit**

Add RTL checks for the Housing controls. Run `pnpm test` (all green against the new baseline), `pnpm lint`.

```bash
git add -A
git commit -m "feat(wave2): housing-explicit need (default-on) — non-housing floor + explicit housing line, retuned default"
```

### Task 5: Inherited live-in → owned tenure override

**Files:**

- Modify: `src/finance/simulate.js` (when an inher "live" is active, override housing tenure → own using the inherited home's value)
- Modify: `src/finance/plan.js` (carry the inherited home value/property rate into the override)
- Modify: `src/calculatorCore.test.js`

**Interfaces:**

- Consumes: the existing `i.inher` entries (`type:"live"`, `year`, plus the source `PROP[key].ownRate`/home value via `buildInheritanceInputs`). Produces: from the live year on, housing is computed as **owned** (carrying cost = property tax + insurance + maintenance on the inherited home value), and the prior `liveSav` credit is REMOVED (no double-application).

- [ ] **Step 1: Write the failing test**

```js
// src/calculatorCore.test.js
it("inherited live-in switches housing to owned carrying cost (no double credit) (Task 5)", () => {
  // Before the live year: renting at retireLoc. From the live year: owned home, housing drops to carrying cost only.
  const base = { /* income-basis persona with housing rent + an inher live entry at 2040, homeValue 324000 */ };
  const plan = calculatePlan(base);
  const before = plan.simChosen.rows.find(r => r.cal === 2039);
  const after = plan.simChosen.rows.find(r => r.cal === 2041);
  // Owned carrying cost (property tax + maint) < a full year's rent
  expect(after.need).toBeLessThan(before.need);
});
```

(Construct `base` with `housing.tenure:"rent"`, an `at` inherited home `on:true, strategy:"live", year:2040, value:324000`, and assert the need drops once owned.)

- [ ] **Step 2: Run to verify failure** — Run the test; expect FAIL (tenure not yet overridden).

- [ ] **Step 3: Implement the override in `simulate.js`**

In the loop, after computing the inheritance effects, when a `live` entry is active (`cal > p.year` per the existing year+1 convention), build an effective housing object for the year: `{ tenure: "own", homeValue: <inherited value>, insuranceAnnual: i.housing.insuranceAnnual, maintenancePct: i.housing.maintenancePct }` and pass it to the housing component instead of `i.housing`. Remove the old `liveSav` credit path for housing (the override replaces it). Thread the inherited home value via `buildInheritanceInputs` (add `value` and the property-tax rate for the inherited home's jurisdiction). Keep `liveSav` only for any non-housing component if still meaningful — otherwise retire it and update the steady-state `liveSav` usage in lockstep.

- [ ] **Step 4: Run + re-baseline + commit**

Run `pnpm test`; re-baseline any steady-state/inheritance tests touched (the live-in now flows through housing, not a flat credit). Document the change.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): inherited live-in switches housing tenure to owned (removes the double-counted live credit)"
```

### Task 7: Location property tax into housing

> Folds into the housing cost via `activePropertyTaxRate`. Most of the wiring landed in Task 4 (Step 6) and Task 8 (per-jurisdiction). This task verifies + tests the property-tax path end to end and surfaces it in the housing band.

**Files:**

- Modify: `src/calculatorCore.test.js` (property-tax-into-housing test)
- Modify: `src/components/steps/Housing.jsx` / `Staircase.jsx` (show property tax inside the housing band)

- [ ] **Step 1: Write the failing test**

```js
it("property tax scales the housing cost by the active state's rate (Task 7)", () => {
  // Same housing/home value, retire to TX (0.0163) vs CA (0.0068): TX housing cost higher by ~rate diff × homeValue
  const tx = calculatePlan({ /* persona */ stateCode: "TX", housing: { tenure: "own", homeValue: 500000, maintenancePct: 0.01 } });
  const ca = calculatePlan({ /* persona */ stateCode: "CA", housing: { tenure: "own", homeValue: 500000, maintenancePct: 0.01 } });
  const txRow = tx.simChosen.rows.find(r => r.aA >= 70);
  const caRow = ca.simChosen.rows.find(r => r.aA >= 70);
  expect(txRow.need - caRow.need).toBeCloseTo((0.0163 - 0.0068) * 500000, -1);
});
```

- [ ] **Step 2–4: verify the rate flows, add the housing-band breakdown line, commit**

Confirm `activePropertyTaxRate` resolves from `US_STATE_TAX[stateCode].propertyTaxRate` (or the inherited home's jurisdiction in retirement). Surface "Property tax ~$X/yr (location rate Y%)" in the Housing read-out. Caption: property tax is county-local; planning-grade.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): location property tax flows into the housing cost, captioned planning-grade"
```

---

## PHASE 3 — Location tax + jurisdiction

### Task 6: Typed residence-tax application (US state + international/treaty) + pickers + dual-tax exposure

**Files:**

- Modify: `src/finance/residenceTax.js` (type-aware retirement-income logic, US state AND foreign/treaty profiles) + `residenceTax.test.js`
- Modify: `src/finance/simulate.js` (compose the typed residence layer on the federal result in retirement years)
- Create: `src/components/steps/LocationTax.jsx` (US-state picker + plain-language note)
- Create: `src/components/results/DualTaxExposure.jsx` (international exposure panel)
- Modify: `src/components/charts/Places.jsx` (residence tax on the user's income mix)
- Modify: `RetirementCalculator.jsx`, `RetirementCalculator.test.jsx`

**Interfaces:**

- Produces: `residenceTaxForYear(profile, base)` now type-aware. For a typed `profile` and `base.isRetirement`: taxable state base = `(profile.taxesSS ? ssTaxablePortion : 0) + max(0, pension − pensionExclusionAmount) + (profile.taxesTradWithdrawal ? deferredWithdrawal : 0) + otherOrdinary`; `× profile.retireRate`. For `base.isRetirement === false` (working years): `wages × profile.wageRate`. Roth (the non-deferred withdrawal share) is never taxed. `pensionExclusion === "full"` ⇒ exclude all pension; a number ⇒ cap; `0` ⇒ none.

- [ ] **Step 1: Write the failing tests**

```js
// residenceTax.test.js — typed cases
it("a no-tax state yields zero on any retirement mix", () => {
  expect(residenceTaxForYear(US_STATE_TAX.WA, { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000, taxableIncome: 90000 })).toBe(0);
});
it("CA taxes pension + deferred withdrawal but exempts SS", () => {
  const t = residenceTaxForYear(US_STATE_TAX.CA, { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000, ssTaxablePortion: 34000 });
  expect(t).toBeCloseTo(0.08 * (30000 + 20000), 6); // SS excluded, pensionExclusion 0
});
it("IL exempts all retirement income", () => {
  expect(residenceTaxForYear(US_STATE_TAX.IL, { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000 })).toBe(0);
});
it("taxes wages by the work-state rate in working years", () => {
  expect(residenceTaxForYear(US_STATE_TAX.CA, { isRetirement: false, wages: 100000 })).toBeCloseTo(8000, 6);
});
it("a foreign profile exempts the govt (DRS) pension under the treaty but residence-taxes IRA draws", () => {
  // Austria: pensionExclusion "full" (govt pension US-only), taxesTradWithdrawal true, retireRate 0 (FTC nets to ~0)
  const t = residenceTaxForYear(INTL_TAX["Austria"], { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000 });
  expect(t).toBe(0); // effective net-of-treaty rate 0 ⇒ no residence-layer add for this persona
  // and the govt pension is excluded from the base regardless of rate:
  const t2 = residenceTaxForYear({ ...INTL_TAX["Austria"], retireRate: 0.1 }, { isRetirement: true, ss: 40000, pension: 30000, deferredWithdrawal: 20000 });
  expect(t2).toBeCloseTo(0.1 * 20000, 6); // only the IRA draw is in the residence base; pension fully excluded, SS not taxed
});
```

(Import `US_STATE_TAX` and `INTL_TAX`.)

- [ ] **Step 2: Run to verify failure** — FAIL (flat fallback returns wrong values for typed profiles).

- [ ] **Step 3: Implement the type-aware body in `residenceTax.js`**

Replace the typed branch:

```js
export function residenceTaxForYear(profile, base) {
  if (!profile) return (Number(base.flatRate) || 0) * (Number(base.taxableIncome) || 0);
  if (base.isRetirement === false) {
    return (Number(profile.wageRate) || 0) * (Number(base.wages) || 0);
  }
  const ss = profile.taxesSS ? (Number(base.ssTaxablePortion ?? base.ss) || 0) : 0;
  const pensionExcl = profile.pensionExclusion === "full"
    ? (Number(base.pension) || 0)
    : Math.min(Number(base.pension) || 0, Number(profile.pensionExclusion) || 0);
  const pension = Math.max(0, (Number(base.pension) || 0) - pensionExcl);
  const deferred = profile.taxesTradWithdrawal ? (Number(base.deferredWithdrawal) || 0) : 0;
  const other = Number(base.otherOrdinary) || 0;
  const stateBase = ss + pension + deferred + other;
  return (Number(profile.retireRate) || 0) * Math.max(0, stateBase);
}
```

- [ ] **Step 4: Compose the typed layer in `simulate.js`**

Where the engine computes tax, when a typed retirement profile is active (Task 8 supplies it), call `calculateFederalTaxYear` with `stateRate: 0` (federal only) and ADD `residenceTaxForYear(profile, base)` separately, so the federal engine is never forked and the state layer is type-aware. When no typed profile (international/override), keep the flat `stateRate` path (identical to today). Thread the deferred-withdrawal share (`wd × tradFrac`) into `base.deferredWithdrawal`.

- [ ] **Step 5: US-state picker + dual-tax exposure panel + Places figure**

`LocationTax.jsx`: a US-state `Select` (the curated states) that sets `stateCode`, with a plain-language line ("Texas: no state income tax — SS, pension, and withdrawals are state-tax-free"). Keep the manual `stateRate` override for power users. In `Places.jsx`, show "residence tax on your income mix" using the typed layer.

Create `src/components/results/DualTaxExposure.jsx`: shown when the active retirement location is international (an `INTL_TAX` profile). Render the profile's `exposureNotes` (worldwide US tax still applies; FTC; the government-pension source rule that exempts the WA DRS pension abroad; Form 3520 / FBAR / FATCA filing flags), each with the matching `SOURCES.*` link, and keep the "consult a cross-border specialist" framing. Accessible labels: "Retirement state", "Cross-border tax exposure".

- [ ] **Step 6: Re-baseline + commit**

Run `pnpm test`; re-baseline any headline/tax tests where a typed state now differs from the old flat rate (the default persona retires to Austria/international ⇒ flat path ⇒ unchanged; only US-state selections move). Commit.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): typed income-type-aware state tax composing on the federal engine + US-state picker"
```

### Task 8: Work-vs-retire two-location jurisdiction split + relocation home transition

> Includes the **relocation home transition** (user-confirmed: explicit, default sell). When the retirement location differs from the work location and the primary home is owned/mortgaged, at `relocationYear` the work home is sold (or kept as a rental) and housing switches to the retirement-location config — so an unpaid work-home mortgage doesn't keep charging after the move.

**Files:**

- Modify: `src/finance/housing.js` + `housing.test.js` (add `remainingBalance(mortgage, cal)`)
- Create: `src/finance/jurisdiction.js` + `src/finance/jurisdiction.test.js`
- Modify: `src/finance/simulate.js` (per-year jurisdiction + cost basis + healthcare-bridge gating + active-housing-by-year + relocation sell-lump)
- Modify: `src/finance/plan.js` (resolve work/retire profiles + active property rate by year; default `retireHousing`)
- Create/Modify: `src/components/steps/LocationTax.jsx` (work-state picker + relocation year), `src/components/steps/Housing.jsx` (retire-housing config + work-home disposition + estimated sale value)
- Modify: `src/components/charts/Staircase.jsx` (relocation boundary marker)
- Modify: `RetirementCalculator.jsx` (state: `retireHousing`, `housing.relocation`), `RetirementCalculator.test.jsx`

**Interfaces:**

- Produces: `activeJurisdiction(i, cal) -> { profile, propertyTaxRate, isRetirement }` where `isRetirement = cal >= i.relocationYear`. In retirement, `profile = i.stateCode ? US_STATE_TAX[i.stateCode] : (INTL_TAX[i.retireLoc] ?? null)` (null ⇒ flat `addlTaxRate`/override path); in working years `profile = US_STATE_TAX[i.workLoc] ?? null`. `propertyTaxRate` from the active US-state profile (or 0 / the inherited home's jurisdiction abroad). The cost-of-living basis selector returns the active location for the need.
- Produces: `remainingBalance(mortgage, cal) -> number` — outstanding principal at the start of calendar year `cal` via the standard amortization remaining-balance formula `P·[(1+r)^n − (1+r)^p] / ((1+r)^n − 1)` (r monthly rate, n term months, p = months elapsed = `(cal − startYear)·12`, clamped to `[0,n]`); 0 before `startYear` payments begin only if `cal < startYear`, and 0 from payoff on.
- Produces: **active-housing-by-year** — `cal < relocationYear ? i.housing : (inheritedOwnOverride ?? i.retireHousing ?? defaultRetireRent)`. New state: `retireHousing` (a DEFAULT_HOUSING-shaped config for the retirement residence; defaults to rent seeded from `retLocObj.m.rent`), and `i.housing.relocation = { action: "sell" | "keep" | "none", saleValue }`.
- Produces: **relocation sell-lump** — when `cal === relocationYear`, `i.housing.tenure ∈ {mortgage, own}`, retire location differs, and `relocation.action === "sell"`: a portfolio lump `sellNet × saleValue − remainingBalance(i.housing.mortgage, relocationYear)` is added (reusing the existing `sellLump` path; `sellNet` from a planning-grade selling-cost factor, default ~0.93), and the work-home P&I is zeroed from `relocationYear`. `action === "keep"` ⇒ the work mortgage continues and its imputed rent becomes rental income (reuse the rental path); `none` ⇒ no transition (same-location assumption).

- [ ] **Step 1: Write the failing test**

```js
// jurisdiction.test.js
import { activeJurisdiction } from "./jurisdiction.js";
import { US_STATE_TAX } from "../retirementData.js";
it("uses the work state before relocation and the retire state after", () => {
  const i = { workLoc: "CA", stateCode: "TX", relocationYear: 2046 };
  expect(activeJurisdiction(i, 2030).profile).toBe(US_STATE_TAX.CA);
  expect(activeJurisdiction(i, 2030).isRetirement).toBe(false);
  expect(activeJurisdiction(i, 2050).profile).toBe(US_STATE_TAX.TX);
  expect(activeJurisdiction(i, 2050).isRetirement).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure** — FAIL.

- [ ] **Step 3: Implement `jurisdiction.js`** — `activeJurisdiction(i, cal)` per the interface; `null` profile when the side is international (falls back to the flat path).

- [ ] **Step 4: Wire the per-year switch into `simulate.js`**

Replace the single `i.taxRate` application with: each year resolve `activeJurisdiction(i, cal)`; pass its `profile`/`isRetirement` to the composed state layer (Task 6); use its `propertyTaxRate` for the housing component; select the cost-of-living basis (work vs retire location) for `nonHousingBase`; and gate the **pre-65 healthcare bridge** to post-relocation (retirement) years at the retire location, per v3 §4. The wage face taxes `wages` in working years; the retirement face taxes the typed mix after relocation. Federal engine still unforked.

- [ ] **Step 4b: `remainingBalance` + relocation home transition (test-first)**

```js
// housing.test.js
import { remainingBalance } from "./housing.js";
it("computes the outstanding mortgage balance partway through the term", () => {
  const m = { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 };
  expect(remainingBalance(m, 2026)).toBeCloseTo(300000, 0);     // start
  expect(remainingBalance(m, 2056)).toBe(0);                    // paid off
  expect(remainingBalance(m, 2041)).toBeGreaterThan(0);         // mid-term, still owed
  expect(remainingBalance(m, 2041)).toBeLessThan(300000);
});
```

```js
// in calculatorCore.test.js — relocation sell transition
it("selling the work home at relocation adds net proceeds to the portfolio and zeros work P&I (Task 8)", () => {
  // work mortgage in a US work state, retire to a different state, action "sell", saleValue estimated
  const sell = calculatePlan({ /* persona with housing.tenure "mortgage", relocationYear 2046,
     stateCode "TX", workLoc "CA", housing.relocation { action:"sell", saleValue: 600000 }, retireHousing rent */ });
  const keep = calculatePlan({ /* same but relocation.action "keep" */ });
  const sRow = sell.simChosen.rows.find(r => r.cal === 2046);
  expect(sRow.sellLump).toBeGreaterThan(0);                     // net proceeds realized at relocation
  const after = sell.simChosen.rows.find(r => r.cal === 2048);
  // post-relocation the work P&I is gone (housing switched to retire rent), so housing < the mortgage years
  expect(after.housing).toBeLessThan(sell.simChosen.rows.find(r => r.cal === 2044).housing);
});
```

Implement: add `remainingBalance(mortgage, cal)` to `housing.js` (amortization remaining-balance formula, clamped). In `simulate.js`, select the active housing config per year (`cal < relocationYear ? i.housing : (inheritedOwnOverride ?? i.retireHousing ?? defaultRetireRent)`); when `cal === relocationYear` and the work home is owned/mortgaged and the retire location differs and `relocation.action === "sell"`, push a `sellLump = sellNet × saleValue − remainingBalance(...)` (reuse the existing sale-lump bucket so the portfolio/`bal` and the steady-state discounting both already handle it) and stop charging the work P&I. `action === "keep"` routes the work-home imputed rent to the rental path; `none` keeps the current single-config behavior. Run the tests; re-baseline as needed.

- [ ] **Step 5: UI — work-state picker + relocation year + relocation home disposition + boundary marker**

In `LocationTax.jsx` add a work-location `Select` ("Where you live & earn now", default WA) and a `relocationYear` `NumberInput` with a note ("when the tax/cost basis switches; transition year simplified — see disclaimer"). In `Housing.jsx`, when `workLoc !== retire location` and the work home is owned/mortgaged, surface a **work-home disposition** `Segmented` (Sell at move / Keep as rental) and, for sell, an **estimated sale value** `NumberInput` (captioned: you estimate the market value; selling costs ~7%; primary-residence cap-gains exclusion ~$500k MFJ usually covers the gain — consult a specialist) plus a **retirement-home** config (rent default / mortgage / own). In `Staircase.jsx`, draw a thin vertical relocation-boundary rule (like the depletion line). Accessible labels: "Where you live and earn now", "Relocation year", "Work home at relocation", "Estimated sale value", "Retirement home". Default state: `housing.relocation = { action: "sell", saleValue: 0 }`, `retireHousing = { tenure: "rent", rent: null, ... }` (rent seeded from `retLocObj.m.rent`).

- [ ] **Step 6: Re-baseline + caption + commit**

Add the in-app captions (Pension Source Tax Act license; transition year simplified; 183-day residency is professional territory). Run `pnpm test`; the default `workLoc=WA` ⇒ zero wage tax ⇒ working-years numbers unchanged; re-baseline only cases a wage-taxing work state affects. Commit.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): work-vs-retire two-location jurisdiction split (workLoc/retireLoc/relocationYear)"
```

---

## PHASE 4 — Month view + docs

### Task 9: Month-by-month refinement (itemize housing)

**Files:**

- Modify: `src/finance/breakdown.js` + `src/finance/breakdown.test.js`
- Modify: `src/components/charts/YearByYear.jsx`

**Interfaces:**

- Consumes: simulation rows now carry the housing breakdown — `simulate.js` pushes `housing` (rounded annual total) plus its parts `housingRentOrPI` (rent for renters, deflated P&I for mortgagors) and `housingPropertyTax` from `housingCostForYear`'s `{pi, propertyTax, other}`. Produces: `monthlyBreakdown(row)` itemizes housing into `expenses.housing` (total ÷ 12) AND a `expenses.housingDetail = { rentOrPI, propertyTax, other }` per-month so the UI can show the **rent figure** (renters) or **mortgage P&I + property tax** (owners) as labeled sub-lines, all distinct from `living`; `yearMilestones` adds a "Mortgage paid off" milestone in the payoff year.

> **Rent visibility (answers the per-location ask):** for `tenure:"rent"` the housing line IS the selected retirement location's monthly rent (seeded from `retLocObj.m.rent` in Task 4), so the rent figure the user sees in the **Places** comparison (which still lists each location's `m.rent` line, unchanged) is the same number that flows into the plan's housing cost and shows up here in the month/year breakdown labeled "Rent ({location})". No double-count: the location basis removes `m.rent` from the living basket when housing is active (Task 4 Step 4).

- [ ] **Step 1: Write the failing test**

```js
// breakdown.test.js
it("itemizes housing — rent figure visible as its own line (Task 9)", () => {
  const row = { salA: 0, salB: 0, rent: 0, pens: 24000, ssA: 18000, ssB: 6000, wdSpend: 36000, need: 96000, extraSpend: 0, tax: 12000, housing: 24000, housingRentOrPI: 24000, housingPropertyTax: 0 };
  const b = monthlyBreakdown(row);
  expect(b.expenses.housing).toBeCloseTo(2000, 6);                 // 24000 / 12 total
  expect(b.expenses.housingDetail.rentOrPI).toBeCloseTo(2000, 6);  // the rent figure, per month
  expect(b.expenses.living).toBeCloseTo((96000 - 24000) / 12, 6);  // living excludes housing
});
it("flags mortgage payoff as a milestone", () => {
  const ms = yearMilestones({ aA: 70, housing: 8000, mortgagePaidOff: true }, { housing: 30000 }, {});
  expect(ms.some(m => m.key === "payoff")).toBe(true);
});
```

- [ ] **Step 2–4: Implement, render, commit**

Add a `housing` row field in `simulate.js`. In `monthlyBreakdown`, split `living = (need − extraSpend − housing)/12` and add `housing` to `expenses`. In `yearMilestones`, emit a `{ key: "payoff", label: "Mortgage paid off", kind: "life" }` when housing drops to the carrying-cost floor (or a `row.mortgagePaidOff` flag set in `simulate`). Show the housing row in `YearByYear.jsx`. Run `pnpm test`, re-baseline the existing breakdown tests for the new `living` definition.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave2): month view itemizes housing (P&I + property tax) and flags mortgage payoff"
```

### Task 10: Docs reconciliation + full CI gate

**Files:** Modify `docs/prd.md`, `docs/use-cases.md`.

- [ ] **Step 1: Reconcile `docs/prd.md`** — FR entries (padded-pipe MD060 style) for: housing/mortgage (incl. the inflation-as-real-input note + the floor policy), inherited live-in→owned, typed residence tax (US state AND foreign/treaty), the dual-taxation exposure panel + the government-pension treaty convention, location property tax, work-vs-retire split, month-view housing itemization. Update PRD limitation L8 (housing double-count) as resolved. State the now-real role of `s.inflation`. Caption: international residence tax is an effective net-of-treaty planning-grade estimate, not a statutory treaty computation.
- [ ] **Step 2: Reconcile `docs/use-cases.md`** — a scenario per feature (e.g. "Compare retiring to TX vs CA on your income mix"; "Earn in CA, retire to NV — watch the relocation-year tax cliff"; "Inherit and live in the Klagenfurt home — housing drops to carrying cost").
- [ ] **Step 3: Markdown lint** — `pnpm lint:md` PASS.
- [ ] **Step 4: Full wave gate** — `pnpm lint && pnpm lint:md && pnpm typecheck && pnpm test && pnpm build && pnpm links` all green.
- [ ] **Step 5: Commit** — `docs(wave2): reconcile PRD + use-cases with place & housing`.

---

## Self-review checklist (run before declaring the wave done)

1. **Spec coverage** — housing/mortgage, real-deflated P&I + payoff cliff, property tax, typed state tax composing on the federal engine, US-state picker, work/retire split, inherited live-in→owned, housing-explicit need, month-view itemization all have tasks.
2. **Invariants** — only mortgage P&I is nominal (deflated, zeroed at payoff); `calculateFederalTaxYear` never forked (residence tax — US state AND foreign/treaty — composes via `residenceTax.js`); the residence layer reduces to today's flat number for the override/untyped path; randomness only in `monteCarlo.js`; every new assumption source-linked + captioned; planning-grade transition-year/residency disclaimers present; the international layer uses effective net-of-treaty rates + per-type flags only (no statutory treaty computation) and ships the DualTaxExposure panel with "consult a cross-border specialist".
3. **Floor policy** — `composeNeed` floors non-housing only; housing added outside the max; `_floorBase` never includes housing. The Wave-0 floor note in `seams.js` is updated to record the Wave-2 decision.
4. **No double-count** — rent removed from the location basket when housing is active; inherited live-in is a tenure override, not a stacked credit; targetPct reframed to non-housing.
5. **Re-baseline integrity** — every changed default assertion has a comment explaining the Wave-2 reshape; Task 4's report records the default headline before/after.
6. **Type consistency** — `monthlyPI`, `payoffYear`, `housingCostForYear`, `remainingBalance`, `residenceTaxForYear(profile, base)`, `activeJurisdiction(i, cal)` referenced with identical signatures across tasks and re-exported in `calculatorCore.js`.
7. **Relocation home transition** — same-location mortgage spans the work→retire boundary unchanged; when the retire location differs and the work home is owned/mortgaged, the default-sell path adds `sellNet×saleValue − remainingBalance` to the portfolio at `relocationYear`, zeroes the work P&I, and switches to the retire-location housing; `keep` routes to the rental path; the default persona (rent → inherited-own) is unaffected. Sale value is user-estimated and captioned planning-grade.

---

## Final whole-branch review

After Task 10, dispatch an independent whole-branch reviewer (opus): verify the nominal/real boundary (P&I is the only nominal flow, correctly deflated and zeroed at payoff); the residence layer (US state AND foreign/treaty) never forks the federal engine and reduces to the old flat number for the untyped/override path; the treaty conventions are applied correctly (government DRS pension excluded abroad via `pensionExclusion:"full"`, IRA/deferred draws residence-taxed at the effective net-of-treaty rate, SS per flag, Roth never taxed) and stay planning-grade (no statutory article computation), with the DualTaxExposure panel present and source-linked; the jurisdiction switch applies the right face each year; housing is not double-counted and the floor policy holds; and the re-baselined defaults are intentional and documented. Record the verdict in `.superpowers/sdd/progress.md`.
