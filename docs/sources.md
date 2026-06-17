# Sources & References — "The Ledger & the Atlas" Retirement Calculator

> Every public information source consulted while building the current version of the calculator, grouped by topic, with links and short notes on what each informed. Primary/authoritative sources (government agencies, the IRS, SSA, CMS, Austrian federal portals, Washington DRS) are flagged **(primary)**. Secondary sources were used to cross‑check and contextualize.

**Version:** 1.0 · **Reference year:** 2026 · **Companion docs:** PRD; Logic & Use‑Case Specification

---

## Table of Contents

- [1. About This Source List](#1-about-this-source-list)
- [2. Methodology and Source-Quality Notes](#2-methodology-and-source-quality-notes)
- [3. Federal Income Tax (2026)](#3-federal-income-tax-2026)
- [4. Social Security — Benefit Formula and Claiming](#4-social-security--benefit-formula-and-claiming)
- [5. Social Security — Trust-Fund Solvency (2025 Trustees)](#5-social-security--trust-fund-solvency-2025-trustees)
- [6. Retirement Accounts — RMDs and Contribution Limits](#6-retirement-accounts--rmds-and-contribution-limits)
- [7. Safe Withdrawal Rate Research](#7-safe-withdrawal-rate-research)
- [8. Washington State DRS Pensions](#8-washington-state-drs-pensions)
- [9. Healthcare — Medicare 2026 and Pre-65 ACA](#9-healthcare--medicare-2026-and-pre-65-aca)
- [10. Cost of Living — United States](#10-cost-of-living--united-states)
- [11. Cost of Living — Europe](#11-cost-of-living--europe)
- [12. Cost of Living — Caribbean (Bahamas)](#12-cost-of-living--caribbean-bahamas)
- [13. Retiring Abroad and Cross-Border Income Tax](#13-retiring-abroad-and-cross-border-income-tax)
- [14. Inherited Real Estate — United States and Texas](#14-inherited-real-estate--united-states-and-texas)
- [15. Inherited Real Estate — Austria](#15-inherited-real-estate--austria)
- [16. Full URL Index](#16-full-url-index)

---

## 1. About This Source List

These sources informed the 2026 constants and the qualitative notes throughout the calculator: federal tax brackets and deductions, the Social Security benefit formula and the 2025 Trustees solvency projection, the Washington DRS pension rules, Medicare and ACA healthcare costs, international cost‑of‑living figures, and the cross‑border tax treatment of inherited real estate in Texas and Austria.

Where a fact has an authoritative origin (an IRS newsroom release, an SSA press release, a CMS fact sheet, an Austrian federal portal, the Washington Administrative Code), that source is cited as **(primary)** and was treated as definitive. Aggregator and advisory sites were used to locate, cross‑check, and explain those facts; they are listed as supporting context.

---

## 2. Methodology and Source-Quality Notes

- **Tax and benefit constants** were taken from or reconciled against the relevant federal agency (IRS, SSA, CMS) and, for Social Security solvency, the 2025 OASDI Trustees Report and Congressional Research Service summaries.
- **Cost‑of‑living figures** are planning aggregates. No single site is authoritative for a household budget, so the per‑line figures were triangulated across several databases (Numbeo, Wise, Expatistan, ERI, relocate.me, livingcost.org) and framed against national statistics (U.S. BLS Consumer Expenditure Survey; Eurostat price levels). Treat them as directional.
- **Inheritance tax treatment** combines U.S. federal rules (basis step‑up, the $15M estate exemption), Texas state specifics (no estate/inheritance/income tax; high property tax), and Austrian rules (no inheritance tax; transfer tax on inheriting; capital‑gains tax on a later sale with no step‑up). The Austrian capital‑gains outcome depends on the decedent's acquisition date (Altvermögen vs. Neuvermögen) and on currency basis — flagged throughout as requiring a specialist.
- **Recency.** All figures target 2026. Several sources post‑date the 2025 Trustees Report and the 2025 "One Big Beautiful Bill Act," whose effects on tax and Social Security financing are reflected.

---

## 3. Federal Income Tax (2026)

- **[IRS — Tax inflation adjustments for tax year 2026 (incl. One Big Beautiful Bill amendments)](https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill)** **(primary)** — brackets, standard deduction, and inflation‑adjusted thresholds.
- **[Tax Foundation — 2026 federal tax brackets](https://taxfoundation.org/data/all/federal/2026-tax-brackets/)** — consolidated bracket and deduction tables.
- **[Kiplinger — New over‑65 tax deduction change](https://www.kiplinger.com/taxes/new-tax-deduction-change-over-65)** — the temporary senior "bonus" deduction and its phase‑out.
- **[Kiplinger — IRS updates capital‑gains tax thresholds](https://www.kiplinger.com/taxes/irs-updates-capital-gains-tax-thresholds)** — 2026 long‑term capital‑gains brackets.
- **[Boldin — 2026 tax brackets and TCJA expiration](https://www.boldin.com/retirement/2026-tax-brackets-tcja-expiration/)** — context on the post‑TCJA landscape.
- **[Fidelity — Tax brackets](https://www.fidelity.com/learning-center/personal-finance/tax-brackets)**, **[H&R Block — Tax brackets and rates](https://www.hrblock.com/tax-center/irs/tax-brackets-and-rates/what-are-the-tax-brackets/)**, **[U.S. Bank — Tax brackets](https://www.usbank.com/wealth-management/financial-perspectives/financial-planning/tax-brackets.html)** — cross‑checks.
- **[Cornell Law (Wex) — Tax bracket](https://www.law.cornell.edu/wex/tax_bracket)** — definitional reference.
- Capital‑gains 2026 cross‑checks: **[ustax.tools](https://ustax.tools/tax-insights/2026-capital-gains-tax-rate-thresholds/)**, **[Hopkins CPA](https://hopkinscpa.tax/capital-gains-tax-brackets/)**, **[Reed Corp](https://reedcorp.tax/helpful-guides/2026-capital-gains-tax-brackets/)**, **[Tax47](https://tax47.app/blog/capital-gains-tax-rates-2026/)**, **[TaxCalcHub](https://taxcalchub.com/guides/capital-gains/capital-gains-tax-rates-2026/)**.

---

## 4. Social Security — Benefit Formula and Claiming

- **[SSA — Primary Insurance Amount / benefit computation](https://www.ssa.gov/oact/progdata/retirebenefit2.html)** **(primary)** — the bend‑point formula underlying the PIA logic.
- **[Bipartisan Policy Center — Social Security benefit formula](https://bipartisanpolicy.org/explainer/social-security-benefit-formula/)** — clear explainer of bend points and AIME.
- **[Benefora — Social Security bend points explained](https://www.benefora.org/articles/social-security-bend-points-explained)** and **[Motley Fool — Bend points](https://www.fool.com/retirement/social-security/bend-points/)** — 2026 bend‑point values.
- **[EPIC — How is your Social Security benefit calculated](https://epicforamerica.org/education-workforce-retirement/epic-explainer-how-is-your-social-security-benefit-calculated/)** — formula walkthrough.
- **[J. Davenport — Full Retirement Age 2026](https://jdavenportassociates.com/social-security-full-retirement-age-2026-what-it-means-for-you/)** — FRA = 67 confirmation.
- **[MaximizeMySocialSecurity — Benefits by age, when to claim in 2026](https://www.maximizemysocialsecurity.com/blog/social-security-benefits-by-age-when-to-claim-in-2026)** — early/delayed claiming factors.
- **[Greenbush Financial — Claiming strategies, early vs. delayed](https://www.greenbushfinancial.com/all-blogs/social-security-claiming-strategies-early-vs-delayed-benefits)** — delayed‑retirement credits.
- **[GOBankingRates — Claiming at 62 vs. 70 in 2026](https://www.gobankingrates.com/retirement/social-security/social-security-recipients-will-lose-this-much-by-claiming-at-62-instead-of-70-in-2026/)** — magnitude of the claim‑age trade‑off.
- **[Kiplinger — Changes coming to Social Security in 2026](https://www.kiplinger.com/retirement/social-security/changes-coming-to-social-security-in-2026)** — wage cap and COLA context.
- **[Congressional Research Service — Social Security Primer (RL34498)](https://www.congress.gov/crs-product/RL34498)** **(primary)** — program mechanics, plus related CRS products **[IF11747](https://www.congress.gov/crs-product/IF11747)** and **[R46658](https://www.congress.gov/crs-product/R46658)**.
- **[Greenback — U.S. expat taxes and Social Security](https://www.greenbacktaxservices.com/knowledge-center/us-expat-taxes-social-security/)** — treatment of benefits for retirees abroad; WEP/GPO repeal context.

---

## 5. Social Security — Trust-Fund Solvency (2025 Trustees)

- **[SSA — 2025 Trustees Report press release (June 18, 2025)](https://www.ssa.gov/news/en/press/releases/2025-06-18.html)** **(primary)** — combined funds depleted 2034 with 81% payable; OASI alone 2033 with 77% payable.
- **[SSA — 2025 OASDI Trustees Report](https://www.ssa.gov/oact/TR/2025/)** **(primary)** — the full report.
- **[Congressional Research Service — Selected findings of the 2025 report (IF13045)](https://www.congress.gov/crs-product/IF13045)** **(primary)** — depletion date and payable‑percentage trajectory (81% in 2034 → ~72% by 2099).
- **[Bipartisan Policy Center — 2025 Trustees Report explained](https://bipartisanpolicy.org/article/2025-social-security-trustees-report-explained/)** — ~23% cut absent action; OBBBA's effect on the date.
- **[Center on Budget and Policy Priorities — What the 2025 Trustees Report shows](https://www.cbpp.org/research/social-security/what-the-2025-trustees-report-shows-about-social-security)** — reallocation options and historical precedent.
- **[American Academy of Actuaries — Highlights of the 2025 Trustees Report](https://actuary.org/wp-content/uploads/2025/12/retirement-paper-SSTrustees120425.pdf)** — actuarial framing of solvency.
- **[NOSSCR — 2025 OASDI Trustees Report](https://nosscr.org/article/2025-oasdi-trustees-report/)** — summary of key dates and reactions.
- **[ASPPA — Depletion date moved up (2026 update)](https://www.asppa-net.org/news/2026/6/social-security-depletion-date-moved-up-trustees-report/)** — later commentary on the worsening actuarial deficit.

---

## 6. Retirement Accounts — RMDs and Contribution Limits

- **[IRS — 401(k) limit increases to $24,500 for 2026; IRA to $7,500](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500)** **(primary)** — 2026 contribution limits.
- **[IRS — Retirement topics: catch‑up contributions](https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions)** **(primary)** — catch‑up rules.
- **[RetireHub — Your RMD at 73: the 2026 rules](https://retirehub.org/silver-and-cents/2026-05-20/your-rmd-at-73-the-2026-rules-rewritten/)** — RMD ages (73/75) used in the assumptions discussion.
- **[Instead — RMDs' impact on tax brackets and Medicare premiums](https://www.instead.com/resources/blog/rmds-impact-on-tax-brackets-and-medicare-premiums)** — interaction context.
- **[Schwab — Catch‑up contributions](https://www.schwab.com/learn/story/what-to-know-about-catch-up-contributions)**, **[Mercer Advisors — 2026 contribution limits and catch‑up rules](https://www.merceradvisors.com/retirement/2026-retirement-plan-contribution-limits-and-catch-up-rules/)** — cross‑checks.

---

## 7. Safe Withdrawal Rate Research

- **[Morningstar — What's a safe retirement withdrawal rate for 2026](https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026)** — the 2026 base‑case rate (3.9%).
- **[Morningstar — What your retirement spending rate should be (2026)](https://www.morningstar.com/retirement/heres-what-your-retirement-spending-rate-should-be-2026)** and **[Morningstar — Finding your safe withdrawal rate](https://www.morningstar.com/retirement/morningstars-retirement-income-research-finding-your-safe-withdrawal-rate)** — flexible/guardrail rates up to 5.7%.
- **[Financial Advisor Magazine — Morningstar's 2026 SWR is 3.9%](https://www.fa-mag.com/news/morningstar-safe-retirement-withdrawal-rate-for-2026-is-3-9-85940.html)** — confirmation of the headline figure.
- **[Boldin — Safe withdrawal rate (Morningstar)](https://www.boldin.com/retirement/safe-withdrawal-rate-morningstar/)**, **[Keil FP — Morningstar safe withdrawal rate](https://keilfp.com/blogpodcast/morningstar-safe-withdrawal-rate/)** — context.
- **[Motley Fool — Is 4% a safe withdrawal rate in 2026](https://www.fool.com/retirement/2025/12/10/is-4-a-safe-withdrawal-rate-in-2026-heres)** — the classic 4% comparison.

---

## 8. Washington State DRS Pensions

- **[Washington DRS — TRS Plan 2](https://www.drs.wa.gov/plan/trs2/)** **(primary)** — 2% multiplier, AFC definition, retirement eligibility.
- **[Washington DRS — TRS Plan 3](https://www.drs.wa.gov/plan/trs3/)** **(primary)** — 1% defined‑benefit multiplier plus the separate defined‑contribution account.
- **[Washington DRS — SERS Plan 2](https://www.drs.wa.gov/plan/sers2/)** **(primary)** — school‑employee equivalent formula.
- **[Washington DRS — TRS Plan 1](https://www.drs.wa.gov/plan/trs1/)**, **[PERS Plan 2](https://www.drs.wa.gov/plan/pers2/)**, **[PERS Plan 3](https://www.drs.wa.gov/plan/pers3/)**, **[PSERS Plan 2](https://www.drs.wa.gov/plan/psers2/)** **(primary)** — related plan rules cross‑referenced for the shared formula.
- **[Washington DRS — Plan 2 vs Plan 3 choice](https://www.drs.wa.gov/choice/)** **(primary)** — plan structure comparison.
- **[Washington DRS — Administrative / early‑retirement factors](https://www.drs.wa.gov/sitemap/adminfactors/)** **(primary)** — the early‑retirement factor (ERF) tables.
- **[Washington Administrative Code 415‑02‑320 (early‑retirement factors)](https://app.leg.wa.gov/wac/default.aspx?cite=415-02-320)** **(primary)** — the legal ERF schedule.
- **[Washington State Auditor — Note X, state‑sponsored DRS pension plans](https://sao.wa.gov/bars-annual-filing/bars-gaap-manual/reporting/notes-financial-statements/note-x-pensions-state-sponsored-drs-plans)** **(primary)** — plan accounting context.

---

## 9. Healthcare — Medicare 2026 and Pre-65 ACA

- **[CMS — 2026 Medicare Parts B premiums and deductibles (fact sheet)](https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-and-deductibles)** **(primary)** — standard Part B premium $202.90/mo, deductible $283.
- **[Federal Register — Medicare Part B premium rates beginning Jan 1, 2026](https://www.federalregister.gov/documents/2025/11/19/2025-20251/medicare-program-medicare-part-b-monthly-actuarial-rates-premium-rates-and-annual-deductible)** **(primary)** — the official rate notice.
- **[Medicare Rights Center — 2026 Medicare premiums announced](https://www.medicarerights.org/medicare-watch/2025/11/20/2026-medicare-premiums-announced-last-weeks-of-open-enrollment)** — Part A/B/D 2026 figures.
- **[U.S. Railroad Retirement Board — Medicare Part B premiums 2026](https://www.rrb.gov/Newsroom/NewsReleases/MedicarePartBPremium)** — corroborating the Part B figure and IRMAA ranges.
- **[Medicare.gov — Medicare costs](https://www.medicare.gov/basics/costs/medicare-costs)** **(primary)** — Part A/B/D, Medigap context.
- **[KFF — Health Insurance Marketplace Calculator](https://www.kff.org/interactive/subsidy-calculator/)** **(primary)** — pre‑65 ACA premium estimates by age (benchmark Silver ~$1,400/person at 62–64) and subsidy logic.
- **[KFF — Affordable Care Act resources](https://www.kff.org/affordable-care-act/)** **(primary)** — age‑rating and marketplace context for the pre‑65 bridge.

---

## 10. Cost of Living — United States

- **[U.S. Bureau of Labor Statistics — Consumer Expenditure Survey](https://www.bls.gov/cex/)** **(primary)** — household spending baselines.
- **[World Population Review — Cost of living index by state](https://worldpopulationreview.com/state-rankings/cost-of-living-index-by-state)** — state cost tiers.
- **[Patriot Software — Average cost of living by state](https://www.patriotsoftware.com/blog/accounting/average-cost-living-by-state/)** — state line‑item context.
- **[Visual Capitalist — Annual retirement costs by state](https://www.visualcapitalist.com/mapped-annual-retirement-costs-by-state/)** — retirement‑specific cost mapping.
- **[costliving.net — USA 2026](https://costliving.net/insights/usa-2026/)** — 2026 U.S. cost snapshot.
- **[SeniorLiving.org — Independent living costs](https://www.seniorliving.org/independent-living/costs/)** and **[A Place for Mom — Cost of assisted living](https://www.aplaceformom.com/caregiver-resources/articles/cost-of-assisted-living)** — later‑life housing/care context.

---

## 11. Cost of Living — Europe

- **[Numbeo — Cost of living database](https://www.numbeo.com/cost-of-living/)** — primary aggregator; city pages used include **[Vienna](https://www.numbeo.com/cost-of-living/in/Vienna)** and **[Lisbon](https://www.numbeo.com/cost-of-living/in/Lisbon)**, plus **[Austria country result](https://www.numbeo.com/cost-of-living/country_result.jsp?country=Austria)**.
- **[Wise — Cost of living: Vienna](https://wise.com/gb/cost-of-living/austria/vienna)** and **[Lisbon](https://wise.com/gb/cost-of-living/portugal/lisbon)** — line‑item cross‑checks.
- **[Eurostat](https://ec.europa.eu/eurostat)** **(primary)** — comparative price levels and HICP framing.
- **[Expatica — Cost of living in Austria](https://www.expatica.com/at/moving/about/cost-of-living-in-austria-89352/)**, **[Instarem — Cost of living in Austria](https://www.instarem.com/blog/cost-of-living-in-austria/)** — Austria detail (relevant to Klagenfurt).
- **[relocate.me — Austria](https://relocate.me/cost-of-living/austria)**, **[Vienna](https://relocate.me/cost-of-living/austria/vienna)**, **[Lisbon](https://relocate.me/cost-of-living/portugal/lisbon)** — expat budgets.
- **[Global Citizen Solutions — Cost of living in Lisbon](https://www.globalcitizensolutions.com/cost-of-living-in-lisbon/)** — Portugal detail and D7 context.
- **[Pararius — Cost of living in the Netherlands](https://www.pararius.com/expat-guide/cost-of-living-netherlands)** — Netherlands housing/insurance.
- Retire‑in‑Europe overviews: **[Get Golden Visa](https://getgoldenvisa.com/best-places-to-retire-in-europe)**, **[Mandracchio Capital — Cheapest places to retire in Europe](https://mandracchio-capital.com/cheapest-places-to-retire-in-europe/)**, **[April International — Best countries to retire](https://www.april-international.com/en/long-term-international-health-insurance/guide/best-countries-to-retire)**, **[Global Citizen Solutions — Best places to retire in Europe](https://www.globalcitizensolutions.com/best-places-to-retire-in-europe/)**.

---

## 12. Cost of Living — Caribbean (Bahamas)

- **[ERI (Economic Research Institute) — Nassau cost of living](https://www.erieri.com/cost-of-living/bahamas/nassau)** — salary/cost database figures.
- **[Expatistan — Bahamas cost of living](https://www.expatistan.com/cost-of-living/country/bahamas)** — line‑item cross‑check.
- **[livingcost.org — Nassau](https://livingcost.org/cost/bahamas/nassau)** and **[SalaryExpert — Nassau](https://www.salaryexpert.com/cost-of-living/bahamas/nassau)** — additional estimates.
- **[Expat Exchange — Cost of living in Nassau](https://www.expatexchange.com/ctryguide/6842/18/Bahamas/Cost-of-Living-in-Nassau-Cost-of-Living-in-Nassau)** — expat context and import‑cost notes.
- **[Kiplinger — Retire in the Bahamas with tax benefits](https://www.kiplinger.com/taxes/retire-in-the-bahamas-with-tax-benefits)** — zero income/capital‑gains/estate tax framing.
- **[Pitt Property Group — Bahamas tax residency](https://www.pittpropertygroup.com/bahamas-tax-residency/)** — residency/permit context.

---

## 13. Retiring Abroad and Cross-Border Income Tax

- **[Greenback — Retire abroad tax planning](https://www.greenbacktaxservices.com/knowledge-center/retire-abroad-tax-planning/)** — worldwide taxation, foreign tax credit basics.
- **[Greenback — Foreign pensions and U.S. taxation](https://www.greenbacktaxservices.com/knowledge-center/foreign-pensions-treatment-us-taxation/)** — treaty interactions for pensions.
- **[PBMares — U.S. tax implications of retiring abroad](https://www.pbmares.com/us-tax-implications-of-retiring-abroad-what-you-need-to-know/)** — compliance overview.
- **[TaxesForExpats — Top tax‑friendly countries to retire](https://www.taxesforexpats.com/articles/retirement/top-tax-friendly-countries-to-retire.html)** — country regime comparisons (Greece 7%, Portugal, etc.).
- **[ClearedExpat — Expat taxes for retirees](https://www.clearedexpat.com/guides/expat-taxes-for-retirees/)** and **[CountryTaxCalc — Expat retirement tax guide 2026](https://www.countrytaxcalc.com/tax-guides/international/expat-retirement-tax-guide-2026/)** — destination tax notes.
- **[TaxRatesByCountry — Austria](https://taxratesbycountry.com/tax-rates-in-austria/)** — Austrian income‑tax brackets for the worldwide‑taxation note.

---

## 14. Inherited Real Estate — United States and Texas

- **[IRS — Estate tax](https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax)** **(primary)** — federal estate‑tax mechanics and the exemption framework.
- **[Guardian — Estate tax for noncitizens / $15M 2026 exemption](https://www.guardianlife.com/individuals-families/life-insurance/foreign-nationals/estate-tax)** — 2026 exemption ($15M/person, $30M couple), 40% top rate.
- **[Guardian — Foreign nationals and U.S. real‑estate tax](https://www.guardianlife.com/individuals-families/life-insurance/foreign-nationals/real-estate-tax)** — state property‑tax rate ranges.
- **[Taxo — Estate and inheritance tax guide](https://taxo.com/estate-inheritance-tax-guide/)** — the basis step‑up worked through ($0 gain on near‑term sale).
- **[Millan CPA — 2026 estate planning: exemptions and gifting](https://millancpa.com/insights/2026-estate-tax-planning-exemptions-gifting-strategies)** — OBBBA permanence of the $15M exemption; step‑up caveats.
- **[Grogan Law (Texas) — Inheritance tax in Texas 2026](https://groganlawtexas.com/blog/inheritance-tax-in-texas-what-heirs-actually-owe-in-2026/)** — Texas has no inheritance tax (repealed 2015); sell‑quickly guidance.
- **[Dickey Law Group — Does Texas have estate tax (2026)](https://dickeylawgroup.com/blog/does-texas-have-estate-tax)** — no Texas estate tax; federal thresholds.
- **[BrightTax — Foreign inheritance tax / Form 3520](https://brighttax.com/blog/foreign-inheritance-tax/)** — step‑up for foreign property, Form 3520 (>$100k), FBAR/FATCA.
- **[TaxesForExpats — Capital‑gains tax on foreign property](https://www.taxesforexpats.com/articles/real-estate/capital-gains-tax-on-foreign-property.html)** — currency‑basis effects; saving clause and foreign tax credit.

---

## 15. Inherited Real Estate — Austria

- **[USP.gv.at (Austrian Business Service Portal) — Real estate transfer tax (Grunderwerbsteuer)](https://www.usp.gv.at/en/themen/steuern-finanzen/weitere-steuern-und-abgaben/grunderwerbsteuer.html)** **(primary)** — transfer tax applies to inheritance; graduated gratuitous rates.
- **[RSM Austria — Sale and transfer of Austrian real estate](https://www.rsm.global/austria/en/insights/sector-insights/sale-transfer-austrian-real-estate)** — transfer‑tax rates (0.5%–3.5%) and the 30% / 4.2% (pre‑2002) capital‑gains regime.
- **[Harlander & Partner — Inheritance tax in Austria 2026](https://harlander-partner.eu/en/inheritance-tax-in-austria-2026/)** — no inheritance/gift tax since 2008; transfer tax + registration on inheriting.
- **[Harlander & Partner — Real‑estate income tax on inheritance (ImmoESt)](https://harlander-partner.eu/en/inheritance-law-estate-planning/real-estate-income-tax-in-the-event-of-inheritance/)** — ImmoESt arises only on a later sale.
- **[finanz.at — Inheritance tax in Austria](https://www.finanz.at/en/taxes/inheritance-tax/)** — abolition history and the property‑transfer‑tax substitute.
- **[International Bar Association — Austria estate‑planning guide](https://www.ibanet.org/document?id=international-planning-estate-guides-Austria)** — Grundstückswert (property‑value) basis for the transfer tax.
- **[Vigoimmobilien — Taxes on buying and selling real estate in Austria 2026](https://vigoimmobilien.at/en/taxes-buying-selling-real-estate-austria)** — worked examples of transfer tax and ImmoESt, plus selling costs.
- **[Vienna Property — Property taxes in Austria (5‑of‑10‑years rule)](https://vienna-property.com/en/nalogi-na-nedvizhimost-v-avstrii-polnaya-instrukciya/)** — primary‑residence exemption from ImmoESt.
- **[kroy‑immobilien — Inherit or bequeath real estate in Austria 2026](https://www.kroy-immobilien.at/en/wohnen/immobilie-erben-oder-vererben-oesterreich/)** — succession, mandatory portions, no inheritance tax.

---

## 16. Full URL Index

> A flat, alphabetized list of every content source above, for archival and link‑checking. Asset/CDN/favicon URLs are excluded.

**Government and primary sources**

- https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
- https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
- https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions
- https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax
- https://www.ssa.gov/oact/progdata/retirebenefit2.html
- https://www.ssa.gov/news/en/press/releases/2025-06-18.html
- https://www.ssa.gov/oact/TR/2025/
- https://www.congress.gov/crs-product/IF13045
- https://www.congress.gov/crs-product/RL34498
- https://www.congress.gov/crs-product/IF11747
- https://www.congress.gov/crs-product/R46658
- https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-and-deductibles
- https://www.federalregister.gov/documents/2025/11/19/2025-20251/medicare-program-medicare-part-b-monthly-actuarial-rates-premium-rates-and-annual-deductible
- https://www.medicare.gov/basics/costs/medicare-costs
- https://www.rrb.gov/Newsroom/NewsReleases/MedicarePartBPremium
- https://www.kff.org/interactive/subsidy-calculator/
- https://www.kff.org/affordable-care-act/
- https://www.bls.gov/cex/
- https://ec.europa.eu/eurostat
- https://www.drs.wa.gov/plan/trs2/
- https://www.drs.wa.gov/plan/trs3/
- https://www.drs.wa.gov/plan/trs1/
- https://www.drs.wa.gov/plan/sers2/
- https://www.drs.wa.gov/plan/pers2/
- https://www.drs.wa.gov/plan/pers3/
- https://www.drs.wa.gov/plan/psers2/
- https://www.drs.wa.gov/choice/
- https://www.drs.wa.gov/sitemap/adminfactors/
- https://app.leg.wa.gov/wac/default.aspx?cite=415-02-320
- https://sao.wa.gov/bars-annual-filing/bars-gaap-manual/reporting/notes-financial-statements/note-x-pensions-state-sponsored-drs-plans
- https://www.usp.gv.at/en/themen/steuern-finanzen/weitere-steuern-und-abgaben/grunderwerbsteuer.html

**Tax, Social Security, and retirement (secondary)**

- https://taxfoundation.org/data/all/federal/2026-tax-brackets/
- https://www.kiplinger.com/taxes/new-tax-deduction-change-over-65
- https://www.kiplinger.com/taxes/irs-updates-capital-gains-tax-thresholds
- https://www.kiplinger.com/retirement/social-security/changes-coming-to-social-security-in-2026
- https://www.boldin.com/retirement/2026-tax-brackets-tcja-expiration/
- https://www.fidelity.com/learning-center/personal-finance/tax-brackets
- https://www.hrblock.com/tax-center/irs/tax-brackets-and-rates/what-are-the-tax-brackets/
- https://www.usbank.com/wealth-management/financial-perspectives/financial-planning/tax-brackets.html
- https://www.law.cornell.edu/wex/tax_bracket
- https://ustax.tools/tax-insights/2026-capital-gains-tax-rate-thresholds/
- https://hopkinscpa.tax/capital-gains-tax-brackets/
- https://reedcorp.tax/helpful-guides/2026-capital-gains-tax-brackets/
- https://tax47.app/blog/capital-gains-tax-rates-2026/
- https://taxcalchub.com/guides/capital-gains/capital-gains-tax-rates-2026/
- https://bipartisanpolicy.org/explainer/social-security-benefit-formula/
- https://www.benefora.org/articles/social-security-bend-points-explained
- https://www.fool.com/retirement/social-security/bend-points/
- https://epicforamerica.org/education-workforce-retirement/epic-explainer-how-is-your-social-security-benefit-calculated/
- https://jdavenportassociates.com/social-security-full-retirement-age-2026-what-it-means-for-you/
- https://www.maximizemysocialsecurity.com/blog/social-security-benefits-by-age-when-to-claim-in-2026
- https://www.greenbushfinancial.com/all-blogs/social-security-claiming-strategies-early-vs-delayed-benefits
- https://www.gobankingrates.com/retirement/social-security/social-security-recipients-will-lose-this-much-by-claiming-at-62-instead-of-70-in-2026/
- https://bipartisanpolicy.org/article/2025-social-security-trustees-report-explained/
- https://www.cbpp.org/research/social-security/what-the-2025-trustees-report-shows-about-social-security
- https://actuary.org/wp-content/uploads/2025/12/retirement-paper-SSTrustees120425.pdf
- https://nosscr.org/article/2025-oasdi-trustees-report/
- https://www.asppa-net.org/news/2026/6/social-security-depletion-date-moved-up-trustees-report/
- https://retirehub.org/silver-and-cents/2026-05-20/your-rmd-at-73-the-2026-rules-rewritten/
- https://www.instead.com/resources/blog/rmds-impact-on-tax-brackets-and-medicare-premiums
- https://www.schwab.com/learn/story/what-to-know-about-catch-up-contributions
- https://www.merceradvisors.com/retirement/2026-retirement-plan-contribution-limits-and-catch-up-rules/
- https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026
- https://www.morningstar.com/retirement/heres-what-your-retirement-spending-rate-should-be-2026
- https://www.morningstar.com/retirement/morningstars-retirement-income-research-finding-your-safe-withdrawal-rate
- https://www.fa-mag.com/news/morningstar-safe-retirement-withdrawal-rate-for-2026-is-3-9-85940.html
- https://www.boldin.com/retirement/safe-withdrawal-rate-morningstar/
- https://keilfp.com/blogpodcast/morningstar-safe-withdrawal-rate/
- https://www.fool.com/retirement/2025/12/10/is-4-a-safe-withdrawal-rate-in-2026-heres
- https://www.medicarerights.org/medicare-watch/2025/11/20/2026-medicare-premiums-announced-last-weeks-of-open-enrollment

**Cost of living and retiring abroad (secondary)**

- https://worldpopulationreview.com/state-rankings/cost-of-living-index-by-state
- https://www.patriotsoftware.com/blog/accounting/average-cost-living-by-state/
- https://www.visualcapitalist.com/mapped-annual-retirement-costs-by-state/
- https://costliving.net/insights/usa-2026/
- https://www.seniorliving.org/independent-living/costs/
- https://www.aplaceformom.com/caregiver-resources/articles/cost-of-assisted-living
- https://www.numbeo.com/cost-of-living/
- https://www.numbeo.com/cost-of-living/in/Vienna
- https://www.numbeo.com/cost-of-living/in/Lisbon
- https://www.numbeo.com/cost-of-living/country_result.jsp?country=Austria
- https://wise.com/gb/cost-of-living/austria/vienna
- https://wise.com/gb/cost-of-living/portugal/lisbon
- https://www.expatica.com/at/moving/about/cost-of-living-in-austria-89352/
- https://www.instarem.com/blog/cost-of-living-in-austria/
- https://relocate.me/cost-of-living/austria
- https://relocate.me/cost-of-living/austria/vienna
- https://relocate.me/cost-of-living/portugal/lisbon
- https://www.globalcitizensolutions.com/cost-of-living-in-lisbon/
- https://www.globalcitizensolutions.com/best-places-to-retire-in-europe/
- https://www.pararius.com/expat-guide/cost-of-living-netherlands
- https://getgoldenvisa.com/best-places-to-retire-in-europe
- https://mandracchio-capital.com/cheapest-places-to-retire-in-europe/
- https://www.april-international.com/en/long-term-international-health-insurance/guide/best-countries-to-retire
- https://www.erieri.com/cost-of-living/bahamas/nassau
- https://www.expatistan.com/cost-of-living/country/bahamas
- https://livingcost.org/cost/bahamas/nassau
- https://www.salaryexpert.com/cost-of-living/bahamas/nassau
- https://www.expatexchange.com/ctryguide/6842/18/Bahamas/Cost-of-Living-in-Nassau-Cost-of-Living-in-Nassau
- https://www.kiplinger.com/taxes/retire-in-the-bahamas-with-tax-benefits
- https://www.pittpropertygroup.com/bahamas-tax-residency/
- https://www.greenbacktaxservices.com/knowledge-center/retire-abroad-tax-planning/
- https://www.greenbacktaxservices.com/knowledge-center/foreign-pensions-treatment-us-taxation/
- https://www.greenbacktaxservices.com/knowledge-center/us-expat-taxes-social-security/
- https://www.pbmares.com/us-tax-implications-of-retiring-abroad-what-you-need-to-know/
- https://www.taxesforexpats.com/articles/retirement/top-tax-friendly-countries-to-retire.html
- https://www.clearedexpat.com/guides/expat-taxes-for-retirees/
- https://www.countrytaxcalc.com/tax-guides/international/expat-retirement-tax-guide-2026/
- https://taxratesbycountry.com/tax-rates-in-austria/

**Inheritance — US/Texas and Austria (secondary)**

- https://www.guardianlife.com/individuals-families/life-insurance/foreign-nationals/estate-tax
- https://www.guardianlife.com/individuals-families/life-insurance/foreign-nationals/real-estate-tax
- https://taxo.com/estate-inheritance-tax-guide/
- https://millancpa.com/insights/2026-estate-tax-planning-exemptions-gifting-strategies
- https://groganlawtexas.com/blog/inheritance-tax-in-texas-what-heirs-actually-owe-in-2026/
- https://dickeylawgroup.com/blog/does-texas-have-estate-tax
- https://brighttax.com/blog/foreign-inheritance-tax/
- https://www.taxesforexpats.com/articles/real-estate/capital-gains-tax-on-foreign-property.html
- https://www.rsm.global/austria/en/insights/sector-insights/sale-transfer-austrian-real-estate
- https://harlander-partner.eu/en/inheritance-tax-in-austria-2026/
- https://harlander-partner.eu/en/inheritance-law-estate-planning/real-estate-income-tax-in-the-event-of-inheritance/
- https://www.finanz.at/en/taxes/inheritance-tax/
- https://www.ibanet.org/document?id=international-planning-estate-guides-Austria
- https://vigoimmobilien.at/en/taxes-buying-selling-real-estate-austria
- https://vienna-property.com/en/nalogi-na-nedvizhimost-v-avstrii-polnaya-instrukciya/
- https://www.kroy-immobilien.at/en/wohnen/immobilie-erben-oder-vererben-oesterreich/

---

*Compiled for the current build of the calculator. Cost‑of‑living and tax figures are planning estimates aggregated from the sources above; confirm Social Security with your SSA statement, the pension with a Washington DRS estimate, and all cross‑border tax questions with a qualified specialist before acting.*
