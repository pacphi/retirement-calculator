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
- 🎲 **Odds, not just averages** — Monte Carlo runs report your success probability and a p10/p50/p90 spread for both sustainable spending and depletion age.
- 🪣 **Three buckets, taxed right** — taxable, pre-tax, and Roth accounts drawn down in a tax-smart order, with SECURE 2.0 required minimum distributions.
- 🎚️ **Tunable strategy** — optional glidepath returns, Guyton-Klinger spending guardrails, and a Blanchett "spending smile" for retirements that aren't flat.
- 📈 **Counts the years before, too** — pre-retirement accumulation with your contributions and employer match, not just the drawdown.
- 🧭 **Guided, then printable** — a step-by-step wizard to build the plan, then a sectioned report you can read on screen or print / save to PDF.
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

Prerequisites: **Node ≥ 24** and **pnpm 11.5.2** (see `packageManager` in `package.json`).

```bash
pnpm install
pnpm dev      # local dev server at http://127.0.0.1:5173
pnpm build    # production build → dist/
```

The live site at [pacphi.github.io/retirement-calculator](https://pacphi.github.io/retirement-calculator) is built and deployed to GitHub Pages from `main`.

## ✅ Test

```bash
pnpm test
```

Tests cover the high-risk logic: federal tax, senior deductions, Social Security spousal rules, Washington DRS early-retirement factors, Social Security cuts by year, and tax-aware depletion. Run the full quality gate (lint, types, links, markdown, tests) with `pnpm check`. Coverage (`pnpm test:coverage`) and mutation testing (`pnpm test:mutation`) are available too.

## 🗂️ Project Layout

| Path | Role |
| --- | --- |
| `src/App.jsx` | App shell / entry point (mounts the calculator) |
| `RetirementCalculator.jsx` | Top-level UI — orchestrates the wizard and report |
| `src/calculatorCore.js` | Engine entry point (re-exports `src/finance/`) |
| `src/finance/` | Pure calculation engine — tax, Social Security, pension, buckets, RMDs, returns, guardrails, Monte Carlo |
| `src/components/` | UI atoms, charts, result sections, and wizard steps |
| `src/nav/`, `src/hooks/`, `src/report/` | Navigation, memoized derivations, and print/PDF export |
| `src/retirementData.js` | Source-linked 2026 constants & assumptions |
| `*.test.js` / `*.test.jsx` | Co-located formula, simulation, UI, and accessibility tests |
| `docs/` | Product, logic, sources, and release notes |

---

## 📄 License

MIT © 2026 Chris Phillipson. See [LICENSE](LICENSE).
