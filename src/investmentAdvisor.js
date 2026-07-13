import { INVESTMENT_FUNDS, ALLOCATION_SPLIT } from "./investmentData.js";

/**
 * Derives the household's investment phase from existing plan ages/stop-ages
 * (no new input — see step 3 "Timing"). "both" covers the retirement-transition
 * year, when one spouse has stopped working and the other has not.
 */
export function derivePhase({ ageA, stopA, ageB, stopB }) {
  const retiredA = ageA >= stopA;
  const retiredB = ageB >= stopB;
  if (retiredA && retiredB) return "decumulation";
  if (!retiredA && !retiredB) return "accumulation";
  return "both";
}

/**
 * Recommends funds for a risk tier × phase, split evenly within each asset
 * class per ALLOCATION_SPLIT. Not an optimizer — a simple, auditable rule.
 */
export function recommendFunds({ riskTolerance, phase, accreditedInvestor }) {
  const split = ALLOCATION_SPLIT[riskTolerance][phase];
  const eligible = INVESTMENT_FUNDS.filter(
    (f) => f.riskTiers.includes(riskTolerance) && f.phases.includes(phase) && (!f.accreditedOnly || accreditedInvestor)
  );
  const equityFunds = eligible.filter((f) => f.assetClass === "equity");
  const bondFunds = eligible.filter((f) => f.assetClass === "bond");

  const equityRows = equityFunds.map((fund) => ({ fund, targetPct: split.equity / equityFunds.length }));
  const bondRows = bondFunds.map((fund) => ({ fund, targetPct: split.bond / bondFunds.length }));

  return [...equityRows, ...bondRows].sort((a, b) => b.targetPct - a.targetPct);
}

/** Tax-efficiency note: bond/income funds are generally better held tax-advantaged. */
export function accountNote(account, recommendation) {
  const hasBond = recommendation.some((r) => r.fund.assetClass === "bond" && r.targetPct > 0);
  if (account.type === "taxable" && hasBond) {
    return "Consider holding bond/income funds in tax-advantaged accounts rather than taxable.";
  }
  return null;
}

/** Balance-weighted dollar allocation of each account across a recommendation. */
export function allocateAccounts(accounts, recommendation) {
  return (accounts || [])
    .filter((a) => Number(a.balance) > 0)
    .map((account) => ({
      account,
      lines: recommendation.map((r) => ({
        fund: r.fund,
        amount: (Number(account.balance) || 0) * (r.targetPct / 100),
      })),
      note: accountNote(account, recommendation),
    }));
}
