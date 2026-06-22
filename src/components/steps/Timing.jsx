import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { ownBenefitAtClaimMonthly, proratedFraEstimate } from "../../calculatorCore.js";
import { usd0 } from "../format.js";

const SSA_FRA_URL = "https://secure.ssa.gov/myssa/bec-plan-prep-ui/bec-home";

/**
 * Step two — When work stops & benefits begin.
 *
 * @param {{ s: object, set: function, sFull: object }} props
 */
export function Timing({ s, set, sFull }) {
  return (
    <Section eyebrow="Step two" title="When work stops & benefits begin">
      <div className="rc-inputs">
        <Field label="You stop working at"><NumberInput value={s.stopA} onChange={set("stopA")} /></Field>
        <Field label="Spouse stops at"><NumberInput value={s.stopB} onChange={set("stopB")} /></Field>
        <Field label="Your SS claim age" hint="62–70. +8%/yr to delay."><NumberInput value={s.claimA} onChange={set("claimA")} min={62} /></Field>
        <Field label="Spouse SS claim age"><NumberInput value={s.claimB} onChange={set("claimB")} min={62} /></Field>
      </div>
      <Field label="Your SS estimate source" hint="SSA statement is best. Income estimate is only a fallback.">
        <Segmented value={s.ssModeA} onChange={set("ssModeA")} options={[{label:"Income estimate",value:"estimate"},{label:"SSA statement",value:"statement"}]} />
      </Field>
      <Field label="Spouse SS estimate source">
        <Segmented value={s.ssModeB} onChange={set("ssModeB")} options={[{label:"Income estimate",value:"estimate"},{label:"SSA statement",value:"statement"}]} />
      </Field>
      {(s.ssModeA==="estimate" || s.ssModeB==="estimate") && (
        <div role="note" style={{ fontSize:12, color:C.clay, background:"#FBEFEC", border:`1px solid ${C.clay}40`, borderRadius:8, padding:"9px 11px", lineHeight:1.5, marginTop:8 }}>
          ⚠ The income estimate assumes a full 35-year Social Security career. It <b>overstates</b> the benefit for a shorter covered career and <b>understates</b> it for anyone not currently earning. Prefer your SSA statement.
        </div>
      )}
      {(s.ssModeA==="statement" || s.ssModeB==="statement") && (
        <>
          <div style={{ fontSize:12, color:C.slate, marginTop:8, lineHeight:1.5 }}>
            Enter your <b>age-67 (full retirement age) monthly amount × 12</b>, from{" "}
            <a href={SSA_FRA_URL} target="_blank" rel="noreferrer" style={{ color:C.brassDeep, fontWeight:600 }}>ssa.gov → my Social Security</a>. Your claim age below adjusts it (62 ≈ −30%, 70 ≈ +24%).
          </div>
          <div className="rc-inputs">
            {s.ssModeA==="statement" && (
              <Field label="Your FRA benefit (age 67)" hint={`At your claim age (${s.claimA}): ${usd0(ownBenefitAtClaimMonthly((Number(s.ssFraA)||0)/12, s.claimA))}/mo`}>
                <NumberInput value={s.ssFraA} onChange={set("ssFraA")} prefix="$" suffix="/yr" />
              </Field>
            )}
            {s.ssModeB==="statement" && (
              <Field label="Spouse FRA benefit (age 67)" hint={`At the spouse's claim age (${s.claimB}): ${usd0(ownBenefitAtClaimMonthly((Number(s.ssFraB)||0)/12, s.claimB))}/mo · suggested from ${s.pYears} covered yrs: ${usd0(proratedFraEstimate(Number(s.incomeB)||0, s.pYears))}/yr`}>
                <NumberInput value={s.ssFraB} onChange={set("ssFraB")} prefix="$" suffix="/yr" />
              </Field>
            )}
          </div>
        </>
      )}
      <div style={{ fontSize:12, color:C.slate, background:"#F6F4EC", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
        Scheduled benefits: your SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssA)}</b>, spouse SS <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(sFull.ssB)}</b>/yr at full funding. The income estimate uses SSA bend points; your SSA statement is usually more reliable.
      </div>
      <div style={{ marginTop:14 }}>
        <Field label="Social Security funding scenario" hint="The 2025 Trustees project the retirement fund runs short ~2033–34; after that, payroll taxes still cover ~77–81% of benefits unless Congress acts.">
          <Segmented value={s.ssMode} onChange={set("ssMode")} options={[{label:"Congress acts · 100%",value:"full"},{label:"Trustees · 81%",value:"trustees"},{label:"Custom",value:"custom"}]} />
        </Field>
        {s.ssMode==="custom" && (
          <div className="rc-inputs">
            <Field label={`Benefits payable — ${s.ssHaircut}%`}>
              <input type="range" min={0} max={100} step={1} value={s.ssHaircut} onChange={(e)=>set("ssHaircut")(Number(e.target.value))} style={{ width:"100%", accentColor:C.brass }} />
            </Field>
            <Field label="Reduction starts"><NumberInput value={s.ssCutYear} onChange={set("ssCutYear")} /></Field>
          </div>
        )}
        {s.ssMode==="trustees" && (
          <Field label="Reduction starts" hint="2034 = combined funds; 2033 = retirement fund alone.">
            <NumberInput value={s.ssCutYear} onChange={set("ssCutYear")} />
          </Field>
        )}
      </div>
    </Section>
  );
}
