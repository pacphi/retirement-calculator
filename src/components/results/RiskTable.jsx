import { C } from "../theme.js";

const usd0 = (x) => (x<0?"-$":"$") + Math.abs(Math.round(x)).toLocaleString();

/**
 * RiskTable — Social Security risk assessment panel.
 *
 * @param {{ sFull: object, sTrust: object, sNone: object, simFull: object, simTrust: object, simNone: object, s: object, effHaircut: number, effCutYear: number, horizon: number }} props
 */
export function RiskTable({ sFull, sTrust, sNone, simFull, simTrust, simNone, s, effHaircut, _effCutYear, horizon }) {
  const rows = [
    { key:"full", lab:"Congress acts — 100%", st:sFull, on:s.ssMode==="full" },
    { key:"trustees", lab:`Trustees' 81% from ${Number(s.ssCutYear)||2034}`, st:sTrust, on:s.ssMode==="trustees" },
    { key:"none", lab:"SS eliminated — 0% (stress test)", st:sNone, on:effHaircut===0 },
  ];
  const depFor = (k) => k==="full"?simFull.depAge : k==="trustees"?simTrust.depAge : simNone.depAge;
  const ssShare = sFull.gross>0 ? sFull.ssHouse/sFull.gross : 0;
  const drop = sFull.net - sTrust.net;
  const okTrust = sTrust.net >= sTrust.targetNeed;
  const okNone = sNone.net >= sNone.targetNeed;
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
      <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Risk assessment</div>
      <h3 style={{ margin:"2px 0 4px", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>If Social Security is cut</h3>
      <p style={{ margin:"0 0 12px", fontSize:12.5, color:C.slate, lineHeight:1.55 }}>
        The 2025 Trustees project the retirement trust fund falls short around 2033–34. It doesn't vanish — incoming payroll taxes still fund ~77–81% of scheduled benefits (sliding toward ~72% later), unless Congress acts, as it did in 1983. Here's all three cases against your plan:
      </p>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
        <thead><tr style={{ color:C.mut, fontSize:11 }}>
          <th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Scenario</th>
          <th style={{ textAlign:"right", fontWeight:600 }}>SS/yr</th>
          <th style={{ textAlign:"right", fontWeight:600 }}>Income/yr</th>
          <th style={{ textAlign:"right", fontWeight:600 }}>Lasts</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.key} style={{ borderTop:`1px solid ${C.line}`, background:r.on?"#FCF6E8":"transparent" }}>
              <td style={{ padding:"7px 0", color:C.inkSoft, fontWeight:r.on?700:400 }}>{r.on?"▸ ":""}{r.lab}</td>
              <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.slate }}>{usd0(r.st.ssHouse)}</td>
              <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.ink, fontWeight:600 }}>{usd0(r.st.net)}</td>
              <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color: depFor(r.key)?C.clay:C.viridian }}>{depFor(r.key)?`age ${depFor(r.key)}`:`${horizon}+`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop:12, fontSize:12.5, color:C.inkSoft, lineHeight:1.55, background:"#F6F4EC", borderRadius:9, padding:"10px 12px" }}>
        Social Security is about <b style={{color:C.ink}}>{Math.round(ssShare*100)}%</b> of your retirement income, so the realistic 81% case trims roughly <b style={{color:C.ink}}>{usd0(drop)}/yr</b> — and you'd still be <b style={{color:okTrust?C.viridian:C.clay}}>{okTrust?"on track":"short of your goal"}</b>. Even if it were eliminated entirely (a deliberate worst case, not a forecast), your pension and savings would carry you {okNone?"and still meet the goal":`to age ${simNone.depAge||95}`}. Her Washington pension is the ballast here — it isn't affected by any of this.
      </div>
    </div>
  );
}
