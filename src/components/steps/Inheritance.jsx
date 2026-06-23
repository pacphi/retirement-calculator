import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { PROP } from "../../retirementData.js";

/**
 * Step six — Inherited real estate inputs.
 *
 * @param {{ s: object, set: function, setProp: function }} props
 */
export function Inheritance({ s, setProp }) {
  return (
    <Section eyebrow="Step six" title="Inherited real estate">
      <div style={{ fontSize:12, color:"#5E6B67", lineHeight:1.5, marginBottom:14 }}>Two homes you may inherit. Set the value, the year, and what you'd do with each — the tax math and the impact on your plan update live.</div>
      {["tx","at"].map(key => {
        const p = s[key];
        return (
          <div key={key} style={{ marginBottom:16 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:"#102B28", marginBottom:8 }}>{PROP[key].label}</div>
            <Field label="Include this inheritance"><Segmented value={p.on} onChange={setProp(key,"on")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
            {p.on && (<>
              <div className="rc-inputs">
                <Field label="Value today" hint={key==="at"?"≈ €300k at 1.08":"Market value"}><NumberInput value={p.value} onChange={setProp(key,"value")} prefix="$" /></Field>
                <Field label="Year received"><NumberInput value={p.year} onChange={setProp(key,"year")} /></Field>
              </div>
              <Field label="What would you do with it?"><Segmented value={p.strategy} onChange={setProp(key,"strategy")} options={[{label:"Sell",value:"sell"},{label:"Rent",value:"rent"},{label:"Live in",value:"live"}]} /></Field>
            </>)}
          </div>
        );
      })}
    </Section>
  );
}
