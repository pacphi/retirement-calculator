import { C } from "../theme.js";
import { survivorOptionFactor } from "../../calculatorCore.js";
import { Field, NumberInput, Segmented, Section, AssumptionIcon } from "../atoms/index.jsx";
import { usd0 } from "../format.js";

/**
 * Step five — Spouse's pension. Off by default; when included, pensionType selects the
 * formula: WA DRS (TRS 2/3), federal FERS, or a generic user-entered defined-benefit pension.
 *
 * @param {{ s: object, set: function, setProp: function, afcAuto: boolean, afcEff: number, steady: object }} props
 */
export function Pension({ s, set, afcAuto, afcEff, steady }) {
  const pensionType = s.pensionType || "drs";
  return (
    <Section eyebrow="Step five" title="Spouse's pension">
      <Field label="Include a pension"><Segmented value={s.pensionOn} onChange={set("pensionOn")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
      {s.pensionOn && (<>
        <Field label="Pension type" hint="Which formula applies to the spouse's pension.">
          <Segmented value={pensionType} onChange={set("pensionType")} options={[{label:"WA DRS",value:"drs"},{label:"Federal (FERS)",value:"fers"},{label:"Other / generic",value:"generic"}]} />
        </Field>

        {pensionType === "drs" && (<>
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

        {pensionType === "fers" && (<>
          <div className="rc-inputs">
            <Field label="Years of FERS service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at" hint="Immediate-retirement eligibility depends on age + years."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field
            label={<>High-3 average salary{afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no High-3 was entered. Wages are held flat in real terms, so today's salary stands in for the highest-3-year average. Type a value to override." />}</>}
            hint="Average of the highest 3 consecutive years of basic pay."
          >
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
            {afcAuto
              ? <span style={{ display:"block", fontSize:11, color:C.brassDeep, marginTop:5, lineHeight:1.4 }}>Assumed from the spouse's income ({usd0(Number(s.incomeB)||0)}). Type a value to override.</span>
              : <span onClick={()=>set("afc")(null)} style={{ display:"inline-block", fontSize:11, color:C.brassDeep, marginTop:5, cursor:"pointer", textDecoration:"underline" }}>Reset to assumed (spouse's income)</span>}
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            FERS pays 1% x High-3 x years of service, or 1.1% if starting at 62+ with 20+ years. Immediate retirement (this simplified model) needs 62+/5yrs, 60+/20yrs, or 57+/30yrs of service — the reduced MRA+10 path isn't modeled. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
            {" "}FERS survivor-annuity election isn&apos;t modeled yet — the calculator doesn&apos;t reduce this pension or price a survivor share for FERS the way it does for WA DRS.
          </div>
        </>)}

        {pensionType === "generic" && (<>
          <div className="rc-inputs">
            <Field label="Monthly pension benefit" hint="A known benefit amount — no formula, straight from the plan's statement."><NumberInput value={s.genericPensionMonthly} onChange={set("genericPensionMonthly")} prefix="$" suffix="/mo" /></Field>
            <Field label="Assumed COLA" hint="2% is a reasonable default for public/private DB plans with a COLA; use 0% if the plan has none."><NumberInput value={s.genericCola} onChange={set("genericCola")} suffix="%" /></Field>
          </div>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(Number(s.genericPensionMonthly)||0)}/mo). The plan is modeled in today's dollars, so a COLA at or above the assumed inflation rate keeps this flat in real terms — the same convention used for every other guaranteed-income source here. Survivor election isn&apos;t modeled for a generic pension; enter your own reduced-survivor amount instead if that applies.
          </div>
        </>)}
      </>)}
    </Section>
  );
}
