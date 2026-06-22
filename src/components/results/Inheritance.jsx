import { C } from "../theme.js";
import { propEcon } from "../../calculatorCore.js";
import { PROP } from "../../retirementData.js";
import { usd0 } from "../format.js";

function PropCard({ keyName, s, setProp }) {
  const p = s[keyName], meta = PROP[keyName], e = propEcon(keyName, Number(p.value)||0);
  const opts = [["sell","Sell","sell"],["rent","Rent out","rent"],["live","Live in","live"]];
  const chosen = p.strategy;
  return (
    <div style={{ border:`1px solid ${C.line}`, borderRadius:12, padding:"14px 15px", marginBottom:12, background:"#FCFAF4" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
        <h4 style={{ margin:0, fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:17, color:C.ink }}>{meta.label}</h4>
        <span style={{ fontSize:11, color:C.mut }}>arrives {p.year}</span>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {opts.map(([v,lab])=>{
          const on=chosen===v; const num = v==="sell"?e.sell : v==="rent"?e.rent : e.live;
          const unit = v==="sell"?"net":"/yr";
          return (
            <button key={v} onClick={()=>setProp(keyName,"strategy")(v)} style={{ flex:1, textAlign:"left", border:`1.5px solid ${on?C.brass:C.line}`, background:on?"#fff":"transparent", borderRadius:9, padding:"9px 10px", cursor:"pointer", fontFamily:"inherit" }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:on?C.brassDeep:C.slate, marginBottom:3 }}>{lab}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color: num<0?C.clay:C.ink }}>{usd0(num)}<span style={{ fontSize:10, color:C.mut, fontWeight:400 }}>{unit}</span></div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F1EEE5", borderRadius:8, padding:"8px 10px" }}>
        <b style={{ color:C.ink }}>{chosen==="sell"?"If sold:":chosen==="rent"?"If rented:":"If you live in it:"}</b> {meta.notes[chosen]}
      </div>
    </div>
  );
}

/**
 * Inheritance result panel — what to do with each home.
 *
 * @param {{ s: object, setProp: function }} props
 */
export function Inheritance({ s, setProp }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>The estate</div>
      <h3 style={{ margin:"2px 0 4px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>What to do with each home</h3>
      <p style={{ margin:"0 0 14px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>Pick a strategy on each card — the green-highlighted figure is its after-tax outcome. Your choice flows into the charts below.</p>
      {s.tx.on && <PropCard keyName="tx" s={s} setProp={setProp} />}
      {s.at.on && <PropCard keyName="at" s={s} setProp={setProp} />}
      {!s.tx.on && !s.at.on && <div style={{ fontSize:12.5, color:C.mut }}>Both inheritances are switched off. Turn one on in the inputs to model it.</div>}
    </div>
  );
}
