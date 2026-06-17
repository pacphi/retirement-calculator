# Logic Remediation Notes

This document records the implementation changes made after the logic audit.

## What Changed

- The calculation engine now lives in `src/calculatorCore.js`.
- Constants and public source links now live in `src/retirementData.js`.
- The year-by-year simulation and the headline income use the same federal tax engine.
- Annual spending needs are treated as after-tax spending.
- Senior deductions are applied only when the modeled filer is age 65 or older.
- Social Security can be entered from an SSA statement; the income-based estimate remains a fallback.
- Spousal Social Security benefits no longer receive delayed-retirement credits after full retirement age.
- Custom Social Security cuts apply from the selected calendar year, including a custom 0% cut.
- WA DRS early-retirement factors were updated to the current DRS table shown for Plan 2 members.
- DRS early-retirement eligibility now guards against service-year combinations that should not produce a reduced early pension.
- Rental income is separated from guaranteed lifetime benefits in the UI.
- Place expanders are keyboard-operable buttons with `aria-expanded`.
- The UI includes direct links to IRS, SSA, DRS, KFF, and CMS source pages.

## Test Coverage Added

The new tests cover:

- 2026 federal bracket math.
- Social Security taxable-benefit thresholds.
- Senior deduction age gates.
- Spousal benefit caps and early spousal reductions.
- DRS early-retirement factors and eligibility guards.
- Custom Social Security reduction timing.
- Steady-state timing after selected benefits actually start.
- Tax-aware yearly depletion rows.
- Source links and keyboard-operable Places rows.

## Accuracy Boundary

The calculator is more internally consistent after these changes, but it remains a planning tool. A professional review should still use the household's actual SSA statements, DRS estimate, tax returns, account tax character, state/residency facts, health insurance quotes, and estate documents.
