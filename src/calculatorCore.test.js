import { describe, expect, it } from "vitest";
import {
  afcIsAuto,
  benefits,
  monthlyBreakdown,
  yearMilestones,
  calculateFederalTaxYear,
  calculatePlan,
  drsEligibilityNote,
  fedTax,
  ltcSpendForYear,
  oneTimeSpendForYear,
  requiredMinimum,
  rmdStartAge,
  scheduledSpendForYear,
  uniformLifetimeFactor,
  ownBenefitAtClaimMonthly,
  pensionERF,
  resolveAfc,
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
import { LOCATIONS, SINGLE_COST_FACTOR } from "./retirementData.js";

const baseState = {
  ageA:45, ageB:45, stopA:62, stopB:60, claimA:67, claimB:67, pensionAge:65,
  incomeA:90000, incomeB:75000, savings:300000, contrib:18000, targetPct:0.30, status:"married",
  ssModeA:"estimate", ssModeB:"estimate", ssFraA:36000, ssFraB:30000,
  pensionOn:true, system:"TRS", plan:2, pYears:20, afc:78000,
  realReturn:0.05, swr:0.04, tradFrac:0.7, inflation:0.025,
  ssMode:"trustees", ssHaircut:81, ssCutYear:2034,
  retireLoc:"US -- national average",
  tx:{ on:true, value:790000, year:2038, strategy:"rent" },
  at:{ on:true, value:324000, year:2040, strategy:"live" },
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

  it("reduces the pension by the elected survivor percentage", () => {
    const full = simulate({ ...base, survivor: { on: false, year: 9999, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    const half = simulate({ ...base, survivor: { on: true, year: 2030, pensionPct: 50 } }, { haircut: 1, cutYear: 9999 });
    const none = simulate({ ...base, survivor: { on: true, year: 2030, pensionPct: 0 } }, { haircut: 1, cutYear: 9999 });
    expect(pensAt(full, 2030)).toBeGreaterThan(0);
    expect(pensAt(half, 2030)).toBeCloseTo(pensAt(full, 2030) * 0.5, 6);
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
    const nl = calculatePlan({ ...baseState, retireLoc: "Netherlands" });   // addlTaxRate 0.08
    const tx = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida" }); // 0%
    expect(nl.steady.tax).toBeGreaterThan(tx.steady.tax);
  });

  it("lets an explicit stateRate override the location default", () => {
    const base = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida" });        // 0%
    const overridden = calculatePlan({ ...baseState, retireLoc: "US -- Texas / Florida", stateRate: 0.05 });
    expect(overridden.steady.tax).toBeGreaterThan(base.steady.tax);
  });
});

describe("live-in inheritance timing", () => {
  it("credits the live-in housing saving only from the year after inheritance", () => {
    const i = {
      ...baseState, ageA: 65, ageB: 65, stopA: 65, stopB: 65, claimA: 65, claimB: 65,
      pensionOn: false, savings: 800000, contrib: 0, targetPct: 0.5,
      incomeHH: 100000, hcPre: 2450, hcPost: 1000, ltcAnnual: 129000,
      travel: { on: false }, events: [], survivor: { on: false, year: 9999, pensionPct: 0 }, ltc: { on: false }, horizonAge: 95,
      inher: [{ type: "live", year: 2030, live: 12000 }],
    };
    const sim = simulate(i, { haircut: 1, cutYear: 9999 });
    const moveYear = sim.rows.find((r) => r.cal === 2030).need;
    const after = sim.rows.find((r) => r.cal === 2031).need;
    expect(moveYear - after).toBe(12000); // saving applies in 2031, not the 2030 move year
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

  it("splits expenses into core living (need minus extra), extra, and tax", () => {
    const rows = calculatePlan(baseState).simChosen.rows;
    const row = rows.find((r) => r.extraSpend > 0) ?? rows[rows.length - 1];
    const b = monthlyBreakdown(row);
    expect(b.expenses.extra).toBeCloseTo(row.extraSpend / 12, 6);
    expect(b.expenses.living).toBeCloseTo((row.need - row.extraSpend) / 12, 6);
    expect(b.expenses.tax).toBeCloseTo(row.tax / 12, 6);
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
    const sold = { ...baseState, at: { on: true, value: 324000, year: 2040, strategy: "sell" } };
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
    // A working year before any inheritance/travel effects; both spouses pre-65.
    const row = plan.simChosen.rows.find((r) => r.cal === 2032);
    const hc = (us.hcPre / 2) * 2 * 12; // both under 65
    expect(row.need).toBe(Math.round(basket + hc));
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
