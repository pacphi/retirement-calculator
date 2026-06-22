# Wave 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the foundation for the two-arcs roadmap: validate the uncommitted exploration with characterization tests (keep/rework/scrap), extract `RetirementCalculator.jsx` into focused components, and define engine seams in `simulate.js` so later feature waves attach without colliding.

**Architecture:** Three ordered phases. **0C first** — pin the exploration's contracts with characterization tests and record a verdict, so we never restructure code we might scrap. **0A/0B** — extract theme + UI atoms + chart/result/step panels into `src/components/**`, leaving `RetirementCalculator.jsx` a thin composition root; the existing 178-test suite (which renders the whole component) is the safety net for these mechanical moves. **0D** — refactor `spendingNeed()` into a composition and add named seam functions, behavior-preserving, guarded by characterization tests.

**Tech Stack:** React 19, Vite, Vitest 4 + @testing-library/react 16, Recharts 3, pure ES-module finance engine under `src/finance/**` re-exported by `src/calculatorCore.js`.

## Global Constraints

- **Real-dollar invariant:** no new nominal flow in this wave; engine stays seedless and date-free. (Verbatim from spec §3.1, §3.3.)
- **One federal tax engine:** do not fork `calculateFederalTaxYear`. (Spec §3.2.)
- **Tests + docs lockstep:** every engine change updates a test in the same commit. (Spec §3.5.)
- **Behavior preservation in 0A/0B/0D:** extraction and seam refactors must not change any numeric output or rendered text. The 178 existing tests must stay green at every commit.
- **Wave gate:** `pnpm check` (lint + typecheck + markdown lint + links + test) passes before the wave is considered done. Per-task gate is `pnpm test` + `pnpm lint`.
- **No attribution trailer** in commits (project `.claude/settings.json` has no `attribution.commit`).
- **Extraction convention:** when a step says "move verbatim," copy the exact existing JSX/const block from the cited line range into the new file unchanged, then replace the original site with the new component/import. Do not reformat or rename while moving. Reproducing the full block is unnecessary because it is existing, test-covered code; the cited line range + stated interface is the contract.

---

## File structure (created/modified this wave)

**0C (validation — tests + a verdict doc):**

- Create: `src/finance/breakdown.test.js` — characterization tests for `monthlyBreakdown` / `yearMilestones`.
- Modify: `src/calculatorCore.test.js` — add seam-contract tests for location-basis `spendingNeed` and recurring events.
- Create: `docs/superpowers/specs/2026-06-21-exploration-verdict.md` — keep/rework/scrap verdict.

**0A (theme + atoms):**

- Create: `src/components/theme.js` — `C`, `SRC`, `inputStyle`, font constants.
- Create: `src/components/atoms/index.jsx` — Field, NumberInput, Select, Segmented, Section, AssumptionIcon, Chevron, NestLogo.

**0B (panels):**

- Create: `src/components/charts/{Staircase,YearByYear,PortfolioFlows,LongRun,Places,Compare,IncomeMix}.jsx`
- Create: `src/components/results/{Headline,Stats,RiskTable,Inheritance}.jsx`
- Create: `src/components/steps/{Household,Timing,Pension,Inheritance,Milestones,TravelLongevity,Advanced}.jsx`
- Create: `src/hooks/{usePlan,useMonteCarlo}.js`
- Modify: `RetirementCalculator.jsx` — becomes thin composition root.

**0D (engine seams):**

- Modify: `src/finance/simulate.js` — `spendingNeed()` recomposed; seam functions added.
- Create: `src/finance/seams.js` — named seam stubs (`spendingComponents`, `yearReturn`, default pass-throughs).
- Modify: `src/calculatorCore.js` — re-export new seam functions.

---

## PHASE 0C — Validate the exploration (TDD due-diligence)

### Task 1: Characterization tests for `breakdown.js`

**Files:**

- Create: `src/finance/breakdown.test.js`
- Reference (read-only): `src/finance/breakdown.js:1-67`

**Interfaces:**

- Consumes: `monthlyBreakdown(row) -> { income:{salA,salB,rent,pens,ssA,ssB}, draw, expenses:{living,extra,tax}, incomeTotalMo, expenseTotalMo, netMo }`; `yearMilestones(row, prevRow, inputs, depAge) -> [{key,label,kind,amount?}]`.
- Produces: a behavioral lock the YearByYear chart extraction (Task 8) and any future month-view work depend on.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/breakdown.test.js
import { describe, expect, it } from "vitest";
import { monthlyBreakdown, yearMilestones } from "./breakdown.js";

describe("monthlyBreakdown", () => {
  it("divides annual figures into an honest per-month rate", () => {
    const row = {
      salA: 120000,
      salB: 0,
      rent: 12000,
      pens: 24000,
      ssA: 18000,
      ssB: 6000,
      wdSpend: 36000,
      wd: 99999,
      need: 96000,
      extraSpend: 12000,
      tax: 12000,
    };
    const b = monthlyBreakdown(row);
    expect(b.income.salA).toBeCloseTo(10000, 6);
    expect(b.draw).toBeCloseTo(3000, 6); // uses wdSpend, not wd
    expect(b.expenses.living).toBeCloseTo((96000 - 12000) / 12, 6);
    expect(b.expenses.extra).toBeCloseTo(1000, 6);
    expect(b.expenseTotalMo).toBeCloseTo((84000 + 12000 + 12000) / 12, 6);
  });

  it("falls back to wd when wdSpend is absent and tolerates missing fields", () => {
    const b = monthlyBreakdown({ wd: 24000, need: 24000 });
    expect(b.draw).toBeCloseTo(2000, 6);
    expect(b.income.salA).toBe(0);
    expect(Number.isNaN(b.netMo)).toBe(false);
  });
});

describe("yearMilestones", () => {
  const base = {
    aA: 64,
    aB: 62,
    ssA: 0,
    ssB: 0,
    pens: 0,
    rmd: 0,
    sellLump: 0,
    extraSpend: 0,
  };
  it("flags an income stream only on its onset year", () => {
    const prev = { ...base, ssA: 0 };
    const row = { ...base, ssA: 18000 };
    const ms = yearMilestones(row, prev);
    expect(ms.find((x) => x.key === "ssA")).toMatchObject({ kind: "income" });
    // no double-fire once already on
    expect(yearMilestones({ ...row }, { ...row })).toEqual([]);
  });
  it("surfaces a home sale as a spend milestone with its amount", () => {
    const ms = yearMilestones({ ...base, sellLump: 250000 }, base);
    expect(ms.find((x) => x.key === "sell")).toMatchObject({
      kind: "spend",
      amount: 250000,
    });
  });
  it("flags Medicare at 65 and work-stop from inputs", () => {
    const ms = yearMilestones({ ...base, aA: 65 }, base, { stopA: 65 });
    expect(ms.map((x) => x.key)).toEqual(
      expect.arrayContaining(["med-a", "stop-a"]),
    );
  });
});
```

- [ ] **Step 2: Run to verify behavior**

Run: `pnpm test -- src/finance/breakdown.test.js`
Expected: PASS (these lock current behavior). If any assertion FAILS, the exploration is wrong against its documented contract → record under "rework" in the verdict (Task 4) rather than editing here.

- [ ] **Step 3: Commit**

```bash
git add src/finance/breakdown.test.js
git commit -m "test: characterize breakdown.js month/milestone derivation"
```

### Task 2: Seam-contract test for location-basis `spendingNeed`

**Files:**

- Modify: `src/calculatorCore.test.js` (append a new `describe` block near existing spendingNeed tests)
- Reference (read-only): `src/finance/simulate.js:66-97`

**Interfaces:**

- Consumes: `spendingNeed(i, ageA, ageB, liveSav?, isSurvivor?, survivorAge?)`.
- Produces: the contract Task 12 (0D recomposition) must preserve — location basis = `basket*12*scale*lifestyle + healthcareByAge`, floored at `0.35*base`, with `liveSav` subtracted.

- [ ] **Step 1: Write the failing test**

```js
// append to src/calculatorCore.test.js
describe("spendingNeed location basis (seam contract for 0D)", () => {
  const L = LOCATIONS.find((x) => x.m); // any location with a basket
  const i = {
    spendBasis: "location",
    retLocObj: L,
    status: "married",
    lifestyle: 100,
  };

  it("sums the cost-of-living basket plus age-based healthcare (couple, pre-65)", () => {
    const livingYr = Object.values(L.m).reduce((a, b) => a + b, 0) * 12;
    const hcYr = (L.hcPre / 2) * 2 * 12; // both under 65, couple
    expect(spendingNeed(i, 60, 60)).toBeCloseTo(livingYr + hcYr, 2);
  });

  it("applies the single/survivor cost factor and single healthcare", () => {
    const livingYr =
      Object.values(L.m).reduce((a, b) => a + b, 0) * 12 * SINGLE_COST_FACTOR;
    const hcYr = (L.hcPre / 2) * 12;
    expect(spendingNeed(i, 60, 60, 0, true, 60)).toBeCloseTo(
      livingYr + hcYr,
      2,
    );
  });

  it("scales living (not healthcare) by lifestyle and subtracts live-in saving", () => {
    const lo = spendingNeed({ ...i, lifestyle: 80 }, 70, 70, 5000);
    const base = spendingNeed(i, 70, 70, 0);
    expect(lo).toBeLessThan(base);
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test -- src/calculatorCore.test.js -t "seam contract for 0D"`
Expected: PASS. A FAIL means the location basis diverges from its documented formula → log in verdict.

- [ ] **Step 3: Commit**

```bash
git add src/calculatorCore.test.js
git commit -m "test: pin location-basis spendingNeed contract for the 0D seam"
```

### Task 3: Contract test for recurring events

**Files:**

- Modify: `src/calculatorCore.test.js`
- Reference (read-only): `src/finance/events.js` (`scheduledSpendForYear`, `oneTimeSpendForYear` alias)

**Interfaces:**

- Consumes: `scheduledSpendForYear(events, cal)` and back-compat `oneTimeSpendForYear(events, cal)`.
- Produces: lock that recurring cadence + `untilYear` windowing works, since Wave 1 C3 (typed/emergent events) extends this module.

- [ ] **Step 1: Write the failing test**

```js
// append to src/calculatorCore.test.js
describe("recurring events (seam contract for Wave 1 C3)", () => {
  const ev = [
    { on: true, year: 2030, amount: 45000, everyYears: 10, untilYear: 2050 },
  ];
  it("fires on cadence within the window and is silent off-cadence", () => {
    expect(scheduledSpendForYear(ev, 2030)).toBe(45000);
    expect(scheduledSpendForYear(ev, 2035)).toBe(0);
    expect(scheduledSpendForYear(ev, 2040)).toBe(45000);
    expect(scheduledSpendForYear(ev, 2060)).toBe(0); // past untilYear
  });
  it("treats no everyYears as a one-time event (old behavior preserved)", () => {
    const one = [{ on: true, year: 2031, amount: 10000 }];
    expect(oneTimeSpendForYear(one, 2031)).toBe(10000);
    expect(oneTimeSpendForYear(one, 2032)).toBe(0);
  });
  it("skips disabled events", () => {
    expect(scheduledSpendForYear([{ ...ev[0], on: false }], 2030)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `pnpm test -- src/calculatorCore.test.js -t "Wave 1 C3"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/calculatorCore.test.js
git commit -m "test: pin recurring-event cadence contract for Wave 1 C3"
```

### Task 4: Record the exploration verdict

**Files:**

- Create: `docs/superpowers/specs/2026-06-21-exploration-verdict.md`

- [ ] **Step 1: Write the verdict doc**

Document, per feature (location-basis, year-by-year navigator/`breakdown.js`, recurring events): the characterization tests added, whether each PASSED unchanged (=keep), needed adjustment (=rework, with what), or contradicted the roadmap (=scrap). Note any seam adjustments needed in 0D. Conclude with an explicit KEEP/REWORK/SCRAP line per feature.

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS (all green, count ≥ 178 + new tests).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-21-exploration-verdict.md
git commit -m "docs(spec): exploration keep/rework/scrap verdict (Wave 0c)"
```

---

## PHASE 0A — Extract theme + atoms

### Task 5: Extract `theme.js`

**Files:**

- Create: `src/components/theme.js`
- Modify: `RetirementCalculator.jsx:39-41` (replace inline `C`, `SRC` with import); `:101` (`inputStyle`).

**Interfaces:**

- Produces: `export const C = {...}`, `export const SRC = {...}`, `export const inputStyle = {...}`, `export const FONTS = { body, serif, mono }`. Every later component imports tokens from here so the brass/viridian/clay theme stays centralized.

- [ ] **Step 1: Create the module by moving tokens verbatim**

Move the `C` object (`:39`), `SRC` object (`:40-41`), and `inputStyle` (`:101`) verbatim into `src/components/theme.js` as named exports. Add `export const FONTS = { body: "'Inter', system-ui, sans-serif", serif: "'Newsreader', serif", mono: "'JetBrains Mono', monospace" };`.

- [ ] **Step 2: Wire the import**

In `RetirementCalculator.jsx`, delete the moved consts and add at top: `import { C, SRC, inputStyle, FONTS } from "./src/components/theme.js";` (match the file's existing relative-path style).

- [ ] **Step 3: Run tests + lint**

Run: `pnpm test && pnpm lint`
Expected: PASS, 0 lint errors. The 178 tests render the component and exercise these tokens.

- [ ] **Step 4: Commit**

```bash
git add src/components/theme.js RetirementCalculator.jsx
git commit -m "refactor(ui): extract theme tokens to src/components/theme.js"
```

### Task 6: Extract UI atoms

**Files:**

- Create: `src/components/atoms/index.jsx`
- Modify: `RetirementCalculator.jsx` (move `:44-142`: NestLogo, Chevron, Field, AssumptionIcon, NumberInput, Select, Segmented, Section).

**Interfaces:**

- Produces (exact signatures, verbatim from current code):
  - `Field({ label, hint, children })`
  - `NumberInput({ value, onChange, prefix, suffix, min, ...rest })`
  - `Select({ value, onChange, options })`
  - `Segmented({ value, onChange, options })`
  - `Section({ eyebrow, title, children })`
  - `AssumptionIcon({ title })`, `Chevron({ up })`, `NestLogo({ size })`

- [ ] **Step 1: Move atoms verbatim**

Move the eight components (`:44-142`) verbatim into `src/components/atoms/index.jsx`. Add `import { C, inputStyle, FONTS } from "../theme.js";` and export each as a named export. Keep all internal JSX and styles unchanged.

- [ ] **Step 2: Wire imports**

In `RetirementCalculator.jsx`, delete the moved definitions and add `import { Field, NumberInput, Select, Segmented, Section, AssumptionIcon, Chevron, NestLogo } from "./src/components/atoms/index.jsx";`.

- [ ] **Step 3: Run tests + lint**

Run: `pnpm test && pnpm lint`
Expected: PASS. UI tests query these atoms by accessible role/label, so any regression surfaces.

- [ ] **Step 4: Commit**

```bash
git add src/components/atoms/index.jsx RetirementCalculator.jsx
git commit -m "refactor(ui): extract input atoms to src/components/atoms"
```

---

## PHASE 0B — Extract panels (one task per panel; each independently testable via the full suite)

> Each task below: move the cited JSX block verbatim into a new component file that receives its data via props, replace the original site with `<Component {...props} />`, then `pnpm test && pnpm lint`. The composition root keeps owning state and `calc`; panels are presentational. Commit after each.

### Task 7: Extract `Staircase` chart

**Files:**

- Create: `src/components/charts/Staircase.jsx`
- Modify: `RetirementCalculator.jsx:841-891` (staircase panel) and keep `compRows` derivation in the root.

**Interfaces:**

- Produces: `Staircase({ compRows, depAge, onSelectYear })` — renders the Recharts ComposedChart (stacked income areas, dashed `need` line, event dots, depletion line). Consumes `compRows` shape `{ age, ageB, "Salary (you)", "Salary (spouse)", "Rental", "Pension", "SS (you)", "SS (spouse)", "Portfolio", need, extraSpend }` and `SRC`/`C` from theme.

- [ ] **Step 1:** Move `:841-891` verbatim into the new file; add `import { C, SRC } from "../theme.js";` and Recharts imports. Accept `{ compRows, depAge, onSelectYear }` props; replace any closed-over root variables with props.
- [ ] **Step 2:** In the root, render `<Staircase compRows={compRows} depAge={simSS.depAge} onSelectYear={setSelYear} />`.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS.
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract Staircase chart component"`

### Task 8: Extract `YearByYear` navigator (depends on 0C verdict = keep/rework)

**Files:**

- Create: `src/components/charts/YearByYear.jsx`
- Modify: `RetirementCalculator.jsx:893-991`.

**Interfaces:**

- Produces: `YearByYear({ row, prevRow, inputs, depAge, view, onViewChange, selYear, onYearChange, playing, onTogglePlay, open, onToggleOpen })`. Uses `monthlyBreakdown`/`yearMilestones` from `src/finance/breakdown.js`.

- [ ] **Step 1:** Move `:893-991` verbatim; import `{ monthlyBreakdown, yearMilestones }` from `"../../finance/breakdown.js"`. Lift the navigator state (`selYear`, `playing`, `ybyView`, `ybyOpen`, the auto-play `useEffect`) into the composition root and pass via props, so this component is presentational.
- [ ] **Step 2:** Wire props in the root.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS (navigator tests in `RetirementCalculator.test.jsx` exercise slider/play/view-toggle).
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract YearByYear navigator component"`

### Task 9: Extract `PortfolioFlows` chart

**Files:**

- Create: `src/components/charts/PortfolioFlows.jsx`
- Modify: `RetirementCalculator.jsx:993-1043`.

**Interfaces:**

- Produces: `PortfolioFlows({ invRows, view, onViewChange })` — consumes `invRows` `{ age, deferred, afterTax, contrib, growth, spendDraw, forcedRmd, rmd }`.

- [ ] **Step 1:** Move `:993-1043` verbatim into the new file with props as above; theme + Recharts imports.
- [ ] **Step 2:** Wire `<PortfolioFlows invRows={invRows} .../>` in the root.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS.
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract PortfolioFlows chart component"`

### Task 10: Extract `LongRun`, `Places`, `Compare`, `IncomeMix` charts

**Files:**

- Create: `src/components/charts/LongRun.jsx` (`:1045-1104`), `Places.jsx` (`:1106-1187`), `Compare.jsx` (`:1189-1218`), `IncomeMix.jsx` (`:1220-1232`)
- Modify: `RetirementCalculator.jsx` at those ranges.

**Interfaces:**

- `LongRun({ balRows, mc, homeSaleDots })` — `balRows` `{ age, withSS, withoutSS, stress }` + optional Monte Carlo fan.
- `Places({ locRows, expanded, onToggle })` — `locRows` `{ ...location, cost, ratio, tier }`.
- `Compare({ locRows, a, b, onPick })`.
- `IncomeMix({ incomeStack })`.

- [ ] **Step 1:** Move each cited block verbatim into its file with the stated props; theme + Recharts imports.
- [ ] **Step 2:** Wire all four in the root.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS.
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract LongRun/Places/Compare/IncomeMix charts"`

### Task 11: Extract result panels and input steps

**Files:**

- Create: `src/components/results/{Headline,Stats,RiskTable,Inheritance}.jsx` (`:744-766`, `:768-781`, `:783-829`, `:831-839`).
- Create: `src/components/steps/{Household,Timing,Pension,Inheritance,Milestones,TravelLongevity,Advanced}.jsx` (`:447-495`, `:497-556`, `:558-580`, `:582-600`, `:602-648`, `:650-700`, `:703-738`).
- Modify: `RetirementCalculator.jsx`.

**Interfaces:**

- Result panels consume `steady`/`sFull`/`sTrust`/`sNone`/`simSS`/`simNo` slices (read-only) — pass the exact objects already used at each site.
- Step panels consume `{ s, set, setProp }` (the existing setter helpers) plus any local options arrays; move those arrays alongside their step. Each step is `Step({ s, set, setProp })`.

- [ ] **Step 1:** Move each block verbatim; for steps, thread `{ s, set, setProp }`; for results, thread the same derived objects used at the original site. Add theme/atom imports.
- [ ] **Step 2:** Replace original sites with the components; the root's input panel becomes a list of `<Household .../> <Timing .../> ...`.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS.
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract result panels and input steps"`

### Task 11b: Extract `usePlan` / `useMonteCarlo` hooks and slim the root

**Files:**

- Create: `src/hooks/usePlan.js` (wrap `useMemo(() => calculatePlan(s), [s])` + derived arrays `compRows/balRows/invRows/locRows/incomeStack`), `src/hooks/useMonteCarlo.js` (the worker lifecycle).
- Modify: `RetirementCalculator.jsx` (consume hooks; target ≤ ~250 lines).

**Interfaces:**

- `usePlan(s) -> { calc, compRows, balRows, invRows, locRows, incomeStack, ...destructured }`.
- `useMonteCarlo(s, enabled) -> { mc }`.

- [ ] **Step 1:** Move the `calc` memo + derived-array `useMemo`s into `usePlan`; move the MC worker `useEffect`/state into `useMonteCarlo`. Keep identical inputs/outputs.
- [ ] **Step 2:** Consume both hooks in the root.
- [ ] **Step 3:** Run `pnpm test && pnpm lint` → PASS.
- [ ] **Step 4:** Commit: `git commit -m "refactor(ui): extract usePlan/useMonteCarlo hooks; slim composition root"`

---

## PHASE 0D — Define engine seams (behavior-preserving)

### Task 12: Recompose `spendingNeed` into named components

**Files:**

- Create: `src/finance/seams.js`
- Modify: `src/finance/simulate.js:66-97`; `src/calculatorCore.js` (re-export).
- Test: `src/calculatorCore.test.js` (Task 2 contract guards this).

**Interfaces:**

- Produces:
  - `spendingComponents(i, ageA, ageB, ctx) -> { nonHousingBase, healthcare, housing, lifestyleSteps, events }` where in Wave 0 `housing`, `lifestyleSteps`, and `events` (the smile/step/housing seams) default to `0` and `nonHousingBase`+`healthcare` reproduce today's location/income logic exactly.
  - `composeNeed(parts, liveSav) -> Math.max(0.35 * base, base - liveSav)` where `base = nonHousingBase + healthcare + housing + lifestyleSteps + events`.
  - `spendingNeed` keeps its current public signature and now delegates to these — output must be numerically identical.

- [ ] **Step 1: Write the seam (extract today's logic, no behavior change)**

In `src/finance/seams.js`, implement `spendingComponents` by lifting the exact location-basis and income-basis math from `simulate.js:74-96`, returning the parts split as above (healthcare separated from living/base; housing/lifestyleSteps/events = 0 for now). Implement `composeNeed`.

- [ ] **Step 2: Delegate from `spendingNeed`**

Rewrite `spendingNeed` body (`:66-97`) to call `spendingComponents` + `composeNeed`. Keep the survivor-age and floor semantics identical.

- [ ] **Step 3: Run the contract + full suite**

Run: `pnpm test`
Expected: PASS — Task 2's location-basis contract and all existing spendingNeed/plan tests stay green (numerically identical).

- [ ] **Step 4: Re-export and commit**

Add `spendingComponents`, `composeNeed` to `src/calculatorCore.js` re-exports.

```bash
git add src/finance/seams.js src/finance/simulate.js src/calculatorCore.js
git commit -m "refactor(engine): recompose spendingNeed into composable seam (no behavior change)"
```

### Task 13: Add the return-model seam

**Files:**

- Modify: `src/finance/seams.js`, `src/finance/simulate.js` (the `yearReturn` selection site near `:104+`), `src/calculatorCore.js`.
- Test: `src/calculatorCore.test.js`.

**Interfaces:**

- Produces: `yearReturn(i, y, ssOpt) -> number` that reproduces today's resolution order exactly: `ssOpt.returns[y]` if present, else stress schedule if `ssOpt.stress`, else `i.realReturn`. Wave 1 B1 swaps the body for preset/variability/glidepath without touching `simulate.js`.

- [ ] **Step 1: Write the failing test**

```js
// append to src/calculatorCore.test.js
import { yearReturn } from "./calculatorCore.js";
describe("yearReturn seam", () => {
  const i = { realReturn: 0.05 };
  it("prefers an injected return path", () => {
    expect(yearReturn(i, 2, { returns: [0.1, 0.2, 0.3] })).toBeCloseTo(0.3, 6);
  });
  it("applies the stress schedule when stress is set", () => {
    expect(yearReturn(i, 0, { stress: true })).toBeCloseTo(-0.1, 6); // STRESS_EARLY_DROP
  });
  it("falls back to the central real return", () => {
    expect(yearReturn(i, 10, {})).toBeCloseTo(0.05, 6);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- -t "yearReturn seam"`
Expected: FAIL ("yearReturn is not a function").

- [ ] **Step 3: Implement the seam**

In `seams.js`, implement `yearReturn(i, y, ssOpt)` lifting the exact expression currently inline in `simulate.js` (using `stressReturnForYear`). Replace the inline expression in `simulate.js` with a call to it. Re-export from `calculatorCore.js`.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: PASS (new seam test + all existing simulate/MC tests numerically identical).

- [ ] **Step 5: Commit**

```bash
git add src/finance/seams.js src/finance/simulate.js src/calculatorCore.js src/calculatorCore.test.js
git commit -m "refactor(engine): add yearReturn seam (no behavior change)"
```

### Task 14: Wave gate — full check + plan reconciliation

**Files:**

- Modify: `docs/superpowers/specs/2026-06-21-two-arcs-roadmap-design.md` (tick Wave 0 done; note any seam deltas discovered).

- [ ] **Step 1: Run the full gate**

Run: `pnpm check`
Expected: lint + typecheck + markdown lint + links + test all PASS.

- [ ] **Step 2: Confirm root size**

Run: `wc -l RetirementCalculator.jsx`
Expected: substantially reduced (target ≤ ~250 lines). If not, note which panels remain inline as a follow-up — do not force-split if a panel is genuinely intertwined with state.

- [ ] **Step 3: Commit the wave close-out**

```bash
git add docs/superpowers/specs/2026-06-21-two-arcs-roadmap-design.md
git commit -m "docs(spec): close out Wave 0 foundation"
```

---

## Self-review notes (author)

- **Spec coverage:** 0C → Tasks 1–4; 0A → Tasks 5–6; 0B → Tasks 7–11b; 0D → Tasks 12–13; wave gate → Task 14. All four Wave-0 sub-items covered.
- **Behavior preservation:** every 0A/0B/0D task gates on the existing 178 tests staying green; 0D adds explicit seam contract tests.
- **Type consistency:** `spendingComponents`/`composeNeed`/`yearReturn`/`spendingNeed` signatures are used identically across Tasks 2, 12, 13. Component prop names (`compRows`, `invRows`, `balRows`, `locRows`, `incomeStack`) match the derived-array names from `usePlan` (Task 11b).
- **Downstream readiness:** the `housing`/`lifestyleSteps`/`events` zero-defaults in `spendingComponents` and the swappable `yearReturn` body are the exact attach points Wave 1 (B1, C1, C2, C3) and Wave 2 (housing) plug into without editing `simulate.js`.
