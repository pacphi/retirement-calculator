import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell,
} from "recharts";
import { monthlyBreakdown, yearMilestones } from "../../finance/breakdown.js";
import { C, SRC } from "../theme.js";
import { Segmented, Chevron } from "../atoms/index.jsx";

const usd0 = (x) => (x < 0 ? "-$" : "$") + Math.abs(Math.round(x)).toLocaleString();
const usdK = (x) => Math.abs(x) >= 1000 ? "$" + Math.round(x / 1000) + "k" : "$" + Math.round(x);

/**
 * YearByYear navigator panel — income vs. expenses for a selected calendar year,
 * with prev/next controls, a year slider, play/pause, a month-vs-year view toggle,
 * a mirrored bar chart, an income-composition donut, and milestone badges.
 *
 * Props:
 *   rows          — full simulation row array; root expression: simSS.rows
 *   depAge        — portfolio depletion age (number | null); root: simSS.depAge
 *   inputs        — full state object (s); root: s  (used by yearMilestones)
 *   selYear       — currently selected calendar year (number | null); root: selYear
 *   onYearChange  — (year: number) => void; root: setSelYear
 *   playing       — whether the auto-play timer is active (boolean); root: playing
 *   onSetPlaying  — (bool) => void; root: setPlaying
 *   view          — "month" | "year"; root: ybyView
 *   onViewChange  — (v: string) => void; root: setYbyView
 *   open          — whether the panel body is expanded (boolean); root: ybyOpen
 *   onToggleOpen  — () => void; root: inline collapse-button handler
 */
export function YearByYear({
  rows,
  depAge,
  inputs,
  selYear,
  onYearChange,
  playing,
  onSetPlaying,
  view,
  onViewChange,
  open,
  onToggleOpen,
}) {
  const yrMin = rows[0]?.cal ?? 2026;
  const yrMax = rows[rows.length - 1]?.cal ?? yrMin;
  const defaultYear = (rows.find(r => r.salA === 0 && r.salB === 0) ?? rows[0] ?? {}).cal ?? yrMin;
  const activeYear = Math.min(yrMax, Math.max(yrMin, selYear ?? defaultYear));
  const selIdx = rows.findIndex(r => r.cal === activeYear);
  const selRow = rows[selIdx] || rows[0];
  const mb = selRow ? monthlyBreakdown(selRow) : null;
  const milestones = selRow ? yearMilestones(selRow, rows[selIdx - 1], inputs, depAge) : [];
  const ybyScale = view === "year" ? 12 : 1;
  const ybyUnit = view === "year" ? "/yr" : "/mo";
  const sc = (v) => v * ybyScale;
  const mbInc = mb ? [
    ["Salary (you)", sc(mb.income.salA), SRC.salA], ["Salary (spouse)", sc(mb.income.salB), SRC.salB],
    ["Rental", sc(mb.income.rent), SRC.rent], ["Pension", sc(mb.income.pens), SRC.pension],
    ["SS (you)", sc(mb.income.ssA), SRC.ssA], ["SS (spouse)", sc(mb.income.ssB), SRC.ssB],
    ["Portfolio draw", sc(mb.draw), SRC.wd],
  ].filter(([, v]) => v > 0) : [];
  const mbExp = mb ? [
    ["Living", sc(mb.expenses.living), C.slate], ["Travel / one-time", sc(mb.expenses.extra), "#A98B5A"],
    ["Taxes", sc(mb.expenses.tax), C.clay],
  ].filter(([, v]) => v > 0) : [];
  const monthBar = mb ? [{ name: "mo",
    ...Object.fromEntries(mbInc.map(([n, v]) => [n, v])),
    ...Object.fromEntries(mbExp.map(([n, v]) => [n, -v])),
  }] : [];
  const milestoneColor = { income: SRC.ssA, life: C.brassDeep, tax: C.clay, spend: "#A98B5A" };

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 14px 14px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, padding: "0 4px 6px" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Year by year</div>
          <h3 style={{ margin: "2px 0 2px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>{view === "year" ? `The year ${activeYear}` : `A month in the life of ${activeYear}`}</h3>
          {open && <p style={{ margin: "2px 0 10px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>Advance through the plan one year at a time. Bars show a {view === "year" ? <b style={{ color: C.ink }}>full year</b> : <b style={{ color: C.ink }}>typical month</b>} {view === "year" ? "(the year's totals)" : "(the year's totals ÷ 12)"}: income rises above the line, spending drops below it, and the <b style={{ color: C.brassDeep }}>gold</b> portfolio draw bridges whatever the other income doesn't cover. One-time events are flagged below — they land in the year, not a specific month. Tip: click a year on the staircase above to jump here.</p>}
        </div>
        <button type="button" aria-label={open ? "collapse year by year" : "expand year by year"} aria-expanded={open} onClick={onToggleOpen}
          style={{ flex: "0 0 auto", border: `1px solid ${C.line}`, background: C.panel, borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: C.slate, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Chevron up={open} />
        </button>
      </div>

      {open && <>
      {/* View toggle */}
      <div style={{ display: "flex", padding: "2px 4px 8px", maxWidth: 280 }}>
        <Segmented value={view} onChange={onViewChange} options={[{ label: "Typical month", value: "month" }, { label: "Full year", value: "year" }]} />
      </div>

      {/* Navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 4px 6px", flexWrap: "wrap" }}>
        <button type="button" aria-label="previous year" onClick={() => onYearChange(Math.max(yrMin, activeYear - 1))} disabled={activeYear <= yrMin}
          style={{ border: `1px solid ${C.line}`, background: C.panel, borderRadius: 8, width: 32, height: 32, cursor: activeYear <= yrMin ? "default" : "pointer", color: C.ink, fontSize: 15, opacity: activeYear <= yrMin ? 0.4 : 1 }}>◀</button>
        <input type="range" aria-label="select year" min={yrMin} max={yrMax} step={1} value={activeYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          style={{ flex: "1 1 180px", minWidth: 140, accentColor: C.brass, cursor: "pointer" }} />
        <button type="button" aria-label="next year" onClick={() => onYearChange(Math.min(yrMax, activeYear + 1))} disabled={activeYear >= yrMax}
          style={{ border: `1px solid ${C.line}`, background: C.panel, borderRadius: 8, width: 32, height: 32, cursor: activeYear >= yrMax ? "default" : "pointer", color: C.ink, fontSize: 15, opacity: activeYear >= yrMax ? 0.4 : 1 }}>▶</button>
        <button type="button" aria-label={playing ? "pause" : "play"} aria-pressed={playing}
          onClick={() => { if (playing) { onSetPlaying(false); } else { onYearChange(activeYear >= yrMax ? yrMin : activeYear); onSetPlaying(true); } }}
          style={{ border: `1px solid ${C.line}`, background: playing ? C.ink : C.panel, color: playing ? "#fff" : C.ink, borderRadius: 8, padding: "0 12px", height: 32, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: C.ink, minWidth: 150 }}>{activeYear} · You {selRow?.aA} · Spouse {selRow?.aB}</span>
      </div>

      {/* Milestone badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "2px 4px 10px", minHeight: 8 }}>
        {milestones.length === 0
          ? <span style={{ fontSize: 11.5, color: C.mut }}>No notable events this year — a steady year.</span>
          : milestones.map(ev => (
            <span key={ev.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: milestoneColor[ev.kind] || C.slate, background: (milestoneColor[ev.kind] || C.slate) + "18", border: `1px solid ${(milestoneColor[ev.kind] || C.slate)}40`, borderRadius: 999, padding: "3px 9px" }}>
              {ev.label}{ev.amount ? ` · ${usd0(ev.amount)}` : ""}
            </span>
          ))}
      </div>

      {/* Chart + donut + summary */}
      <div style={{ display: "grid", gap: 14, alignItems: "center" }} className="rc-yby-grid">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={monthBar} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} stackOffset="sign">
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={false} axisLine={{ stroke: C.line }} height={1} />
            <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={46} />
            <Tooltip formatter={(v, n) => [usd0(Math.abs(v)) + ybyUnit, n]} labelFormatter={() => view === "year" ? `Full year ${activeYear}` : `A typical month in ${activeYear}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <ReferenceLine y={0} stroke={C.slate} strokeWidth={1} />
            {mbInc.map(([n,, c]) => (<Bar key={n} dataKey={n} stackId="mo" fill={c} />))}
            {mbExp.map(([n,, c]) => (<Bar key={n} dataKey={n} stackId="mo" fill={c} />))}
          </ComposedChart>
        </ResponsiveContainer>
        <div>
          <div style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mbInc.map(([n, v, c]) => ({ name: n, value: Math.round(v), color: c }))} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={2} stroke="none">
                  {mbInc.map(([n,, c]) => (<Cell key={n} fill={c} />))}
                </Pie>
                <Tooltip formatter={(v, n) => [usd0(v) + ybyUnit, n]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", fontSize: 10.5, color: C.mut, marginTop: -2 }}>where the money comes from</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {[[`Income${ybyUnit}`, mb ? (mb.incomeTotalMo + mb.draw) * ybyScale : 0, C.viridian],
              [`Expenses${ybyUnit}`, mb ? mb.expenseTotalMo * ybyScale : 0, C.clay]].map(([k, v, col]) => (
              <div key={k} style={{ background: "#FCFAF4", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ fontSize: 10.5, color: C.slate, fontWeight: 600 }}>{k}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: col }}>{usd0(v)}</div>
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", background: (mb && mb.netMo >= -1 ? C.viridian : C.clay) + "12", border: `1px solid ${(mb && mb.netMo >= -1 ? C.viridian : C.clay)}40`, borderRadius: 9, padding: "8px 10px" }}>
              <div style={{ fontSize: 10.5, color: C.slate, fontWeight: 600 }}>{selRow && (selRow.salA > 0 || selRow.salB > 0) ? `Surplus${ybyUnit} (to savings)` : "Net after the savings draw"}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: mb && mb.netMo >= -1 ? C.viridian : C.clay }}>{mb ? (mb.netMo >= 0 ? "+" : "") + usd0(mb.netMo * ybyScale) : "$0"}{mb && Math.abs(mb.netMo * ybyScale) < 1 ? "  ·  balanced" : ""}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Annual context line */}
      {selRow && <div style={{ fontSize: 11.5, color: C.slate, padding: "10px 6px 0", lineHeight: 1.5 }}>
        <b style={{ color: C.ink }}>{activeYear} in full:</b> income {usd0((selRow.salA + selRow.salB + selRow.rent + selRow.pens + selRow.ssA + selRow.ssB) + (selRow.wdSpend ?? selRow.wd))}/yr · spending {usd0(selRow.need)}/yr · taxes {usd0(selRow.tax)}/yr · savings draw {usd0(selRow.wdSpend ?? selRow.wd)}/yr · portfolio left {usd0(selRow.bal)}.
      </div>}

      {/* Legend */}
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", padding: "10px 6px 2px" }}>
        {[...mbInc, ...mbExp].map(([n,, c]) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.slate }}><span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{n}</span>
        ))}
      </div>
      </>}
    </div>
  );
}
