# Refreshing `src/investmentData.js`

`INVESTMENT_FUNDS` and `ALLOCATION_SPLIT` in `src/investmentData.js` are static,
curated data — the app makes no runtime network calls. Refresh them periodically
(annually, or when a cited return figure looks stale) using this process.

## 1. Research prompt template

Hand this to a research agent (or run it yourself with web search), filling in
the bracketed criteria:

> Research publicly-available investment funds meeting these criteria:
> [e.g. "5–10 year annualized returns of 10%+, expense ratio under 0.5%,
> available through a major US retail brokerage without special
> accreditation"]. For each fund, report: id (lowercase-ticker), name, ticker,
> provider, vehicle (ETF/mutual fund/BDC/evergreen fund/etc.), category,
> assetClass ("equity" or "bond"), annualizedReturn (decimal, e.g. 0.137 for
> 13.7%), returnBasis (the exact period and source, e.g. "5-yr annualized,
> Bankrate 2027"), expenseRatio (decimal or null if not applicable — explain
> in feeNote), feeNote (string or null), minInvestment (number or null),
> riskTiers (array of "conservative"/"moderate"/"aggressive" — which tiers
> this fund fits), phases (array of "accumulation"/"decumulation"),
> accreditedOnly (boolean), citation (a working https URL to the source),
> signupUrl (a working https URL to open an account or buy the fund). Output
> as a JSON array matching this exact shape.

Run it separately for each risk tier you're refreshing (conservative /
moderate / aggressive), and separately for any accredited-investor-only
private-markets tier, since those carry materially different risk/liquidity
disclosures.

## 2. Validate with brutal-honesty-review before merging

Before updating `investmentData.js`, run the candidate output through the
`brutal-honesty-review` skill (or an agentic-qe validation pass). Specifically
challenge:

- Is the return figure real and currently accurate, or a stale/rounded number
  copied from an aggregator?
- Does the fund actually require accreditation, or was it mis-tagged?
- Is the `citation` URL a real, working, and reasonably authoritative source
  (fund provider, a major financial publisher) — not a broken or SEO-spam link?
- Is the `signupUrl` a genuine account-opening or buy page?
- Does every risk tier × phase combination still have at least one equity fund
  and one bond fund available (`src/investmentData.test.js` enforces this —
  run it after editing)?

## 3. Update the data and cite it

1. Edit `src/investmentData.js` with the validated fund list.
2. Add or update the corresponding entries in `docs/sources.md` §21
   ("Investment Recommendations — Curated Fund Data"), following the existing
   format in that file (link, `SOURCES`-style key note, one-line summary of
   what it informed).
3. Run `pnpm test` — `src/investmentData.test.js` and
   `src/investmentAdvisor.test.js` must still pass.
4. Commit with a message noting what changed and why (e.g. "chore: refresh
   investment fund data — 2027 return figures").
