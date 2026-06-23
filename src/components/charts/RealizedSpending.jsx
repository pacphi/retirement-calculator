import { C } from "../theme.js";
import { usd0 } from "../format.js";
import { SOURCES } from "../../retirementData.js";

/**
 * RealizedSpending chart panel — displayed when guardrails strategy is active.
 *
 * Shows the p10/p50/p90 distribution of realized annual spending (total need,
 * already scaled by each path's accumulated spendMult) across 1,000 MC paths.
 *
 * Props:
 *   realizedSpending — { p10, p50, p90 } from runMonteCarlo, or null
 */
export function RealizedSpending({ realizedSpending }) {
  if (!realizedSpending) return null;

  const { p10, p50, p90 } = realizedSpending;

  return (
    <div style={{ marginTop: 18, padding: "14px 16px", border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, letterSpacing: 0.3, marginBottom: 10 }}>
        Realized spending — guardrails distribution
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 3 }}>10th pct</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.clay }}>{usd0(p10)}</div>
          <div style={{ fontSize: 10, color: C.slate }}>lean paths</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 3 }}>Median</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.viridian }}>{usd0(p50)}</div>
          <div style={{ fontSize: 10, color: C.slate }}>typical path</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: C.slate, marginBottom: 3 }}>90th pct</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.brass }}>{usd0(p90)}</div>
          <div style={{ fontSize: 10, color: C.slate }}>rich paths</div>
        </div>
      </div>

      <p style={{ fontSize: 11, color: C.slate, lineHeight: 1.5, margin: 0 }}>
        Guardrails trade a higher starting spend for variability — each band is a
        percentile of realized spending across 1,000 paths.{" "}
        <a href={SOURCES.kitcesGuardrails} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
          Kitces
        </a>
        {" / "}
        <a href={SOURCES.morningstarGuardrails} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
          Morningstar
        </a>
        .
      </p>
    </div>
  );
}
