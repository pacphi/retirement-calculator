# Realistic Retirement Modeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add life-event spending (travel, weddings, home help, grandchild gifts), a survivor transition, and a sequence-of-returns stress band to the engine, and reconcile the headline "sustainable income" with the actual modeled drawdown so the report stops over-stating the plan.

**Architecture:** Introduce one time-indexed expense layer (a normalized travel rule + a one-time event list) that `simulate()` folds into each year's `need`, so the existing tax-aware `solveWithdrawal()` grosses up correctly and the balance path shows real dips. Add a deterministic stress-return path as a second simulation for charting a downside band. Stop presenting `guaranteed + FV*SWR` as spendable income; instead expose `modeledSpend` (what you actually spend), `sustainableCapacity` (what you could spend at the SWR), and `surplus` (the compounding remainder), and read steady-state need straight from the simulated row so events flow through automatically.

**Tech Stack:** React 18 + Vite, Recharts, Vitest + React Testing Library, pnpm. Pure engine in `src/calculatorCore.js`, constants in `src/retirementData.js`, UI in `RetirementCalculator.jsx`.

## Global Constraints

- All cash flows are in **today's (real) dollars**; `realReturn` is already net of inflation. Event amounts are NOT inflated — adding inflation would double-count. (verbatim engine convention: `bal = bal * (1 + i.realReturn)`)
- Tests must stay **deterministic**: no `Date`, randomness, storage, network, or chart-layout assertions. (CLAUDE.md test strategy)
- Use **one federal tax engine** (`calculateFederalTaxYear`) for every cash-need calculation; treat spending needs as **after-tax** spending. (CLAUDE.md calculation rules)
- Apply age-65 deductions only to filers actually 65+ that year; keep rental income separate from guaranteed lifetime benefits. (CLAUDE.md)
- Run command: `pnpm test`. Single file: `pnpm test src/calculatorCore.test.js`.
- Keep files focused; engine logic stays pure and exported for direct unit testing.
- When changing a formula, update matching tests and docs (`docs/`). (CLAUDE.md maintenance)
- **Monte Carlo dependencies:** `d3-random` (seeded RNG `randomLcg` + `randomNormal.source`) and `d3-array` (`quantile`). Both are widely-used, actively-maintained, ESM, tree-shakeable. No other RNG/stats library.
- **Monte Carlo must be deterministic given a fixed `seed`** (via `randomLcg(seed)`), so its tests assert fixed percentiles. It runs **only on explicit user request** (button), never on input change, and **off the main thread in a Web Worker**.

---

## File Structure

- `src/calculatorCore.js` — add `travelSpendForYear`, `oneTimeSpendForYear`, `lifeEventSpendForYear`, `stressReturnForYear`; extend `simulate()` (event spend, survivor transition, return-path option); extend `steadyState()` (read need from row; add capacity/surplus); extend `calculatePlan()` (add `simStress`, default normalization for new state).
- `src/retirementData.js` — add `DEFAULT_TRAVEL`, `DEFAULT_LIFE_EVENTS`, `STRESS_EARLY_DROP` constants.
- `src/calculatorCore.test.js` — new `describe` blocks per task.
- `RetirementCalculator.jsx` — update default `useState` to the household snapshot; add Step inputs for travel, life events, survivor; the Monte Carlo opt-in button + result tiles; overlay event markers on the staircase chart, a stress band and a percentile fan on the long-run chart.
- `docs/use-cases.md` / `docs/sources.md` — document new assumptions (final task).

**Module decomposition (Task 10, behind a barrel):** `src/calculatorCore.js` becomes a re-export barrel so existing imports/tests are untouched. New focused modules under `src/finance/`:
- `tax.js` — `fedTax`, `taxableSS`, `seniorEligibleCount`, `standardDeduction`, `calculateFederalTaxYear`
- `socialSecurity.js` — `piaFromIncome`, `ownBenefitAtClaimMonthly`, `spousalBenefitAtClaimMonthly`
- `pension.js` — `pensionERF`, `drsEligibilityNote`, `afcIsAuto`, `resolveAfc`
- `events.js` — `travelSpendForYear`, `oneTimeSpendForYear`
- `simulate.js` — `benefits`, `spendingNeed`, `stressReturnForYear`, `simulate`, `steadyState`, `steadyStartAgeA`, and internal `solveWithdrawal`/`taxForYear`
- `monteCarlo.js` — `runMonteCarlo` (Task 11)
- `mcWorker.js` — Web Worker entry that calls `runMonteCarlo` (Task 12)
- `plan.js` — `resolveSocialSecurityScenario`, `buildInheritanceInputs`, `propEcon`, `lineItems`, `monthlyTotal`, `tierFor`, `calculatePlan`

---

### Task 1: Travel spending rule (engine)

Recurring travel budget for the first N years of retirement, with a go-go/slow-go taper.

**Files:**
- Modify: `src/retirementData.js` (add `DEFAULT_TRAVEL`)
- Modify: `src/calculatorCore.js` (add `travelSpendForYear`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Produces: `travelSpendForYear(travel, cal, retireCal) -> number`, where `travel = { on:boolean, amount:number, years:number, taper:boolean }`, `cal` is the calendar year, `retireCal` is the first retirement calendar year. Returns today's-dollar travel spend for that year. Taper: full `amount` for the first 10 years, `0.5 * amount` for years 11..`years`, `0` outside the window.
- Produces constant `DEFAULT_TRAVEL = { on: true, amount: 15000, years: 15, taper: true }`.

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
import {
  // ...existing imports...
  travelSpendForYear,
} from "./calculatorCore.js";

describe("travel spending", () => {
  it("pays the full budget in the first 10 retirement years", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2034, 2034)).toBe(15000); // year 1
    expect(travelSpendForYear(t, 2043, 2034)).toBe(15000); // year 10
  });

  it("tapers to half for the slow-go years 11..N", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2044, 2034)).toBe(7500); // year 11
    expect(travelSpendForYear(t, 2048, 2034)).toBe(7500); // year 15
  });

  it("stops after the travel window and before retirement", () => {
    const t = { on: true, amount: 15000, years: 15, taper: true };
    expect(travelSpendForYear(t, 2049, 2034)).toBe(0); // year 16
    expect(travelSpendForYear(t, 2033, 2034)).toBe(0); // pre-retirement
  });

  it("returns 0 when travel is disabled and honors a flat (non-taper) budget", () => {
    expect(travelSpendForYear({ on: false, amount: 15000, years: 15, taper: true }, 2034, 2034)).toBe(0);
    expect(travelSpendForYear({ on: true, amount: 20000, years: 15, taper: false }, 2046, 2034)).toBe(20000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `travelSpendForYear is not a function` (import undefined).

- [ ] **Step 3: Add the constant**

In `src/retirementData.js`, after `export const TAX_YEAR = 2026;`:

```js
export const DEFAULT_TRAVEL = { on: true, amount: 15000, years: 15, taper: true };
```

- [ ] **Step 4: Implement `travelSpendForYear`**

In `src/calculatorCore.js`, after `export const tierFor = ...`:

```js
export const travelSpendForYear = (travel, cal, retireCal) => {
  if (!travel || !travel.on) return 0;
  const amount = Number(travel.amount) || 0;
  const years = Number(travel.years) || 0;
  const idx = cal - retireCal; // 0-based year of retirement
  if (idx < 0 || idx >= years) return 0;
  if (travel.taper && idx >= 10) return 0.5 * amount;
  return amount;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS (travel spending block green).

- [ ] **Step 6: Commit**

```bash
git add src/calculatorCore.js src/retirementData.js src/calculatorCore.test.js
git commit -m "feat: add travel spending rule with go-go/slow-go taper"
```

---

### Task 2: One-time life-event spending (engine)

Weddings, home-purchase help, grandchild 529 seeds as deterministic, toggleable lumps.

**Files:**
- Modify: `src/retirementData.js` (add `DEFAULT_LIFE_EVENTS`)
- Modify: `src/calculatorCore.js` (add `oneTimeSpendForYear`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Produces: `oneTimeSpendForYear(events, cal) -> number` summing `amount` of every event with `on === true && Number(year) === cal`. `events` is an array of `{ id, label, on, year, amount }`. Missing/empty array returns 0.
- Produces constant `DEFAULT_LIFE_EVENTS` (5 rows, all `on:false` by default so the baseline plan is unchanged until the user opts in):

```js
export const DEFAULT_LIFE_EVENTS = [
  { id: "wed1",  label: "Child 1 wedding",     on: false, year: 2032, amount: 15000 },
  { id: "wed2",  label: "Child 2 wedding",     on: false, year: 2035, amount: 15000 },
  { id: "home1", label: "Home help -- child 1", on: false, year: 2034, amount: 25000 },
  { id: "home2", label: "Home help -- child 2", on: false, year: 2037, amount: 25000 },
  { id: "gk",    label: "Grandchild 529 seed",  on: false, year: 2040, amount: 5000  },
];
```

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
import {
  // ...existing imports...
  oneTimeSpendForYear,
} from "./calculatorCore.js";

describe("one-time life events", () => {
  const events = [
    { id: "wed1", label: "Wedding 1", on: true, year: 2032, amount: 15000 },
    { id: "wed2", label: "Wedding 2", on: false, year: 2035, amount: 15000 },
    { id: "home1", label: "Home help", on: true, year: 2032, amount: 25000 },
  ];

  it("sums enabled events landing in the given calendar year", () => {
    expect(oneTimeSpendForYear(events, 2032)).toBe(40000);
  });

  it("ignores disabled events and other years", () => {
    expect(oneTimeSpendForYear(events, 2035)).toBe(0);
    expect(oneTimeSpendForYear(events, 2040)).toBe(0);
  });

  it("handles an empty or missing list", () => {
    expect(oneTimeSpendForYear([], 2032)).toBe(0);
    expect(oneTimeSpendForYear(undefined, 2032)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `oneTimeSpendForYear is not a function`.

- [ ] **Step 3: Add the constant**

In `src/retirementData.js`, after `DEFAULT_TRAVEL`, add the `DEFAULT_LIFE_EVENTS` array shown in the Interfaces block above.

- [ ] **Step 4: Implement `oneTimeSpendForYear`**

In `src/calculatorCore.js`, after `travelSpendForYear`:

```js
export const oneTimeSpendForYear = (events, cal) =>
  (events || []).reduce(
    (sum, e) => (e && e.on && Number(e.year) === cal ? sum + (Number(e.amount) || 0) : sum),
    0,
  );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/calculatorCore.js src/retirementData.js src/calculatorCore.test.js
git commit -m "feat: add deterministic one-time life-event spending"
```

---

### Task 3: Fold life-event spending into the simulation (engine)

Make travel + one-time lumps raise each year's `need` so the tax-aware solver grosses up withdrawals and the balance path dips realistically.

**Files:**
- Modify: `src/calculatorCore.js` (`simulate`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Consumes: `travelSpendForYear`, `oneTimeSpendForYear` (Tasks 1-2), `spendingNeed` (existing).
- Produces: `simulate(i, ssOpt)` now reads `i.travel` and `i.events`; each pushed row gains an `extraSpend` field (Math.round) = travel + one-time spend that year. `need` in each row already includes `extraSpend`. The retirement anchor year is `retireCal = TAX_YEAR + Math.max(i.stopA - i.ageA, i.stopB - i.ageB)`.

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
import {
  // ...existing imports...
  simulate,
} from "./calculatorCore.js";

describe("life events in simulation", () => {
  // Retired household so withdrawals are forced from the portfolio.
  const retired = {
    ...baseState,
    ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
    pensionOn: false, savings: 1000000, contrib: 0, targetPct: 0.4,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    travel: { on: false, amount: 15000, years: 15, taper: true },
    events: [{ id: "wed1", label: "Wedding", on: true, year: 2030, amount: 30000 }],
  };

  it("raises spending need in a one-time event year", () => {
    const sim = simulate(retired, { haircut: 1, cutYear: 9999 });
    const eventRow = sim.rows.find((r) => r.cal === 2030);
    const normalRow = sim.rows.find((r) => r.cal === 2031);
    expect(eventRow.extraSpend).toBe(30000);
    expect(eventRow.need).toBe(normalRow.need + 30000);
  });

  it("draws more from the portfolio in the event year than in a normal year", () => {
    const sim = simulate(retired, { haircut: 1, cutYear: 9999 });
    const eventRow = sim.rows.find((r) => r.cal === 2030);
    const normalRow = sim.rows.find((r) => r.cal === 2031);
    expect(eventRow.wd).toBeGreaterThan(normalRow.wd);
  });

  it("adds recurring travel spend during the travel window", () => {
    const withTravel = { ...retired, events: [], travel: { on: true, amount: 15000, years: 15, taper: true } };
    const sim = simulate(withTravel, { haircut: 1, cutYear: 9999 });
    const firstRetYear = sim.rows.find((r) => r.cal === 2026); // ageA 65 == stopA 65 -> retired now
    expect(firstRetYear.extraSpend).toBe(15000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `extraSpend` is `undefined`; need/wd assertions fail.

- [ ] **Step 3: Implement event spend in `simulate`**

In `src/calculatorCore.js`, inside `simulate`, locate:

```js
    const need = spendingNeed(i, aA, aB, liveSav);
    bal = bal * (1 + i.realReturn) + sellLump;
```

Replace with:

```js
    const retireCal = TAX_YEAR + Math.max(i.stopA - i.ageA, i.stopB - i.ageB);
    const extraSpend =
      travelSpendForYear(i.travel, cal, retireCal) + oneTimeSpendForYear(i.events, cal);
    const need = spendingNeed(i, aA, aB, liveSav) + extraSpend;
    bal = bal * (1 + i.realReturn) + sellLump;
```

Then in the `rows.push({ ... })` call, add `extraSpend: Math.round(extraSpend),` (place it next to `need`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS (life-events-in-simulation block green; existing plan tests still pass because `i.travel`/`i.events` default to undefined → 0).

- [ ] **Step 5: Commit**

```bash
git add src/calculatorCore.js src/calculatorCore.test.js
git commit -m "feat: fold travel and life-event spending into yearly simulation"
```

---

### Task 4: Reconcile the headline with the modeled drawdown (engine)

Stop reporting `guaranteed + FV*SWR` as spendable income without context. Expose what is actually spent vs. capacity vs. surplus, and source steady-state need from the simulated row so events flow through.

**Files:**
- Modify: `src/calculatorCore.js` (`steadyState`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Consumes: existing `steadyState(i, sim, haircut, cutYear)` and its `row`.
- Produces: steady-state result gains three fields:
  - `modeledSpend` = `row.need` (what the plan actually spends that year, incl. events/healthcare).
  - `sustainableCapacity` = `net` (existing `gross - tax`, i.e. guaranteed + SWR draw, after tax) — the ceiling you *could* spend.
  - `surplus` = `Math.max(0, sustainableCapacity - modeledSpend)` — the unspent amount that compounds (this is what the long-run chart shows growing).
  - `targetNeed` is changed to read `row.need` (was a re-computed `spendingNeed` that ignored events).

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
describe("headline reconciliation", () => {
  it("reports modeled spend, capacity, and the surplus that compounds", () => {
    const plan = calculatePlan({
      ...baseState,
      travel: { on: false, amount: 15000, years: 15, taper: true },
      events: [],
    });
    const s = plan.steady;
    expect(s.modeledSpend).toBe(s.targetNeed);
    expect(s.sustainableCapacity).toBeCloseTo(s.net, 6);
    expect(s.surplus).toBeCloseTo(Math.max(0, s.sustainableCapacity - s.modeledSpend), 6);
    // Baseline plan has guaranteed income well above the modest need -> positive surplus.
    expect(s.surplus).toBeGreaterThan(0);
  });

  it("includes active travel spend in the steady-state need", () => {
    const noTravel = calculatePlan({ ...baseState, travel: { on: false, amount: 15000, years: 15, taper: true }, events: [] });
    const withTravel = calculatePlan({ ...baseState, travel: { on: true, amount: 15000, years: 30, taper: false }, events: [] });
    expect(withTravel.steady.modeledSpend).toBeGreaterThan(noTravel.steady.modeledSpend);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `modeledSpend`/`sustainableCapacity`/`surplus` undefined.

- [ ] **Step 3: Implement in `steadyState`**

In `src/calculatorCore.js`, in `steadyState`, replace:

```js
  const targetNeed = spendingNeed(i, ageA, ageB, liveSav);
  return {
```

with:

```js
  const targetNeed = row.need; // sourced from the simulated row so events/healthcare flow through
  const net = gross - taxDetails.tax;
  return {
```

Then in the returned object, replace the `net: gross - taxDetails.tax,` line with references plus the new fields:

```js
    net,
    sustainableCapacity: net,
    modeledSpend: targetNeed,
    surplus: Math.max(0, net - targetNeed),
```

Leave the other returned fields untouched. (Note: `liveSav` is still computed above and used elsewhere; only its use in `targetNeed` changes.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS. Existing test `anchors steady-state income after selected benefits have actually started` still passes (unchanged `startAgeA`).

- [ ] **Step 5: Commit**

```bash
git add src/calculatorCore.js src/calculatorCore.test.js
git commit -m "feat: expose modeled spend, capacity, and surplus to end headline double-count"
```

---

### Task 5: Sequence-of-returns stress path (engine)

Add a deterministic poor-first-decade return path and a `simStress` run for a downside chart band.

**Files:**
- Modify: `src/retirementData.js` (add `STRESS_EARLY_DROP`)
- Modify: `src/calculatorCore.js` (`stressReturnForYear`, return-path option in `simulate`, `simStress` in `calculatePlan`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Produces: `stressReturnForYear(realReturn, yearIndex) -> number`. Years 0-2 return `-0.10` (early crash), years 3-5 return `realReturn - 0.02`, years 6+ return `realReturn`. Deterministic, no RNG.
- Produces constant `STRESS_EARLY_DROP = -0.10`.
- Modifies `simulate(i, ssOpt)`: if `ssOpt.stress === true`, the per-year growth uses `stressReturnForYear(i.realReturn, y)` instead of the flat `i.realReturn`.
- Modifies `calculatePlan(s)`: adds `simStress: simulate(inp, { haircut: effHaircut, cutYear: effCutYear, stress: true })` to the returned object.

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
import {
  // ...existing imports...
  stressReturnForYear,
} from "./calculatorCore.js";

describe("sequence-of-returns stress", () => {
  it("models an early crash then recovery", () => {
    expect(stressReturnForYear(0.05, 0)).toBe(-0.10);
    expect(stressReturnForYear(0.05, 2)).toBe(-0.10);
    expect(stressReturnForYear(0.05, 3)).toBeCloseTo(0.03, 6);
    expect(stressReturnForYear(0.05, 6)).toBeCloseTo(0.05, 6);
  });

  it("produces a lower balance path than the baseline simulation", () => {
    const plan = calculatePlan({
      ...baseState,
      travel: { on: false, amount: 15000, years: 15, taper: true },
      events: [],
    });
    const lastChosen = plan.simChosen.rows[plan.simChosen.rows.length - 1].bal;
    const lastStress = plan.simStress.rows[plan.simStress.rows.length - 1].bal;
    expect(lastStress).toBeLessThan(lastChosen);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `stressReturnForYear is not a function`; `plan.simStress` undefined.

- [ ] **Step 3: Add the constant**

In `src/retirementData.js`, after `DEFAULT_LIFE_EVENTS`:

```js
export const STRESS_EARLY_DROP = -0.10;
```

- [ ] **Step 4: Implement `stressReturnForYear` and wire the path**

In `src/calculatorCore.js`, add the import `STRESS_EARLY_DROP` to the existing `import { ... } from "./retirementData.js";` block, then add after `travelSpendForYear`/`oneTimeSpendForYear`:

```js
export const stressReturnForYear = (realReturn, yearIndex) => {
  if (yearIndex <= 2) return STRESS_EARLY_DROP;
  if (yearIndex <= 5) return realReturn - 0.02;
  return realReturn;
};
```

In `simulate`, replace:

```js
    const need = spendingNeed(i, aA, aB, liveSav) + extraSpend;
    bal = bal * (1 + i.realReturn) + sellLump;
```

with:

```js
    const need = spendingNeed(i, aA, aB, liveSav) + extraSpend;
    const yearReturn = ssOpt.stress ? stressReturnForYear(i.realReturn, y) : i.realReturn;
    bal = bal * (1 + yearReturn) + sellLump;
```

In `calculatePlan`, after the `const simNone = ...` line, add:

```js
  const simStress = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, stress: true });
```

and add `simStress,` to the returned object (next to `simNone,`).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/calculatorCore.js src/retirementData.js src/calculatorCore.test.js
git commit -m "feat: add deterministic sequence-of-returns stress simulation"
```

---

### Task 6: Survivor transition (engine)

At a user-set year, model one spouse's death: switch to single filing, keep the larger Social Security check (survivor step-up), pension continues (assumed survivor annuity). Default OFF so baseline plans are unchanged.

**Files:**
- Modify: `src/calculatorCore.js` (`simulate`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Consumes: `i.survivor = { on:boolean, year:number }` (read off the input). When `i.survivor.on && cal >= i.survivor.year`:
  - filing status for that year's tax becomes `"single"`,
  - household SS for that year becomes `Math.max(ssAy, ssBy)` (survivor keeps the larger), not the sum,
  - pension is unchanged.
- Produces: each row gains `survivor: boolean` flag for charting/labels.

- [ ] **Step 1: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
describe("survivor transition", () => {
  const base = {
    ...baseState,
    ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
    pensionOn: false, savings: 500000, contrib: 0,
    ssModeA: "statement", ssModeB: "statement", ssFraA: 36000, ssFraB: 24000,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    travel: { on: false, amount: 15000, years: 15, taper: true }, events: [],
  };

  it("keeps only the larger Social Security check after the survivor year", () => {
    const sim = simulate({ ...base, survivor: { on: true, year: 2030 } }, { haircut: 1, cutYear: 9999 });
    const before = sim.rows.find((r) => r.cal === 2029);
    const after = sim.rows.find((r) => r.cal === 2030);
    expect(after.survivor).toBe(true);
    // before: both checks; after: only the larger (ssFraA 36000 own benefit at FRA-ish)
    expect(after.ssA + after.ssB).toBeLessThan(before.ssA + before.ssB);
    expect(after.ssA + after.ssB).toBeCloseTo(Math.max(before.ssA, before.ssB), 0);
  });

  it("leaves Social Security untouched when survivor modeling is off", () => {
    const sim = simulate({ ...base, survivor: { on: false, year: 2030 } }, { haircut: 1, cutYear: 9999 });
    const before = sim.rows.find((r) => r.cal === 2029);
    const after = sim.rows.find((r) => r.cal === 2030);
    expect(after.ssA + after.ssB).toBeCloseTo(before.ssA + before.ssB, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `after.survivor` undefined; SS sum unchanged.

- [ ] **Step 3: Implement survivor logic in `simulate`**

In `src/calculatorCore.js`, in `simulate`, find:

```js
    const ssFac = cal >= cutYear ? haircut : 1;
    const ssAy = aA >= i.claimA ? ssAfull * ssFac : 0;
    const ssBy = aB >= i.claimB ? ssBfull * ssFac : 0;
```

Immediately after those three lines add:

```js
    const isSurvivor = !!(i.survivor && i.survivor.on && cal >= Number(i.survivor.year));
    let ssAyEff = ssAy;
    let ssByEff = ssBy;
    if (isSurvivor) {
      const larger = Math.max(ssAy, ssBy);
      ssAyEff = larger;
      ssByEff = 0;
    }
    const yearStatus = isSurvivor ? "single" : i.status;
```

Then replace every remaining use of `ssAy + ssBy` and `ssAy`/`ssBy` *within this loop iteration* with the effective values and threaded status:

- `const need = ...` line is unaffected.
- `const taxBeforeWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ssAy + ssBy, 0);` → pass effective SS and status. Change `taxForYear` to accept a status override (see Step 4), then call `taxForYear(i, aA, aB, wages, pens, rent, ssAyEff + ssByEff, 0, yearStatus)`.
- `const afterTaxBeforeWithdrawal = wages + pens + rent + ssAy + ssBy - taxBeforeWithdrawal;` → use `ssAyEff + ssByEff`.
- `const { withdrawal: wd, tax } = solveWithdrawal(i, aA, aB, wages, pens, rent, ssAy + ssBy, need, bal);` → pass `ssAyEff + ssByEff` and status (see Step 4).
- `const afterTaxCash = wages + pens + rent + ssAy + ssBy + wd - tax;` → use `ssAyEff + ssByEff`.
- In `rows.push`, change `ssA: ssAy, ssB: ssBy,` to `ssA: ssAyEff, ssB: ssByEff,` and add `survivor: isSurvivor,`.

- [ ] **Step 4: Thread an optional status override through the tax helpers**

In `src/calculatorCore.js`, update `taxForYear` and `solveWithdrawal` signatures to accept an optional `statusOverride`:

```js
const taxForYear = (i, aA, aB, wages, pens, rent, ss, grossWithdrawal, statusOverride) =>
  calculateFederalTaxYear({
    status: statusOverride || i.status,
    ageA: aA,
    ageB: aB,
    wages,
    pension: pens,
    rental: rent,
    socialSecurity: ss,
    grossWithdrawal,
    tradFrac: i.tradFrac,
  }).tax;

const solveWithdrawal = (i, aA, aB, wages, pens, rent, ss, need, bal, statusOverride) => {
  const income = wages + pens + rent + ss;
  const taxNoWithdrawal = taxForYear(i, aA, aB, wages, pens, rent, ss, 0, statusOverride);
  if (income - taxNoWithdrawal >= need) return { withdrawal: 0, tax: taxNoWithdrawal };
  let lo = 0;
  let hi = Math.max(0, bal);
  const covers = (withdrawal) =>
    income + withdrawal - taxForYear(i, aA, aB, wages, pens, rent, ss, withdrawal, statusOverride) >= need;
  if (!covers(hi)) return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride) };
  for (let n = 0; n < 32; n++) {
    const mid = (lo + hi) / 2;
    if (covers(mid)) hi = mid;
    else lo = mid;
  }
  return { withdrawal: hi, tax: taxForYear(i, aA, aB, wages, pens, rent, ss, hi, statusOverride) };
};
```

Then update the `solveWithdrawal(...)` call inside `simulate` to pass `yearStatus` as the final argument.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS. Existing depletion test (`uses tax-aware yearly depletion rows`) still passes because `statusOverride` is undefined → falls back to `i.status`.

- [ ] **Step 6: Commit**

```bash
git add src/calculatorCore.js src/calculatorCore.test.js
git commit -m "feat: model survivor transition (single filing + SS step-up)"
```

---

### Task 7: Default state + new input controls (UI)

Boot the app on the household snapshot and add controls for travel, life events, and survivor modeling. New state keys must be normalized for the engine.

**Files:**
- Modify: `RetirementCalculator.jsx` (default `useState`, import constants, new input UI, pass-through to `calculatePlan`)
- Modify: `src/calculatorCore.js` (`calculatePlan` reads `travel`/`events`/`survivor` from `s` into `inp`)

**Interfaces:**
- Consumes: `DEFAULT_TRAVEL`, `DEFAULT_LIFE_EVENTS` from `src/retirementData.js`; engine fields `i.travel`, `i.events`, `i.survivor`.
- Produces: default state matching the snapshot; new keys `travel`, `events`, `survivor` on the state object.

- [ ] **Step 1: Pass new inputs through `calculatePlan`**

In `src/calculatorCore.js`, in `calculatePlan`, the line:

```js
  const inp = { ...s, incomeHH, inher, hcPre: retLocObj.hcPre, hcPost: retLocObj.hcPost };
```

Already spreads `...s`, so `travel`, `events`, and `survivor` pass through automatically. Add explicit defaults so an older saved state without them still works — replace that line with:

```js
  const inp = {
    ...s,
    incomeHH,
    inher,
    hcPre: retLocObj.hcPre,
    hcPost: retLocObj.hcPost,
    travel: s.travel ?? { on: false, amount: 15000, years: 15, taper: true },
    events: s.events ?? [],
    survivor: s.survivor ?? { on: false, year: 9999 },
  };
```

- [ ] **Step 2: Update default `useState` to the snapshot and add new keys**

In `RetirementCalculator.jsx`, add to the top import from data (find the existing `from "./src/retirementData.js"` or the data import; if the component imports constants, add these names): `DEFAULT_TRAVEL, DEFAULT_LIFE_EVENTS`. If `RetirementCalculator.jsx` does not currently import from `retirementData.js`, add:

```js
import { DEFAULT_TRAVEL, DEFAULT_LIFE_EVENTS } from "./src/retirementData.js";
```

Replace the default state object (lines ~81-91) with:

```js
  const [s, setS] = useState({
    ageA:57, ageB:48, stopA:65, stopB:56, claimA:65, claimB:65, pensionAge:65,
    incomeA:0, incomeB:170000, savings:670000, contrib:18000, targetPct:0.40, status:"married",
    ssModeA:"estimate", ssModeB:"estimate", ssFraA:36000, ssFraB:30000,
    pensionOn:true, system:"TRS", plan:3, pYears:22, afc:170000,
    realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
    ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
    retireLoc:"Austria",
    tx:{ on:false, value:790000, year:2038, strategy:"rent" },
    at:{ on:true, value:324000, year:2040, strategy:"live" },
    travel: { ...DEFAULT_TRAVEL },
    events: DEFAULT_LIFE_EVENTS.map((e) => ({ ...e })),
    survivor: { on:false, year:2055 },
  });
```

- [ ] **Step 3: Add the travel + survivor controls (Advanced section)**

In `RetirementCalculator.jsx`, near the existing advanced inputs (the block that renders `realReturn`/`swr`/`tradFrac` around lines 338-341), add a travel control and a survivor control. Use the existing `set` helper and `Field`/`NumberInput`/`Segmented` components already in the file:

```jsx
<Field label={`Travel budget — ${usd0(s.travel.amount)}/yr for ${s.travel.years} yrs`} hint="First years of retirement; tapers to half after year 10.">
  <NumberInput value={s.travel.amount} onChange={(v)=>set("travel")({ ...s.travel, amount:Number(v)||0 })} prefix="$" />
  <input type="range" min={5} max={30} step={1} value={s.travel.years}
    onChange={(e)=>set("travel")({ ...s.travel, years:Number(e.target.value) })}
    style={{ width:"100%", accentColor:C.brass, marginTop:6 }} />
  <Segmented value={s.travel.on} onChange={(v)=>set("travel")({ ...s.travel, on:v })}
    options={[{label:"Include",value:true},{label:"Skip",value:false}]} />
</Field>

<Field label="Survivor transition" hint="Model one spouse's death: single-filer taxes, larger SS kept.">
  <Segmented value={s.survivor.on} onChange={(v)=>set("survivor")({ ...s.survivor, on:v })}
    options={[{label:"Model it",value:true},{label:"Skip",value:false}]} />
  {s.survivor.on && (
    <NumberInput value={s.survivor.year} onChange={(v)=>set("survivor")({ ...s.survivor, year:Number(v)||9999 })} suffix="yr" />
  )}
</Field>
```

(If `NumberInput` does not accept a `suffix` prop, omit it — check the component definition near the top of the file.)

- [ ] **Step 4: Add the life-events editor (Step Four area, near inherited real estate)**

In `RetirementCalculator.jsx`, add a block that maps over `s.events` with a toggle, year, and amount per row:

```jsx
<div style={{ marginTop:18 }}>
  <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Family milestones</div>
  <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate }}>One-time gifts you may make. Toggle each on and set the year and amount.</p>
  {s.events.map((ev, idx) => (
    <div key={ev.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center", marginBottom:6 }}>
      <Segmented value={ev.on} onChange={(v)=>{
        const next=s.events.map((e,i)=> i===idx ? { ...e, on:v } : e); set("events")(next);
      }} options={[{label:ev.label,value:true},{label:"Skip",value:false}]} />
      <NumberInput value={ev.year} onChange={(v)=>{
        const next=s.events.map((e,i)=> i===idx ? { ...e, year:Number(v)||0 } : e); set("events")(next);
      }} />
      <NumberInput value={ev.amount} onChange={(v)=>{
        const next=s.events.map((e,i)=> i===idx ? { ...e, amount:Number(v)||0 } : e); set("events")(next);
      }} prefix="$" />
    </div>
  ))}
</div>
```

- [ ] **Step 5: Run the app and verify it renders**

Run: `pnpm dev` and load `http://127.0.0.1:5173`.
Expected: App boots on the 57/48 household; travel, survivor, and milestone controls render; toggling a wedding on visibly raises the staircase need line in that year (verified visually here; charted properly in Task 8).

- [ ] **Step 6: Run tests + commit**

Run: `pnpm test`
Expected: PASS (engine tests unaffected; `calculatePlan` defaults guard older state).

```bash
git add RetirementCalculator.jsx src/calculatorCore.js
git commit -m "feat: boot on household snapshot; add travel, milestone, and survivor controls"
```

---

### Task 7b: Dynamic life-events editor — add/remove rows (UI)

Let the user add any number of life events (e.g. multiple grandchildren) and remove ones that don't apply, with an editable label per row. No engine change — `oneTimeSpendForYear` already sums an arbitrary-length array.

**Files:**
- Modify: `RetirementCalculator.jsx` (events editor from Task 7 Step 4: add label input, remove button, "Add event" button, id counter)
- Test: `RetirementCalculator.test.jsx`

**Interfaces:**
- Consumes: `s.events` array `{ id, label, on, year, amount }`; the `set("events")` updater.
- Produces: deterministic row ids from a `useRef` counter (no `Date`/random), so tests stay deterministic.

- [ ] **Step 1: Write the failing test**

Add to `RetirementCalculator.test.jsx`:

```jsx
import { fireEvent } from "@testing-library/react";

describe("dynamic life events", () => {
  it("adds a new event row when 'Add event' is clicked", () => {
    render(<RetirementCalculator />);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getByRole("button", { name: /add event/i }));
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before + 1);
  });

  it("removes an event row when its remove button is clicked", () => {
    render(<RetirementCalculator />);
    const before = screen.getAllByRole("button", { name: /remove event/i }).length;
    fireEvent.click(screen.getAllByRole("button", { name: /remove event/i })[0]);
    const after = screen.getAllByRole("button", { name: /remove event/i }).length;
    expect(after).toBe(before - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: FAIL — no "Add event"/"Remove event" buttons yet.

- [ ] **Step 3: Add the id counter and handlers**

In `RetirementCalculator.jsx`, near the other hooks, add a deterministic id counter and add/remove handlers:

```jsx
const eventSeq = useRef(0); // merge useRef into the existing react import if not already present
const addEvent = () => {
  const id = `evt-${eventSeq.current++}`;
  set("events")([...s.events, { id, label: "New milestone", on: true, year: 2040, amount: 10000 }]);
};
const removeEvent = (idx) => set("events")(s.events.filter((_, i) => i !== idx));
```

- [ ] **Step 4: Extend the events editor with label, remove, and add controls**

Replace the events editor block from Task 7 Step 4 with this version (adds an editable label column, a per-row remove button, and an Add button). The grid is now four columns plus the remove button:

```jsx
<div style={{ marginTop:18 }}>
  <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Family milestones</div>
  <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate }}>One-time gifts you may make — weddings, home help, a savings seed per grandchild. Add as many as you need.</p>
  {s.events.map((ev, idx) => (
    <div key={ev.id} style={{ display:"grid", gridTemplateColumns:"1.4fr auto auto auto", gap:8, alignItems:"center", marginBottom:6 }}>
      <input type="text" value={ev.label} aria-label={`Event ${idx + 1} label`}
        onChange={(e)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, label:e.target.value } : x); set("events")(next); }}
        style={{ fontSize:12.5, padding:"6px 8px", border:`1px solid ${C.line}`, borderRadius:6, color:C.ink }} />
      <Segmented value={ev.on} onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, on:v } : x); set("events")(next); }}
        options={[{label:"On",value:true},{label:"Off",value:false}]} />
      <NumberInput value={ev.year} aria-label={`Event ${idx + 1} year`}
        onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, year:Number(v)||0 } : x); set("events")(next); }} />
      <NumberInput value={ev.amount} aria-label={`Event ${idx + 1} amount`} prefix="$"
        onChange={(v)=>{ const next=s.events.map((x,i)=> i===idx ? { ...x, amount:Number(v)||0 } : x); set("events")(next); }} />
      <button type="button" aria-label={`Remove event ${idx + 1}`} onClick={()=>removeEvent(idx)}
        style={{ border:"none", background:"none", color:C.clay, fontSize:16, cursor:"pointer", lineHeight:1 }}>×</button>
    </div>
  ))}
  <button type="button" aria-label="Add event" onClick={addEvent}
    style={{ marginTop:4, padding:"6px 12px", fontSize:12.5, fontWeight:600, cursor:"pointer", background:"none", color:C.viridian, border:`1px solid ${C.viridian}`, borderRadius:6 }}>
    + Add event
  </button>
</div>
```

(If `NumberInput` forwards `aria-label`, the year/amount labels above improve accessibility; if it does not, the test still passes via the add/remove buttons. Verify against the component.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: PASS — add/remove tests green.

- [ ] **Step 6: Manually verify**

Run: `pnpm dev`. Add two "Grandchild 529 — #2 / #3" rows with their own years/amounts; confirm the staircase need line spikes in each chosen year (charted in Task 8).

- [ ] **Step 7: Commit**

```bash
git add RetirementCalculator.jsx RetirementCalculator.test.jsx
git commit -m "feat: dynamic add/remove life events with editable labels"
```

---

### Task 8: Pragmatic charts — event markers + stress band (UI)

Show the drawdown honestly: mark life events on the staircase, plot a downside stress band on the long-run chart, and reframe the headline with capacity vs. modeled spend vs. surplus.

**Files:**
- Modify: `RetirementCalculator.jsx` (chart data builders `compRows`/`balRows`, the long-run `LineChart`, the headline tile)
- Test: `RetirementCalculator.test.jsx` (assert reframed headline copy is present and accessible)

**Interfaces:**
- Consumes: `calc.simStress` (Task 5); `steady.modeledSpend`, `steady.sustainableCapacity`, `steady.surplus` (Task 4); row field `extraSpend`, `survivor` (Tasks 3, 6).

- [ ] **Step 1: Write the failing UI test**

Add to `RetirementCalculator.test.jsx` (follow the file's existing render/import pattern):

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RetirementCalculator from "./RetirementCalculator.jsx";

describe("reframed headline", () => {
  it("labels the headline as spending capacity, not guaranteed income", () => {
    render(<RetirementCalculator />);
    // The tile must distinguish what you spend from what you could spend.
    expect(screen.getByText(/could spend up to/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: FAIL — copy not present yet.

- [ ] **Step 3: Reframe the headline tile**

In `RetirementCalculator.jsx`, near line 355 where the tile renders `{usd0(steady.net/12)}/mo starting ...`, add a clarifying line that names the surplus. After the existing `... lower housing cost` line, insert:

```jsx
<div style={{ fontSize:12, color:C.slate, marginTop:4 }}>
  You're modeling spending of <b>{usd0(steady.modeledSpend)}/yr</b>; you could spend up to <b>{usd0(steady.sustainableCapacity)}/yr</b> at your withdrawal rate.{steady.surplus>0 ? ` The ${usd0(steady.surplus)}/yr you don't spend is what compounds in the chart below.` : ""}
</div>
```

- [ ] **Step 4: Mark life events on the staircase data**

In `RetirementCalculator.jsx`, where `compRows` is built (line ~122), add the event spend to each row so it can be charted/tooltipped:

```js
  const compRows = simSS.rows.filter(r => r.aA >= firstEvent-2).map(r => ({
    age:r.aA, "Salary (you)":Math.round(r.salA), "Salary (spouse)":Math.round(r.salB),
    Rental:Math.round(r.rent), Pension:Math.round(r.pens), "SS (you)":Math.round(r.ssA),
    "SS (spouse)":Math.round(r.ssB), Portfolio:r.wd, need:r.need, extraSpend:r.extraSpend || 0,
  }));
```

Add `ReferenceDot`s for years where `extraSpend > 0` from a one-time event. After the `<Line ... dataKey="need" ... />` in the staircase chart, add:

```jsx
{compRows.filter(r=>r.extraSpend>0).map((r,i)=>(
  <ReferenceDot key={`ev${i}`} x={r.age} y={r.need} r={3.5} fill={C.brass} stroke="#fff" strokeWidth={1.2} ifOverflow="extendDomain" />
))}
```

(`ReferenceDot` is already imported — confirmed in use at line 489.)

- [ ] **Step 5: Add the stress band to the long-run chart**

In `RetirementCalculator.jsx`, extend `balRows` (line ~127) to carry the stress path:

```js
  const balRows = simSS.rows.map((r, idx) => ({
    age:r.aA,
    withSS:r.bal,
    withoutSS: simNo.rows[idx] ? simNo.rows[idx].bal : 0,
    stress: calc.simStress.rows[idx] ? calc.simStress.rows[idx].bal : 0,
  }));
```

In the long-run `LineChart` (line ~482), add a stress line and update the caption. After the `withoutSS` `<Line>`:

```jsx
<Line type="monotone" dataKey="stress" stroke={C.brassDeep} strokeWidth={2} strokeDasharray="2 3" dot={false} name="stress" />
```

Update the paragraph at line ~479 to explain three lines: plan as modeled (green), Social Security eliminated (clay dashed), and a poor-first-decade sequence-risk path (brass dotted). Replace its text with:

```jsx
The green line is your plan as modeled ({s.ssMode==="full"?"full SS":`${Math.round(effHaircut*100)}% SS`}). The clay dashed line drops Social Security entirely. The brass dotted line is a sequence-risk stress test — a market crash in your first retirement years — which is the realistic downside this kind of plan most often understates.
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — reframed-headline UI test green; engine tests green.

- [ ] **Step 7: Commit**

```bash
git add RetirementCalculator.jsx RetirementCalculator.test.jsx
git commit -m "feat: chart life events and sequence-risk band; reframe headline honestly"
```

---

### Task 9: Document the new assumptions

**Files:**
- Modify: `docs/use-cases.md`, `docs/sources.md`

- [ ] **Step 1: Document travel, milestones, survivor, and stress assumptions**

In `docs/use-cases.md`, add a section "Life events & downside modeling" describing: travel default ($15k/yr, 15 yrs, half after year 10), one-time milestones (deterministic, default off, today's dollars, after-tax outflows that force grossed-up withdrawals), survivor transition (single filing + larger-SS step-up, pension assumed to continue), and the sequence-of-returns stress path (−10% years 1-3, `realReturn−2%` years 4-6). State plainly that the headline now separates modeled spend, capacity, and surplus to avoid implying the surplus is spendable income.

- [ ] **Step 2: Note any new source basis in `docs/sources.md`**

Add a line noting the sequence-of-returns stress is an illustrative deterministic scenario, not a forecast, and that travel taper reflects common go-go/slow-go retirement spending research (cite a general reference; no new numeric constants require an external citation since amounts are user inputs).

- [ ] **Step 3: Commit**

```bash
git add docs/use-cases.md docs/sources.md
git commit -m "docs: document life-event, survivor, and stress-test assumptions"
```

---

### Task 10: Decompose the engine into modules behind a barrel (refactor)

Split `calculatorCore.js` into focused `src/finance/*.js` modules; keep `calculatorCore.js` re-exporting everything so no test or import changes. This is a pure refactor — tests must stay green at every step.

**Files:**
- Create: `src/finance/tax.js`, `src/finance/socialSecurity.js`, `src/finance/pension.js`, `src/finance/events.js`, `src/finance/simulate.js`, `src/finance/plan.js`
- Modify: `src/calculatorCore.js` (becomes a barrel)
- Test: existing `src/calculatorCore.test.js` (unchanged — proves the refactor is behavior-preserving)

**Interfaces:**
- Produces: identical public exports to today, now sourced from `src/finance/*`. `calculatorCore.js` re-exports all symbols so `import { ... } from "./calculatorCore.js"` keeps working verbatim.

- [ ] **Step 1: Confirm the safety net is green before refactoring**

Run: `pnpm test`
Expected: PASS (all blocks from Tasks 1-9). Do not proceed if red.

- [ ] **Step 2: Move tax functions to `src/finance/tax.js`**

Create `src/finance/tax.js`. Cut `fedTax`, `taxableSS`, `seniorEligibleCount`, `standardDeduction`, `calculateFederalTaxYear` from `calculatorCore.js` into it. Add the needed imports at the top:

```js
import { FED, PROV, SENIOR_ADDON_MARRIED_PER_PERSON, SENIOR_ADDON_SINGLE, SENIOR_BONUS, SENIOR_BONUS_PHASEOUT, STD } from "../retirementData.js";
```

Keep each function's `export` keyword.

- [ ] **Step 3: Move social-security, pension, and events functions**

Create `src/finance/socialSecurity.js` (`piaFromIncome`, `ownBenefitAtClaimMonthly`, `spousalBenefitAtClaimMonthly`; import `BEND`, `SS_CAP`). Create `src/finance/pension.js` (`pensionERF`, `drsEligibilityNote`, `afcIsAuto`, `resolveAfc`; import `DRS_ERF_30_PLUS`, `DRS_ERF_UNDER_30`). Create `src/finance/events.js` (`travelSpendForYear`, `oneTimeSpendForYear`; no imports). Cut these from `calculatorCore.js`.

- [ ] **Step 4: Move the simulation core to `src/finance/simulate.js`**

Create `src/finance/simulate.js`. Move `benefits`, `spendingNeed`, `stressReturnForYear`, `steadyStartAgeA`, `steadyState`, `simulate`, and the internal `solveWithdrawal`/`taxForYear`. Import their dependencies:

```js
import { TAX_YEAR, STRESS_EARLY_DROP } from "../retirementData.js";
import { calculateFederalTaxYear } from "./tax.js";
import { piaFromIncome, ownBenefitAtClaimMonthly, spousalBenefitAtClaimMonthly } from "./socialSecurity.js";
import { pensionERF, drsEligibilityNote, resolveAfc } from "./pension.js";
import { travelSpendForYear, oneTimeSpendForYear, stressReturnForYear } from "./events.js"; // stressReturnForYear may also live here; see note
```

Note: keep `stressReturnForYear` in `simulate.js` (it is simulation policy, not a generic event) and import `STRESS_EARLY_DROP` there. Adjust the import lines so every used symbol resolves and none is imported twice.

- [ ] **Step 5: Move plan assembly to `src/finance/plan.js`**

Create `src/finance/plan.js`. Move `lineItems`, `monthlyTotal`, `tierFor`, `propEcon`, `resolveSocialSecurityScenario`, `buildInheritanceInputs`, `calculatePlan`. Import `LOCATIONS`, `PROP`, `TIERS`, `TAX_YEAR` from data and `simulate`, `steadyState` from `./simulate.js`.

- [ ] **Step 6: Turn `calculatorCore.js` into a barrel**

Replace the entire contents of `src/calculatorCore.js` with re-exports:

```js
export * from "./finance/tax.js";
export * from "./finance/socialSecurity.js";
export * from "./finance/pension.js";
export * from "./finance/events.js";
export * from "./finance/simulate.js";
export * from "./finance/plan.js";
```

- [ ] **Step 7: Run the full suite to prove behavior is preserved**

Run: `pnpm test`
Expected: PASS — identical results, zero test changes. If any import is missing/duplicated, fix the module's import line and re-run.

- [ ] **Step 8: Commit**

```bash
git add src/calculatorCore.js src/finance/
git commit -m "refactor: split engine into src/finance modules behind a barrel"
```

---

### Task 11: Monte Carlo engine (pure, seeded, deterministic)

Sample annual returns from a normal distribution with a seeded RNG, run the existing simulation per path, and aggregate percentile metrics.

**Files:**
- Modify: `package.json` (add `d3-random`, `d3-array`)
- Modify: `src/retirementData.js` (add `MC_DEFAULTS`)
- Modify: `src/finance/simulate.js` (accept `ssOpt.returns` array)
- Create: `src/finance/monteCarlo.js`
- Modify: `src/calculatorCore.js` barrel (add `export * from "./finance/monteCarlo.js";`)
- Test: `src/calculatorCore.test.js`

**Interfaces:**
- Consumes: `simulate` (now honoring `ssOpt.returns`), `steadyState`, `resolveSocialSecurityScenario`, `buildInheritanceInputs`, `LOCATIONS`.
- Produces: `runMonteCarlo(s, mcOpt) -> result` where `mcOpt = { paths, seed, volatility }` and `result` is:

```js
{
  paths: number,
  seed: number,
  successProb: number,                       // 0..1, fraction of paths lasting to 95
  balanceFan: [{ age, p10, p50, p90 }],       // per simulated year
  sustainableIncome: { p10, p50, p90 },       // after-tax steady-state net per path
  depletionAge: { p10, p50 },                 // worst-case = p10; non-depleted paths => 96
}
```

- Produces constant `MC_DEFAULTS = { paths: 1000, seed: 12345, volatility: 0.12 }`.

- [ ] **Step 1: Add dependencies**

Run: `pnpm add d3-random d3-array`
Expected: both added to `package.json` dependencies; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Let `simulate` accept an explicit per-year return path**

In `src/finance/simulate.js`, in `simulate`, find the line added in Task 5:

```js
    const yearReturn = ssOpt.stress ? stressReturnForYear(i.realReturn, y) : i.realReturn;
```

Replace with (return-array takes precedence; falls back to stress, then flat):

```js
    const yearReturn = ssOpt.returns
      ? (ssOpt.returns[y] ?? i.realReturn)
      : ssOpt.stress
        ? stressReturnForYear(i.realReturn, y)
        : i.realReturn;
```

- [ ] **Step 3: Add the constant**

In `src/retirementData.js`, after `STRESS_EARLY_DROP`:

```js
export const MC_DEFAULTS = { paths: 1000, seed: 12345, volatility: 0.12 };
```

- [ ] **Step 4: Write the failing test**

Add to `src/calculatorCore.test.js`:

```js
import {
  // ...existing imports...
  runMonteCarlo,
} from "./calculatorCore.js";

describe("Monte Carlo", () => {
  const mcState = {
    ...baseState,
    travel: { on: false, amount: 15000, years: 15, taper: true },
    events: [],
    survivor: { on: false, year: 9999 },
  };

  it("is deterministic for a fixed seed", () => {
    const a = runMonteCarlo(mcState, { paths: 200, seed: 7, volatility: 0.12 });
    const b = runMonteCarlo(mcState, { paths: 200, seed: 7, volatility: 0.12 });
    expect(a.successProb).toBe(b.successProb);
    expect(a.balanceFan[a.balanceFan.length - 1].p50).toBe(b.balanceFan[b.balanceFan.length - 1].p50);
  });

  it("returns a probability in [0,1] and an ordered percentile fan", () => {
    const r = runMonteCarlo(mcState, { paths: 300, seed: 1, volatility: 0.12 });
    expect(r.successProb).toBeGreaterThanOrEqual(0);
    expect(r.successProb).toBeLessThanOrEqual(1);
    const last = r.balanceFan[r.balanceFan.length - 1];
    expect(last.p10).toBeLessThanOrEqual(last.p50);
    expect(last.p50).toBeLessThanOrEqual(last.p90);
    expect(r.sustainableIncome.p10).toBeLessThanOrEqual(r.sustainableIncome.p90);
  });

  it("produces a wider outcome spread under higher volatility", () => {
    const lo = runMonteCarlo(mcState, { paths: 300, seed: 3, volatility: 0.05 });
    const hi = runMonteCarlo(mcState, { paths: 300, seed: 3, volatility: 0.20 });
    const spread = (x) => { const l = x.balanceFan[x.balanceFan.length - 1]; return l.p90 - l.p10; };
    expect(spread(hi)).toBeGreaterThan(spread(lo));
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm test src/calculatorCore.test.js`
Expected: FAIL — `runMonteCarlo is not a function`.

- [ ] **Step 6: Implement `runMonteCarlo`**

Create `src/finance/monteCarlo.js`:

```js
import { randomLcg, randomNormal } from "d3-random";
import { quantile } from "d3-array";
import { LOCATIONS, MC_DEFAULTS, TAX_YEAR } from "../retirementData.js";
import { simulate, steadyState } from "./simulate.js";
import { resolveSocialSecurityScenario, buildInheritanceInputs } from "./plan.js";

export function runMonteCarlo(s, mcOpt = {}) {
  const paths = mcOpt.paths ?? MC_DEFAULTS.paths;
  const seed = mcOpt.seed ?? MC_DEFAULTS.seed;
  const volatility = mcOpt.volatility ?? MC_DEFAULTS.volatility;

  const incomeHH = (Number(s.incomeA) || 0) + (Number(s.incomeB) || 0);
  const retLocObj = LOCATIONS.find((l) => l.name === s.retireLoc) || LOCATIONS[10];
  const inher = buildInheritanceInputs(s);
  const inp = {
    ...s, incomeHH, inher, hcPre: retLocObj.hcPre, hcPost: retLocObj.hcPost,
    travel: s.travel ?? { on: false, amount: 15000, years: 15, taper: true },
    events: s.events ?? [],
    survivor: s.survivor ?? { on: false, year: 9999 },
  };
  const { effHaircut, effCutYear } = resolveSocialSecurityScenario(s);

  const rng = randomLcg(seed);                       // seeded, reproducible
  const sample = randomNormal.source(rng)(inp.realReturn, volatility);
  const end = Math.max(95 - inp.ageA, 95 - inp.ageB);

  const balancesByYear = Array.from({ length: end + 1 }, () => []);
  const incomes = [];
  const depAges = [];
  let lasted = 0;

  for (let p = 0; p < paths; p++) {
    const returns = Array.from({ length: end + 1 }, () => sample());
    const sim = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, returns });
    sim.rows.forEach((r, y) => balancesByYear[y].push(r.bal));
    if (sim.depAge === null) { lasted += 1; depAges.push(96); }
    else depAges.push(sim.depAge);
    incomes.push(steadyState(inp, sim, effHaircut, effCutYear).net);
  }

  const balanceFan = balancesByYear.map((vals, y) => {
    const sorted = vals.slice().sort((a, b) => a - b);
    return {
      age: inp.ageA + y,
      p10: Math.round(quantile(sorted, 0.1)),
      p50: Math.round(quantile(sorted, 0.5)),
      p90: Math.round(quantile(sorted, 0.9)),
    };
  });
  const incSorted = incomes.slice().sort((a, b) => a - b);
  const depSorted = depAges.slice().sort((a, b) => a - b);

  return {
    paths, seed,
    successProb: lasted / paths,
    balanceFan,
    sustainableIncome: {
      p10: Math.round(quantile(incSorted, 0.1)),
      p50: Math.round(quantile(incSorted, 0.5)),
      p90: Math.round(quantile(incSorted, 0.9)),
    },
    depletionAge: {
      p10: Math.round(quantile(depSorted, 0.1)),
      p50: Math.round(quantile(depSorted, 0.5)),
    },
  };
}
```

Note: `simulate` zeroes `bal` at 0 (`if (bal < 1) bal = 0`) and sets `depAge` only when cash falls short, so non-depleted paths correctly yield `depAge === null` → counted as lasting and assigned age 96 for the percentile.

- [ ] **Step 7: Add the module to the barrel**

In `src/calculatorCore.js`, add:

```js
export * from "./finance/monteCarlo.js";
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test src/calculatorCore.test.js`
Expected: PASS (Monte Carlo block green; all prior blocks unaffected).

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/retirementData.js src/finance/ src/calculatorCore.js src/calculatorCore.test.js
git commit -m "feat: add deterministic seeded Monte Carlo engine with percentile metrics"
```

---

### Task 12: Web Worker wrapper + opt-in trigger (UI)

Run Monte Carlo off the main thread, only when the user clicks. Keep the worker thin.

**Files:**
- Create: `src/finance/mcWorker.js`
- Modify: `RetirementCalculator.jsx` (worker lifecycle, "Run Monte Carlo" button, loading + result state)
- Test: `RetirementCalculator.test.jsx`

**Interfaces:**
- Consumes: `runMonteCarlo` (Task 11), `MC_DEFAULTS`.
- Produces: worker posts `{ type: "mc-result", result }`; the component holds `mc` (result or null) and `mcRunning` (boolean).

- [ ] **Step 1: Create the worker**

Create `src/finance/mcWorker.js`:

```js
import { runMonteCarlo } from "./monteCarlo.js";

self.onmessage = (e) => {
  const { state, mcOpt } = e.data;
  const result = runMonteCarlo(state, mcOpt);
  self.postMessage({ type: "mc-result", result });
};
```

- [ ] **Step 2: Write the failing UI test**

Add to `RetirementCalculator.test.jsx`:

```jsx
describe("Monte Carlo trigger", () => {
  it("offers an opt-in button and does not run automatically", () => {
    render(<RetirementCalculator />);
    const btn = screen.getByRole("button", { name: /run monte carlo/i });
    expect(btn).toBeInTheDocument();
    // No percentile result is shown until the user runs it.
    expect(screen.queryByText(/success probability/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: FAIL — no "Run Monte Carlo" button yet.

- [ ] **Step 4: Wire the worker and button in the component**

In `RetirementCalculator.jsx`, add imports and state near the other `useState` hooks:

```jsx
import { useRef, useEffect } from "react"; // merge with existing react import
import { MC_DEFAULTS } from "./src/retirementData.js"; // merge with existing data import
// ...
const [mc, setMc] = useState(null);
const [mcRunning, setMcRunning] = useState(false);
const workerRef = useRef(null);

useEffect(() => {
  workerRef.current = new Worker(new URL("./src/finance/mcWorker.js", import.meta.url), { type: "module" });
  workerRef.current.onmessage = (e) => {
    if (e.data?.type === "mc-result") { setMc(e.data.result); setMcRunning(false); }
  };
  return () => workerRef.current && workerRef.current.terminate();
}, []);

const runMc = () => {
  setMcRunning(true);
  setMc(null);
  workerRef.current.postMessage({ state: s, mcOpt: MC_DEFAULTS });
};
```

Add the trigger button in the long-run chart card (near line ~478, the "How far the savings stretch" section):

```jsx
<button onClick={runMc} disabled={mcRunning}
  style={{ marginTop:8, padding:"7px 14px", fontSize:12.5, fontWeight:600, cursor: mcRunning?"default":"pointer",
    background:C.viridian, color:"#fff", border:"none", borderRadius:6, opacity: mcRunning?0.6:1 }}>
  {mcRunning ? "Running 1,000 paths…" : "Run Monte Carlo (1,000 paths)"}
</button>
```

- [ ] **Step 5: Re-run the failing test**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: PASS — button present; no result shown until clicked. (The worker does not execute in jsdom; that is fine — the engine is covered directly in Task 11.)

- [ ] **Step 6: Manually verify the worker runs in the browser**

Run: `pnpm dev`, click "Run Monte Carlo". Expected: button shows the running label, then results populate within ~1s without freezing the UI.

- [ ] **Step 7: Commit**

```bash
git add src/finance/mcWorker.js RetirementCalculator.jsx RetirementCalculator.test.jsx
git commit -m "feat: run Monte Carlo in a Web Worker behind an opt-in button"
```

---

### Task 13: Monte Carlo charting + metric tiles (UI)

Surface all four chosen outputs: success probability, p10/p50/p90 balance fan, percentile sustainable income, and worst-case (p10) depletion age.

**Files:**
- Modify: `RetirementCalculator.jsx` (long-run chart fan + metric tiles)
- Test: `RetirementCalculator.test.jsx`

**Interfaces:**
- Consumes: `mc` state (Task 12) — `successProb`, `balanceFan`, `sustainableIncome`, `depletionAge`.

- [ ] **Step 1: Write the failing test**

Add to `RetirementCalculator.test.jsx` a test that injects a result by clicking and stubbing the worker is impractical in jsdom; instead test the pure presenter. Extract a small pure formatter and test it. First add the formatter to `RetirementCalculator.jsx`:

```jsx
export const mcSummaryLines = (mc) => mc ? [
  `Success probability: ${Math.round(mc.successProb * 100)}%`,
  `Median sustainable income: ${mc.sustainableIncome.p50.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}`,
  `Worst-case (10th pct) savings run out at age: ${mc.depletionAge.p10 >= 96 ? "beyond 95" : mc.depletionAge.p10}`,
] : [];
```

Then the test:

```jsx
import { mcSummaryLines } from "./RetirementCalculator.jsx";

describe("Monte Carlo summary formatting", () => {
  it("formats success, income, and worst-case age", () => {
    const lines = mcSummaryLines({
      successProb: 0.87,
      sustainableIncome: { p10: 90000, p50: 110000, p90: 140000 },
      depletionAge: { p10: 91, p50: 96 },
    });
    expect(lines[0]).toBe("Success probability: 87%");
    expect(lines[2]).toContain("91");
  });

  it("reports 'beyond 95' when even the 10th percentile never depletes", () => {
    const lines = mcSummaryLines({
      successProb: 1, sustainableIncome: { p10: 1, p50: 2, p90: 3 }, depletionAge: { p10: 96, p50: 96 },
    });
    expect(lines[2]).toContain("beyond 95");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test RetirementCalculator.test.jsx`
Expected: FAIL — `mcSummaryLines` not exported.

- [ ] **Step 3: Add the formatter (Step 1 code) and render the tiles**

After adding `mcSummaryLines`, render a result block below the "Run Monte Carlo" button that appears only when `mc` is set:

```jsx
{mc && (
  <div style={{ marginTop:10, padding:"10px 12px", background:C.parchment, borderRadius:8, fontSize:12.5, color:C.ink }}>
    <div style={{ fontWeight:700, marginBottom:4 }}>Monte Carlo · {mc.paths.toLocaleString()} paths</div>
    {mcSummaryLines(mc).map((line, i) => <div key={i}>{line}</div>)}
    <div style={{ color:C.slate, marginTop:4 }}>
      Sustainable income range: {usd0(mc.sustainableIncome.p10)} – {usd0(mc.sustainableIncome.p90)}/yr (10th–90th pct).
    </div>
  </div>
)}
```

(`C.parchment`/`C.ink`/`C.slate` are existing palette keys; if `parchment` is absent, use `C.paper` or another existing light key — check the `C` object near the top.)

- [ ] **Step 4: Add the percentile fan to the long-run chart**

When `mc` is set, plot the fan using a `ComposedChart` band. In the long-run chart, merge fan data and render p10/p90 as a shaded area with p50 as a line. Add this conditional chart beneath the existing `LineChart` (keep the deterministic chart; the fan is the MC overlay):

```jsx
{mc && (
  <ResponsiveContainer width="100%" height={180}>
    <ComposedChart data={mc.balanceFan} margin={{ top:6, right:14, left:4, bottom:0 }}>
      <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
      <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
      <Area type="monotone" dataKey="p90" stroke="none" fill={C.viridian} fillOpacity={0.12} />
      <Area type="monotone" dataKey="p10" stroke="none" fill="#fff" fillOpacity={1} />
      <Line type="monotone" dataKey="p50" stroke={C.viridian} strokeWidth={2.4} dot={false} />
      <Line type="monotone" dataKey="p10" stroke={C.clay} strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
    </ComposedChart>
  </ResponsiveContainer>
)}
```

(`ComposedChart`, `Area`, `Line`, `ResponsiveContainer` are already imported per the file header at lines 3-5. The white p10 area masks the lower part of the p90 band to leave a p10→p90 ribbon; if the masking looks off, switch to two stacked areas with `stackId` and a transparent base of `p10` + band of `p90 - p10`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — formatter tests green; engine + prior UI tests unaffected.

- [ ] **Step 6: Manually verify in the browser**

Run: `pnpm dev`, click Run Monte Carlo. Expected: tiles show success %, income range, worst-case age; the fan chart renders a p10–p90 ribbon with the p50 median line.

- [ ] **Step 7: Commit**

```bash
git add RetirementCalculator.jsx RetirementCalculator.test.jsx
git commit -m "feat: chart Monte Carlo percentile fan and surface p-metric tiles"
```

---

## Self-Review

**Spec coverage:**
- Travel budget ($15k, 15 yr, overrideable, duration) → Task 1 + Task 7 controls. ✅
- Children weddings / home help / grandchild savings → Task 2 + Task 7 editor. ✅
- More realistic drawdown → Task 3 (events raise need/withdrawals), Task 4 (headline reconciliation). ✅
- More pragmatic/realistic charting → Task 8 (event markers, stress band, reframed headline). ✅
- Sequence risk (recommended default over Monte Carlo) → Task 5. ✅
- Survivor transition (recommended realism add) → Task 6. ✅
- Match defaults to snapshot → Task 7 Step 2. ✅
- Monte Carlo as an opt-in toggle, run only on request → Task 11 (engine) + Task 12 (Web Worker button). ✅
- p-metrics in charting and metrics → Task 13 (fan + tiles; all four selected outputs: success probability, p10/p50/p90 balance fan, percentile sustainable income, worst-case p10 depletion age). ✅
- Decomposition/refactoring → Task 10 (module split behind a barrel). ✅
- Optimization (don't block UI) → Task 12 (Web Worker; runs only on click). ✅
- Well-maintained popular libraries → `d3-random` + `d3-array` (Task 11), chosen after web research. ✅

**Placeholder scan:** No TBD/TODO; every code step shows real code. UI steps flag the assumptions to verify against the live component rather than assume: `NumberInput` `suffix` support (Task 7), the `C` palette key names (`parchment`/`paper`, Task 13), and the p10/p90 band masking fallback (Task 13). These are verification notes, not placeholders — the code to write is fully shown. ✅

**Type consistency:** `travel = {on, amount, years, taper}`, `events = [{id,label,on,year,amount}]`, `survivor = {on, year}` used identically in Tasks 1-13. `simulate` row gains `extraSpend` (Task 3) and `survivor` (Task 6); `ssOpt` gains `stress` (Task 5) then `returns` (Task 11), precedence `returns > stress > flat`. `steady` gains `modeledSpend`/`sustainableCapacity`/`surplus` (Task 4). `calc.simStress` (Task 5) consumed in Task 8. `taxForYear`/`solveWithdrawal` gain a trailing optional `statusOverride` (Task 6). `runMonteCarlo(s, mcOpt)` returns `{paths, seed, successProb, balanceFan:[{age,p10,p50,p90}], sustainableIncome:{p10,p50,p90}, depletionAge:{p10,p50}}` (Task 11), consumed verbatim by the worker (Task 12) and `mcSummaryLines`/fan chart (Task 13). `MC_DEFAULTS = {paths, seed, volatility}` shared by engine and UI. ✅

**Ordering note:** Task 10 (decomposition) runs before Tasks 11-13 so Monte Carlo lands in the new `src/finance/` layout. If executed before Task 10, the `simulate` edits in Tasks 3/5/11 still apply — they just live in `calculatorCore.js` instead of `src/finance/simulate.js`. Either order is valid; the recommended sequence is 1-9, then 10, then 11-13.

## Execution Handoff

Plan complete and saved to `docs/archive/superpowers/plans/2026-06-17-realistic-retirement-modeling.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
