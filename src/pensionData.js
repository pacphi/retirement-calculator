// Pension-formula constants for every supported pensionType, sourced to
// docs/research/pension-systems-data.md. Split out of retirementData.js (Wave 5, autopilot
// pension-location-data optimization pass) to keep both files under the house 500-line
// guidance, since these constants form a self-contained module: pension.js is their only
// consumer. See docs/sources.md §22 for the primary-source citation index.

/* WA DRS TRS Plan 2/3 early-retirement factors. NOTE: DRS_ERF_30_PLUS uses the post-May-2013
   "5% ERF" schedule for 30+ year members. Members hired BEFORE May 1, 2013 with 30+ years use
   the gentler "2008 ERF" (e.g. age 62 is unreduced) — not modeled here, so this engine
   understates the pension for that specific group. See docs/sources.md section 9 and
   docs/archive/audits/drs-verification.md. */
export const DRS_ERF_UNDER_30 = {
  55: .4092, 56: .4450, 57: .4844, 58: .5280, 59: .5760,
  60: .6292, 61: .6882, 62: .7538, 63: .8269, 64: .9085, 65: 1,
};

export const DRS_ERF_30_PLUS = {
  55: .50, 56: .55, 57: .60, 58: .65, 59: .70,
  60: .75, 61: .80, 62: .85, 63: .90, 64: .95, 65: 1,
};

/* WA DRS joint-and-survivor option factors — TRS Plans 2/3.
   Source: DRS 2026 Administrative Factors workbook, sheet "Appx G (J&S)",
   table "Joint and Survivor Option Factors: TRS 2/3"
   (https://www.drs.wa.gov/sitemap/adminfactors/), verified 2026-07-09; see
   also WAC 415-02-380. Keyed by AGE DIFFERENCE = member age − beneficiary age
   (negative = beneficiary older, smaller reduction). Electing a survivor
   option permanently reduces the member's benefit by these factors; if the
   beneficiary dies first, DRS restores the single-life amount ("pop-up"). */
/* FERS (Federal Employees Retirement System) constants. Source: docs/research/pension-systems-data.md
   §2, sourced to OPM's FERS Computation and FERS Eligibility pages. The enhanced 1.1% multiplier
   applies only when the member starts at age 62+ with 20+ years of service; otherwise 1.0%.
   Minimum Retirement Age (MRA) is modeled as a fixed 57 — the value for everyone born 1970 or
   later — because this app tracks current age, not birth year; earlier-born members have a lower
   MRA (55 to 56y10m per the OPM table) not represented here, understating their early-retirement
   options the same way the DRS pre-2013 ERF schedule is understated (see the DRS note above). The
   MRA+10 reduced-immediate path is also not modeled as a separate eligibility option. */
export const FERS_MRA = 57;
export const FERS_STANDARD_MULTIPLIER = 0.01;
export const FERS_ENHANCED_MULTIPLIER = 0.011;

/* CalSTRS (California State Teachers' Retirement System). Source: docs/research/pension-systems-data.md
   §3, sourced to CalSTRS's own "The Age Factor" PDF and 2025 Member Handbook (browser-verified).
   Two benefit structures by hire date: "2at60" (hired on/before Dec 31, 2012) and "2at62" (PEPRA,
   hired on/after Jan 1, 2013). Age factor = % of final compensation credited per year of service
   credit, keyed by integer retirement age; ages below each table's floor return 0 (not eligible).
   "2at60" members with 30+ years of service credit earn an additional 0.2% career factor, capped at
   2.4% — modeled by CALSTRS_CAREER_FACTOR_BONUS / CALSTRS_CAP in calstrsPensionAnnual. "2at62" has no
   career-factor enhancement (confirmed verbatim on the source PDF). A closed-form survivor-factor
   table is NOT published for CalSTRS (computed per-election, actuarially) — survivor election is not
   modeled for this system, same as CalPERS below; see the pension.js calstrsPensionAnnual comment. */
export const CALSTRS_AGE_FACTOR_2AT60 = {
  50: .0110, 51: .0116, 52: .0122, 53: .0128, 54: .0134, 55: .0140, 56: .0152, 57: .0164,
  58: .0176, 59: .0188, 60: .0200, 61: .02133, 62: .02267, 63: .0240,
};
export const CALSTRS_AGE_FACTOR_2AT62 = {
  55: .0116, 56: .0128, 57: .0140, 58: .0152, 59: .0164, 60: .0176, 61: .0188, 62: .0200,
  63: .02133, 64: .02267, 65: .0240,
};
export const CALSTRS_CAREER_FACTOR_BONUS = 0.002;
export const CALSTRS_CAP = 0.024;

/* CalPERS (California Public Employees' Retirement System). Source: docs/research/pension-systems-data.md
   §4. CalPERS has NO single canonical formula — the benefit factor depends on the employer's
   contracted formula, member classification, and hire-date tier. These are two REPRESENTATIVE
   tiers, not "the" CalPERS formula: "classic2at55" (Local Miscellaneous 2%@55, min age 50) and
   "pepra2at62" (State Miscellaneous & Industrial 2%@62, min age 52). Like CalSTRS, the survivor-option
   reduction is actuarial by member/beneficiary age with no published flat-factor table — not modeled. */
export const CALPERS_AGE_FACTOR_CLASSIC_2AT55 = {
  50: .01426, 51: .01522, 52: .01628, 53: .01742, 54: .01866, 55: .0200, 56: .02052, 57: .02104,
  58: .02156, 59: .02210, 60: .02262, 61: .02314, 62: .02366, 63: .02418,
};
export const CALPERS_AGE_FACTOR_PEPRA_2AT62 = {
  52: .0100, 53: .0110, 54: .0120, 55: .0130, 56: .0140, 57: .0150, 58: .0160, 59: .0170,
  60: .0180, 61: .0190, 62: .0200, 63: .0210, 64: .0220, 65: .0230, 66: .0240, 67: .0250,
};

// Texas TRS. Source: docs/research/pension-systems-data.md §5 (trs.texas.gov, current post-Sept-2014
// tier). Formula: multiplier x years of service credit x average of 5 highest annual salaries.
// Unreduced at age 65+5yrs, or age 62+ meeting Rule of 80 (age+years >= 80) with 5+ years. Early
// (reduced) retirement: age 55+5yrs when Rule of 80 isn't met, reduced 5%/year below the tier's
// normal-retirement age (62); or 30+ years at any age, reduced 2%/year below age 50.
export const TX_TRS_MULTIPLIER = 0.023;
export const TX_TRS_NORMAL_AGE = 62;
export const TX_TRS_RULE_OF_80 = 80;
export const TX_TRS_EARLY_REDUCTION_PER_YEAR = 0.05;
export const TX_TRS_MIN_EARLY_AGE = 55;
export const TX_TRS_MIN_YEARS = 5;
export const TX_TRS_LONG_SERVICE_YEARS = 30;
export const TX_TRS_LONG_SERVICE_REDUCTION_PER_YEAR = 0.02;
export const TX_TRS_LONG_SERVICE_FLOOR_AGE = 50;

/* NYSTRS Tier 6 (members first joining on/after April 1, 2012). Source:
   docs/research/pension-systems-data.md §6, sourced to NYSTRS's own Tier 6 overview PDF
   (browser-verified) plus the site index for FAS/COLA facts (not independently browser-verified,
   since nystrs.org's HTML pages are Cloudflare-blocked to all automation).
   Pension factor: <20 years -> 1.67%/yr; exactly 20 years -> 1.75% flat (all years); >20 years ->
   35% base + 2%/yr beyond 20. Unreduced at age 63 (or 58 with 30+ years). NYSTRS_EARLY_RETIREMENT_ANCHORS
   are the only two age points the phase-0 research sourced from the Tier 6 PDF (the full age-by-age
   reduction table exists in that PDF but was not extracted row-by-row) — nystrsPensionAnnual linearly
   interpolates between these sourced anchors and the unreduced age (63 -> 100%) rather than
   fabricating intermediate values; a future refresh should pull the complete published table. */
export const NYSTRS_TIER6 = { under20: 0.0167, at20: 0.0175, over20Base: 0.35, over20PerYear: 0.02 };
export const NYSTRS_MIN_AGE = 55;
export const NYSTRS_MIN_YEARS = 5;
export const NYSTRS_UNREDUCED_AGE = 63;
export const NYSTRS_LONG_SERVICE_UNREDUCED_AGE = 58;
export const NYSTRS_LONG_SERVICE_YEARS = 30;
export const NYSTRS_EARLY_RETIREMENT_ANCHORS = { 55: 0.73, 61: 0.94, 63: 1.0 };

/* Ohio STRS. Source: docs/research/pension-systems-data.md §7 (strsoh.org site index / plan
   summary PDF; strsoh.org itself is Cloudflare-blocked to all automation, so not independently
   browser-verified). Formula: 2.2% x years x Final Average Salary (5 highest years). Unreduced
   eligibility: age 65+5yrs, OR any age with 32+ years (extended through May 1, 2035 per the 2026
   board action, then stepping to 33/34 years). Reduced retirement (age 60+5yrs, or 27+ years any
   age) is ACTUARIALLY reduced via the plan's own estimator — STRS Ohio does not publish a flat
   per-year percentage, so per this phase's convention (no fabricated formulas for under-documented
   systems) ohioStrsPensionAnnual only computes the unreduced benefit; a member eligible only for
   the reduced path gets 0 with a note directing them to the generic defined-benefit fallback. */
export const OHIO_STRS_MULTIPLIER = 0.022;
export const OHIO_STRS_UNREDUCED_AGE = 65;
export const OHIO_STRS_UNREDUCED_MIN_YEARS = 5;
export const OHIO_STRS_UNREDUCED_LONG_SERVICE_YEARS = 32;

/* Military retirement — Legacy High-3 and Blended Retirement System (BRS). Source:
   docs/research/pension-systems-data.md §8, sourced to the Army's official benefits portal
   (myarmybenefits.us.army.mil) since militarypay.defense.gov/dfas.mil block all automated access
   (browser-verified). Hard 20-year cliff under EITHER system — unlike every other pension modeled
   here, there is NO partial/graded vesting below 20 years of service; a sub-20-year separation gets
   $0 from the pension system (BRS members still keep their vested TSP balance, but that's an
   investment account, not this pension formula). High-3: 50% of High-3 average base pay at 20 years,
   +2.5%/additional year. BRS: flat 2.0%/year x High-3 average base pay (a reduced multiplier vs.
   Legacy, reflecting the automatic 1% + up to 4%-match TSP contribution BRS also provides). */
export const MILITARY_MIN_YEARS = 20;
export const MILITARY_HIGH3_BASE = 0.50;
export const MILITARY_HIGH3_PER_YEAR = 0.025;
export const MILITARY_BRS_MULTIPLIER = 0.02;

export const DRS_SURVIVOR_FACTORS = {
  minDiff: -20,
  maxDiff: 40,
  // Option 2 — 100% survivor
  j100: [0.972, 0.970, 0.967, 0.965, 0.962, 0.960, 0.957, 0.953, 0.950, 0.947, 0.943, 0.939, 0.935, 0.930, 0.925, 0.920, 0.915, 0.910, 0.902, 0.891, 0.877, 0.860, 0.848, 0.841, 0.828, 0.820, 0.813, 0.806, 0.799, 0.792, 0.785, 0.778, 0.771, 0.764, 0.758, 0.752, 0.746, 0.740, 0.734, 0.729, 0.723, 0.718, 0.713, 0.708, 0.704, 0.699, 0.695, 0.691, 0.687, 0.684, 0.680, 0.677, 0.674, 0.671, 0.668, 0.665, 0.662, 0.660, 0.657, 0.655, 0.653],
  // Option 4 — 66.67% survivor
  j66: [0.981, 0.980, 0.978, 0.976, 0.975, 0.973, 0.971, 0.968, 0.966, 0.964, 0.961, 0.958, 0.955, 0.952, 0.949, 0.945, 0.942, 0.938, 0.932, 0.925, 0.915, 0.902, 0.893, 0.888, 0.878, 0.873, 0.867, 0.862, 0.856, 0.851, 0.845, 0.840, 0.835, 0.830, 0.825, 0.820, 0.815, 0.810, 0.805, 0.801, 0.797, 0.793, 0.789, 0.785, 0.781, 0.777, 0.774, 0.771, 0.767, 0.764, 0.761, 0.759, 0.756, 0.753, 0.751, 0.748, 0.746, 0.744, 0.742, 0.740, 0.738],
  // Option 3 — 50% survivor
  j50: [0.986, 0.985, 0.983, 0.982, 0.981, 0.979, 0.978, 0.976, 0.974, 0.973, 0.971, 0.968, 0.966, 0.964, 0.961, 0.959, 0.956, 0.953, 0.948, 0.942, 0.935, 0.925, 0.918, 0.913, 0.906, 0.901, 0.897, 0.893, 0.888, 0.884, 0.879, 0.875, 0.871, 0.866, 0.862, 0.858, 0.854, 0.850, 0.847, 0.843, 0.839, 0.836, 0.833, 0.829, 0.826, 0.823, 0.820, 0.817, 0.815, 0.812, 0.810, 0.807, 0.805, 0.803, 0.801, 0.799, 0.797, 0.795, 0.793, 0.791, 0.790],
};
