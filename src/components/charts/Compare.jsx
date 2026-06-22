import { C } from "../theme.js";
import { Select } from "../atoms/index.jsx";
import { LOCATIONS } from "../../retirementData.js";
import { lineItems, monthlyTotal, tierFor } from "../../calculatorCore.js";
import { usd0, usdK } from "../format.js";

/**
 * Compare panel — side-by-side two-location cost comparison table.
 *
 * Props:
 *   cmpA           — name of location A; root: cmpA
 *   cmpB           — name of location B; root: cmpB
 *   onPickA        — (name: string) => void; root: setCmpA
 *   onPickB        — (name: string) => void; root: setCmpB
 *   stage          — "pre" | "post"; root: stage
 *   couple         — true = couple, false = single; root: couple
 *   sFactor        — single/couple cost multiplier; root: sFactor
 *   steadyNet      — after-tax sustainable income (number); root: steady.net
 *   inflFactor     — inflation factor to retirement (number); root: inflFactor
 *   retYear        — projected retirement calendar year (number); root: retYear
 */
export function Compare({
  cmpA,
  cmpB,
  onPickA,
  onPickB,
  stage,
  couple,
  sFactor,
  steadyNet,
  inflFactor,
  retYear,
}) {
  const locByName = (n) => LOCATIONS.find(l => l.name === n);
  const annualCost = (l) => monthlyTotal(l, stage) * 12 * sFactor;

  const A = locByName(cmpA), B = locByName(cmpB);
  const aTot = annualCost(A), bTot = annualCost(B);
  const cheaper = aTot <= bTot ? cmpA : cmpB, cmpDiff = Math.abs(aTot - bTot);

  const SummaryCard = ({ name }) => {
    const l = locByName(name), tot = annualCost(l), surplus = steadyNet - tot, tier = tierFor(steadyNet / tot);
    return (
      <div style={{ flex:"1 1 160px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:10, padding:"11px 13px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
          <span style={{ fontSize:12.5, fontWeight:700, color:C.ink }}>{name}</span>
          <span style={{ fontSize:10.5, fontWeight:700, color:tier.color, background:tier.color+"18", padding:"1px 7px", borderRadius:999 }}>{tier.label}</span>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color:C.ink }}>{usd0(tot)}<span style={{ fontSize:11, color:C.mut, fontWeight:400 }}>/yr</span></div>
        <div style={{ fontSize:11.5, color:surplus>=0?C.viridian:C.clay, fontWeight:600, marginTop:2 }}>{surplus>=0?`+${usd0(surplus)} · ${(steadyNet/tot).toFixed(1)}×`:`${usd0(surplus)} short`}</div>
        <div style={{ fontSize:10.5, color:C.mut, marginTop:5, lineHeight:1.4 }}>{usd0(tot*inflFactor)}/yr in {retYear} · VAT {l.vat}<br/>Income tax: {l.incomeTax}</div>
      </div>
    );
  };

  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 18px", marginBottom:16 }}>
      <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Side by side</div>
      <h3 style={{ margin:"2px 0 12px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>Compare two places</h3>
      <div style={{ display:"flex", gap:10, marginBottom:6 }}>
        <div style={{ flex:1 }}><Select value={cmpA} onChange={onPickA} options={LOCATIONS.map(l=>l.name)} /></div>
        <div style={{ flex:1 }}><Select value={cmpB} onChange={onPickB} options={LOCATIONS.map(l=>l.name)} /></div>
      </div>
      <p style={{ margin:"2px 0 12px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>{cmpA===cmpB ? "Pick two different places to compare." : <>Living in <b style={{color:C.ink}}>{cheaper}</b> runs about <b style={{color:C.viridian}}>{usd0(cmpDiff)}/yr</b> less — {couple?"couple":"single"}, healthcare {stage==="pre"?"before 65":"at 65+"}.</>}</p>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
        <thead><tr style={{ color:C.mut, fontSize:11 }}><th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Monthly</th><th style={{ textAlign:"right", fontWeight:700, color:C.ink }}>{cmpA}</th><th style={{ textAlign:"right", fontWeight:700, color:C.ink }}>{cmpB}</th></tr></thead>
        <tbody>
          {lineItems(A,stage).map(([label,va],idx)=>{
            const vb=lineItems(B,stage)[idx][1], av=va*sFactor, bv=vb*sFactor, isHC=label.indexOf("Healthcare")===0;
            return (<tr key={label} style={{ borderTop:`1px solid ${C.line}`, background:isHC?"#F6F2E8":"transparent" }}>
              <td style={{ padding:"5px 0", color:isHC?C.brassDeep:C.inkSoft, fontWeight:isHC?600:400 }}>{label.replace(" -- before 65","").replace(" -- 65+","")}{isHC?` (${stage==="pre"?"<65":"65+"})`:""}</td>
              <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:av<=bv?C.viridian:C.ink, fontWeight:av<=bv?600:400 }}>{usd0(av)}</td>
              <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:bv<av?C.viridian:C.ink, fontWeight:bv<av?600:400 }}>{usd0(bv)}</td>
            </tr>);
          })}
          <tr style={{ borderTop:`2px solid ${C.ink}` }}><td style={{ padding:"6px 0", fontWeight:700, color:C.ink }}>Total /mo</td>
            <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:aTot<=bTot?C.viridian:C.ink }}>{usd0(aTot/12)}</td>
            <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:bTot<aTot?C.viridian:C.ink }}>{usd0(bTot/12)}</td></tr>
          <tr><td style={{ padding:"2px 0", fontSize:11, color:C.mut }}>Total /yr</td>
            <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.slate }}>{usdK(aTot)}</td>
            <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.slate }}>{usdK(bTot)}</td></tr>
        </tbody>
      </table>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:14 }}><SummaryCard name={cmpA} /><SummaryCard name={cmpB} /></div>
    </div>
  );
}
