# Wave 3 — Engine Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-balance decumulation engine into a real three-bucket model
(taxable / deferred / roth) fed by per-vehicle contributions with 2026 IRS limits, drawn in a
configurable tax-smart order, with an optional return glidepath and optional Guyton-Klinger
spending guardrails — each a separate `finance/*` module with its own tests and UI, attached to the
Wave 0 seams, the one-number Simple default preserved throughout.

**Architecture:** Five engine features land as a short serial chain because each depends on the
three-bucket balance model: **A1/A2** contributions seed the buckets and scale with an optional real
raise → **D1** splits the single `bal` into `taxableBal`/`deferredBal`/`rothBal` and makes
`solveWithdrawal`'s gross→ordinary mapping order-dependent (`tradFrac` stops being an input and
becomes a per-draw OUTPUT) → **D2** generalizes the existing RMD-surplus reinvest mechanic to any
surplus year → **glidepath** extends `returns.js` with a `returnModel` (blended / by-bucket /
age-interpolated equity glidepath), Monte Carlo still samples around the blended mean → **E2** adds a
`guardrails.js` Guyton-Klinger spending strategy that composes with the MC runner. The federal tax
engine is never forked; D1 changes only the ordinary-income share fed into it. Glidepath and
guardrails are **opt-in** (defaults unchanged); the tax-smart withdrawal order is **default-on** and
deliberately re-baselines the default headline upward.

**Tech Stack:** React 19, Vite, Vitest 4 + @testing-library/react 16, Recharts 3, pure ES-module
finance engine under `src/finance/**` re-exported by `src/calculatorCore.js`; theme tokens in
`src/components/theme.js` (brass `#B5852C` / viridian `#1E7A5E` / clay `#BE4A2B`;
Inter / Newsreader / JetBrains Mono).

## Decisions taken (confirmed with the user before planning)

1. **Withdrawal ordering — tax-smart default-on.** Default draw order is
   `["taxable","deferred","roth"]`. This defers ordinary income, lowers early-retirement tax, and
   **moves the default headline net UP** — a deliberate, documented re-baseline (Task 3). The order
   is user-configurable in Detailed mode.
2. **Initial-balance bucket seeding — two toggleable input modes.** The existing `$savings` starting
   balance splits into the three buckets via either (a) a **3-way percentage split** (default:
   70% deferred / 30% taxable / 0% roth — exactly today's `tradFrac:0.7`), or (b) **explicit labeled
   dollar amounts** that must total to `savings`. Mirrors the existing `deferredMode: "pct"|"amt"`
   UI pattern. `tradFrac` becomes a derived OUTPUT (initial deferred share), no longer an input.
3. **New modeling modes — opt-in; defaults unchanged.** `returnModel` defaults to `"blended"`
   (today's single `realReturn`); `spendingStrategy` defaults to `"fixed"`. Glidepath and guardrails
   are toggles. This keeps the deterministic default headline stable on the return and spending axes
   and preserves the one-number Simple default.
4. **Contributions — Simple/Detailed toggle preserves the one-number default.** Simple mode keeps a
   single `contrib` number (today `$18,000`) split into buckets by the initial-balance deferred share
   (so the Simple default reproduces today's `defBal += contrib * tradFrac`). Detailed mode exposes
   per-vehicle `contribStreams` with 2026 limits, catch-up tiers, employer match, and Roth phase-out.
5. **Real salary growth — opt-in, real.** `realRaise` defaults to `0`. When set, it scales salaries
   AND contributions by `(1 + realRaise)^y` in working years. It is a REAL raise on top of inflation
   — captioned that way; it must never reintroduce a nominal compounding term (invariant 1).
6. **Austria net-of-treaty rate — move to a positive value.** `INTL_TAX.Austria.retireRate`
   `0.0 → 0.05` (planning-grade net-of-FTC residual), captioned "verify with a cross-border
   specialist" (Task 8). Other INTL retireRates (Greece/Italy/Bulgaria-Romania) stay `0`, documented.
7. **Guardrail defaults — Guyton-Klinger canonical.** ±20% guardrail bands, 10% spending
   adjustments (`upperPct:20, lowerPct:20, cutPct:10, raisePct:10`), sourced to Kitces/Morningstar.

## Global Constraints

(Every task's requirements implicitly include this section — copied from design-spec §3.)

- **Real-dollar consistency — ONE nominal flow.** The model is in today's dollars. The only
  sanctioned nominal flow is mortgage P&I (Wave 2), deflated by `i.inflation` and zeroed at payoff.
  A2's `realRaise` is a REAL raise — `salary × (1+realRaise)^y`, NOT compounded with inflation.
- **One federal tax engine.** `calculateFederalTaxYear` in `src/finance/tax.js` stays the single
  source for projection and headline. D1's bucket ordering changes the INPUT (the ordinary-income
  share = the deferred portion of the draw), never the engine. The Wave 2 residence-tax layer
  (`src/finance/residenceTax.js`) composes on top, unchanged.
- **SINGLE-TAX-SOURCE.** The year-by-year rows AND the steady-state headline must use the same tax
  computation. `steadyState()` must derive its withdrawal's ordinary share from the same bucket
  model + order as the rows (do not regress the Wave-2 fix).
- **Determinism.** The deterministic projection stays seedless/date-free. ALL randomness lives in
  `monteCarlo.js` behind the fixed seed (`MC_DEFAULTS.seed = 12345`). Guardrails in MC must remain
  reproducible. Auto-MC is debounced and never leaks into deterministic snapshot tests.
- **Planning-grade honesty.** Every new assumption (2026 contribution limits, guardrail bands,
  glidepath equity points) gets a dated, source-linked constant in `src/retirementData.js` and an
  in-app caption. Keep the "consult a specialist" framing and source links visible.
- **Tests + docs in lockstep.** Each engine change updates `src/calculatorCore.test.js` (or a
  per-module `src/finance/*.test.js`); each new control gets an accessible-label check in
  `RetirementCalculator.test.jsx`; `docs/prd.md` and `docs/use-cases.md` are reconciled in the same
  change. Markdown follows the repo's padded-pipe table style (markdownlint MD060).
- **No attribution trailer.** Commits carry no `Co-Authored-By` line (project opts out). New UI uses
  the theme tokens in `src/components/theme.js`.

## Engine background (read before touching the loop)

- `src/finance/simulate.js` — `simulate(i, ssOpt)` runs the year loop. Today it tracks a single
  `bal` plus a `defBal` deferred sub-balance (seeded `Math.min(bal, i.taxDeferred)`). Withdrawals are
  proportional: `needDeferredDraw = wd * i.tradFrac`; the RMD path already reinvests its after-tax
  surplus into the taxable side (lines ~322-388). `steadyState(i, sim)` computes the headline from a
  chosen steady row; it ALREADY composes the typed residence layer (lines ~474-510) — this is the
  SINGLE-TAX-SOURCE path you must keep.
- `src/finance/seams.js` — `spendingComponents`/`composeNeed`/`yearReturn`/`stressReturnForYear`.
  `yearReturn(i, y, ssOpt)` is the return seam Task 5 extends. `composeNeed(parts, liveSav)` is the
  spend seam Task 6's guardrail multiplier rides on (it scales `nonHousingBase`, never housing).
- `src/finance/tax.js` — `calculateFederalTaxYear({status, ageA, ageB, wages, pension, rental,
  socialSecurity, grossWithdrawal, tradFrac, year, stateRate})` returns
  `{ordinary, taxableSocialSecurity, agi, deduction, taxableIncome, federalTax, stateTax, tax}`.
  `ordinary = wages + pension + rental + grossWithdrawal * tradFrac`. **D1 passes a per-draw
  `tradFrac = ordinaryShare(D)` instead of the fixed input** — the engine body is untouched.
- `src/finance/plan.js` — `buildPlanInputs(s)` normalizes UI state into the engine `i` object
  (today computes `tradFrac` + `taxDeferred = savings × tradFrac`). `calculatePlan(s)` runs the
  scenario fan + `steadyState`. `resolveSocialSecurityScenario` + `buildPlanInputs` are imported by
  `monteCarlo.js`.
- `src/finance/returns.js` — `resolveReturn(preset, custom)`. Task 5 extends with `resolveYearReturn`.
- `src/finance/rmd.js` — `requiredMinimum(deferredBalance, age)`, `rmdStartAge(birthYear)`,
  `uniformLifetimeFactor(age)`. RMDs act on the deferred bucket only (already true; keep it).
- `src/finance/monteCarlo.js` — `runMonteCarlo(s, mcOpt)` builds lognormal `returns[]` and runs
  `simulate` per path, reading `steadyState(...).net`. Task 6 adds realized-spending capture.
- `RetirementCalculator.jsx:51-81` — the default `useState({...})` object. Task 0 extracts it to
  `src/defaultPlan.js` so a golden test can import it. New state fields append here.

## File structure (created / modified this wave)

**Task 0 — golden baseline**
- Create: `src/defaultPlan.js` (the extracted default-state literal) + `src/defaultPlan.test.js`.
- Modify: `RetirementCalculator.jsx` (import `DEFAULT_PLAN` instead of inline literal).

**Task 1 — A1/A2 contributions**
- Create: `src/finance/contributions.js` + `src/finance/contributions.test.js`;
  `src/components/steps/Contributions.jsx`.
- Modify: `src/retirementData.js` (`CONTRIB_LIMITS_2026`, `SOURCES.irsContrib2026`,
  `SOURCES.fidelityCatchup`, `SOURCES.kitcesGuardrails`); `src/finance/plan.js` (normalize
  `contribStreams`, `employerMatch`, `realRaise`, `bucketSplit`); `src/finance/simulate.js`
  (`plannedContribution` → per-bucket split + real raise); `src/defaultPlan.js` (new fields);
  `RetirementCalculator.jsx` (wire the step).

**Task 2 — bucket data shape + seeding**
- Create: `src/finance/buckets.js` + `src/finance/buckets.test.js`.
- Modify: `src/finance/plan.js` (`seedBuckets` from `bucketSplit`; `tradFrac` becomes derived).

**Task 3 — D1 buckets engine + withdrawal ordering (deepest surgery, opus review)**
- Modify: `src/finance/simulate.js` (three balances, order-dependent draw, RMD on deferred,
  per-bucket rows); `src/finance/buckets.js` (`splitWithdrawal`); `src/components/charts/` (the
  investments "buckets" view drains three real bands); `src/calculatorCore.test.js` (re-baseline).

**Task 4 — D2 surplus reinvest**
- Modify: `src/finance/simulate.js` (generalized surplus → taxable bucket);
  `src/components/charts/` (retirement-year reinvest bar); tests.

**Task 5 — glidepath return model**
- Modify: `src/finance/returns.js` (`resolveYearReturn`/`blendedMean`); `src/finance/seams.js`
  (`yearReturn` delegates to the model); `src/finance/monteCarlo.js` (sample around blended mean);
  `src/finance/plan.js` (normalize `returnModel`); create
  `src/components/steps/ReturnModel.jsx` (or extend the existing returns control) + tests.

**Task 6 — E2 Guyton-Klinger guardrails (opus review)**
- Create: `src/finance/guardrails.js` + `src/finance/guardrails.test.js`;
  `src/components/charts/RealizedSpending.jsx`.
- Modify: `src/finance/simulate.js` (apply guardrail multiplier when `spendingStrategy==="guardrails"`);
  `src/finance/monteCarlo.js` (capture realized-spending distribution);
  `src/components/steps/SpendingStrategy.jsx`; tests.

**Task 7 — Austria rate + docs reconcile + full gate**
- Modify: `src/retirementData.js` (`INTL_TAX.Austria.retireRate 0.0→0.05`, caption);
  `docs/prd.md`, `docs/use-cases.md`, `docs/sources.md`; final CI gate.

## Execution order & parallelization

```
T0 (golden baseline) ── serial, FIRST (pins headline before any change)
   │
T1 (contributions + 2026 limits + realRaise) ── serial
   │
T2 (buckets data shape + seedBuckets) ── serial, after T1
   │
T3 (D1 three buckets + withdrawal order) ── serial, after T2  [DEEPEST — opus review]
   │
T4 (D2 surplus reinvest) ── serial, after T3
   │
T5 (glidepath return model) ── after T3 (uses bucket balances for byBucket blend)
   │
T6 (E2 guardrails + MC) ── after T3/T4  [opus review]
   │
T7 (Austria rate + docs + gate) ── serial, LAST
```

This wave is a serial chain (each step depends on the three-bucket model), so worktree isolation is
unnecessary — one ledgered sequence. Commit intentionally per task.

---

### Task 0: Golden default-headline regression test (carried Wave-2 follow-up — DO FIRST)

> Pins the CURRENT default headline before any Wave 3 change, so every later re-baseline is a
> deliberate, auditable diff against this literal — never a silently mutated assertion.

**Files:**
- Create: `src/defaultPlan.js`, `src/defaultPlan.test.js`
- Modify: `RetirementCalculator.jsx:51-81` (import the literal instead of inlining it)

**Interfaces:**
- Produces: `export const DEFAULT_PLAN = { ...the exact current useState literal... }` — imported by
  `RetirementCalculator.jsx` (`useState(DEFAULT_PLAN)` — note: pass a fresh shallow clone so React
  state never mutates the module constant) and by `defaultPlan.test.js`.

- [ ] **Step 1: Extract the default state to `src/defaultPlan.js`.**

Copy the exact object literal currently at `RetirementCalculator.jsx:52-80` into a new module. Keep
the `DEFAULT_TRAVEL`/`DEFAULT_LIFE_EVENTS`/`DEFAULT_LIFE` imports it depends on.

```js
// src/defaultPlan.js
import { DEFAULT_TRAVEL, DEFAULT_LIFE_EVENTS, DEFAULT_LIFE } from "./retirementData.js";

// The single source of truth for the app's default scenario. Imported by
// RetirementCalculator.jsx (initial useState) and pinned by a golden regression
// test so any deliberate re-baseline shows up as an explicit literal diff.
export const DEFAULT_PLAN = {
  ageA:57, ageB:48, stopA:65, stopB:56, claimA:65, claimB:65, pensionAge:65,
  incomeA:0, incomeB:170000, savings:670000, contrib:18000, targetPct:0.28, status:"married",
  ssModeA:"statement", ssModeB:"statement", ssFraA:50424, ssFraB:31592,
  pensionOn:true, system:"TRS", plan:3, pYears:22, afc:170000,
  realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
  ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
  retireLoc:"Austria", spendBasis:"income", lifestyle:100,
  tx:{ on:false, value:790000, year:2038, strategy:"rent" },
  at:{ on:true, value:324000, year:2040, strategy:"live" },
  travel: { ...DEFAULT_TRAVEL },
  events: DEFAULT_LIFE_EVENTS.map((e) => ({ ...e })),
  life: { ...DEFAULT_LIFE },
  survivor: { on:false, year:2055, pensionPct:0 },
  ltc: { on:false, startAge:80, years:3, annual:null },
  horizonAge: 95,
  stateRate: null,
  returnPreset: "balanced", volatility: 0.12, showStress: false,
  spendingShape: { mode: "flat", earlyDecline: 0.01, upturnAge: 85, lateUpturn: 0.01 },
  lifestyleSteps: [],
  workLoc: "WA", relocationYear: 2046, stateCode: null,
  housing: { tenure: "rent", rent: 1650, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01, relocation: { action: "sell", saleValue: 0 } },
  retireHousing: null,
};

// A fresh deep-ish clone for React state init (so state edits never mutate the constant).
export const makeDefaultPlan = () => ({
  ...DEFAULT_PLAN,
  tx: { ...DEFAULT_PLAN.tx }, at: { ...DEFAULT_PLAN.at },
  travel: { ...DEFAULT_PLAN.travel },
  events: DEFAULT_PLAN.events.map((e) => ({ ...e })),
  life: { ...DEFAULT_PLAN.life }, survivor: { ...DEFAULT_PLAN.survivor },
  ltc: { ...DEFAULT_PLAN.ltc }, spendingShape: { ...DEFAULT_PLAN.spendingShape },
  lifestyleSteps: DEFAULT_PLAN.lifestyleSteps.map((x) => ({ ...x })),
  housing: { ...DEFAULT_PLAN.housing, mortgage: { ...DEFAULT_PLAN.housing.mortgage }, relocation: { ...DEFAULT_PLAN.housing.relocation } },
});
```

- [ ] **Step 2: Write the failing golden test.**

```js
// src/defaultPlan.test.js
import { describe, it, expect } from "vitest";
import { makeDefaultPlan } from "./defaultPlan.js";
import { calculatePlan } from "./calculatorCore.js";

describe("default plan — golden headline", () => {
  it("pins the default steady-state headline (pre-Wave-3 baseline)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // BASELINE pinned 2026-06-23 (post Wave 2 + caption fix, pre Wave 3).
    // Fill these with the ACTUAL printed values in Step 3 — do not guess.
    expect(Math.round(steady.net)).toBe(/* PIN */ 0);
    expect(Math.round(steady.targetNeed)).toBe(/* PIN */ 0);
    expect(Math.round(steady.FV)).toBe(/* PIN */ 0);
    expect(steady.startAgeA).toBe(/* PIN */ 0);
  });
});
```

- [ ] **Step 3: Run it, read the real numbers, pin them.**

Run: `pnpm test -- src/defaultPlan.test.js`
Expected: FAIL printing actual `steady.net` etc. Replace each `/* PIN */ 0` with the printed integer.
Re-run → PASS. Record the four pinned values in the commit message and the SDD ledger as the
**pre-Wave-3 baseline** (this is the number Task 3 will deliberately move).

- [ ] **Step 4: Rewire `RetirementCalculator.jsx` to use the extracted literal.**

Replace the inline `useState({...})` (lines 51-81) with:

```jsx
import { makeDefaultPlan } from "./src/defaultPlan.js"; // adjust relative path to match the file
// ...
const [s, setS] = useState(makeDefaultPlan);
```

(Use the lazy initializer form `useState(makeDefaultPlan)` so the clone runs once.)

- [ ] **Step 5: Run the full suite + commit.**

Run: `pnpm test` → all green (312 incl. the new golden test). Then:
```bash
git add src/defaultPlan.js src/defaultPlan.test.js RetirementCalculator.jsx
git commit -m "test(wave3): pin default headline via extracted DEFAULT_PLAN golden baseline"
```

---

### Task 1: A1/A2 — multi-vehicle contributions + 2026 limits + real salary growth

> New `finance/contributions.js`. Simple mode keeps the one-number `contrib` (Decision 4). Detailed
> mode exposes per-vehicle streams with 2026 limits. `realRaise` (Decision 5) scales salaries AND
> contributions in REAL terms. Buckets are not wired yet (Task 3) — this task computes the per-bucket
> contribution SPLIT and the real-raise multiplier and proves them in isolation.

**Files:**
- Create: `src/finance/contributions.js`, `src/finance/contributions.test.js`,
  `src/components/steps/Contributions.jsx`
- Modify: `src/retirementData.js`, `src/finance/plan.js`, `src/finance/simulate.js:29` +
  contribution deposit (lines ~306-320), `src/defaultPlan.js`, `RetirementCalculator.jsx`

**Interfaces:**
- Consumes: `DEFAULT_PLAN` (Task 0).
- Produces:
  - `CONTRIB_LIMITS_2026` (in `retirementData.js`) — dated, source-linked table.
  - `vehicleLimit(vehicle, age) -> number` — base + applicable catch-up/super-catch-up.
  - `rothIraAllowed(magi, status) -> {allowed: boolean, phaseFrac: number}` — phase-out.
  - `contributionPlan(i, {ageA, ageB, year}) -> { total, byBucket: {taxable, deferred, roth}, employerMatch, flags: string[] }`
    — resolves Simple (single `contrib`) or Detailed (`contribStreams`) into a per-bucket split.
  - `realRaiseFactor(realRaise, y) -> number` = `(1 + realRaise)^y`.
- Produced for later tasks: Task 3 calls `contributionPlan(...).byBucket` to deposit into the three
  buckets; `realRaiseFactor` scales salaries in `simulate.js`.

- [ ] **Step 1: Add the 2026 limits + sources to `retirementData.js` (write the test first).**

```js
// src/finance/contributions.test.js  (Step 1 — RED)
import { describe, it, expect } from "vitest";
import { vehicleLimit, rothIraAllowed, contributionPlan, realRaiseFactor } from "./contributions.js";

describe("2026 contribution limits", () => {
  it("401k base under 50", () => expect(vehicleLimit("401k", 49)).toBe(24500));
  it("401k with 50+ catch-up", () => expect(vehicleLimit("401k", 55)).toBe(32500));
  it("401k super catch-up 60-63", () => expect(vehicleLimit("401k", 61)).toBe(35750));
  it("401k reverts to standard catch-up at 64", () => expect(vehicleLimit("401k", 64)).toBe(32500));
  it("IRA base + catch-up", () => {
    expect(vehicleLimit("ira", 40)).toBe(7500);
    expect(vehicleLimit("ira", 50)).toBe(8600);
  });
  it("HSA family + 55 catch-up", () => {
    expect(vehicleLimit("hsaFamily", 40)).toBe(8750);
    expect(vehicleLimit("hsaFamily", 55)).toBe(9750);
  });
});

describe("Roth IRA phase-out", () => {
  it("fully allowed below MFJ floor", () => expect(rothIraAllowed(200000, "married").allowed).toBe(true));
  it("disallowed above MFJ ceiling", () => expect(rothIraAllowed(260000, "married").allowed).toBe(false));
  it("partial in the band", () => {
    const r = rothIraAllowed(247000, "married"); // midpoint of 242k–252k
    expect(r.phaseFrac).toBeCloseTo(0.5, 2);
  });
});

describe("real raise", () => {
  it("is 1 at year 0", () => expect(realRaiseFactor(0.02, 0)).toBe(1));
  it("compounds in real terms", () => expect(realRaiseFactor(0.02, 10)).toBeCloseTo(1.21899, 4));
});

describe("contributionPlan — Simple vs Detailed", () => {
  it("Simple mode splits the single number by the initial deferred share", () => {
    const i = { contribMode: "simple", contrib: 18000, bucketSplit: { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 }, realRaise: 0 };
    const p = contributionPlan(i, { ageA: 57, ageB: 48, year: 2026 });
    expect(p.total).toBe(18000);
    expect(p.byBucket.deferred).toBeCloseTo(12600, 6);
    expect(p.byBucket.taxable).toBeCloseTo(5400, 6);
    expect(p.byBucket.roth).toBe(0);
  });

  it("Detailed mode sums streams into buckets and adds employer match", () => {
    const i = {
      contribMode: "detailed",
      contribStreams: [
        { id: "1", vehicle: "401k", owner: "B", amount: 20000, roth: false },
        { id: "2", vehicle: "ira", owner: "B", amount: 7000, roth: true },
      ],
      employerMatch: { pct: 50, capPct: 6 },
      incomeB: 170000, realRaise: 0,
    };
    const p = contributionPlan(i, { ageA: 57, ageB: 48, year: 2026 });
    // deferred = 401k 20000 + match min(50% of 20000, 6% of 170000=10200) = 10000 → 30000
    expect(p.byBucket.deferred).toBe(30000);
    expect(p.byBucket.roth).toBe(7000); // Roth IRA stream
    expect(p.employerMatch).toBe(10000);
  });

  it("flags an over-limit stream and clamps it", () => {
    const i = { contribMode: "detailed", contribStreams: [{ id: "1", vehicle: "ira", owner: "B", amount: 99999, roth: false }], realRaise: 0 };
    const p = contributionPlan(i, { ageA: 40, ageB: 40, year: 2026 });
    expect(p.byBucket.deferred).toBe(7500); // clamped to IRA base
    expect(p.flags.some((f) => /limit/i.test(f))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

Run: `pnpm test -- src/finance/contributions.test.js`
Expected: FAIL (`contributions.js` does not exist).

- [ ] **Step 3: Add `CONTRIB_LIMITS_2026` + sources to `retirementData.js`.**

Insert after `SMILE_DEFAULTS` (and add the three `SOURCES` keys):

```js
// 2026 retirement-contribution limits. Source: IRS Notice 2025-67 (SOURCES.irsContrib2026).
// Catch-up: standard 50+; "super" catch-up applies only in the year a worker is 60–63
// (SECURE 2.0). High earners (>$150k prior-year FICA wages) must make 401(k) catch-ups as
// Roth — flagged in the UI, not auto-enforced (planning-grade). Roth IRA MAGI phase-out per IRS.
export const CONTRIB_LIMITS_2026 = {
  "401k":      { base: 24500, catchUp50: 8000,  superCatchUp60to63: 11250 },
  ira:         { base: 7500,  catchUp50: 1100,  superCatchUp60to63: 0 },
  hsaSelf:     { base: 4400,  catchUp55: 1000 },
  hsaFamily:   { base: 8750,  catchUp55: 1000 },
  rothIraPhaseOut: { single: [153000, 168000], married: [242000, 252000] },
  highEarnerRothCatchUpWageFloor: 150000,
};
```

Add to `SOURCES`:
```js
  irsContrib2026: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
  fidelityCatchup: "https://www.fidelity.com/learning-center/personal-finance/401k-catch-up-contributions-high-earners",
  kitcesGuardrails: "https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/",
  morningstarGuardrails: "https://www.morningstar.com/retirement/want-boost-your-retirement-income-guardrails-could-help",
```

- [ ] **Step 4: Implement `src/finance/contributions.js`.**

```js
import { CONTRIB_LIMITS_2026 } from "../retirementData.js";

const L = CONTRIB_LIMITS_2026;

// Resolve the annual limit for a vehicle at a given age (catch-up tiers auto-apply).
export function vehicleLimit(vehicle, age) {
  const v = L[vehicle];
  if (!v) return Infinity; // unknown vehicle: no clamp
  let limit = v.base;
  if (age >= 50 && v.catchUp50) limit += v.catchUp50;
  if (age >= 55 && v.catchUp55) limit += v.catchUp55;
  if (age >= 60 && age <= 63 && v.superCatchUp60to63) limit += v.superCatchUp60to63;
  return limit;
}

// Roth IRA MAGI phase-out: returns allowed flag + the linear allowed fraction in the band.
export function rothIraAllowed(magi, status) {
  const band = L.rothIraPhaseOut[status === "married" ? "married" : "single"];
  const [lo, hi] = band;
  if (magi <= lo) return { allowed: true, phaseFrac: 1 };
  if (magi >= hi) return { allowed: false, phaseFrac: 0 };
  return { allowed: true, phaseFrac: (hi - magi) / (hi - lo) };
}

export const realRaiseFactor = (realRaise, y) => Math.pow(1 + (Number(realRaise) || 0), y);

const ownerAge = (owner, ctx) => (owner === "A" ? ctx.ageA : ctx.ageB);

// Resolve the per-bucket contribution split for a year. Simple mode keeps the single
// `contrib` number split by the initial deferred share; Detailed mode sums typed streams.
export function contributionPlan(i, ctx) {
  const flags = [];
  const byBucket = { taxable: 0, deferred: 0, roth: 0 };
  let employerMatch = 0;

  if (i.contribMode !== "detailed") {
    // Simple: one number, split by the initial-balance deferred share so the default
    // reproduces today's `defBal += contrib * tradFrac`.
    const split = i.bucketSplit || { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 };
    const defFrac = split.mode === "pct"
      ? (Number(split.deferredPct) || 0) / 100
      : (Number(split.deferred) || 0) / Math.max(1, (Number(split.deferred) || 0) + (Number(split.taxable) || 0) + (Number(split.roth) || 0));
    const taxFrac = split.mode === "pct" ? (Number(split.taxablePct) || 0) / 100 : 1 - defFrac;
    const total = Number(i.contrib) || 0;
    byBucket.deferred = total * defFrac;
    byBucket.taxable = total * taxFrac;
    byBucket.roth = Math.max(0, total - byBucket.deferred - byBucket.taxable);
    return { total, byBucket, employerMatch: 0, flags };
  }

  // Detailed: typed streams. Roth flag (or vehicle "roth401k"/Roth IRA) routes to the roth bucket.
  for (const s of (i.contribStreams || [])) {
    const amount = Number(s.amount) || 0;
    if (amount <= 0) continue;
    const limit = vehicleLimit(s.vehicle, ownerAge(s.owner, ctx));
    const capped = Math.min(amount, limit);
    if (capped < amount) flags.push(`${s.vehicle} (${s.owner}) over 2026 limit — clamped to $${limit.toLocaleString()}`);
    const bucket = s.roth ? "roth" : (s.vehicle === "ira" || s.vehicle === "401k" ? "deferred" : "taxable");
    byBucket[bucket] += capped;
    // Employer match applies to pre-tax 401k streams only.
    if (s.vehicle === "401k" && !s.roth && i.employerMatch) {
      const wage = s.owner === "A" ? (Number(i.incomeA) || 0) : (Number(i.incomeB) || 0);
      const m = Math.min(capped * (Number(i.employerMatch.pct) || 0) / 100, wage * (Number(i.employerMatch.capPct) || 0) / 100);
      employerMatch += m;
      byBucket.deferred += m; // employer match is always pre-tax
    }
  }
  const total = byBucket.taxable + byBucket.deferred + byBucket.roth;
  return { total, byBucket, employerMatch, flags };
}
```

- [ ] **Step 5: Run the module test to GREEN.**

Run: `pnpm test -- src/finance/contributions.test.js` → PASS.

- [ ] **Step 6: Wire into `plan.js` + `simulate.js` (engine integration test first).**

Add to `src/finance/plan.js` `buildPlanInputs` return object (defaults preserve Simple behavior):
```js
    contribMode: s.contribMode ?? "simple",
    contribStreams: s.contribStreams ?? [],
    employerMatch: s.employerMatch ?? { pct: 0, capPct: 0 },
    realRaise: Number(s.realRaise) || 0,
    bucketSplit: s.bucketSplit ?? { mode: "pct", deferredPct: Math.round((Number(s.tradFrac) || 0.7) * 100), taxablePct: Math.round((1 - (Number(s.tradFrac) || 0.7)) * 100), rothPct: 0 },
```

In `src/finance/simulate.js` replace the line-29 `plannedContribution` with a call into
`contributionPlan`, and apply `realRaiseFactor` to salaries. Add a `calculatorCore.test.js` case
asserting that with `realRaise:0` and Simple mode the default projection is UNCHANGED from Task 0's
baseline (behavior-preserving — buckets aren't reordered until Task 3), and that `realRaise:0.02`
raises the depletion-age / final balance. Keep the deposit math identical to today
(`byBucket.deferred` replaces `contrib * tradFrac`).

- [ ] **Step 7: Build the Contributions step UI (`src/components/steps/Contributions.jsx`).**

Simple/Detailed `Segmented` toggle. Simple shows the single `contrib` NumberInput (today's control,
relabeled). Detailed shows a per-vehicle stream table (vehicle Select, owner, amount, Roth checkbox),
a per-row limit meter ("$X of $Y max"), an employer-match row, and a `realRaise` slider captioned
"Real raise — on top of inflation". Accessible labels: `"Contribution mode"`, `"Annual contribution"`,
`"Add contribution stream"`, `"Vehicle"`, `"Employer match %"`, `"Real raise"`. Wire it into
`RetirementCalculator.jsx` and add the new state fields to `src/defaultPlan.js`
(`contribMode:"simple", contribStreams:[], employerMatch:{pct:0,capPct:0}, realRaise:0,
bucketSplit:{mode:"pct",deferredPct:70,taxablePct:30,rothPct:0}`).

- [ ] **Step 8: Add accessible-label checks to `RetirementCalculator.test.jsx`.**

```jsx
it("exposes the contributions controls", () => {
  render(<RetirementCalculator />);
  expect(screen.getByLabelText("Contribution mode")).toBeInTheDocument();
  expect(screen.getByLabelText("Real raise")).toBeInTheDocument();
});
```

- [ ] **Step 9: Run full suite + commit.**

Run: `pnpm test` → green. Golden test (Task 0) must STILL PASS (Simple default unchanged).
```bash
git add src/finance/contributions.js src/finance/contributions.test.js src/retirementData.js \
  src/finance/plan.js src/finance/simulate.js src/components/steps/Contributions.jsx \
  src/defaultPlan.js RetirementCalculator.jsx RetirementCalculator.test.jsx src/calculatorCore.test.js
git commit -m "feat(wave3): A1/A2 multi-vehicle contributions + 2026 limits + real salary growth (Simple default unchanged)"
```

---

### Task 2: Bucket data shape + `seedBuckets` (foundation for D1)

> Define the three-bucket seeding from `bucketSplit` (Decision 2: pct mode OR explicit-amounts mode).
> Behavior-preserving: nothing in the loop reorders draws yet — this only formalizes the initial
> split and makes `tradFrac` a DERIVED output (`deferred / savings`).

**Files:**
- Modify: `src/finance/buckets.js` (created here — first half), `src/finance/buckets.test.js`,
  `src/finance/plan.js`

**Interfaces:**
- Produces:
  - `seedBuckets(savings, bucketSplit) -> { taxable, deferred, roth }` — totals to `savings`.
  - `derivedTradFrac({deferred, taxable, roth}) -> number` = `deferred / total` (0 when empty).
- Consumed by Task 3 (`simulate.js` initial balances) and `plan.js` (`tradFrac` output).

- [ ] **Step 1: Write the failing test.**

```js
// src/finance/buckets.test.js
import { describe, it, expect } from "vitest";
import { seedBuckets, derivedTradFrac } from "./buckets.js";

describe("seedBuckets", () => {
  it("pct mode splits savings 70/30/0 by default", () => {
    const b = seedBuckets(670000, { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 });
    expect(b.deferred).toBeCloseTo(469000, 6);
    expect(b.taxable).toBeCloseTo(201000, 6);
    expect(b.roth).toBe(0);
    expect(b.deferred + b.taxable + b.roth).toBeCloseTo(670000, 6);
  });
  it("amt mode uses explicit labeled amounts", () => {
    const b = seedBuckets(670000, { mode: "amt", deferred: 400000, taxable: 200000, roth: 70000 });
    expect(b).toEqual({ deferred: 400000, taxable: 200000, roth: 70000 });
  });
  it("amt mode reconciles a mismatched total onto taxable (planning-grade)", () => {
    const b = seedBuckets(670000, { mode: "amt", deferred: 400000, taxable: 200000, roth: 0 });
    expect(b.taxable).toBe(270000); // absorbs the 70k remainder so the buckets total to savings
  });
});

describe("derivedTradFrac", () => {
  it("is the deferred share of the total", () => {
    expect(derivedTradFrac({ deferred: 469000, taxable: 201000, roth: 0 })).toBeCloseTo(0.7, 6);
  });
  it("is 0 for an empty portfolio", () => {
    expect(derivedTradFrac({ deferred: 0, taxable: 0, roth: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm test -- src/finance/buckets.test.js` → FAIL.

- [ ] **Step 3: Implement the seeding half of `src/finance/buckets.js`.**

```js
// Seed the three sub-balances from total savings. Two input modes (Decision 2):
//   pct: percentages of savings (deferredPct/taxablePct/rothPct, ~100 total)
//   amt: explicit dollar amounts; any remainder vs. savings is absorbed onto taxable
//        (planning-grade reconciliation so the buckets always total the portfolio).
export function seedBuckets(savings, bucketSplit) {
  const S = Math.max(0, Number(savings) || 0);
  const split = bucketSplit || { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 };
  if (split.mode === "amt") {
    const deferred = Math.max(0, Number(split.deferred) || 0);
    const roth = Math.max(0, Number(split.roth) || 0);
    const taxable = Math.max(0, S - deferred - roth);
    return { taxable, deferred, roth };
  }
  const dp = (Number(split.deferredPct) || 0) / 100;
  const rp = (Number(split.rothPct) || 0) / 100;
  const deferred = S * dp;
  const roth = S * rp;
  const taxable = Math.max(0, S - deferred - roth);
  return { taxable, deferred, roth };
}

export const derivedTradFrac = (b) => {
  const total = (b.taxable || 0) + (b.deferred || 0) + (b.roth || 0);
  return total > 0 ? (b.deferred || 0) / total : 0;
};
```

- [ ] **Step 4: Run to GREEN + wire `plan.js`.** In `buildPlanInputs`, replace the `tradFrac`/
  `taxDeferred` block (lines ~70-74) so buckets are the source and `tradFrac` is derived:

```js
  const savings = Number(s.savings) || 0;
  const bucketSplit = s.bucketSplit ?? { mode: "pct", deferredPct: Math.round((Number(s.tradFrac) || 0.7) * 100), taxablePct: Math.round((1 - (Number(s.tradFrac) || 0.7)) * 100), rothPct: 0 };
  const initialBuckets = seedBuckets(savings, bucketSplit);
  const tradFrac = derivedTradFrac(initialBuckets); // DERIVED OUTPUT (was an input)
  const taxDeferred = initialBuckets.deferred;
```

Add `initialBuckets` and `bucketSplit` to the returned object; keep `tradFrac`/`taxDeferred` keys for
back-compat consumers. Run `pnpm test` → the golden test (Task 0) MUST still pass (70/30 split
reproduces `tradFrac 0.7` exactly).

- [ ] **Step 5: Commit.**
```bash
git add src/finance/buckets.js src/finance/buckets.test.js src/finance/plan.js
git commit -m "feat(wave3): seedBuckets + derived tradFrac — three-bucket seeding (behavior-preserving)"
```

---

### Task 3: D1 — three real buckets + tax-smart withdrawal ordering (DEEPEST SURGERY — opus review)

> **This is the re-baseline.** The single `bal`/`defBal` pair becomes three real sub-balances drawn
> in `withdrawalOrder` (default taxable→deferred→roth). `solveWithdrawal`'s gross→ordinary mapping
> becomes order-dependent: the deferred PORTION of a draw is the only ordinary income; Roth is
> tax-free. `tradFrac` is no longer read as an input anywhere in the loop — each draw computes its own
> ordinary share. RMDs act on the deferred bucket only. **The default headline net moves UP** (less
> early ordinary income); re-baseline the golden test and `calculatorCore.test.js` deliberately.

**Files:**
- Modify: `src/finance/buckets.js` (add `splitWithdrawal`), `src/finance/buckets.test.js`,
  `src/finance/simulate.js` (the loop + `steadyState`), `src/calculatorCore.test.js`,
  `src/defaultPlan.js` (+`withdrawalOrder`), the investments "buckets" chart, `RetirementCalculator.*`

**Interfaces:**
- Consumes: `seedBuckets`, `contributionPlan` (Task 1).
- Produces:
  - `splitWithdrawal(D, balances, order) -> { taxable, deferred, roth, total, ordinaryShare }` where
    `ordinaryShare = deferred / total` (0 when total 0). This is the per-draw `tradFrac` fed to
    `calculateFederalTaxYear`.
  - `DEFAULT_WITHDRAWAL_ORDER = ["taxable","deferred","roth"]`.
  - simulate rows gain `taxableBal`, `deferredBal`, `rothBal` (rounded) so `steadyState` and the chart
    can read the per-bucket composition (SINGLE-TAX-SOURCE).

- [ ] **Step 1: Write the `splitWithdrawal` unit test (RED).**

```js
// append to src/finance/buckets.test.js
import { splitWithdrawal, DEFAULT_WITHDRAWAL_ORDER } from "./buckets.js";

describe("splitWithdrawal — order-dependent gross→ordinary mapping", () => {
  const bal = { taxable: 100000, deferred: 200000, roth: 50000 };
  it("draws taxable first by default", () => {
    const s = splitWithdrawal(80000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.taxable).toBe(80000);
    expect(s.deferred).toBe(0);
    expect(s.ordinaryShare).toBe(0); // no ordinary income yet — all from taxable
  });
  it("spills into deferred once taxable is exhausted", () => {
    const s = splitWithdrawal(150000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.taxable).toBe(100000);
    expect(s.deferred).toBe(50000);
    expect(s.ordinaryShare).toBeCloseTo(50000 / 150000, 6);
  });
  it("roth is last and tax-free", () => {
    const s = splitWithdrawal(330000, bal, DEFAULT_WITHDRAWAL_ORDER);
    expect(s.roth).toBe(30000);
    expect(s.ordinaryShare).toBeCloseTo(200000 / 330000, 6); // only deferred is ordinary
  });
  it("honors a custom order", () => {
    const s = splitWithdrawal(150000, bal, ["deferred", "taxable", "roth"]);
    expect(s.deferred).toBe(150000);
    expect(s.ordinaryShare).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm test -- src/finance/buckets.test.js` → FAIL.

- [ ] **Step 3: Implement `splitWithdrawal` + `DEFAULT_WITHDRAWAL_ORDER`.**

```js
// append to src/finance/buckets.js
export const DEFAULT_WITHDRAWAL_ORDER = ["taxable", "deferred", "roth"];

// Split a gross draw D across buckets in `order`. ordinaryShare = deferred portion / total
// (this is the per-draw tradFrac passed to calculateFederalTaxYear — Roth/taxable principal
// is not ordinary income). taxable-bucket capital-gains tax is out of scope (planning-grade).
export function splitWithdrawal(D, balances, order = DEFAULT_WITHDRAWAL_ORDER) {
  let remaining = Math.max(0, Number(D) || 0);
  const out = { taxable: 0, deferred: 0, roth: 0 };
  for (const bucket of order) {
    const avail = Math.max(0, Number(balances[bucket]) || 0);
    const take = Math.min(remaining, avail);
    out[bucket] = take;
    remaining -= take;
  }
  const total = out.taxable + out.deferred + out.roth;
  return { ...out, total, ordinaryShare: total > 0 ? out.deferred / total : 0 };
}
```

- [ ] **Step 4: Run to GREEN.** `pnpm test -- src/finance/buckets.test.js` → PASS.

- [ ] **Step 5: Surgery on `simulate.js` — replace `bal`/`defBal` with three buckets.**

Detailed modify-spec (the implementer holds the whole loop in context — do NOT placeholder):

1. **Initialize buckets** (replace lines ~110-114):
   ```js
   let buckets = i.initialBuckets ? { ...i.initialBuckets } : seedBuckets(Number(i.savings) || 0, i.bucketSplit);
   const order = i.withdrawalOrder || DEFAULT_WITHDRAWAL_ORDER;
   const balOf = (b) => b.taxable + b.deferred + b.roth;
   let bal = balOf(buckets);
   ```
   Keep a `bal` mirror updated after each mutation (rows/depletion read it) — OR derive it via
   `balOf(buckets)` everywhere `bal` was read. Pick one and apply consistently.
2. **Growth** (replace `bal = bal*(1+yr)+sellLump; defBal = defBal*(1+yr)`): grow each bucket by the
   year return; sale proceeds land in `taxable` (sale proceeds are taxable savings, not deferred):
   ```js
   buckets.taxable = buckets.taxable * (1 + yr) + sellLump;
   buckets.deferred = buckets.deferred * (1 + yr);
   buckets.roth = buckets.roth * (1 + yr);
   ```
   `defBalStart` (the RMD base) becomes `buckets.deferred` captured BEFORE growth.
3. **Contributions** (replace lines ~306-320): deposit `contributionPlan(...).byBucket` into the
   matching buckets (employer match already folded into `deferred` by Task 1). Apply
   `realRaiseFactor(i.realRaise, y)` to wages used for the contribution-affordability check AND to the
   contribution amounts. The affordability clamp (`Math.min(plannedContrib, afterTax - need)`) stays.
4. **Withdrawal** — replace the fixed-`tradFrac` calls. `solveWithdrawal` must compute the per-draw
   ordinary share from the CURRENT buckets and order. Thread a `tradFracForDraw(D) =
   splitWithdrawal(D, buckets, order).ordinaryShare` into `taxForYear` (add an explicit
   `tradFracOverride` parameter to `taxForYear`/`solveWithdrawal`, defaulting to `i.tradFrac` for the
   working-year/flat callers that still pass a fixed value). After solving `wd`, subtract from buckets
   in order via `splitWithdrawal(wd, buckets, order)` and decrement each bucket by its portion.
5. **RMD** — `requiredMinimum(defBalStart, olderAge)` acts on `buckets.deferred` only. The forced
   amount above the need-based deferred draw is fully ordinary (tradFrac:1 on that slice, unchanged
   math); decrement `buckets.deferred` by the forced amount; reinvest the after-tax forced remainder
   into `buckets.taxable` (the existing mechanic, now explicitly bucket-aware).
6. **Row output** — add `taxableBal: Math.round(buckets.taxable)`,
   `deferredBal: Math.round(buckets.deferred)`, `rothBal: Math.round(buckets.roth)`; keep
   `bal: Math.round(balOf(buckets))` and `defBal` (= `deferredBal`) for back-compat.
7. **`steadyState`** — read `row.taxableBal/deferredBal/rothBal`; compute the headline withdrawal's
   ordinary share via `splitWithdrawal(wd, {taxable: row.taxableBal, deferred: row.deferredBal, roth:
   row.rothBal}, order).ordinaryShare` and pass THAT as `tradFrac` to the federal call (both the
   typed-residence and flat paths). This preserves SINGLE-TAX-SOURCE: the headline draws from the same
   buckets in the same order as the rows.

- [ ] **Step 6: Re-baseline `calculatorCore.test.js` + the golden test.**

Run the FULL suite. Tests asserting the old default headline/need will move (tax-smart ordering draws
tax-free/principal first → less early ordinary income → higher net). For EACH failing assertion,
verify the new value is correct by reasoning (taxable-first should raise early net), then re-baseline
to the new intended value with an explanatory comment:
```js
// Wave 3 D1: tax-smart withdrawal order (taxable→deferred→roth) defers ordinary income,
// lowering early-retirement tax. Headline net <OLD> → <NEW>.
```
Update `src/defaultPlan.test.js`'s pinned `steady.net` to the new value with the same comment.
**Record the before→after headline net in the commit message and the SDD ledger.** Never mutate an
assertion without the comment + rationale.

- [ ] **Step 7: Update the investments "buckets" chart to drain three real bands.**

The existing `invView: "buckets"|"bucketsRmd"` chart reads `defBal`. Extend it to stack
`taxableBal`/`deferredBal`/`rothBal` (theme colors: taxable=viridian, deferred=brass, roth=clay) with
a tooltip "this year's draw: $X taxable, $Y deferred, $Z roth". Add a `withdrawalOrder` control
(Segmented or reorderable) in Detailed mode. Accessible label: `"Withdrawal order"`.

- [ ] **Step 8: Accessible-label check + full suite + commit (opus review gate).**

```jsx
it("exposes the withdrawal-order control", () => {
  render(<RetirementCalculator />);
  expect(screen.getByLabelText("Withdrawal order")).toBeInTheDocument();
});
```
Run: `pnpm test` → green. Commit:
```bash
git commit -m "feat(wave3): D1 three real buckets + tax-smart withdrawal ordering (re-baselines default headline net <OLD>→<NEW>)"
```
**Dispatch an opus spec+quality reviewer.** Require: (a) RED→GREEN evidence for the re-baseline;
(b) independent re-derivation that the headline move is the ordering effect, not a tax-engine fork;
(c) SINGLE-TAX-SOURCE verified in source (rows and `steadyState` use the same split+order);
(d) determinism intact (no dates/randomness added).

---

### Task 4: D2 — generalize surplus reinvest

> Today only a FORCED RMD above need reinvests its after-tax surplus into taxable. Generalize: ANY
> year guaranteed after-tax income exceeds need, reinvest the surplus into the taxable bucket. The RMD
> path already proves the mechanic — this lifts it to the general case.

**Files:**
- Modify: `src/finance/simulate.js` (after `solveWithdrawal`, before row push),
  `src/calculatorCore.test.js`, the cash-flow chart.

**Interfaces:**
- Consumes: the three-bucket model (Task 3).
- Produces: rows gain `reinvest: Math.round(surplusReinvested)` for the chart.

- [ ] **Step 1: Write the failing engine test.**

```js
// in src/calculatorCore.test.js
it("reinvests an after-tax guaranteed surplus into the taxable bucket", () => {
  // A scenario where SS+pension after tax exceeds the need in some retirement year:
  const s = { ...makeDefaultPlan(), targetPct: 0.10, contrib: 0 }; // low need → surplus years
  const { simChosen } = calculatePlan(s);
  const surplusRow = simChosen.rows.find((r) => r.reinvest > 0 && r.wd === 0);
  expect(surplusRow).toBeDefined();
  // The reinvested surplus increases the taxable bucket vs. the prior year (net of growth).
  expect(surplusRow.taxableBal).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm test -- src/calculatorCore.test.js -t reinvest` → FAIL
  (`reinvest` undefined on rows).

- [ ] **Step 3: Implement the general surplus path.**

In `simulate.js`, after the withdrawal/RMD block, when `wd === 0` (guaranteed income already covers
need) and `afterTaxBeforeWithdrawal > need`, reinvest:
```js
let reinvest = 0;
if (wd === 0) {
  const surplus = afterTaxBeforeWithdrawal - need;
  if (surplus > 0) { buckets.taxable += surplus; reinvest = surplus; }
}
```
Push `reinvest: Math.round(reinvest)` onto the row. (The RMD forced-surplus reinvest from Task 3
stays; this covers the no-withdrawal surplus case, the generalization the spec asks for.)

- [ ] **Step 4: Run to GREEN.** `pnpm test -- src/calculatorCore.test.js` → PASS. Golden test
  unchanged (the default has no surplus years at `targetPct 0.28`; verify it still passes).

- [ ] **Step 5: Cash-flow chart — show the retirement-year reinvest bar.**

Add a positive `reinvest` series (viridian) to the investments "flow" view so a drawdown-AND-reinvest
year is legible. Caption: "Years your guaranteed income exceeds need reinvest the surplus."

- [ ] **Step 6: Commit.**
```bash
git commit -m "feat(wave3): D2 generalize surplus reinvest — any guaranteed surplus year funds the taxable bucket"
```

---

### Task 5: Glidepath return model (opt-in)

> Extend `returns.js` with a `returnModel`: `"blended"` (default — today's single `realReturn`),
> `"byBucket"` (weight per-bucket returns by current balances), or `"glidepath"` (age-interpolated
> equity %, more equity early → more bonds near retirement). Monte Carlo still samples around the
> BLENDED mean so the variability band is unchanged (invariant 4).

**Files:**
- Modify: `src/finance/returns.js` + `src/finance/returns.test.js`, `src/finance/seams.js`
  (`yearReturn` delegates), `src/finance/monteCarlo.js`, `src/finance/plan.js`, a return-model UI
  control + `RetirementCalculator.*`. Add `RETURN_MODEL_DEFAULTS` + `GLIDEPATH_DEFAULTS` to
  `retirementData.js` (source-linked to `SOURCES.cfa6040`/`carson6040`).

**Interfaces:**
- Produces:
  - `blendedMean(i) -> number` — the scalar mean MC samples around (equals `i.realReturn` for
    blended; the equity/bond blend at the midpoint for glidepath; the balance-weighted mean for
    byBucket). Keeps MC's `mu = log(1+blendedMean)` shape.
  - `resolveYearReturn(i, y, ctx) -> number` — per-year deterministic return for the loop. `ctx`
    carries `{ yearsToRetire, totalAccumYears, buckets }` so glidepath/byBucket can resolve.
- Consumed by `seams.js#yearReturn` (deterministic) and `monteCarlo.js` (mean only).

- [ ] **Step 1: Write the failing test.**

```js
// src/finance/returns.test.js (append)
import { resolveYearReturn, blendedMean } from "./returns.js";

describe("returnModel", () => {
  it("blended mode returns the single realReturn", () => {
    expect(resolveYearReturn({ realReturn: 0.05, returnModel: { mode: "blended" } }, 3, {})).toBe(0.05);
  });
  it("glidepath interpolates equity from now → retirement", () => {
    const i = { returnModel: { mode: "glidepath", equityPctNow: 80, equityPctAtRetire: 40, equityReal: 0.065, bondReal: 0.02 } };
    // progress 0 (start): 80% equity → 0.8*0.065 + 0.2*0.02 = 0.056
    expect(resolveYearReturn(i, 0, { yearsToRetire: 10, totalAccumYears: 10 })).toBeCloseTo(0.056, 6);
    // progress 1 (at retirement): 40% equity → 0.4*0.065 + 0.6*0.02 = 0.038
    expect(resolveYearReturn(i, 10, { yearsToRetire: 0, totalAccumYears: 10 })).toBeCloseTo(0.038, 6);
  });
  it("byBucket weights per-bucket returns by balance", () => {
    const i = { returnModel: { mode: "byBucket", taxableReal: 0.04, deferredReal: 0.06, rothReal: 0.06 } };
    const r = resolveYearReturn(i, 0, { buckets: { taxable: 100000, deferred: 100000, roth: 0 } });
    expect(r).toBeCloseTo(0.05, 6);
  });
  it("blendedMean equals realReturn for blended (MC unchanged)", () => {
    expect(blendedMean({ realReturn: 0.05, returnModel: { mode: "blended" } })).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm test -- src/finance/returns.test.js` → FAIL.

- [ ] **Step 3: Implement `resolveYearReturn` + `blendedMean` in `returns.js`** (full code; default
  `mode` absent → blended → `i.realReturn`, preserving every existing caller). Add
  `RETURN_MODEL_DEFAULTS = { mode: "blended" }` and
  `GLIDEPATH_DEFAULTS = { equityPctNow: 80, equityPctAtRetire: 40, equityReal: 0.065, bondReal: 0.02 }`
  to `retirementData.js`, sourced to the 60/40 references.

- [ ] **Step 4: Delegate from `seams.js#yearReturn`.** Keep the `ssOpt.returns` (MC) and `ssOpt.stress`
  branches FIRST (they win), then fall through to `resolveYearReturn(i, y, ctx)` instead of
  `i.realReturn`. The loop passes `ctx = { yearsToRetire, totalAccumYears, buckets }`.

- [ ] **Step 5: MC samples the blended mean.** In `monteCarlo.js`, replace `mu = Math.log(1 +
  inp.realReturn)` with `mu = Math.log(1 + blendedMean(inp))`. The per-path `returns[]` still feed the
  deterministic loop via `ssOpt.returns` (so glidepath shape is averaged into the mean for MC — keep
  the variability band semantics unchanged; caption this simplification).

- [ ] **Step 6: UI control + plan.js normalization + accessible label.** Normalize `returnModel` in
  `buildPlanInputs` (`s.returnModel ?? RETURN_MODEL_DEFAULTS`). Add a "Return model" Segmented
  (Blended / By bucket / Glidepath) revealing the glidepath two-point inputs when selected. Label:
  `"Return model"`, `"Equity % now"`, `"Equity % at retirement"`. Caption with the 60/40 sources and
  "glidepath is opt-in; Monte Carlo samples around the blended mean".

- [ ] **Step 7: Full suite + commit.** Golden test unchanged (default `returnModel` blended). 
```bash
git commit -m "feat(wave3): glidepath/by-bucket return model (opt-in; MC samples the blended mean)"
```

---

### Task 6: E2 — Guyton-Klinger guardrails (opus review)

> New `finance/guardrails.js` + a `spendingStrategy: "fixed"|"guardrails"` toggle. When on, a running
> spending multiplier is trimmed when the withdrawal rate breaches the upper guardrail and raised
> below the lower one. Composes with the deterministic loop AND the MC runner; MC surfaces the
> distribution of REALIZED spending (not just balances). Defaults: ±20% bands, 10% adjustments
> (Decision 7). Opt-in — default `"fixed"` (invariant 4 + one-number default).

**Files:**
- Create: `src/finance/guardrails.js`, `src/finance/guardrails.test.js`,
  `src/components/charts/RealizedSpending.jsx`
- Modify: `src/finance/simulate.js` (apply the multiplier to `nonHousingBase` via the spend seam),
  `src/finance/monteCarlo.js` (capture realized spending), `src/components/steps/SpendingStrategy.jsx`,
  `RetirementCalculator.*`, `src/retirementData.js` (`GUARDRAIL_DEFAULTS`).

**Interfaces:**
- Produces:
  - `GUARDRAIL_DEFAULTS = { upperPct: 20, lowerPct: 20, cutPct: 10, raisePct: 10 }` (sourced).
  - `nextSpendingMultiplier({ multiplier, withdrawalRate, baseRate, bands }) -> { multiplier, breach }`
    — pure step function returning the carried-forward multiplier and a breach tag
    (`"cut"|"raise"|null`).
- Consumed by `simulate.js` (deterministic carry-forward across years) and `monteCarlo.js`
  (per-path carry-forward; each path applies its own adjustments).

- [ ] **Step 1: Write the failing pure-function test.**

```js
// src/finance/guardrails.test.js
import { describe, it, expect } from "vitest";
import { nextSpendingMultiplier, GUARDRAIL_DEFAULTS } from "./guardrails.js";

const bands = GUARDRAIL_DEFAULTS;
describe("Guyton-Klinger step", () => {
  it("trims spending when withdrawal rate breaches the upper guardrail", () => {
    // base 4%, upper = 4% * 1.2 = 4.8%; a 5.5% rate breaches → cut 10%
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.055, baseRate: 0.04, bands });
    expect(r.breach).toBe("cut");
    expect(r.multiplier).toBeCloseTo(0.9, 6);
  });
  it("raises spending below the lower guardrail", () => {
    // lower = 4% * 0.8 = 3.2%; a 2.5% rate → raise 10%
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.025, baseRate: 0.04, bands });
    expect(r.breach).toBe("raise");
    expect(r.multiplier).toBeCloseTo(1.1, 6);
  });
  it("holds inside the guardrails", () => {
    const r = nextSpendingMultiplier({ multiplier: 1, withdrawalRate: 0.04, baseRate: 0.04, bands });
    expect(r.breach).toBe(null);
    expect(r.multiplier).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure.** `pnpm test -- src/finance/guardrails.test.js` → FAIL.

- [ ] **Step 3: Implement `guardrails.js`** (pure step + `GUARDRAIL_DEFAULTS` re-export, sourced to
  `SOURCES.kitcesGuardrails`/`morningstarGuardrails`):

```js
import { GUARDRAIL_DEFAULTS as _D } from "../retirementData.js";
export const GUARDRAIL_DEFAULTS = _D;

// One Guyton-Klinger guardrail step. baseRate is the target withdrawal rate (i.swr).
// Upper guardrail = baseRate*(1+upperPct/100); lower = baseRate*(1-lowerPct/100).
export function nextSpendingMultiplier({ multiplier, withdrawalRate, baseRate, bands }) {
  const upper = baseRate * (1 + (bands.upperPct || 0) / 100);
  const lower = baseRate * (1 - (bands.lowerPct || 0) / 100);
  if (withdrawalRate >= upper) return { multiplier: multiplier * (1 - (bands.cutPct || 0) / 100), breach: "cut" };
  if (withdrawalRate <= lower) return { multiplier: multiplier * (1 + (bands.raisePct || 0) / 100), breach: "raise" };
  return { multiplier, breach: null };
}
```

Add `GUARDRAIL_DEFAULTS = { upperPct: 20, lowerPct: 20, cutPct: 10, raisePct: 10 }` to
`retirementData.js`.

- [ ] **Step 4: Run to GREEN.** `pnpm test -- src/finance/guardrails.test.js` → PASS.

- [ ] **Step 5: Wire the carry-forward multiplier into `simulate.js`.**

When `i.spendingStrategy === "guardrails"`, carry a `spendMult` across years (init `1`). Compute the
prior-year withdrawal rate (`wd / start-of-year balance`), step the multiplier via
`nextSpendingMultiplier`, and apply it to the discretionary base — pass a `spendMult` into
`spendingComponents` so it scales `nonHousingBase` (NEVER housing/healthcare floor; guardrails trim
discretionary spending). Default `"fixed"` skips this entirely (multiplier stays 1). Add an engine
test: a guardrail run differs from fixed only when a breach occurs, and the default (fixed) projection
is byte-identical to Task 4's.

- [ ] **Step 6: MC realized-spending distribution.** In `monteCarlo.js`, when guardrails are on,
  capture each path's realized average (or terminal) spend level and return
  `realizedSpending: { p10, p50, p90 }` alongside the balance fan. Each path carries its own
  multiplier (determinism preserved by the seed). Build `RealizedSpending.jsx` to render the
  distribution; caption "guardrails trade a higher starting spend for variability — each band is a
  percentile of realized spending across 1,000 paths".

- [ ] **Step 7: SpendingStrategy step UI + accessible labels.**

`Segmented` "Fixed need • Guardrails" + advanced band/adjustment inputs. Labels:
`"Spending strategy"`, `"Upper guardrail %"`, `"Lower guardrail %"`, `"Spending cut %"`,
`"Spending raise %"`. Wire into `RetirementCalculator.jsx`; add fields to `defaultPlan.js`
(`spendingStrategy:"fixed", guardrails:{...GUARDRAIL_DEFAULTS}`).

```jsx
it("exposes the spending-strategy control", () => {
  render(<RetirementCalculator />);
  expect(screen.getByLabelText("Spending strategy")).toBeInTheDocument();
});
```

- [ ] **Step 8: Full suite + commit (opus review gate).**
```bash
git commit -m "feat(wave3): E2 Guyton-Klinger guardrails (opt-in) + MC realized-spending distribution"
```
**Dispatch an opus reviewer.** Require: (a) determinism — guardrail MC reproducible under the fixed
seed; (b) the guardrail multiplier scales discretionary spend only (housing/floor untouched);
(c) default `"fixed"` leaves the deterministic projection unchanged (golden test green);
(d) realized-spending percentiles are computed from per-path carried multipliers, not post-hoc.

---

### Task 7: Austria net rate + docs reconcile + full CI gate

> Land Decision 6 (one-constant change) and reconcile docs. Controller verifies the whole gate.

**Files:**
- Modify: `src/retirementData.js` (`INTL_TAX.Austria.retireRate 0.0→0.05` + caption), `docs/prd.md`,
  `docs/use-cases.md`, `docs/sources.md`.

- [ ] **Step 1: Austria rate.** Change `INTL_TAX.Austria.retireRate` from `0.0` to `0.05`. Update the
  inline comment + `exposureNotes.residenceTaxed` to read "effective added rate modeled ~5% net of
  treaty/FTC here — verify with a cross-border specialist". If a test pins the Austria-scenario
  headline, re-baseline it with a `// Wave 3: Austria net-of-treaty 0→0.05 (verify)` comment and
  record before→after. (Default plan uses `spendBasis income`, flat path — confirm whether the
  default headline is affected; the default `retireLoc:"Austria"` flows through `addlTaxRate`, so
  re-check the golden test and re-baseline if it moves, with rationale.)

- [ ] **Step 2: Docs.** Reconcile `docs/prd.md` + `docs/use-cases.md` with the five Wave 3 features
  (contributions/limits, buckets/order, surplus reinvest, glidepath, guardrails) and the Austria
  caption. Add the new sources to `docs/sources.md`. Use padded-pipe tables (MD060).

- [ ] **Step 3: Controller full-gate verification.**
  Run: `pnpm lint && pnpm lint:md && pnpm typecheck && pnpm test && pnpm build && pnpm links`.
  All must be green. Record the final test count + the cumulative default-headline before→after
  (Task 0 baseline → Task 3 re-baseline → Task 7 Austria) in the ledger.

- [ ] **Step 4: Commit.**
```bash
git commit -m "feat(wave3): Austria net-of-treaty rate (0→0.05, verify) + docs reconcile; full gate green"
```

---

## Self-review (against design-spec §5 Wave 3 + kickoff)

- **A1/A2 multi-vehicle + 2026 limits + real raise** → Task 1 ✓ (CONTRIB_LIMITS_2026 source-linked,
  Simple/Detailed toggle, `realRaise` real). `tradFrac`-as-output → Task 2 ✓.
- **D1 three buckets + withdrawal order** → Task 3 ✓ (order-dependent ordinary share, RMD on deferred,
  SINGLE-TAX-SOURCE in `steadyState`, deliberate re-baseline, opus review).
- **D2 surplus reinvest** → Task 4 ✓ (generalizes the RMD mechanic).
- **Glidepath** → Task 5 ✓ (returns.js `returnModel`, MC samples blended mean, opt-in).
- **E2 guardrails** → Task 6 ✓ (guardrails.js, spendingStrategy toggle, MC realized-spending, opus
  review, opt-in).
- **Seams added** (design §4.1: buckets / contributions / spending-strategy) → buckets.js (T2/T3),
  contributions.js (T1), guardrails.js (T6) ✓.
- **Invariants** → real-dollar (realRaise real; no new nominal flow) ✓; one tax engine (D1 changes
  input only) ✓; single-tax-source (steadyState shares split+order) ✓; determinism (randomness stays
  in monteCarlo.js; guardrail MC seeded) ✓; planning-grade honesty (every constant dated/sourced/
  captioned) ✓; tests+docs lockstep (each task) ✓.
- **Carried follow-ups** → golden test (T0) ✓; re-baseline discipline (T3) ✓; Austria (T7) ✓.
  Minor docs limitations (keep-as-rental P&I-only, cost-of-living basis no work-loc switch,
  Greece/Italy intl retireRate 0) → folded into T7 docs reconcile.
- **Type consistency** → `byBucket {taxable,deferred,roth}`, `splitWithdrawal(...).ordinaryShare`,
  `seedBuckets`→buckets, `nextSpendingMultiplier`, `resolveYearReturn`/`blendedMean` names are used
  consistently across tasks.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-23-wave-3-engine-depth.md`. Recommended
execution: **subagent-driven-development** — fresh implementer per task (TDD, test-first), an
independent spec+quality reviewer per task (opus on T3 and T6), then a final whole-branch review;
ledger in `.superpowers/sdd/progress.md`; controller verifies the full gate before declaring the wave
done.
