/**
 * Wave 3 Task 6 — Guyton-Klinger spending guardrails (opt-in).
 *
 * A pure step function that carries a spending multiplier forward year by year.
 * When the portfolio withdrawal rate breaches the upper guardrail the multiplier
 * is trimmed; when it falls below the lower guardrail the multiplier is raised.
 * Inside the band the multiplier is unchanged.
 *
 * The multiplier scales DISCRETIONARY (nonHousingBase) only — housing and
 * healthcare are hard obligations and are never touched by this logic.
 *
 * Default "fixed" strategy: multiplier stays 1 → all results byte-identical.
 *
 * Sources: SOURCES.kitcesGuardrails, SOURCES.morningstarGuardrails.
 *
 * @module guardrails
 */

import { GUARDRAIL_DEFAULTS as _D } from "../retirementData.js";

export const GUARDRAIL_DEFAULTS = _D;

/**
 * One Guyton-Klinger guardrail step.
 *
 * @param {{ multiplier: number, withdrawalRate: number, baseRate: number,
 *            bands: { upperPct: number, lowerPct: number, cutPct: number, raisePct: number } }} opts
 * @returns {{ multiplier: number, breach: "cut"|"raise"|null }}
 */
export function nextSpendingMultiplier({ multiplier, withdrawalRate, baseRate, bands }) {
  const upper = baseRate * (1 + (bands.upperPct || 0) / 100);
  const lower = baseRate * (1 - (bands.lowerPct || 0) / 100);
  if (withdrawalRate >= upper) {
    return { multiplier: multiplier * (1 - (bands.cutPct || 0) / 100), breach: "cut" };
  }
  if (withdrawalRate <= lower) {
    return { multiplier: multiplier * (1 + (bands.raisePct || 0) / 100), breach: "raise" };
  }
  return { multiplier, breach: null };
}
