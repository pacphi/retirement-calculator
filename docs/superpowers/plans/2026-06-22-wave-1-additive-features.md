# Wave 1 — Additive Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the seven additive Wave 1 features — B1 return presets + variability-by-default, B2 sequence-stress toggle, C1 spending smile, C2 lifestyle steps, C3 typed/emergent events, A3 accumulation summary, E1 live headroom — each as its own `finance/*` module + tests + UI component, attaching to the existing Wave 0 seams without rewriting `simulate.js`'s loop.

**Architecture:** A single serial **foundation task** lands all append-only constants, new state fields, `buildPlanInputs` defaults, and the one ctx-threading edit to `simulate.js` (so later tasks edit only `seams.js`, never the loop). Then features develop in four parallel worktree **groups** whose new modules and UI components are disjoint; within a group, tasks that touch the same shared panel are serialized. The composition root (`RetirementCalculator.jsx`) is the only file every task appends to — the controller merges those additive JSX blocks sequentially as each task lands.

**Tech Stack:** React 19, Vite, Vitest 4 + @testing-library/react 16, Recharts 3, pure ES-module finance engine under `src/finance/**` re-exported by `src/calculatorCore.js`.

## Decisions baked in (change before execution if you disagree)

1. **B1 variability band = auto-run Monte Carlo, debounced** (~400 ms after inputs settle). The deterministic projection is untouched; MC stays seeded (`MC_DEFAULTS.seed`). `volatility` is promoted to editable state and passed into `mcOpt`. _(Confirmed.)_
2. **New controls placement:** a new **"Retirement spending"** step owns the smile (C1) + lifestyle steps (C2); **return preset + variability + sequence-stress toggle** (B1/B2) live in the existing **Advanced** step. _(Confirmed.)_
3. **Smile anchor (C1):** keyed to person A's retirement age `retireAgeA = max(stopA, stopB + (ageA − ageB))`; multiplier is `1` until `ageA ≥ retireAgeA` (the "gate on not working" proxy). Scales the non-housing base only; healthcare is added on top. Defaults to `mode:"flat"` → byte-identical to today.
4. **E1 reuses C2's mechanism (DRY):** headroom binary-searches a single `lifestyleSteps` entry from the current year, so E1 is sequenced **after** C2 rather than adding a parallel `spendDelta` engine input.
5. **C3 emergent events:** baseline simulation **excludes** events flagged `emergent`; a new `simShock` scenario includes them. Existing default events carry no `emergent`/`type`, so baseline numbers are unchanged.

## Global Constraints

- **Real-dollar consistency.** No new nominal flow this wave; engine stays seedless and date-free. (Spec §3.1, §3.3.) All Wave 1 amounts (smile, lifestyle deltas, event amounts) are today's dollars.
- **One federal tax engine.** Do not fork `calculateFederalTaxYear`. (Spec §3.2.)
- **Determinism.** All randomness stays in `monteCarlo.js` behind the fixed seed. Auto-running MC (B1) is debounced and must not leak into the deterministic snapshot the tests assert on. (Spec §3.3.)
- **Planning-grade honesty.** Every new assumption gets a dated, source-linked constant in `src/retirementData.js` and an in-app caption. (Spec §3.4.)
- **Tests + docs lockstep.** Each engine change updates a test in the same commit; each new control gets an accessible-label check in `RetirementCalculator.test.jsx`; `docs/prd.md` and `docs/use-cases.md` are reconciled. (Spec §3.5.)
- **Backward compatibility.** New state fields default to off/flat so the existing 192-test suite stays green at every commit. New `buildPlanInputs` defaults must make a bare state object (as used by `calculatorCore.test.js`) behave exactly as before.
- **No attribution trailer** in commits (project `.claude/settings.json` opts out).
- **Wave gate:** `pnpm lint && pnpm lint:md && pnpm typecheck && pnpm test && pnpm build && pnpm links` all green before the wave is done. Per-task gate is `pnpm test` + `pnpm lint`.
- **Theme:** all new UI uses tokens from `src/components/theme.js` (brass `#B5852C` / viridian `#1E7A5E` / clay `#BE4A2B`; Inter / Newsreader / JetBrains Mono). Keep disclaimers + source links visible.

---

## File structure (created/modified this wave)

**Foundation (Task 1):**

- Modify: `src/retirementData.js` — append `RETURN_PRESETS`, `DEFAULT_RETURN_PRESET`, `DEFAULT_VOLATILITY`, `SMILE_DEFAULTS`, and new `SOURCES` entries.
- Modify: `RetirementCalculator.jsx` — add new state fields to the initial `useState`.
- Modify: `src/finance/plan.js` — default the new fields in `buildPlanInputs`.
- Modify: `src/finance/simulate.js` — pass `{ retireAgeA, cal }` ctx into `spendingNeed` (no behavior change).
- Modify: `src/finance/seams.js` — `spendingComponents`/`spendingNeed` accept the extended ctx (ignored until C1/C2).
- Modify: `src/finance/plan.test.js` (create if absent) — assert new defaults; numeric-identity guard.

**Group A — returns visualization (shared: `LongRun.jsx`, `Headline.jsx`):**

- Create: `src/finance/returns.js` + `src/finance/returns.test.js` — `resolveReturn(preset, custom)`.
- Modify: `src/finance/plan.js` — derive `realReturn` via `resolveReturn`.
- Modify: `src/hooks/useMonteCarlo.js` — debounced auto-run; `volatility` from state.
- Modify: `src/components/steps/Advanced.jsx` — preset Segmented + variability slider (B1); stress toggle (B2).
- Modify: `src/components/charts/LongRun.jsx` — p10–p90 ribbon by default (B1); labeled stress line gated on `showStress` (B2).
- Modify: `src/components/results/Headline.jsx` — median + 10th–90th range by default (B1).

**Group B — spending need (shared: `seams.js`; new step `SpendingStrategy.jsx`):**

- Create: `src/finance/spending/smile.js` + `src/finance/spending/smile.test.js` (C1).
- Create: `src/finance/spending/lifestyle.js` + `src/finance/spending/lifestyle.test.js` (C2).
- Create: `src/finance/headroom.js` + `src/finance/headroom.test.js` (E1).
- Modify: `src/finance/seams.js` — smile scales `nonHousingBase` (C1); `lifestyleSteps` slot filled (C2).
- Create: `src/components/steps/SpendingStrategy.jsx` — smile Segmented + lifestyle step rows.
- Create: `src/components/results/HeadroomCard.jsx` (E1).
- Modify: `src/components/charts/Staircase.jsx` — smile caption (C1).

**Group C — events (shared: `events.js`, `plan.js`, `Milestones.jsx`):**

- Modify: `src/finance/events.js` — typed events + emergent flag + windfall netting (C3).
- Modify: `src/finance/events.test.js` (create if absent) — typing/emergent/windfall tests.
- Modify: `src/finance/plan.js` — `simShock` scenario.
- Modify: `src/components/steps/Milestones.jsx` — type select + emergent toggle.

**Group D — accumulation read-out (near-disjoint):**

- Create: `src/finance/accumulation.js` + `src/finance/accumulation.test.js` (A3).
- Create: `src/components/results/AccumulationSummary.jsx` (A3).

**Integration (every feature task, last steps):**

- Modify: `RetirementCalculator.jsx` — wire each new component + state setters (additive blocks).

**Docs (Task 9):**

- Modify: `docs/prd.md`, `docs/use-cases.md` — reconcile FR list + scenarios with the seven new controls.

---

## Execution order & parallelization

```text
Task 1 (Foundation) ── serial, unblocks all
   │
   ├── Group A:  Task 2 (B1) → Task 3 (B2)         [share LongRun + Headline]
   ├── Group B:  Task 4 (C1) → Task 5 (C2) → Task 8 (E1)  [share seams.js; E1 reuses C2]
   ├── Group C:  Task 6 (C3)                        [events.js, plan.js, Milestones]
   └── Group D:  Task 7 (A3)                         [new files + root]
   │
Task 9 (Docs reconciliation + wave gate) ── serial, after all groups
Final whole-branch review (opus)
```

Groups A/B/C/D run in parallel `git worktree`s. Within a group, tasks are serial (shared panel). The composition root is merged by the controller after each task's review. Model routing: transcription/mechanical → haiku; module+integration → sonnet; final whole-branch review → opus.

---

## PHASE 1 — Foundation

### Task 1: Constants, state, plan defaults, ctx threading

**Files:**

- Modify: `src/retirementData.js` (append after `MC_DEFAULTS` and inside `SOURCES`)
- Modify: `RetirementCalculator.jsx:45-62` (initial state)
- Modify: `src/finance/plan.js:46-75` (`buildPlanInputs`)
- Modify: `src/finance/simulate.js:96-140` (ctx into `spendingNeed`)
- Modify: `src/finance/seams.js:55,61` (`spendingComponents`/`spendingNeed` signatures)
- Create: `src/finance/plan.test.js`

**Interfaces:**

- Produces: `RETURN_PRESETS: { conservative|balanced|growth: { label, realReturn } }`, `DEFAULT_RETURN_PRESET = "balanced"`, `DEFAULT_VOLATILITY = 0.12`, `SMILE_DEFAULTS = { earlyDecline, upturnAge, lateUpturn, floor }`.
- Produces: state fields `returnPreset`, `volatility`, `showStress`, `spendingShape: { mode, earlyDecline, upturnAge, lateUpturn }`, `lifestyleSteps: []`.
- Produces: `buildPlanInputs` output now always carries `spendingShape`, `lifestyleSteps`, `volatility`, `returnPreset`.
- Produces: `spendingComponents(i, ageA, ageB, ctx)` and `spendingNeed(i, ageA, ageB, liveSav, isSurvivor, survivorAge, ctx)` where `ctx` gains optional `{ retireAgeA, cal }` (ignored this task).

- [ ] **Step 1: Write the failing test**

```js
// src/finance/plan.test.js
import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { RETURN_PRESETS, SMILE_DEFAULTS } from "../retirementData.js";

const bareState = {
  ageA: 57, ageB: 48, stopA: 65, stopB: 56, claimA: 65, claimB: 65, pensionAge: 65,
  incomeA: 0, incomeB: 170000, savings: 670000, contrib: 18000, targetPct: 0.4, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 50424, ssFraB: 31592,
  pensionOn: true, plan: 3, pYears: 22, afc: 170000,
  realReturn: 0.05, swr: 0.04, tradFrac: 0.7, inflation: 0.025,
  ssMode: "trustees", ssHaircut: 81, ssCutYear: 2034,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("buildPlanInputs Wave 1 defaults", () => {
  it("defaults spendingShape to flat and lifestyleSteps to empty for a bare state", () => {
    const inp = buildPlanInputs(bareState);
    expect(inp.spendingShape).toEqual({ mode: "flat" });
    expect(inp.lifestyleSteps).toEqual([]);
    expect(inp.volatility).toBe(0.12);
  });

  it("constants exist and are source-bracketed", () => {
    expect(RETURN_PRESETS.balanced.realReturn).toBe(0.05);
    expect(SMILE_DEFAULTS.upturnAge).toBe(85);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/finance/plan.test.js`
Expected: FAIL — `inp.spendingShape` is `undefined`; `RETURN_PRESETS` not exported.

- [ ] **Step 3: Append constants + sources to `src/retirementData.js`**

```js
// --- Wave 1 constants ---------------------------------------------------------

// Return presets: central real return anchored to long-run 60/40-style history.
// A diversified 60/40 portfolio has historically delivered ~5% real over long
// horizons, with meaningful dispersion (Japan ~3% real; US higher). The presets
// bracket that empirical range. Sources: SOURCES.cfa6040, SOURCES.carson6040.
export const RETURN_PRESETS = {
  conservative: { label: "Conservative", realReturn: 0.035 },
  balanced: { label: "Balanced", realReturn: 0.05 },
  growth: { label: "Growth", realReturn: 0.065 },
};
export const DEFAULT_RETURN_PRESET = "balanced";
export const DEFAULT_VOLATILITY = MC_DEFAULTS.volatility; // 0.12

// Retirement spending smile (Blanchett). Real discretionary spending declines
// through the go-go/slow-go years — roughly a 25% real decline by the mid-80s —
// then drifts back up late as healthcare rises. Defaults: ~1%/yr early real
// decline, a 0.75 floor (≈ the 25% trough), late-life upturn from age 85.
// Sources: SOURCES.smileRR, SOURCES.smileKitces, SOURCES.blanchett2026.
export const SMILE_DEFAULTS = { earlyDecline: 0.01, upturnAge: 85, lateUpturn: 0.01, floor: 0.75 };
```

And add inside the existing `SOURCES` object:

```js
  cfa6040: "https://rpc.cfainstitute.org/research/reports/2025/performance-of-the-60-40-portfolio",
  carson6040: "https://www.carsongroup.com/insights/blog/the-60-40-portfolio-a-historical-powerhouse-or-a-rate-dependent-misinterpretation/",
  smileRR: "https://retirementresearcher.com/retirement-spending-smile/",
  smileKitces: "https://www.kitces.com/blog/estimating-changes-in-retirement-expenditures-and-the-retirement-spending-smile/",
  blanchett2026: "https://onlinelibrary.wiley.com/doi/full/10.1002/cfp2.70032",
```

- [ ] **Step 4: Add new state fields in `RetirementCalculator.jsx`**

Insert into the initial `useState({...})` object (after `horizonAge: 95, stateRate: null,`):

```js
    returnPreset: "balanced", volatility: 0.12, showStress: false,
    spendingShape: { mode: "flat", earlyDecline: 0.01, upturnAge: 85, lateUpturn: 0.01 },
    lifestyleSteps: [],
```

- [ ] **Step 5: Default the fields in `buildPlanInputs` (`src/finance/plan.js`)**

Add these keys to the object returned by `buildPlanInputs` (after the `life:` line):

```js
    returnPreset: s.returnPreset ?? "custom",
    volatility: (s.volatility != null && s.volatility !== "") ? Number(s.volatility) : 0.12,
    spendingShape: s.spendingShape ?? { mode: "flat" },
    lifestyleSteps: s.lifestyleSteps ?? [],
```

- [ ] **Step 6: Thread ctx through `simulate.js` and `seams.js` (no behavior change)**

In `src/finance/simulate.js`, before the loop add `const retireAgeA = Math.max(i.stopA, i.stopB + (i.ageA - i.ageB));` and change the `need` line (currently `simulate.js:140`) to:

```js
    const need = spendingNeed(i, aA, aB, liveSav, isSurvivor, survAge, { retireAgeA, cal }) + extraSpend;
```

In `src/finance/simulate.js`, change `spendingNeed` to forward ctx:

```js
export function spendingNeed(i, ageA, ageB, liveSav = 0, isSurvivor = false, survivorAge = null, ctx = {}) {
  const parts = spendingComponents(i, ageA, ageB, { isSurvivor, survivorAge, ...ctx });
  return composeNeed(parts, liveSav);
}
```

In `src/finance/seams.js`, change the `spendingComponents` destructure to accept (and ignore for now) the new ctx keys:

```js
  const { isSurvivor = false, survivorAge = null, retireAgeA = Infinity, cal = null } = ctx;
```

(`retireAgeA`/`cal` are unused until C1/C2; defaulting `retireAgeA` to `Infinity` keeps any future smile multiplier at 1.)

- [ ] **Step 7: Run the new test + full suite**

Run: `pnpm test -- src/finance/plan.test.js && pnpm test`
Expected: new test PASS; all 192 prior tests still PASS (no numeric change).

- [ ] **Step 8: Lint + commit**

```bash
pnpm lint
git add src/retirementData.js RetirementCalculator.jsx src/finance/plan.js src/finance/simulate.js src/finance/seams.js src/finance/plan.test.js
git commit -m "feat(wave1): foundation — Wave 1 constants, state fields, plan defaults, seam ctx threading"
```

---

## PHASE 2 — Group A: returns + variability (B1 → B2)

### Task 2: B1 — return presets + variability band (auto-MC)

**Files:**

- Create: `src/finance/returns.js`
- Create: `src/finance/returns.test.js`
- Modify: `src/finance/plan.js` (derive `realReturn`)
- Modify: `src/calculatorCore.js` (re-export `resolveReturn`)
- Modify: `src/hooks/useMonteCarlo.js` (debounced auto-run; volatility)
- Modify: `src/components/steps/Advanced.jsx` (preset + variability controls)
- Modify: `src/components/charts/LongRun.jsx` (p10–p90 ribbon default)
- Modify: `src/components/results/Headline.jsx` (range default)
- Modify: `RetirementCalculator.jsx` (wire setters)
- Modify: `RetirementCalculator.test.jsx` (accessible-label checks)

**Interfaces:**

- Consumes: `RETURN_PRESETS`, `DEFAULT_VOLATILITY` (Task 1); `MC_DEFAULTS`; `mc.balanceFan` (p10/p50/p90 series, already produced by `monteCarlo.js`).
- Produces: `resolveReturn(preset: string, custom: number) -> number`. When `preset` is a known key, returns its `realReturn`; otherwise `Number(custom) || 0`.

- [ ] **Step 1: Write the failing engine test**

```js
// src/finance/returns.test.js
import { describe, expect, it } from "vitest";
import { resolveReturn } from "./returns.js";

describe("resolveReturn", () => {
  it("maps a known preset to its central real return", () => {
    expect(resolveReturn("balanced")).toBe(0.05);
    expect(resolveReturn("conservative")).toBe(0.035);
    expect(resolveReturn("growth")).toBe(0.065);
  });
  it("falls back to the custom value for 'custom' or unknown presets", () => {
    expect(resolveReturn("custom", 0.042)).toBe(0.042);
    expect(resolveReturn(undefined, 0.05)).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/returns.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/finance/returns.js`**

```js
import { RETURN_PRESETS } from "../retirementData.js";

/**
 * Resolve the central real return. A known preset key wins; otherwise the
 * caller's custom numeric value is used. Wave 3 extends this module with
 * glidepath/blend; Wave 1 only resolves the preset → central rate.
 *
 * @param {string} preset  - "conservative" | "balanced" | "growth" | "custom"
 * @param {number} custom  - user's custom real return (used when preset unknown)
 * @returns {number}
 */
export function resolveReturn(preset, custom) {
  if (preset && RETURN_PRESETS[preset]) return RETURN_PRESETS[preset].realReturn;
  return Number(custom) || 0;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/returns.test.js`
Expected: PASS.

- [ ] **Step 5: Wire `resolveReturn` into `buildPlanInputs`**

In `src/finance/plan.js`, import `resolveReturn` and `RETURN_PRESETS` and override `realReturn` in the returned object (after the spread):

```js
import { resolveReturn } from "./returns.js";
// ...inside buildPlanInputs return, after ...s spread:
    realReturn: resolveReturn(s.returnPreset, s.realReturn),
```

Re-export in `src/calculatorCore.js`: add `export { resolveReturn } from "./finance/returns.js";` near the other finance re-exports.

- [ ] **Step 6: Add a regression test — preset drives the deterministic projection**

```js
// append to src/finance/plan.test.js
import { calculatePlan } from "./plan.js";
it("returnPreset overrides realReturn deterministically", () => {
  const grow = calculatePlan({ ...bareState, returnPreset: "growth", realReturn: 0.01 });
  const cons = calculatePlan({ ...bareState, returnPreset: "conservative", realReturn: 0.09 });
  // growth (6.5%) ends with a larger terminal balance than conservative (3.5%),
  // ignoring the bogus custom realReturn entirely.
  const last = (sim) => sim.rows[sim.rows.length - 1].bal;
  expect(last(grow.simFull)).toBeGreaterThan(last(cons.simFull));
});
```

Run: `pnpm test -- src/finance/plan.test.js` → PASS.

- [ ] **Step 7: Debounced auto-MC in `useMonteCarlo.js`**

Replace the body of `useMonteCarlo` so MC auto-runs (debounced) when state settles, and `volatility` comes from state. Keep `runMc` for the manual button.

```js
import { useState, useRef, useEffect } from "react";
import { MC_DEFAULTS } from "../retirementData.js";

export function useMonteCarlo(s) {
  const [mc, setMc] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../finance/mcWorker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = (e) => {
      if (e.data?.type === "mc-result") {
        setMc(e.data.result);
        setMcRunning(false);
      }
    };
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  const post = () => {
    if (!workerRef.current) return;
    setMcRunning(true);
    const volatility = (s.volatility != null && s.volatility !== "")
      ? Number(s.volatility) : MC_DEFAULTS.volatility;
    workerRef.current.postMessage({ state: s, mcOpt: { ...MC_DEFAULTS, volatility } });
  };

  const runMc = () => { setMc(null); post(); };

  // Variability-by-default: re-run MC on a debounce whenever inputs settle. The
  // deterministic projection is independent of this; MC stays seeded.
  useEffect(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") return;
    const id = setTimeout(post, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  return { mc, mcRunning, runMc };
}
```

(In jsdom the worker never posts back, so `mc` stays `null` and existing RTL tests see the pre-MC UI — determinism preserved.)

- [ ] **Step 8: Add B1 controls to `Advanced.jsx`**

Add a preset `Segmented` and a variability slider, using existing atoms and theme. Accessible labels: "Return assumption", "Variability". Include a one-line source caption.

```jsx
// inside Advanced, using imported { Segmented, Field, NumberInput } and { C, SRC }
<Field label="Return assumption">
  <Segmented
    value={s.returnPreset}
    onChange={set("returnPreset")}
    options={[
      { value: "conservative", label: "Conservative ~3.5%" },
      { value: "balanced", label: "Balanced ~5%" },
      { value: "growth", label: "Growth ~6.5%" },
      { value: "custom", label: "Custom" },
    ]}
  />
</Field>
{s.returnPreset === "custom" && (
  <Field label="Custom real return (%/yr)">
    <NumberInput value={Math.round(s.realReturn * 1000) / 10}
      onChange={(v) => set("realReturn")((Number(v) || 0) / 100)} step={0.1} />
  </Field>
)}
<Field label="Variability (±%/yr)" hint="Return volatility used for the range band">
  <NumberInput value={Math.round(s.volatility * 100)}
    onChange={(v) => set("volatility")((Number(v) || 0) / 100)} step={1} min={0} max={30} />
</Field>
<p style={{ fontSize: 11, color: C.mut, lineHeight: 1.5, margin: "4px 0 10px" }}>
  Central return anchored to long-run 60/40 history (~5% real, with dispersion);
  the band is a Monte Carlo p10–p90 fan. <a href={SRC.cfa6040 ?? "https://rpc.cfainstitute.org/research/reports/2025/performance-of-the-60-40-portfolio"} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>Source</a>.
</p>
```

(Match the actual prop names of the existing `Segmented`/`Field`/`NumberInput` atoms — read `src/components/atoms/index.jsx` first; adapt the JSX above to their real signatures. Read `src/components/steps/Advanced.jsx` to slot this in the right place.)

- [ ] **Step 9: LongRun p10–p90 ribbon by default + Headline range**

In `src/components/charts/LongRun.jsx`, render a shaded p10–p90 `Area` behind the deterministic line whenever `mc?.balanceFan` exists (it already may — read the file; if the ribbon is gated behind a "run" click, ungate it so it shows whenever `mc` is present). In `src/components/results/Headline.jsx`, the median + 10th–90th text already renders when `mc` is present — confirm and keep it as the default (no click gate).

- [ ] **Step 10: Wire setters in the composition root + RTL test**

`RetirementCalculator.jsx` already passes `s`/`set` into `Advanced` and `mc` into `LongRun`/`Headline`; confirm no new wiring needed beyond the new state fields (added in Task 1). Add accessible-label checks:

```jsx
// in RetirementCalculator.test.jsx
it("exposes the return preset and variability controls", () => {
  render(<RetirementCalculator />);
  expect(screen.getByText(/Return assumption/i)).toBeInTheDocument();
  expect(screen.getByText(/Variability/i)).toBeInTheDocument();
});
```

(Open the Advanced panel first if it is collapsed by default — replicate the existing test idiom that toggles `adv`.)

- [ ] **Step 11: Gate + commit**

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): B1 return presets + variability-by-default (auto-MC band)"
```

### Task 3: B2 — sequence-of-returns stress toggle

**Files:**

- Modify: `src/components/charts/LongRun.jsx` (label stress line; gate on `showStress`)
- Modify: `src/components/steps/Advanced.jsx` (toggle)
- Modify: `RetirementCalculator.jsx` (pass `showStress`)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `s.showStress` (Task 1), `balRows[].stress` (already produced by `usePlan`), `stressReturnForYear` (already in `seams.js`).
- Produces: no new engine surface — `simStress` already computed in `calculatePlan`.

- [ ] **Step 1: Write the failing RTL test**

```jsx
// RetirementCalculator.test.jsx
it("exposes a sequence-of-returns stress toggle", () => {
  render(<RetirementCalculator />);
  // open Advanced if needed (reuse existing idiom)
  expect(screen.getByLabelText(/bad first decade|sequence stress/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- RetirementCalculator.test.jsx -t "stress toggle"`
Expected: FAIL — no such control.

- [ ] **Step 3: Add the toggle in `Advanced.jsx`**

```jsx
<Field label="Sequence stress">
  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
    <input type="checkbox" aria-label="Bad first decade (sequence stress)"
      checked={!!s.showStress} onChange={(e) => set("showStress")(e.target.checked)} />
    Show a "bad first decade" return path on the long-run chart
  </label>
</Field>
```

- [ ] **Step 4: Gate + label the stress line in `LongRun.jsx`**

Pass `showStress` into `LongRun` from the root, render the `stress` series `Line` only when `showStress`, and give it a legend label "Bad first decade (−10% early)". Read `LongRun.jsx` to match its existing `Line`/legend pattern. In `RetirementCalculator.jsx` add `showStress={s.showStress}` to the `<LongRun .../>` props.

- [ ] **Step 5: Run + verify pass**

Run: `pnpm test -- RetirementCalculator.test.jsx`
Expected: PASS.

- [ ] **Step 6: Gate + commit**

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): B2 surface the sequence-of-returns stress path as a labeled toggle"
```

---

## PHASE 3 — Group B: spending need (C1 → C2 → E1)

### Task 4: C1 — spending smile

**Files:**

- Create: `src/finance/spending/smile.js`
- Create: `src/finance/spending/smile.test.js`
- Modify: `src/finance/seams.js` (scale `nonHousingBase`)
- Modify: `src/calculatorCore.js` (re-export `smileMultiplier`)
- Create: `src/components/steps/SpendingStrategy.jsx`
- Modify: `src/components/charts/Staircase.jsx` (caption)
- Modify: `RetirementCalculator.jsx` (mount step)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `SMILE_DEFAULTS` (Task 1); `ctx.retireAgeA`, `ageA` in `spendingComponents`; `i.spendingShape`.
- Produces: `smileMultiplier(age: number, retireAge: number, shape: { mode, earlyDecline, upturnAge, lateUpturn }) -> number` in `[shape.floor, 1]`-ish range. Returns `1` when `mode === "flat"` or `age < retireAge`.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/spending/smile.test.js
import { describe, expect, it } from "vitest";
import { smileMultiplier } from "./smile.js";

const shape = { mode: "smile", earlyDecline: 0.01, upturnAge: 85, lateUpturn: 0.01 };

describe("smileMultiplier", () => {
  it("is 1 while working or when flat", () => {
    expect(smileMultiplier(60, 65, shape)).toBe(1);                 // pre-retirement
    expect(smileMultiplier(80, 65, { mode: "flat" })).toBe(1);      // flat mode
  });
  it("declines ~1%/yr through the go-go/slow-go years", () => {
    expect(smileMultiplier(65, 65, shape)).toBeCloseTo(1, 6);       // year 0
    expect(smileMultiplier(75, 65, shape)).toBeCloseTo(0.9, 6);     // -10% by 75
  });
  it("never falls below the floor", () => {
    expect(smileMultiplier(120, 65, shape)).toBeGreaterThanOrEqual(0.75);
  });
  it("drifts back up after the upturn age", () => {
    const trough = smileMultiplier(85, 65, shape);
    expect(smileMultiplier(90, 65, shape)).toBeGreaterThan(trough);
    expect(smileMultiplier(200, 65, shape)).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/spending/smile.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/finance/spending/smile.js`**

```js
import { SMILE_DEFAULTS } from "../../retirementData.js";

const num = (v, d) => (v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);

/**
 * Age-shaped real-spending multiplier (Blanchett "retirement spending smile").
 * 1 until retirement, then a real decline through the active years bottoming at
 * `floor`, with a late-life upturn from `upturnAge`. Pure and deterministic.
 *
 * @param {number} age       - person A's age in the projection year
 * @param {number} retireAge - person A's retirement age (smile anchor)
 * @param {{mode:string, earlyDecline?:number, upturnAge?:number, lateUpturn?:number}} shape
 * @returns {number}
 */
export function smileMultiplier(age, retireAge, shape) {
  if (!shape || shape.mode === "flat" || age < retireAge) return 1;
  const decline = num(shape.earlyDecline, SMILE_DEFAULTS.earlyDecline);
  const upturnAge = num(shape.upturnAge, SMILE_DEFAULTS.upturnAge);
  const lateUpturn = num(shape.lateUpturn, SMILE_DEFAULTS.lateUpturn);
  const floor = SMILE_DEFAULTS.floor;
  if (age < upturnAge) {
    return Math.max(floor, 1 - decline * (age - retireAge));
  }
  const trough = Math.max(floor, 1 - decline * (upturnAge - retireAge));
  return Math.min(1, trough + lateUpturn * (age - upturnAge));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/spending/smile.test.js`
Expected: PASS.

- [ ] **Step 5: Apply the smile inside `spendingComponents` (`seams.js`)**

Import at top of `seams.js`: `import { smileMultiplier } from "./spending/smile.js";`

In **both** bases, scale the non-housing base (and let `_floorBase` track the scaled value). For the LOCATION basis:

```js
    const smile = smileMultiplier(ageA, retireAgeA, i.spendingShape);
    const nonHousingBase = livingMo * 12 * scale * lifestyle * smile;
```

For the INCOME basis:

```js
    const smile = smileMultiplier(ageA, retireAgeA, i.spendingShape);
    const nonHousingBase = i.incomeHH * i.targetPct * smile;
```

`_floorBase` stays `nonHousingBase` (income) / `nonHousingBase + healthcare` (location), so the 0.35 floor scales with the actual base. Because `spendingShape` defaults to `{mode:"flat"}`, `smile === 1` and all 192 existing tests stay numerically identical.

- [ ] **Step 6: Add a characterization guard in `calculatorCore.test.js`**

```js
// in src/calculatorCore.test.js, near the location-basis seam contract block
it("spending smile scales the income base in retirement but not healthcare (C1)", () => {
  const base = { /* minimal income-basis inputs: incomeHH, targetPct, hcPre, hcPost, status */
    incomeHH: 200000, targetPct: 0.4, hcPre: 24000, hcPost: 12000, status: "married", spendBasis: "income" };
  const flat = spendingNeed({ ...base, spendingShape: { mode: "flat" } }, 75, 70, 0, false, null, { retireAgeA: 65 });
  const smiled = spendingNeed({ ...base, spendingShape: { mode: "smile", earlyDecline: 0.01, upturnAge: 85 } }, 75, 70, 0, false, null, { retireAgeA: 65 });
  expect(smiled).toBeLessThan(flat); // 10 years past retirement => ~10% lower base
});
```

(Import `spendingNeed` if not already imported in that file.)

Run: `pnpm test` → all green.

- [ ] **Step 7: Build `SpendingStrategy.jsx` (smile section)**

Create `src/components/steps/SpendingStrategy.jsx` with a `Section` titled "Retirement spending", a `Segmented` for `spendingShape.mode` ("Flat" / "Spending smile" / "Custom"), and — in custom — two `NumberInput`s (early decline %/yr, upturn age). Use `setProp("spendingShape", field)` for nested updates. Include a source caption citing `SRC.smileRR`/Blanchett. (Lifestyle-step rows are added in Task 5 — leave a clearly-marked insertion point.) Match existing step files (`src/components/steps/Advanced.jsx`) for structure, atoms, and theme.

Accessible labels: "Retirement spending", "Early real decline", "Late-life upturn age".

- [ ] **Step 8: Smile caption on the Staircase**

In `src/components/charts/Staircase.jsx`, when `spendingShape?.mode !== "flat"`, add one caption line under the chart: "Need line follows a retirement spending smile (Blanchett) — real spending eases through the active years, then rises late." Pass `spendingShape={s.spendingShape}` from the root into `Staircase`.

- [ ] **Step 9: Mount the step + RTL test**

In `RetirementCalculator.jsx`, import and render `<SpendingStrategy s={s} set={set} setProp={setProp} />` in the input panel (after `Milestones`). Add:

```jsx
it("exposes the retirement spending smile control", () => {
  render(<RetirementCalculator />);
  expect(screen.getByText(/Retirement spending/i)).toBeInTheDocument();
  expect(screen.getByText(/Spending smile/i)).toBeInTheDocument();
});
```

- [ ] **Step 10: Re-export + gate + commit**

Add `export { smileMultiplier } from "./finance/spending/smile.js";` to `src/calculatorCore.js`.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): C1 retirement spending smile (Blanchett) scaling the non-housing base"
```

### Task 5: C2 — lifestyle level + step-changes

**Files:**

- Create: `src/finance/spending/lifestyle.js`
- Create: `src/finance/spending/lifestyle.test.js`
- Modify: `src/finance/seams.js` (fill `lifestyleSteps` slot)
- Modify: `src/calculatorCore.js` (re-export)
- Modify: `src/components/steps/SpendingStrategy.jsx` (add/remove step rows)
- Modify: `RetirementCalculator.jsx` (add/remove handlers; `lifestyleSteps`)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `ctx.cal` in `spendingComponents`; `i.lifestyleSteps: [{ id, fromYear, deltaAnnual }]`.
- Produces: `lifestyleStepDelta(steps: Array<{fromYear:number, deltaAnnual:number, on?:boolean}>, cal: number) -> number` — sum of active step deltas (any step with `on !== false` and `fromYear <= cal`). Today's (real) dollars; permanent once active.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/spending/lifestyle.test.js
import { describe, expect, it } from "vitest";
import { lifestyleStepDelta } from "./lifestyle.js";

describe("lifestyleStepDelta", () => {
  const steps = [
    { id: "a", fromYear: 2030, deltaAnnual: 15000 },
    { id: "b", fromYear: 2040, deltaAnnual: -8000 },
  ];
  it("sums step deltas active by the calendar year", () => {
    expect(lifestyleStepDelta(steps, 2029)).toBe(0);
    expect(lifestyleStepDelta(steps, 2035)).toBe(15000);
    expect(lifestyleStepDelta(steps, 2041)).toBe(7000); // 15000 - 8000
  });
  it("ignores disabled steps and tolerates empty/undefined", () => {
    expect(lifestyleStepDelta([{ fromYear: 2030, deltaAnnual: 9000, on: false }], 2031)).toBe(0);
    expect(lifestyleStepDelta(undefined, 2031)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/spending/lifestyle.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `src/finance/spending/lifestyle.js`**

```js
/**
 * Sum of active lifestyle step deltas for a calendar year. A step turns on at
 * `fromYear` and is permanent thereafter. Deltas are today's (real) dollars and
 * may be negative (a step-down). Disabled steps (`on === false`) are skipped.
 *
 * @param {Array<{fromYear:number, deltaAnnual:number, on?:boolean}>} steps
 * @param {number} cal - calendar year
 * @returns {number}
 */
export function lifestyleStepDelta(steps, cal) {
  return (steps || []).reduce(
    (sum, st) =>
      st && st.on !== false && (Number(st.fromYear) || 0) <= cal
        ? sum + (Number(st.deltaAnnual) || 0)
        : sum,
    0,
  );
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/spending/lifestyle.test.js` → PASS.

- [ ] **Step 5: Fill the `lifestyleSteps` slot in `spendingComponents`**

Import in `seams.js`: `import { lifestyleStepDelta } from "./spending/lifestyle.js";`

In **both** bases, replace the returned `lifestyleSteps: 0` with:

```js
    lifestyleSteps: cal != null ? lifestyleStepDelta(i.lifestyleSteps, cal) : 0,
```

`composeNeed` already adds `lifestyleSteps` into `total`. The 0.35 floor uses `_floorBase` (the smile-scaled base) — lifestyle steps are discretionary and intentionally **not** part of the floor base, consistent with how healthcare-bump/events sit outside the income-basis floor. Default `lifestyleSteps: []` → 0 → no regression.

- [ ] **Step 6: Add a need-composition guard in `calculatorCore.test.js`**

```js
it("a lifestyle step raises the need once its year arrives (C2)", () => {
  const i = { incomeHH: 200000, targetPct: 0.4, hcPre: 24000, hcPost: 12000, status: "married",
    spendBasis: "income", spendingShape: { mode: "flat" },
    lifestyleSteps: [{ id: "x", fromYear: 2040, deltaAnnual: 12000 }] };
  const before = spendingNeed(i, 78, 70, 0, false, null, { retireAgeA: 65, cal: 2039 });
  const after = spendingNeed(i, 79, 71, 0, false, null, { retireAgeA: 65, cal: 2040 });
  expect(after - before).toBeCloseTo(12000, 6);
});
```

Run: `pnpm test` → green.

- [ ] **Step 7: Lifestyle-step rows in `SpendingStrategy.jsx`**

At the insertion point left in Task 4, add an "Add a lifestyle change" button and a list of rows (`fromYear` NumberInput • `deltaAnnual` NumberInput • remove button), mirroring the events add/remove idiom in `Milestones.jsx`. Use root-supplied `addLifestyleStep` / `removeLifestyleStep` / `setLifestyleStep` handlers.

- [ ] **Step 8: Add/remove handlers in the composition root**

In `RetirementCalculator.jsx`, mirror the `addEvent`/`removeEvent` pattern:

```js
const lifeSeq = useRef(0);
const addLifestyleStep = () =>
  set("lifestyleSteps")([...(s.lifestyleSteps || []), { id: `ls-${lifeSeq.current++}`, fromYear: 2040, deltaAnnual: 12000, on: true }]);
const removeLifestyleStep = (idx) => set("lifestyleSteps")(s.lifestyleSteps.filter((_, i) => i !== idx));
const setLifestyleStep = (idx, field) => (v) =>
  set("lifestyleSteps")(s.lifestyleSteps.map((st, i) => (i === idx ? { ...st, [field]: v } : st)));
```

Pass these into `SpendingStrategy`.

- [ ] **Step 9: RTL test**

```jsx
it("can add a lifestyle change row", () => {
  render(<RetirementCalculator />);
  const btn = screen.getByRole("button", { name: /add a lifestyle change/i });
  fireEvent.click(btn);
  expect(screen.getAllByLabelText(/lifestyle change amount|delta/i).length).toBeGreaterThan(0);
});
```

(Match the accessible labels you give the row inputs.)

- [ ] **Step 10: Re-export + gate + commit**

Add `export { lifestyleStepDelta } from "./finance/spending/lifestyle.js";` to `src/calculatorCore.js`.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): C2 lifestyle level + permanent step-changes in the spending need"
```

### Task 8: E1 — live headroom read-out

> Sequenced in Group B after C2 because it reuses the `lifestyleSteps` mechanism (Decision 4).

**Files:**

- Create: `src/finance/headroom.js`
- Create: `src/finance/headroom.test.js`
- Modify: `src/calculatorCore.js` (re-export)
- Modify: `src/hooks/usePlan.js` (compute `headroom`)
- Create: `src/components/results/HeadroomCard.jsx`
- Modify: `RetirementCalculator.jsx` (render card)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `simulate` (from `simulate.js`), `buildPlanInputs` output `inp`, `horizonAge`, the `lifestyleSteps` slot (C2).
- Produces: `spendingHeadroom(inp, simulate, horizonAge, ssOpt) -> { delta: number, depAge: number|null, lastsToHorizon: boolean }`. `delta` is the max additional uniform annual spend (today's dollars) that keeps the plan solvent to `horizonAge`; negative when the plan is already short.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/headroom.test.js
import { describe, expect, it } from "vitest";
import { buildPlanInputs } from "./plan.js";
import { simulate } from "./simulate.js";
import { spendingHeadroom } from "./headroom.js";

const richState = {
  ageA: 60, ageB: 60, stopA: 60, stopB: 60, claimA: 62, claimB: 62, pensionAge: 65,
  incomeA: 0, incomeB: 0, savings: 5000000, contrib: 0, targetPct: 0.4, status: "married",
  ssModeA: "statement", ssModeB: "statement", ssFraA: 0, ssFraB: 0,
  pensionOn: false, plan: 3, pYears: 0, afc: 0,
  realReturn: 0.04, swr: 0.04, tradFrac: 0.5, inflation: 0.025,
  ssMode: "full", ssHaircut: 100, ssCutYear: 9999,
  retireLoc: "Austria", spendBasis: "income", lifestyle: 100,
  tx: { on: false, value: 0, year: 2038, strategy: "rent" },
  at: { on: false, value: 0, year: 2040, strategy: "live" },
  horizonAge: 95, stateRate: null,
};

describe("spendingHeadroom", () => {
  it("reports positive headroom for a well-funded plan", () => {
    const inp = buildPlanInputs(richState);
    const h = spendingHeadroom(inp, simulate, 95, { haircut: 1, cutYear: 9999 });
    expect(h.delta).toBeGreaterThan(0);
    expect(h.lastsToHorizon).toBe(true);
  });
  it("reports a small/negative headroom for a thin plan", () => {
    const inp = buildPlanInputs({ ...richState, savings: 200000 });
    const h = spendingHeadroom(inp, simulate, 95, { haircut: 1, cutYear: 9999 });
    expect(h.delta).toBeLessThan(spendingHeadroom(buildPlanInputs(richState), simulate, 95, { haircut: 1, cutYear: 9999 }).delta);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/headroom.test.js` → FAIL.

- [ ] **Step 3: Implement `src/finance/headroom.js`**

```js
import { TAX_YEAR } from "../retirementData.js";

const lastsToHorizon = (inp, simulate, horizonAge, ssOpt) =>
  simulate(inp, ssOpt).depAge == null || simulate(inp, ssOpt).depAge >= horizonAge;

/**
 * Maximum additional uniform annual spend (today's dollars) the plan can absorb
 * and still reach `horizonAge`. Binary-searches a single lifestyle step (from the
 * current year) — the same mechanism as C2 — so the answer is consistent with the
 * lifestyle controls. Negative result ⇒ the plan is already short.
 *
 * @param {object} inp        - buildPlanInputs output
 * @param {function} simulate - the engine
 * @param {number} horizonAge
 * @param {object} ssOpt      - scenario options ({ haircut, cutYear })
 * @returns {{ delta:number, depAge:number|null, lastsToHorizon:boolean }}
 */
export function spendingHeadroom(inp, simulate, horizonAge, ssOpt) {
  const withDelta = (d) => ({
    ...inp,
    lifestyleSteps: [...(inp.lifestyleSteps || []), { id: "_headroom", fromYear: TAX_YEAR, deltaAnnual: d, on: true }],
  });
  const solventAt = (d) => {
    const sim = simulate(withDelta(d), ssOpt);
    return sim.depAge == null || sim.depAge >= horizonAge;
  };

  const base = simulate(inp, ssOpt);
  const baseSolvent = base.depAge == null || base.depAge >= horizonAge;

  // Bracket: search up to +$200k/yr of extra spend, or down to -$200k.
  let lo, hi;
  if (baseSolvent) { lo = 0; hi = 200000; if (solventAt(hi)) return { delta: hi, depAge: simulate(withDelta(hi), ssOpt).depAge, lastsToHorizon: true }; }
  else { lo = -200000; hi = 0; if (!solventAt(lo)) return { delta: lo, depAge: base.depAge, lastsToHorizon: false }; }

  for (let n = 0; n < 28; n++) {
    const mid = (lo + hi) / 2;
    if (solventAt(mid)) lo = mid; else hi = mid;
  }
  const sim = simulate(withDelta(lo), ssOpt);
  return { delta: Math.round(lo), depAge: sim.depAge, lastsToHorizon: solventAt(lo) };
}
```

(Delete the unused top-level `lastsToHorizon` helper above before committing — it is shown only to illustrate the predicate; the real predicate is `solventAt`.)

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/headroom.test.js` → PASS.

- [ ] **Step 5: Compute headroom in `usePlan.js`**

In `src/hooks/usePlan.js`, import `spendingHeadroom` and `simulate`, and add a memo (keyed on `calc.inp`, `effHaircut`, `effCutYear`, horizon) that returns `spendingHeadroom(calc.inp, simulate, Number(s.horizonAge) || 95, { haircut: effHaircut, cutYear: effCutYear })`. Expose `headroom` in the returned object.

- [ ] **Step 6: `HeadroomCard.jsx`**

Create `src/components/results/HeadroomCard.jsx`: when `headroom.delta >= 0`, render "You can raise spending by up to **{usd0(delta)}/yr** and still last to {horizon}."; otherwise "Spending **{usd0(-delta)}/yr** over budget; savings run out at age {depAge}." Use theme tokens (viridian for headroom, clay for shortfall) and `usd0` from `src/components/format.js`.

- [ ] **Step 7: Render the card + RTL test**

In `RetirementCalculator.jsx`, pass `headroom` from `usePlan` and render `<HeadroomCard headroom={headroom} horizon={horizon} />` near the `Headline`. Add:

```jsx
it("shows a live headroom read-out", () => {
  render(<RetirementCalculator />);
  expect(screen.getByText(/raise spending by up to|over budget/i)).toBeInTheDocument();
});
```

- [ ] **Step 8: Re-export + gate + commit**

Add `export { spendingHeadroom } from "./finance/headroom.js";` to `src/calculatorCore.js`.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): E1 live headroom read-out (max sustainable spend delta to horizon)"
```

---

## PHASE 4 — Group C: typed/emergent events (C3)

### Task 6: C3 — typed & emergent life events

**Files:**

- Modify: `src/finance/events.js` (typing, emergent, windfall)
- Create: `src/finance/events.test.js`
- Modify: `src/finance/simulate.js` (baseline excludes emergent)
- Modify: `src/finance/plan.js` (`simShock` scenario)
- Modify: `src/components/steps/Milestones.jsx` (type select + emergent toggle)
- Modify: `RetirementCalculator.jsx` (default new-event fields; pass `simShock`)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `s.events[]` (existing), gaining optional `type: "gift"|"purchase"|"windfall"` and `emergent: boolean`.
- Produces: `scheduledSpendForYear(events, cal, opts?: { includeEmergent?: boolean }) -> number`. `windfall` subtracts; `gift`/`purchase`/untyped add. `emergent` events are included only when `opts.includeEmergent` (default `true`, preserving the existing alias's behavior for all current callers).
- Produces: `calculatePlan` result gains `simShock` (baseline + emergent shocks).

- [ ] **Step 1: Write the failing test**

```js
// src/finance/events.test.js
import { describe, expect, it } from "vitest";
import { scheduledSpendForYear } from "./events.js";

describe("typed & emergent events (C3)", () => {
  it("nets windfalls negative and adds gifts/purchases", () => {
    const evts = [
      { id: "g", on: true, year: 2030, amount: 15000, type: "gift" },
      { id: "w", on: true, year: 2030, amount: 50000, type: "windfall" },
    ];
    expect(scheduledSpendForYear(evts, 2030)).toBe(15000 - 50000);
  });
  it("excludes emergent events when includeEmergent is false", () => {
    const evts = [{ id: "e", on: true, year: 2030, amount: 40000, type: "purchase", emergent: true }];
    expect(scheduledSpendForYear(evts, 2030, { includeEmergent: false })).toBe(0);
    expect(scheduledSpendForYear(evts, 2030, { includeEmergent: true })).toBe(40000);
  });
  it("treats untyped events as additive spend (back-compat)", () => {
    expect(scheduledSpendForYear([{ id: "x", on: true, year: 2030, amount: 10000 }], 2030)).toBe(10000);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/events.test.js` → FAIL.

- [ ] **Step 3: Extend `scheduledSpendForYear` in `events.js`**

Keep `eventFiresInYear` as-is. Replace `scheduledSpendForYear`:

```js
export const scheduledSpendForYear = (events, cal, opts = {}) => {
  const includeEmergent = opts.includeEmergent ?? true;
  return (events || []).reduce((sum, e) => {
    if (!eventFiresInYear(e, cal)) return sum;
    if (e.emergent && !includeEmergent) return sum;
    const amt = Number(e.amount) || 0;
    return sum + (e.type === "windfall" ? -amt : amt);
  }, 0);
};

// Backwards-compatible alias: one-time events (no `everyYears`, no type) behave as before.
export const oneTimeSpendForYear = scheduledSpendForYear;
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/events.test.js` → PASS. Then `pnpm test` (the existing recurring-events seam-contract tests must still pass — they use untyped events, so amounts are unchanged).

- [ ] **Step 5: Baseline excludes emergent in `simulate.js`**

Change the `extraSpend` line in `simulate.js` to thread the flag from `ssOpt`:

```js
    const extraSpend =
      travelSpendForYear(i.travel, cal)
      + oneTimeSpendForYear(i.events, cal, { includeEmergent: ssOpt.includeEmergent ?? false })
      + ltcSpendForYear(i.ltc, aA, i.ltcAnnual);
```

Baseline scenarios pass no `includeEmergent` ⇒ `false` ⇒ emergent events are excluded from the baseline plan. Existing default events have no `emergent` flag, so baseline numbers are unchanged.

- [ ] **Step 6: Add the `simShock` scenario in `plan.js`**

In `calculatePlan`, after `simStress`:

```js
  const simShock = simulate(inp, { haircut: effHaircut, cutYear: effCutYear, includeEmergent: true });
```

Add `simShock` to the returned object.

- [ ] **Step 7: Add a plan test for the shock scenario**

```js
// src/finance/plan.test.js
it("emergent events hit the shock scenario but not the baseline (C3)", () => {
  const withEmergent = {
    ...bareState,
    events: [{ id: "boom", on: true, year: 2030, amount: 80000, type: "purchase", emergent: true }],
  };
  const plan = calculatePlan(withEmergent);
  const baseRow = plan.simChosen.rows.find((r) => r.cal === 2030);
  const shockRow = plan.simShock.rows.find((r) => r.cal === 2030);
  expect(shockRow.need).toBeGreaterThan(baseRow.need);
});
```

Run: `pnpm test` → green.

- [ ] **Step 8: Enrich `Milestones.jsx` rows**

Add a `type` `Select` (Gift / Purchase / Windfall) and an "emergent" checkbox to each event row, wired through the existing `setProp`-style event editing. Default new events (in the root's `addEvent`) to `type: "gift", emergent: false`. Keep existing add/remove/label affordances. Accessible labels: "Event type", "Emergent (unplanned)".

- [ ] **Step 9: RTL test**

```jsx
it("exposes event type and emergent controls", () => {
  render(<RetirementCalculator />);
  expect(screen.getAllByLabelText(/event type/i).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(/emergent/i).length).toBeGreaterThan(0);
});
```

- [ ] **Step 10: Gate + commit**

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): C3 typed events (gift/purchase/windfall) + emergent shock scenario"
```

---

## PHASE 5 — Group D: accumulation summary (A3)

### Task 7: A3 — accumulation summary read-out

**Files:**

- Create: `src/finance/accumulation.js`
- Create: `src/finance/accumulation.test.js`
- Modify: `src/calculatorCore.js` (re-export)
- Modify: `src/hooks/usePlan.js` (compute `accumulation`)
- Create: `src/components/results/AccumulationSummary.jsx`
- Modify: `RetirementCalculator.jsx` (render while `yearsToRet > 0`)
- Modify: `RetirementCalculator.test.jsx`

**Interfaces:**

- Consumes: `simChosen.rows` (each row has `aA, contrib, growth, bal`), `simChosen.fullyRetAge`, `simChosen.balAtFullRet`, `stopA`, `stopB`, `ageA`, `ageB`.
- Produces: `accumulationSummary(rows, stopAgeA, ageA, stopAgeB, ageB) -> { totalContrib, totalGrowth, balAtRet, blendedReturn, workingYears }`.

- [ ] **Step 1: Write the failing test**

```js
// src/finance/accumulation.test.js
import { describe, expect, it } from "vitest";
import { accumulationSummary } from "./accumulation.js";

describe("accumulationSummary", () => {
  const rows = [
    { aA: 60, contrib: 10000, growth: 5000, bal: 115000 },
    { aA: 61, contrib: 10000, growth: 6000, bal: 131000 },
    { aA: 62, contrib: 0, growth: 7000, bal: 138000 }, // retired (aA >= stopA)
  ];
  it("sums contributions and growth across working years only", () => {
    const s = accumulationSummary(rows, 62, 60, 62, 50);
    expect(s.totalContrib).toBe(20000); // rows at 60 and 61
    expect(s.totalGrowth).toBe(11000);
    expect(s.workingYears).toBe(2);
  });
  it("reports the balance at retirement", () => {
    const s = accumulationSummary(rows, 62, 60, 62, 50);
    expect(s.balAtRet).toBe(131000); // last working row's balance
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test -- src/finance/accumulation.test.js` → FAIL.

- [ ] **Step 3: Implement `src/finance/accumulation.js`**

```js
/**
 * Working-years accumulation summary, symmetric to the retirement headline.
 * Sums contributions and growth over rows where either spouse is still working
 * (aA < stopAgeA OR aB < stopAgeB), and reads the balance at retirement.
 *
 * @param {Array<{aA:number, contrib:number, growth:number, bal:number}>} rows
 * @param {number} stopAgeA
 * @param {number} ageA
 * @param {number} stopAgeB
 * @param {number} ageB
 * @returns {{ totalContrib:number, totalGrowth:number, balAtRet:number, blendedReturn:number, workingYears:number }}
 */
export function accumulationSummary(rows, stopAgeA, ageA, stopAgeB, ageB) {
  const working = (rows || []).filter((r) => {
    const aB = ageB + (r.aA - ageA);
    return r.aA < stopAgeA || aB < stopAgeB;
  });
  const totalContrib = working.reduce((s, r) => s + (r.contrib || 0), 0);
  const totalGrowth = working.reduce((s, r) => s + (r.growth || 0), 0);
  const balAtRet = working.length ? working[working.length - 1].bal : (rows[0]?.bal ?? 0);
  // Effective blended real return realized over the working years (geometric).
  const startBal = working.length ? Math.max(1, balAtRet - totalContrib - totalGrowth) : 1;
  const n = working.length || 1;
  const blendedReturn = Math.pow(Math.max(1e-9, balAtRet / startBal), 1 / n) - 1;
  return { totalContrib, totalGrowth, balAtRet, blendedReturn, workingYears: working.length };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test -- src/finance/accumulation.test.js` → PASS.

- [ ] **Step 5: Compute in `usePlan.js`**

Add a memo: `accumulation = accumulationSummary(simSS.rows, s.stopA, s.ageA, s.stopB, s.ageB)`; expose `accumulation`.

- [ ] **Step 6: `AccumulationSummary.jsx`**

Create the card (shown only when `yearsToRet > 0`): three figures — projected balance at retirement (`usd0`), total contributed vs total growth, and the effective blended real return (`toFixed(1)%`). Theme tokens; brass accents to mirror the retirement `Headline` styling.

- [ ] **Step 7: Render the card + RTL test**

In `RetirementCalculator.jsx`, render `{yearsToRet > 0 && <AccumulationSummary accumulation={accumulation} retYear={retYear} />}` above the `Staircase`. Add:

```jsx
it("shows an accumulation summary while still working", () => {
  render(<RetirementCalculator />); // default state has yearsToRet > 0
  expect(screen.getByText(/at retirement|total contributed|blended return/i)).toBeInTheDocument();
});
```

- [ ] **Step 8: Re-export + gate + commit**

Add `export { accumulationSummary } from "./finance/accumulation.js";` to `src/calculatorCore.js`.

```bash
pnpm test && pnpm lint
git add -A
git commit -m "feat(wave1): A3 accumulation summary read-out for the working years"
```

---

## PHASE 6 — Docs + wave gate

### Task 9: Docs reconciliation + full CI gate

**Files:**

- Modify: `docs/prd.md`
- Modify: `docs/use-cases.md`

**Interfaces:** none (documentation).

- [ ] **Step 1: Reconcile `docs/prd.md`**

Add FR entries (matching the existing FR-numbering + padded-pipe table style; markdownlint MD060 is enforced) for: return presets + variability-by-default (B1), sequence-stress toggle (B2), spending smile (C1), lifestyle steps (C2), typed/emergent events (C3), accumulation summary (A3), live headroom (E1). Move anything now implemented out of any "out of scope" list.

- [ ] **Step 2: Reconcile `docs/use-cases.md`**

Add a short use-case scenario per feature (e.g., "Model a spending smile and read the resulting headroom"; "Flag a roof replacement as emergent and compare baseline vs shock"). Match the file's existing table/section style.

- [ ] **Step 3: Run markdown lint**

Run: `pnpm lint:md`
Expected: PASS (fix any MD060 padded-pipe issues).

- [ ] **Step 4: Full wave gate**

Run: `pnpm lint && pnpm lint:md && pnpm typecheck && pnpm test && pnpm build && pnpm links`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add docs/prd.md docs/use-cases.md
git commit -m "docs(wave1): reconcile PRD + use-cases with the seven Wave 1 controls"
```

---

## Self-review checklist (run before declaring the wave done)

1. **Spec coverage** — every Wave 1 feature (B1, B2, C1, C2, C3, A3, E1) has a task; each adds its own `finance/*` module (except B2, which is UI-only over the existing `simStress`/`stressReturnForYear`) + tests + UI + an accessible-label check.
2. **Invariants** — no new nominal flow (all Wave 1 amounts are real); `calculateFederalTaxYear` untouched; randomness still only in `monteCarlo.js`; every new assumption has a source-linked constant + caption; docs reconciled in Task 9.
3. **Determinism guard** — `spendingShape` defaults to `flat`, `lifestyleSteps` to `[]`, `returnPreset` passthrough defaults to `custom`, emergent excluded from baseline ⇒ the 192-test baseline is numerically unchanged after Task 1.
4. **Type consistency** — `smileMultiplier(age, retireAge, shape)`, `lifestyleStepDelta(steps, cal)`, `resolveReturn(preset, custom)`, `spendingHeadroom(inp, simulate, horizonAge, ssOpt)`, `accumulationSummary(rows, stopAgeA, ageA, stopAgeB, ageB)`, `scheduledSpendForYear(events, cal, opts)` are referenced with identical signatures across tasks and re-exported in `calculatorCore.js`.
5. **Floor policy** — unchanged this wave: `_floorBase` tracks the smile-scaled non-housing base; lifestyle steps/events stay outside the floor base (discretionary), consistent with Wave 0. The housing floor-policy decision is deferred to Wave 2 per the seam note.

---

## Final whole-branch review

After Task 9, dispatch an independent whole-branch reviewer (opus): verify the seven features compose (smile × lifestyle × events all stack in `need`; headroom reflects them; auto-MC band renders; accumulation card appears pre-retirement), confirm the baseline is numerically unchanged where it should be, and confirm the full CI gate is green. Record the verdict in `.superpowers/sdd/progress.md`.
