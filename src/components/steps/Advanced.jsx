import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { LOCATIONS } from "../../retirementData.js";
import { usd0 } from "../format.js";

const locByName = (n) => LOCATIONS.find(l => l.name === n);

/**
 * Advanced / assumptions section (collapsible).
 *
 * @param {{ s: object, set: function, setProp: function, adv: boolean, onAdvToggle: function }} props
 */
export function Advanced({ s, set, adv, onAdvToggle }) {
  return (
    <>
      <button onClick={onAdvToggle} style={{ width:"100%", background:"none", border:`1px dashed ${C.line}`, borderRadius:9, padding:"10px", color:C.slate, fontSize:12.5, fontWeight:600, cursor:"pointer", marginBottom:adv?16:8, fontFamily:"inherit" }}>{adv?"Hide assumptions ▲":"Long-term care & assumptions (return, inflation, withdrawal, tax) ▾"}</button>
      {adv && (<Section eyebrow="Optional" title="Strategy & assumptions">
        <Field label={`Real investment return — ${(s.realReturn*100).toFixed(1)}%`} hint="After inflation. A 60/40 mix has historically returned ~4–5% real."><input type="range" min={2} max={8} step={0.5} value={s.realReturn*100} onChange={(e)=>set("realReturn")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
        <Field label={`Inflation — ${(s.inflation*100).toFixed(1)}%`} hint="Translates today's costs into future dollars in the breakdowns."><input type="range" min={1} max={5} step={0.5} value={s.inflation*100} onChange={(e)=>set("inflation")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} /></Field>
        <Field label="Withdrawal rate"><Segmented value={s.swr} onChange={set("swr")} options={[{label:"3.9%",value:0.039},{label:"4%",value:0.04},{label:"5.7%",value:0.057}]} /></Field>
        <Field label="Plan horizon (age)" hint="How long to project. Defaults to 95; can't be set below the older spouse's current age.">
          <NumberInput value={s.horizonAge} min={Math.max(Number(s.ageA)||0, Number(s.ageB)||0)}
            onChange={(v)=>set("horizonAge")(v===""||v==null ? 95 : Number(v))} />
        </Field>
        <Field label="Extra income tax (state / foreign)" hint={`On top of US federal. ${locByName(s.retireLoc)?.region==="US"?"State rate on retirement income.":"Net of treaty + Foreign Tax Credit (you pay the higher, not both)."} Default for ${s.retireLoc}: ${Math.round((locByName(s.retireLoc)?.addlTaxRate||0)*100)}%. Leave blank to use it.`}>
          <NumberInput value={s.stateRate==null ? "" : Math.round(s.stateRate*1000)/10} suffix="%"
            onChange={(v)=>set("stateRate")(v===""||v==null ? null : (Number(v)||0)/100)} />
        </Field>
        <Field label="Long-term care" hint="~70% of retirees need it; one episode can run $50k–$200k/yr depending on location.">
          <Segmented value={s.ltc.on} onChange={(v)=>set("ltc")({ ...s.ltc, on:v })}
            options={[{label:"Model it",value:true},{label:"Skip",value:false}]} />
          {!s.ltc.on && (
            <span role="note" style={{ display:"block", fontSize:11.5, color:C.clay, marginTop:6, lineHeight:1.45 }}>
              Not modeled. ~70% of 65-year-olds need long-term care; a multi-year episode can deplete your savings years earlier than shown.
            </span>
          )}
          {s.ltc.on && (() => {
            const locLtc = locByName(s.retireLoc)?.ltcAnnual ?? 0;
            return (
              <div style={{ marginTop:6 }}>
                <div className="rc-inputs">
                  <Field label="Cost / yr" hint={`Default for ${s.retireLoc}: ${usd0(locLtc)} (private nursing care). Edit to override.`}>
                    <NumberInput value={s.ltc.annual ?? locLtc} onChange={(v)=>set("ltc")({ ...s.ltc, annual:Number(v)||0 })} prefix="$" suffix="/yr" />
                  </Field>
                  <Field label="Years"><NumberInput value={s.ltc.years} onChange={(v)=>set("ltc")({ ...s.ltc, years:Number(v)||0 })} /></Field>
                  <Field label="Starts at age"><NumberInput value={s.ltc.startAge} onChange={(v)=>set("ltc")({ ...s.ltc, startAge:Number(v)||0 })} /></Field>
                </div>
              </div>
            );
          })()}
        </Field>
      </Section>)}
    </>
  );
}
