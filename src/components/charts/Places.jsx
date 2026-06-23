import { C } from "../theme.js";
import { Segmented } from "../atoms/index.jsx";
import { lineItems, monthlyTotal } from "../../calculatorCore.js";
import { usd0, usdK } from "../format.js";
import { INTL_TAX, US_STATE_TAX } from "../../retirementData.js";
import { residenceTaxForYear } from "../../finance/residenceTax.js";

const phaseNote = (l, f) => {
  const pre = `$${Math.round(l.hcPre*f).toLocaleString()}`, post = `$${Math.round(l.hcPost*f).toLocaleString()}`;
  if (l.region === "US") return `Medicare at 65 drops healthcare from ~${pre}/mo (full-price ACA before 65) to ~${post}/mo. Keep taxable income modest in the gap years and ACA subsidies can cut the earlier figure sharply.`;
  if (l.name === "Bahamas") return `No Medicare coverage abroad and private cover is age-rated, so healthcare here rises from ~${pre}/mo to ~${post}/mo. Budget for medical evacuation too.`;
  return `As a resident you can usually access the public system, so healthcare stays moderate (~${pre}/mo before 65, ~${post}/mo after). Medicare won't cover care here.`;
};

/**
 * Places panel — expandable per-location affordability list with line-item breakdown.
 *
 * Props:
 *   locRows        — array { ...location, cost, ratio, tier }; root: locRows
 *   steadyNet      — after-tax sustainable income (number); root: steady.net
 *   couple         — true = couple, false = single; root: couple
 *   onCoupleChange — (bool) => void; root: setCouple
 *   stage          — "pre" | "post"; root: stage
 *   onStageChange  — (string) => void; root: setStage
 *   openLoc        — name of currently expanded location (string | null); root: openLoc
 *   onToggle       — (name: string | null) => void; root: setOpenLoc
 *   sFactor        — single/couple cost multiplier; root: sFactor
 *   retYear        — projected retirement calendar year (number); root: retYear
 *   inflFactor     — inflation factor to retirement (number); root: inflFactor
 *   inflation      — annual inflation rate (fraction); root: s.inflation
 *   yearsToRet     — years until retirement (number); root: yearsToRet
 */
/**
 * Compute a plain-language "residence tax on your income mix" note for the active
 * retirement location. Returns null when there is nothing typed to say (no profile,
 * or the profile produces zero additional tax).
 */
function computeResidenceTaxNote(locName, stateCode, steadyIncomeMix) {
  const profile = (stateCode && US_STATE_TAX[stateCode])
    || (locName && INTL_TAX[locName])
    || null;
  if (!profile) return null;

  const { ss = 0, ssTaxablePortion, pension = 0, deferredWithdrawal = 0 } = steadyIncomeMix || {};
  const tax = residenceTaxForYear(profile, {
    isRetirement: true,
    ss,
    ssTaxablePortion, // SS-taxing states tax only the federally-taxable portion, not gross SS
    pension,
    deferredWithdrawal,
  });

  if (tax <= 0) {
    if (profile.retireRate === 0) {
      return `${profile.name} adds no residence income tax on your SS, pension, or withdrawals.`;
    }
    return null;
  }

  // Mirror residenceTaxForYear's base: SS uses the taxable portion when taxesSS.
  const ssBase = profile.taxesSS ? (ssTaxablePortion ?? ss) : 0;
  const rateLabel = `${(profile.retireRate * 100).toFixed(2)}%`;
  const taxable = Math.max(0,
    ssBase
    + (profile.pensionExclusion === "full" ? 0 : Math.max(0, pension - (profile.pensionExclusion || 0)))
    + (profile.taxesTradWithdrawal ? deferredWithdrawal : 0),
  );
  return `${profile.name}: ~${rateLabel} on ~$${Math.round(taxable / 1000)}k of your retirement income mix, adding ~$${Math.round(tax / 1000)}k/yr in residence tax (SS${profile.taxesSS ? " taxed" : " exempt"}, pension${profile.pensionExclusion === "full" ? " fully exempt" : " taxed"}).`;
}

export function Places({
  locRows,
  steadyNet,
  couple,
  onCoupleChange,
  stage,
  onStageChange,
  openLoc,
  onToggle,
  sFactor,
  retYear,
  inflFactor,
  inflation,
  yearsToRet,
  stateCode,
  steadyIncomeMix,
}) {
  // Residence-tax note for the active retirement location (the expanded row).
  const activeLoc = openLoc;
  const residenceTaxNote = computeResidenceTaxNote(activeLoc, stateCode, steadyIncomeMix);

  // Housing classification — sourced from locRows (set by usePlan via retirementDwellingAnnualCost).
  // All rows carry the same hh object; read from the first row when available.
  const hh = locRows.length > 0 ? locRows[0].hh : null;
  const isOwnedHousing = hh && (hh.basis === "own" || hh.basis === "mortgage");

  return (
    <div style={{ background:C.panel, border:`1px solid ${C.line}`, borderRadius:14, padding:"16px 18px 20px", marginBottom:16 }}>
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:C.brassDeep, fontWeight:700 }}>Places</div>
        <h3 style={{ margin:"2px 0 0", fontFamily:"'Newsreader',serif", fontWeight:500, fontSize:20 }}>How far {usd0(steadyNet)} stretches</h3>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <Segmented value={couple} onChange={onCoupleChange} options={[{label:"Couple",value:true},{label:"Single",value:false}]} />
        <Segmented value={stage} onChange={onStageChange} options={[{label:"Before 65",value:"pre"},{label:"65+ (Medicare)",value:"post"}]} />
      </div>
      <p style={{ margin:"0 0 14px", fontSize:12.5, color:C.slate, lineHeight:1.5 }}>Tap a place for the full monthly breakdown. The gold line is your after-tax income; switch the healthcare basis to see the pre-Medicare years.</p>
      {/* Part 5 — housing caption */}
      <p aria-label="Housing cost note" style={{ margin:"0 0 12px", fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F6F2E8", borderRadius:8, padding:"8px 10px" }}>
        <b style={{ color:C.brassDeep }}>Home costs across locations.</b>{" "}
        Owned/mortgaged: your home&apos;s carrying cost is applied across locations — you bring one home. Renting: each location&apos;s local rent is shown. The single/couple multiplier applies to the rest of the basket, not your one home.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {locRows.map((l)=>{
          const max = Math.max(steadyNet, locRows[locRows.length-1].cost)*1.05;
          const open = openLoc===l.name, surplus = steadyNet-l.cost;

          // For the expanded breakdown table, build a modified line-items list when
          // the household owns/mortgages: substitute the location's rent row with
          // the fixed carrying-cost row so all surfaces stay coherent.
          const rawItems = lineItems(l, stage);
          const displayItems = isOwnedHousing
            ? rawItems.map(([label, val]) => {
                if (label === "Rent -- 2-3BR, quiet area") {
                  const hhLabel = hh.basis === "mortgage"
                    ? "Your home — mortgage P&I + costs"
                    : "Your home — carrying cost";
                  // Monthly value: hh.annual is NOT sFactor-scaled (policy: one home isn't halved);
                  // the /sFactor here cancels the ×sFactor at render so the home line shows hh.annual/12.
                  const hhMonthly = sFactor > 0 ? hh.annual / 12 / sFactor : hh.annual / 12;
                  return [hhLabel, hhMonthly];
                }
                return [label, val];
              })
            : rawItems;

          // Derive the /mo footer from l.cost (the single source of truth for /yr)
          // so /mo × 12 == /yr by construction.
          // For renters, monthlyTotal(l, stage) * sFactor is equivalent but we
          // use l.cost / 12 uniformly so both paths are consistent.
          // NOTE: the old owned/mortgage path reduced over displayItems then added
          // healthcare again — double-counting it. l.cost / 12 eliminates that bug.
          const displayMonthly = isOwnedHousing
            ? l.cost / 12
            : monthlyTotal(l, stage) * sFactor;

          return (
            <div key={l.name} style={{ border:`1px solid ${open?C.line:"transparent"}`, borderRadius:10, overflow:"hidden", background:open?"#FCFAF4":"transparent" }}>
              <button
                type="button"
                className="rc-loc"
                aria-expanded={open}
                aria-controls={`loc-${l.name.replaceAll(" ","-")}`}
                onClick={()=>onToggle(open?null:l.name)}
                style={{ display:"block", width:"100%", padding:"8px", border:"none", background:"transparent", borderRadius:9, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}
              >
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.ink }}><span style={{ color:C.mut, marginRight:6, fontSize:11 }}>{open?"▾":"▸"}</span>{l.name} <span style={{ fontSize:10.5, color:C.mut, fontWeight:500 }}>· {l.region}</span></span>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.slate }}>{usdK(l.cost)}/yr</span>
                    <span style={{ fontSize:11, fontWeight:700, color:l.tier.color, background:l.tier.color+"18", padding:"2px 8px", borderRadius:999 }}>{l.tier.label}</span>
                  </span>
                </div>
                <div style={{ position:"relative", height:12, background:"#F1EEE5", borderRadius:6, overflow:"hidden" }}>
                  <div style={{ position:"absolute", inset:0, width:`${Math.min(100,(l.cost/max)*100)}%`, background:"#D9D2C2", borderRadius:6 }} />
                  <div style={{ position:"absolute", top:0, bottom:0, left:`${Math.min(100,(steadyNet/max)*100)}%`, width:2.5, background:C.brass }} />
                </div>
              </button>
              {open && (
                <div id={`loc-${l.name.replaceAll(" ","-")}`} className="rc-exp" style={{ padding:"4px 12px 14px" }}>
                  <div style={{ fontSize:11.5, color:C.slate, lineHeight:1.45, marginBottom:10 }}>{l.note}</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                    <thead><tr style={{ color:C.mut, fontSize:11 }}>
                      <th style={{ textAlign:"left", fontWeight:600, padding:"3px 0" }}>Monthly ({couple?"couple":"single"}, {stage==="pre"?"<65":"65+"})</th>
                      <th style={{ textAlign:"right", fontWeight:600 }}>/mo</th><th style={{ textAlign:"right", fontWeight:600 }}>/yr</th>
                    </tr></thead>
                    <tbody>
                      {displayItems.map(([label,val])=>{ const isHC=label.indexOf("Healthcare")===0; const isHome=label.startsWith("Your home"); return (
                        <tr key={label} style={{ borderTop:`1px solid ${C.line}`, background:isHC?"#F6F2E8":isHome?"#EEF4F0":"transparent" }}>
                          <td style={{ padding:"5px 0", color:isHC?C.brassDeep:isHome?C.viridian:C.inkSoft, fontWeight:(isHC||isHome)?600:400 }}>{label}</td>
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.ink }}>{usd0(val*sFactor)}</td>
                          <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", color:C.slate }}>{usdK(val*sFactor*12)}</td>
                        </tr>
                      );})}
                      <tr style={{ borderTop:`2px solid ${C.ink}` }}>
                        <td style={{ padding:"6px 0", fontWeight:700, color:C.ink }}>Total cost of living</td>
                        <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:C.ink }}>{usd0(displayMonthly)}</td>
                        <td style={{ textAlign:"right", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:C.ink }}>{usdK(l.cost)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
                    <div style={{ flex:"1 1 150px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:9, padding:"9px 11px" }}>
                      <div style={{ fontSize:10.5, color:C.mut, fontWeight:600, marginBottom:3 }}>YOUR INCOME vs THIS BUDGET</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:surplus>=0?C.viridian:C.clay }}>{surplus>=0?"+":""}{usd0(surplus)}/yr</div>
                      <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>{surplus>=0?`${(steadyNet/l.cost).toFixed(1)}× the local budget`:"income falls short here"}</div>
                    </div>
                    <div style={{ flex:"1 1 150px", background:"#fff", border:`1px solid ${C.line}`, borderRadius:9, padding:"9px 11px" }}>
                      <div style={{ fontSize:10.5, color:C.mut, fontWeight:600, marginBottom:3 }}>SAME BUDGET IN {retYear}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:C.ink }}>{usd0(l.cost*inflFactor)}/yr</div>
                      <div style={{ fontSize:11, color:C.slate, marginTop:2 }}>at {(inflation*100).toFixed(1)}% inflation over {yearsToRet} yrs</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F6F2E8", borderRadius:8, padding:"8px 10px" }}><b style={{ color:C.brassDeep }}>Healthcare by age.</b> {phaseNote(l, sFactor)}</div>
                  <div style={{ marginTop:8, fontSize:11.5, color:C.slate, lineHeight:1.5, background:"#F1EEE5", borderRadius:8, padding:"8px 10px" }}><b style={{ color:C.ink }}>Tax profile.</b> Consumption: {l.vat}. Income: {l.incomeTax}.</div>
                  {residenceTaxNote && l.name === activeLoc && (
                    <div style={{ marginTop:6, fontSize:11.5, color:C.inkSoft, lineHeight:1.5, background:"#F6F2E8", borderRadius:8, padding:"8px 10px" }}>
                      <b style={{ color:C.brassDeep }}>Residence tax on your income mix.</b> {residenceTaxNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize:10.5, color:C.mut, lineHeight:1.5, marginTop:12 }}>Cost figures aggregated from Numbeo, Wise, Expatistan, ERI, Eurostat, BLS CES, plus CMS (2026 Medicare: Part B $202.90/mo) and KFF (ACA). Rent = 2–3BR, quiet outside-centre area.</p>
    </div>
  );
}
