export const TAX_YEAR = 2026;

// Travel by calendar year: full ("go-go") amount from startYear, a reduced
// ("slow-go") share from slowYear, ending after endYear.
export const DEFAULT_TRAVEL = { on: true, amount: 15000, startYear: TAX_YEAR + 8, slowYear: TAX_YEAR + 18, endYear: TAX_YEAR + 22, taper: true, slowPct: 50 };

// Life expectancy: expected age at death per spouse, and the DRS survivor-annuity
// percentage the pension continues at once the pension-holder (spouse B) dies.
export const DEFAULT_LIFE = { on: true, deathAgeA: 95, deathAgeB: 92, pensionPct: 0 };

// One-time events have no `everyYears`; recurring ones repeat on that cadence from `year`
// through `untilYear` (or the horizon if unset). All default off; amounts in today's dollars.
export const DEFAULT_LIFE_EVENTS = [
  { id: "wed1",  label: "Child 1 wedding",     on: false, year: 2032, amount: 15000, type: "gift" },
  { id: "wed2",  label: "Child 2 wedding",     on: false, year: 2035, amount: 15000, type: "gift" },
  // home1/home2: gifting money to children for housing; "gift" is a judgment call — the cash
  // leaves the household either way, same engine behavior as "purchase" (+amt to spend).
  { id: "home1", label: "Home help -- child 1", on: false, year: 2034, amount: 25000, type: "gift" },
  { id: "home2", label: "Home help -- child 2", on: false, year: 2037, amount: 25000, type: "gift" },
  { id: "gk",    label: "Grandchild 529 seed",  on: false, year: 2040, amount: 5000,  type: "gift" },
  { id: "car",   label: "Vehicle replacement",  on: false, year: TAX_YEAR, amount: 45000, everyYears: 10, untilYear: TAX_YEAR + 30, type: "purchase" },
  { id: "upkeep", label: "Home upkeep (owners only)", on: false, year: TAX_YEAR, amount: 6000, everyYears: 1, type: "purchase" },
];

export const STRESS_EARLY_DROP = -0.10;

// Single-person cost scaling: a one-person household runs at ~64% of a couple's cost-of-living
// (shared fixed costs don't halve). Used by the Places affordability view and, when the
// location spending basis is on, by the simulation in survivor/single years.
export const SINGLE_COST_FACTOR = 0.64;

export const MC_DEFAULTS = { paths: 1000, seed: 12345, volatility: 0.12 };

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

export const SOURCES = {
  irs2026: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
  ssaPia: "https://www.ssa.gov/oact/progdata/retirebenefit2.html",
  ssaWageBase: "https://www.ssa.gov/oact/cola/cbb.html",
  ssaRetirement: "https://www.ssa.gov/pubs/EN-05-10035.pdf",
  ssaTrustees: "https://www.ssa.gov/news/en/press/releases/2025-06-18.html",
  drsTrs2: "https://www.drs.wa.gov/plan/trs2/",
  kffAca: "https://www.kff.org/interactive/subsidy-calculator/",
  cmsMedicare: "https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-and-deductibles",
  irsRmd: "https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs",
  cfa6040: "https://rpc.cfainstitute.org/research/reports/2025/performance-of-the-60-40-portfolio",
  carson6040: "https://www.carsongroup.com/insights/blog/the-60-40-portfolio-a-historical-powerhouse-or-a-rate-dependent-misinterpretation/",
  smileRR: "https://retirementresearcher.com/retirement-spending-smile/",
  smileKitces: "https://www.kitces.com/blog/estimating-changes-in-retirement-expenditures-and-the-retirement-spending-smile/",
  blanchett2026: "https://onlinelibrary.wiley.com/doi/full/10.1002/cfp2.70032",
  kiplingerStateTax: "https://www.kiplinger.com/retirement/601819/states-that-wont-tax-your-pension",
  taxFoundationProperty: "https://taxfoundation.org/data/all/state/property-taxes-by-state-county/",
  incomeLabStates: "https://incomelaboratory.com/state-retirement-taxes-guide/",
  pensionSourceTaxAct: "https://www.law.cornell.edu/uscode/text/4/114",
  usModelTreaty: "https://home.treasury.gov/policy-issues/tax-policy/international-tax",
  irsFtc: "https://www.irs.gov/individuals/international-taxpayers/foreign-tax-credit",
  irsForm3520: "https://www.irs.gov/forms-pubs/about-form-3520",
  fbar: "https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar",
  irsContrib2026: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
  fidelityCatchup: "https://www.fidelity.com/learning-center/personal-finance/401k-catch-up-contributions-high-earners",
  kitcesGuardrails: "https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/",
  morningstarGuardrails: "https://www.morningstar.com/retirement/want-boost-your-retirement-income-guardrails-could-help",
};

/* 2026 reference data. Tax constants are from the IRS 2026 inflation release.
   SSA bend points and wage base are from SSA. The DRS early-retirement factors below
   apply to both Plan 2 and Plan 3 (same formula). DRS_ERF_UNDER_30 is the actuarial
   reduction for members with fewer than 30 years of service.
   NOTE: DRS_ERF_30_PLUS uses the post-May-2013 "5% ERF" schedule for 30+ year members.
   Members hired BEFORE May 1, 2013 with 30+ years use the gentler "2008 ERF" (e.g. age 62
   is unreduced) — not modeled here, so this engine understates the pension for that
   specific group. See docs/sources.md section 9 and docs/archive/audits/drs-verification.md. */
export const FED = {
  single: [[0, .10], [12400, .12], [50400, .22], [105700, .24], [201775, .32], [256225, .35], [640600, .37]],
  married: [[0, .10], [24800, .12], [100800, .22], [211400, .24], [403550, .32], [512450, .35], [768700, .37]],
};

export const STD = { single: 16100, married: 32200 };
export const SENIOR_ADDON_SINGLE = 2050;
export const SENIOR_ADDON_MARRIED_PER_PERSON = 1650;
export const SENIOR_BONUS = 6000;
export const SENIOR_BONUS_PHASEOUT = { single: 75000, married: 150000 };
export const SENIOR_BONUS_SUNSET = 2028; // OBBBA $6k senior bonus is a 2025–2028 provision

export const BEND = [1286, 7749];
export const SS_CAP = 184500;
export const PROV = { single: [25000, 34000], married: [32000, 44000] };

export const DRS_ERF_UNDER_30 = {
  55: .4092, 56: .4450, 57: .4844, 58: .5280, 59: .5760,
  60: .6292, 61: .6882, 62: .7538, 63: .8269, 64: .9085, 65: 1,
};

export const DRS_ERF_30_PLUS = {
  55: .50, 56: .55, 57: .60, 58: .65, 59: .70,
  60: .75, 61: .80, 62: .85, 63: .90, 64: .95, 65: 1,
};

export const LOCATIONS = [
  { name:"Bulgaria / Romania", region:"Europe", ltcAnnual:14000, addlTaxRate:0, hcPre:280, hcPost:220, m:{rent:550,groceries:400,utilities:160,transport:100,dining:200,entertainment:120,misc:170}, vat:"20%", incomeTax:"Flat 10% -- among the EU's lowest", note:"Lowest-cost EU. More cultural adjustment, fewer English services." },
  { name:"Greece", region:"Europe", ltcAnnual:22000, addlTaxRate:0, hcPre:380, hcPost:300, m:{rent:780,groceries:500,utilities:200,transport:120,dining:300,entertainment:170,misc:250}, vat:"24%", incomeTax:"7% flat on foreign income for 15 yrs", note:"Treaty + 7% regime make pensions cheap to receive here." },
  { name:"Portugal", region:"Europe", ltcAnnual:20000, addlTaxRate:0.03, hcPre:400, hcPost:300, m:{rent:1150,groceries:450,utilities:190,transport:100,dining:250,entertainment:150,misc:230}, vat:"23%", incomeTax:"Worldwide; old NHR break closed in 2024", note:"Figures are Porto/Algarve-style; central Lisbon runs higher. D7 visa needs about EUR10,440/yr." },
  { name:"Spain", region:"Europe", ltcAnnual:33000, addlTaxRate:0.04, hcPre:420, hcPost:320, m:{rent:1200,groceries:480,utilities:190,transport:110,dining:300,entertainment:180,misc:270}, vat:"21%", incomeTax:"Worldwide, about 19-47% progressive", note:"Non-Lucrative Visa needs about EUR28,800/yr passive income." },
  { name:"Italy", region:"Europe", ltcAnnual:39000, addlTaxRate:0, hcPre:420, hcPost:320, m:{rent:1250,groceries:500,utilities:220,transport:120,dining:320,entertainment:190,misc:290}, vat:"22%", incomeTax:"7% flat option in some southern towns", note:"Best value in the south and smaller cities." },
  { name:"France", region:"Europe", ltcAnnual:32000, addlTaxRate:0, hcPre:480, hcPost:380, m:{rent:1600,groceries:580,utilities:250,transport:130,dining:400,entertainment:250,misc:340}, vat:"20%", incomeTax:"Worldwide; treaty often exempts US pensions", note:"Top-rated healthcare; Paris far pricier than the regions." },
  { name:"Austria", region:"Europe", ltcAnnual:46000, addlTaxRate:0.05, hcPre:520, hcPost:420, m:{rent:1650,groceries:560,utilities:350,transport:110,dining:360,entertainment:220,misc:320}, vat:"20%", incomeTax:"Worldwide, up to 55%", note:"Vienna/Klagenfurt: superb services; worldwide taxation. Your inherited home lives here." },
  { name:"Netherlands", region:"Europe", ltcAnnual:54000, addlTaxRate:0.08, hcPre:480, hcPost:420, m:{rent:2000,groceries:580,utilities:260,transport:130,dining:380,entertainment:240,misc:350}, vat:"21%", incomeTax:"Worldwide (box system)", note:"High quality of life, tight housing, no non-EU retirement visa." },
  { name:"US -- low-cost (WV/OK/MS)", region:"US", ltcAnnual:105000, addlTaxRate:0.02, hcPre:2200, hcPost:900, m:{rent:1150,groceries:650,utilities:320,transport:450,dining:350,entertainment:250,misc:400}, vat:"about 6-8% sales tax", incomeTax:"State 0-5%; several exempt pensions", note:"Cheapest US housing. The pre-65 ACA years are the pinch point." },
  { name:"US -- Texas / Florida", region:"US", ltcAnnual:112000, addlTaxRate:0, hcPre:2400, hcPost:950, m:{rent:1500,groceries:700,utilities:350,transport:500,dining:400,entertainment:300,misc:450}, vat:"about 7-8% sales tax", incomeTax:"No state income tax", note:"No state tax on her pension or withdrawals. Your inherited Texas home is here." },
  { name:"US -- national average", region:"US", ltcAnnual:129000, addlTaxRate:0.03, hcPre:2450, hcPost:1000, m:{rent:1700,groceries:750,utilities:360,transport:550,dining:450,entertainment:330,misc:480}, vat:"about 7% sales tax", incomeTax:"State varies; 9 states have none", note:"Baseline comfortable US couple budget." },
  { name:"Bahamas", region:"Caribbean", ltcAnnual:60000, addlTaxRate:0, hcPre:950, hcPost:1150, m:{rent:2900,groceries:950,utilities:420,transport:500,dining:500,entertainment:300,misc:480}, vat:"10% VAT + duties", incomeTax:"None -- US federal still applies", note:"Zero income/CG/estate tax, but imports make it premium." },
  { name:"US -- California", region:"US", ltcAnnual:182000, addlTaxRate:0.065, hcPre:2600, hcPost:1100, m:{rent:2750,groceries:820,utilities:380,transport:600,dining:550,entertainment:380,misc:550}, vat:"about 8-10% sales tax", incomeTax:"Up to about 13.3% state tax", note:"High cost and a heavy state tax on pension & withdrawals." },
  { name:"US -- Hawaii / NYC", region:"US", ltcAnnual:197000, addlTaxRate:0.08, hcPre:2300, hcPost:1100, m:{rent:3800,groceries:1150,utilities:500,transport:650,dining:750,entertainment:500,misc:700}, vat:"about 4-9% sales tax", incomeTax:"Up to about 11% (HI) / 14% (NYC)", note:"Premium cost of living; the stretch goal." },
];

export const PROP = {
  tx: { label:"Texas home", place:"US -- Texas / Florida", sellNet:0.93, rentYield:0.035, ownRate:0.027, rentMo:1500,
    notes:{
      sell:"US tax law generally steps basis up to date-of-death value, so a near-term sale often has little capital-gains tax. Texas has no estate, inheritance, or income tax. This estimate keeps about 7% aside for selling costs.",
      rent:"No Texas income tax, but property tax and upkeep are high. The model uses a simple net rental yield of about 3.5% of the home's value.",
      live:"Owning the Texas home may not free up much cash because property tax and upkeep can be close to the rent you avoid. Selling or renting usually puts the value to clearer use." } },
  at: { label:"Klagenfurt home", place:"Austria", sellNet:0.90, rentYield:0.020, ownRate:0.012, rentMo:1650,
    notes:{
      sell:"Austria has no inheritance tax, but inheriting and later selling real estate can still create transfer and real-estate gains taxes (ImmoESt ~30% on nominal gain, plus transfer + registration fees). This simplified estimate keeps only 10% aside, which may materially understate the cost for a property with large gains since the decedent's acquisition — the true net could be 20-35% lower. A cross-border tax professional should verify the actual basis and treaty result.",
      rent:"Austrian rental income can be taxed in Austria and reported in the US, usually with foreign tax credit mechanics. The model uses a conservative 2% net yield.",
      live:"This is often the strongest cash-flow choice. Austrian carrying costs are low, so living there can replace a large rent bill with a much smaller owner cost." } },
};

/* Required Minimum Distributions (RMDs). SECURE 2.0 sets the first-RMD age at 73 for
   those born 1951-1959 and 75 for those born 1960 or later. A missed RMD is hit with a
   25% excise tax on the shortfall, reduced to 10% if corrected within two years. The
   annual minimum is the prior-year-end pre-tax balance divided by the IRS Uniform
   Lifetime Table divisor below (post-2021 schedule). Roth 401(k)/IRA balances are exempt
   from lifetime RMDs. Source: SOURCES.irsRmd (IRS RMD FAQs / Pub. 590-B). */
export const RMD_PENALTY = { rate: 0.25, correctedRate: 0.10 };

export const UNIFORM_LIFETIME = {
  72:27.4, 73:26.5, 74:25.5, 75:24.6, 76:23.7, 77:22.9, 78:22.0, 79:21.1, 80:20.2,
  81:19.4, 82:18.5, 83:17.7, 84:16.8, 85:16.0, 86:15.2, 87:14.4, 88:13.7, 89:12.9,
  90:12.2, 91:11.5, 92:10.8, 93:10.1, 94:9.5, 95:8.9, 96:8.4, 97:7.8, 98:7.3, 99:6.8,
  100:6.4,
};

export const TIERS = [
  { max:0.8, label:"Tight", color:"#BE4A2B" },
  { max:1.15, label:"Modest", color:"#C7972F" },
  { max:1.7, label:"Comfortable", color:"#1E7A5E" },
  { max:2.6, label:"Affluent", color:"#14302E" },
  { max:Infinity, label:"Luxurious", color:"#7A4FA0" },
];

// --- Wave 2: location tax + housing ------------------------------------------

// Curated planning-grade US state income-tax profiles (2026). Rates are EFFECTIVE
// approximations on the relevant base, not statutory brackets — state income/property
// tax is county-local and varies; captioned in-app. `wageRate` applies to wages
// (working years); `retireRate` applies to the retirement taxable base after the
// per-type rules (taxesSS, pensionExclusion, taxesTradWithdrawal); Roth is always exempt.
// Sources: SOURCES.kiplingerStateTax, SOURCES.taxFoundationProperty, SOURCES.incomeLabStates.
export const US_STATE_TAX = {
  WA: { name: "Washington",   wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0087 },
  TX: { name: "Texas",        wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0163 },
  FL: { name: "Florida",      wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0082 },
  NV: { name: "Nevada",       wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0048 },
  WY: { name: "Wyoming",      wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0056 },
  SD: { name: "South Dakota", wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0108 },
  TN: { name: "Tennessee",    wageRate: 0,     taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0,     propertyTaxRate: 0.0066 },
  IL: { name: "Illinois",     wageRate: 0.0495, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.0495, propertyTaxRate: 0.0208 },
  PA: { name: "Pennsylvania", wageRate: 0.0307, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.0307, propertyTaxRate: 0.0149 },
  MS: { name: "Mississippi",  wageRate: 0.044,  taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: false, retireRate: 0.044,  propertyTaxRate: 0.0079 },
  CO: { name: "Colorado",     wageRate: 0.044,  taxesSS: true,  pensionExclusion: 24000,  taxesTradWithdrawal: true,  retireRate: 0.044,  propertyTaxRate: 0.0049 },
  CA: { name: "California",   wageRate: 0.08,   taxesSS: false, pensionExclusion: 0,      taxesTradWithdrawal: true,  retireRate: 0.08,   propertyTaxRate: 0.0068 },
  NY: { name: "New York",     wageRate: 0.065,  taxesSS: false, pensionExclusion: 20000,  taxesTradWithdrawal: true,  retireRate: 0.065,  propertyTaxRate: 0.0172 },
  NJ: { name: "New Jersey",   wageRate: 0.06,   taxesSS: false, pensionExclusion: 100000, taxesTradWithdrawal: true,  retireRate: 0.06,   propertyTaxRate: 0.0223 },
  MN: { name: "Minnesota",    wageRate: 0.068,  taxesSS: true,  pensionExclusion: 0,      taxesTradWithdrawal: true,  retireRate: 0.068,  propertyTaxRate: 0.0102 },
};

// Treaty-aware international residence-tax profiles, keyed by LOCATIONS name. SAME typed
// shape as US_STATE_TAX so residenceTax.js doesn't fork. Planning-grade EFFECTIVE
// net-of-treaty residence rates — NOT statutory treaty articles. Conventions for a US
// citizen abroad (US federal worldwide tax is modeled separately by the engine):
//   - Government pension (the engine's `pension` = WA DRS) is US-only under the treaty's
//     government-service article ⇒ pensionExclusion:"full" (residence does not tax it).
//   - Private/IRA deferred withdrawals are residence-taxed net of the US FTC ⇒
//     taxesTradWithdrawal per location, at the effective `retireRate`.
//   - Social Security per treaty (taxesSS per location). Roth is exempt everywhere.
// exposureNotes drive the DualTaxExposure panel. Sources: SOURCES.usModelTreaty,
// SOURCES.irsFtc, SOURCES.irsForm3520, SOURCES.fbar.
export const INTL_TAX = {
  // Austria: addlTaxRate 0.05 in LOCATIONS; net-of-FTC effective rate modeled 0.0 (brief spec).
  "Austria": { name: "Austria", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0.0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you stay liable for US federal tax on worldwide income; the US–Austria treaty + Foreign Tax Credit prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Austria.", residenceTaxed: "Austria can tax IRA/401(k) distributions as a resident; the US FTC generally offsets the US tax on the same dollars (effective added rate modeled ~0 here — verify).", filing: "Inheriting the Klagenfurt home over $100k triggers IRS Form 3520 (report-only); foreign accounts may trigger FBAR/FATCA." } },
  // Bulgaria / Romania: addlTaxRate 0 in LOCATIONS → retireRate 0.
  "Bulgaria / Romania": { name: "Bulgaria / Romania", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; a US–Bulgaria or US–Romania treaty + Foreign Tax Credit generally prevents double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under treaty, not by the residence country.", residenceTaxed: "Bulgaria/Romania may tax IRA/401(k) distributions as a resident; the US FTC typically offsets the US tax on the same dollars (effective added rate modeled 0 — verify).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Greece: addlTaxRate 0 in LOCATIONS → retireRate 0.
  "Greece": { name: "Greece", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the US–Greece treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Greece.", residenceTaxed: "Greece may tax IRA/401(k) distributions as a resident; the US FTC typically offsets the US tax on the same dollars (effective added rate modeled 0 — verify with Greece's 7% flat-rate regime eligibility).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Portugal: addlTaxRate 0.03 in LOCATIONS → retireRate 0.03.
  "Portugal": { name: "Portugal", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0.03, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; a US–Portugal tax treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Portugal.", residenceTaxed: "Portugal can tax IRA/401(k) distributions as a resident; an effective incremental rate of ~3% is modeled after treaty/FTC offsets (verify — the old NHR regime closed in 2024).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Spain: addlTaxRate 0.04 in LOCATIONS → retireRate 0.04.
  "Spain": { name: "Spain", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0.04, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the US–Spain treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Spain.", residenceTaxed: "Spain can tax IRA/401(k) distributions as a resident; an effective incremental rate of ~4% is modeled after treaty/FTC offsets (verify with your cross-border tax advisor).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Italy: addlTaxRate 0 in LOCATIONS → retireRate 0.
  "Italy": { name: "Italy", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the US–Italy treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by Italy.", residenceTaxed: "Italy can tax IRA/401(k) distributions as a resident; the US FTC typically offsets the US tax on the same dollars (effective added rate modeled 0 — verify; some southern towns offer a 7% flat-rate option).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // France: addlTaxRate 0 in LOCATIONS → retireRate 0.
  "France": { name: "France", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the US–France treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by France.", residenceTaxed: "France can tax IRA/401(k) distributions as a resident; the US FTC typically offsets the US tax on the same dollars (effective added rate modeled 0 — verify with a cross-border advisor).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Netherlands: addlTaxRate 0.08 in LOCATIONS → retireRate 0.08.
  "Netherlands": { name: "Netherlands", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0.08, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the US–Netherlands treaty + Foreign Tax Credit generally prevent double taxation.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US under the treaty, not by the Netherlands.", residenceTaxed: "The Netherlands can tax IRA/401(k) distributions as a resident under the box system; an effective incremental rate of ~8% is modeled after treaty/FTC offsets (verify with a cross-border advisor).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
  // Bahamas: addlTaxRate 0 in LOCATIONS → retireRate 0 (no income tax).
  "Bahamas": { name: "Bahamas", isInternational: true, wageRate: 0, taxesSS: false, pensionExclusion: "full", taxesTradWithdrawal: true, retireRate: 0, propertyTaxRate: 0,
    exposureNotes: { worldwide: "As a US citizen you remain liable for US federal tax on worldwide income; the Bahamas has no income tax so US federal is the only income tax layer.", govtPension: "Her WA DRS pension is a government-service pension — taxable only by the US; the Bahamas imposes no residence income tax on it.", residenceTaxed: "The Bahamas imposes no income tax on IRA/401(k) distributions as a resident; US federal tax applies as normal (effective added rate modeled 0).", filing: "Foreign accounts and assets over reporting thresholds may trigger FBAR and FATCA obligations annually." } },
};

// Net sale proceeds factor for a primary residence sold at relocation: ~7% selling
// costs (agent commission, transfer, closing) are kept aside, planning-grade. The
// primary-residence capital-gains exclusion (~$500k MFJ) is assumed to cover the gain,
// so no cap-gains tax is modeled here — captioned in-app. Mirrors PROP.tx.sellNet.
export const HOME_SELL_NET = 0.93;

// Net annual rental yield for a work home KEPT as a rental after relocation (planning-grade,
// % of home value, net of vacancy/management). Mirrors PROP.tx.rentYield (~3.5%). The kept
// home's mortgage P&I continues as a cost; this is the offsetting gross rental income.
export const HOME_RENT_YIELD = 0.035;

// Primary-residence housing. Mortgage P&I is the engine's ONE nominal flow (deflated
// each year, zeroed after payoff). Rent / property tax / insurance / maintenance are
// real-flat. maintenancePct is an annual % of home value. Source: SOURCES.taxFoundationProperty.
export const DEFAULT_HOUSING = {
  tenure: "rent",                 // "rent" | "mortgage" | "own"
  rent: null,                     // null ⇒ seed from active location's m.rent
  mortgage: { principal: 0, ratePct: 0, termYears: 0, startYear: TAX_YEAR },
  homeValue: 0,
  insuranceAnnual: 0,
  maintenancePct: 0.01,
};
