# Investment Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated, risk/phase-aware investment fund recommendation feature: a new "Investments" wizard step (risk tolerance, accreditation attestation, an editable list of accounts) and a new "Investment Recommendations" report section (allocation tables + per-account breakdown), both built entirely on static, source-cited data — no runtime network calls.

**Architecture:** Two new pure/data modules (`src/investmentData.js`, `src/investmentAdvisor.js`) mirror the existing `retirementData.js` / `calculatorCore.js` split. Two new React components (`src/components/steps/Investments.jsx`, `src/components/results/InvestmentRecommendations.jsx`) follow the existing step/report component conventions exactly (same atoms, same `s`/`set` props, same array-of-records editing pattern already used for `properties`/`events`). Both new pieces are registered in the existing `stepRegistry.jsx` / `reportRegistry.jsx` factories — no changes to `WizardShell`, `ReportShell`, or the nav system.

**Tech Stack:** React 18 (function components, hooks), Vite, Vitest + React Testing Library, `lucide-react` icons. No new dependencies.

## Global Constraints

- No network/fetch calls anywhere in the shipped app — all fund data is static and lives in `src/investmentData.js`.
- Every fund entry must carry a real, verifiable citation URL (matches the app-wide rule: "when updating annual constants, cite the source in the data file and `docs/sources.md`").
- Follow the existing plan-state update pattern exactly: `set(key)(value)` for flat fields, the `add*/remove*/set*` array-of-records helper triplet (see `addProperty`/`removeProperty`/`setProperty` in `RetirementCalculator.jsx:96-101`) for `investmentAccounts`.
- All new UI must use the existing atoms (`Field`, `NumberInput`, `Select`, `Segmented`, `Section` from `src/components/atoms/index.jsx`) and theme tokens (`C`, `FONTS`, `inputStyle` from `src/components/theme.js`) — no new visual system.
- Aggressive-tier funds flagged `accreditedOnly: true` must never appear in a recommendation unless `s.accreditedInvestor === true` — no placeholder row, just omitted.
- Every new pure-logic module gets a colocated `*.test.js`; every new component gets a colocated `*.test.jsx`, following the RTL convention in `src/components/results/BridgeSummary.test.jsx` (render real data, assert on rendered text, no chart-layout assertions).
- `pnpm test` must pass after every task.

---

### Task 1: Curated fund dataset

**Files:**
- Create: `src/investmentData.js`
- Test: `src/investmentData.test.js`

**Interfaces:**
- Produces: `INVESTMENT_FUNDS` (array of fund objects, shape below), `ALLOCATION_SPLIT` (object keyed `[riskTolerance][phase] → { equity: number, bond: number }`, percentages summing to 100).
- Fund object shape: `{ id: string, name: string, ticker: string, provider: string, vehicle: string, category: string, assetClass: "equity"|"bond", annualizedReturn: number|null, returnBasis: string, expenseRatio: number|null, feeNote: string|null, minInvestment: number|null, riskTiers: string[], phases: string[], accreditedOnly: boolean, citation: string, signupUrl: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/investmentData.test.js`:

```js
import { describe, it, expect } from "vitest";
import { INVESTMENT_FUNDS, ALLOCATION_SPLIT } from "./investmentData.js";

describe("INVESTMENT_FUNDS", () => {
  it("has unique fund ids", () => {
    const ids = INVESTMENT_FUNDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cites every fund with an https source and a signup link", () => {
    for (const f of INVESTMENT_FUNDS) {
      expect(f.citation).toMatch(/^https:\/\//);
      expect(f.signupUrl).toMatch(/^https:\/\//);
    }
  });

  it("tags every fund with a non-empty assetClass, riskTiers, and phases", () => {
    for (const f of INVESTMENT_FUNDS) {
      expect(["equity", "bond"]).toContain(f.assetClass);
      expect(f.riskTiers.length).toBeGreaterThan(0);
      expect(f.phases.length).toBeGreaterThan(0);
    }
  });

  it("has at least one equity fund and one bond fund for every risk tier × phase combination", () => {
    const tiers = ["conservative", "moderate", "aggressive"];
    const phases = ["accumulation", "decumulation"];
    for (const tier of tiers) {
      for (const phase of phases) {
        const matching = INVESTMENT_FUNDS.filter(
          (f) => f.riskTiers.includes(tier) && f.phases.includes(phase) && !f.accreditedOnly
        );
        expect(matching.some((f) => f.assetClass === "equity")).toBe(true);
        expect(matching.some((f) => f.assetClass === "bond")).toBe(true);
      }
    }
  });
});

describe("ALLOCATION_SPLIT", () => {
  it("sums equity + bond to 100 for every risk tier × phase combination", () => {
    for (const tier of ["conservative", "moderate", "aggressive"]) {
      for (const phase of ["accumulation", "decumulation"]) {
        const split = ALLOCATION_SPLIT[tier][phase];
        expect(split.equity + split.bond).toBe(100);
      }
    }
  });

  it("increases equity share from conservative to aggressive within each phase", () => {
    expect(ALLOCATION_SPLIT.conservative.accumulation.equity).toBeLessThan(ALLOCATION_SPLIT.moderate.accumulation.equity);
    expect(ALLOCATION_SPLIT.moderate.accumulation.equity).toBeLessThan(ALLOCATION_SPLIT.aggressive.accumulation.equity);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/investmentData.test.js`
Expected: FAIL with "Failed to resolve import ./investmentData.js" (file doesn't exist yet).

- [ ] **Step 3: Write the dataset**

Create `src/investmentData.js`:

```js
/**
 * Curated investment fund dataset — static, source-cited, refreshed manually.
 * See docs/investment-data-refresh.md for the maintainer refresh process and
 * docs/sources.md (§21) for the full citation list. No runtime network calls.
 */

export const ALLOCATION_SPLIT = {
  conservative: {
    accumulation: { equity: 60, bond: 40 },
    decumulation: { equity: 40, bond: 60 },
  },
  moderate: {
    accumulation: { equity: 75, bond: 25 },
    decumulation: { equity: 55, bond: 45 },
  },
  aggressive: {
    accumulation: { equity: 85, bond: 15 },
    decumulation: { equity: 65, bond: 35 },
  },
};

export const INVESTMENT_FUNDS = [
  {
    id: "voo", name: "Vanguard S&P 500 ETF", ticker: "VOO", provider: "Vanguard", vehicle: "ETF",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.137, returnBasis: "5-yr annualized, 2026 research pass (Bankrate/Quartz)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.bankrate.com/investing/best-index-funds/",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/voo",
  },
  {
    id: "fxaix", name: "Fidelity 500 Index Fund", ticker: "FXAIX", provider: "Fidelity", vehicle: "Mutual Fund",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.135, returnBasis: "10-yr annualized, highest among S&P 500 index peers (Forbes, 2026)",
    expenseRatio: 0.00015, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.forbes.com/advisor/investing/best-index-funds/",
    signupUrl: "https://www.fidelity.com/mutual-funds/fidelity-fund-portfolios/overview",
  },
  {
    id: "swppx", name: "Schwab S&P 500 Index Fund", ticker: "SWPPX", provider: "Charles Schwab", vehicle: "Mutual Fund",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.137, returnBasis: "5-yr annualized, 2026 research pass (Bankrate/Quartz)",
    expenseRatio: 0.0002, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.bankrate.com/investing/best-index-funds/",
    signupUrl: "https://www.schwab.com/ira",
  },
  {
    id: "bnd", name: "Vanguard Total Bond Market ETF", ticker: "BND", provider: "Vanguard", vehicle: "ETF",
    category: "Bond Index", assetClass: "bond",
    annualizedReturn: 0.032, returnBasis: "5-yr annualized, Vanguard fund page (verify on refresh — bond yields move with rates)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://investor.vanguard.com/investment-products/etfs/profile/bnd",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/bnd",
  },
  {
    id: "vug", name: "Vanguard Growth ETF", ticker: "VUG", provider: "Vanguard", vehicle: "ETF",
    category: "Growth/Tech", assetClass: "equity",
    annualizedReturn: 0.177, returnBasis: "10-yr annualized, 2026 research pass (PortfoliosLab)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["moderate", "aggressive"], phases: ["accumulation"],
    accreditedOnly: false,
    citation: "https://portfolioslab.com/symbol/VUG",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vug",
  },
  {
    id: "qqq", name: "Invesco QQQ (Nasdaq-100)", ticker: "QQQ", provider: "Invesco", vehicle: "ETF",
    category: "Growth/Tech", assetClass: "equity",
    annualizedReturn: 0.216, returnBasis: "10-yr annualized, 2026 research pass (stockanalysis.com)",
    expenseRatio: 0.0018, feeNote: null, minInvestment: null,
    riskTiers: ["aggressive"], phases: ["accumulation"],
    accreditedOnly: false,
    citation: "https://stockanalysis.com/etf/qqq/",
    signupUrl: "https://www.invesco.com/qqq-etf/en/home.html",
  },
  {
    id: "arcc", name: "Ares Capital Corporation", ticker: "ARCC", provider: "Ares", vehicle: "BDC (exchange-traded)",
    category: "Private Credit (BDC)", assetClass: "bond",
    annualizedReturn: 0.12, returnBasis: "~10-yr annualized / since 2004 IPO, 2026 research pass (PortfoliosLab; Ares IR)",
    expenseRatio: null, feeNote: "Externally managed BDC — operating/incentive fees disclosed in ARCC's 10-K, not a fund expense ratio.",
    minInvestment: null,
    riskTiers: ["aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.arescapitalcorp.com/investor-relations",
    signupUrl: "https://www.arescapitalcorp.com",
  },
  {
    id: "bxpe", name: "Blackstone Private Equity Strategies", ticker: "BXPE", provider: "Blackstone",
    vehicle: "Evergreen fund (3(c)(7))", category: "Private Equity (accredited)", assetClass: "equity",
    annualizedReturn: 0.15, returnBasis: "Blackstone's PE business IRR since 1987 — firm-level, not this fund specifically (2026 research pass)",
    expenseRatio: null, feeNote: "~1.25% annual management fee plus a 12.5% performance fee above a 5% hurdle (per BXPE prospectus).",
    minInvestment: 25000,
    riskTiers: ["aggressive"], phases: ["accumulation"],
    accreditedOnly: true,
    citation: "https://www.blackstone.com/our-businesses/private-wealth-solutions/",
    signupUrl: "https://www.blackstone.com/our-businesses/private-wealth-solutions/",
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/investmentData.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/investmentData.js src/investmentData.test.js
git commit -m "feat: add curated investment fund dataset"
```

---

### Task 2: Pure recommendation logic

**Files:**
- Create: `src/investmentAdvisor.js`
- Test: `src/investmentAdvisor.test.js`

**Interfaces:**
- Consumes: `INVESTMENT_FUNDS`, `ALLOCATION_SPLIT` from `src/investmentData.js` (Task 1).
- Produces:
  - `derivePhase({ ageA, stopA, ageB, stopB }) → "accumulation" | "decumulation" | "both"`
  - `recommendFunds({ riskTolerance, phase, accreditedInvestor }) → Array<{ fund: object, targetPct: number }>` (sorted by `targetPct` descending)
  - `accountNote(account, recommendation) → string | null`
  - `allocateAccounts(accounts, recommendation) → Array<{ account: object, lines: Array<{ fund: object, amount: number }>, note: string | null }>` (skips accounts with balance ≤ 0)

- [ ] **Step 1: Write the failing test**

Create `src/investmentAdvisor.test.js`:

```js
import { describe, it, expect } from "vitest";
import { derivePhase, recommendFunds, accountNote, allocateAccounts } from "./investmentAdvisor.js";

describe("derivePhase", () => {
  it("returns accumulation when both spouses are still working", () => {
    expect(derivePhase({ ageA: 50, stopA: 65, ageB: 48, stopB: 62 })).toBe("accumulation");
  });

  it("returns decumulation when both spouses are retired", () => {
    expect(derivePhase({ ageA: 70, stopA: 65, ageB: 68, stopB: 62 })).toBe("decumulation");
  });

  it("returns both when one spouse is retired and the other is not", () => {
    expect(derivePhase({ ageA: 66, stopA: 65, ageB: 55, stopB: 62 })).toBe("both");
  });

  it("treats a spouse at exactly their stop age as retired", () => {
    expect(derivePhase({ ageA: 65, stopA: 65, ageB: 62, stopB: 62 })).toBe("decumulation");
  });
});

describe("recommendFunds", () => {
  it("returns target percentages that sum to 100 for every risk tier × phase combination", () => {
    for (const riskTolerance of ["conservative", "moderate", "aggressive"]) {
      for (const phase of ["accumulation", "decumulation"]) {
        const rec = recommendFunds({ riskTolerance, phase, accreditedInvestor: false });
        const total = rec.reduce((a, r) => a + r.targetPct, 0);
        expect(total).toBeCloseTo(100, 5);
      }
    }
  });

  it("excludes accredited-only funds when accreditedInvestor is false", () => {
    const rec = recommendFunds({ riskTolerance: "aggressive", phase: "accumulation", accreditedInvestor: false });
    expect(rec.some((r) => r.fund.id === "bxpe")).toBe(false);
  });

  it("includes accredited-only funds when accreditedInvestor is true", () => {
    const rec = recommendFunds({ riskTolerance: "aggressive", phase: "accumulation", accreditedInvestor: true });
    expect(rec.some((r) => r.fund.id === "bxpe")).toBe(true);
  });

  it("never recommends a growth/tech-only fund for the conservative tier", () => {
    const rec = recommendFunds({ riskTolerance: "conservative", phase: "accumulation", accreditedInvestor: true });
    expect(rec.some((r) => r.fund.id === "qqq")).toBe(false);
  });
});

describe("accountNote", () => {
  const bondHeavyRec = [
    { fund: { assetClass: "bond" }, targetPct: 40 },
    { fund: { assetClass: "equity" }, targetPct: 60 },
  ];
  const equityOnlyRec = [{ fund: { assetClass: "equity" }, targetPct: 100 }];

  it("flags taxable accounts holding bond funds", () => {
    const note = accountNote({ type: "taxable" }, bondHeavyRec);
    expect(note).toMatch(/tax-advantaged/i);
  });

  it("returns null for tax-advantaged accounts", () => {
    expect(accountNote({ type: "401k" }, bondHeavyRec)).toBeNull();
  });

  it("returns null for taxable accounts with no bond funds in the recommendation", () => {
    expect(accountNote({ type: "taxable" }, equityOnlyRec)).toBeNull();
  });
});

describe("allocateAccounts", () => {
  const rec = [
    { fund: { id: "voo" }, targetPct: 60 },
    { fund: { id: "bnd" }, targetPct: 40 },
  ];

  it("splits each account's balance across the recommendation, summing back to the balance", () => {
    const [result] = allocateAccounts([{ id: "a1", name: "401k", type: "401k", balance: 10000 }], rec);
    const total = result.lines.reduce((a, l) => a + l.amount, 0);
    expect(total).toBeCloseTo(10000, 5);
    expect(result.lines.find((l) => l.fund.id === "voo").amount).toBeCloseTo(6000, 5);
    expect(result.lines.find((l) => l.fund.id === "bnd").amount).toBeCloseTo(4000, 5);
  });

  it("excludes accounts with a zero or negative balance", () => {
    const result = allocateAccounts(
      [{ id: "a1", name: "Empty", type: "taxable", balance: 0 }, { id: "a2", name: "Negative", type: "taxable", balance: -500 }],
      rec
    );
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when there are no accounts", () => {
    expect(allocateAccounts([], rec)).toHaveLength(0);
    expect(allocateAccounts(undefined, rec)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/investmentAdvisor.test.js`
Expected: FAIL with "Failed to resolve import ./investmentAdvisor.js"

- [ ] **Step 3: Write the minimal implementation**

Create `src/investmentAdvisor.js`:

```js
import { INVESTMENT_FUNDS, ALLOCATION_SPLIT } from "./investmentData.js";

/**
 * Derives the household's investment phase from existing plan ages/stop-ages
 * (no new input — see step 3 "Timing"). "both" covers the retirement-transition
 * year, when one spouse has stopped working and the other has not.
 */
export function derivePhase({ ageA, stopA, ageB, stopB }) {
  const retiredA = ageA >= stopA;
  const retiredB = ageB >= stopB;
  if (retiredA && retiredB) return "decumulation";
  if (!retiredA && !retiredB) return "accumulation";
  return "both";
}

/**
 * Recommends funds for a risk tier × phase, split evenly within each asset
 * class per ALLOCATION_SPLIT. Not an optimizer — a simple, auditable rule.
 */
export function recommendFunds({ riskTolerance, phase, accreditedInvestor }) {
  const split = ALLOCATION_SPLIT[riskTolerance][phase];
  const eligible = INVESTMENT_FUNDS.filter(
    (f) => f.riskTiers.includes(riskTolerance) && f.phases.includes(phase) && (!f.accreditedOnly || accreditedInvestor)
  );
  const equityFunds = eligible.filter((f) => f.assetClass === "equity");
  const bondFunds = eligible.filter((f) => f.assetClass === "bond");

  const equityRows = equityFunds.map((fund) => ({ fund, targetPct: split.equity / equityFunds.length }));
  const bondRows = bondFunds.map((fund) => ({ fund, targetPct: split.bond / bondFunds.length }));

  return [...equityRows, ...bondRows].sort((a, b) => b.targetPct - a.targetPct);
}

/** Tax-efficiency note: bond/income funds are generally better held tax-advantaged. */
export function accountNote(account, recommendation) {
  const hasBond = recommendation.some((r) => r.fund.assetClass === "bond" && r.targetPct > 0);
  if (account.type === "taxable" && hasBond) {
    return "Consider holding bond/income funds in tax-advantaged accounts rather than taxable.";
  }
  return null;
}

/** Balance-weighted dollar allocation of each account across a recommendation. */
export function allocateAccounts(accounts, recommendation) {
  return (accounts || [])
    .filter((a) => Number(a.balance) > 0)
    .map((account) => ({
      account,
      lines: recommendation.map((r) => ({
        fund: r.fund,
        amount: (Number(account.balance) || 0) * (r.targetPct / 100),
      })),
      note: accountNote(account, recommendation),
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/investmentAdvisor.test.js`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add src/investmentAdvisor.js src/investmentAdvisor.test.js
git commit -m "feat: add risk/phase-aware fund recommendation logic"
```

---

### Task 3: Plan state — risk tolerance, accreditation, accounts

**Files:**
- Modify: `src/defaultPlan.js`
- Modify: `src/defaultPlan.test.js`

**Interfaces:**
- Produces: `DEFAULT_PLAN.riskTolerance` (`"moderate"`), `DEFAULT_PLAN.accreditedInvestor` (`false`), `DEFAULT_PLAN.investmentAccounts` (`[]`) — available on every plan object from `makeDefaultPlan()`.

- [ ] **Step 1: Write the failing test**

Append to `src/defaultPlan.test.js`:

```js
describe("default plan — investment recommendation fields", () => {
  it("defaults to moderate risk, no accreditation, and no accounts", () => {
    const plan = makeDefaultPlan();
    expect(plan.riskTolerance).toBe("moderate");
    expect(plan.accreditedInvestor).toBe(false);
    expect(plan.investmentAccounts).toEqual([]);
  });

  it("gives each makeDefaultPlan() call its own investmentAccounts array", () => {
    const a = makeDefaultPlan();
    const b = makeDefaultPlan();
    a.investmentAccounts.push({ id: "x", name: "Test", type: "taxable", balance: 100 });
    expect(b.investmentAccounts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/defaultPlan.test.js`
Expected: FAIL — `plan.riskTolerance` is `undefined`, not `"moderate"`.

- [ ] **Step 3: Add the fields**

In `src/defaultPlan.js`, add to the `DEFAULT_PLAN` object literal (after the `guardrails` line):

```js
  guardrails: { ...GUARDRAIL_DEFAULTS },
  // Investment recommendations feature: risk tolerance drives which curated
  // funds are shown; accreditedInvestor is a self-attestation that unlocks
  // accreditedOnly funds; investmentAccounts is the editable account list
  // used for the per-account allocation breakdown.
  riskTolerance: "moderate",
  accreditedInvestor: false,
  investmentAccounts: [],
```

And in `makeDefaultPlan()`, add a clone line (after the `guardrails` clone line) so state edits never mutate the constant:

```js
  guardrails: { ...DEFAULT_PLAN.guardrails },
  investmentAccounts: DEFAULT_PLAN.investmentAccounts.map((a) => ({ ...a })),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/defaultPlan.test.js`
Expected: PASS (all tests, including the pre-existing golden-headline test — unaffected since these fields aren't read by `calculatorCore.js`).

- [ ] **Step 5: Commit**

```bash
git add src/defaultPlan.js src/defaultPlan.test.js
git commit -m "feat: add investment recommendation fields to the default plan"
```

---

### Task 4: Investments wizard step

**Files:**
- Create: `src/components/steps/Investments.jsx`
- Test: `src/components/steps/Investments.test.jsx`
- Modify: `src/nav/stepRegistry.jsx`
- Modify: `RetirementCalculator.jsx`

**Interfaces:**
- Consumes: `Field`, `NumberInput`, `Select`, `Segmented`, `Section` from `src/components/atoms/index.jsx`; `C`, `inputStyle` from `src/components/theme.js`.
- Produces: `Investments({ s, set, addAccount, removeAccount, setAccount })` component. `addAccount()`, `removeAccount(idx)`, `setAccount(idx, field)(value)` helpers added to `RetirementCalculator.jsx` and threaded through `ctx` (same triplet pattern as `addProperty`/`removeProperty`/`setProperty`).

- [ ] **Step 1: Write the failing test**

Create `src/components/steps/Investments.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Investments } from "./Investments.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

function setup(overrides = {}) {
  const s = { ...makeDefaultPlan(), ...overrides };
  const set = vi.fn((key) => vi.fn());
  const addAccount = vi.fn();
  const removeAccount = vi.fn();
  const setAccount = vi.fn(() => vi.fn());
  render(<Investments s={s} set={set} addAccount={addAccount} removeAccount={removeAccount} setAccount={setAccount} />);
  return { set, addAccount, removeAccount, setAccount };
}

describe("Investments step", () => {
  it("renders the risk tolerance options with moderate active by default", () => {
    setup();
    const moderate = screen.getByRole("button", { name: "Moderate" });
    expect(moderate).toHaveAttribute("aria-pressed", "true");
  });

  it("does not show the accreditation checkbox at moderate risk", () => {
    setup();
    expect(screen.queryByLabelText(/accredited investor/i)).not.toBeInTheDocument();
  });

  it("shows the accreditation checkbox when risk tolerance is aggressive", () => {
    setup({ riskTolerance: "aggressive" });
    expect(screen.getByLabelText(/accredited investor/i)).toBeInTheDocument();
  });

  it("renders an existing account's fields", () => {
    setup({ investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }] });
    expect(screen.getByDisplayValue("Fidelity 401(k)")).toBeInTheDocument();
  });

  it("calls addAccount when the add-account button is clicked", () => {
    const { addAccount } = setup();
    fireEvent.click(screen.getByRole("button", { name: /add account/i }));
    expect(addAccount).toHaveBeenCalledTimes(1);
  });

  it("calls removeAccount with the account's index when its remove button is clicked", () => {
    const { removeAccount } = setup({
      investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }],
    });
    fireEvent.click(screen.getByRole("button", { name: /remove account/i }));
    expect(removeAccount).toHaveBeenCalledWith(0);
  });

  it("shows a message when there are no accounts yet", () => {
    setup({ investmentAccounts: [] });
    expect(screen.getByText(/no accounts yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/steps/Investments.test.jsx`
Expected: FAIL with "Failed to resolve import ./Investments.jsx"

- [ ] **Step 3: Write the component**

Create `src/components/steps/Investments.jsx`:

```jsx
import { Field, NumberInput, Segmented, Select, Section } from "../atoms/index.jsx";
import { C, inputStyle } from "../theme.js";

const RISK_OPTIONS = [
  { label: "Conservative", value: "conservative" },
  { label: "Moderate", value: "moderate" },
  { label: "Aggressive", value: "aggressive" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { label: "401(k)", value: "401k" },
  { label: "403(b)", value: "403b" },
  { label: "Traditional IRA", value: "traditional_ira" },
  { label: "Roth IRA", value: "roth_ira" },
  { label: "Taxable brokerage", value: "taxable" },
  { label: "HSA", value: "hsa" },
];

/**
 * Step eleven — Investments. Risk tolerance and an optional accredited-investor
 * self-attestation (aggressive tier only) drive which curated funds the report
 * recommends; the account list drives the per-account allocation breakdown.
 * Everything here is optional — an empty account list still produces allocation
 * guidance in the report, just without a per-account table.
 *
 * @param {{ s: object, set: function, addAccount: function, removeAccount: function, setAccount: function }} props
 */
export function Investments({ s, set, addAccount, removeAccount, setAccount }) {
  const accounts = s.investmentAccounts || [];

  return (
    <Section eyebrow="Step eleven" title="Investments">
      <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5, marginBottom: 14 }}>
        Risk tolerance and your account list drive the curated fund recommendations in the
        report — a separate set for while you're still working and for once you've retired.
      </div>

      <Field label="Risk tolerance" hint="Aggressive unlocks growth/tech funds and, with accreditation, private-market options.">
        <Segmented aria-label="Risk tolerance" value={s.riskTolerance} onChange={set("riskTolerance")} options={RISK_OPTIONS} />
      </Field>

      {s.riskTolerance === "aggressive" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12.5, color: C.slate, cursor: "pointer" }}>
          <input
            type="checkbox"
            aria-label="I'm an accredited investor"
            checked={!!s.accreditedInvestor}
            onChange={(e) => set("accreditedInvestor")(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer" }}
          />
          I'm an accredited investor ($1M net worth excluding primary residence, or $200k+ income)
        </label>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Investment accounts (optional)</div>

      {accounts.length === 0 && (
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          No accounts yet. Add one to see a per-account allocation breakdown in the report.
        </div>
      )}

      {accounts.map((a, idx) => (
        <div key={a.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", marginBottom: 12, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              aria-label="Account name"
              value={a.name}
              onChange={(ev) => setAccount(idx, "name")(ev.target.value)}
              style={{ ...inputStyle, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13.5, flex: 1 }}
            />
            <button
              type="button"
              aria-label="Remove account"
              onClick={() => removeAccount(idx)}
              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.slate, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div className="rc-inputs">
            <Field label="Account type">
              <Select aria-label="Account type" value={a.type} onChange={setAccount(idx, "type")} options={ACCOUNT_TYPE_OPTIONS} />
            </Field>
            <Field label="Balance">
              <NumberInput aria-label="Account balance" value={a.balance} onChange={setAccount(idx, "balance")} prefix="$" min={0} />
            </Field>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addAccount}
        style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, borderRadius: 9, padding: "10px", color: C.slate, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        + Add account
      </button>

      <p style={{ fontSize: 11, color: C.mut, lineHeight: 1.5, margin: "14px 0 0" }}>
        Educational only — not financial advice. Return figures are historical and cited in the
        report; past performance does not guarantee future results.
      </p>
    </Section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/steps/Investments.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Wire the account helpers into `RetirementCalculator.jsx`**

In `RetirementCalculator.jsx`, add after the `propSeq`/`setProperty` block (around line 101):

```js
  // Investment accounts — editable list (add / remove / edit), same pattern as properties.
  const acctSeq = useRef(0);
  const addAccount = () =>
    set("investmentAccounts")([...(s.investmentAccounts || []), { id: `acct-${acctSeq.current++}`, name: "New account", type: "taxable", balance: 0 }]);
  const removeAccount = (idx) => set("investmentAccounts")((s.investmentAccounts || []).filter((_, i) => i !== idx));
  const setAccount = (idx, field) => (v) =>
    set("investmentAccounts")((s.investmentAccounts || []).map((a, i) => (i === idx ? { ...a, [field]: v } : a)));
```

In the `ctx` object (around line 162), add after `addProperty, removeProperty, setProperty,`:

```js
    addAccount, removeAccount, setAccount,
```

- [ ] **Step 6: Register the step in `stepRegistry.jsx`**

In `src/nav/stepRegistry.jsx`, add the import (after the `Advanced` import):

```js
import { Investments } from "../components/steps/Investments.jsx";
```

Add the step entry as the new last entry in the returned array (after the `advanced` step):

```js
    { id: "investments", num: 11, title: "Investments", render: () => <Investments s={s} set={set} addAccount={ctx.addAccount} removeAccount={ctx.removeAccount} setAccount={ctx.setAccount} /> },
```

- [ ] **Step 7: Run the full suite and verify nothing broke**

Run: `pnpm test`
Expected: PASS — all existing tests plus the 7 new `Investments.test.jsx` tests.

- [ ] **Step 8: Commit**

```bash
git add src/components/steps/Investments.jsx src/components/steps/Investments.test.jsx src/nav/stepRegistry.jsx RetirementCalculator.jsx
git commit -m "feat: add Investments wizard step"
```

---

### Task 5: Investment Recommendations report section

**Files:**
- Create: `src/components/results/InvestmentRecommendations.jsx`
- Test: `src/components/results/InvestmentRecommendations.test.jsx`
- Modify: `src/nav/reportRegistry.jsx`

**Interfaces:**
- Consumes: `derivePhase`, `recommendFunds`, `allocateAccounts` from `src/investmentAdvisor.js` (Task 2); `C`, `FONTS` from `src/components/theme.js`; `usd0` from `src/components/format.js`.
- Produces: `InvestmentRecommendations({ s })` component, self-contained like `InheritanceResult` — computes phase and recommendations internally from `s`.

- [ ] **Step 1: Write the failing test**

Create `src/components/results/InvestmentRecommendations.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvestmentRecommendations } from "./InvestmentRecommendations.jsx";
import { makeDefaultPlan } from "../../defaultPlan.js";

describe("InvestmentRecommendations", () => {
  it("shows the accumulation heading and a moderate-tier fund when still working", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.getByText("VOO")).toBeInTheDocument();
  });

  it("shows both phase headings during the retirement-transition year", () => {
    const s = { ...makeDefaultPlan(), ageA: 66, stopA: 65, ageB: 55, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/accumulation/i)).toBeInTheDocument();
    expect(screen.getByText(/decumulation/i)).toBeInTheDocument();
  });

  it("omits accredited-only funds when accreditedInvestor is false", () => {
    const s = { ...makeDefaultPlan(), riskTolerance: "aggressive", accreditedInvestor: false, ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.queryByText("BXPE")).not.toBeInTheDocument();
  });

  it("includes accredited-only funds when accreditedInvestor is true", () => {
    const s = { ...makeDefaultPlan(), riskTolerance: "aggressive", accreditedInvestor: true, ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText("BXPE")).toBeInTheDocument();
  });

  it("shows a per-account breakdown when accounts are present", () => {
    const s = {
      ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62,
      investmentAccounts: [{ id: "a1", name: "Fidelity 401(k)", type: "401k", balance: 50000 }],
    };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText("Fidelity 401(k)")).toBeInTheDocument();
  });

  it("shows a fallback message when there are no accounts", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62, investmentAccounts: [] };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/add accounts/i)).toBeInTheDocument();
  });

  it("always renders the planning-grade disclaimer", () => {
    const s = { ...makeDefaultPlan(), ageA: 50, stopA: 65, ageB: 48, stopB: 62 };
    render(<InvestmentRecommendations s={s} />);
    expect(screen.getByText(/not a fiduciary recommendation/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/results/InvestmentRecommendations.test.jsx`
Expected: FAIL with "Failed to resolve import ./InvestmentRecommendations.jsx"

- [ ] **Step 3: Write the component**

Create `src/components/results/InvestmentRecommendations.jsx`:

```jsx
import { C } from "../theme.js";
import { usd0 } from "../format.js";
import { derivePhase, recommendFunds, allocateAccounts } from "../../investmentAdvisor.js";

const PHASE_LABEL = { accumulation: "Accumulation (while working)", decumulation: "Decumulation (in retirement)" };

function AllocationTable({ recommendation }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14 }}>
      <thead>
        <tr>
          {["Fund", "Vehicle", "Target %", "Source"].map((h) => (
            <th key={h} style={{ textAlign: h === "Target %" ? "right" : "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {recommendation.map(({ fund, targetPct }) => (
          <tr key={fund.id}>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{fund.ticker}</span> · {fund.name}
            </td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>{fund.vehicle}</td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>
              {targetPct.toFixed(0)}%
            </td>
            <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>
              <a href={fund.citation} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontSize: 11 }}>{fund.returnBasis}</a>
              <br />
              <a href={fund.signupUrl} target="_blank" rel="noreferrer" style={{ color: C.brassDeep, fontWeight: 700, fontSize: 11 }}>Get started ↗</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AccountBreakdown({ accounts, recommendation }) {
  const allocations = allocateAccounts(accounts, recommendation);
  if (!allocations.length) {
    return <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>Add accounts in the Investments step to see a per-account breakdown.</div>;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 14 }}>
      <thead>
        <tr>
          {["Account", "Fund", "Amount", "Note"].map((h) => (
            <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, color: C.mut, fontWeight: 600, padding: "6px 8px", borderBottom: `1px solid ${C.line}` }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {allocations.flatMap(({ account, lines, note }) =>
          lines.map((line, i) => (
            <tr key={`${account.id}-${line.fund.id}`}>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}` }}>{i === 0 ? account.name : ""}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, fontFamily: "'JetBrains Mono',monospace" }}>{line.fund.ticker}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }}>{usd0(line.amount)}</td>
              <td style={{ padding: "7px 8px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.mut }}>{i === 0 ? note ?? "—" : ""}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/**
 * Investment Recommendations — self-contained report section. Derives the
 * household's phase from existing plan ages (no new input), recommends
 * curated funds per risk tier × phase, and renders a per-account breakdown
 * when the user entered accounts in the Investments step.
 *
 * @param {{ s: object }} props
 */
export function InvestmentRecommendations({ s }) {
  const phase = derivePhase(s);
  const phases = phase === "both" ? ["accumulation", "decumulation"] : [phase];
  const riskTolerance = s.riskTolerance || "moderate";
  const accreditedInvestor = !!s.accreditedInvestor;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Investment recommendations</div>
      <h3 style={{ margin: "2px 0 10px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19, color: C.ink }}>
        Curated funds for your risk tolerance and phase
      </h3>

      <div role="note" style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${C.clay}` }}>
        Planning-grade, not advice-grade. Not a fiduciary recommendation. Past performance does not guarantee future results.
      </div>

      {riskTolerance === "aggressive" && !accreditedInvestor && (
        <div role="note" style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${C.brass}` }}>
          Some aggressive-tier options require accredited-investor status — check the box on the Investments step to include them.
        </div>
      )}

      {phases.map((p) => {
        const recommendation = recommendFunds({ riskTolerance, phase: p, accreditedInvestor });
        return (
          <div key={p} style={{ marginBottom: 18 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 600, color: C.ink }}>{PHASE_LABEL[p]}</h4>
            <AllocationTable recommendation={recommendation} />
            <AccountBreakdown accounts={s.investmentAccounts} recommendation={recommendation} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/results/InvestmentRecommendations.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Register the section in `reportRegistry.jsx`**

In `src/nav/reportRegistry.jsx`, update the icon import line to add `Wallet`:

```js
import { Gauge, TrendingUp, PieChart, Landmark, ShieldAlert, BookOpen, Home, Wallet } from "lucide-react";
```

Add the component import after the `DualTaxExposure` import:

```js
import { InvestmentRecommendations } from "../components/results/InvestmentRecommendations.jsx";
```

Insert a new section between `portfolio` (num 3) and `taxes`, and renumber every section from `taxes` onward (+1). The full returned array becomes:

```js
  return [
    {
      id: "verdict", num: 1, title: "Verdict", icon: Gauge,
      render: () => (
        <>
          <HeadroomCard headroom={ctx.headroom} horizon={ctx.horizon} />
          <Stats steady={ctx.steady} simSS={ctx.simSS} simNo={ctx.simNo} horizon={ctx.horizon} swr={s.swr} />
        </>
      ),
    },
    {
      id: "income", num: 2, title: "Income", icon: TrendingUp,
      render: () => (
        <>
          <Staircase
            compRows={ctx.compRows} benefitsOnAge={ctx.steady.startAgeA} depAge={ctx.simSS.depAge} floorAtDep={ctx.floorAtDep} needAtDep={ctx.needAtDep}
            hasRental={ctx.hasRental} pensionOn={s.pensionOn} spendBasis={s.spendBasis} retireLoc={s.retireLoc}
            onRetireLocChange={ctx.set("retireLoc")} ageA={s.ageA} onYbyOpen={ctx.setYbyOpen} onSelectYear={ctx.setSelYear}
            compTip={ctx.compTip} spendingShape={s.spendingShape} housing={s.housing} relocationYear={s.relocationYear} workLoc={s.workLoc}
            printWidth={ctx.printWidth}
          />
          <IncomeMix incomeStack={ctx.incomeStack} steadyGross={ctx.steady.gross} />
          <ClaimTiming s={s} rows={ctx.simSS.rows} steadyNet={ctx.steady.net} printWidth={ctx.printWidth} />
          <YearByYear
            rows={ctx.simSS.rows} depAge={ctx.depAge} inputs={s} selYear={ctx.selYear} onYearChange={ctx.setSelYear}
            playing={ctx.playing} onSetPlaying={ctx.setPlaying} view={ctx.ybyView} onViewChange={ctx.setYbyView}
            open={ctx.ybyOpen} onToggleOpen={() => ctx.setYbyOpen((o) => !o)} printWidth={ctx.printWidth}
          />
        </>
      ),
    },
    {
      id: "portfolio", num: 3, title: "Portfolio", icon: PieChart,
      render: () => (
        <>
          {ctx.yearsToRet > 0 && <AccumulationSummary accumulation={ctx.accumulation} retYear={ctx.retYear} />}
          <BridgeSummary rows={ctx.simSS.rows} steadyStartAge={ctx.steady.startAgeA} />
          <PortfolioFlows
            invRows={ctx.invRows} firstRmdAge={ctx.firstRmdAge} view={ctx.invView} onViewChange={ctx.setInvView}
            withdrawalOrder={s.withdrawalOrder} onWithdrawalOrderChange={ctx.set("withdrawalOrder")} printWidth={ctx.printWidth}
          />
          <LongRun
            balRows={ctx.balRows} sellDots={ctx.sellDots} mc={ctx.mc} mcRunning={ctx.mcRunning} onRunMc={ctx.runMc}
            horizon={ctx.horizon} ssMode={s.ssMode} effHaircut={ctx.effHaircut} mcSummaryLines={ctx.mcSummaryLines}
            showStress={s.showStress} hasShock={ctx.hasEmergent} printWidth={ctx.printWidth}
          />
          <RealizedSpending realizedSpending={ctx.mc?.realizedSpending ?? null} />
        </>
      ),
    },
    {
      id: "investmentRecommendations", num: 4, title: "Investment Recommendations", icon: Wallet,
      render: () => <InvestmentRecommendations s={s} />,
    },
    {
      id: "taxes", num: 5, title: "Taxes & Location", icon: Landmark,
      render: () => (
        <>
          <DualTaxExposure
            s={s}
            steadyIncomeMix={{
              ss: ctx.steady.ssHouse,
              ssTaxablePortion: ctx.steady.taxDetails?.taxableSocialSecurity,
              pension: ctx.steady.pension,
              deferredWithdrawal: ctx.steady.wd * (s.tradFrac || 0.7),
            }}
          />
          <Places
            locRows={ctx.locRows} steadyNet={ctx.steady.net} couple={ctx.couple} onCoupleChange={ctx.setCouple}
            stage={ctx.stage} onStageChange={ctx.setStage} openLoc={ctx.openLoc} onToggle={ctx.setOpenLoc}
            sFactor={ctx.sFactor} retYear={ctx.retYear} inflFactor={ctx.inflFactor} inflation={s.inflation}
            yearsToRet={ctx.yearsToRet} stateCode={s.stateCode} retireLoc={s.retireLoc}
            steadyIncomeMix={{
              ss: ctx.steady.ssHouse,
              ssTaxablePortion: ctx.steady.taxDetails?.taxableSocialSecurity,
              pension: ctx.steady.pension,
              deferredWithdrawal: ctx.steady.wd * (s.tradFrac || 0.7),
            }}
          />
          <Compare
            cmpA={ctx.cmpA} cmpB={ctx.cmpB} onPickA={ctx.setCmpA} onPickB={ctx.setCmpB} stage={ctx.stage}
            couple={ctx.couple} sFactor={ctx.sFactor} steadyNet={ctx.steady.net} inflFactor={ctx.inflFactor} retYear={ctx.retYear}
          />
        </>
      ),
    },
    {
      id: "estate", num: 6, title: "Estate", icon: Home,
      render: () => <InheritanceResult s={s} setProperty={ctx.setProperty} />,
    },
    {
      id: "risks", num: 7, title: "Risks", icon: ShieldAlert,
      render: () => (
        <RiskTable
          sFull={ctx.sFull} sTrust={ctx.sTrust} sNone={ctx.sNone} simFull={ctx.simFull} simTrust={ctx.simTrust}
          simNone={ctx.simNone} s={s} effHaircut={ctx.effHaircut} horizon={ctx.horizon}
        />
      ),
    },
    { id: "reference", num: 8, title: "Reference", icon: BookOpen, render: () => <ReferenceSection s={s} /> },
  ];
```

- [ ] **Step 6: Run the full suite and verify nothing broke**

Run: `pnpm test`
Expected: PASS — all existing tests plus the 7 new `InvestmentRecommendations.test.jsx` tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/results/InvestmentRecommendations.jsx src/components/results/InvestmentRecommendations.test.jsx src/nav/reportRegistry.jsx
git commit -m "feat: add Investment Recommendations report section"
```

---

### Task 6: Maintainer refresh workflow + source citations

**Files:**
- Create: `docs/investment-data-refresh.md`
- Modify: `docs/sources.md`

**Interfaces:**
- None (documentation only — no code interfaces).

- [ ] **Step 1: Write the maintainer refresh doc**

Create `docs/investment-data-refresh.md`:

```markdown
# Refreshing `src/investmentData.js`

`INVESTMENT_FUNDS` and `ALLOCATION_SPLIT` in `src/investmentData.js` are static,
curated data — the app makes no runtime network calls. Refresh them periodically
(annually, or when a cited return figure looks stale) using this process.

## 1. Research prompt template

Hand this to a research agent (or run it yourself with web search), filling in
the bracketed criteria:

> Research publicly-available investment funds meeting these criteria:
> [e.g. "5–10 year annualized returns of 10%+, expense ratio under 0.5%,
> available through a major US retail brokerage without special
> accreditation"]. For each fund, report: id (lowercase-ticker), name, ticker,
> provider, vehicle (ETF/mutual fund/BDC/evergreen fund/etc.), category,
> assetClass ("equity" or "bond"), annualizedReturn (decimal, e.g. 0.137 for
> 13.7%), returnBasis (the exact period and source, e.g. "5-yr annualized,
> Bankrate 2027"), expenseRatio (decimal or null if not applicable — explain
> in feeNote), feeNote (string or null), minInvestment (number or null),
> riskTiers (array of "conservative"/"moderate"/"aggressive" — which tiers
> this fund fits), phases (array of "accumulation"/"decumulation"),
> accreditedOnly (boolean), citation (a working https URL to the source),
> signupUrl (a working https URL to open an account or buy the fund). Output
> as a JSON array matching this exact shape.

Run it separately for each risk tier you're refreshing (conservative /
moderate / aggressive), and separately for any accredited-investor-only
private-markets tier, since those carry materially different risk/liquidity
disclosures.

## 2. Validate with brutal-honesty-review before merging

Before updating `investmentData.js`, run the candidate output through the
`brutal-honesty-review` skill (or an agentic-qe validation pass). Specifically
challenge:

- Is the return figure real and currently accurate, or a stale/rounded number
  copied from an aggregator?
- Does the fund actually require accreditation, or was it mis-tagged?
- Is the `citation` URL a real, working, and reasonably authoritative source
  (fund provider, a major financial publisher) — not a broken or SEO-spam link?
- Is the `signupUrl` a genuine account-opening or buy page?
- Does every risk tier × phase combination still have at least one equity fund
  and one bond fund available (`src/investmentData.test.js` enforces this —
  run it after editing)?

## 3. Update the data and cite it

1. Edit `src/investmentData.js` with the validated fund list.
2. Add or update the corresponding entries in `docs/sources.md` §21
   ("Investment Recommendations — Curated Fund Data"), following the existing
   format in that file (link, `SOURCES`-style key note, one-line summary of
   what it informed).
3. Run `pnpm test` — `src/investmentData.test.js` and
   `src/investmentAdvisor.test.js` must still pass.
4. Commit with a message noting what changed and why (e.g. "chore: refresh
   investment fund data — 2027 return figures").
```

- [ ] **Step 2: Add the source citations to `docs/sources.md`**

Add a new table-of-contents entry after the existing "20. Full URL Index" line (find `- [20. Full URL Index](#20-full-url-index)` and add directly after it):

```markdown
- [21. Investment Recommendations — Curated Fund Data](#21-investment-recommendations--curated-fund-data)
```

Add a new section at the end of the file (after the existing "20. Full URL Index" section's content), following the same format as Section 19:

```markdown

---

## 21. Investment Recommendations — Curated Fund Data

Sources behind the curated fund list and allocation guidance in `src/investmentData.js`,
surfaced in the "Investments" wizard step and "Investment Recommendations" report section.
See `docs/investment-data-refresh.md` for the maintainer refresh process.

- **[Bankrate — Best index funds](https://www.bankrate.com/investing/best-index-funds/)** — 5-yr annualized return figures for VOO and SWPPX.
- **[Forbes Advisor — Best index funds](https://www.forbes.com/advisor/investing/best-index-funds/)** — 10-yr annualized return figure for FXAIX.
- **[Vanguard — BND fund profile](https://investor.vanguard.com/investment-products/etfs/profile/bnd)** — Bond index fund data and account-opening page.
- **[PortfoliosLab — VUG](https://portfolioslab.com/symbol/VUG)** — 10-yr annualized return figure for VUG.
- **[stockanalysis.com — QQQ](https://stockanalysis.com/etf/qqq/)** — 10-yr annualized return figure for QQQ.
- **[Ares Capital Corporation — Investor Relations](https://www.arescapitalcorp.com/investor-relations)** — Long-run return figure and BDC structure for ARCC.
- **[Blackstone — Private Wealth Solutions](https://www.blackstone.com/our-businesses/private-wealth-solutions/)** — BXPE structure, accreditation requirement, minimum investment, and fee terms.
```

- [ ] **Step 3: Verify the whole suite still passes**

Run: `pnpm test`
Expected: PASS (documentation changes only, no code affected)

- [ ] **Step 4: Commit**

```bash
git add docs/investment-data-refresh.md docs/sources.md
git commit -m "docs: add investment data maintainer refresh workflow and citations"
```
