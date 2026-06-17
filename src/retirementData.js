export const TAX_YEAR = 2026;

export const DEFAULT_TRAVEL = { on: true, amount: 15000, years: 15, taper: true };

export const SOURCES = {
  irs2026: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
  ssaPia: "https://www.ssa.gov/oact/progdata/retirebenefit2.html",
  ssaWageBase: "https://www.ssa.gov/oact/cola/cbb.html",
  ssaRetirement: "https://www.ssa.gov/pubs/EN-05-10035.pdf",
  ssaTrustees: "https://www.ssa.gov/news/en/press/releases/2025-06-18.html",
  drsTrs2: "https://www.drs.wa.gov/plan/trs2/",
  kffAca: "https://www.kff.org/interactive/subsidy-calculator/",
  cmsMedicare: "https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-and-deductibles",
};

/* 2026 reference data. Tax constants are from the IRS 2026 inflation release.
   SSA bend points and wage base are from SSA. DRS factors are current Plan 2
   examples published by Washington DRS for members with less than 30 years. */
export const FED = {
  single: [[0, .10], [12400, .12], [50400, .22], [105700, .24], [201775, .32], [256225, .35], [640600, .37]],
  married: [[0, .10], [24800, .12], [100800, .22], [211400, .24], [403550, .32], [512450, .35], [768700, .37]],
};

export const STD = { single: 16100, married: 32200 };
export const SENIOR_ADDON_SINGLE = 2050;
export const SENIOR_ADDON_MARRIED_PER_PERSON = 1650;
export const SENIOR_BONUS = 6000;
export const SENIOR_BONUS_PHASEOUT = { single: 75000, married: 150000 };

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
  { name:"Bulgaria / Romania", region:"Europe", hcPre:280, hcPost:220, m:{rent:550,groceries:400,utilities:160,transport:100,dining:200,entertainment:120,misc:170}, vat:"20%", incomeTax:"Flat 10% -- among the EU's lowest", note:"Lowest-cost EU. More cultural adjustment, fewer English services." },
  { name:"Greece", region:"Europe", hcPre:380, hcPost:300, m:{rent:780,groceries:500,utilities:200,transport:120,dining:300,entertainment:170,misc:250}, vat:"24%", incomeTax:"7% flat on foreign income for 15 yrs", note:"Treaty + 7% regime make pensions cheap to receive here." },
  { name:"Portugal", region:"Europe", hcPre:400, hcPost:300, m:{rent:1150,groceries:450,utilities:190,transport:100,dining:250,entertainment:150,misc:230}, vat:"23%", incomeTax:"Worldwide; old NHR break closed in 2024", note:"Figures are Porto/Algarve-style; central Lisbon runs higher. D7 visa needs about EUR10,440/yr." },
  { name:"Spain", region:"Europe", hcPre:420, hcPost:320, m:{rent:1200,groceries:480,utilities:190,transport:110,dining:300,entertainment:180,misc:270}, vat:"21%", incomeTax:"Worldwide, about 19-47% progressive", note:"Non-Lucrative Visa needs about EUR28,800/yr passive income." },
  { name:"Italy", region:"Europe", hcPre:420, hcPost:320, m:{rent:1250,groceries:500,utilities:220,transport:120,dining:320,entertainment:190,misc:290}, vat:"22%", incomeTax:"7% flat option in some southern towns", note:"Best value in the south and smaller cities." },
  { name:"France", region:"Europe", hcPre:480, hcPost:380, m:{rent:1600,groceries:580,utilities:250,transport:130,dining:400,entertainment:250,misc:340}, vat:"20%", incomeTax:"Worldwide; treaty often exempts US pensions", note:"Top-rated healthcare; Paris far pricier than the regions." },
  { name:"Austria", region:"Europe", hcPre:520, hcPost:420, m:{rent:1650,groceries:560,utilities:350,transport:110,dining:360,entertainment:220,misc:320}, vat:"20%", incomeTax:"Worldwide, up to 55%", note:"Vienna/Klagenfurt: superb services; worldwide taxation. Your inherited home lives here." },
  { name:"Netherlands", region:"Europe", hcPre:480, hcPost:420, m:{rent:2000,groceries:580,utilities:260,transport:130,dining:380,entertainment:240,misc:350}, vat:"21%", incomeTax:"Worldwide (box system)", note:"High quality of life, tight housing, no non-EU retirement visa." },
  { name:"US -- low-cost (WV/OK/MS)", region:"US", hcPre:2200, hcPost:900, m:{rent:1150,groceries:650,utilities:320,transport:450,dining:350,entertainment:250,misc:400}, vat:"about 6-8% sales tax", incomeTax:"State 0-5%; several exempt pensions", note:"Cheapest US housing. The pre-65 ACA years are the pinch point." },
  { name:"US -- Texas / Florida", region:"US", hcPre:2400, hcPost:950, m:{rent:1500,groceries:700,utilities:350,transport:500,dining:400,entertainment:300,misc:450}, vat:"about 7-8% sales tax", incomeTax:"No state income tax", note:"No state tax on her pension or withdrawals. Your inherited Texas home is here." },
  { name:"US -- national average", region:"US", hcPre:2450, hcPost:1000, m:{rent:1700,groceries:750,utilities:360,transport:550,dining:450,entertainment:330,misc:480}, vat:"about 7% sales tax", incomeTax:"State varies; 9 states have none", note:"Baseline comfortable US couple budget." },
  { name:"Bahamas", region:"Caribbean", hcPre:950, hcPost:1150, m:{rent:2900,groceries:950,utilities:420,transport:500,dining:500,entertainment:300,misc:480}, vat:"10% VAT + duties", incomeTax:"None -- US federal still applies", note:"Zero income/CG/estate tax, but imports make it premium." },
  { name:"US -- California", region:"US", hcPre:2600, hcPost:1100, m:{rent:2750,groceries:820,utilities:380,transport:600,dining:550,entertainment:380,misc:550}, vat:"about 8-10% sales tax", incomeTax:"Up to about 13.3% state tax", note:"High cost and a heavy state tax on pension & withdrawals." },
  { name:"US -- Hawaii / NYC", region:"US", hcPre:2300, hcPost:1100, m:{rent:3800,groceries:1150,utilities:500,transport:650,dining:750,entertainment:500,misc:700}, vat:"about 4-9% sales tax", incomeTax:"Up to about 11% (HI) / 14% (NYC)", note:"Premium cost of living; the stretch goal." },
];

export const PROP = {
  tx: { label:"Texas home", place:"US -- Texas / Florida", sellNet:0.93, rentYield:0.035, ownRate:0.027, rentMo:1500,
    notes:{
      sell:"US tax law generally steps basis up to date-of-death value, so a near-term sale often has little capital-gains tax. Texas has no estate, inheritance, or income tax. This estimate keeps about 7% aside for selling costs.",
      rent:"No Texas income tax, but property tax and upkeep are high. The model uses a simple net rental yield of about 3.5% of the home's value.",
      live:"Owning the Texas home may not free up much cash because property tax and upkeep can be close to the rent you avoid. Selling or renting usually puts the value to clearer use." } },
  at: { label:"Klagenfurt home", place:"Austria", sellNet:0.90, rentYield:0.020, ownRate:0.012, rentMo:1650,
    notes:{
      sell:"Austria has no inheritance tax, but inheriting and later selling real estate can still create transfer and real-estate gains taxes. This simplified estimate keeps 10% aside; a cross-border tax professional should verify the actual basis and treaty result.",
      rent:"Austrian rental income can be taxed in Austria and reported in the US, usually with foreign tax credit mechanics. The model uses a conservative 2% net yield.",
      live:"This is often the strongest cash-flow choice. Austrian carrying costs are low, so living there can replace a large rent bill with a much smaller owner cost." } },
};

export const TIERS = [
  { max:0.8, label:"Tight", color:"#BE4A2B" },
  { max:1.15, label:"Modest", color:"#C7972F" },
  { max:1.7, label:"Comfortable", color:"#1E7A5E" },
  { max:2.6, label:"Affluent", color:"#14302E" },
  { max:Infinity, label:"Luxurious", color:"#7A4FA0" },
];
