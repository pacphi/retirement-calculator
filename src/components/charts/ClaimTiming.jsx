import { useMemo } from "react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { calculatePlan } from "../../finance/plan.js";
import { C } from "../theme.js";
import { usd0, usdK } from "../format.js";
import { ChartFrame } from "./chartFrame.jsx";

const FRA = 67;

/**
 * ClaimTiming — what changes if both Social Security claims move to full retirement
 * age (67). Runs a real second engine pass off the CURRENT inputs (nothing is
 * pre-baked), so it re-derives whenever any input changes. If both claims are
 * already at FRA, the comparison flips to claiming at 65 instead.
 *
 * Props:
 *   s          — full plan state; root: s
 *   rows       — current simulation rows (simSS.rows)
 *   steadyNet  — current steady-state net income (steady.net)
 */
export function ClaimTiming({ s, rows, steadyNet, printWidth }) {
  const bothAtFra = Number(s.claimA) === FRA && Number(s.claimB) === FRA;
  const altClaim = bothAtFra ? 65 : FRA;
  const alt = useMemo(
    () => calculatePlan({ ...s, claimA: altClaim, claimB: altClaim }),
    [s, altClaim],
  );
  const altRows = alt.simChosen.rows;
  const data = useMemo(() => rows.map((r, i) => ({
    age: r.aA,
    current: r.bal,
    alt: altRows[i] ? altRows[i].bal : null,
  })), [rows, altRows]);

  const deltaNet = Math.round(alt.steady.net - steadyNet);
  const crossRow = data.find((d) => d.age > Math.max(Number(s.claimA) || 0, altClaim) && d.alt != null && d.alt > d.current);
  const currentLabel = `Claim at ${s.claimA}${s.claimB !== s.claimA ? `/${s.claimB}` : ""} (current)`;
  const altLabel = `Claim at ${altClaim} (both)`;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 14px 12px", marginBottom: 16 }}>
      <div style={{ padding: "0 4px 6px" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Claim timing</div>
        <h3 style={{ margin: "2px 0 2px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>What claiming at {altClaim} would change</h3>
        <p style={{ margin: "2px 0 8px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
          Same plan, only the Social Security claim ages move. Claiming {altClaim > Math.min(Number(s.claimA), Number(s.claimB)) ? "later leans harder on the portfolio first" : "earlier draws less from the portfolio up front"} —
          steady income {deltaNet >= 0 ? "rises" : "falls"} by <b style={{ color: C.ink }}>{usd0(Math.abs(deltaNet))}/yr</b> ({usd0(alt.steady.net)} vs {usd0(steadyNet)})
          {crossRow ? <>, and the balance lines cross back around age <b style={{ color: C.ink }}>{crossRow.age}</b></> : null}.
          Recomputed live from your current inputs.
        </p>
      </div>
      <ChartFrame printWidth={printWidth} height={200}>
        <LineChart data={data} margin={{ top: 6, right: 14, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
          <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
          <Tooltip formatter={(v, n) => [usd0(v), n === "current" ? currentLabel : altLabel]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
          <Line type="monotone" dataKey="current" stroke="var(--c1)" strokeWidth={2.4} dot={false} name="current" />
          <Line type="monotone" dataKey="alt" stroke="var(--c8)" strokeWidth={2} dot={false} name="alt" />
        </LineChart>
      </ChartFrame>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "6px 6px 2px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.slate }}><span style={{ width: 16, height: 3, background: "var(--c1)", borderRadius: 2 }} />{currentLabel}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.slate }}><span style={{ width: 16, height: 3, background: "var(--c8)", borderRadius: 2 }} />{altLabel}</span>
      </div>
    </div>
  );
}
