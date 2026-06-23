import { C } from "../theme.js";
import { usd0 } from "../format.js";
import { resolveReturn } from "../../finance/returns.js";

/**
 * Headline result panel — sustainable income after benefits start.
 *
 * @param {{ steady: object, s: object, mc: object|null, onTrack: boolean, effHaircut: number, effCutYear: number }} props
 */
export function Headline({ steady, s, mc, onTrack, effHaircut, effCutYear }) {
  // Use the preset-resolved return the engine actually projects with (a chosen
  // preset overrides the raw realReturn slider), so the caption matches the numbers.
  const effReturn = resolveReturn(s.returnPreset, s.realReturn);
  return (
    <div className="rc-stat" style={{ background:C.ink, borderRadius:14, padding:"22px 24px", color:"#F4F1E8", marginBottom:16 }}>
      <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brass, fontWeight:700, marginBottom:6 }}>Sustainable income after benefits start</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:12, flexWrap:"wrap" }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:42, fontWeight:600, lineHeight:1, color:"#fff" }}>{usd0(steady.net)}</div>
        <div style={{ fontSize:13, color:"#C9D3CF" }}>/ yr after federal tax · today's dollars</div>
      </div>
      <div style={{ marginTop:6, fontSize:13.5, color:"#C9D3CF" }}>
        {usd0(steady.net/12)}/mo starting around your age {steady.startAgeA} · spending need then {usd0(steady.targetNeed)}/yr{steady.liveSav>0?` · includes ${usd0(steady.liveSav)}/yr lower housing cost`:""}
      </div>
      <div style={{ fontSize:12, color:C.slate, marginTop:4 }}>
        You're modeling spending of <b>{usd0(steady.modeledSpend)}/yr</b>. At your withdrawal rate the plan can sustain up to <b>{usd0(steady.sustainableCapacity)}/yr</b> — assuming your base return holds, so this ceiling moves with the markets and isn't guaranteed.{steady.surplus>0 ? ` The ${usd0(steady.surplus)}/yr you don't spend stays invested as a buffer against weak returns, taxes, or long-term care — not a separate pot to draw on.` : ""}
      </div>
      <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:8, background:onTrack?"rgba(30,122,94,.22)":"rgba(190,74,43,.22)", border:`1px solid ${onTrack?C.viridian:C.clay}`, borderRadius:999, padding:"6px 13px", fontSize:13, fontWeight:600 }}>
        <span style={{ width:8, height:8, borderRadius:99, background:onTrack?"#5BD6A8":"#F09B82" }} />
        {onTrack ? `On track -- after-tax income covers the modeled spending need` : `Short of the modeled spending need`}
      </div>
      <div style={{ marginTop:10, fontSize:11.5, color:"#9FB0AB" }}>
        Social Security modeled at {s.ssMode==="full" ? "100% (assumes Congress acts)" : `${Math.round(effHaircut*100)}% from ${effCutYear}${s.ssMode==="trustees"?" (2025 Trustees projection)":""}`} · change it under Step two
      </div>
      <div style={{ marginTop:8, fontSize:11.5, color:"#9FB0AB", lineHeight:1.5 }}>
        This figure assumes a steady {(effReturn*100).toFixed(1)}% real return every year — a best-case-within-average, not a median outcome.{mc ? ` Monte Carlo median (P50): ${usd0(mc.sustainableIncome.p50)}/yr; 10th–90th pct ${usd0(mc.sustainableIncome.p10)}–${usd0(mc.sustainableIncome.p90)}/yr.` : ` Run Monte Carlo (below) for the realistic range.`}
      </div>
    </div>
  );
}
