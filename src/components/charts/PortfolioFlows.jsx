import {
  ComposedChart, Bar, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine,
} from "recharts";
import { BUCKETS, C, FLOWS } from "../theme.js";
import { Segmented, Select } from "../atoms/index.jsx";
import { usd0, usdK } from "../format.js";
import { ChartFrame } from "./chartFrame.jsx";
import { milestoneLabel } from "./annotations.jsx";

const invName = {
  growth: "Growth",
  contrib: "Contributions",
  spendDraw: "Spending draw",
  forcedRmd: "Forced RMD",
  reinvest: "Surplus reinvested",
  contribMo: "Contributions /mo",
  reinvestMo: "Surplus reinvested /mo",
  rmdRecycleMo: "RMD recycled after tax /mo",
  deferred: "Tax-deferred (401k/IRA)",
  afterTax: "After-tax (Roth/taxable)",
  rmd: "RMD this year",
  taxableBal: "Taxable",
  deferredBal: "Tax-deferred (401k/IRA)",
  rothBal: "Roth",
};

// Wave 3 D1: the withdrawal order surfaced as a control. The engine draws buckets in the
// chosen sequence (splitWithdrawal), so all six permutations of taxable/deferred/roth are
// valid; each is offered. `value` is the full order joined ("taxable-deferred-roth"), so the
// control distinguishes every permutation rather than collapsing to the first bucket.
const DEFAULT_WITHDRAWAL_ORDER = ["taxable", "deferred", "roth"];
const WITHDRAWAL_ORDER_OPTIONS = [
  ["taxable", "deferred", "roth"],
  ["taxable", "roth", "deferred"],
  ["deferred", "taxable", "roth"],
  ["deferred", "roth", "taxable"],
  ["roth", "taxable", "deferred"],
  ["roth", "deferred", "taxable"],
].map((order) => ({
  order,
  value: order.join("-"),
  label: order.map((b) => ({ taxable: "Taxable", deferred: "Tax-deferred", roth: "Roth" }[b])).join(" → "),
}));
const orderKey = (order) => (Array.isArray(order) && order.length ? order : DEFAULT_WITHDRAWAL_ORDER).join("-");

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
export function PortfolioFlows({ invRows, firstRmdAge, view, onViewChange, withdrawalOrder, onWithdrawalOrderChange, printWidth }) {
  // "Money going back in" view: the three engines that refill the portfolio, as honest
  // per-month rates (annual ÷ 12). All derived live from the simulation rows.
  const reinvRows = invRows.map((r) => ({
    age: r.age,
    contribMo: Math.round((r.contrib || 0) / 12),
    reinvestMo: Math.round((r.reinvest || 0) / 12),
    rmdRecycleMo: Math.round((r.rmdReinvest || 0) / 12),
  }));
  const lastContribAge = invRows.reduce((a, r) => (r.contrib > 0 ? r.age : a), null);
  const reinvestStartAge = invRows.find((r) => (r.reinvest || 0) > 0 || (r.rmdReinvest || 0) > 0)?.age ?? null;
  const gapStart = lastContribAge != null ? lastContribAge + 1 : null;
  const gapEnd = reinvestStartAge != null ? reinvestStartAge - 1 : null;
  const hasGap = gapStart != null && gapEnd != null && gapEnd >= gapStart;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 14px 12px", marginBottom: 16 }}>
      <div style={{ padding: "0 4px 6px" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>Inside the portfolio</div>
        <h3 style={{ margin: "2px 0 2px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 19 }}>What&apos;s happening to your investments</h3>
        <p style={{ margin: "2px 0 8px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>{
          view === "reinvest"
            ? <>Three engines refill the portfolio, and they never overlap: <b style={{ color: FLOWS.contrib }}>contributions</b> while the paychecks last{hasGap ? <>; then between ages <b style={{ color: C.ink }}>{gapStart}–{gapEnd}</b> nothing goes back in — every dollar flows out</> : null}{reinvestStartAge != null ? <>; then from age <b style={{ color: C.ink }}>{reinvestStartAge}</b>, once guaranteed income exceeds spending, the leftover <b style={{ color: FLOWS.reinvest }}>surplus</b> and the after-tax remainder of each <b style={{ color: FLOWS.rmdRecycle }}>forced RMD</b> go straight back into the taxable bucket</> : null}. Shown per month (the year&apos;s figure ÷ 12).</>
            : view === "flow"
            ? <>Money moving in and out each year. <b style={{ color: C.ink }}>Above</b> the line: contributions while you&apos;re still working, then investment growth. <b style={{ color: FLOWS.reinvest }}>Violet</b> bars show years your guaranteed income exceeds need — the surplus is reinvested into the taxable bucket. <b style={{ color: C.ink }}>Below</b>: the cash you actually draw for spending, plus any forced RMD.{firstRmdAge != null ? <> Forced RMDs start at <b style={{ color: C.clay }}>age {firstRmdAge}</b>.</> : <> No forced RMDs in this plan.</>}</>
            : <>Your savings split by tax treatment. The <b style={{ color: BUCKETS.deferred }}>deep-blue</b> band is pre-tax 401(k)/IRA money (subject to RMDs); the paler bands are taxable and Roth money. {firstRmdAge != null ? <>After <b style={{ color: C.clay }}>age {firstRmdAge}</b>, RMDs draw down the pre-tax band — the after-tax remainder is reinvested, growing the taxable band, so the total keeps climbing.</> : <>With no pre-tax balance there are no RMDs to model.</>}{view === "bucketsRmd" ? <> The <b style={{ color: C.clay }}>red line</b> is each year&apos;s required distribution (right axis).</> : null}</>
        }</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, alignItems: "center" }}>
          <Segmented value={view} onChange={onViewChange} options={[{ label: "Cash flow", value: "flow" }, { label: "Money going back in", value: "reinvest" }, { label: "Tax buckets", value: "buckets" }, { label: "Buckets + RMD", value: "bucketsRmd" }]} />
          {onWithdrawalOrderChange && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.slate }}>
              <span aria-hidden="true">Withdrawal order</span>
              <Select
                aria-label="Withdrawal order"
                value={orderKey(withdrawalOrder)}
                onChange={(v) => onWithdrawalOrderChange((WITHDRAWAL_ORDER_OPTIONS.find((o) => o.value === v) || WITHDRAWAL_ORDER_OPTIONS[0]).order)}
                options={WITHDRAWAL_ORDER_OPTIONS.map(({ label, value }) => ({ label, value }))}
              />
            </div>
          )}
        </div>
      </div>
      <ChartFrame printWidth={printWidth} height={244}>
        {view === "reinvest" ? (
          <ComposedChart data={reinvRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v, n) => [`${usd0(Math.abs(v))}/mo`, invName[n] || n]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <Bar dataKey="contribMo" stackId="r" fill={FLOWS.contrib} />
            <Bar dataKey="reinvestMo" stackId="r" fill={FLOWS.reinvest} />
            <Bar dataKey="rmdRecycleMo" stackId="r" fill={FLOWS.rmdRecycle} />
            {firstRmdAge != null && <ReferenceLine x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={milestoneLabel(`RMDs · ${firstRmdAge}`, { anchor: "start", color: C.clay })} />}
          </ComposedChart>
        ) : view === "flow" ? (
          <ComposedChart data={invRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }} stackOffset="sign">
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v, n) => [usd0(Math.abs(v)), invName[n] || n]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <ReferenceLine y={0} stroke={C.slate} strokeWidth={1} />
            <Bar dataKey="growth" stackId="f" fill={FLOWS.growth} />
            <Bar dataKey="contrib" stackId="f" fill={FLOWS.contrib} />
            {/* Wave 3 D2: surplus reinvest — guaranteed income exceeds need; positive bar */}
            <Bar dataKey="reinvest" stackId="f" fill={FLOWS.reinvest} />
            <Bar dataKey="spendDraw" stackId="f" fill={FLOWS.spendDraw} />
            <Bar dataKey="forcedRmd" stackId="f" fill={FLOWS.forcedRmd} />
            {firstRmdAge != null && <ReferenceLine x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={milestoneLabel(`RMDs · ${firstRmdAge}`, { anchor: "start", color: C.clay })} />}
          </ComposedChart>
        ) : (
          <ComposedChart data={invRows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={{ stroke: C.line }} />
            <YAxis yAxisId="bal" tickFormatter={usdK} tick={{ fontSize: 11, fill: C.slate }} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v, n) => [usd0(Math.abs(v)), invName[n] || n]} labelFormatter={(a) => `Age ${a}`} contentStyle={{ borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            <Area yAxisId="bal" type="monotone" dataKey="taxableBal" stackId="bal" stroke="none" fill={BUCKETS.taxable} fillOpacity={0.9} />
            <Area yAxisId="bal" type="monotone" dataKey="deferredBal" stackId="bal" stroke="none" fill={BUCKETS.deferred} fillOpacity={0.9} />
            <Area yAxisId="bal" type="monotone" dataKey="rothBal" stackId="bal" stroke="none" fill={BUCKETS.roth} fillOpacity={0.9} />
            {view === "bucketsRmd" && <YAxis yAxisId="rmd" orientation="right" tickFormatter={usdK} tick={{ fontSize: 11, fill: C.clay }} tickLine={false} axisLine={false} width={42} />}
            {view === "bucketsRmd" && <Line yAxisId="rmd" type="monotone" dataKey="rmd" stroke="var(--c6)" strokeWidth={2} dot={false} />}
            {firstRmdAge != null && <ReferenceLine yAxisId="bal" x={firstRmdAge} stroke={C.clay} strokeWidth={1.2} strokeDasharray="2 2" label={milestoneLabel(`RMDs · ${firstRmdAge}`, { anchor: "start", color: C.clay })} />}
          </ComposedChart>
        )}
      </ChartFrame>
      <div style={{ display: "flex", gap: "6px 14px", flexWrap: "wrap", padding: "8px 6px 2px" }}>
        {(view === "flow"
          ? [["Contributions", FLOWS.contrib], ["Surplus reinvested", FLOWS.reinvest], ["Growth", FLOWS.growth], ["Spending draw", FLOWS.spendDraw], ["Forced RMD", FLOWS.forcedRmd]]
          : view === "reinvest"
          ? [["Contributions", FLOWS.contrib], ["Surplus reinvested", FLOWS.reinvest], ["RMD recycled after tax", FLOWS.rmdRecycle]]
          : [["Taxable", BUCKETS.taxable], ["Tax-deferred (401k/IRA)", BUCKETS.deferred], ["Roth", BUCKETS.roth], ...(view === "bucketsRmd" ? [["RMD this year", "var(--c6)"]] : [])]
        ).map(([n, c]) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.slate }}><span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />{n}</span>
        ))}
      </div>
    </div>
  );
}
