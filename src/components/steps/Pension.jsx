import { C } from "../theme.js";
import { survivorOptionFactor } from "../../calculatorCore.js";
import { Field, NumberInput, Segmented, Section, AssumptionIcon } from "../atoms/index.jsx";
import { usd0 } from "../format.js";

/**
 * Step four — Spouse's Washington State pension.
 *
 * @param {{ s: object, set: function, setProp: function, afcAuto: boolean, afcEff: number, steady: object }} props
 */
export function Pension({ s, set, afcAuto, afcEff, steady }) {
  return (
    <Section eyebrow="Step four" title="Spouse's Washington State pension">
      <Field label="Include the DRS pension"><Segmented value={s.pensionOn} onChange={set("pensionOn")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
      {s.pensionOn && (<>
        <div className="rc-inputs">
          <Field label="System" hint="TRS and SERS use the same formula here."><Segmented value={s.system} onChange={set("system")} options={[{label:"TRS",value:"TRS"},{label:"SERS",value:"SERS"}]} /></Field>
          <Field label="Plan" hint="Plan 2 = 2%/yr · Plan 3 = 1%/yr."><Segmented value={s.plan} onChange={set("plan")} options={[{label:"Plan 2",value:2},{label:"Plan 3",value:3}]} /></Field>
          <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
          <Field label="Pension starts at" hint="Before 65 it's reduced."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
        </div>
        <Field
          label={<>Average final compensation (AFC){afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no AFC was entered. Wages are held flat in real terms, so today's salary stands in for final-average pay. Type a value to override." />}</>}
          hint="Avg pay over the spouse's highest 60 consecutive months."
        >
          <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          {afcAuto
            ? <span style={{ display:"block", fontSize:11, color:C.brassDeep, marginTop:5, lineHeight:1.4 }}>Assumed from the spouse's income ({usd0(Number(s.incomeB)||0)}) — wages are held flat in real terms, so this is a placeholder. Type a value to override.</span>
            : <span onClick={()=>set("afc")(null)} style={{ display:"inline-block", fontSize:11, color:C.brassDeep, marginTop:5, cursor:"pointer", textDecoration:"underline" }}>Reset to assumed (spouse's income)</span>}
        </Field>
        <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
          DRS calculates the monthly benefit from monthly AFC; this app annualizes the same formula. {s.plan===2?"2%":"1%"} x {s.pYears} x {usd0(afcEff)}{steady.erf!=null&&steady.erf<1?` x ${steady.erf.toFixed(4)} early factor`:""} = <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote || (steady.erf!=null&&steady.erf<1?"Early retirement uses the current DRS factor table.":"")}
        </div>
        <Field label="Survivor option (if the pension-holder dies first)" hint="A DRS election, not a bet — priced with the published joint-and-survivor factor.">
          <Segmented value={s.life.pensionPct} onChange={(v)=>set("life")({ ...s.life, pensionPct:v })}
            options={[{label:"0% (single life)",value:0},{label:"50%",value:50},{label:"66.67%",value:66.67},{label:"100%",value:100}]} />
          {(() => {
            const gap = Number(s.ageB) - Number(s.ageA); // member (spouse B) minus beneficiary
            const factor = survivorOptionFactor(s.life.pensionPct, gap);
            const gapWord = gap === 0 ? "the same age" : `${Math.abs(gap)} yr${Math.abs(gap) === 1 ? "" : "s"} ${gap < 0 ? "older" : "younger"} than the member`;
            return (
              <span role="note" style={{ display:"block", fontSize:11, color:C.mut, marginTop:5, lineHeight:1.5 }}>
                {Number(s.life.pensionPct) > 0
                  ? <>Priced like DRS prices it: electing {s.life.pensionPct}% reduces the pension to <b style={{ color:C.ink }}>×{factor.toFixed(3)}</b> from day one (2026 TRS 2/3 factor; beneficiary {gapWord}), and the survivor then receives {s.life.pensionPct}% of that reduced benefit. If the beneficiary dies first, the benefit pops back up to the single-life amount.</>
                  : <>Single life pays the most while the pension-holder lives but stops at their death — DRS requires the spouse&apos;s notarized consent for this choice.</>}
                {" "}If the pension-holder dies before the pension starts, the surviving spouse receives the statutory lifetime annuity (RCW 41.32.895) — modeled automatically.
                {!s.life.on && <> <b style={{ color:C.brassDeep }}>Turn on life expectancy in Step 9 (Travel &amp; longevity)</b> to set each spouse&apos;s expected age at death — that's what actually triggers this election in the plan.</>}
              </span>
            );
          })()}
        </Field>
      </>)}
    </Section>
  );
}
