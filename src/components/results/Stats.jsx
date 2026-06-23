import { C } from "../theme.js";
import { usd0 } from "../format.js";

/**
 * Stats — 4-tile metrics grid.
 *
 * @param {{ steady: object, simSS: object, simNo: object, horizon: number, swr: number }} props
 */
export function Stats({ steady, simSS, simNo, horizon, swr }) {
  const lastsTxt = (d) => d ? `age ${d}` : `beyond ${horizon}`;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10, marginBottom:16 }}>
      {[
        { k:`Portfolio at age ${steady.startAgeA}`, v:usd0(steady.FV), s:`Invested savings + value of later property sales, when all income is flowing (work stopped, Social Security & pension started). @${(swr*100).toFixed(1)}% -> ${usd0(steady.wd)}/yr.` },
        { k:"Lifetime benefits", v:usd0(steady.guaranteed), s:`Social Security + WA pension before tax` },
        { k:"Savings last (tax-aware)", v:lastsTxt(simSS.depAge), s:`without SS: ${lastsTxt(simNo.depAge)}` },
        { k:"Federal tax", v:usd0(steady.tax), s:"Estimated with 2026 federal rules" },
      ].map((x,idx)=>(
        <div key={idx} className="rc-stat" style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:12, padding:"13px 14px" }}>
          <div style={{ fontSize:11, color:C.slate, fontWeight:600, marginBottom:5 }}>{x.k}</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:600, color:C.ink }}>{x.v}</div>
          <div style={{ fontSize:10.5, color:C.mut, marginTop:3, lineHeight:1.35 }}>{x.s}</div>
        </div>
      ))}
    </div>
  );
}
