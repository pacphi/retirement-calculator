/**
 * Curated investment fund dataset — static, source-cited, refreshed manually.
 * See docs/investment-data-refresh.md for the maintainer refresh process and
 * docs/sources.md (§21) for the full citation list. No runtime network calls.
 */

export const ALLOCATION_SPLIT = {
  conservative: {
    accumulation: { equity: 60, bond: 40 },
    decumulation: { equity: 40, bond: 60 },
  },
  moderate: {
    accumulation: { equity: 75, bond: 25 },
    decumulation: { equity: 55, bond: 45 },
  },
  aggressive: {
    accumulation: { equity: 85, bond: 15 },
    decumulation: { equity: 65, bond: 35 },
  },
};

export const INVESTMENT_FUNDS = [
  {
    id: "voo", name: "Vanguard S&P 500 ETF", ticker: "VOO", provider: "Vanguard", vehicle: "ETF",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.139, returnBasis: "5-yr annualized (13.92% CAGR), 2026 research pass (InvestSnips)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://investsnips.com/voo-performance/",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/voo",
  },
  {
    id: "fxaix", name: "Fidelity 500 Index Fund", ticker: "FXAIX", provider: "Fidelity", vehicle: "Mutual Fund",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.135, returnBasis: "10-yr annualized, highest among S&P 500 index peers (Forbes, 2026)",
    expenseRatio: 0.00015, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.forbes.com/advisor/investing/best-index-funds/",
    signupUrl: "https://www.fidelity.com/mutual-funds/fidelity-fund-portfolios/overview",
  },
  {
    id: "swppx", name: "Schwab S&P 500 Index Fund", ticker: "SWPPX", provider: "Charles Schwab", vehicle: "Mutual Fund",
    category: "US Total Market Index", assetClass: "equity",
    annualizedReturn: 0.134, returnBasis: "5-yr annualized (13.4%, grade B), 2026 research pass (AAII)",
    expenseRatio: 0.0002, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.aaii.com/fund/ticker/SWPPX",
    signupUrl: "https://www.schwab.com/ira",
  },
  {
    id: "bnd", name: "Vanguard Total Bond Market ETF", ticker: "BND", provider: "Vanguard", vehicle: "ETF",
    category: "Bond Index", assetClass: "bond",
    annualizedReturn: 0.032, returnBasis: "5-yr annualized, Vanguard fund page (verify on refresh — bond yields move with rates)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["conservative", "moderate", "aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://investor.vanguard.com/investment-products/etfs/profile/bnd",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/bnd",
  },
  {
    id: "vug", name: "Vanguard Growth ETF", ticker: "VUG", provider: "Vanguard", vehicle: "ETF",
    category: "Growth/Tech", assetClass: "equity",
    annualizedReturn: 0.177, returnBasis: "10-yr annualized, 2026 research pass (PortfoliosLab)",
    expenseRatio: 0.0003, feeNote: null, minInvestment: null,
    riskTiers: ["moderate", "aggressive"], phases: ["accumulation"],
    accreditedOnly: false,
    citation: "https://portfolioslab.com/symbol/VUG",
    signupUrl: "https://investor.vanguard.com/investment-products/etfs/profile/vug",
  },
  {
    id: "qqq", name: "Invesco QQQ (Nasdaq-100)", ticker: "QQQ", provider: "Invesco", vehicle: "ETF",
    category: "Growth/Tech", assetClass: "equity",
    annualizedReturn: 0.219, returnBasis: "trailing 10-yr annualized total return of 21.9%, 2026 research pass (The Motley Fool)",
    expenseRatio: 0.0018, feeNote: null, minInvestment: null,
    riskTiers: ["aggressive"], phases: ["accumulation"],
    accreditedOnly: false,
    citation: "https://www.fool.com/investing/2026/06/05/where-will-qqq-be-in-10-years/",
    signupUrl: "https://www.invesco.com/qqq-etf/en/home.html",
  },
  {
    id: "arcc", name: "Ares Capital Corporation", ticker: "ARCC", provider: "Ares", vehicle: "BDC (exchange-traded)",
    category: "Private Credit (BDC)", assetClass: "bond",
    annualizedReturn: 0.12, returnBasis: "~10-yr annualized / since 2004 IPO, 2026 research pass (PortfoliosLab; Ares IR)",
    expenseRatio: null, feeNote: "Externally managed BDC — operating/incentive fees disclosed in ARCC's 10-K, not a fund expense ratio.",
    minInvestment: null,
    riskTiers: ["aggressive"], phases: ["accumulation", "decumulation"],
    accreditedOnly: false,
    citation: "https://www.arescapitalcorp.com/investor-relations",
    signupUrl: "https://www.arescapitalcorp.com",
  },
  {
    id: "bxpe", name: "Blackstone Private Equity Strategies", ticker: "BXPE", provider: "Blackstone",
    vehicle: "Evergreen fund (3(c)(7))", category: "Private Equity (accredited)", assetClass: "equity",
    annualizedReturn: 0.15, returnBasis: "Blackstone's PE business IRR since 1987 — firm-level, not this fund specifically (2026 research pass)",
    expenseRatio: null, feeNote: "~1.25% annual management fee plus a 12.5% performance fee above a 5% hurdle (per BXPE prospectus).",
    minInvestment: 25000,
    riskTiers: ["aggressive"], phases: ["accumulation"],
    accreditedOnly: true,
    citation: "https://www.sec.gov/Archives/edgar/data/1930054/000119312526106084/d71061d10k1.pdf",
    signupUrl: "https://www.blackstone.com/pws/",
  },
];
