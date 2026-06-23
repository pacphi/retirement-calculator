import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { usd0 } from "../format.js";

/**
 * Step nine — Travel & longevity.
 *
 * @param {{ s: object, set: function }} props
 */
export function TravelLongevity({ s, set }) {
  return (
    <Section eyebrow="Step nine" title="Travel & longevity">
      <Field label={`Travel budget — ${usd0(s.travel.amount)}/yr, ${s.travel.startYear}–${s.travel.endYear}`} hint="Calendar-year window. With taper on, the budget steps down to the slow-go share from the slow-go year onward (the classic go-go / slow-go curve).">
        <div className="rc-inputs">
          <Field label="Amount / yr"><NumberInput value={s.travel.amount} onChange={(v)=>set("travel")({ ...s.travel, amount:Number(v)||0 })} prefix="$" /></Field>
          <Field label="Start year"><NumberInput value={s.travel.startYear} onChange={(v)=>set("travel")({ ...s.travel, startYear:Number(v)||0 })} /></Field>
          <Field label="End year"><NumberInput value={s.travel.endYear} onChange={(v)=>set("travel")({ ...s.travel, endYear:Number(v)||0 })} /></Field>
        </div>
        <div style={{ marginTop:6 }}>
          <Segmented value={s.travel.taper} onChange={(v)=>set("travel")({ ...s.travel, taper:v })}
            options={[{label:"Taper (go / slow-go)",value:true},{label:"Flat",value:false}]} />
        </div>
        {s.travel.taper && (
          <div className="rc-inputs" style={{ marginTop:6 }}>
            <Field label="Slow-go from year"><NumberInput value={s.travel.slowYear} onChange={(v)=>set("travel")({ ...s.travel, slowYear:Number(v)||0 })} /></Field>
            <Field label="Slow-go spend" hint="Share of the full budget once slow-go begins."><NumberInput value={s.travel.slowPct} onChange={(v)=>set("travel")({ ...s.travel, slowPct:Number(v)||0 })} suffix="%" /></Field>
          </div>
        )}
        <div style={{ marginTop:6 }}>
          <Segmented value={s.travel.on} onChange={(v)=>set("travel")({ ...s.travel, on:v })}
            options={[{label:"Include",value:true},{label:"Skip",value:false}]} />
        </div>
      </Field>
      <Field label="Life expectancy" hint="Each spouse's expected age at death. The earlier death triggers the survivor transition — single-filer taxes, the larger SS kept, pension continuation — and the plan stops at the later death (capped by the plan horizon).">
        <Segmented value={s.life.on} onChange={(v)=>set("life")({ ...s.life, on:v })}
          options={[{label:"Model it",value:true},{label:"Skip",value:false}]} />
        {s.life.on && (
          <div style={{ marginTop:6 }}>
            <div className="rc-inputs">
              <Field label={`You — age at death`} hint={`You are ${s.ageA} now.`}><NumberInput value={s.life.deathAgeA} onChange={(v)=>set("life")({ ...s.life, deathAgeA:Number(v)||0 })} /></Field>
              <Field label={`Spouse — age at death`} hint={`Spouse is ${s.ageB} now.`}><NumberInput value={s.life.deathAgeB} onChange={(v)=>set("life")({ ...s.life, deathAgeB:Number(v)||0 })} /></Field>
            </div>
            {(() => {
              const dYearA = 2026 + (Number(s.life.deathAgeA) - Number(s.ageA));
              const dYearB = 2026 + (Number(s.life.deathAgeB) - Number(s.ageB));
              const survYou = dYearA >= dYearB;
              const firstYr = Math.min(dYearA, dYearB);
              return (
                <span role="note" style={{ display:"block", fontSize:11.5, color:C.slate, marginTop:6, lineHeight:1.45 }}>
                  <b style={{ color:C.ink }}>{survYou ? "You" : "Your spouse"}</b> survive{survYou ? "" : "s"}; the transition begins in <b style={{ color:C.ink }}>{firstYr}</b>.
                </span>
              );
            })()}
            <div style={{ marginTop:6 }}>
              <span style={{ display:"block", fontSize:11.5, color:C.slate, marginBottom:4 }}>Pension continues to survivor at (if the pension-holder dies first)</span>
              <Segmented value={s.life.pensionPct} onChange={(v)=>set("life")({ ...s.life, pensionPct:v })}
                options={[{label:"0% (life-only)",value:0},{label:"50%",value:50},{label:"100%",value:100}]} />
            </div>
          </div>
        )}
      </Field>
    </Section>
  );
}
