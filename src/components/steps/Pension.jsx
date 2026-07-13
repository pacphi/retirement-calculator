import { C } from "../theme.js";
import { survivorOptionFactor } from "../../calculatorCore.js";
import { DEFAULT_PENSION_TYPE } from "../../retirementData.js";
import { Field, NumberInput, Segmented, Section, AssumptionIcon } from "../atoms/index.jsx";
import { usd0 } from "../format.js";

/**
 * Step five — Spouse's pension. Off by default; when included, pensionType selects the
 * formula: WA DRS (TRS 2/3), federal FERS, CalSTRS, CalPERS, Texas TRS, NYSTRS, Ohio STRS,
 * military (High-3 / BRS), or a generic user-entered defined-benefit pension.
 *
 * @param {{ s: object, set: function, setProp: function, afcAuto: boolean, afcEff: number, steady: object }} props
 */
export function Pension({ s, set, afcAuto, afcEff, steady }) {
  const pensionType = s.pensionType || DEFAULT_PENSION_TYPE;
  return (
    <Section eyebrow="Step five" title="Spouse's pension">
      <Field label="Include a pension"><Segmented value={s.pensionOn} onChange={set("pensionOn")} options={[{label:"Include",value:true},{label:"Skip",value:false}]} /></Field>
      {s.pensionOn && (<>
        <Field label="Pension type" hint="Which formula applies to the spouse's pension.">
          <Segmented value={pensionType} onChange={set("pensionType")} options={[
            {label:"WA DRS",value:"drs"}, {label:"Federal (FERS)",value:"fers"},
            {label:"CalSTRS",value:"calstrs"}, {label:"CalPERS",value:"calpers"},
            {label:"Texas TRS",value:"txtrs"}, {label:"NYSTRS",value:"nystrs"},
            {label:"Ohio STRS",value:"ohiostrs"}, {label:"Military",value:"military"},
            {label:"Other / generic",value:"generic"},
          ]} />
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

        {pensionType === "calstrs" && (<>
          <div className="rc-inputs">
            <Field label="Tier" hint="2% at 60: hired on/before Dec 31, 2012. 2% at 62 (PEPRA): hired on/after Jan 1, 2013."><Segmented value={s.calstrsTier || "2at60"} onChange={set("calstrsTier")} options={[{label:"2% at 60",value:"2at60"},{label:"2% at 62 (PEPRA)",value:"2at62"}]} /></Field>
            <Field label="Years of service credit"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at"><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>Final compensation{afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no final compensation was entered. Type a value to override." />}</>} hint="Highest 12 or 36 consecutive months, per the tier's rule.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            CalSTRS pays service credit x age factor x final compensation ({(s.calstrsTier||"2at60")==="2at60"?"30+ years adds a 0.2% career factor, capped at 2.4%":"no career-factor enhancement, capped at 2.4%"}). <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
            {" "}Survivor election isn&apos;t modeled for CalSTRS — the reduction is actuarial per-election, not a published factor table.
          </div>
        </>)}

        {pensionType === "calpers" && (<>
          <div className="rc-inputs">
            <Field label="Tier" hint="CalPERS has no single canonical formula — these are two representative tiers."><Segmented value={s.calpersTier || "classic2at55"} onChange={set("calpersTier")} options={[{label:"Classic 2% at 55",value:"classic2at55"},{label:"PEPRA 2% at 62",value:"pepra2at62"}]} /></Field>
            <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at"><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>Final compensation{afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no final compensation was entered. Type a value to override." />}</>} hint="Highest 12 (Classic) or 36-month average (PEPRA), per employer contract.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            This representative CalPERS tier pays benefit factor x years of service x final compensation. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
            {" "}Your actual employer's contracted formula may differ; survivor election isn&apos;t modeled here (actuarial per-election, no published table).
          </div>
        </>)}

        {pensionType === "txtrs" && (<>
          <div className="rc-inputs">
            <Field label="Years of service credit"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at"><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>Average of 5 highest annual salaries{afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no average salary was entered. Type a value to override." />}</>} hint="Grandfathered members (vested by Aug 31, 2005) use a 3-year average instead — not modeled separately here.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            Texas TRS pays 2.3% x years x average salary, unreduced at 65+5yrs or 62+ meeting the Rule of 80 (age + years ≥ 80); otherwise reduced 5%/yr below 62, or 2%/yr below 50 for 30+ years of service. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
          </div>
        </>)}

        {pensionType === "nystrs" && (<>
          <div className="rc-inputs">
            <Field label="Years of NY service credit"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at"><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>Final average salary (3-yr){afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no final average salary was entered. Type a value to override." />}</>} hint="Highest 3 consecutive years.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            NYSTRS Tier 6 pays a service-tiered factor (1.67%/yr under 20; 1.75% flat at 20; 35% + 2%/yr beyond 20) x final average salary, unreduced at 63 (or 58 with 30+ years). Early reduction is interpolated between the two age points NYSTRS publishes (55 → 73%, 61 → 94%) — a future data refresh should pull the full published table. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
          </div>
        </>)}

        {pensionType === "ohiostrs" && (<>
          <div className="rc-inputs">
            <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at"><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>Final average salary (5-yr){afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no final average salary was entered. Type a value to override." />}</>} hint="Average of the 5 highest years of Ohio earnings.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            Ohio STRS pays 2.2% x years x final average salary, but only the UNREDUCED path is modeled here (age 65+5yrs, or 32+ years at any age) — STRS Ohio doesn't publish a flat per-year reduction table for the early/reduced path, so it isn't guessed. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
          </div>
        </>)}

        {pensionType === "military" && (<>
          <div className="rc-inputs">
            <Field label="Plan" hint="Legacy High-3: entered service before 2018 (or opted out of BRS). BRS: entered on/after Jan 1, 2018."><Segmented value={s.militaryPlan || "highThree"} onChange={set("militaryPlan")} options={[{label:"Legacy High-3",value:"highThree"},{label:"Blended (BRS)",value:"brs"}]} /></Field>
            <Field label="Years of service"><NumberInput value={s.pYears} onChange={set("pYears")} /></Field>
            <Field label="Pension starts at" hint="Retired pay begins immediately at separation once the 20-year cliff is met — set this to the age you'll separate."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <Field label={<>High-3 average basic pay{afcAuto && <AssumptionIcon title="Auto-filled from the spouse's current income because no High-3 was entered. Type a value to override." />}</>} hint="Average of the highest 3 years of basic pay.">
            <NumberInput value={afcEff} onChange={set("afc")} prefix="$" suffix="/yr" />
          </Field>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            {(s.militaryPlan||"highThree")==="brs" ? "BRS pays 2.0% x years x High-3 pay." : "Legacy High-3 pays 50% of High-3 pay at 20 years, plus 2.5% per additional year."} There is a hard 20-year cliff under either system — no partial pension below 20 years of service. <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(steady.pension/12)}/mo). {steady.pensionNote}
            {" "}Survivor Benefit Plan (SBP) election isn&apos;t modeled — it would cost 6.5% of the elected base for a 55% survivor annuity.
          </div>
        </>)}

        {pensionType === "generic" && (<>
          <div className="rc-inputs">
            <Field label="Monthly pension benefit" hint="A known benefit amount — no formula, straight from the plan's statement."><NumberInput value={s.genericPensionMonthly} onChange={set("genericPensionMonthly")} prefix="$" suffix="/mo" /></Field>
            <Field label="Assumed COLA" hint="2% is a reasonable default for public/private DB plans with a COLA; use 0% if the plan has none."><NumberInput value={s.genericCola} onChange={set("genericCola")} suffix="%" /></Field>
            <Field label="Pension starts at" hint="The age the benefit statement says payments begin."><NumberInput value={s.pensionAge} onChange={set("pensionAge")} /></Field>
          </div>
          <div style={{ fontSize:12, color:C.slate, background:"var(--surface-2)", borderRadius:8, padding:"9px 11px", lineHeight:1.5 }}>
            <b style={{fontFamily:"'JetBrains Mono',monospace",color:C.ink}}>{usd0(steady.pension)}/yr</b> ({usd0(Number(s.genericPensionMonthly)||0)}/mo). The plan is modeled in today's dollars, so a COLA at or above the assumed inflation rate keeps this flat in real terms — the same convention used for every other guaranteed-income source here. Survivor election isn&apos;t modeled for a generic pension; enter your own reduced-survivor amount instead if that applies.
          </div>
        </>)}
      </>)}
    </Section>
  );
}
