import {
  ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { C, SRC } from "../theme.js";
import { Segmented } from "../atoms/index.jsx";
import { usd0, usdK } from "../format.js";

const invName = {
  growth: "Growth",
  contrib: "Contributions",
  spendDraw: "Spending draw",
  forcedRmd: "Forced RMD",
  deferred: "Tax-deferred (401k/IRA)",
  afterTax: "After-tax (Roth/taxable)",
  rmd: "RMD this year",
};

/**
 * PortfolioFlows chart panel — what's happening inside the investment portfolio,
 * with a three-way view toggle (cash-flow, tax-buckets, buckets+RMD).
 *
 * Props:
 *   invRows       — array of row objects { age, deferred, afterTax, contrib, growth,
 *                   spendDraw, forcedRmd, rmd }; root expression: invRows
 *   firstRmdAge   — age at which forced RMDs begin (number | null); root: firstRmdAge
 *   view          — "flow" | "buckets" | "bucketsRmd"; root expression: invView
 *   onViewChange  — (v: string) => void; root: setInvView
 */
export function PortfolioFlows({ invRows, firstRmdAge, view, onViewChange }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 14px 12px", marginBottom: 16 }}>
      <div style={{ padding: "0 4px 6px" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Inside the portfolio</div>
        <h3 style={{ margin: "2px 0 2px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>What&apos;s happening to your investments</h3>
        <p style={{ margin: "2px 0 8px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>{
          view === "flow"
            ? <>Money moving in and out each year. <b style={{ color: C.ink }}>Above</b> the line: contributions while you&apos;re still working, then investment growth. <b style={{ color: C.ink }}>Below</b>: the cash you actually draw for spending, plus any forced RMD.{firstRmdAge != null ? <> Forced RMDs start at <b style={{ color: C.clay }}>age {firstRmdAge}</b>.</> : <> No forced RMDs in this plan.</>}</>
            : <>Your savings split by tax treatment. The <b style={{ color: C.brassDeep }}>gold</b> band is pre-tax 401(k)/IRA money (subject to RMDs); the <b style={{ color: C.viridian }}>green</b> band is Roth/after-tax. {firstRmdAge != null ? <>After <b style={{ color: C.clay }}>age {firstRmdAge}</b>, RMDs draw down the gold band — the after-tax remainder is reinvested, growing the green band, so the total keeps climbing.</> : <>With no pre-tax balance there are no RMDs to model.</>}{view === "bucketsRmd" ? <> The <b style={{ color: C.clay }}>clay line</b> is each year&apos;s required distribution (right axis).</> : null}</>
        }</p>
        <div style={{ display: "flex", marginTop: 4 }}>
          <Segmented value={view} onChange={onViewChange} options={[{ label: "Cash flow", value: "flow" }, { label: "Tax buckets", value: "buckets" }, { label: "Buckets + RMD", value: "bucketsRmd" }]} />
        </div>
      </div>
      <ResponsiveContainer width="100%" height={244}>
        {view === "flow" ? (
          <ComposedChart data={invRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} stackOffset="sign">
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v, n) => [usd0(Math.abs(v)), invName[n] || n]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <ReferenceLine y={0} stroke={C.slate} strokeWidth={1} />
            <Bar dataKey="growth" stackId="f" fill={SRC.ssB} />
            <Bar dataKey="contrib" stackId="f" fill={C.viridian} />
            <Bar dataKey="spendDraw" stackId="f" fill={C.brass} />
            <Bar dataKey="forcedRmd" stackId="f" fill={C.clay} />
            {firstRmdAge != null && <ReferenceLine x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={{ value: `RMDs · ${firstRmdAge}`, position: "insideTopRight", fontSize: 10.5, fill: C.clay }} />}
          </ComposedChart>
        ) : (
          <ComposedChart data={invRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis yAxisId="bal" tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v, n) => [usd0(Math.abs(v)), invName[n] || n]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <Area yAxisId="bal" type="monotone" dataKey="deferred" stackId="bal" stroke="none" fill={C.brass} fillOpacity={0.85} />
            <Area yAxisId="bal" type="monotone" dataKey="afterTax" stackId="bal" stroke="none" fill={C.viridian} fillOpacity={0.7} />
            {view === "bucketsRmd" && <YAxis yAxisId="rmd" orientation="right" tickFormatter={usdK} tick={{ fontSize: 11, fill: C.clay }} tickLine={false} axisLine={false} width={42} />}
            {view === "bucketsRmd" && <Line yAxisId="rmd" type="monotone" dataKey="rmd" stroke={C.clay} strokeWidth={2} dot={false} />}
            {firstRmdAge != null && <ReferenceLine yAxisId="bal" x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={{ value: `RMDs · ${firstRmdAge}`, position: "insideTopRight", fontSize: 10.5, fill: C.clay }} />}
          </ComposedChart>
        )}
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", padding: "8px 6px 2px" }}>
        {(view === "flow"
          ? [["Contributions", C.viridian], ["Growth", SRC.ssB], ["Spending draw", C.brass], ["Forced RMD", C.clay]]
          : [["Tax-deferred (401k/IRA)", C.brass], ["After-tax (Roth/taxable)", C.viridian], ...(view === "bucketsRmd" ? [["RMD this year", C.clay]] : [])]
        ).map(([n, c]) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.slate }}><span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{n}</span>
        ))}
      </div>
    </div>
  );
}
