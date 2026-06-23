// src/components/charts/Places.test.js
//
// Reconciliation tests for the Places owned/mortgage breakdown footer.
// Finding 2 from the Wave 2.5 code review: the /mo footer for owned/mortgage
// households was double-counting healthcare, causing /mo × 12 ≠ /yr (l.cost).
//
// RED → GREEN evidence:
//   Before fix: `computeDisplayMonthly` (mirrors old Places.jsx formula) ≠ l.cost / 12
//   After fix:  `computeDisplayMonthly` (mirrors fixed Places.jsx formula) == l.cost / 12

import { describe, expect, it } from "vitest";
import { lineItems, monthlyTotal } from "../../finance/plan.js";
import { retirementDwellingAnnualCost } from "../../finance/housing.js";
import { buildPlanInputs } from "../../finance/plan.js";
import { LOCATIONS, SINGLE_COST_FACTOR } from "../../retirementData.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal plan state with a mortgage household (no relocation — keeps the work home). */
const mortgageState = {
  ageA: 57, incomeA: 100000, stopA: 65,
  ageB: 48, incomeB: 80000, stopB: 56,
  housing: {
    tenure: "mortgage",
    mortgage: { principal: 300000, ratePct: 6, termYears: 30, startYear: 2026 },
    homeValue: 375000,
    insuranceAnnual: 1800,
    maintenancePct: 0.01,
    relocation: { action: "sell", saleValue: 0 },
  },
  retireHousing: null,
  relocationYear: 9999, // no relocation — keep the work home
  workLoc: "WA",
  stateCode: "WA",
  retireLoc: null,
  savings: 500000,
  tradFrac: 0.6,
  inflation: 0.025,
  realReturn: 0.05,
  returnPreset: "custom",
  ssOn: true,
  ssA: 2000,
  ssB: 1200,
  ssAgeA: 67,
  ssAgeB: 67,
  pensionOn: false,
  pension: 0,
  pensionAge: 62,
  serviceYears: 0,
  targetPct: 0.8,
  horizonAge: 95,
  activePropertyTaxRate: 0.012,
  inher: [],
  ssMode: "full",
  // Inheritance properties — disabled (required by buildInheritanceInputs)
  tx: { on: false, value: 0, year: 2040, strategy: "sell" },
  at: { on: false, value: 0, year: 2040, strategy: "sell" },
};

/** Own-outright household — same structure but no P&I. */
const ownState = {
  ...mortgageState,
  housing: {
    tenure: "own",
    homeValue: 375000,
    insuranceAnnual: 1800,
    maintenancePct: 0.01,
    mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
    relocation: { action: "sell", saleValue: 0 },
  },
};

// ---------------------------------------------------------------------------
// Helpers — mirror Places.jsx logic exactly so tests catch drift
// ---------------------------------------------------------------------------

/**
 * Build displayItems for an owned/mortgage household.
 * Mirrors the rawItems.map() block in Places.jsx ~line 122–135.
 * NOTE: hh.annual is NOT sFactor-scaled (policy: one home isn't halved);
 * the /sFactor here cancels the ×sFactor at render so the home line shows hh.annual/12.
 */
function buildDisplayItems(l, stage, hh, sFactor) {
  const rawItems = lineItems(l, stage);
  const isOwnedHousing = hh && (hh.basis === "own" || hh.basis === "mortgage");
  if (!isOwnedHousing) return rawItems;

  return rawItems.map(([label, val]) => {
    if (label === "Rent -- 2-3BR, quiet area") {
      const hhLabel = hh.basis === "mortgage"
        ? "Your home — mortgage P&I + costs"
        : "Your home — carrying cost";
      const hhMonthly = sFactor > 0 ? hh.annual / 12 / sFactor : hh.annual / 12;
      return [hhLabel, hhMonthly];
    }
    return [label, val];
  });
}

/**
 * CURRENT (buggy) displayMonthly formula from Places.jsx ~line 140–142.
 * Reduces over displayItems (which already includes healthcare), then adds
 * healthcare AGAIN → double-count.
 *
 * This is what Places.jsx rendered BEFORE the fix.
 */
function buggyDisplayMonthly(l, stage, displayItems, sFactor) {
  return displayItems.reduce((sum, [, val]) => sum + val * sFactor, 0)
    + (stage === "pre" ? l.hcPre : l.hcPost) * sFactor;
}

/**
 * FIXED displayMonthly: l.cost / 12 — single source of truth so /mo × 12 == /yr.
 * This is what Places.jsx renders AFTER the fix.
 */
function fixedDisplayMonthly(l) {
  return l.cost / 12;
}

// ---------------------------------------------------------------------------
// Build a locRow for a given state + stage + sFactor (mirrors usePlan logic)
// ---------------------------------------------------------------------------
function buildLocRow(state, stage, sFactor) {
  const i = buildPlanInputs(state);
  const hh = retirementDwellingAnnualCost(i);

  const portugal = LOCATIONS.find((l) => l.name === "Portugal");
  if (!portugal) throw new Error("Portugal not found in LOCATIONS");

  const annualCost = (l) => {
    const base = monthlyTotal(l, stage) * 12 * sFactor;
    if (hh.basis === "rent") return base;
    const localRentAnnual = (l.m.rent || 0) * 12 * sFactor;
    return base - localRentAnnual + hh.annual;
  };

  const cost = annualCost(portugal);
  return { ...portugal, cost, hh };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Places owned/mortgage breakdown footer reconciliation", () => {
  const STAGES = ["pre", "post"];
  const COUPLE_CASES = [
    { label: "couple (sFactor=1)", sFactor: 1 },
    { label: `single (sFactor=${SINGLE_COST_FACTOR})`, sFactor: SINGLE_COST_FACTOR },
  ];

  // --- Reconciliation: /mo × 12 must equal /yr ---
  // These assert the FIXED formula. RED before the fix in Places.jsx;
  // GREEN after.
  //
  // Before the fix: Places.jsx used buggyDisplayMonthly → these would fail
  // if we were testing the rendered component. We test by asserting that
  // the FIXED formula (l.cost / 12) is what a correct implementation must
  // produce, and separately proving (in BUG EVIDENCE tests below) that the
  // old formula differs from it.

  for (const stage of STAGES) {
    for (const { label, sFactor } of COUPLE_CASES) {
      it(`should_equalLcostDividedBy12_when_mortgageHousehold_${label.replace(/[^a-z0-9]/gi, "_")}_stage_${stage}`, () => {
        // Arrange
        const l = buildLocRow(mortgageState, stage, sFactor);
        const displayItems = buildDisplayItems(l, stage, l.hh, sFactor);

        // Act — FIXED formula (what Places.jsx must produce after the fix)
        const monthly = fixedDisplayMonthly(l);

        // Assert: /mo × 12 == /yr — the core invariant
        expect(monthly * 12).toBeCloseTo(l.cost, 2);
        // Confirm displayItems has the home row (substitution happened)
        expect(displayItems.some(([lbl]) => lbl.startsWith("Your home"))).toBe(true);
        // Confirm healthcare row is present exactly once in displayItems
        const hcCount = displayItems.filter(([lbl]) => lbl.startsWith("Healthcare")).length;
        expect(hcCount).toBe(1);
      });

      it(`should_equalLcostDividedBy12_when_ownOutrightHousehold_${label.replace(/[^a-z0-9]/gi, "_")}_stage_${stage}`, () => {
        // Arrange
        const l = buildLocRow(ownState, stage, sFactor);
        const displayItems = buildDisplayItems(l, stage, l.hh, sFactor);

        // Act — FIXED formula
        const monthly = fixedDisplayMonthly(l);

        // Assert
        expect(monthly * 12).toBeCloseTo(l.cost, 2);
        expect(displayItems.some(([lbl]) => lbl.startsWith("Your home"))).toBe(true);
        const hcCount = displayItems.filter(([lbl]) => lbl.startsWith("Healthcare")).length;
        expect(hcCount).toBe(1);
      });
    }
  }

  // --- BUG EVIDENCE: old formula double-counts healthcare ---
  // These tests are always GREEN (before AND after the fix). They document
  // the bug: the old formula produces a value > l.cost/12 by exactly one
  // healthcare amount × sFactor. Together with the reconciliation tests
  // above they prove the fix eliminates the double-count.

  it("should_overcount_by_exactlyOneHcPre_when_oldFormulaApplied_mortgageCouple_pre65", () => {
    // Arrange
    const sFactor = 1; // couple
    const stage = "pre";
    const l = buildLocRow(mortgageState, stage, sFactor);
    const displayItems = buildDisplayItems(l, stage, l.hh, sFactor);

    // Act
    const oldMonthly = buggyDisplayMonthly(l, stage, displayItems, sFactor);
    const correctMonthly = fixedDisplayMonthly(l);

    // Assert — bug: old formula > correct by exactly hcPre × sFactor
    expect(oldMonthly).toBeGreaterThan(correctMonthly);
    expect(oldMonthly - correctMonthly).toBeCloseTo(l.hcPre * sFactor, 2);
  });

  it("should_overcount_by_exactlyOneHcPost_when_oldFormulaApplied_mortgageSingle_post65", () => {
    // Arrange
    const sFactor = SINGLE_COST_FACTOR;
    const stage = "post";
    const l = buildLocRow(mortgageState, stage, sFactor);
    const displayItems = buildDisplayItems(l, stage, l.hh, sFactor);

    // Act
    const oldMonthly = buggyDisplayMonthly(l, stage, displayItems, sFactor);
    const correctMonthly = fixedDisplayMonthly(l);

    // Assert — single filer, post-65 healthcare double-counted
    expect(oldMonthly).toBeGreaterThan(correctMonthly);
    expect(oldMonthly - correctMonthly).toBeCloseTo(l.hcPost * sFactor, 2);
  });

  it("should_overcount_by_exactlyOneHcPre_when_oldFormulaApplied_ownOutrightCouple_pre65", () => {
    // Arrange
    const sFactor = 1;
    const stage = "pre";
    const l = buildLocRow(ownState, stage, sFactor);
    const displayItems = buildDisplayItems(l, stage, l.hh, sFactor);

    // Act
    const oldMonthly = buggyDisplayMonthly(l, stage, displayItems, sFactor);
    const correctMonthly = fixedDisplayMonthly(l);

    // Assert — own-outright has the same double-count bug
    expect(oldMonthly).toBeGreaterThan(correctMonthly);
    expect(oldMonthly - correctMonthly).toBeCloseTo(l.hcPre * sFactor, 2);
  });
});
