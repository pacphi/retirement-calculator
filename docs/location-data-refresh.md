# Refreshing `LOCATIONS` / `INTL_TAX` in `src/retirementData.js`

`LOCATIONS` and `INTL_TAX` in `src/retirementData.js` are static, curated data — the
app makes no runtime network calls for cost-of-living, tax, or visa figures. Every
entry is `dataAsOf`-stamped (currently `2026`) and sourced to
`docs/research/location-cost-of-living-data.md` (and, for the original Wave 1/2
entries, `docs/sources.md`). Refresh the data periodically (annually, or when a
cited figure — a cost basket, tax rate, or visa threshold — looks stale) using this
process, the same pattern `docs/investment-data-refresh.md` documents for
`investmentData.js`.

## 1. Research prompt template

Hand this to a research agent (or run it yourself with web search), one location at
a time:

> Research current cost-of-living, tax treatment, and retiree-visa terms for
> [country/location], anchored to its major expat/retiree city or cities. Report:
> a monthly USD couple cost basket matching this shape —
> `{rent, groceries, utilities, transport, dining, entertainment, misc}` — with the
> Numbeo (or equivalent) source and fetch date for each figure; the VAT/GST rate;
> whether the country taxes US retirees on a worldwide, territorial, or
> remittance basis, and at roughly what effective rate on IRA/401(k)
> distributions specifically (not just headline brackets); whether a US Social
> Security government-pension exemption applies under a US tax treaty (or
> explicitly note if no treaty exists); current retiree-visa requirements
> (income/deposit thresholds, minimum age, path to permanent residency or lack
> thereof); and an estimate (or explicit "not found") for annual long-term-care
> cost. Flag explicitly wherever a source blocked automated verification (a 403,
> a bot-block, a stale/self-flagged Numbeo page) — those facts should be treated
> as secondary-sourced, not machine-verified, in the write-up.

## 2. Validate with brutal-honesty-review before merging

Before updating `retirementData.js`, run the candidate figures through the
`brutal-honesty-review` skill (or an agentic-qe validation pass). Specifically
challenge:

- Is the cost basket a real, dated figure — or a stale/rounded number carried over
  from a prior refresh?
- Does the addlTaxRate reflect the actual IRA/401(k)/pension treatment, not just a
  headline income-tax bracket that may not apply to a retiree's income mix? The
  range across existing entries spans 0.00 (territorial systems) to ~0.10
  (worldwide-taxation systems with no exemption) — don't apply one default.
- Does the location's retiree-visa story hold up? If the only realistic path is a
  high-net-worth investor product, or no dedicated retiree visa exists at all
  (as with New Zealand and Japan in this dataset), the `note` field must say so
  plainly — a **product-honesty flag** — rather than implying an easy pathway that
  doesn't exist.
- Is `ltcAnnual` sourced, or a placeholder? Several current entries (Uruguay,
  South Africa, Colombia) are explicitly flagged as low-confidence placeholders in
  their `note` field because no authoritative annual figure was found — preserve
  that honesty rather than presenting an estimate as sourced fact.
- Is exchange-rate sensitivity noted where relevant (e.g. Colombia's COP moved
  ~15% in two months during the original research pass)?

## 3. Update the data and cite it

1. Edit `src/retirementData.js`'s `LOCATIONS` array with the validated cost basket,
   bumping `dataAsOf` to the refresh year. Mirror the existing entry shape and
   comment style exactly (see any Tier 1-4 entry as a precedent).
2. Edit the matching `INTL_TAX` entry, following the treaty-aware shape
   (`pensionExclusion`, `taxesTradWithdrawal`, `retireRate`, `exposureNotes`).
   `inheritanceRulesForPlace()` in the same file needs no per-location change — it
   already routes any entry with `region !== "US"` through the foreign branch.
3. Add or update the corresponding source citations in `docs/sources.md` (new
   locations get their own numbered section, following the precedent of §22 for
   the pension-system sources landed alongside this location work).
4. Run `pnpm test` — the location-specific tests in `src/calculatorCore.test.js`
   (`describe("Tier 1 locations...")`, `describe("Tier 2 locations...")`, etc.)
   assert the shape and non-US routing for every entry and must still pass.
5. Run `pnpm lint:md` and `pnpm links` if `docs/research/location-cost-of-living-data.md`
   or `docs/sources.md` changed.
6. Commit with a message noting what changed and why (e.g. "chore: refresh
   location cost-of-living data — 2027 figures").
