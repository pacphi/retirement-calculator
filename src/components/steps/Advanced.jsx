import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { GLIDEPATH_DEFAULTS, LOCATIONS, RETURN_MODEL_DEFAULTS, SOURCES } from "../../retirementData.js";
import { usd0 } from "../format.js";

const locByName = (n) => LOCATIONS.find(l => l.name === n);

/**
 * Advanced / assumptions step (Wave: now a normal wizard step, no longer collapsed).
 *
 * @param {{ s: object, set: function }} props
 */
export function Advanced({ s, set }) {
  return (
      <Section eyebrow="Step ten" title="Strategy & assumptions">
        <Field label="Return assumption">
          <Segmented
            value={s.returnPreset}
            onChange={set("returnPreset")}
            options={[
              { value: "conservative", label: "Conservative ~3.5%" },
              { value: "balanced",     label: "Balanced ~5%" },
              { value: "growth",       label: "Growth ~6.5%" },
              { value: "custom",       label: "Custom" },
            ]}
          />
        </Field>
        {s.returnPreset === "custom" && (
          <Field label="Custom real return (%/yr)">
            <NumberInput
              value={Math.round(s.realReturn * 1000) / 10}
              onChange={(v) => set("realReturn")((Number(v) || 0) / 100)}
              step={0.1}
            />
          </Field>
        )}
        <Field label="Variability (±%/yr)" hint="Return volatility used for the range band">
          <NumberInput
            value={Math.round(s.volatility * 100)}
            onChange={(v) => set("volatility")((Number(v) || 0) / 100)}
            step={1} min={0} max={30}
          />
        </Field>
        <Field label="Sequence stress">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input type="checkbox" aria-label="Bad first decade (sequence stress)"
              checked={!!s.showStress} onChange={(e) => set("showStress")(e.target.checked)} />
            Show a "bad first decade" return path on the long-run chart
          </label>
        </Field>
        <Field label="Return model" hint="How the engine assigns per-year portfolio returns. Blended uses one rate; glidepath tilts from equity-heavy early to bond-heavy near retirement; by bucket weights each account's rate by balance.">
          <Segmented
            value={s.returnModel?.mode ?? RETURN_MODEL_DEFAULTS.mode}
            onChange={(v) => set("returnModel")({ ...(s.returnModel ?? RETURN_MODEL_DEFAULTS), mode: v })}
            options={[
              { value: "blended",   label: "Blended" },
              { value: "byBucket",  label: "By bucket" },
              { value: "glidepath", label: "Glidepath" },
            ]}
          />
        </Field>
        {(s.returnModel?.mode ?? RETURN_MODEL_DEFAULTS.mode) === "glidepath" && (
          <>
            <Field label="Equity % now" hint="Equity allocation at the start of the projection. Declines linearly to the retirement value.">
              <NumberInput
                value={s.returnModel?.equityPctNow ?? GLIDEPATH_DEFAULTS.equityPctNow}
                onChange={(v) => set("returnModel")({ ...(s.returnModel ?? RETURN_MODEL_DEFAULTS), equityPctNow: Number(v) || 0 })}
                step={5} min={0} max={100} suffix="%"
              />
            </Field>
            <Field label="Equity % at retirement" hint="Equity allocation when the last spouse stops working. Held constant through the decumulation phase.">
              <NumberInput
                value={s.returnModel?.equityPctAtRetire ?? GLIDEPATH_DEFAULTS.equityPctAtRetire}
                onChange={(v) => set("returnModel")({ ...(s.returnModel ?? RETURN_MODEL_DEFAULTS), equityPctAtRetire: Number(v) || 0 })}
                step={5} min={0} max={100} suffix="%"
              />
            </Field>
          </>
        )}
        <p style={{ fontSize:11, color:C.mut, lineHeight:1.5, margin:"4px 0 10px" }}>
          Central return anchored to long-run 60/40 history (~5% real, with dispersion);
          the band is a Monte Carlo p10–p90 fan. Glidepath is opt-in; Monte Carlo samples
          around the blended mean regardless of model.{" "}
          <a href={SOURCES.cfa6040 ?? "https://rpc.cfainstitute.org/research/reports/2025/performance-of-the-60-40-portfolio"} target="_blank" rel="noreferrer" style={{ color:C.brassDeep }}>CFA</a>{" / "}
          <a href={SOURCES.carson6040 ?? "https://www.carsongroup.com/insights/blog/the-60-40-portfolio-a-historical-powerhouse-or-a-rate-dependent-misinterpretation/"} target="_blank" rel="noreferrer" style={{ color:C.brassDeep }}>Carson</a>.
        </p>
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
      </Section>
  );
}
