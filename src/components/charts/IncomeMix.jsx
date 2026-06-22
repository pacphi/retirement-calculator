import { C } from "../theme.js";

const usd0 = (x) => (x < 0 ? "-$" : "$") + Math.abs(Math.round(x)).toLocaleString();

/**
 * IncomeMix panel — horizontal proportional bar + legend for sustainable income sources.
 *
 * Props:
 *   incomeStack  — array { name, value, color }; root: incomeStack
 *   steadyGross  — total gross sustainable income (number); root: steady.gross
 */
export function IncomeMix({ incomeStack, steadyGross }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700, marginBottom:2 }}>Steady state</div>
      <h3 style={{ margin:"0 0 12px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:18 }}>Sustainable income mix: {usd0(steadyGross)}/yr</h3>
      <div style={{ display:"flex", height:26, borderRadius:7, overflow:"hidden", marginBottom:10 }}>
        {incomeStack.map((seg,idx)=>(<div key={idx} title={`${seg.name}: ${usd0(seg.value)}`} style={{ width:`${(seg.value/steadyGross)*100}%`, background:seg.color }} />))}
      </div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
        {incomeStack.map((seg,idx)=>(<div key={idx} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5 }}>
          <span style={{ width:11, height:11, borderRadius:3, background:seg.color }} /><span style={{ color:C.slate }}>{seg.name}</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:C.ink }}>{usd0(seg.value)}</span></div>))}
      </div>
    </div>
  );
}
