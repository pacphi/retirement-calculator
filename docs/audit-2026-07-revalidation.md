# Deep Audit & Revalidation — July 2026

**Date:** 2026-07-09 · **Scope:** full engine math, all baked-in constants and
defaults, online source revalidation, feasibility of the default persona ·
**Verdict basis:** every engine claim below was reproduced by a runnable script
against the actual `src/finance/*` modules; every constant verdict cites a
source fetched on the audit date.

This audit was commissioned in response to distrust of the calculator's figures
— the retirement charts, spending models, and tax exposure "all seem really
suspect." It re-derives the math by hand, re-fetches the sources, perturbs the
default plan to price each finding in dollars, and classifies everything found.

---

## 1. Executive verdict

**Figures and charts.** The arithmetic is right. Federal tax was hand-recomputed
at four income points and matched the engine to the cent; a full steady-state
retirement row (age 74: $37,400 pension + $57,575 Social Security, $2,715 tax)
reconciles exactly against the 2026 brackets, taxable-Social-Security worksheet,
and senior deductions. Social Security claiming factors (0.70 at 62, 0.8667 at
65, 1.24 at 70), the DRS Plan 3 formula (1% × 22 yrs × $170k = $37,400), and RMD
divisors all match hand math. The charts plot what the engine computes; the
golden regression pin (steady net $123,799 / target need $75,294 / FV $924,585)
reproduced exactly, and all 375 tests pass.

**Tax exposure.** The number that most invites suspicion — a year showing an
**$82,208 withdrawal and $0 federal tax at age 65** — is an artifact of a real,
documented model gap: withdrawals from the _taxable_ bucket carry no tax at all
(no capital-gains model; only the tax-deferred slice of a draw is taxed as
ordinary income). But for this persona the artifact is nearly harmless: with no
other ordinary income, the realized gains in that year would fall inside the 0%
long-term-capital-gains bracket in real life too. The gap matters for users with
large taxable accounts and large embedded gains (finding A). Every other tax
behavior checked — bridge-year draws taxed normally (~$15.7k/yr on ~$98k
deferred draws), RMD-year effective rates ~9%, OBBBA senior bonus with correct
phase-out and 2028 sunset, the Austria treaty layer (DRS pension US-only, IRA
draws +5% net of treaty) — is implemented correctly.

**Spending model.** Coherent and, where it deviates from ideal, it deviates
_conservatively_: the default income basis does not scale spending down for a
survivor (overstates late-life need by ~$20k/yr), the death-year files single
immediately (overstates that year's tax by ~$9k), and RMDs are forced up to 9
years early against the older spouse's age (accelerates tax). The 81%-from-2034
Social Security haircut is ON by default — the plan gives up ~$20k/yr of
headline income to that assumption relative to full benefits.

**Sources.** Every implemented tax, Social Security, and DRS constant matched
its authoritative source exactly on a live re-fetch — 2026 IRS brackets and
deductions (including the OBBBA senior bonus mechanics), SSA bend points and
wage base, DRS multipliers and early-retirement factors, RMD tables,
contribution limits, LTC cost medians. Exactly **one stale value** was found:
the Social Security solvency default still carries the 2025 Trustees figure (81%
from 2034); the June 2026 report moved it to 83% from 2034 (finding T). The
genuinely debatable numbers are assumption-grade, not fact-grade: the 5% real
return (historical average, above every 2026 institutional forecast), the
Austrian healthcare premium (needs a co-insurance arrangement to hold), and the
+5% treaty rate on large IRA draws.

**Bottom line on feasibility.** Under its own defaults the plan is genuinely
robust, not cosmetically so: it never depletes to age 101, ends with $3.85M
(real), and survives a stacked pessimistic rerun (3.9% withdrawal rate + 4.0%
real return + long-term care enabled) with $2.2M to spare; Monte Carlo success
is 95.5%. The optimism critiques below are real but do not flip this persona's
outcome. The two assumptions most worth personalizing are the 5% real return
(current institutional capital-market assumptions cluster lower — see §6) and
the Social Security statement amounts (the defaults are synthetic).

### Persona stress table (default plan, perturbation reruns)

| Scenario                                             |                                                             Steady net income | Steady-state FV | End balance (age 101) | Depletes? |
| ---------------------------------------------------- | ----------------------------------------------------------------------------: | --------------: | --------------------: | --------- |
| Baseline (5% real, 4% SWR, 81% SS from 2034)         |                                                                      $123,799 |        $924,585 |            $3,850,570 | never     |
| Morningstar SWR 3.9%                                 |                                                                      $123,126 |        $924,585 |            $3,850,570 | never     |
| Real return 4.0% (CMA-consistent)                    |                                                                      $116,738 |        $682,125 |            $2,504,577 | never     |
| Real return 3.5% (conservative preset)               |                                                                      $113,683 |        $577,213 |            $2,025,421 | never     |
| Stacked: 3.9% SWR + 4.0% real + LTC on               |                                                                      $116,242 |        $682,125 |            $2,202,047 | never     |
| Full Social Security (no trust-fund cut)             |                                                                      $143,762 |      $1,050,290 |            $4,798,541 | never     |
| 2026 Trustees update (83% from 2034)                 |                                                                      $125,905 |               — |            $3,952,796 | never     |
| OASI-alone convention (78% from 2033)                |                                                                      $120,639 |               — |            $3,696,550 | never     |
| Joint-survivor pension priced (×0.884, 50% elected)  |                                                                      $119,218 |        $920,967 |            $3,651,529 | never     |
| Joint-survivor pension priced (×0.792, 100% elected) |                                                                      $115,849 |               — |            $3,505,023 | never     |
| Monte Carlo (1000 paths, seed 12345)                 | success 95.5% · sustainable income p10 $102,154 / p50 $125,920 / p90 $168,445 |                 |                       |           |

---

## 2. Methodology

1. **Independent recomputation** — scratch scripts imported the engine modules
   directly (`tax.js`, `socialSecurity.js`, `pension.js`, `rmd.js`,
   `simulate.js`, `plan.js`, `monteCarlo.js`, `defaultPlan.js`) and compared
   engine output against values computed by hand from statute/tables. Nothing in
   the repo was modified to run them.
2. **Source revalidation** — every material constant in `src/retirementData.js`
   was re-checked against a live fetch of an authoritative source (IRS, SSA,
   CMS, DRS/WAC, KFF, Morningstar, Numbeo et al.) on 2026-07-09. Verdicts:
   VERIFIED / STALE / WRONG / UNVERIFIABLE (§3).
3. **Adversarial verification** — each candidate defect was first attacked
   (e.g., searched for a second code path that could scale survivor spending;
   re-priced the missing capital-gains tax against the 0% LTCG bracket before
   accepting the naïve 15% estimate). Findings that survived are in §5 with the
   falsification noted.
4. **Impact pricing** — perturbation reruns of
   `calculatePlan(makeDefaultPlan())` with single-input changes (never engine
   edits): SWR 3.9%, real return 4.0%/3.5%, life model with survivor pension,
   pension × joint-survivor factor, full-SS scenario, stacked pessimistic.
5. **Regression state** — 375/375 tests green before and after (the audit
   changed no engine code; the only repo edit besides this report is a
   broken-link fix in `docs/sources.md`).

Reproduce any engine claim: the row-level numbers come from
`calculatePlan(makeDefaultPlan()).simChosen.rows`; the golden pin from
`src/defaultPlan.test.js`.

---

## 3. Constants verification (live sources, fetched 2026-07-09)

Every implemented constant was checked against a page actually fetched on the
audit date. **Result: one stale value (the Social Security solvency scenario,
superseded by the June 2026 Trustees Report), zero wrong values.**
Assumption-grade items (returns, cost baskets) are graded for reasonableness
rather than exactness.

### 3.1 Federal tax & retirement accounts — all VERIFIED, zero mismatches

| Constant                                   | Code value                                              | Authoritative 2026 value                                                                                                                        | Source (fetched)                                                                                                                                                                                                                                                                                | Verdict                                                          |
| ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Single bracket floors                      | $0/$12,400/$50,400/$105,700/$201,775/$256,225/$640,600  | identical                                                                                                                                       | [IRS 2026 inflation adjustments (OBBBA)](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill)                                                                                                            | VERIFIED                                                         |
| MFJ bracket floors                         | $0/$24,800/$100,800/$211,400/$403,550/$512,450/$768,700 | identical                                                                                                                                       | same + [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)                                                                                                                                                                                                                      | VERIFIED                                                         |
| Standard deduction                         | $16,100 / $32,200                                       | identical                                                                                                                                       | Rev. Proc. 2025-32                                                                                                                                                                                                                                                                              | VERIFIED                                                         |
| Age-65 addition                            | +$2,050 single / +$1,650 per spouse                     | identical (§.14(3))                                                                                                                             | Rev. Proc. 2025-32                                                                                                                                                                                                                                                                              | VERIFIED                                                         |
| OBBBA senior bonus                         | $6,000/person, 6% phase-out above $75k/$150k, 2025–2028 | identical (Schedule 1-A line 34 confirms the 6%)                                                                                                | [IRS OBBBA deductions](https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors) + [Pub 6142](https://www.irs.gov/pub/irs-pdf/p6142.pdf) + [Schedule 1-A](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf)                                         | VERIFIED                                                         |
| LTCG thresholds (docs-only, unimplemented) | —                                                       | 0% to $49,450/$98,900; 15% to $545,500/$613,700; 20% above (single/MFJ)                                                                         | Rev. Proc. 2025-32 §.03                                                                                                                                                                                                                                                                         | VERIFIED (gap sized for finding A)                               |
| 401(k)/catch-up/super                      | $24,500 / $8,000 / $11,250                              | identical                                                                                                                                       | [IRS newsroom](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500) + [Notice 2025-67](https://www.irs.gov/pub/irs-drop/n-25-67.pdf)                                                                                                                | VERIFIED                                                         |
| IRA / catch-up                             | $7,500 / $1,100                                         | identical                                                                                                                                       | same                                                                                                                                                                                                                                                                                            | VERIFIED                                                         |
| HSA self/family/55+                        | $4,400 / $8,750 / +$1,000                               | identical                                                                                                                                       | [Rev. Proc. 2025-19](https://www.irs.gov/pub/irs-drop/rp-25-19.pdf) + Pub 969                                                                                                                                                                                                                   | VERIFIED                                                         |
| Roth MAGI phase-out                        | $153k–$168k / $242k–$252k                               | identical                                                                                                                                       | Notice 2025-67                                                                                                                                                                                                                                                                                  | VERIFIED                                                         |
| Roth catch-up wage floor                   | $150,000                                                | identical ($145k→$150k, indexed, prior-year FICA wages)                                                                                         | Notice 2025-67                                                                                                                                                                                                                                                                                  | VERIFIED                                                         |
| First-RMD age                              | 73 (born 1951–59) / 75 (1960+)                          | identical; born-1959 technically awaits final regs but 73 is the consensus reading                                                              | [T.D. 10001, IRB 2024-33](https://www.irs.gov/irb/2024-33_IRB)                                                                                                                                                                                                                                  | VERIFIED                                                         |
| Uniform Lifetime 73/75/80/90               | 26.5/24.6/20.2/12.2                                     | identical                                                                                                                                       | [Pub 590-B App. B](https://www.irs.gov/pub/irs-pdf/p590b.pdf)                                                                                                                                                                                                                                   | VERIFIED                                                         |
| Missed-RMD excise                          | 25% / 10% corrected                                     | identical                                                                                                                                       | [IRS RMD FAQs](https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs)                                                                                                                                                                                | VERIFIED                                                         |
| SS provisional thresholds                  | $25k/$34k, $32k/$44k, frozen                            | identical — IRC §86 amounts are statutorily unindexed; OBBBA did **not** change SS benefit taxation (it added the senior deduction instead)     | [Pub 915](https://www.irs.gov/publications/p915)                                                                                                                                                                                                                                                | VERIFIED                                                         |
| Medicare Part B 2026 (docs-only)           | $202.90/mo, $283 deductible                             | identical; IRMAA starts at MAGI $109k/$218k (+$81.20/mo first tier) and taxable RMDs do count toward IRMAA MAGI                                 | [CMS 2026 fact sheet](https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles)                                                                                                                                                                                      | VERIFIED                                                         |
| Pre-65 ACA couple $2,450/mo                | US-national `hcPre`                                     | 2026 unsubsidized benchmark for a 60-year-old ≈ $1,326/mo → couple ≈ $2,650/mo after the 2026 +26% hike and enhanced-credit expiry (12/31/2025) | [Peterson-KFF](https://www.healthsystemtracker.org/brief/how-much-and-why-aca-marketplace-premiums-are-going-up-in-2026/) + [KFF](https://www.kff.org/affordable-care-act/aca-marketplace-premium-payments-would-more-than-double-on-average-next-year-if-enhanced-premium-tax-credits-expire/) | VERIFIED-secondary (defensible, slightly below the 2026 average) |
| Post-65 Medicare couple $1,000/mo          | US-national `hcPost`                                    | Fidelity 2025: couple first-year ≈ $12,850 (~$1,070/mo)                                                                                         | [Fidelity 2025 estimate](https://newsroom.fidelity.com/pressreleases/fidelity-investments--releases-2025-retiree-health-care-cost-estimate--a-timely-reminder-for-all-gen/s/3c62e988-12e2-4dc8-afb4-f44b06c6d52e)                                                                               | VERIFIED                                                         |

### 3.2 Social Security & Washington DRS

| Item                                             | Code value                                                               | Authoritative value                                                                                                                                    | Source (fetched)                                                                                                                                                                                                        | Verdict                                |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 2026 PIA bend points                             | $1,286 / $7,749                                                          | identical                                                                                                                                              | [SSA bend points](https://www.ssa.gov/oact/cola/bendpoints.html)                                                                                                                                                        | VERIFIED                               |
| 2026 wage base                                   | $184,500                                                                 | identical                                                                                                                                              | [SSA contribution base](https://www.ssa.gov/oact/cola/cbb.html)                                                                                                                                                         | VERIFIED                               |
| FRA 67 (born 1960+)                              | 67                                                                       | identical (covers both persona cohorts)                                                                                                                | [SSA early-retirement](https://www.ssa.gov/oact/quickcalc/earlyretire.html)                                                                                                                                             | VERIFIED                               |
| Early reduction 5/9%/mo ×36 then 5/12%/mo        | identical                                                                | identical                                                                                                                                              | same                                                                                                                                                                                                                    | VERIFIED                               |
| Delayed credits 8%/yr to 70                      | identical                                                                | identical                                                                                                                                              | [SSA delayed retirement](https://www.ssa.gov/benefits/retirement/planner/delayret.html)                                                                                                                                 | VERIFIED                               |
| Spousal 50% at FRA, 25/36%/mo reduction, no DRCs | identical                                                                | identical (SSR 79-26: DRCs extend only to widow(er)s)                                                                                                  | [SSA spousal](https://www.ssa.gov/oact/quickcalc/spouse.html)                                                                                                                                                           | VERIFIED                               |
| Survivor keeps larger check                      | approximation                                                            | Survivor at FRA receives 100% of the deceased's benefit incl. their DRCs; checks are not added                                                         | [SSA survivor amounts](https://www.ssa.gov/survivor/amount)                                                                                                                                                             | VERIFIED (fair planning approximation) |
| **Trustees scenario 81% from 2034**              | `0.81` hardcoded (`plan.js:31`), defaults `ssHaircut:81, ssCutYear:2034` | 2025 report: combined OASDI 2034 → 81%. **2026 report (June 9, 2026): combined Q3 2034 → 83%; OASI-alone Q4 2032 → 78%**                               | [2025 highlights](https://www.ssa.gov/oact/TR/2025/II_A_highlights.html) · [2026 press release](https://www.ssa.gov/news/en/press/releases/2026-06-09.html) · [2026 summary](https://www.ssa.gov/oact/TRSUM/index.html) | **STALE**                              |
| TRS 2/3 multipliers 2%/1%                        | identical                                                                | identical                                                                                                                                              | [DRS TRS 2](https://www.drs.wa.gov/plan/trs2/) / [TRS 3](https://www.drs.wa.gov/plan/trs3/)                                                                                                                             | VERIFIED                               |
| AFC = highest consecutive 60 months              | identical                                                                | identical                                                                                                                                              | same                                                                                                                                                                                                                    | VERIFIED                               |
| Vesting / early-retirement guards                | P3 10 yr (or 5 w/ rule), P2 55+20, P3 55+10                              | identical                                                                                                                                              | same + [DRS admin factors](https://www.drs.wa.gov/sitemap/adminfactors/)                                                                                                                                                | VERIFIED                               |
| ERF <30 yrs (55=0.4092 … 64=0.9085)              | identical                                                                | identical, spot-checked 55/60/64 — **table effective through Dec 31, 2026; 2027 set already published** (55=0.4018, 60=0.6236, 64=0.9069)              | DRS 2026 + 2027 Administrative Factors workbooks                                                                                                                                                                        | VERIFIED (2027 update pending)         |
| 30+ yr 5% ERF; pre-5/2013 2008-ERF gap           | 5% schedule only                                                         | 5% column identical; 2008 ERF (55=0.80, 62–64=1.00) confirmed for pre-May-2013 hires — code's documented understatement for that cohort confirmed real | same                                                                                                                                                                                                                    | VERIFIED (documented gap)              |
| DRS COLA cap 3%                                  | **not modeled**                                                          | Confirmed: CPI(Seattle)-based, max 3%/yr, with COLA banking                                                                                            | [DRS COLA](https://www.drs.wa.gov/cola/)                                                                                                                                                                                | confirms finding C                     |
| Joint-survivor option factors                    | **not modeled** (election is free)                                       | TRS 2/3, beneficiary 9 yrs younger: **100% J&S = 0.792, 66.67% = 0.851, 50% = 0.884** (2026 factors; 2027: 0.803/0.860/0.891)                          | DRS Administrative Factors workbooks, Appx G                                                                                                                                                                            | confirms finding D                     |

### 3.3 Market assumptions, cost of living, cross-border

| Item                                          | Code value                                           | External evidence                                                                                                                                                                                                                                                                                                                                                                             | Verdict                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Safe withdrawal rate                          | 4.0%                                                 | Morningstar _State of Retirement Income: 2025_: base case **3.9%** (30-yr, 90% success; flexible variants ~5–6%) — [PDF](https://static.twentyoverten.com/5b5730126af0247efe4f2066/zT8sbuFanVR/Morningstar-2025-State-of-Retirement-Income.pdf)                                                                                                                                               | REASONABLE, marginally optimistic                                                                                                  |
| Real return 5.0% ("balanced 60/40-style")     | presets 3.5/5.0/6.5% real                            | [Vanguard 2026 outlook](https://corporate.vanguard.com/content/dam/corp/research/pdf/isg_vemo_2026.pdf): US equities 4–5% _nominal_, bonds ~4% nominal → 60/40 ≈ 2–2.5% _real_; [AQR 2026 CMA](https://www.aqr.com/Insights/Research/Alternative-Thinking/2026-Capital-Market-Assumptions-for-Major-Asset-Classes): global 60/40 **3.4% real**, "long-term U.S. average nearly 5% since 1900" | **OPTIMISTIC vs 2026 CMAs** (matches history, ~1.5–3 pts above forward-looking estimates; 6.5% preset very optimistic)             |
| Volatility 12%                                | 0.12                                                 | Historical 60/40 stdev ≈ 9.5–10% ([PortfoliosLab](https://portfolioslab.com/portfolio/stocks-bonds-60-40))                                                                                                                                                                                                                                                                                    | mildly PESSIMISTIC (safe direction for MC)                                                                                         |
| Inflation 2.5%                                | 0.025                                                | [10-yr breakeven 2.23%](https://fred.stlouisfed.org/series/T10YIE) (2026-07-09); [CPI May 2026](https://www.bls.gov/news.release/cpi.nr0.htm) 4.2% headline / 2.9% core; Fed target 2%                                                                                                                                                                                                        | REASONABLE                                                                                                                         |
| Klagenfurt couple basket ≈ $1,920/mo ex-rent  | `LOCATIONS` Austria                                  | [Numbeo Klagenfurt](https://www.numbeo.com/cost-of-living/in/Klagenfurt-Austria?displayCurrency=USD) (June 2026): couple ex-rent ≈ $2,000–2,300; utilities match within $10                                                                                                                                                                                                                   | REASONABLE (~5–15% light)                                                                                                          |
| Klagenfurt rent — persona input $3,800/mo     | `housing.rent`                                       | Numbeo: 3-BR city centre **$1,323/mo**                                                                                                                                                                                                                                                                                                                                                        | persona input ≈ 3× market — overstates spending need (conservative); the `LOCATIONS` default $1,650 is realistic                   |
| Austria healthcare $520/$420 per couple/mo    | `hcPre`/`hcPost`                                     | ÖGK self-insurance 2026: **€565.25/mo per person** (~$645); realistic only with spouse co-insurance or means-tested reduction                                                                                                                                                                                                                                                                 | OPTIMISTIC (full self-insurance for two ≈ $1,290/mo)                                                                               |
| US-national basket ≈ $3,220/mo ex-rent        | `LOCATIONS`                                          | [BLS CES 2024](https://www.bls.gov/news.release/cesan.nr0.htm) line items in range                                                                                                                                                                                                                                                                                                            | REASONABLE                                                                                                                         |
| LTC $129,000 national / $197,000 Hawaii       | `ltcAnnual`                                          | [CareScout 2025](https://investor.genworth.com/news-events/press-releases/detail/1054/carescout-releases-2025-cost-of-care-survey-results): private-room median $129,575; [Hawaii $196,735](https://investor.genworth.com/news-events/press-releases/detail/1001/long-term-care-costs-increase-in-hawaii-exceeding-national)                                                                  | VERIFIED (within $600)                                                                                                             |
| WA/TX no income tax; CA taxes IRA, exempts SS | `US_STATE_TAX`                                       | [Tax Foundation TX](https://taxfoundation.org/location/texas/) / [WA](https://taxfoundation.org/location/washington/) (note WA 7% cap-gains excise above ~$262k exists, rarely hits retirees); CA SS exemption unconditional                                                                                                                                                                  | VERIFIED                                                                                                                           |
| Property tax TX 1.63% / WA 0.87%              | `propertyTaxRate`                                    | Tax Foundation effective rates: TX 1.40%, WA 0.75%                                                                                                                                                                                                                                                                                                                                            | REASONABLE (mildly high = safe direction)                                                                                          |
| US–Austria treaty structure                   | DRS pension US-only; SS US-only; IRA residence-taxed | [Treaty text](https://www.irs.gov/pub/irs-trty/austria.pdf): Art 19 government pensions taxable only by the US for its citizens; Art 18(1)(b) social security taxable only by the paying state (saving-clause-protected); Art 18(1)(a) private pensions/IRA taxable in residence state, US saving clause + FTC relief                                                                         | VERIFIED (structure exactly right)                                                                                                 |
| Austria +5% net rate on IRA draws             | `retireRate: 0.05`                                   | Austrian brackets reach 48–50%; net-of-FTC 5% plausible for modest draws, likely low for six-figure draws                                                                                                                                                                                                                                                                                     | OPTIMISTIC/UNCERTAIN (in-app "verify with a specialist" caveat is warranted — the persona's ~$98k/yr bridge draws sit at the edge) |
| ImmoESt vs 10% intl sale haircut              | `sellNet 0.90`                                       | Verified: 30% on gain, heir takes decedent's basis (no step-up); pre-2002 _Altvermögen_ → effective 4.2% of proceeds                                                                                                                                                                                                                                                                          | ADEQUATE for Altvermögen; can UNDERSTATE Neuvermögen with large gains (disclaimer already in code)                                 |
| `SINGLE_COST_FACTOR` 0.64                     | 0.64                                                 | OECD-modified equivalence scale → 0.67; square-root scale → 0.71                                                                                                                                                                                                                                                                                                                              | REASONABLE but slightly low (~4–10% light for survivor costs)                                                                      |

---

## 4. Engine math verification (hand-computed vs engine)

| Quantity                                                    |                                Hand value | Engine value | Match |
| ----------------------------------------------------------- | ----------------------------------------: | -----------: | ----- |
| Federal tax, MFJ, taxable $75,000                           |                                    $8,504 |    $8,504.00 | exact |
| Federal tax, MFJ, taxable $150,000                          |                                   $22,424 |   $22,424.00 | exact |
| Federal tax, MFJ, taxable $250,000                          |                                   $45,196 |   $45,196.00 | exact |
| Federal tax, single, taxable $75,000                        |                                   $11,212 |   $11,212.00 | exact |
| Taxable SS (other $40k, SS $30k, MFJ)                       |                                   $15,350 |      $15,350 | exact |
| Taxable SS (other $20k, SS $12k, single)                    |                                      $500 |         $500 | exact |
| Std deduction MFJ both 67, 2027, AGI $100k                  |          $47,500 ($32,200+$3,300+$12,000) |      $47,500 | exact |
| Same, 2029 (senior bonus sunset)                            |                                   $35,500 |      $35,500 | exact |
| Same, 2026, AGI $200k (6% phase-out)                        |                                   $44,500 |      $44,500 | exact |
| Full tax year (pension $30k, draw $40k @90%, SS $50k, 2035) |                 AGI $108,500 → tax $8,264 |       $8,264 | exact |
| SS own-benefit factor at 62 / 65 / 70 / 72                  |               0.70 / 0.8667 / 1.24 / 1.24 |         same | exact |
| SS spousal factor at 62 / 70                                |                     0.325 / 0.50 (no DRC) |         same | exact |
| DRS pension (Plan 3, 22 yr, AFC $170k, age 65)              |                                   $37,400 |      $37,400 | exact |
| ERF guards (55/15yr Plan 2 → 0; Plan 3 → 0.4092)            |                             per WAC table |         same | exact |
| RMD start (born 1959/1960)                                  |                                   73 / 75 |      73 / 75 | exact |
| RMD $500k at 73                                             |                                $18,867.92 |   $18,867.92 | exact |
| Steady row age 74 (pension $37,400 + SS $57,575)            |              fed $2,715, Austria layer $0 |  $2,715 / $0 | exact |
| Golden pin (default persona)                                | net $123,799 / need $75,294 / FV $924,585 |         same | exact |

The tax-on-withdrawal circularity is solved correctly: `solveWithdrawal` bisects
32 iterations for the gross draw whose after-tax proceeds meet the need — there
is no "forgot the tax on the tax" bug. Monte Carlo is reproducible for a fixed
seed, degenerates to the deterministic path at zero volatility, and samples
lognormal returns whose median compounds at the blended mean (avoiding the
classic arithmetic-mean overstatement).

---

## 5. Findings, ranked

Classification legend: **BUG** — code disagrees with its own intent · **GAP** —
documented simplification with material consequences · **INCONSISTENT** — two
code paths disagree · **NON-ISSUE** — suspicion investigated, cleared.

### A. Taxable-bucket withdrawals are never taxed — GAP, highest priority

`calculateFederalTaxYear` taxes only `grossWithdrawal × tradFrac` (the deferred
slice) as ordinary income (`src/finance/tax.js:66`); the taxable bucket has no
capital-gains model at all (`src/finance/buckets.js:30-31` documents this as out
of scope). Probe: a $100,000 draw with `tradFrac 0` produces **$0.00 total
tax**. This is why the default projection shows $0 tax at age 65 against an
$82,208 withdrawal.

_Adversarial check:_ for the default persona this is far less damaging than it
looks. Cumulative taxable-bucket draws over the whole horizon are only ≈ $124k
(90% of savings is pre-tax, and tax-smart ordering drains taxable first while
ordinary income is $0), so realized gains would sit inside the 0% LTCG bracket
(MFJ taxable income up to $98,900 in 2026, verified in Rev. Proc. 2025-32) — the
true liability is ≈ $0, and even a worst-case 50%-gains × 15% overlay is only ≈
$9.3k over 45 years. **The gap becomes material for taxable-heavy users**:
someone funding a $100k/yr retirement from a large taxable account with big
embedded gains would owe real 15–20% LTCG the model silently omits, and the
gross-up solver under-withdraws accordingly.

_Recommendation:_ model LTCG with the 0%/15%/20% brackets and a user-supplied
cost-basis fraction for the taxable bucket (effort M — touches tax.js, solver,
and the golden pin). At minimum, disclose "taxable-account gains are untaxed in
this model" wherever the tax chart is shown (effort S).

### B. Survivor spending is not scaled down on the default (income) basis — INCONSISTENT, conservative

The location basis multiplies a single/survivor household's living costs by
`SINGLE_COST_FACTOR` 0.64 (`src/finance/seams.js:110`); the default income basis
applies no scale (`seams.js:132`) — a survivor keeps spending the full couple
share of the _original combined_ income. Falsification attempt: repo-wide search
finds only two scaling sites (seams.js location path; `usePlan.js:36` UI
location rows) — nothing scales the income basis. Priced with the life model on
(deaths 95/92): survivor-period need is overstated by ≈ **$20,300/yr, ≈ $142k
across 7 survivor years**. Direction is conservative (overstates need,
understates plan health), but the two bases silently disagree about the same
widowhood. _Recommendation:_ apply the same factor (or an explicit
survivor-spending setting) on the income basis; effort S, moves the golden pin
only when the life model triggers survivorhood.

### E. Income-based Social Security estimate treats current salary as a 35-year AIME — BUG in the fallback path

`benefits()` calls `piaFromIncome(income)` directly
(`src/finance/simulate.js:16-17`), which divides current annual income by 12 and
runs it through the bend points as if it were the lifetime AIME
(`src/finance/socialSecurity.js:3-8`, with `SS_CAP` — the 2026 _wage base_ —
misused as the income cap). For a $170k earner that yields $50,259/yr at FRA; a
22-year career's honest figure is $31,591 — an **$18,667/yr (59%)
overstatement**. The corrected estimator already exists (`proratedFraEstimate`,
socialSecurity.js:13-14) and is _within $1_ of the persona's statement default,
but `benefits()` never calls it. Mitigations: defaults ship in statement mode,
and the UI warns when the estimate is used — so this only bites users who pick
"estimate" mode. _Recommendation:_ wire `proratedFraEstimate` (with a
covered-years input) into `benefits()`; effort S.

### F. RMDs computed on the combined household pool at the older spouse's age — GAP, conservative but distorting

`rmdStart` keys off `max(ageA, ageB)` and the divisor applies to the entire
deferred pool (`src/finance/simulate.js:131-132, 349-350`). RMDs are per-person
in law. Probe: a $1M pool split 50/50 between spouses 75 and 66 owes $20,325 in
reality (only the 75-year-old is subject); the engine forces $40,650. For the
default persona the effect is stark: the sole earner and presumptive account
owner is spouse B (9 years younger), yet forced distributions start when _A_
turns 75 (2044) — up to nine years early — and the engine forces **$1.62M of RMD
distributions across 27 years** (first at A's 75, `rmd = deferredBal/divisor`,
fully taxed, after-tax remainder reinvested). Direction: overstates early tax,
accelerates the taxable-bucket buildup; end balance impact is second-order but
the _tax-exposure chart timing_ is materially wrong for age-gap couples.
_Recommendation:_ attribute deferred balances per owner and apply each owner's
RMD age/divisor; effort M.

### D. Electing a survivor pension is free — GAP, only when elected

`pensEff = pensHolderDead ? pens × (survPensionPct/100) : pens`
(`src/finance/simulate.js:190-192`): the member's benefit is never reduced while
both spouses are alive, but a real WA DRS joint-survivor election costs an
actuarial reduction from day one. The actual DRS factors (2026 Administrative
Factors, TRS 2/3, beneficiary 9 years younger — the persona's age gap) are
**0.884 for the 50% option and 0.792 for the 100% option**. Priced: a 50%
election costs steady net −$4,581/yr and end balance −$213,627 (rerun at
×0.884≈0.88); a 100% election costs steady net −$7,950/yr and end balance
−$345,547 (rerun at ×0.792). The default (`pensionPct 0`) is internally coherent
— it models a single-life annuity — so this only misleads users who set a
survivor percentage and see no cost. _Recommendation:_ multiply the base pension
by the DRS option factor whenever `pensionPct > 0`; effort S.

### H. Death-year filing status flips to single immediately — GAP, conservative

`isSurvivor` is true in the death year itself
(`src/finance/simulate.js:175-185`): the smaller SS check is zeroed and the
household files single that year, though in reality the year of death is still
MFJ (and qualifying-surviving-spouse status can extend two more years). Priced
on the first survivor year (2064): federal tax $20,583 as single vs $11,415 as
MFJ — **+$9,169 in that year**, plus the survivor's SS understated by the
smaller check for the partial year. Conservative direction. _Recommendation:_
keep MFJ through the death year; effort S. The two-year widow window is a
refinement (S/M).

### T. Social Security solvency scenario is stale — STALE CONSTANT (the only one found)

The "trustees" scenario hardcodes 81% payable from 2034
(`src/finance/plan.js:31`, `src/defaultPlan.js:15`) — the 2025 Trustees Report's
combined-OASDI figure. The **2026 Trustees Report (released June 9, 2026)**
moved the numbers: combined OASI+DI depletes Q3 2034 → **83% payable**; OASI
alone depletes Q4 2032 → **78% payable**. Priced: updating to 83%/2034 raises
steady net +$2,106/yr; the more pessimistic OASI-alone convention (78%/2033)
lowers it −$3,160/yr. Users can already enter custom values, so the exposure is
the default label, not a lost capability. _Recommendation:_ update the constant
to 83%/2034 (keeping the combined-fund convention, citing the 2026 report), or
expose OASI-alone 78%/2033 as the pessimistic choice; effort S. This is the
routine annual-refresh case the docs already anticipate.

### C. DRS 3% COLA cap is not modeled — GAP, conditional

The engine holds the pension flat in real terms (implicit COLA = inflation), but
DRS Plans 2/3 cap the annual COLA at 3% (verified live: CPI-Seattle-based, 3%
max, with COLA banking — [drs.wa.gov/cola](https://www.drs.wa.gov/cola/)). At
the default 2.5% inflation the error is exactly $0; in a sustained
3.5%-inflation world the real pension erodes ~0.5%/yr (≈ 10% real value lost
over 20 years, ≈ $3.7k/yr on the persona's $37.4k pension by late retirement —
COLA banking softens this if high-inflation years are followed by low ones).
_Recommendation:_ cap the pension COLA at min(inflation, 3%) and deflate the
excess; effort S–M.

### G. Spousal/survivor Social Security uses max() approximations — acceptable simplification

Spousal benefit = `max(own, spousal-at-50%-of-worker-PIA)` credited only when
the other PIA is larger; survivor = the household keeps the larger
claim-adjusted check (`src/finance/simulate.js:20-23, 180-184`). Real SSA
mechanics (excess spousal, survivor's own FRA timing, RIB-LIM) differ in edge
cases but the planning-grade approximation is directionally sound and CLAUDE.md
documents the spousal cap. No action beyond docs.

### K. Monte Carlo structure — sound, with one display bug

Verified: seeded LCG → reproducible (`successProb` bit-identical across runs);
lognormal sampling; zero volatility degenerates to the deterministic path;
median compounds at the blended mean. Simplifications (i.i.d. annual returns,
constant volatility regardless of glidepath, static bucket weights for the
byBucket blend) are documented and standard for planning tools — they understate
fat tails and sequence clustering; the in-app deterministic caveat plus MC
opt-in is the right disclosure posture. **New bug found:** `balanceFan` is built
to the _horizon_ length (`src/finance/monteCarlo.js:28-30`) while the life model
ends simulation paths at the last death (age 101 for the defaults), so the fan's
last three rows are `{p10: null, p50: null, p90: null}` at ages 102–104 —
trailing empty points fed to the chart. Effort S.

### Minor / cosmetic

- `UNIFORM_LIFETIME[72] = 27.4` is unreachable for anyone with first-RMD age
  73/75 (pre-2023 cohorts only) — harmless, keep for back-compat.
- Row `growth = bal × yr` (`simulate.js:301`) excludes the year's sale lump and
  contributions — display-only inconsistency in the growth column.
- Contributions are deposited after growth (no first-year return on the year's
  savings) — a stated timing convention, slightly conservative (~$450/yr at 5%
  on $18k contributions, immaterial).
- `docs/sources.md` cited three research companions at
  `docs/archive/audits/*.md` which live at `docs/archive/audit-*.md` — **fixed
  in this audit's first commit**.

### NON-ISSUES (suspicions investigated and cleared)

- **"No tax on the tax"** — cleared; the bisection gross-up is correct.
- **Real-flat brackets** — cleared; brackets are CPI-indexed in law, so holding
  them flat in a real-dollar model is the _correct_ treatment, and the one
  genuinely nominal-dated provision (senior bonus sunset 2028) is correctly
  calendar-gated.
- **Provisional-income thresholds "look stale"** — cleared; the
  $25k/$34k/$32k/$44k thresholds are statutorily frozen (never indexed), so
  1984/1993 values are the current values. (They are _not_ 2026-indexed
  constants and the code comment could say so.)
- **Zero-tax bridge year** — explained (see finding A); adjacent years tax
  normally.
- **Trustees haircut** — the default applies 81% payable from 2034; headline
  income would be $19,963/yr higher without it. Conservative by construction.

---

## 6. Defaults feasibility assessment

**The 5% real return is the single most consequential optimistic default.** It
equals the ~100-year historical average for a 60/40 portfolio ("nearly 5% since
1900" — AQR), but every major 2026 forward-looking estimate is lower: Vanguard's
10-year outlook implies ~2–2.5% real for 60/40, AQR says 3.4% real. If the next
decade tracks the CMAs instead of history, the "conservative" 3.5% preset is
closer to a central case than a pessimistic one. Sensitivity is priced in §1: at
4.0% real the steady net drops $7,061/yr and the steady-state portfolio is 26%
smaller — and the plan _still_ never depletes. Recommendation: keep the presets
but relabel honestly ("balanced (historical avg)") and/or add a CMA-anchored
preset; nudge users toward the Monte Carlo view, whose 12% volatility is
actually 1–2.5 points _above_ historical 60/40 — a conservative choice that
partially offsets the optimistic mean.

**Withdrawal rate 4.0% vs Morningstar's 3.9% base case.** Worth reconciling the
citation (the docs cite the Morningstar study; the code ships the classic 4%
rule), but the difference is $673/yr of headline income — cosmetic for outcomes.

**Inflation 2.5%** sits sensibly between the 2.23% 10-year breakeven and the
currently elevated CPI (4.2% headline / 2.9% core, May 2026). Reasonable. Note
the interaction with finding C: the unmodeled DRS COLA cap only bites when
inflation exceeds 3%.

**Spending target.** The default displays 60% total income replacement ($170k ×
~33.2% non-housing + $45.6k rent). With BLS CES showing ~$78.5k average annual
expenditures per consumer unit, a ~$102k initial need (incl. travel) for a $170k
household is on the comfortable side but coherent for the persona's lifestyle
inputs.

**The Austria relocation is priced conservatively in one big way and
optimistically in two smaller ways.** Conservative: the persona keeps paying
$3,800/mo rent — roughly **3× the going rate** for a 3-bedroom in central
Klagenfurt ($1,323/mo on Numbeo, June 2026); real behavior at market rents would
free ~$30k/yr. Optimistic: (a) healthcare at $520/mo per couple pre-65 only
works if one spouse self-insures with ÖGK (€565.25/mo/person in 2026) and the
other is co-insured — two full premiums would be ~$1,290/mo; (b) the +5%
net-of-treaty rate on IRA withdrawals is plausible for modest draws but likely
low at this persona's ~$98k/yr bridge-year draws given Austrian marginal rates
of 48–50% (the in-app "verify with a cross-border specialist" caveat is doing
real work). The treaty _structure_ — DRS pension and Social Security taxable
only by the US, IRA draws residence-taxed — was verified against the treaty text
and is exactly right.

**Synthetic Social Security defaults.** `ssFraA: 50424` belongs to a spouse with
`incomeA: 0`, and `ssFraB: 31592` is within $1 of
`proratedFraEstimate(170000, 22)` — the shipped statement amounts are synthetic
derivations, not real statements. Fine for a demo persona, but the numbers
deserve an in-app nudge that SSA statement values assume _continued earnings
until claiming_ — spouse B stops work at 56 and claims at 65, so even a real
statement printed today would overstate the age-65 benefit somewhat.

**Life model on by default.**
`DEFAULT_LIFE = { on: true, deathAgeA: 95, deathAgeB: 92 }`
(`src/retirementData.js:9`): the default projection already includes A's death
at 95, B's seven survivor years (filing single, keeping the larger SS check),
and simulation end at age 101 — this is why charts end at 101 rather than the 95
"horizon." Reasonable, but worth a visible caption; users comparing against the
horizon setting will find the mismatch confusing.

**Default persona plan health.** See the stress table in §1: never depletes
under any single-assumption correction tested, nor under the stacked pessimistic
rerun, with MC success 95.5%. The pre-pension bridge (ages 65–73, ~$98k/yr
portfolio draws against a $1.1M pool) is the plan's real pressure point — it is
where a bad sequence of returns would bite, which is what the stress toggle and
MC fan are for.

---

## 7. Prioritized correction recommendations

| #   | Finding                            | Recommended fix                                                                                                                     | Effort            | Moves golden pin?               |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------- |
| 0   | T — stale trustees scenario        | update to 83%/2034 per the June 2026 Trustees Report (or expose OASI-alone 78%/2033)                                                | S                 | yes (+$2,106/yr)                |
| 1   | A — untaxed taxable draws          | LTCG brackets + basis-fraction input; interim: disclosure caption                                                                   | M (S for caption) | yes (small for default persona) |
| 2   | E — unprorated PIA fallback        | wire `proratedFraEstimate` + covered-years input into `benefits()`                                                                  | S                 | no (defaults use statement)     |
| 3   | F — household RMD at older age     | per-owner deferred balances and RMD schedules                                                                                       | M                 | yes (tax timing)                |
| 4   | D — free survivor annuity          | apply DRS option factor when `pensionPct > 0`                                                                                       | S                 | no (default elects 0%)          |
| 5   | B — survivor scale on income basis | apply `SINGLE_COST_FACTOR` (or explicit setting) in the income path                                                                 | S                 | yes (survivor years only)       |
| 6   | H — death-year filing              | keep MFJ through the death year                                                                                                     | S                 | yes (late years)                |
| 7   | C — pension COLA cap               | cap at 3%, deflate excess when inflation > 3%                                                                                       | S–M               | no at default inflation         |
| 8   | K — MC fan nulls                   | clip `balanceFan` to the effective simulation end                                                                                   | S                 | no                              |
| 9   | SWR default                        | either adopt the cited 3.9% or cite the 4% rule explicitly                                                                          | S                 | yes ($673/yr)                   |
| 10  | Quality debt                       | finish the Stryker pass (58% → 80%: survivors in `simulate.js`/`plan.js`)                                                           | M                 | no                              |
| 11  | DRS 2027 factors                   | refresh the ERF table Jan 2027 (published: 55=0.4018 … 64=0.9069) and add the annual-refresh note                                   | S                 | yes (from 2027)                 |
| 12  | Assumption labels                  | relabel "balanced 5% real" as historical-average; consider a CMA-anchored preset; cite Morningstar 3.9% or the 4% rule consistently | S                 | no (labels)                     |

Recommendations 2, 4, 5, 6, 8 are safe, small, and independently shippable; 1
and 3 are the two that change the model's tax story and deserve their own
reviewed passes with re-pinned goldens.

---

## 8. What was NOT verified

- The 11 cost-of-living baskets not spot-checked (only Austria + two US anchors
  were), and 12 of the 15 `US_STATE_TAX` effective-rate entries.
- Monte Carlo _statistical_ properties beyond structure (no distribution-fit
  testing of the lognormal sampler).
- Chart rendering fidelity (Recharts layout is untested by design; this audit
  verified the numbers charts consume, not the pixels).
- Long-term-care cost data beyond the national/Hawaii anchors; the LTC module
  itself is off by default.
- Mortgage amortization internals (`housing.js`) beyond confirming P&I is the
  single nominal-deflated flow; guardrails/glidepath math beyond their unit
  tests.
- Anything marked UNVERIFIABLE in §3.
