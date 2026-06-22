import {
  ComposedChart, Area, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot,
} from "recharts";
import { C } from "../theme.js";
import { usd0, usdK } from "../format.js";

/**
 * LongRun chart panel — portfolio balance over time with/without SS and stress test,
 * plus optional Monte Carlo fan.
 *
 * Props:
 *   balRows        — array { age, withSS, withoutSS, stress }; root: balRows
 *   sellDots       — array { age, bal } for home-sale reference dots; root: sellDots
 *   mc             — Monte Carlo result object or null; root: mc
 *   mcRunning      — boolean, true while MC is computing; root: mcRunning
 *   onRunMc        — () => void, triggers MC run; root: runMc
 *   horizon        — plan horizon age (number); root: horizon
 *   ssMode         — "full" | "trustees" | "none" etc; root: s.ssMode
 *   effHaircut     — effective SS haircut fraction (0–1); root: effHaircut
 *   mcSummaryLines — (mc, horizon) => string[]; root: mcSummaryLines (imported from root)
 */
export function LongRun({
  balRows,
  sellDots,
  mc,
  mcRunning,
  onRunMc,
  horizon,
  ssMode,
  effHaircut,
  mcSummaryLines,
}) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 14px 12px", marginBottom:16 }}>
      <div style={{ padding:"0 4px 6px" }}>
        <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The long run</div>
        <h3 style={{ margin:"2px 0 2px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:19 }}>How far the savings stretch</h3>
        <p style={{ margin:"2px 0 8px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>The green line is your plan as modeled ({ssMode==="full"?"full SS":`${Math.round(effHaircut*100)}% SS`}). The clay dashed line drops Social Security entirely. The brass dotted line is a sequence-risk stress test — a market crash in your first retirement years (illustrative and milder than 2008; for the full downside range run Monte Carlo below).{sellDots.length>0?" The step up is an inherited home being sold.":""}</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={balRows} margin={{ top:6, right:14, left:4, bottom:0 }}>
          <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
          <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
          <Tooltip formatter={(v,n)=>[usd0(v), ({withSS:"With SS",withoutSS:"Without SS",stress:"Sequence-risk stress"}[n]??n)]} labelFormatter={(a)=>`Age ${a}`} contentStyle={{ borderRadius:8, border:`1px solid ${C.line}`, fontSize:12, fontFamily:"'JetBrains Mono',monospace" }} />
          <Line type="monotone" dataKey="withSS" stroke={C.viridian} strokeWidth={2.6} dot={false} name="withSS" />
          <Line type="monotone" dataKey="withoutSS" stroke={C.clay} strokeWidth={2} strokeDasharray="5 4" dot={false} name="withoutSS" />
          <Line type="monotone" dataKey="stress" stroke={C.brassDeep} strokeWidth={2} strokeDasharray="2 3" dot={false} name="stress" />
          {sellDots.map((d,i)=><ReferenceDot key={i} x={d.age} y={d.bal} r={4} fill={C.brass} stroke="#fff" strokeWidth={1.5} />)}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"6px 6px 2px" }}>
        <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.viridian, borderRadius:2 }} />With Social Security</span>
        <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.clay, borderRadius:2, borderTop:`2px dashed ${C.clay}` }} />Without SS</span>
        <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.slate }}><span style={{ width:16, height:3, background:C.brassDeep, borderRadius:2 }} />Sequence-risk stress</span>
      </div>
      <button onClick={onRunMc} disabled={mcRunning}
        style={{ marginTop:8, padding:"7px 14px", fontSize:12.5, fontWeight:600, cursor: mcRunning?"default":"pointer",
          background:C.viridian, color:"#fff", border:"none", borderRadius:6, opacity: mcRunning?0.6:1 }}>
        {mcRunning ? "Running 1,000 paths…" : "Run Monte Carlo (1,000 paths)"}
      </button>
      {mc && (
        <div style={{ marginTop:10, padding:"10px 12px", background:C.paper, border:`1px solid ${C.line}`, borderRadius:8, fontSize:12.5, color:C.ink }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>Monte Carlo · {mc.paths.toLocaleString()} paths</div>
          {mcSummaryLines(mc, horizon).map((line, i) => <div key={i}>{line}</div>)}
          <div style={{ color:C.slate, marginTop:4 }}>
            Sustainable income range: {usd0(mc.sustainableIncome.p10)} – {usd0(mc.sustainableIncome.p90)}/yr (10th–90th pct).
          </div>
        </div>
      )}
      {mc && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:4, paddingLeft:4 }}>Monte Carlo · percentile fan</div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={mc.balanceFan} margin={{ top:6, right:14, left:4, bottom:0 }}>
              <CartesianGrid stroke={C.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={{ stroke:C.line }} />
              <YAxis tickFormatter={usdK} tick={{ fontSize:11, fill:C.slate }} tickLine={false} axisLine={false} width={42} />
              <Area type="monotone" dataKey="p90" stroke="none" fill={C.viridian} fillOpacity={0.12} />
              <Area type="monotone" dataKey="p10" stroke="none" fill="#fff" fillOpacity={1} />
              <Line type="monotone" dataKey="p50" stroke={C.viridian} strokeWidth={2.4} dot={false} />
              <Line type="monotone" dataKey="p10" stroke={C.clay} strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:14, flexWrap:"wrap", padding:"4px 6px 2px" }}>
            <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:11, height:11, borderRadius:3, background:C.viridian, opacity:0.25 }} />p10–p90 band</span>
            <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:16, height:3, background:C.viridian, borderRadius:2 }} />p50 median</span>
            <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11.5, color:C.slate }}><span style={{ width:16, height:0, borderTop:`2px dashed ${C.clay}` }} />p10 worst-case</span>
          </div>
        </div>
      )}
    </div>
  );
}
