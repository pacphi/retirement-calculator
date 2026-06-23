import { DEFAULT_TRAVEL, DEFAULT_LIFE_EVENTS, DEFAULT_LIFE, RETURN_MODEL_DEFAULTS, GUARDRAIL_DEFAULTS } from "./retirementData.js";

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
  contribMode: "simple",
  contribStreams: [],
  employerMatch: { pct: 0, capPct: 0 },
  realRaise: 0,
  // Wave 3 D1: tax-smart withdrawal order (taxable→deferred→roth defers ordinary income).
  withdrawalOrder: ["taxable", "deferred", "roth"],
  // Wave 3 Task 5: return model (opt-in; "blended" default keeps all results unchanged).
  returnModel: { ...RETURN_MODEL_DEFAULTS },
  // bucketSplit is intentionally absent from the default — plan.js derives it from
  // tradFrac when not explicitly set. Once a user adjusts the bucket controls in
  // Saving.jsx, bucketSplit is stored in state and takes precedence over tradFrac.
  // Wave 3 Task 6: spending strategy (opt-in; "fixed" default keeps all results unchanged).
  spendingStrategy: "fixed",
  guardrails: { ...GUARDRAIL_DEFAULTS },
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
  contribStreams: [],
  employerMatch: { ...DEFAULT_PLAN.employerMatch },
  withdrawalOrder: [...DEFAULT_PLAN.withdrawalOrder],
  returnModel: { ...DEFAULT_PLAN.returnModel },
  guardrails: { ...DEFAULT_PLAN.guardrails },
});
