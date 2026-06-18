# Nest & Next 🪺

**This is about your money, your home, and what comes next.**

> _Nest egg + what's next._ A retirement plan you can actually check — year by year, place by place.

[![CI](https://github.com/pacphi/retirement-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/pacphi/retirement-calculator/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/pacphi/retirement-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/pacphi/retirement-calculator/actions/workflows/deploy.yml)
[![Release](https://github.com/pacphi/retirement-calculator/actions/workflows/release.yml/badge.svg)](https://github.com/pacphi/retirement-calculator/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/release/pacphi/retirement-calculator.svg)](https://github.com/pacphi/retirement-calculator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<a href="https://pacphi.github.io/retirement-calculator" target="_blank" rel="noopener"><img src="https://img.shields.io/badge/🚀_Try_it_online-Launch_calculator-2ea44f?style=for-the-badge" alt="Try it online"></a>

Nest & Next is an **interactive retirement planning tool** that projects a U.S. household's cash flow from today to age 95 — then shows how that plan holds up across several places to live. No spreadsheets, no logins, no data leaving your browser.

🔒 **Planning-grade, source-linked, and private.** Every formula traces back to a public source, and the math runs entirely in your browser.

---

## 💡 Why Nest & Next?

Most retirement calculators give you one number and a leap of faith. Nest & Next shows you the **whole arc** — and the assumptions behind it.

- 📅 **Year-by-year, not a single guess** — see income and spending for every year to age 95, so you can spot the lean years before they arrive.
- 👫 **Built for two** — models Social Security for both partners, including spousal benefits, plus a Washington DRS pension.
- 🏠 **Your home is part of the plan** — inherited real estate you can sell, rent, or live in, with the trade-offs made explicit.
- 🌍 **Where you live changes everything** — compare cost of living across 14 locations side by side.
- 🧾 **Real tax math** — one 2026 federal tax engine drives both projections and headline income, with age-65 deductions applied only when they actually apply.
- ⚠️ **Stress-tested** — built-in Social Security funding-cut scenarios so you can plan for the downside, not just the brochure.
- 🔗 **Show your work** — in-app links to the SSA, IRS, CMS, and Washington DRS sources behind every assumption.

> ⚖️ This is a planning tool, **not** financial, tax, or legal advice.

---

## 📚 Documentation

### 👤 For Users — _understand and trust the numbers_

| Doc | What you'll find |
| --- | --- |
| 🚀 [Try it online](https://pacphi.github.io/retirement-calculator) | Launch the live calculator in your browser |
| 📖 [Use Cases & Logic](docs/use-cases.md) | Every capability explained, with the formulas behind it |
| 🔍 [Sources & References](docs/sources.md) | The public sources behind each number, primary sources flagged |
| 🆚 [vs. NerdWallet](docs/vs-nerdwallet.md) | How our logic compares to NerdWallet's calculator |
| 🆚 [vs. Vanguard](docs/vs-vanguard.md) | How our logic compares to Vanguard's Retirement Income tool |

### 🛠️ For Maintainers — _build, extend, and ship_

| Doc | What you'll find |
| --- | --- |
| 📋 [Product Requirements](docs/prd.md) | Scope, requirements (FR-\*), and product intent |
| 🧮 [Use Cases & Logic](docs/use-cases.md) | Computational spec — inputs, processing, outputs, edge cases |
| 📦 [Release Process](docs/release.md) | How to cut a versioned `vX.Y.Z` release |

---

## 🚀 Run Locally

```bash
pnpm install
pnpm dev
```

## ✅ Test

```bash
pnpm test
```

Tests cover the high-risk logic: federal tax, senior deductions, Social Security spousal rules, Washington DRS early-retirement factors, Social Security cuts by year, and tax-aware depletion. Run the full quality gate (lint, types, links, markdown, tests) with `pnpm check`.

## 🗂️ Project Layout

| Path | Role |
| --- | --- |
| `RetirementCalculator.jsx` | React UI, charts, and tables |
| `src/calculatorCore.js` | Pure calculation engine |
| `src/retirementData.js` | Source-linked 2026 constants & assumptions |
| `src/calculatorCore.test.js` | Formula and simulation tests |
| `RetirementCalculator.test.jsx` | UI, source-link, and accessibility tests |
| `docs/` | Product, logic, sources, and release notes |

---

## 📄 License

MIT © 2026 Chris Phillipson. See [LICENSE](LICENSE).
