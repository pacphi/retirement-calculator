import { C } from "../theme.js";
import { usd0 } from "../format.js";

/**
 * BridgeSummary — the gap years between the last paycheck and the year every benefit
 * (both Social Security checks + the pension) is online. This window is where the
 * portfolio alone carries the household, so its drawdown depth is the plan's real
 * pressure point. Everything here is derived live from the simulation rows.
 *
 * Props:
 *   rows           — simSS.rows (engine year rows); root: simSS.rows
 *   steadyStartAge — steady.startAgeA (age A when all benefits are online)
 */
export function BridgeSummary({ rows, steadyStartAge }) {
  if (!rows?.length || steadyStartAge == null) return null;
  // Bridge = first year with no wages through the year before steady state.
  const firstNoWage = rows.find((r) => (r.salA || 0) + (r.salB || 0) === 0);
  if (!firstNoWage || firstNoWage.aA >= steadyStartAge) return null; // no gap to speak of
  const bridge = rows.filter((r) => r.aA >= firstNoWage.aA && r.aA < steadyStartAge);
  if (!bridge.length) return null;

  const lastWorking = rows[rows.indexOf(firstNoWage) - 1] ?? null;
  const startBal = lastWorking ? lastWorking.bal : bridge[0].bal + (bridge[0].wd || 0);
  const endBal = bridge[bridge.length - 1].bal;
  const drawdown = startBal - endBal;
  const drawdownPct = startBal > 0 ? (drawdown / startBal) * 100 : 0;
  const peakWd = Math.max(...bridge.map((r) => r.wd || 0));
  // Guaranteed income (SS + pension + rental) as a share of the years' spending need.
  const guar = bridge.reduce((a, r) => a + (r.ssA || 0) + (r.ssB || 0) + (r.pens || 0) + (r.rent || 0), 0);
  const need = bridge.reduce((a, r) => a + (r.need || 0), 0);
  const coverage = need > 0 ? Math.round((guar / need) * 100) : 0;

  const tile = (label, value, detail) => (
    <div style={{ flex: "1 1 150px", background: "var(--surface-2)", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 11.5, color: C.slate, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 19, fontWeight: 600, color: C.ink }}>{value}</div>
      {detail && <div style={{ fontSize: 11, color: C.mut, marginTop: 2 }}>{detail}</div>}
    </div>
  );

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>The bridge years</div>
      <h3 style={{ margin: "2px 0 4px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>
        Ages {firstNoWage.aA}–{steadyStartAge - 1}: the portfolio carries you
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.slate, lineHeight: 1.5, maxWidth: 640 }}>
        Paychecks stop before every benefit has started, so withdrawals do the work until age {steadyStartAge}.
        This window is where a bad run of early returns bites hardest — it&apos;s what the sequence-stress toggle
        and Monte Carlo are for.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {tile("Bridge length", `${bridge.length} yrs`, `ages ${firstNoWage.aA}–${steadyStartAge - 1}`)}
        {tile("Portfolio drawdown", `−${usd0(Math.max(0, drawdown))}`, `−${drawdownPct.toFixed(1)}% from ${usd0(startBal)}`)}
        {tile("Peak annual withdrawal", usd0(peakWd), "grossed up for tax")}
        {tile("Covered by guaranteed income", `${coverage}%`, "Social Security + pension + rental vs. need")}
      </div>
    </div>
  );
}
