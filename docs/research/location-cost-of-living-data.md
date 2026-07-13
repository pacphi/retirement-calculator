# Location Cost-of-Living Data — Sourced Research Brief

**Status:** Research brief for autopilot pipeline `pension-location-data`, phase 1.
**Date:** 2026-07-13
**Purpose:** Cited data for every new international location this effort adds to `src/retirementData.js`'s `LOCATIONS` array (currently 9 US + 8 Western-Europe/Bahamas entries), anchored to major cities, so phases 4-6 can transcribe cost baskets and tax/visa notes without re-researching them. Every fact carries a source URL and a verification method (WebFetch-confirmed vs. search-corroborated).

**Cost-basket shape** matches the existing `LOCATIONS[].m` schema: `{rent, groceries, utilities, transport, dining, entertainment, misc}`, monthly USD for a couple. Suggested `addlTaxRate`, `hcPre`/`hcPost`, and `ltcAnnual` values are planning-grade estimates, not modeled bracket calculations — every one should carry the app's existing "planning-grade, not advice-grade" disclaimer, the same as current entries (e.g. Austria's ImmoESt caveat).

**Exchange rates used** (spot, ~2026-07-13): MXN 17.5, CRC 455, ZAR 16.42, COP ~3,250 (⚠ volatile — was 3,800 two months prior), JPY 161, AUD→USD 0.695, NZD→USD 0.567, UYU→USD 0.0254, THB 33, VND 26,000, MYR 4.07, PHP 57. Panama uses USD natively (1:1 peg). Source: Federal Reserve H.10, Trading Economics, Wise, exchangerates.org.uk.

---

## 1. Mexico

**Country-wide:** VAT (IVA) 16%. [Rydoo: VAT Rates Mexico](https://www.rydoo.com/compliance/mexico/vat-rates-mexico/) — search-corroborated.
**Tax treatment:** Mexico taxes residents on worldwide income in principle; the US–Mexico treaty (1994) reserves Social Security taxation to the US. Private pensions / IRA / 401(k) distributions are, under Treaty Art. 18, taxable in the country of residence for a Mexican *tax resident* — holding a residency visa is not the same as being a tax resident. Enforcement on IRA distributions is genuinely ambiguous across sources; treat `addlTaxRate` as a modeling assumption (suggested 0.02–0.05), not a hard rule. [Taxes for Expats: Mexico](https://www.taxesforexpats.com/country-guides/mexico/us-tax-preparation-in-mexico.html) · [LegalClarity: Does Mexico Tax Retirement Income from the US?](https://legalclarity.org/does-mexico-tax-retirement-income-from-the-us/)
**Retiree visa:** No dedicated pensionado program — retirees use the **Residente Temporal** visa. 2026 income threshold widely reported at ≈$4,400/month (high end; consulate-to-consulate variance is large, some cite $1,500–3,000), or ~$74,000 in savings. [Mexperience: Financial Criteria for Residency](https://www.mexperience.com/financial-criteria-for-residency-in-mexico/) · [ExpatDen: Mexico Residency Income Requirements 2026](https://www.expatden.com/mexico/mexico-residency-income-requirements-in-2026-what-changed-and-what-it-means-for-you/)
**Healthcare:** IMSS voluntary enrollment (ages 60-79) ≈$92-96/month; private expat insurance ≈$225-670/month. [ExpatDen: Health Insurance for Retirees](https://www.expatden.com/mexico/health-insurance-for-retirees-in-mexico/)

### Lake Chapala / Ajijic (largest US retiree colony) — low contributor count, indicative only

Monthly USD couple basket: rent 1BR centre $878 / outside $662, 3BR centre $1,554 / outside $1,280; utilities $58; dining inexpensive meal $10, mid-range for two $46. [Numbeo: Ajijic](https://www.numbeo.com/cost-of-living/in/Ajijic) — WebFetch-verified.

### Mexico City (contrast — larger, pricier)

Monthly USD couple basket: rent 1BR centre $1,129 / outside $725, 3BR centre $2,528 / outside $1,305; utilities $64; transport pass $21; dining inexpensive $12, mid-range for two $51. [Numbeo: Mexico City](https://www.numbeo.com/cost-of-living/in/Mexico-City) — WebFetch-verified.

---

## 2. Panama

**Country-wide:** VAT (ITBMS) 7% (10% alcohol/hotels, 15% tobacco). [PwC: Panama Other Taxes](https://taxsummaries.pwc.com/panama/corporate/other-taxes)
**Tax treatment:** Pure territorial system — foreign-source income (US Social Security, pensions, 401(k)/IRA distributions, dividends, capital gains) is **100% exempt** from Panamanian tax for residents and Pensionado holders alike. No US–Panama tax treaty (irrelevant — territorial exemption makes one unnecessary). `addlTaxRate` ≈ 0 is defensible. [Country Tax Calc: Panama Tax Guide 2026](https://www.countrytaxcalc.com/tax-guides/usa/moving-to-panama-tax-guide-2026/) · [ExpatDen: Panama Taxes for Expats](https://www.expatden.com/panama/panama-taxes-for-expats/)
**Retiree visa:** **Pensionado visa** — minimum $1,000/month lifetime pension ($1,250 couple on one income, +$250/dependent), reduced to $750/mo with >$100,000 in Panama real estate. Must be a guaranteed government/corporate pension (investment income doesn't qualify). Confers Law 6 discounts (25%+ off many services). [Global Citizen Solutions: Pensionado Visa Panama](https://www.globalcitizensolutions.com/pensionado-visa-panama/) · [Embassy of Panama: Retire in Panama](https://www.embassyofpanama.org/retire-in-panama)
**Healthcare:** local private insurance ≈$50-125/month; pensionados get 15-25% discounts under Law 6. [Expat Financial: Panama Healthcare](https://expatfinancial.com/healthcare-information-by-region/central-america-healthcare-system/panama-healthcare-system/)

### Panama City

Monthly USD couple basket (native USD, no conversion): rent 1BR centre $1,270 / outside $913, 3BR centre $2,038 / outside $1,468; utilities $131; transport pass $21; dining inexpensive $10, mid-range for two $50. [Numbeo: Panama City](https://www.numbeo.com/cost-of-living/in/Panama-City) — WebFetch-verified.

### Boquete (mountain retiree hub) — low contributor count, indicative

Monthly USD couple basket: rent 1BR centre $825 / outside $700, 3BR centre $1,567 / outside $1,300; utilities $58; transport pass $25; dining inexpensive $6.50, mid-range for two $40. [Numbeo: Boquete](https://www.numbeo.com/cost-of-living/in/Boquete) — WebFetch-verified.

---

## 3. Costa Rica

**Country-wide:** VAT (IVA) 13% general (reduced 1-4% for health/education/basics). [PwC: Costa Rica Other Taxes](https://taxsummaries.pwc.com/costa-rica/individual/other-taxes)
**Tax treatment:** Territorial system — foreign-source income (US Social Security, IRA/401(k), pensions, dividends, interest) fully exempt regardless of amount or residency status. `addlTaxRate` ≈ 0 defensible. [Country Tax Calc: Costa Rica Tax Guide 2026](https://www.countrytaxcalc.com/tax-guides/usa/moving-to-costa-rica-tax-guide-2026/)
**Retiree visa:** **Pensionado visa** — minimum $1,000/month lifetime pension (one $1,000 stream covers a couple); 2-yr temporary residency → permanent after 3 years. **Flag:** government is actively discussing raising this threshold "substantially" — treat as at-risk of change. [Fragomen: Costa Rica Retirement Visa](https://www.fragomen.com/insights/costa-rica-retirement-visa-pensionado.html) · [ExpatDen: Costa Rica Retirement Visa](https://www.expatden.com/costa-rica/costa-rica-retirement-visa/)
**Healthcare:** CAJA public system ≈$40-80/month; private insurance adds ≈$100-250/month (up to $1,000/mo for top international plans). [International Insurance: Costa Rica](https://www.internationalinsurance.com/countries/costa-rica/health-insurance/)

### San José / Central Valley

Monthly USD couple basket: rent 1BR centre $944 / outside $760, 3BR centre $1,873 / outside $1,298; utilities $98; transport pass $66; dining inexpensive $12, mid-range for two $49. [Numbeo: San José](https://www.numbeo.com/cost-of-living/in/San-Jose-Costa-Rica) — WebFetch-verified.

### Tamarindo (Guanacaste beach town) — indicative, "some data estimated" per Numbeo

Monthly USD couple basket: rent 1BR centre $1,456 / outside $718, 3BR centre $2,050 / outside $1,043; utilities $74; dining shares San José's regional basket. [Numbeo: Tamarindo](https://www.numbeo.com/cost-of-living/in/Tamarindo-Costa-Rica) — WebFetch-verified.

---

## 4. Thailand

**Country-wide:** VAT 7%. PIT progressive 0-35%. [ExpatTax Thailand: Taxation of Overseas Pensions](https://www.expattaxthailand.com/taxation-overseas-pensions-thailand/) — WebFetch-verified.
**Tax treatment:** ≥180 days/year = tax resident. **Current law (Por.161/2566, effective 1 Jan 2024):** foreign-sourced income is taxable when *remitted* to Thailand by a resident, regardless of the year earned — the pre-2024 same-year loophole is closed; pre-2024 savings remain remittable tax-free. A 2025-proposed two-year remittance-exemption window was **never enacted** — do not model as active. **US Social Security is exempt** under the US-Thailand DTA even when remitted; other US private/employment pensions are assessable when remitted (subject to DTA/FTC relief). Suggested `addlTaxRate` ≈ 0.03. [ExpatTax Thailand: Assessable Foreign-Sourced Income](https://www.expattaxthailand.com/understanding-assessable-foreign-sourced-income-in-thailand/) — WebFetch-verified.
**Retiree visa:** **Non-Immigrant O-A** (age 50+): ฿800,000 (~$24,000) in a Thai bank OR ฿65,000/mo (~$1,950) income, plus mandatory health insurance. **O-X** (10-yr, select nationalities incl. US): ฿3M deposit. *Not portal-verified — secondary-sourced, corroborated across multiple advisory sites.*
**Healthcare/LTC:** international insurance $960-4,800/yr; local plans $500-2,000/yr — suggest hcPre ~$350/mo, hcPost ~$300/mo. Care homes ฿70,000-150,000/mo → annual ~$30,000 premium, budget/local $12,000-18,000. [Pacific Prime: Expat Senior Health Insurance Thailand](https://www.pacificprime.com/blog/expat-senior-health-insurance-thailand.html) · [ExpatDen: Retirement Homes Thailand](https://www.expatden.com/thailand/retirement-home-thailand/)

### Chiang Mai

Suggested `m`: `{rent:650, groceries:320, utilities:120, transport:80, dining:280, entertainment:130, misc:200}`. Basis: rent 1BR centre $470 / outside $280, 3BR centre $890; utilities $65; transport pass $54. [Numbeo: Chiang Mai](https://www.numbeo.com/cost-of-living/in/Chiang-Mai) — WebFetch-verified.

### Bangkok

Suggested `m`: `{rent:1000, groceries:380, utilities:150, transport:60, dining:420, entertainment:200, misc:280}`. Basis: rent 1BR centre $759 / outside $362, 3BR centre $2,344; utilities $107; transport pass $39. [Numbeo: Bangkok](https://www.numbeo.com/cost-of-living/in/Bangkok) — WebFetch-verified.

---

## 5. Vietnam

**Country-wide:** VAT 8% (temporarily reduced from 10%, extended through 2026). Tax residency = 183 days OR registered permanent address; residents taxed on **worldwide income**, progressive 5-35%. **No US-Vietnam tax treaty** — no treaty relief; relief relies on US FTC only. This is the highest tax-uncertainty of the four SE Asia countries for a full-time resident retiree. Suggested `addlTaxRate` ≈ 0.05-0.08 (materially higher than Thailand/Malaysia/Philippines). [Taxes for Expats: Retire in Vietnam](https://www.taxesforexpats.com/country-guides/vietnam/retire-in-vietnam.html) — search-corroborated.
**Retiree visa:** **No dedicated retirement visa exists.** Retirees use the Investor (DT) visa (~$125,000 min investment), 90-day e-visa with border runs, or family sponsorship.
**Healthcare/LTC:** international plans avg $4,547/yr; local plans $200-1,000/yr — suggest hcPre ~$350/mo, hcPost ~$300/mo. Nursing homes from ~$400/mo basic to $650-800/mo full-care; market is nascent with limited foreigner-oriented supply — annual budget ~$8,000-10,000. [Pacific Prime: Vietnam Health Insurance Cost](https://www.pacificprime.com/blog/health-insurance-cost-in-vietnam.html)

### Da Nang / Hoi An — Numbeo page self-flags as stale, likely under-states current rents

Suggested `m`: `{rent:650, groceries:300, utilities:100, transport:40, dining:260, entertainment:120, misc:190}`. Basis: rent 1BR centre $517 / outside $329, 3BR centre $924; utilities $89. [Numbeo: Da Nang](https://www.numbeo.com/cost-of-living/in/Da-Nang) — WebFetch-verified.

### Ho Chi Minh City

Suggested `m`: `{rent:750, groceries:300, utilities:110, transport:40, dining:280, entertainment:140, misc:200}`. Basis: rent 1BR centre $576 / outside $269, 3BR centre $1,224; utilities $100. [Numbeo: Ho Chi Minh City](https://www.numbeo.com/cost-of-living/in/Ho-Chi-Minh-City) — WebFetch-verified.

---

## 6. Malaysia

**Country-wide:** No VAT — uses SST (Sales & Service Tax): sales 5-10%, service tax 6-8%. **Foreign-sourced income remitted by individuals is exempt** (individual FSI exemption in effect through end-2036 under current policy) — Malaysia is effectively territorial for resident individuals' foreign income during this window. US pension/IRA/SS remitted is generally not locally taxed. Suggested `addlTaxRate` ≈ 0.00-0.01.
**Retiree visa — MM2H (revised Dec 2023, refined June 2024), USD-tiered:** **Silver** ~$150,000 fixed deposit + min RM600,000 property; **Gold** $500,000 FD + RM1M property; **Platinum** $1,000,000 FD + RM2M property. Min age 25 (Silver 21). 5-20 yr renewable, no fixed monthly-income floor in the new tiers. **Verification caveat:** the official IMI portal rendered only older renewal-deposit language (RM100k/150k maintenance) and did not confirm the USD-tier table — figures are corroborated across multiple advisory sources but should be treated as secondary-sourced, not portal-verified. A separate, lower-threshold Sarawak-MM2H program also exists. [Melbourne Capital Group: New MM2H Rules June 2024](https://www.melbournecapitalgroup.com/post/new-mm2h-rules-june-2024-key-changes-and-comparisons)
**Healthcare/LTC:** international plans avg $4,969/yr individual; local private RM100-500/mo (~$22-113) — suggest hcPre ~$350/mo, hcPost ~$300/mo. Nursing homes RM1,500-12,000+/mo; mid-range annual ~$12,000-18,000. [Pacific Prime: Malaysia Health Insurance Cost](https://www.pacificprime.com/blog/health-insurance-cost-in-malaysia.html) · [Ixora Senior Care: Nursing Home Costs Malaysia](https://ixoraseniorcare.com/blog/nursing-home-costs-in-malaysia/)

### Penang

Suggested `m`: `{rent:600, groceries:340, utilities:90, transport:50, dining:280, entertainment:150, misc:210}`. Basis: rent 1BR centre $420 / outside $239, 3BR centre $599; utilities $39. [Numbeo: Penang](https://www.numbeo.com/cost-of-living/in/Penang) — WebFetch-verified.

### Kuala Lumpur

Suggested `m`: `{rent:750, groceries:360, utilities:110, transport:50, dining:320, entertainment:170, misc:230}`. Basis: rent 1BR centre $609 / outside $371, 3BR centre $1,190; utilities $64. [Numbeo: Kuala Lumpur](https://www.numbeo.com/cost-of-living/in/Kuala-Lumpur) — WebFetch-verified.

---

## 7. Philippines

**Country-wide:** VAT 12%. **Territorial taxation** — resident aliens taxed only on Philippine-source income; foreign pensions, US Social Security, and IRA withdrawals are not subject to Philippine income tax. Suggested `addlTaxRate` ≈ 0.00.
**Retiree visa — SRRV (Philippine Retirement Authority, portal-verified):** **SRRV Classic**, age 50+: $15,000 time deposit (pensioner) or $30,000 (non-pensioner); age 40-49: $25,000 (pensioner) / $50,000 (non-pensioner). Pension proof required: ≥$800/mo single, $1,000/mo with dependents. **SRRV Courtesy** (ex-diplomats/military, ex-Filipinos): $1,500 (50+). +$15,000 per dependent beyond two; application fee $1,500, effective Sept 1, 2025. [PRA: SRRVisa](https://pra.gov.ph/SRRVisa) — WebFetch-verified · [ACCRALAW: Updates on the Philippines Retirement Visa Program](https://accralaw.com/2025/10/22/updates-on-the-philippines-retirement-visa-program/)
**Healthcare/LTC:** international plans from ~$1,000/yr; local HMOs cheap but network-bound — suggest hcPre ~$300/mo, hcPost ~$280/mo. Nursing homes ₱25,000-80,000+/mo; mid-range annual ~$8,000-12,000. [ExpatDen: Health Insurance Philippines](https://www.expatden.com/philippines/health-insurance-philippines/) · [Retire in PH: Nursing Home Options and Costs](https://retireinph.com/nursing-home-in-the-philippines-a-look-at-options-and-costs/)

### Manila — first fetch had a corrupted FX conversion; figures below are corrected (raw PHP re-fetch at ₱57/USD)

Suggested `m`: `{rent:750, groceries:360, utilities:150, transport:50, dining:320, entertainment:170, misc:230}`. Basis: rent 1BR centre $583 / outside $314, 3BR centre $2,100; utilities $132. [Numbeo: Manila](https://www.numbeo.com/cost-of-living/in/Manila) — WebFetch-verified.

### Cebu

Suggested `m`: `{rent:650, groceries:340, utilities:140, transport:45, dining:290, entertainment:150, misc:210}`. Basis: rent 1BR centre $563 / outside $344, 3BR centre $1,209; utilities $137. [Numbeo: Cebu](https://www.numbeo.com/cost-of-living/in/Cebu) — WebFetch-verified.

---

## 8. Australia — **product-honesty flag: no practical retiree visa**

**Country-wide:** GST 10%. Australian tax residents must declare worldwide income; most foreign pensions/annuities are taxable. US Social Security is a treaty exception (generally not taxed in Australia). Suggested `addlTaxRate` ≈ 0.10 (approximate; real figure depends heavily on bracket — top marginal ~45% + 2% Medicare levy). *ATO's own worldwide-income page returned HTTP 403 to WebFetch (bot-blocked); fact corroborated via search snippet + a secondary advisory source, not machine-verified from ato.gov.au directly.* [Taxes for Expats: Retire in Australia](https://www.taxesforexpats.com/country-guides/australia/retire-in-australia.html) — WebFetch-verified.
**Retiree visa — the critical flag:** Australia has **no general retirement visa open to new applicants.** The Investor Retirement visa (subclass 405) is closed to new applicants; subclass 410 is closed to new/first-time applicants (narrow legacy cases only). Realistic pathways for a US retiree are family-based only (Contributory Parent subclass 143, ~15-yr wait; Parent subclass 103, ~33-yr wait) or a partner/skilled route. **This should be surfaced in-app, not silently implied away** — Australia is a "cost reference," not a retirable-to destination absent a family/skilled pathway.
**Healthcare/LTC:** the US is NOT on Australia's Reciprocal Health Care Agreement list — a US retiree gets no Medicare access and must buy private cover, ~$300-450/mo couple. Aged-care basic daily fee ~A$24,400/yr, but self-funded retirees face means-tested accommodation costs (RAD lump sums averaging >A$570k) — `ltcAnnual` ~$45,000-60,000 is defensible for a self-funded retiree. [Aged Care Decisions: Nursing Home Cost Australia](https://agedcaredecisions.com.au/how-much-does-a-nursing-home-cost-in-australia/)

### Sydney

Suggested `m`: `{rent:2900, groceries:650, utilities:215, transport:250, dining:280, entertainment:150, misc:250}`. Basis: rent 1BR city A$3,536 (~$2,458) / outside A$2,426; 3BR city A$7,046; utilities A$309; transit pass A$217. [Numbeo: Sydney](https://www.numbeo.com/cost-of-living/in/Sydney) — WebFetch-verified.

### Brisbane

Suggested `m`: `{rent:2050, groceries:600, utilities:168, transport:70, dining:230, entertainment:140, misc:230}`. Basis: rent 1BR city A$2,748 / outside A$2,011; 3BR city A$4,954; utilities A$241. [Numbeo: Brisbane](https://www.numbeo.com/cost-of-living/in/Brisbane) — WebFetch-verified.

---

## 9. Uruguay

**Country-wide:** VAT (IVA) 22% standard (10% reduced on basics). **Retiree visa (Independent Means route) — low barrier, leads directly to permanent residency,** no temporary phase. Practical income expectation: ~$1,500/mo single, ~$2,500/mo couple from pension/SS/401(k)/rentals, certified by a Uruguayan notary; approval 6-18 months. Immigration residency ≠ tax residency (tax residency triggers at 183 days or center-of-vital-interests). [Global Citizen Solutions: Uruguay Independent Means Visa](https://www.globalcitizensolutions.com/independent-means-visa-uruguay/) — WebFetch-verified.
**Tax treatment:** new tax residents (from 1 Jan 2026) can elect a "Tax Holiday 2.0" (~10-year exemption on foreign-source income/capital gains) OR a flat 7% rate on foreign passive income indefinitely; foreign employment income not taxed at all. Suggested `addlTaxRate` ≈ 0.03-0.07 (0.00 during the holiday, 0.07 long-run).

### Montevideo — Numbeo's own commenters flag rents as understated; suggested rent nudged above raw figure

Suggested `m`: `{rent:900, groceries:500, utilities:200, transport:100, dining:200, entertainment:120, misc:180}`. Basis: rent 1BR city $753 / outside $584 (raw Numbeo, already USD); 3BR city $1,187; utilities $223. [Numbeo: Montevideo](https://www.numbeo.com/cost-of-living/in/Montevideo) — WebFetch-verified.
**Healthcare/LTC:** private mutualista membership ~$100-200/person/mo → ~$300-400/mo couple (no age-65 step). **`ltcAnnual` is a low-confidence placeholder (~$18,000-24,000)** — no authoritative published annual private nursing-home price found for Uruguay. [International Living: Uruguay Healthcare](https://internationalliving.com/countries/uruguay/health-care/)

---

## 10. South Africa

**Country-wide:** VAT 15% (well-established SARS rate — not separately fetched in this pass, flag for a confirming fetch if a hard citation is required). South Africa taxes residents on worldwide income — no territorial exemption. US Social Security: under the US-SA treaty (1998), government social security is generally taxable only by the paying state, but there is **no US-SA totalization agreement.** Foreign private pension/retirement-fund payouts: SA removed its old exemption in 2025 and now taxes these, with treaty FTC relief offsetting US liability. Suggested `addlTaxRate` ≈ 0.05-0.07 (meaningful — worldwide taxation, no exemption). [KPMG: Flash Alert 2025-169](https://kpmg.com/xx/en/our-insights/gms-flash-alert/flash-alert-2025-169.html) · [Taxes for Expats: South Africa](https://www.taxesforexpats.com/country-guides/south-africa/us-tax-preparation-in-south-africa.html)
**Retiree visa:** **Retired Person's Visa/Permit** — requires guaranteed R37,000/month (~$2,250) from pension/annuity/irrevocable retirement fund, or equivalent asset-generated income; +R3,000/dependent. Renewable up to 4 years. *Flag:* a Cabinet-approved Revised White Paper (2026-04-08) proposes raising this threshold significantly — the figure has been static for 15 years and is at risk of change. [SA Consulate New York: Retired Person's Visa](https://www.southafrica-newyork.net/retired-persons-visa/) — WebFetch-verified.

### Cape Town

Suggested `m`: `{rent:950, groceries:450, utilities:118, transport:90, dining:250, entertainment:150, misc:200}`. Basis: rent 1BR centre R16,542 (~$1,007) / outside R11,229, 3BR centre R30,347; utilities R1,932. [Numbeo: Cape Town](https://www.numbeo.com/cost-of-living/in/Cape-Town) — WebFetch-verified.
**Healthcare/LTC:** international private medical insurance ~$200-600/mo comprehensive — suggest hcPre ~$350/mo, hcPost ~$300/mo. **`ltcAnnual` is an estimate (~$12,000-15,000)** — no single authoritative SA-specific LTC annual figure found.

---

## 11. Colombia

**Country-wide:** VAT (IVA) 19%. No US-Colombia income tax treaty. Colombia taxes residents (>183 days/365) on worldwide income, but **Law 2381 of 2024 (DIAN) exempts foreign pensions up to 1,000 UVT/month (~$14,000/mo)** — so US Social Security and government/corporate pensions are effectively exempt for most retirees; 401(k)/IRA withdrawals and private annuities are less certain (may be taxed as ordinary income). Suggested `addlTaxRate` ≈ 0.00-0.02 (near-zero for SS/pension retirees). [PwC: Colombia Income Determination](https://taxsummaries.pwc.com/colombia/individual/income-determination) · [Taxes for Expats: Colombia](https://www.taxesforexpats.com/country-guides/colombia/us-tax-preparation-in-colombia.html)
**Retiree visa — Pensionado (M-11):** requires a lifetime pension of 3× SMMLV (2026 SMMLV COP 1,750,905) ≈ $1,380-1,410/mo; a Rentista alternative requires ~10× SMMLV. **The official Cancillería visa page returned HTTP 403 to WebFetch and could not be machine-verified** — the figure is corroborated by multiple secondary advisory sources (goldenharbors, medellinlawyer, colombiavisas); treat as secondary-sourced pending a manual confirmation.
**Healthcare/LTC:** public EPS + private prepagada/international insurance $200-500/mo — suggest hcPre ~$250/mo, hcPost ~$200/mo. **`ltcAnnual` is an estimate (~$10,000-14,000)** — no single authoritative source found; Medellín/Bogotá do have top-tier private hospitals at low cost.

### Medellín — ⚠ COP moved from 3,800 to 3,250/USD in ~2 months; USD figures are rate-sensitive, consider pinning a planning rate

Suggested `m`: `{rent:800, groceries:400, utilities:104, transport:120, dining:250, entertainment:130, misc:180}`. Basis: rent 1BR centre COP 2,973,602 (~$915 at 3,250) / outside COP 2,106,667; 3BR centre COP 5,208,291. [Numbeo: Medellín](https://www.numbeo.com/cost-of-living/in/Medellin) — WebFetch-verified.

### Bogotá — cheaper than Medellín on rent

Suggested `m`: `{rent:700, groceries:400, utilities:110, transport:90, dining:250, entertainment:120, misc:170}`. Basis: rent 1BR centre COP 2,142,308 (~$659) / outside COP 1,456,835; 3BR centre COP 3,943,870. [Numbeo: Bogotá](https://www.numbeo.com/cost-of-living/in/Bogota) — WebFetch-verified.

---

## 12. New Zealand — **product-honesty flag: high-barrier investor visa only**

**Country-wide:** GST 15%. A 4-year transitional-resident exemption applies to most foreign passive income (including pensions) for new migrants; after that, foreign pension income is generally taxable in NZ under the US-NZ DTA. Suggested `addlTaxRate` ≈ 0.05-0.10 (0.00 during the 4-yr window; top resident rate ~39%). *A new flat 28% deduction rule on certain overseas pension **transfers** takes effect 1 Apr 2026 — search-level only, unverified in detail; it targets lump-sum transfers, not ongoing pension receipts, so should not be conflated with the ongoing-income tax rate.* [IRD: Tax-Exempt Overseas Pensions](https://www.ird.govt.nz/income-tax/income-tax-for-individuals/adjust-your-income/types-of-income/tax-exempt-overseas-pensions)
**Retiree visa — the critical flag:** the **Temporary Retirement Visitor Visa** is an investor visa, not an easy retiree visa. Portal-verified requirements: age 66+, NZ$750,000 to invest in acceptable NZ investments (a residential home does NOT count), plus NZ$500,000 maintenance funds, plus NZ$60,000 annual income (combinable for a couple). 2-year visa, renewable, **no direct path to permanent residency.** [Immigration NZ: Temporary Retirement Visitor Visa](https://www.immigration.govt.nz/visas/temporary-retirement-visitor-visa/) — WebFetch-verified. Realistic only for well-funded retirees; should carry the same "no practical retiree pathway" flag as Australia.
**Healthcare/LTC:** publicly funded system covers residents/citizens; a retirement-visa holder needs private insurance (visa requirement) ~$250-400/mo couple. Rest-home care NZ$1,200-1,800/week (~$35,000-53,000/yr) — `ltcAnnual` ~$45,000 defensible for a self-funded retiree. Residential Care Subsidy only applies once assets fall below ~NZ$142k (single). [MoneyBalance: Aged Care Costs NZ](https://moneybalance.co.nz/personal-finance/retirement/aged-care-costs-nz/)

### Auckland

Suggested `m`: `{rent:1600, groceries:620, utilities:178, transport:200, dining:230, entertainment:150, misc:220}`. Basis: rent 1BR city NZ$2,146 (~$1,217) / outside NZ$2,074; 3BR city NZ$3,840; utilities NZ$314. [Numbeo: Auckland](https://www.numbeo.com/cost-of-living/in/Auckland) — WebFetch-verified.

---

## 13. Japan — **product-honesty flag: NO retiree visa exists**

**Country-wide:** Consumption tax (VAT) 10%. US-Japan tax treaty in force. A resident (address in Japan or 1yr+ presence) is taxed on worldwide income; treaty Article 17 assigns pensions/Social Security primarily to the country of residence (Japan), but the US saving clause lets the US still tax its citizens (FTC resolves double tax). Japan's NTA does **not** recognize US tax-deferred status for IRA/401(k) — distributions are taxed as income. **Non-permanent residents** (first 5 of the last 10 years) are taxed only on Japan-source income plus foreign income remitted into Japan — a real planning lever for early years. Suggested `addlTaxRate` ≈ 0.05-0.10 (progressive national+local; higher than most other candidates in this brief). [Taxes for Expats: US-Japan Tax Treaty](https://www.taxesforexpats.com/country-guides/japan/us-japan-tax-treaty.html) · [Japan Finance Wiki: 401(k)s and IRAs Under Tax Treaty](https://wiki.japanfinance.org/countries/us/401ks-and-iras-under-tax-treaty/)
**Retiree visa — the critical flag:** Japan has **no dedicated retirement visa**, and immigration authorities have consistently declined to create one. The closest option is the **Long Stay (Designated Activities No. 40)**: ¥30M savings (~$185-200k) — ¥60M for a couple applying separately — plus private medical insurance, a visa-waiver nationality, and no work; capped at 6 months + one renewal = 12 months maximum, and does **not** count toward permanent residency. Other paths are Business Manager (¥5M investment + operating business), spouse-of-Japanese-national, or the 10-year PR track. **Japan should be modeled as a max-1-year stay, or flagged in-app as having no viable passive-income retirement pathway** — this is the strongest of all the "no retiree visa" flags in this brief. [Migaku: Retirement Visa Options in Japan](https://migaku.com/blog/language-fun/retirement-visa-options-in-japan-whats-actually-available) — WebFetch-verified.
**Healthcare/LTC:** National Health Insurance available to residents, income-based premiums ~$150-350/mo couple, 30% copay capped; Long Stay visa requires private insurance instead. Japan has a mandatory public Long-Term Care Insurance (Kaigo Hoken) from age 40. `ltcAnnual` ~$20,000-30,000 (nursing-home benchmark — the highest LTC estimate of any country in this brief).

### Tokyo

Suggested `m`: `{rent:1300, groceries:600, utilities:155, transport:150, dining:300, entertainment:200, misc:250}`. Basis: rent 1BR centre ¥209,857 (~$1,303) / outside ¥113,229, 3BR centre ¥382,688; utilities ¥24,936. [Numbeo: Tokyo](https://www.numbeo.com/cost-of-living/in/Tokyo) — WebFetch-verified.

### Osaka — markedly cheaper than Tokyo

Suggested `m`: `{rent:850, groceries:550, utilities:128, transport:70, dining:280, entertainment:180, misc:220}`. Basis: rent 1BR centre ¥112,000 (~$696) / outside ¥84,000, 3BR centre ¥283,250; utilities ¥20,652. [Numbeo: Osaka](https://www.numbeo.com/cost-of-living/in/Osaka) — WebFetch-verified.

---

## Cross-cutting flags for the data-landing phases (4–6)

1. **Two "no viable retiree visa" flags — Australia and Japan** — must be surfaced in-app, not silently modeled as if these were straightforward retirement destinations like Panama or Costa Rica. New Zealand is a close third (technically has a visa, but it's a high-net-worth investor product, not a retiree visa in the ordinary sense). This matches the proposal's original Tier 5 placement of Japan as "deliberately last."
2. **Tax treatment varies from ~0% (Panama, Costa Rica, Philippines, Malaysia — all effectively territorial for foreign retirement income) to meaningful (Australia, South Africa, Japan, Vietnam — worldwide taxation with no full exemption).** Do not apply one default `addlTaxRate` across all new locations — the range spans 0.00 to ~0.10.
3. **Numbeo data-quality varies by city.** Low-contributor-count / self-flagged-stale cities (Ajijic, Boquete, Tamarindo, Da Nang, Montevideo's rent specifically) should be treated as indicative, not precise — consider a UI caption analogous to the existing "figures are planning-grade" disclaimer, scoped per-location if the app ever surfaces data-confidence.
4. **Several official visa-portal pages block automated verification** (Colombia's Cancillería 403'd; Thailand's immigration.go.th and Malaysia's IMI portal didn't render the specific figures pages) — those figures rest on secondary-sourced, cross-corroborated advisory content rather than a portal-verified primary source. A human maintainer refreshing this data (per the pattern in `docs/investment-data-refresh.md`) should prioritize re-verifying these three visa programs directly.
5. **Exchange-rate sensitivity is real and material for Colombia specifically** (COP moved ~15% in two months during this research pass) — consider whether to store non-US baskets in native currency for FX-robustness, though this would be a schema change beyond this phase's scope; noting it here for a future consideration, not a recommendation to act on now.
6. **`ltcAnnual` is a low-confidence placeholder for Uruguay, South Africa, and Colombia** — no single authoritative annual private-care figure was found for any of the three; each is flagged individually above and should be revisited if the app ever leans harder on the LTC figure for these locations specifically.
