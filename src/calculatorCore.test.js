import { describe, expect, it } from "vitest";
import {
  afcIsAuto,
  benefits,
  monthlyBreakdown,
  yearMilestones,
  calculateFederalTaxYear,
  calculatePlan,
  composeNeed,
  drsEligibilityNote,
  fedTax,
  genericPensionAnnual,
  fersEligible,
  fersEligibilityNote,
  fersMultiplier,
  fersPensionAnnual,
  calstrsAgeFactor,
  calstrsPensionAnnual,
  calstrsEligibilityNote,
  calpersAgeFactor,
  calpersPensionAnnual,
  calpersEligibilityNote,
  txTrsEligible,
  txTrsPensionAnnual,
  txTrsEligibilityNote,
  txTrsReductionFactor,
  nystrsPensionFactor,
  nystrsEarlyRetirementFactor,
  nystrsPensionAnnual,
  nystrsEligibilityNote,
  ohioStrsUnreducedEligible,
  ohioStrsPensionAnnual,
  ohioStrsEligibilityNote,
  militaryEligible,
  militaryPensionAnnual,
  militaryEligibilityNote,
  ltcSpendForYear,
  oneTimeSpendForYear,
  requiredMinimum,
  rmdStartAge,
  scheduledSpendForYear,
  uniformLifetimeFactor,
  ownBenefitAtClaimMonthly,
  pensionERF,
  resolveAfc,
  survivorOptionFactor,
  runMonteCarlo,
  simulate,
  spendingNeed,
  proratedFraEstimate,
  piaFromIncome,
  spousalBenefitAtClaimMonthly,
  standardDeduction,
  steadyState,
  stressReturnForYear,
  taxableSS,
  travelSpendForYear,
  yearReturn,
} from "./calculatorCore.js";
import { LOCATIONS, SINGLE_COST_FACTOR, HOME_SELL_NET, INTL_TAX, inheritanceRulesForPlace, isGovernmentServicePensionType } from "./retirementData.js";
import { remainingBalance } from "./finance/housing.js";
import { makeDefaultPlan } from "./defaultPlan.js";

const baseState = {
  ageA:45, ageB:45, stopA:62, stopB:60, claimA:67, claimB:67, pensionAge:65,
  incomeA:90000, incomeB:75000, savings:300000, contrib:18000, targetPct:0.30, status:"married",
  ssModeA:"estimate", ssModeB:"estimate", ssFraA:36000, ssFraB:30000,
  pensionOn:true, system:"TRS", plan:2, pYears:20, afc:78000,
  realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
  ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
  retireLoc:"US -- national average",
  // Real estate is now an editable list; default fixture has none (tests opt in explicitly).
  properties: [],
};

describe("federal tax", () => {
  it("uses 2026 married brackets", () => {
    expect(fedTax(100800, "married")).toBeCloseTo(11600, 2);
  });

  it("gates senior deductions by actual age", () => {
    expect(standardDeduction({ status:"married", ageA:64, ageB:64, agi:100000 })).toBe(32200);
    expect(standardDeduction({ status:"married", ageA:65, ageB:64, agi:100000 })).toBe(39850);
    expect(standardDeduction({ status:"married", ageA:65, ageB:65, agi:100000 })).toBe(47500);
  });

  it("calculates taxable Social Security with the federal provisional-income cap", () => {
    expect(taxableSS(20000, 30000, "married")).toBe(1500);
    expect(taxableSS(60000, 30000, "married")).toBe(25500);
  });

  it("does not grant senior deductions before age 65 in early retirement", () => {
    const tax = calculateFederalTaxYear({
      status:"married",
      ageA:62,
      ageB:62,
      grossWithdrawal:50000,
      tradFrac:1,
      socialSecurity:20000,
    });
    expect(tax.deduction).toBe(32200);
  });
});

describe("Social Security", () => {
  it("caps spousal benefits at 50% at FRA instead of adding delayed credits", () => {
    expect(spousalBenefitAtClaimMonthly(3000, 67)).toBe(1500);
    expect(spousalBenefitAtClaimMonthly(3000, 70)).toBe(1500);
  });

  it("reduces spousal benefits to 32.5% of the worker PIA at age 62 when FRA is 67", () => {
    expect(spousalBenefitAtClaimMonthly(3000, 62)).toBeCloseTo(975, 2);
  });

  it("applies a custom 0% funding scenario only from the selected cut year", () => {
    const plan = calculatePlan({
      ...baseState,
      ageA:60,
      ageB:60,
      claimA:62,
      claimB:62,
      stopA:61,
      stopB:61,
      pensionOn:false,
      ssMode:"custom",
      ssHaircut:0,
      ssCutYear:2030,
      tx:{ ...baseState.tx, on:false },
      at:{ ...baseState.at, on:false },
    });
    const firstClaimYear = plan.simChosen.rows.find((r) => r.cal === 2028);
    const cutYear = plan.simChosen.rows.find((r) => r.cal === 2030);
    expect(firstClaimYear.ssA + firstClaimYear.ssB).toBeGreaterThan(0);
    expect(cutYear.ssA + cutYear.ssB).toBe(0);
  });

  it("does not reduce steady-state Social Security before a future custom cut year", () => {
    const plan = calculatePlan({
      ...baseState,
      ssMode:"custom",
      ssHaircut:50,
      ssCutYear:2099,
    });
    expect(plan.steady.ssHouse).toBeCloseTo(plan.sFull.ssHouse, 2);
  });
});

describe("WA DRS pension", () => {
  it("uses current DRS early-retirement factors and eligibility guards", () => {
    expect(pensionERF(55, 20, 2)).toBe(0.4092);
    expect(pensionERF(55, 19, 2)).toBe(0);
    expect(pensionERF(62, 30, 2)).toBe(0.85);
  });

  it("seeds AFC from the spouse's income when none is entered", () => {
    expect(afcIsAuto({ afc: null })).toBe(true);
    expect(afcIsAuto({ afc: "" })).toBe(true);
    expect(afcIsAuto({ afc: undefined })).toBe(true);
    expect(resolveAfc({ afc: null, incomeB: 75000 })).toBe(75000);
  });

  it("uses an explicit AFC entry over the income seed", () => {
    expect(afcIsAuto({ afc: 78000 })).toBe(false);
    expect(resolveAfc({ afc: 78000, incomeB: 75000 })).toBe(78000);
    expect(resolveAfc({ afc: 0, incomeB: 75000 })).toBe(0);
  });

  it("computes the same pension from a seeded AFC as from the matching explicit AFC", () => {
    const seeded = benefits({ ...baseState, afc: null, incomeB: 75000 });
    const explicit = benefits({ ...baseState, afc: 75000 });
    expect(seeded.pension).toBeCloseTo(explicit.pension, 6);
  });
});

describe("travel spending", () => {
  const t = { on: true, amount: 15000, startYear: 2034, slowYear: 2044, endYear: 2048, taper: true, slowPct: 50 };

  it("pays the full budget in the go-go years (start..slow)", () => {
    expect(travelSpendForYear(t, 2034, 0)).toBe(15000); // start year
    expect(travelSpendForYear(t, 2043, 0)).toBe(15000); // last go-go year
  });

  it("steps down to the slow-go share from the slow year through the end year", () => {
    expect(travelSpendForYear(t, 2044, 0)).toBe(7500); // first slow-go year
    expect(travelSpendForYear(t, 2048, 0)).toBe(7500); // end year (inclusive)
  });

  it("stops outside the window (before start, after end)", () => {
    expect(travelSpendForYear(t, 2033, 0)).toBe(0); // before start
    expect(travelSpendForYear(t, 2049, 0)).toBe(0); // after end
  });

  it("honors a custom slow-go percentage", () => {
    expect(travelSpendForYear({ ...t, slowPct: 30 }, 2045, 0)).toBe(4500);
  });

  it("returns 0 when travel is disabled and pays the flat budget when taper is off", () => {
    expect(travelSpendForYear({ ...t, on: false }, 2034, 0)).toBe(0);
    expect(travelSpendForYear({ ...t, taper: false }, 2046, 0)).toBe(15000);
  });
});

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

describe("life events in simulation", () => {
  // Retired household so withdrawals are forced from the portfolio.
  const retired = {
    ...baseState,
    ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
    pensionOn: false, savings: 1000000, contrib: 0, targetPct: 0.4,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    inher: [],
    incomeHH: baseState.incomeA + baseState.incomeB,
    hcPre: 2450, hcPost: 1000,
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
    const withTravel = { ...retired, events: [], travel: { on: true, amount: 15000, startYear: 2026, slowYear: 2036, endYear: 2040, taper: true, slowPct: 50 } };
    const sim = simulate(withTravel, { haircut: 1, cutYear: 9999 });
    const firstRetYear = sim.rows.find((r) => r.cal === 2026); // ageA 65 == stopA 65 -> retired now
    expect(firstRetYear.extraSpend).toBe(15000);
  });
});

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
    const noTravel = calculatePlan({ ...baseState, travel: { on: false, amount: 15000, startYear: 2026, endYear: 2090, taper: false }, events: [] });
    const withTravel = calculatePlan({ ...baseState, travel: { on: true, amount: 15000, startYear: 2026, endYear: 2090, taper: false }, events: [] });
    expect(withTravel.steady.modeledSpend).toBeGreaterThan(noTravel.steady.modeledSpend);
  });
});

describe("full plan", () => {
  it("anchors steady-state income after selected benefits have actually started", () => {
    const plan = calculatePlan(baseState);
    expect(plan.steady.startAgeA).toBe(67);
    expect(plan.steady.startAgeB).toBe(67);
  });

  it("uses tax-aware yearly depletion rows", () => {
    const plan = calculatePlan({
      ...baseState,
      ageA:64,
      ageB:64,
      stopA:64,
      stopB:64,
      claimA:64,
      claimB:64,
      pensionOn:false,
      savings:100000,
      contrib:0,
      targetPct:0.65,
      tx:{ ...baseState.tx, on:false },
      at:{ ...baseState.at, on:false },
    });
    const firstRetiredRow = plan.simChosen.rows.find((r) => r.aA === 64);
    expect(firstRetiredRow.tax).toBeGreaterThan(0);
    expect(firstRetiredRow.wd).toBeGreaterThan(0);
  });
});

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

describe("life expectancy", () => {
  const base = {
    ...baseState,
    ageA: 65, ageB: 60, stopA: 65, stopB: 60, claimA: 65, claimB: 65, pensionAge: 60,
    pensionOn: true, savings: 1_500_000, contrib: 0,
    ssModeA: "statement", ssModeB: "statement", ssFraA: 36000, ssFraB: 24000,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 },
    horizonAge: 95,
  };
  // A dies 2026+(80-65)=2041; B dies 2026+(90-60)=2056 -> B (younger) survives.
  const bSurvives = { ...base, life: { on: true, deathAgeA: 80, deathAgeB: 90, pensionPct: 0 } };
  // A dies 2026+(95-65)=2056; B dies 2026+(75-60)=2041 -> A survives, pension-holder B dies first.
  const aSurvives = { ...base, life: { on: true, deathAgeA: 95, deathAgeB: 75, pensionPct: 50 } };

  it("triggers the survivor transition at the first death and keeps the larger SS", () => {
    const sim = simulate(bSurvives, { haircut: 1, cutYear: 9999 });
    const before = sim.rows.find((r) => r.cal === 2040);
    const after = sim.rows.find((r) => r.cal === 2041);
    expect(before.survivor).toBe(false);
    expect(after.survivor).toBe(true);
    expect(after.ssA + after.ssB).toBeCloseTo(Math.max(before.ssA, before.ssB), 0);
  });

  it("stops the projection at the last death (here capped below the horizon)", () => {
    const sim = simulate(bSurvives, { haircut: 1, cutYear: 9999 });
    expect(sim.rows[sim.rows.length - 1].cal).toBe(2056); // B's death year, not horizon age 95
  });

  it("keeps the pension whole when the pension-holder (spouse B) is the survivor", () => {
    const sim = simulate(bSurvives, { haircut: 1, cutYear: 9999 });
    const before = sim.rows.find((r) => r.cal === 2040);
    const after = sim.rows.find((r) => r.cal === 2045); // after A's death, B still alive
    expect(after.pens).toBeCloseTo(before.pens, 0);
    expect(after.pens).toBeGreaterThan(0);
  });

  it("reduces the pension to the elected percentage when the pension-holder dies first", () => {
    const sim = simulate(aSurvives, { haircut: 1, cutYear: 9999 });
    const before = sim.rows.find((r) => r.cal === 2040);
    const after = sim.rows.find((r) => r.cal === 2045); // after B's death, A survives
    expect(after.survivor).toBe(true);
    expect(after.pens).toBeCloseTo(before.pens * 0.5, 0);
    // And the pre-death benefit itself carries the J&S price (member 5 yrs younger).
    const noElection = simulate({ ...aSurvives, life: { ...aSurvives.life, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    const j50 = survivorOptionFactor(50, aSurvives.ageB - aSurvives.ageA);
    expect(before.pens).toBeCloseTo(noElection.rows.find((r) => r.cal === 2040).pens * j50, 0);
  });
});

describe("DRS joint-survivor option pricing", () => {
  it("matches the published 2026 TRS 2/3 factors at the anchor age differences", () => {
    expect(survivorOptionFactor(100, -9)).toBe(0.939);
    expect(survivorOptionFactor(50, -9)).toBe(0.968);
    expect(survivorOptionFactor(66.67, -9)).toBe(0.958);
    expect(survivorOptionFactor(100, 0)).toBe(0.877);
    expect(survivorOptionFactor(100, 9)).toBe(0.792);
    expect(survivorOptionFactor(0, 9)).toBe(1); // single life is unreduced
  });

  it("clamps outside the published -20..+40 range and stays monotonic in the gap", () => {
    expect(survivorOptionFactor(100, -40)).toBe(survivorOptionFactor(100, -20));
    expect(survivorOptionFactor(100, 99)).toBe(survivorOptionFactor(100, 40));
    expect(survivorOptionFactor(100, -9)).toBeGreaterThan(survivorOptionFactor(100, 0));
    expect(survivorOptionFactor(100, 0)).toBeGreaterThan(survivorOptionFactor(100, 9));
  });

  const priced = {
    ...baseState,
    ageA: 65, ageB: 60, stopA: 65, stopB: 60, claimA: 65, claimB: 65, pensionAge: 60,
    pensionOn: true, plan: 2, pYears: 30, afc: 78000, savings: 1_500_000, contrib: 0,
    ssModeA: "statement", ssModeB: "statement", ssFraA: 36000, ssFraB: 24000,
    travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 },
    horizonAge: 95,
  };

  it("restores the single-life benefit when the beneficiary dies first (pop-up)", () => {
    // A (beneficiary) dies 2041; B (member) lives to 2056 with a 100% election.
    const sim = simulate({ ...priced, life: { on: true, deathAgeA: 80, deathAgeB: 90, pensionPct: 100 } }, { haircut: 1, cutYear: 9999 });
    const noElect = simulate({ ...priced, life: { on: true, deathAgeA: 80, deathAgeB: 90, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    const j100 = survivorOptionFactor(100, priced.ageB - priced.ageA);
    const before = (s2) => s2.rows.find((r) => r.cal === 2040).pens;
    const after = (s2) => s2.rows.find((r) => r.cal === 2045).pens;
    expect(before(sim)).toBeCloseTo(before(noElect) * j100, 0); // priced while both alive
    expect(after(sim)).toBeCloseTo(after(noElect), 0);          // pop-up after A's death
  });

  // Pre-retirement-death fixture: member B is 50 now and dies at 58, before her
  // pension age of 60; spouse A (55 now) survives to 95.
  const preDeath = { ...priced, ageA: 55, ageB: 50, stopA: 62, stopB: 55, claimA: 67, claimB: 67, pensionAge: 60 };

  it("pays the RCW 41.32.895 survivor annuity when the member dies before her pension starts", () => {
    // 30 service years -> early-eligible at 58: annuity = 2% x 30 x AFC x ERF(58) x j100.
    const sim = simulate({ ...preDeath, life: { on: true, deathAgeA: 95, deathAgeB: 58, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    const deathCal = 2026 + (58 - preDeath.ageB);
    const rowBefore = sim.rows.find((r) => r.cal === deathCal - 1);
    const rowAfter = sim.rows.find((r) => r.cal === deathCal);
    const expected = 0.02 * 30 * preDeath.afc * pensionERF(58, 30, 2) * survivorOptionFactor(100, preDeath.ageB - preDeath.ageA);
    expect(rowBefore.pens).toBe(0); // pension had not started
    expect(rowAfter.pens).toBeCloseTo(expected, 0);
    // The statutory annuity is NOT multiplied by the elected survivor percentage.
    const elected = simulate({ ...preDeath, life: { on: true, deathAgeA: 95, deathAgeB: 58, pensionPct: 50 } }, { haircut: 1, cutYear: 9999 });
    expect(elected.rows.find((r) => r.cal === deathCal).pens).toBeCloseTo(expected, 0);
  });

  it("defers the pre-retirement death annuity to the member's would-be 65 when not early-eligible", () => {
    // Plan 2 with only 15 service years: no early retirement before 65, so the
    // survivor annuity starts unreduced when the member would have turned 65.
    const few = { ...preDeath, pYears: 15, pensionAge: 65, life: { on: true, deathAgeA: 95, deathAgeB: 58, pensionPct: 0 } };
    const sim = simulate(few, { haircut: 1, cutYear: 9999 });
    const would65 = 2026 + (65 - few.ageB);
    const expected = 0.02 * 15 * few.afc * 1 * survivorOptionFactor(100, few.ageB - few.ageA);
    expect(sim.rows.find((r) => r.cal === would65 - 1).pens).toBe(0);
    expect(sim.rows.find((r) => r.cal === would65).pens).toBeCloseTo(expected, 0);
  });

  it("leaves the default plan untouched (no survivor election)", () => {
    const { steady } = calculatePlan(makeDefaultPlan());
    // golden pin re-baselined for pension-location-data phase 2: DEFAULT_PLAN.pensionOn
    // flipped true→false (see defaultPlan.js and docs/research/pension-systems-data.md §1).
    expect(Math.round(steady.net)).toBe(89021);
  });
});

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

describe("steadyState survivor handling", () => {
  const i = { ...baseState, inher: [], incomeHH: 165000 };
  const mkRow = (survivor) => ({
    aA: 67, aB: 67, cal: 2048, bal: 1_000_000, need: 50000,
    survivor, ssA: 30000, ssB: 18000, pens: 20000,
  });

  it("uses single-filer tax brackets in a survivor year", () => {
    const married = steadyState(i, { rows: [mkRow(false)] });
    const survivor = steadyState(i, { rows: [mkRow(true)] });
    expect(survivor.tax).toBeGreaterThan(married.tax);
  });

  it("keeps only the larger Social Security check (from the row) in a survivor year", () => {
    // The simulation already zeroed the smaller check on a survivor row.
    const row = { aA: 67, aB: 67, cal: 2048, bal: 1_000_000, need: 50000, survivor: true, ssA: 30000, ssB: 0, pens: 20000 };
    const s = steadyState(i, { rows: [row] });
    expect(s.ssHouse).toBe(30000);
    expect(s.ssA).toBe(30000);
    expect(s.ssB).toBe(0);
  });

  it("excludes inherited rental income that starts after the steady-state year", () => {
    const iRent = { ...i, inher: [{ type: "rent", year: 2099, rent: 12000 }] };
    const s = steadyState(iRent, { rows: [mkRow(false)] });
    expect(s.rentInc).toBe(0);
  });

  it("includes inherited rental income already available by the steady-state year", () => {
    const iRent = { ...i, inher: [{ type: "rent", year: 2040, rent: 12000 }] };
    const s = steadyState(iRent, { rows: [mkRow(false)] });
    expect(s.rentInc).toBe(12000);
  });
});

describe("spendingNeed survivor healthcare", () => {
  const hc = { incomeHH: 100000, targetPct: 0.4, hcPre: 2450, hcPost: 1000 };
  const perPersonHCyr = ((2450 - 1000) / 2) * 12;

  it("charges one pre-65 healthcare bump for a survivor (younger spouse), not two", () => {
    const couple = spendingNeed(hc, 60, 55, 0, false);
    const survivor = spendingNeed(hc, 60, 55, 0, true);
    expect(couple - survivor).toBeCloseTo(perPersonHCyr, 6);
  });

  it("charges no pre-65 bump for a survivor already 65+", () => {
    expect(spendingNeed(hc, 67, 66, 0, true)).toBe(0.4 * 100000);
  });
});

describe("proratedFraEstimate (short-career SS fallback)", () => {
  it("scales the full-career PIA by covered years / 35", () => {
    const full = piaFromIncome(170000) * 12;
    expect(proratedFraEstimate(170000, 22)).toBeCloseTo(full * 22 / 35, 6);
  });

  it("equals the full estimate at 35+ covered years and caps there", () => {
    const full = piaFromIncome(170000) * 12;
    expect(proratedFraEstimate(170000, 35)).toBeCloseTo(full, 6);
    expect(proratedFraEstimate(170000, 40)).toBeCloseTo(full, 6);
  });

  it("returns 0 for zero covered years", () => {
    expect(proratedFraEstimate(170000, 0)).toBe(0);
  });
});

describe("long-term care spending", () => {
  const ltcOn = { on: true, startAge: 80, years: 3, annual: null };

  it("charges the location default during the LTC window when no override", () => {
    expect(ltcSpendForYear(ltcOn, 80, 46000)).toBe(46000);
    expect(ltcSpendForYear(ltcOn, 82, 46000)).toBe(46000);
  });

  it("is zero outside the window and when disabled", () => {
    expect(ltcSpendForYear(ltcOn, 79, 46000)).toBe(0);
    expect(ltcSpendForYear(ltcOn, 83, 46000)).toBe(0);
    expect(ltcSpendForYear({ on: false, startAge: 80, years: 3 }, 81, 46000)).toBe(0);
  });

  it("uses an explicit annual override over the location default", () => {
    expect(ltcSpendForYear({ on: true, startAge: 80, years: 3, annual: 100000 }, 81, 46000)).toBe(100000);
  });
});

describe("survivor pension reduction", () => {
  const base = {
    ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
    pensionOn: true, pensionAge: 65, savings: 500000, contrib: 0,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false }, inher: [],
    incomeHH: baseState.incomeA + baseState.incomeB, hcPre: 2450, hcPost: 1000,
    ltcAnnual: 129000, travel: { on: false }, events: [], ltc: { on: false },
  };
  const pensAt = (sim, cal) => sim.rows.find((r) => r.cal === cal).pens;

  it("reduces the pension by the elected survivor percentage of the PRICED benefit", () => {
    const full = simulate({ ...base, survivor: { on: false, year: 9999, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    const half = simulate({ ...base, survivor: { on: true, year: 2030, pensionPct: 50 } }, { haircut: 1, cutYear: 9999 });
    const none = simulate({ ...base, survivor: { on: true, year: 2030, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    expect(pensAt(full, 2030)).toBeGreaterThan(0);
    // Electing 50% costs the DRS option factor while both are alive, then the
    // survivor receives 50% of that reduced benefit (same-age couple: j50 = 0.935).
    const j50 = survivorOptionFactor(50, base.ageB - base.ageA);
    expect(pensAt(half, 2029)).toBeCloseTo(pensAt(full, 2029) * j50, 6);
    expect(pensAt(half, 2030)).toBeCloseTo(pensAt(full, 2030) * j50 * 0.5, 6);
    expect(pensAt(none, 2030)).toBe(0);
  });
});

describe("Monte Carlo lognormal returns", () => {
  const mcState = {
    ...baseState,
    travel: { on: false, amount: 15000, years: 15, taper: true }, events: [],
    survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false },
  };

  it("degenerates to the deterministic path at zero volatility", () => {
    const r = runMonteCarlo(mcState, { paths: 50, seed: 5, volatility: 0 });
    const last = r.balanceFan[r.balanceFan.length - 1];
    expect(last.p10).toBe(last.p50);
    expect(last.p50).toBe(last.p90);
  });
});

describe("numeric guards (mutation hardening)", () => {
  // --- tax.js ---
  it("fedTax is linear in the lowest bracket and matches a known point", () => {
    expect(fedTax(24800, "married")).toBeCloseTo(2480, 6); // 10% up to the 12% floor
    expect(fedTax(0, "married")).toBe(0);
  });

  it("taxableSS is capped at 85% of the benefit for high provisional income", () => {
    expect(taxableSS(200000, 30000, "married")).toBeCloseTo(0.85 * 30000, 6);
  });

  it("calculateFederalTaxYear subtracts the deduction and includes rental + pension in ordinary income", () => {
    const r = calculateFederalTaxYear({ status: "married", ageA: 70, ageB: 70, wages: 0, pension: 20000, rental: 12000, grossWithdrawal: 0, socialSecurity: 0, tradFrac: 0.7 });
    expect(r.ordinary).toBe(32000);              // rental + pension both counted
    expect(r.taxableIncome).toBeLessThan(r.agi); // deduction subtracts, not adds
  });

  // --- socialSecurity.js ---
  it("piaFromIncome caps at the wage base and rises across bend segments", () => {
    expect(piaFromIncome(400000)).toBeCloseTo(piaFromIncome(184500), 6); // cap enforced
    expect(piaFromIncome(50000)).toBeGreaterThan(piaFromIncome(10000));  // monotone up
  });

  it("ownBenefitAtClaimMonthly reduces before FRA and adds credits after", () => {
    expect(ownBenefitAtClaimMonthly(1000, 62)).toBeLessThan(1000);
    expect(ownBenefitAtClaimMonthly(1000, 62)).toBeGreaterThan(0);
    expect(ownBenefitAtClaimMonthly(1000, 70)).toBeGreaterThan(1000);
  });

  // --- pension.js ---
  it("pensionERF honors the age-65 and minimum-age guards and plan service minimums", () => {
    expect(pensionERF(65, 20, 2)).toBe(1);
    expect(pensionERF(64, 20, 2)).toBeLessThan(1);
    expect(pensionERF(54, 30, 2)).toBe(0);
    expect(pensionERF(60, 15, 3)).toBeGreaterThan(0); // Plan 3: 10-yr min met
    expect(pensionERF(60, 15, 2)).toBe(0);            // Plan 2: 20-yr min not met
  });

  // --- pension.js: generic defined-benefit fallback ---
  it("genericPensionAnnual annualizes a monthly benefit and floors non-numeric input at 0", () => {
    expect(genericPensionAnnual(2000)).toBe(24000);
    expect(genericPensionAnnual(0)).toBe(0);
    expect(genericPensionAnnual(undefined)).toBe(0);
    expect(genericPensionAnnual("not a number")).toBe(0);
  });

  // --- pension.js: FERS ---
  it("fersMultiplier applies the enhanced 1.1% only at 62+ with 20+ years, else the standard 1%", () => {
    expect(fersMultiplier(62, 20)).toBe(0.011);
    expect(fersMultiplier(63, 25)).toBe(0.011);
    expect(fersMultiplier(62, 19)).toBe(0.01);  // years just under 20
    expect(fersMultiplier(61, 20)).toBe(0.01);  // age just under 62
    expect(fersMultiplier(55, 30)).toBe(0.01);
  });

  it("fersEligible honors the three immediate-retirement paths and their boundaries", () => {
    // 62 + 5yrs path
    expect(fersEligible(62, 5)).toBe(true);
    expect(fersEligible(61, 5)).toBe(false);
    expect(fersEligible(62, 4)).toBe(false);
    // 60 + 20yrs path
    expect(fersEligible(60, 20)).toBe(true);
    expect(fersEligible(59, 20)).toBe(false);
    expect(fersEligible(60, 19)).toBe(false);
    // MRA(57) + 30yrs path
    expect(fersEligible(57, 30)).toBe(true);
    expect(fersEligible(56, 30)).toBe(false);
    expect(fersEligible(57, 29)).toBe(false);
    // MRA+10 (reduced) is not modeled — 57 with only 15 years is ineligible here
    expect(fersEligible(57, 15)).toBe(false);
  });

  it("fersEligibilityNote is empty when eligible and explains the paths when not", () => {
    expect(fersEligibilityNote(62, 5)).toBe("");
    expect(fersEligibilityNote(50, 10)).toMatch(/62\+.*60\+.*57\+/s);
  });

  it("fersPensionAnnual applies the multiplier x years x High-3 only when eligible, 0 otherwise", () => {
    expect(fersPensionAnnual(62, 20, 100000)).toBeCloseTo(0.011 * 20 * 100000, 6); // 22,000
    expect(fersPensionAnnual(60, 20, 100000)).toBeCloseTo(0.01 * 20 * 100000, 6);  // enhanced needs 62+, not just 60+
    expect(fersPensionAnnual(50, 10, 100000)).toBe(0); // ineligible
  });

  // --- pension.js: CalSTRS ---
  it("calstrsAgeFactor looks up the 2at60 and 2at62 tables and caps/floors at the table edges", () => {
    expect(calstrsAgeFactor(60, "2at60")).toBeCloseTo(0.02, 6);
    expect(calstrsAgeFactor(63, "2at60")).toBeCloseTo(0.024, 6);
    expect(calstrsAgeFactor(70, "2at60")).toBeCloseTo(0.024, 6); // caps at the top table entry
    expect(calstrsAgeFactor(49, "2at60")).toBe(0); // below the floor -- not eligible
    expect(calstrsAgeFactor(62, "2at62")).toBeCloseTo(0.02, 6);
    expect(calstrsAgeFactor(54, "2at62")).toBe(0); // below the 2at62 floor (55)
  });

  it("calstrsPensionAnnual adds the 30+-year career factor only for 2at60, capped at 2.4%", () => {
    expect(calstrsPensionAnnual(60, 25, 100000, "2at60")).toBeCloseTo(0.02 * 25 * 100000, 6);
    // 30+ years adds 0.2%, so 2.0% + 0.2% = 2.2% at age 60
    expect(calstrsPensionAnnual(60, 30, 100000, "2at60")).toBeCloseTo(0.022 * 30 * 100000, 6);
    // near the cap: 63+ is already 2.4%, so +0.2% must clamp to 2.4%, not 2.6%
    expect(calstrsPensionAnnual(63, 30, 100000, "2at60")).toBeCloseTo(0.024 * 30 * 100000, 6);
    // 2at62 gets no career-factor enhancement even with 30+ years
    expect(calstrsPensionAnnual(62, 30, 100000, "2at62")).toBeCloseTo(0.02 * 30 * 100000, 6);
    expect(calstrsPensionAnnual(49, 10, 100000, "2at60")).toBe(0); // ineligible
  });

  it("calstrsEligibilityNote is empty when eligible and names the floor per tier when not", () => {
    expect(calstrsEligibilityNote(55, 5, "2at60")).toBe("");
    expect(calstrsEligibilityNote(49, 5, "2at60")).toMatch(/50.*30/s);
    expect(calstrsEligibilityNote(50, 5, "2at62")).toMatch(/55/);
  });

  it("calstrsPensionAnnual (2at60) requires 30+ years for the 50-54 age band, not just an age-table hit", () => {
    // Regression guard: the age-factor table alone has a row for age 52, but the 50-54 band is
    // only reachable with 30+ years of service -- 5 years must NOT be treated as eligible.
    expect(calstrsPensionAnnual(52, 5, 100000, "2at60")).toBe(0);
    expect(calstrsEligibilityNote(52, 5, "2at60")).toMatch(/50.*30/s);
    expect(calstrsPensionAnnual(52, 30, 100000, "2at60")).toBeGreaterThan(0);
    expect(calstrsEligibilityNote(52, 30, "2at60")).toBe("");
    // 55+ only needs the standard 5-year vesting minimum, not 30.
    expect(calstrsPensionAnnual(55, 5, 100000, "2at60")).toBeGreaterThan(0);
  });

  // --- pension.js: CalPERS ---
  it("calpersAgeFactor looks up the classic and PEPRA representative tiers", () => {
    expect(calpersAgeFactor(55, "classic2at55")).toBeCloseTo(0.02, 6);
    expect(calpersAgeFactor(49, "classic2at55")).toBe(0); // below floor (50)
    expect(calpersAgeFactor(62, "pepra2at62")).toBeCloseTo(0.02, 6);
    expect(calpersAgeFactor(51, "pepra2at62")).toBe(0); // below floor (52)
  });

  it("calpersPensionAnnual multiplies factor x years x final comp, 0 when ineligible", () => {
    expect(calpersPensionAnnual(55, 20, 100000, "classic2at55")).toBeCloseTo(0.02 * 20 * 100000, 6);
    expect(calpersPensionAnnual(49, 20, 100000, "classic2at55")).toBe(0);
  });

  it("calpersEligibilityNote names the tier-specific minimum age", () => {
    expect(calpersEligibilityNote(55, 5, "classic2at55")).toBe("");
    expect(calpersEligibilityNote(49, 5, "classic2at55")).toMatch(/50/);
    expect(calpersEligibilityNote(51, 5, "pepra2at62")).toMatch(/52/);
  });

  it("calpersPensionAnnual requires the 5-year vesting minimum even when the age-table lookup hits", () => {
    // Regression guard: age 51 is within the Classic table's range, but with only 1 year of
    // service the 5-year minimum isn't met -- must NOT be treated as eligible.
    expect(calpersPensionAnnual(51, 1, 100000, "classic2at55")).toBe(0);
    expect(calpersEligibilityNote(51, 1, "classic2at55")).toMatch(/50/);
    expect(calpersPensionAnnual(51, 5, 100000, "classic2at55")).toBeGreaterThan(0);
  });

  // --- pension.js: Texas TRS ---
  it("txTrsEligible honors the 65+5yr, Rule-of-80, 55+5yr-reduced, and 30yr-any-age paths", () => {
    expect(txTrsEligible(65, 5)).toBe(true);
    expect(txTrsEligible(64, 4)).toBe(false);
    expect(txTrsEligible(62, 18)).toBe(true); // 62+18=80, Rule of 80 met
    expect(txTrsEligible(55, 5)).toBe(true); // early, reduced
    expect(txTrsEligible(45, 30)).toBe(true); // 30+ years, any age
    expect(txTrsEligible(50, 3)).toBe(false);
  });

  it("txTrsPensionAnnual is unreduced at 65+5yrs or Rule-of-80, and reduced otherwise", () => {
    expect(txTrsPensionAnnual(65, 20, 100000)).toBeCloseTo(0.023 * 20 * 100000, 6);
    expect(txTrsPensionAnnual(62, 18, 100000)).toBeCloseTo(0.023 * 18 * 100000, 6); // Rule of 80, unreduced
    // 55 + 5yrs, Rule of 80 NOT met (55+5=60 < 80): reduced 5%/yr below the true unreduced age 65 -> 10 years short
    const expected55 = 0.023 * 5 * 100000 * (1 - 10 * 0.05);
    expect(txTrsPensionAnnual(55, 5, 100000)).toBeCloseTo(expected55, 2);
    expect(txTrsPensionAnnual(50, 2, 100000)).toBe(0); // ineligible
  });

  it("txTrsPensionAnnual still reduces a member aged 62-64 who is eligible only via the early path (Rule of 80 not met)", () => {
    // age 63, 6 years: 63+6=69 < 80, so Rule of 80 is NOT met -- eligible only via the early
    // 55+/5yr path even though age >= 62, so this must be reduced, not paid in full.
    const factor = txTrsReductionFactor(63, 6);
    expect(factor).toBeLessThan(1); // regression guard for the age-62-64 full-pension bug
    expect(factor).toBeCloseTo(1 - 2 * 0.05, 6); // 65 - 63 = 2 years short, 5%/yr
    expect(txTrsPensionAnnual(63, 6, 100000)).toBeCloseTo(0.023 * 6 * 100000 * factor, 6);
  });

  it("txTrsEligibilityNote is empty when eligible and explains the paths when not", () => {
    expect(txTrsEligibilityNote(65, 5)).toBe("");
    expect(txTrsEligibilityNote(50, 2)).toMatch(/55.*30.*65/s);
  });

  // --- pension.js: NYSTRS Tier 6 ---
  it("nystrsPensionFactor is tiered: <20yr flat 1.67%, exactly 20yr flat 1.75%, >20yr 35%+2%/yr", () => {
    expect(nystrsPensionFactor(10)).toBeCloseTo(10 * 0.0167, 6);
    expect(nystrsPensionFactor(20)).toBeCloseTo(20 * 0.0175, 6);
    expect(nystrsPensionFactor(25)).toBeCloseTo(0.35 + 5 * 0.02, 6);
  });

  it("nystrsEarlyRetirementFactor is 1 at/after 63, interpolates the sourced anchors below it", () => {
    expect(nystrsEarlyRetirementFactor(63, 10)).toBe(1);
    expect(nystrsEarlyRetirementFactor(65, 10)).toBe(1);
    expect(nystrsEarlyRetirementFactor(55, 10)).toBeCloseTo(0.73, 6);
    expect(nystrsEarlyRetirementFactor(61, 10)).toBeCloseTo(0.94, 6);
    // midpoint between the 61->0.94 and 63->1.0 anchors
    expect(nystrsEarlyRetirementFactor(62, 10)).toBeCloseTo(0.97, 6);
    expect(nystrsEarlyRetirementFactor(58, 30)).toBe(1); // 30+ years unreduced at 58
  });

  it("nystrsPensionAnnual applies the factor x FAS x early-retirement reduction, 0 when ineligible", () => {
    expect(nystrsPensionAnnual(63, 25, 100000)).toBeCloseTo((0.35 + 5 * 0.02) * 100000, 6);
    expect(nystrsPensionAnnual(54, 10, 100000)).toBe(0); // below the age-55 minimum
  });

  it("nystrsEligibilityNote is empty when eligible and names the minimum otherwise", () => {
    expect(nystrsEligibilityNote(55, 5)).toBe("");
    expect(nystrsEligibilityNote(50, 5)).toMatch(/55/);
  });

  // --- pension.js: Ohio STRS (unreduced path only -- no published early-reduction table) ---
  it("ohioStrsUnreducedEligible honors the 65+5yr and 32yr-any-age paths only", () => {
    expect(ohioStrsUnreducedEligible(65, 5)).toBe(true);
    expect(ohioStrsUnreducedEligible(50, 32)).toBe(true);
    expect(ohioStrsUnreducedEligible(60, 27)).toBe(false); // reduced path -- not modeled as eligible here
    expect(ohioStrsUnreducedEligible(64, 5)).toBe(false);
  });

  it("ohioStrsPensionAnnual pays 2.2% x years x FAS only when unreduced-eligible, else 0", () => {
    expect(ohioStrsPensionAnnual(65, 20, 100000)).toBeCloseTo(0.022 * 20 * 100000, 6);
    expect(ohioStrsPensionAnnual(60, 27, 100000)).toBe(0); // reduced-only eligibility -- deliberately not modeled
  });

  it("ohioStrsEligibilityNote explains the reduced path isn't modeled, when applicable", () => {
    expect(ohioStrsEligibilityNote(65, 5)).toBe("");
    expect(ohioStrsEligibilityNote(60, 27)).toMatch(/generic/);
  });

  // --- pension.js: Military (Legacy High-3 / BRS) ---
  it("militaryEligible enforces the hard 20-year cliff", () => {
    expect(militaryEligible(20)).toBe(true);
    expect(militaryEligible(19)).toBe(false);
  });

  it("militaryPensionAnnual computes High-3 (50% + 2.5%/yr beyond 20) and BRS (2.0%/yr), 0 below 20 years", () => {
    expect(militaryPensionAnnual(20, 100000, "highThree")).toBeCloseTo(0.50 * 100000, 6);
    expect(militaryPensionAnnual(24, 100000, "highThree")).toBeCloseTo(0.60 * 100000, 6); // 50%+10%
    expect(militaryPensionAnnual(20, 100000, "brs")).toBeCloseTo(0.40 * 100000, 6);
    expect(militaryPensionAnnual(19, 100000, "highThree")).toBe(0);
  });

  it("militaryEligibilityNote is empty at 20+ years and explains the cliff below it", () => {
    expect(militaryEligibilityNote(20)).toBe("");
    expect(militaryEligibilityNote(15)).toMatch(/20/);
  });

  // --- simulate.js: pensionType branching ---
  it("simulate computes a generic pension flat and ignores DRS-only fields", () => {
    const i = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: true, pensionType: "generic", pensionAge: 65, genericPensionMonthly: 3000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(36000, 0);
  });

  it("simulate computes a FERS pension via the FERS formula, not the DRS formula", () => {
    const i = {
      ...baseState, ageA: 62, ageB: 62, stopA: 62, stopB: 62, claimA: 62, claimB: 62,
      pensionOn: true, pensionType: "fers", pensionAge: 62, pYears: 20, afc: 100000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.011 * 20 * 100000, 0); // 22,000 -- not the DRS 2%x20x100000
  });

  it("does not grant the DRS pre-retirement survivor annuity to a FERS or generic pension", () => {
    const preDeathFers = {
      ...baseState, pensionOn: true, pensionType: "fers", pensionAge: 62, pYears: 20, afc: 100000,
      life: { on: true, deathAgeA: 95, deathAgeB: 50, pensionPct: 100 },
      survivor: { on: false, year: 9999, pensionPct: 0 },
    };
    const sim = simulate(preDeathFers, { haircut: 1, cutYear: 9999 });
    // Spouse B dies at 50, long before the FERS pension would have started (62) --
    // the DRS-only RCW 41.32.895 statutory annuity must NOT kick in for a FERS pension.
    const afterDeath = sim.rows.find((r) => r.aB > 50);
    expect(afterDeath.pens).toBe(0);
  });

  it("does not zero a FERS pension after the holder's modeled death (no survivor-reduction mechanic exists for it)", () => {
    const i = {
      ...baseState, pensionOn: true, pensionType: "fers", pensionAge: 62, pYears: 20, afc: 100000,
      life: { on: true, deathAgeA: 95, deathAgeB: 70, pensionPct: 0 },
      survivor: { on: false, year: 9999, pensionPct: 0 },
    };
    const sim = simulate(i, { haircut: 1, cutYear: 9999 });
    // Spouse B (the FERS pension holder) dies at 70, well after the pension started at 62 --
    // confirm the pension is still flowing post-death, not silently zeroed by the DRS-only
    // survivor step-down logic (survPensionPct defaults to 0, which would zero it if applied).
    const afterDeath = sim.rows.find((r) => r.aB > 70);
    expect(afterDeath.pens).toBeCloseTo(0.011 * 20 * 100000, 0);
  });

  it("simulate computes a CalSTRS pension via the CalSTRS age-factor formula", () => {
    const i = {
      ...baseState, ageA: 60, ageB: 60, stopA: 60, stopB: 60, claimA: 62, claimB: 62,
      pensionOn: true, pensionType: "calstrs", calstrsTier: "2at60", pensionAge: 60, pYears: 25, afc: 100000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.02 * 25 * 100000, 0); // 50,000
  });

  it("simulate computes a CalPERS pension via the representative-tier formula", () => {
    const i = {
      ...baseState, ageA: 55, ageB: 55, stopA: 55, stopB: 55, claimA: 62, claimB: 62,
      pensionOn: true, pensionType: "calpers", calpersTier: "classic2at55", pensionAge: 55, pYears: 20, afc: 100000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.02 * 20 * 100000, 0); // 40,000
  });

  it("calstrsTier and calpersTier are independent fields, so a leftover CalSTRS tier value never leaks into a CalPERS calculation", () => {
    // Regression guard: these two systems used to share one i.pensionTier field with
    // non-overlapping value domains, so switching pension types left a stale tier value
    // that silently drove the wrong benefit-factor table (see the DEFAULT_PENSION_TYPE /
    // calstrsTier comment in simulate.js). A CalSTRS "2at62" leftover must not affect CalPERS.
    const i = {
      ...baseState, ageA: 62, ageB: 62, stopA: 62, stopB: 62, claimA: 62, claimB: 62,
      pensionOn: true, pensionType: "calpers", calstrsTier: "2at62", calpersTier: "pepra2at62",
      pensionAge: 62, pYears: 20, afc: 100000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(calpersPensionAnnual(62, 20, 100000, "pepra2at62"), 0);
  });

  it("simulate computes a Texas TRS pension via the 2.3% formula", () => {
    const i = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: true, pensionType: "txtrs", pensionAge: 65, pYears: 25, afc: 80000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.023 * 25 * 80000, 0); // 46,000
  });

  it("simulate computes a NYSTRS pension via the tiered pension-factor formula", () => {
    const i = {
      ...baseState, ageA: 63, ageB: 63, stopA: 63, stopB: 63, claimA: 65, claimB: 65,
      pensionOn: true, pensionType: "nystrs", pensionAge: 63, pYears: 25, afc: 90000,
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo((0.35 + 5 * 0.02) * 90000, 0); // 40,500, unreduced at 63
  });

  it("simulate computes an Ohio STRS pension only on the unreduced path", () => {
    const eligible = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: true, pensionType: "ohiostrs", pensionAge: 65, pYears: 20, afc: 80000,
    };
    const row = simulate(eligible, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.022 * 20 * 80000, 0); // 35,200

    const reducedOnly = { ...eligible, ageA: 60, ageB: 60, stopA: 60, stopB: 60, pensionAge: 60, pYears: 27 };
    const row2 = simulate(reducedOnly, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row2.pens).toBe(0); // reduced path deliberately not modeled -- no published reduction table
  });

  it("simulate computes a military pension with the 20-year cliff and plan-specific multiplier", () => {
    const highThree = {
      ...baseState, ageA: 45, ageB: 45, stopA: 45, stopB: 45, claimA: 62, claimB: 62,
      pensionOn: true, pensionType: "military", militaryPlan: "highThree", pensionAge: 45, pYears: 20, afc: 100000,
    };
    const row = simulate(highThree, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.50 * 100000, 0); // 50,000

    const belowCliff = { ...highThree, pYears: 19 };
    const row2 = simulate(belowCliff, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row2.pens).toBe(0);
  });

  // --- simulate.js (row-level dollar identities) ---
  it("annualizes pension and Social Security correctly in the simulated rows", () => {
    const i = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: true, pensionAge: 65, plan: 2, pYears: 20, afc: 78000,
      ssModeA: "statement", ssFraA: 24000, ssModeB: "statement", ssFraB: 0,
      savings: 800000, contrib: 0, tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
      inher: [], incomeHH: 0, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false },
    };
    const row = simulate(i, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2026);
    expect(row.pens).toBeCloseTo(0.02 * 20 * 78000, 0);                       // 31,200/yr, not /12 or *12
    expect(row.ssA).toBeCloseTo(2000 * (1 - 24 * (5 / 9) / 100) * 12, 0);     // FRA 24k, claim 65 reduction, annualized
  });
});

describe("Monte Carlo input guard", () => {
  it("throws when paths is not positive", () => {
    expect(() => runMonteCarlo({ ...baseState }, { paths: 0 })).toThrow(/paths must be > 0/);
  });
});

describe("configurable plan horizon", () => {
  const base = {
    ...baseState, inher: [], incomeHH: 165000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
    travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false },
  };

  it("projects to the configured horizon age", () => {
    const sim = simulate({ ...base, horizonAge: 100 }, { haircut: 1, cutYear: 9999 });
    expect(sim.rows[sim.rows.length - 1].aA).toBe(100); // ageA 45 + 55
  });

  it("never produces empty rows when both ages exceed the horizon", () => {
    const sim = simulate({ ...base, ageA: 96, ageB: 96, horizonAge: 95 }, { haircut: 1, cutYear: 9999 });
    expect(sim.rows.length).toBe(1);
    expect(sim.rows[0].aA).toBe(96);
  });

  it("does not throw in calculatePlan for an over-horizon household", () => {
    expect(() => calculatePlan({ ...baseState, ageA: 96, ageB: 96, horizonAge: 95 })).not.toThrow();
  });
});

describe("Social Security lower-bound guards", () => {
  it("never returns a negative own or spousal benefit and floors claim age at 62", () => {
    expect(ownBenefitAtClaimMonthly(1000, 45)).toBeGreaterThanOrEqual(0);
    expect(ownBenefitAtClaimMonthly(1000, 50)).toBe(ownBenefitAtClaimMonthly(1000, 62));
    expect(spousalBenefitAtClaimMonthly(2000, 55)).toBe(spousalBenefitAtClaimMonthly(2000, 62));
  });

  it("floors AIME at 0 for negative income", () => {
    expect(piaFromIncome(-50000)).toBe(0);
  });
});

describe("pensionERF age rounding", () => {
  it("floors fractional ages so 64.5 maps to the age-64 factor, not full benefit", () => {
    expect(pensionERF(64.5, 20, 2)).toBe(0.9085);
    expect(pensionERF(64.9, 20, 2)).toBe(0.9085);
    expect(pensionERF(65, 20, 2)).toBe(1);
  });
});

describe("travel taper boundaries", () => {
  it("switches to slow-go exactly at the slow year and ignores the slow year when taper is off", () => {
    const t = { on: true, amount: 15000, startYear: 2034, slowYear: 2038, endYear: 2042, taper: true, slowPct: 50 };
    expect(travelSpendForYear(t, 2037, 0)).toBe(15000);          // last go-go year
    expect(travelSpendForYear(t, 2038, 0)).toBe(7500);           // first slow-go year
    expect(travelSpendForYear({ ...t, taper: false }, 2038, 0)).toBe(15000); // flat ignores slow year
  });
});

describe("coverage-gap guards", () => {
  const retired = {
    ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
    pensionOn: false, contrib: 0, tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    inher: [], incomeHH: 0, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
    travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false }, horizonAge: 95,
  };

  it("caps withdrawal at the balance and flags depletion when the portfolio can't cover the need", () => {
    const sim = simulate({ ...retired, incomeHH: 100000, savings: 20000, targetPct: 1.0, ssModeA: "statement", ssFraA: 0, ssModeB: "statement", ssFraB: 0 }, { haircut: 1, cutYear: 9999 });
    const first = sim.rows[0];
    expect(first.wd).toBeGreaterThan(0); // forced to draw
    expect(first.bal).toBe(0);           // capped at the (drained) balance
    expect(sim.depAge).not.toBeNull();   // depletion flagged
  });

  it("caps SS delayed credits at age 70 (36-month cap)", () => {
    expect(ownBenefitAtClaimMonthly(1000, 71.5)).toBe(ownBenefitAtClaimMonthly(1000, 70));
  });

  it("returns a Plan-3 vesting note below 10 years and clears it at 10", () => {
    expect(drsEligibilityNote(55, 9, 3)).not.toBe("");
    expect(drsEligibilityNote(55, 10, 3)).toBe("");
  });

  it("falls back to realReturn when the returns array is shorter than the horizon", () => {
    const sim = simulate({ ...retired, savings: 500000, realReturn: 0.05 }, { haircut: 1, cutYear: 9999, returns: [] });
    expect(sim.rows.length).toBeGreaterThan(0); // no crash; every year falls back to realReturn
  });

  it("uses the never-retire fallback for fullyRetAge when work never stops", () => {
    const sim = simulate({ ...retired, ageA: 60, ageB: 60, stopA: 200, stopB: 200, incomeA: 50000, incomeB: 50000 }, { haircut: 1, cutYear: 9999 });
    expect(sim.fullyRetAge).toBe(60);
  });
});

describe("senior bonus 2028 sunset", () => {
  it("applies the $6k senior bonus through 2028 and drops it after", () => {
    const args = { status: "married", ageA: 70, ageB: 70, agi: 100000 };
    const within = standardDeduction({ ...args, year: 2028 });
    const after = standardDeduction({ ...args, year: 2029 });
    expect(within - after).toBe(12000); // two seniors x $6k bonus
  });

  it("keeps the bonus when no year is supplied (backward compatible)", () => {
    expect(standardDeduction({ status: "married", ageA: 65, ageB: 65, agi: 100000 })).toBe(47500);
  });
});

describe("location-aware additional income tax", () => {
  it("adds the state/foreign rate on top of federal tax", () => {
    const fed = calculateFederalTaxYear({ status: "married", ageA: 70, ageB: 70, pension: 60000, year: 2030 });
    const withState = calculateFederalTaxYear({ status: "married", ageA: 70, ageB: 70, pension: 60000, year: 2030, stateRate: 0.05 });
    expect(withState.tax - fed.tax).toBeCloseTo(0.05 * fed.taxableIncome, 6);
  });

  it("applies a higher modeled tax in a high-tax locale than a no-tax one", () => {
    // Wave 3 D1: the residence layer only taxes the deferred PORTION of a draw. Under the
    // default tax-smart order (taxable→deferred→roth) the modest steady-state draw comes
    // entirely from the taxable bucket (ordinaryShare 0), so the locale differential
    // vanishes — both locales tax only pension+SS, identically. To exercise the
    // locale-differential-on-deferred-withdrawal behavior this test asserts, draw from the
    // deferred bucket first so there IS a deferred withdrawal for the residence layer to tax.
    const order = ["deferred", "taxable", "roth"];
    const nl = calculatePlan({ ...baseState, retireLoc: "Netherlands", withdrawalOrder: order });   // addlTaxRate 0.08
    const tx = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida", withdrawalOrder: order }); // 0%
    expect(nl.steady.tax).toBeGreaterThan(tx.steady.tax);
  });

  it("lets an explicit stateRate override the location default", () => {
    const base = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida" });        // 0%
    const overridden = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida", stateRate: 0.05 });
    expect(overridden.steady.tax).toBeGreaterThan(base.steady.tax);
  });
});

describe("typed residence tax — single-tax-source invariant (Task 6)", () => {
  // The headline (steadyState) and the year-by-year rows must use the SAME tax
  // computation. The steady-state row's tax is rebuilt by steadyState() with the
  // typed residence layer; the simulated row carries the same composition, so the
  // chosen steady row's tax must match what steadyState reports for guaranteed-only.

  it("adds a typed residence-tax layer for Austria at net-of-treaty rate (Wave 3 T7: 0→0.05)", () => {
    // Wave 3 T7: Austria net-of-treaty 0→0.05 (verify with a cross-border specialist).
    // INTL_TAX.Austria.retireRate changed from 0.0 to 0.05.
    // The typed residence layer only fires when:
    //   (a) relocationYear is set so activeJurisdiction returns the INTL_TAX profile, AND
    //   (b) the steady-state draw includes a deferred portion (ordinaryShare > 0).
    // Force both: use deferred-first withdrawal order (same as the Netherlands test above)
    // and set relocationYear before the steady-state year so the typed path is active.
    // pensionExclusion:"full" → DRS pension excluded; taxesSS:false → SS excluded from base.
    // Only the deferred withdrawal is residence-taxed at 5%, raising Austria tax above TX (0%).
    const order = ["deferred", "taxable", "roth"];
    const austria = calculatePlan({
      ...baseState, retireLoc: "Austria", stateCode: null, stateRate: null,
      withdrawalOrder: order, relocationYear: 2026,
    });
    const txDomestic = calculatePlan({
      ...baseState, retireLoc: "US -- Texas / Florida", stateCode: null, stateRate: null,
      withdrawalOrder: order, relocationYear: 2026,
    });
    // Austria retireRate 0.05 on deferred draws → higher total tax than TX (retireRate 0).
    expect(austria.steady.tax).toBeGreaterThan(txDomestic.steady.tax);
    // Residence layer (stateTax) must be positive for Austria.
    expect(austria.steady.taxDetails.stateTax).toBeGreaterThan(0);
  });

  it("applies a higher headline tax for a US state that taxes pension+withdrawals (CA) than a no-tax one (TX)", () => {
    const ca = calculatePlan({ ...baseState, stateCode: "CA" }); // 8% on pension + deferred
    const tx = calculatePlan({ ...baseState, stateCode: "TX" }); // 0
    expect(ca.steady.tax).toBeGreaterThan(tx.steady.tax);
  });

  it("an explicit stateRate override re-engages the flat path even when a typed location exists", () => {
    // Austria typed (retireRate 0.05 after Wave 3 T7) → residence tax on deferred draws;
    // a 10% override must raise the tax further above the typed 5% rate.
    const typed = calculatePlan({ ...baseState, retireLoc: "Austria", stateCode: null, stateRate: null });
    const overridden = calculatePlan({ ...baseState, retireLoc: "Austria", stateCode: null, stateRate: 0.10 });
    expect(overridden.steady.tax).toBeGreaterThan(typed.steady.tax);
  });
});

describe("live-in inheritance timing", () => {
  it("activates the owned tenure override only from the year after inheritance (Task 5)", () => {
    // Task 5 re-baseline: the old flat liveSav credit is replaced by an owned tenure
    // override. With homeValue=0 the carrying cost is 0, so need is EQUAL in both
    // years (no housing cost either way). The key invariant is that the override does
    // NOT activate in the move year itself (cal === p.year), only from cal > p.year.
    // We verify timing by checking need is unchanged in the move year (2030) and that
    // the override is active in 2031 — the need change between them now reflects the
    // delta between renting (i.housing) and owning (carrying cost of homeValue=0).
    const baseHousing = {
      tenure: "rent", rent: 1000, // $12k/yr
      mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
      homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01,
    };
    const i = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: false, savings: 800000, contrib: 0, targetPct: 0.5,
      incomeHH: 100000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false }, horizonAge: 95,
      housing: baseHousing,
      // Minimal live entry: homeValue 0 → owned carrying cost is 0 → rent ($12k) is saved
      inher: [{ type: "live", year: 2030, live: 0, homeValue: 0, ownRate: 0 }],
    };
    const sim = simulate(i, { haircut: 1, cutYear: 9999 });
    const moveYear = sim.rows.find((r) => r.cal === 2030).need;
    const after = sim.rows.find((r) => r.cal === 2031).need;
    // From 2031 housing switches from rent ($12k/yr) to owned (carrying cost $0),
    // so the need drops by exactly the annual rent that was previously in housing.
    // M1 note: homeValue=0 makes the owned carrying cost $0, so the saving equals the
    // FULL rent — this test proves the year+1 TIMING, not the economic magnitude of a
    // real owned home (that is exercised by the Texas/Austria tests below).
    expect(moveYear - after).toBe(12000); // override activates in 2031 not 2030
  });
});

describe("inherited live-in switches housing to owned carrying cost (Task 5)", () => {
  it("switches housing to owned carrying cost from the live year; need drops vs renting", () => {
    // Arrange: income-basis persona renting at $1,650/mo ($19,800/yr). The Austria
    // home (value 324000, ownRate 0.012) is inherited in 2040. From 2041 the housing
    // line switches from rent to owned carrying cost (0.012 × 324000 = $3,888/yr).
    // No double credit: the old flat liveSav credit is removed.
    const i = {
      ...baseState,
      ageA: 45, ageB: 45, stopA: 60, stopB: 60, claimA: 67, claimB: 67,
      pensionOn: false, savings: 300000, contrib: 0,
      targetPct: 0.28, realReturn: 0.05, swr: 0.04, tradFrac: 0,
      incomeHH: 165000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 },
      ltc: { on: false }, horizonAge: 95,
      housing: {
        tenure: "rent", rent: 1650, // $1,650/mo = $19,800/yr
        mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
        homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01,
      },
      // Austria home via inher directly (bypasses buildInheritanceInputs for isolation)
      at: { on: false }, tx: { on: false },
      inher: [{ type: "live", year: 2042, live: 0, homeValue: 324000, ownRate: 0.012 }],
    };
    const sim = simulate(i, { haircut: 1, cutYear: 9999 });
    // Act — both spouses retire at 60 (2041) and turn 65 in 2046, so 2041–2045 are all
    // retired AND under 65: the Task 8 pre-65 healthcare bridge is ON for both spouses in
    // every comparison year, so it cancels in the delta and we isolate the pure housing
    // saving. The live-in owned override activates the year after 2042 (year+1 convention).
    const before = sim.rows.find((r) => r.cal === 2042); // retired, under 65, still renting
    const after  = sim.rows.find((r) => r.cal === 2043); // retired, under 65, owned override active
    // Assert: owned carrying cost (0.012 × 324000 = $3,888) < annual rent ($19,800)
    // so need drops once the override is active.
    expect(after.need).toBeLessThan(before.need);
    // With healthcare identical (both retired & under 65 in both rows), the delta is the pure
    // housing saving: rent $19,800/yr → owned carrying cost $3,888/yr → saving ≈ $15,912/yr.
    const delta = before.need - after.need;
    expect(delta).toBeGreaterThan(10000); // well above zero: override is real
    expect(delta).toBeLessThan(25000);    // bounded: no double-count
  });

  it("does not double-apply state property tax on a US inherited owned home (I1)", () => {
    // I1 locking test: PROP.ownRate is a COMBINED carrying-cost rate (property tax +
    // insurance + maintenance) that the override folds into maintenancePct. The state
    // property-tax rate (activePropertyTaxRate) must NOT be applied again on top — else
    // a US inherited home (TX, propertyTaxRate 0.0163) double-counts its property tax.
    // The owned-year carrying cost must equal exactly ownRate × homeValue.
    // Arrange
    const homeValue = 790000;     // Texas home value
    const ownRate = 0.027;        // PROP.tx.ownRate (combined carrying cost)
    const stateRate = 0.0163;     // a non-zero US state property-tax rate (e.g. TX)
    const common = {
      ...baseState,
      ageA: 45, ageB: 45, stopA: 62, stopB: 60, claimA: 67, claimB: 67,
      pensionOn: false, savings: 300000, contrib: 0,
      targetPct: 0.28, realReturn: 0.05, swr: 0.04, tradFrac: 0,
      incomeHH: 165000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 },
      ltc: { on: false }, horizonAge: 95,
      activePropertyTaxRate: stateRate, // US retirement jurisdiction with a real rate
      at: { on: false }, tx: { on: false },
    };
    const withHome = {
      ...common,
      housing: { tenure: "rent", rent: 1650, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01 },
      inher: [{ type: "live", year: 2040, live: 0, homeValue, ownRate }],
    };
    // A baseline with zero housing + no inheritance isolates the non-housing need, so
    // (owned-year need − baseline need) equals the inherited home's carrying cost.
    const zeroHousing = {
      ...common,
      housing: { tenure: "rent", rent: 0, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
      inher: [],
    };
    // Act
    const owned = simulate(withHome, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2041).need;
    const base = simulate(zeroHousing, { haircut: 1, cutYear: 9999 }).rows.find((r) => r.cal === 2041).need;
    const carry = owned - base;
    // Assert: carrying cost is exactly ownRate × homeValue (NOT ownRate×v + stateRate×v).
    const expectedCarry = ownRate * homeValue;                 // 0.027 × 790000 = 21,330
    const doubleCounted = expectedCarry + stateRate * homeValue; // the bug: + 12,877
    expect(carry).toBeCloseTo(expectedCarry, 0);
    expect(carry).not.toBeCloseTo(doubleCounted, 0);
  });

  it("does not double-count: need in the move year (2040) is unchanged from 2039", () => {
    // The override only activates for cal > p.year (year+1 convention), so the
    // move year itself (2040) must show the same housing line as 2039.
    const i = {
      ...baseState,
      ageA: 45, ageB: 45, stopA: 62, stopB: 60, claimA: 67, claimB: 67,
      pensionOn: false, savings: 300000, contrib: 0,
      targetPct: 0.28, realReturn: 0.05, swr: 0.04, tradFrac: 0,
      incomeHH: 165000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 },
      ltc: { on: false }, horizonAge: 95,
      housing: {
        tenure: "rent", rent: 1650,
        mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
        homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01,
      },
      at: { on: false }, tx: { on: false },
      inher: [{ type: "live", year: 2040, live: 0, homeValue: 324000, ownRate: 0.012 }],
    };
    const sim = simulate(i, { haircut: 1, cutYear: 9999 });
    const yr2039 = sim.rows.find((r) => r.cal === 2039);
    const yr2040 = sim.rows.find((r) => r.cal === 2040); // transition year — no override yet
    // Housing is still rent in the move year; need is the same as the prior year
    // (ignoring age-driven healthcare changes — both spouses are same age).
    expect(yr2040.need).toBe(yr2039.need);
  });
});

describe("future property sale in steady state", () => {
  it("discounts a post-steady-year sale back to the steady year in FV", () => {
    const i = { ...baseState, inher: [{ type: "sell", year: 2050, sell: 100000 }], incomeHH: 165000, realReturn: 0.05 };
    const row = { aA: 67, aB: 67, cal: 2048, bal: 1_000_000, need: 50000, survivor: false, ssA: 30000, ssB: 18000, pens: 20000 };
    const s = steadyState(i, { rows: [row] });
    expect(s.FV).toBeCloseTo(1_000_000 + 100000 / Math.pow(1.05, 2), 2);
  });
});

describe("steadyState erf sentinel", () => {
  it("returns erf null (not 1) when the pension is disabled", () => {
    const plan = calculatePlan({ ...baseState, pensionOn: false });
    expect(plan.steady.erf).toBeNull();
  });

  it("returns a numeric erf when the pension is enabled", () => {
    const plan = calculatePlan({ ...baseState, pensionOn: true });
    expect(typeof plan.steady.erf).toBe("number");
  });
});

describe("required minimum distributions", () => {
  it("derives the first-RMD age from birth year (SECURE 2.0)", () => {
    expect(rmdStartAge(1960)).toBe(75);
    expect(rmdStartAge(1981)).toBe(75);
    expect(rmdStartAge(1959)).toBe(73);
    expect(rmdStartAge(1951)).toBe(73);
  });

  it("uses the IRS Uniform Lifetime divisors and clamps past the table", () => {
    expect(uniformLifetimeFactor(73)).toBe(26.5);
    expect(uniformLifetimeFactor(75)).toBe(24.6);
    expect(uniformLifetimeFactor(95)).toBe(8.9);
    expect(uniformLifetimeFactor(70)).toBe(27.4); // below the table -> first row
    expect(uniformLifetimeFactor(120)).toBe(6.4); // past the table -> last row
  });

  it("computes the minimum as prior-year balance over the divisor", () => {
    expect(requiredMinimum(500000, 73)).toBeCloseTo(18867.92, 2);
  });

  // Age 75 in 2026 (born 1951), retired, guaranteed income covers the spending need so
  // the need-based draw is zero. Zero real return isolates the RMD's effect on balance.
  const rmdBase = {
    ...baseState,
    ageA: 75, ageB: 75, stopA: 70, stopB: 70, claimA: 67, claimB: 67,
    pensionOn: false, savings: 1_000_000, contrib: 0,
    targetPct: 0.25, realReturn: 0,
    ssModeA: "statement", ssModeB: "statement", ssFraA: 40000, ssFraB: 20000,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    travel: { on: false }, events: [], horizonAge: 80,
    // Wave 2 Task 4: zero out housing so guaranteed income still covers the need
    // and the RMD mechanics remain the sole focus of these tests.
    housing: { tenure: "rent", rent: 0, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
  };

  it("leaves the timeline untouched when there is no pre-tax balance", () => {
    const rows = calculatePlan({ ...rmdBase, tradFrac: 0 }).simChosen.rows;
    expect(rows.every((r) => r.rmd === 0 && r.forcedRmd === 0)).toBe(true);
    expect(rows.find((r) => r.cal === 2026).wd).toBe(0); // guaranteed income covers the need
  });

  it("forces a taxable draw once the RMD exceeds the need-based withdrawal", () => {
    const withDeferred = calculatePlan({ ...rmdBase, tradFrac: 1 }).simChosen.rows;
    const noDeferred = calculatePlan({ ...rmdBase, tradFrac: 0 }).simChosen.rows;
    const r1 = withDeferred.find((r) => r.cal === 2026);
    const r0 = noDeferred.find((r) => r.cal === 2026);
    expect(r1.forcedRmd).toBeGreaterThan(0);
    expect(r1.wd).toBeGreaterThan(r0.wd);
    expect(r1.tax).toBeGreaterThan(r0.tax);
    // The forced draw equals the Uniform Lifetime computation off the prior-year base.
    expect(r1.wd).toBeCloseTo(requiredMinimum(1_000_000, 75), 0);
  });

  it("reinvests the after-tax remainder of a forced RMD into the taxable portfolio", () => {
    const r = calculatePlan({ ...rmdBase, tradFrac: 1 }).simChosen.rows.find((r) => r.cal === 2026);
    // With zero real return the year opens at the full $1M balance. If the forced RMD's
    // after-tax cash were discarded the balance would drop by the entire gross draw;
    // reinvestment keeps it above that floor (only the incremental tax leaves the plan).
    expect(r.bal).toBeGreaterThan(1_000_000 - r.forcedRmd);
  });

  it("exposes the after-tax RMD recycling as rmdReinvest on the row", () => {
    const r = calculatePlan({ ...rmdBase, tradFrac: 1 }).simChosen.rows.find((r) => r.cal === 2026);
    // The recycled amount is the forced gross minus its incremental tax: positive,
    // never more than the forced draw itself.
    expect(r.rmdReinvest).toBeGreaterThan(0);
    expect(r.rmdReinvest).toBeLessThanOrEqual(r.forcedRmd);
    // No forced RMD -> nothing recycled.
    const r0 = calculatePlan({ ...rmdBase, tradFrac: 0 }).simChosen.rows.find((r) => r.cal === 2026);
    expect(r0.rmdReinvest).toBe(0);
  });

  it("exposes the bucket and flow fields the investments chart reads", () => {
    const r = calculatePlan({ ...rmdBase, tradFrac: 1 }).simChosen.rows.find((r) => r.cal === 2026);
    // Total draw splits into the spending portion plus the forced RMD.
    expect(r.wd).toBe(r.wdSpend + r.forcedRmd);
    // The tax-deferred bucket is tracked and never exceeds the total balance.
    expect(r.defBal).toBeGreaterThanOrEqual(0);
    expect(r.defBal).toBeLessThanOrEqual(r.bal);
    expect(typeof r.growth).toBe("number"); // zero real return here -> no growth
    expect(r.growth).toBe(0);
  });
});

describe("monthly breakdown (year-by-year navigator)", () => {
  it("derives each monthly income figure as the annual value divided by 12", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    const row = rows.find((r) => r.ssA > 0 && r.pens > 0); // a fully-retired, fully-claimed year
    const b = monthlyBreakdown(row);
    expect(b.income.ssA).toBeCloseTo(row.ssA / 12, 6);
    expect(b.income.pens).toBeCloseTo(row.pens / 12, 6);
    expect(b.draw).toBeCloseTo((row.wdSpend ?? row.wd) / 12, 6);
  });

  it("splits expenses into core living (need minus extra minus housing), extra, housing, and tax", () => {
    // Task 9: living now excludes housing so housing can show as its own labeled line.
    // Before Task 9: living = (need - extraSpend) / 12
    // After  Task 9: living = (need - extraSpend - housing) / 12
    const rows = calculatePlan(baseState).simChosen.rows;
    const row = rows.find((r) => r.extraSpend > 0) ?? rows[rows.length - 1];
    const b = monthlyBreakdown(row);
    expect(b.expenses.extra).toBeCloseTo(row.extraSpend / 12, 6);
    expect(b.expenses.living).toBeCloseTo((row.need - row.extraSpend - (row.housing ?? 0)) / 12, 6);
    // taxExRmd excludes a forced RMD's self-funded incremental tax; equals row.tax when no RMD forced.
    expect(b.expenses.tax).toBeCloseTo((row.taxExRmd ?? row.tax) / 12, 6);
  });

  it("reconciles to ~zero net in a binding retirement year (draw funds the gap)", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    // A fully-retired year where the portfolio draw is the binding source of cash.
    const row = rows.find((r) => r.salA === 0 && r.salB === 0 && (r.wdSpend ?? r.wd) > 0);
    const b = monthlyBreakdown(row);
    expect(Math.abs(b.netMo)).toBeLessThan(1); // within sub-dollar rounding
  });

  it("shows a positive monthly surplus while still working", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    const row = rows.find((r) => r.salA > 0 || r.salB > 0); // a working year
    const b = monthlyBreakdown(row);
    expect(b.netMo).toBeGreaterThan(0);
  });

  // Regression: a forced RMD's incremental tax is self-funded by the RMD's own proceeds
  // (simulate.js reinvests the after-tax remainder), not paid out of guaranteed income.
  // Charging that tax against guaranteed income manufactured a phantom monthly deficit
  // even in years where guaranteed income comfortably covered the spending need.
  it("does not manufacture a deficit from a forced RMD's self-funded tax", () => {
    const rmdBase = {
      ...baseState,
      ageA: 96, ageB: 87, stopA: 62, stopB: 60, claimA: 67, claimB: 67,
      pensionOn: false, savings: 3_000_000, contrib: 0,
      targetPct: 0.25, realReturn: 0,
      ssModeA: "statement", ssModeB: "statement", ssFraA: 50000, ssFraB: 22000,
      tx: { on: false }, at: { on: false },
      travel: { on: false }, events: [], horizonAge: 97,
      housing: { tenure: "rent", rent: 1200, mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 }, homeValue: 0, insuranceAnnual: 0, maintenancePct: 0 },
    };
    const row = calculatePlan({ ...rmdBase, tradFrac: 1 }).simChosen.rows.find((r) => r.cal === 2026);
    expect(row.forcedRmd).toBeGreaterThan(0); // sanity: RMD forcing is actually exercised
    expect(row.wdSpend).toBe(0); // guaranteed income covers the spending need
    expect(row.taxExRmd).toBeLessThan(row.tax); // the RMD added incremental tax on top

    const b = monthlyBreakdown(row);
    // Guaranteed income covers spending: the household is NOT in a monthly deficit.
    expect(b.netMo).toBeGreaterThanOrEqual(0);
    // The RMD's self-funded tax is surfaced separately, not folded into expenses.
    expect(b.rmdTax).toBeGreaterThan(0);
  });
});

describe("year milestones", () => {
  it("flags the first Social Security year as an income milestone", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    const idx = rows.findIndex((r) => r.ssA > 0);
    const ms = yearMilestones(rows[idx], rows[idx - 1], baseState);
    expect(ms.some((e) => e.key === "ssA" && e.kind === "income")).toBe(true);
  });

  it("flags Medicare eligibility at age 65", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    const row = rows.find((r) => r.aA === 65);
    const ms = yearMilestones(row, null, baseState);
    expect(ms.some((e) => e.key === "med-a")).toBe(true);
  });

  it("flags a home sale with its lump-sum amount", () => {
    const sold = { ...baseState, properties: [{ id: "p1", place: "Austria", value: 324000, year: 2040, strategy: "sell", on: true }] };
    const rows = calculatePlan(sold).simChosen.rows;
    const row = rows.find((r) => r.sellLump > 0);
    const ms = yearMilestones(row, null, sold);
    const sale = ms.find((e) => e.key === "sell");
    expect(sale).toBeTruthy();
    expect(sale.amount).toBe(Math.round(row.sellLump));
  });

  it("returns no milestones for an empty row", () => {
    expect(yearMilestones(null, null, baseState)).toEqual([]);
  });
});

describe("location-cost spending basis", () => {
  // A tiny synthetic location keeps the arithmetic obvious: basket = $1,500/mo.
  const loc = { m: { rent: 1000, food: 500 }, hcPre: 600, hcPost: 400 };
  const base = { spendBasis: "location", lifestyle: 100, status: "married", retLocObj: loc };

  it("derives the need from the basket × 12 plus age-based healthcare (post-65)", () => {
    // basket 1500*12 = 18000; healthcare 400/2 per person *2 *12 = 4800.
    expect(spendingNeed(base, 70, 70)).toBe(18000 + 4800);
  });

  it("uses the higher pre-65 healthcare figure before Medicare", () => {
    // healthcare 600/2 per person *2 *12 = 7200.
    expect(spendingNeed(base, 60, 60)).toBe(18000 + 7200);
  });

  it("steps healthcare down as each spouse turns 65", () => {
    const mixed = spendingNeed(base, 66, 60); // one post-65, one pre-65
    expect(mixed).toBe(18000 + (200 + 300) * 12);
  });

  it("scales living by the single-person factor in a survivor year", () => {
    const need = spendingNeed(base, 70, 70, 0, true, 70);
    expect(need).toBe(18000 * SINGLE_COST_FACTOR + 200 * 12); // one person's healthcare
  });

  it("scales living (not healthcare) by the lifestyle multiplier", () => {
    const lux = spendingNeed({ ...base, lifestyle: 130 }, 70, 70);
    expect(lux).toBe(18000 * 1.3 + 4800);
  });

  it("offsets the need with inherited-home rent savings (liveSav)", () => {
    expect(spendingNeed(base, 70, 70, 5000)).toBe(18000 + 4800 - 5000);
  });

  it("leaves the income basis untouched when spendBasis is absent", () => {
    const inc = { incomeHH: 100000, targetPct: 0.4, hcPre: 2450, hcPost: 1000 };
    expect(spendingNeed(inc, 70, 70)).toBe(40000); // both 65+, no healthcare bump
  });

  it("flows the location basis through calculatePlan into row.need", () => {
    const us = LOCATIONS.find((l) => l.name === "US -- national average");
    const basket = Object.values(us.m).reduce((a, b) => a + b, 0) * 12;
    const plan = calculatePlan({ ...baseState, spendBasis: "location", retireLoc: us.name });
    // Task 8: 2032 (age 51) is a WORKING year — both spouses carry employer insurance, so the
    // pre-65 ACA bridge is gated OFF and healthcare uses the post-65/Medicare figure (hcPost).
    // (Pre-Task-8 this wrongly billed hcPre while still employed.)
    const row = plan.simChosen.rows.find((r) => r.cal === 2032);
    const hc = (us.hcPost / 2) * 2 * 12; // both working → Medicare-equivalent, not ACA bridge
    expect(row.need).toBe(Math.round(basket + hc));
  });

  it("uses the pre-65 ACA bridge once retired but still under 65 (location basis)", () => {
    // Same persona retired early (stop 58) so 2032 (age 58) is RETIRED and under 65 → bridge ON.
    const us = LOCATIONS.find((l) => l.name === "US -- national average");
    const basket = Object.values(us.m).reduce((a, b) => a + b, 0) * 12;
    const plan = calculatePlan({
      ...baseState, spendBasis: "location", retireLoc: us.name,
      ageA: 50, ageB: 50, stopA: 51, stopB: 51, savings: 3_000_000, pensionOn: false,
      tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    });
    const row = plan.simChosen.rows.find((r) => r.cal === 2032); // age 56, retired, under 65
    const hc = (us.hcPre / 2) * 2 * 12; // both retired & under 65 → full ACA bridge
    expect(row.need).toBe(Math.round(basket + hc));
  });
});

describe("Tier 1 locations (Mexico, Panama, Costa Rica)", () => {
  const TIER1_NAMES = ["Mexico", "Panama", "Costa Rica"];

  it("adds all three Tier 1 locations to LOCATIONS with a dataAsOf year and a full cost basket", () => {
    for (const name of TIER1_NAMES) {
      const loc = LOCATIONS.find((l) => l.name === name);
      expect(loc, `${name} missing from LOCATIONS`).toBeTruthy();
      expect(loc.region).not.toBe("US");
      expect(loc.dataAsOf).toBe(2026);
      expect(Object.values(loc.m).every((v) => typeof v === "number" && v > 0)).toBe(true);
    }
  });

  it("adds a matching INTL_TAX entry for each Tier 1 location, following the treaty-aware shape", () => {
    for (const name of TIER1_NAMES) {
      const tax = INTL_TAX[name];
      expect(tax, `${name} missing from INTL_TAX`).toBeTruthy();
      expect(tax.isInternational).toBe(true);
      expect(tax.pensionExclusion).toBe("full");
      expect(tax.exposureNotes.worldwide).toBeTruthy();
      expect(tax.exposureNotes.govtPension).toBeTruthy();
      expect(tax.exposureNotes.residenceTaxed).toBeTruthy();
      expect(tax.exposureNotes.filing).toBeTruthy();
    }
  });

  it("Panama and Costa Rica model 0 residence tax on retirement income (territorial systems)", () => {
    expect(INTL_TAX["Panama"].retireRate).toBe(0);
    expect(INTL_TAX["Costa Rica"].retireRate).toBe(0);
  });

  it("inheritanceRulesForPlace routes all three Tier 1 locations through the non-US (foreign) branch", () => {
    for (const name of TIER1_NAMES) {
      const rules = inheritanceRulesForPlace(name);
      expect(rules.foreign).toBe(true);
      expect(rules.region).not.toBe("US");
      // Foreign-branch constants (sellNet 0.90, rentYield 0.020, ownRate 0.012), not the US branch's.
      expect(rules.sellNet).toBe(0.90);
      expect(rules.rentYield).toBe(0.020);
      expect(rules.ownRate).toBe(0.012);
    }
  });
});

describe("Tier 2 locations (Thailand, Vietnam, Malaysia, Philippines, Australia, Uruguay)", () => {
  const TIER2_NAMES = ["Thailand", "Vietnam", "Malaysia", "Philippines", "Australia", "Uruguay"];

  it("adds all six Tier 2 locations to LOCATIONS with a dataAsOf year and a full cost basket", () => {
    for (const name of TIER2_NAMES) {
      const loc = LOCATIONS.find((l) => l.name === name);
      expect(loc, `${name} missing from LOCATIONS`).toBeTruthy();
      expect(loc.region).not.toBe("US");
      expect(loc.dataAsOf).toBe(2026);
      expect(Object.values(loc.m).every((v) => typeof v === "number" && v > 0)).toBe(true);
    }
  });

  it("adds a matching INTL_TAX entry for each Tier 2 location, following the treaty-aware shape", () => {
    for (const name of TIER2_NAMES) {
      const tax = INTL_TAX[name];
      expect(tax, `${name} missing from INTL_TAX`).toBeTruthy();
      expect(tax.isInternational).toBe(true);
      expect(tax.pensionExclusion).toBe("full");
      expect(tax.exposureNotes.worldwide).toBeTruthy();
      expect(tax.exposureNotes.govtPension).toBeTruthy();
      expect(tax.exposureNotes.residenceTaxed).toBeTruthy();
      expect(tax.exposureNotes.filing).toBeTruthy();
    }
  });

  it("does not apply one default addlTaxRate -- the range spans territorial (0) to Australia's worldwide 0.10", () => {
    expect(LOCATIONS.find((l) => l.name === "Philippines").addlTaxRate).toBe(0);
    expect(LOCATIONS.find((l) => l.name === "Malaysia").addlTaxRate).toBeCloseTo(0.005, 6);
    expect(LOCATIONS.find((l) => l.name === "Australia").addlTaxRate).toBe(0.10);
    expect(LOCATIONS.find((l) => l.name === "Vietnam").addlTaxRate).toBeGreaterThan(
      LOCATIONS.find((l) => l.name === "Thailand").addlTaxRate
    ); // Vietnam (no US treaty) modeled with materially higher tax uncertainty than Thailand
  });

  it("surfaces Australia's no-viable-retiree-visa product-honesty flag in its note", () => {
    const australia = LOCATIONS.find((l) => l.name === "Australia");
    expect(australia.note).toMatch(/no general retirement visa/i);
  });

  it("inheritanceRulesForPlace routes all six Tier 2 locations through the non-US (foreign) branch", () => {
    for (const name of TIER2_NAMES) {
      const rules = inheritanceRulesForPlace(name);
      expect(rules.foreign).toBe(true);
      expect(rules.region).not.toBe("US");
      expect(rules.sellNet).toBe(0.90);
      expect(rules.rentYield).toBe(0.020);
      expect(rules.ownRate).toBe(0.012);
    }
  });
});

describe("isGovernmentServicePensionType", () => {
  it("is true for every pensionType except generic", () => {
    for (const t of ["drs", "fers", "calstrs", "calpers", "txtrs", "nystrs", "ohiostrs", "military"]) {
      expect(isGovernmentServicePensionType(t)).toBe(true);
    }
  });

  it("is false for generic and defaults absent pensionType to true (drs)", () => {
    expect(isGovernmentServicePensionType("generic")).toBe(false);
    expect(isGovernmentServicePensionType(undefined)).toBe(true);
  });
});

describe("INTL_TAX govtPension exposure notes", () => {
  it("no longer name Washington DRS specifically -- every entry's wording is pension-type-neutral", () => {
    for (const key of Object.keys(INTL_TAX)) {
      expect(INTL_TAX[key].exposureNotes.govtPension).not.toMatch(/Washington DRS/);
    }
  });

  it("shares the common government-service-pension framing across entries (deduplication regression guard)", () => {
    expect(INTL_TAX["Austria"].exposureNotes.govtPension).toMatch(/^Your pension is a government-service pension/);
    expect(INTL_TAX["Panama"].exposureNotes.govtPension).toMatch(/^Your pension is a government-service pension/);
    // Vietnam's is a genuinely bespoke sentence (no US-Vietnam treaty) -- still pension-neutral.
    expect(INTL_TAX["Vietnam"].exposureNotes.govtPension).toMatch(/^Your pension is normally treaty-protected/);
  });
});

describe("Tier 3/4 locations (South Africa, Colombia, New Zealand, Japan) — completes the location roadmap", () => {
  const TIER34_NAMES = ["South Africa", "Colombia", "New Zealand", "Japan"];

  it("adds all four Tier 3/4 locations to LOCATIONS with a dataAsOf year and a full cost basket", () => {
    for (const name of TIER34_NAMES) {
      const loc = LOCATIONS.find((l) => l.name === name);
      expect(loc, `${name} missing from LOCATIONS`).toBeTruthy();
      expect(loc.region).not.toBe("US");
      expect(loc.dataAsOf).toBe(2026);
      expect(Object.values(loc.m).every((v) => typeof v === "number" && v > 0)).toBe(true);
    }
  });

  it("covers a sixth continent (Africa) via South Africa, completing coverage across Europe/N.America/S.America/Asia/Oceania/Africa", () => {
    const regions = new Set(LOCATIONS.map((l) => l.region));
    expect(regions.has("Africa")).toBe(true);
    expect(regions.has("Europe")).toBe(true);
    expect(regions.has("US")).toBe(true);
    expect(regions.has("Latin America")).toBe(true);
    expect(regions.has("Southeast Asia") || regions.has("East Asia")).toBe(true);
    expect(regions.has("Oceania")).toBe(true);
  });

  it("adds a matching INTL_TAX entry for each Tier 3/4 location, following the treaty-aware shape", () => {
    for (const name of TIER34_NAMES) {
      const tax = INTL_TAX[name];
      expect(tax, `${name} missing from INTL_TAX`).toBeTruthy();
      expect(tax.isInternational).toBe(true);
      expect(tax.pensionExclusion).toBe("full");
      expect(tax.exposureNotes.worldwide).toBeTruthy();
      expect(tax.exposureNotes.govtPension).toBeTruthy();
      expect(tax.exposureNotes.residenceTaxed).toBeTruthy();
      expect(tax.exposureNotes.filing).toBeTruthy();
    }
  });

  it("surfaces New Zealand's and Japan's product-honesty flags -- neither has a practical retiree-visa pathway", () => {
    const nz = LOCATIONS.find((l) => l.name === "New Zealand");
    const japan = LOCATIONS.find((l) => l.name === "Japan");
    expect(nz.note).toMatch(/PRODUCT-HONESTY FLAG/);
    expect(nz.note).toMatch(/no direct path to permanent residency/i);
    expect(japan.note).toMatch(/PRODUCT-HONESTY FLAG/);
    expect(japan.note).toMatch(/no dedicated retirement visa/i);
  });

  it("flags Japan's IRA/401(k) treatment as materially different from every other location (no tax-deferred recognition)", () => {
    expect(INTL_TAX["Japan"].exposureNotes.residenceTaxed).toMatch(/does NOT recognize US tax-deferred/);
  });

  it("Colombia models a near-zero residence rate under its Law 2381 foreign-pension exemption", () => {
    expect(INTL_TAX["Colombia"].retireRate).toBeLessThanOrEqual(0.02);
  });

  it("inheritanceRulesForPlace routes all four Tier 3/4 locations through the non-US (foreign) branch", () => {
    for (const name of TIER34_NAMES) {
      const rules = inheritanceRulesForPlace(name);
      expect(rules.foreign).toBe(true);
      expect(rules.region).not.toBe("US");
      expect(rules.sellNet).toBe(0.90);
      expect(rules.rentYield).toBe(0.020);
      expect(rules.ownRate).toBe(0.012);
    }
  });
});

describe("recurring life events", () => {
  const car = { id: "car", label: "Car", on: true, year: 2030, amount: 45000, everyYears: 10, untilYear: 2050 };

  it("fires a recurring event on its cadence within the window", () => {
    expect(scheduledSpendForYear([car], 2030)).toBe(45000); // start
    expect(scheduledSpendForYear([car], 2040)).toBe(45000); // +10
    expect(scheduledSpendForYear([car], 2050)).toBe(45000); // last (untilYear inclusive)
  });

  it("stays silent in the off-cadence years and past the until year", () => {
    expect(scheduledSpendForYear([car], 2035)).toBe(0); // not a multiple of 10 from start
    expect(scheduledSpendForYear([car], 2029)).toBe(0); // before start
    expect(scheduledSpendForYear([car], 2060)).toBe(0); // past untilYear
  });

  it("runs to the horizon when untilYear is unset", () => {
    const upkeep = { id: "up", on: true, year: 2030, amount: 6000, everyYears: 1 };
    expect(scheduledSpendForYear([upkeep], 2099)).toBe(6000);
  });

  it("treats an event with no everyYears as a one-time hit (back-compat)", () => {
    const wedding = { id: "w", on: true, year: 2032, amount: 15000 };
    expect(scheduledSpendForYear([wedding], 2032)).toBe(15000);
    expect(scheduledSpendForYear([wedding], 2033)).toBe(0);
  });

  it("flows a recurring event into the simulation's extraSpend", () => {
    const plan = calculatePlan({ ...baseState, events: [car] });
    const hit = plan.simChosen.rows.find((r) => r.cal === 2040);
    const miss = plan.simChosen.rows.find((r) => r.cal === 2041);
    expect(hit.extraSpend).toBeGreaterThanOrEqual(45000);
    expect(miss.extraSpend).toBe(0);
  });
});

describe("spendingNeed location basis (seam contract for 0D)", () => {
  const L = LOCATIONS.find((x) => x.m); // any location with a basket
  const i = { spendBasis: "location", retLocObj: L, status: "married", lifestyle: 100 };

  it("sums the cost-of-living basket plus age-based healthcare (couple, pre-65)", () => {
    const livingYr = Object.values(L.m).reduce((a, b) => a + b, 0) * 12;
    const hcYr = (L.hcPre / 2) * 2 * 12; // both under 65, couple
    expect(spendingNeed(i, 60, 60)).toBeCloseTo(livingYr + hcYr, 2);
  });

  it("applies the single/survivor cost factor and single healthcare", () => {
    const livingYr = Object.values(L.m).reduce((a, b) => a + b, 0) * 12 * SINGLE_COST_FACTOR;
    const hcYr = (L.hcPre / 2) * 12;
    expect(spendingNeed(i, 60, 60, 0, true, 60)).toBeCloseTo(livingYr + hcYr, 2);
  });

  it("scales living (not healthcare) by lifestyle and subtracts live-in saving", () => {
    const lo = spendingNeed({ ...i, lifestyle: 80 }, 70, 70, 5000);
    const base = spendingNeed(i, 70, 70, 0);
    expect(lo).toBeLessThan(base);
  });
});

describe("spending smile (seam contract for Wave 1 C1)", () => {
  it("spending smile scales the income base in retirement but not healthcare (C1)", () => {
    const base = {
      incomeHH: 200000, targetPct: 0.4, hcPre: 24000, hcPost: 12000,
      status: "married", spendBasis: "income",
    };
    const flat = spendingNeed({ ...base, spendingShape: { mode: "flat" } }, 75, 70, 0, false, null, { retireAgeA: 65 });
    const smiled = spendingNeed({ ...base, spendingShape: { mode: "smile", earlyDecline: 0.01, upturnAge: 85 } }, 75, 70, 0, false, null, { retireAgeA: 65 });
    expect(smiled).toBeLessThan(flat); // 10 years past retirement => ~10% lower base
  });
});

describe("recurring events (seam contract for Wave 1 C3)", () => {
  const ev = [{ on: true, year: 2030, amount: 45000, everyYears: 10, untilYear: 2050 }];
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

describe("yearReturn seam", () => {
  const i = { realReturn: 0.05 };
  it("prefers an injected return path", () => {
    expect(yearReturn(i, 2, { returns: [0.1, 0.2, 0.3] })).toBeCloseTo(0.3, 6);
  });
  it("applies the stress schedule when stress is set", () => {
    expect(yearReturn(i, 0, { stress: true })).toBeCloseTo(-0.10, 6); // STRESS_EARLY_DROP
  });
  it("falls back to the central real return", () => {
    expect(yearReturn(i, 10, {})).toBeCloseTo(0.05, 6);
  });
});

describe("lifestyle step need-composition guard (C2)", () => {
  it("a lifestyle step raises the need once its year arrives (C2)", () => {
    const i = { incomeHH: 200000, targetPct: 0.4, hcPre: 24000, hcPost: 12000, status: "married",
      spendBasis: "income", spendingShape: { mode: "flat" },
      lifestyleSteps: [{ id: "x", fromYear: 2040, deltaAnnual: 12000 }] };
    const before = spendingNeed(i, 78, 70, 0, false, null, { retireAgeA: 65, cal: 2039 });
    const after = spendingNeed(i, 79, 71, 0, false, null, { retireAgeA: 65, cal: 2040 });
    expect(after - before).toBeCloseTo(12000, 6);
  });
});

describe("emergent-shock overlay derivation (C3 / Task 10)", () => {
  it("shock balance in later years is lower than baseline when a large emergent event is active", () => {
    // Arrange: baseState extended with a large emergent event in a post-retirement
    // year (2055, age 74) so the spend is met from the portfolio (a withdrawal
    // regime, not a working-year surplus) and therefore compounds the balance down.
    const s = {
      ...baseState,
      events: [
        { id: "evt-shock", label: "Roof replacement", on: true, year: 2055, amount: 200000, type: "purchase", emergent: true },
      ],
      travel: { on: false, amount: 0, years: 0 },
      ltc: { on: false, startAge: 80, years: 3, annual: null },
      survivor: { on: false, year: 9999, pensionPct: 0 },
      life: { on: false, deathAgeA: 95, deathAgeB: 95, pensionPct: 0 },
      returnPreset: "custom",
      horizonAge: 95,
      spendingShape: { mode: "flat" },
      lifestyleSteps: [],
    };

    // Act: run calculatePlan which produces both simChosen (baseline) and simShock
    const { simChosen, simShock } = calculatePlan(s);

    // Pick a late row (after the event year) where the portfolio is in a withdrawal regime
    const laterRows = simChosen.rows.filter(r => r.aA >= 75);
    expect(laterRows.length).toBeGreaterThan(0);

    const lastAge = laterRows[laterRows.length - 1].aA;
    const baselineBal = laterRows[laterRows.length - 1].bal;
    const shockBal = simShock.rows.find(r => r.aA === lastAge)?.bal ?? 0;

    // Assert: shock scenario has a strictly lower balance in late years — a large
    // emergent expenditure in a withdrawal year compounds to a strictly lower balance.
    expect(shockBal).toBeLessThan(baselineBal);
  });

  it("shock balance equals baseline when no emergent events are enabled", () => {
    // Arrange: events present but none marked emergent
    const s = {
      ...baseState,
      events: [
        { id: "evt-plan", label: "Wedding gift", on: true, year: 2035, amount: 20000, type: "gift", emergent: false },
      ],
      travel: { on: false, amount: 0, years: 0 },
      ltc: { on: false, startAge: 80, years: 3, annual: null },
      survivor: { on: false, year: 9999, pensionPct: 0 },
      life: { on: false, deathAgeA: 95, deathAgeB: 95, pensionPct: 0 },
      returnPreset: "custom",
      horizonAge: 95,
      spendingShape: { mode: "flat" },
      lifestyleSteps: [],
    };

    // Act
    const { simChosen, simShock } = calculatePlan(s);

    // Assert: with no emergent events, simShock rows should match simChosen rows
    const lastBaseline = simChosen.rows[simChosen.rows.length - 1];
    const lastShock = simShock.rows[simShock.rows.length - 1];
    expect(lastShock.bal).toBeCloseTo(lastBaseline.bal, 0);
  });
});

describe("housing-explicit need + floor policy (Wave 2 Task 4)", () => {
  it("adds housing OUTSIDE the 0.35 non-housing floor", () => {
    // Arrange: non-housing base 40k, housing 24k, liveSav 0
    // Act: floor applies to 40k only; housing added on top
    const parts = { nonHousingBase: 40000, healthcare: 0, housing: 24000, lifestyleSteps: 0, events: 0, _floorBase: 40000 };
    // Assert: need = max(0.35*40k, 40k - 0) + 24k = 40k + 24k = 64k
    expect(composeNeed(parts, 0)).toBeCloseTo(40000 + 24000, 6);
  });

  it("floor discounts only non-housing; housing still paid in full when liveSav exceeds non-housing", () => {
    // Arrange: liveSav 100k would zero non-housing but floor holds it at 0.35*40k
    // Act: housing is outside the floor and unaffected by liveSav
    const parts = { nonHousingBase: 40000, healthcare: 0, housing: 24000, lifestyleSteps: 0, events: 0, _floorBase: 40000 };
    // Assert: need = max(0.35*40k, 40k - 100k) + 24k = 14k + 24k = 38k
    expect(composeNeed(parts, 100000)).toBeCloseTo(0.35 * 40000 + 24000, 6);
  });

  it("zero housing produces same result as old non-housing-only composeNeed", () => {
    // Arrange: housing = 0 (the Wave 0 default)
    const parts = { nonHousingBase: 50000, healthcare: 5000, housing: 0, lifestyleSteps: 0, events: 0, _floorBase: 50000 };
    // Assert: floor on non-housing total (50k + 5k = 55k), liveSav 10k
    // max(0.35*50k, 55k-10k) + 0 = max(17.5k, 45k) = 45k
    expect(composeNeed(parts, 10000)).toBeCloseTo(45000, 6);
  });
});

describe("location property tax into housing (Wave 2 Task 7)", () => {
  // Persona for a US-retired homeowner. baseState retires internationally (Austria,
  // stateCode null → activePropertyTaxRate 0), so we build an explicit US variant.
  const usOwnerBase = {
    ...baseState,
    retireLoc: "US -- national average",
    stateCode: null,                           // overridden per case
    at: { ...baseState.at, on: false },        // no international inheritance
    tx: { ...baseState.tx, on: false },        // no US inheritance (non-inherited owned)
    housing: {
      tenure: "own",
      homeValue: 500000,
      maintenancePct: 0.01,
      insuranceAnnual: 0,
      rent: null,
      mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
    },
  };

  it("property tax scales the housing cost by the active state's rate (Task 7)", () => {
    // TX propertyTaxRate 0.0163, CA 0.0068 — both on a $500k owned home.
    // At age 70+ the household is fully retired; the property-tax difference
    // flows directly into need (real-flat, no inflation compounding).
    const txPlan = calculatePlan({ ...usOwnerBase, stateCode: "TX" });
    const caPlan = calculatePlan({ ...usOwnerBase, stateCode: "CA" });
    const txRow = txPlan.simChosen.rows.find((r) => r.aA >= 70);
    const caRow = caPlan.simChosen.rows.find((r) => r.aA >= 70);
    // Expected delta: (0.0163 − 0.0068) × 500 000 = $4 750
    expect(txRow.need - caRow.need).toBeCloseTo((0.0163 - 0.0068) * 500000, -1);
  });

  it("a null stateCode yields activePropertyTaxRate 0 (international / no-state default)", () => {
    const plan = calculatePlan({ ...usOwnerBase, stateCode: null });
    expect(plan.inp.activePropertyTaxRate).toBe(0);
  });

  it("a known US stateCode resolves the correct propertyTaxRate from US_STATE_TAX", () => {
    const plan = calculatePlan({ ...usOwnerBase, stateCode: "TX" });
    expect(plan.inp.activePropertyTaxRate).toBeCloseTo(0.0163, 6);
  });
});

describe("Task 8 — work-vs-retire two-location jurisdiction split", () => {
  // Persona: WA worker relocating to TX at relocationYear 2046.
  // baseState: ageA:45, ageB:45, stopA:62, stopB:60 → working years until ~2041.
  // relocationYear 2046 is after retirement stops, so all working years use WA (wageRate:0),
  // and retirement years use TX (retireRate:0, propertyTaxRate:0.0163).
  const relocBase = {
    ...baseState,
    workLoc: "WA",
    stateCode: "TX",
    relocationYear: 2046,
    retireLoc: "US -- national average",
    at: { ...baseState.at, on: false },
    tx: { ...baseState.tx, on: false },
    housing: {
      tenure: "rent",
      rent: 2000,
      mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
      homeValue: 0, insuranceAnnual: 0, maintenancePct: 0.01,
    },
  };

  it("working-year state tax uses work-state wageRate, not retire-location addlTaxRate", () => {
    // WA wageRate=0; CA wageRate=0.08 on wages.
    // With CA as work state, the working-year tax burden is higher, so after-tax
    // income is lower, and the household's ability to fund retirement is reduced.
    // We observe this via the balance at first retirement (balAtFullRet).
    const waPlan = calculatePlan(relocBase);
    const caPlan = calculatePlan({ ...relocBase, workLoc: "CA" });
    // WA (0% wage tax) accumulates more during working years than CA (8% wage tax).
    expect(waPlan.simChosen.balAtFullRet).toBeGreaterThan(caPlan.simChosen.balAtFullRet);
  });

  it("owned work home sold at relocation realizes NET proceeds (selling costs, no mortgage)", () => {
    // Owned outright → no remaining balance → net = HOME_SELL_NET × saleValue = 0.93 × 500000.
    const withSell = {
      ...relocBase,
      housing: {
        tenure: "own",
        homeValue: 600000,
        insuranceAnnual: 1200,
        maintenancePct: 0.01,
        rent: null,
        mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: 2026 },
        relocation: { action: "sell", saleValue: 500000 },
      },
    };
    const planWithSell = calculatePlan(withSell);
    const planNoSell = calculatePlan({ ...withSell, housing: { ...withSell.housing, relocation: { action: "sell", saleValue: 0 } } });
    const sellRow = planWithSell.simChosen.rows.find((r) => r.cal === 2046);
    const noSellRow = planNoSell.simChosen.rows.find((r) => r.cal === 2046);
    expect(sellRow.sellLump).toBe(Math.round(HOME_SELL_NET * 500000)); // 465000, NOT raw 500000
    expect(sellRow.bal).toBeGreaterThan(noSellRow.bal);
  });

  it("mortgaged work home sold at relocation nets proceeds minus the remaining balance (C2)", () => {
    // A mortgage still owing at relocation reduces the net lump: 0.93×saleValue − remainingBalance.
    const mortgaged = {
      ...relocBase,
      relocationYear: 2036, // mid-mortgage, so a balance is still owed
      housing: {
        tenure: "mortgage",
        homeValue: 600000,
        insuranceAnnual: 1200,
        maintenancePct: 0.01,
        rent: null,
        mortgage: { principal: 400000, ratePct: 6, termYears: 30, startYear: 2026 },
        relocation: { action: "sell", saleValue: 500000 },
      },
    };
    const plan = calculatePlan(mortgaged);
    const sellRow = plan.simChosen.rows.find((r) => r.cal === 2036);
    const owed = remainingBalance(mortgaged.housing.mortgage, 2036);
    expect(owed).toBeGreaterThan(0);
    expect(sellRow.sellLump).toBe(Math.round(HOME_SELL_NET * 500000 - owed));
    expect(sellRow.sellLump).toBeLessThan(Math.round(HOME_SELL_NET * 500000)); // mortgage drag
  });

  it("keep-as-rental: no sell-lump, work P&I gone from the residence, but sell drops more housing (I1)", () => {
    const sellHousing = {
      tenure: "mortgage",
      homeValue: 600000,
      insuranceAnnual: 1200,
      maintenancePct: 0.01,
      rent: null,
      mortgage: { principal: 400000, ratePct: 6, termYears: 30, startYear: 2026 },
      relocation: { action: "sell", saleValue: 500000 },
    };
    const sell = calculatePlan({ ...relocBase, relocationYear: 2046, housing: sellHousing });
    const keep = calculatePlan({ ...relocBase, relocationYear: 2046, housing: { ...sellHousing, relocation: { action: "keep", saleValue: 0 } } });
    const sellReloc = sell.simChosen.rows.find((r) => r.cal === 2046);
    const keepReloc = keep.simChosen.rows.find((r) => r.cal === 2046);
    // Sell realizes a lump; keep does not.
    expect(sellReloc.sellLump).toBeGreaterThan(0);
    expect(keepReloc.sellLump).toBe(0);
    // Keep retains the work home as a rental → rental income shows up post-relocation.
    expect(keepReloc.rent).toBeGreaterThan(0);
    // I1: post-relocation the SOLD home's P&I cannot leak — the residence switched to retire
    // rent, so the sold-scenario housing is just retire rent (no work P&I as a residence cost).
    const sellAfter = sell.simChosen.rows.find((r) => r.cal === 2048);
    const sellBefore = sell.simChosen.rows.find((r) => r.cal === 2044);
    expect(sellAfter.need).toBeLessThan(sellBefore.need); // work mortgage residence cost gone
  });

  it("default persona (rent, saleValue=0) produces zero relocation lump", () => {
    const plan = calculatePlan(relocBase);
    const relocRow = plan.simChosen.rows.find((r) => r.cal === 2046);
    expect(relocRow.sellLump).toBe(0);
  });

  // C1: pre-65 ACA healthcare bridge must NOT fire while a person is still working
  // (employer-insured); it fires once they retire and are still under 65.
  it("pre-65 healthcare bridge is gated OFF while working and ON once retired", () => {
    // Spouse A retires at 60 (stopA:60), so 2026 (age 58, working) vs a retired pre-65 year.
    // Compare the same-age person working vs not working via stopA.
    const working = calculatePlan({
      ...baseState,
      ageA: 58, ageB: 58, stopA: 65, stopB: 65, claimA: 67, claimB: 67,
      pensionOn: false, contrib: 0,
      retireLoc: "US -- national average", spendBasis: "income",
      tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
      travel: { on: false }, events: [],
    });
    const retired = calculatePlan({
      ...baseState,
      ageA: 58, ageB: 58, stopA: 58, stopB: 58, claimA: 67, claimB: 67,
      pensionOn: false, contrib: 0, savings: 1_500_000,
      retireLoc: "US -- national average", spendBasis: "income",
      tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
      travel: { on: false }, events: [],
    });
    const wRow = working.simChosen.rows.find((r) => r.cal === 2026); // age 58, BOTH working
    const rRow = retired.simChosen.rows.find((r) => r.cal === 2026); // age 58, BOTH retired
    // Same ages, same income basis: the only difference is the pre-65 bridge gating.
    // Working → no bridge; retired pre-65 → bridge present, so retired need is higher.
    expect(rRow.need).toBeGreaterThan(wRow.need);
  });
});

describe("Wave 3 D2 — general surplus reinvest", () => {
  it("reinvests an after-tax guaranteed surplus into the taxable bucket", () => {
    // Arrange: low targetPct so SS+pension after tax already exceeds the need in
    // some retirement years — guaranteed income covers need without any portfolio draw.
    const s = { ...makeDefaultPlan(), targetPct: 0.10, contrib: 0 };

    // Act
    const { simChosen } = calculatePlan(s);

    // Assert: at least one row has reinvest > 0 with no portfolio withdrawal (wd === 0),
    // and the taxable bucket must have grown (reinvested funds land there).
    const surplusRow = simChosen.rows.find((r) => r.reinvest > 0 && r.wd === 0);
    expect(surplusRow).toBeDefined();
    expect(surplusRow.taxableBal).toBeGreaterThan(0);
  });
});

describe("Wave 3 Task 1 — contributions engine integration", () => {
  // Shared base for contribution tests: simple scenario, no inheritances, no travel.
  const contribBase = {
    ...baseState,
    ageA: 45, ageB: 45, stopA: 62, stopB: 60,
    incomeA: 90000, incomeB: 75000, savings: 300000,
    contrib: 18000, tradFrac: 0.7,
    tx: { ...baseState.tx, on: false }, at: { ...baseState.at, on: false },
    travel: { on: false }, events: [],
    retireLoc: "US -- national average", spendBasis: "income",
  };

  it("Simple mode with realRaise:0 produces identical depletion age and final balance to pre-Task-1 baseline", () => {
    // Arrange: default Simple mode, zero real raise — engine must be behavior-identical.
    const withNew = calculatePlan({ ...contribBase, contribMode: "simple", realRaise: 0,
      bucketSplit: { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 } });
    const withoutFields = calculatePlan({ ...contribBase });
    // Act + Assert: depletion age and final portfolio value must match to the dollar.
    const rowsNew = withNew.simChosen.rows;
    const rowsOld = withoutFields.simChosen.rows;
    expect(withNew.simChosen.depAge).toBe(withoutFields.simChosen.depAge);
    expect(rowsNew[rowsNew.length - 1].bal).toBe(rowsOld[rowsOld.length - 1].bal);
  });

  it("realRaise:0.02 grows contributions in real terms and raises final balance vs realRaise:0", () => {
    // Arrange: 2% real raise should compound contributions upward each working year.
    const flat = calculatePlan({ ...contribBase, contribMode: "simple", realRaise: 0,
      bucketSplit: { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 } });
    const raised = calculatePlan({ ...contribBase, contribMode: "simple", realRaise: 0.02,
      bucketSplit: { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 } });
    // Act + Assert: higher real raise → larger portfolio at retirement age.
    const flatRetRow = flat.simChosen.rows.find((r) => r.aA >= contribBase.stopA);
    const raisedRetRow = raised.simChosen.rows.find((r) => r.aA >= contribBase.stopA);
    expect(raisedRetRow.bal).toBeGreaterThan(flatRetRow.bal);
  });
});
