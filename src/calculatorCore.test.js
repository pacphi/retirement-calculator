import { describe, expect, it } from "vitest";
import {
  afcIsAuto,
  benefits,
  calculateFederalTaxYear,
  calculatePlan,
  fedTax,
  ltcSpendForYear,
  oneTimeSpendForYear,
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
} from "./calculatorCore.js";

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
    const withTravel = { ...retired, events: [], travel: { on: true, amount: 15000, years: 15, taper: true } };
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
    const noTravel = calculatePlan({ ...baseState, travel: { on: false, amount: 15000, years: 15, taper: true }, events: [] });
    const withTravel = calculatePlan({ ...baseState, travel: { on: true, amount: 15000, years: 30, taper: false }, events: [] });
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
