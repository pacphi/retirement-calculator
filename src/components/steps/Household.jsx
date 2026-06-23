import { C } from "../theme.js";
import { Field, NumberInput, Select, Segmented, Section } from "../atoms/index.jsx";
import { LOCATIONS, US_STATE_TAX } from "../../retirementData.js";
import { usd0 } from "../format.js";

/**
 * Step one — Your household, today.
 *
 * @param {{ s: object, set: function, setProp: function, deferredMode: string, onDeferredModeChange: function, incomeHH: number }} props
 */
export function Household({ s, set, deferredMode, onDeferredModeChange, incomeHH }) {
  const workProfile = s.workLoc ? US_STATE_TAX[s.workLoc] : null;

  // Plain-language summary for the work state (wage-tax face only).
  function workProfileNote(p, name) {
    if (!p) return null;
    if (p.wageRate === 0) return `${name}: no wage income tax while working here.`;
    return `${name}: ~${(p.wageRate * 100).toFixed(2)}% state wage tax applied to employment income before retirement.`;
  }

  const workNote = workProfile ? workProfileNote(workProfile, workProfile.name) : null;

  const selectStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 11px",
    border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 15,
    fontFamily: "'Inter', sans-serif", fontWeight: 600, color: C.ink,
    background: C.panel, outline: "none", cursor: "pointer",
  };

  return (
    <Section eyebrow="Step one" title="Your household, today">
      <div className="rc-inputs">
        <Field label="Your age now"><NumberInput value={s.ageA} onChange={set("ageA")} /></Field>
        <Field label="Spouse age now"><NumberInput value={s.ageB} onChange={set("ageB")} /></Field>
        <Field label="Your annual income"><NumberInput value={s.incomeA} onChange={set("incomeA")} prefix="$" /></Field>
        <Field label="Spouse income" hint="Spouse's teaching salary."><NumberInput value={s.incomeB} onChange={set("incomeB")} prefix="$" /></Field>
        <Field label="Combined savings now"><NumberInput value={s.savings} onChange={set("savings")} prefix="$" /></Field>
        <Field label="Saved per year" hint="Stops as each of you retires."><NumberInput value={s.contrib} onChange={set("contrib")} prefix="$" /></Field>
      </div>

      <Field
        label="Where you live & earn now"
        hint="Your US state while employed. Sets the wage-tax rate applied to employment income before retirement."
      >
        <select
          aria-label="Where you live and earn now"
          value={s.workLoc ?? "WA"}
          onChange={(e) => set("workLoc")(e.target.value || "WA")}
          style={selectStyle}
        >
          {Object.entries(US_STATE_TAX).map(([code, p]) => (
            <option key={code} value={code}>{p.name}</option>
          ))}
        </select>
      </Field>

      {workNote && (
        <div
          role="note"
          style={{
            fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14,
            padding: "8px 10px", background: "#F6F2E8", borderRadius: 8,
          }}
        >
          {workNote}
        </div>
      )}
      <div style={{ display:"flex", marginBottom:8 }}>
        <Segmented value={deferredMode} onChange={onDeferredModeChange}
          options={[{label:"% of savings",value:"pct"},{label:"$ amount",value:"amt"}]} />
      </div>
      <Field
        label={`Pre-tax 401(k)/IRA share of savings — ${Math.round(s.tradFrac*100)}%`}
        hint="Portion of combined savings in pre-tax 401(k)/IRA/403(b). RMDs apply to this starting at age 75; the rest is treated as Roth/after-tax. The plan takes each RMD on schedule, so no penalty applies — a missed RMD is taxed at 25% (10% if fixed within 2 years).">
        {deferredMode==="pct"
          ? <input type="range" min={0} max={100} step={10} value={s.tradFrac*100} onChange={(e)=>set("tradFrac")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} />
          : <NumberInput value={Math.round(s.tradFrac*(Number(s.savings)||0))} prefix="$" min={0}
              onChange={(v)=>{ const sav=Number(s.savings)||0; const amt=Number(v)||0; set("tradFrac")(sav>0 ? Math.min(1, Math.max(0, amt/sav)) : 0); }} />}
      </Field>
      <Field label="Filing status"><Segmented value={s.status} onChange={set("status")} options={[{label:"Married",value:"married"},{label:"Single",value:"single"}]} /></Field>
      <div style={{ marginBottom:14 }}>
        <span style={{ display:"block", fontSize:12.5, fontWeight:600, color:C.ink, marginBottom:5 }}>Spending basis</span>
        <Segmented value={s.spendBasis} onChange={set("spendBasis")} options={[{label:"% of income",value:"income"},{label:"Location cost",value:"location"}]} />
        <span style={{ display:"block", fontSize:11, color:C.mut, marginTop:4, lineHeight:1.4 }}>Estimate retirement spending as a share of income, or from the cost of living where you'll retire.</span>
      </div>
      {s.spendBasis === "income" ? (
        <Field label={`Retire on this share of income — ${Math.round(s.targetPct*100)}%`} hint={`Non-housing spending goal: ${usd0(incomeHH*s.targetPct)}/yr (housing added separately). The timeline adds the pre-65 healthcare gap on top.`}>
          <input type="range" min={20} max={80} step={5} value={s.targetPct*100} onChange={(e)=>set("targetPct")(Number(e.target.value)/100)} style={{ width:"100%", accentColor:C.brass }} />
        </Field>
      ) : (() => {
        const l = LOCATIONS.find(x => x.name === s.retireLoc) || LOCATIONS[0];
        const life = (Number(s.lifestyle) || 100) / 100;
        const livingMo = Object.values(l.m).reduce((a, b) => a + b, 0) * life;
        const yr65 = Math.round((livingMo + l.hcPost) * 12);
        const yrPre = Math.round((livingMo + l.hcPre) * 12);
        return (
          <>
            <Field label="Cost-of-living basis" hint="Where you'll retire — sets the spending baseline and healthcare. (Same selector as on the timeline.)">
              <Select value={s.retireLoc} onChange={set("retireLoc")} options={LOCATIONS.map(x => x.name)} />
            </Field>
            <Field label={`Lifestyle — ${s.lifestyle}% of ${s.retireLoc} cost of living`} hint={`Spending here: about ${usd0(yr65)}/yr at 65+ (${usd0(yrPre)}/yr before Medicare, full-price healthcare). Lifestyle scales living costs; healthcare is applied by age.`}>
              <input type="range" min={70} max={150} step={5} value={s.lifestyle} onChange={(e)=>set("lifestyle")(Number(e.target.value))} style={{ width:"100%", accentColor:C.brass }} />
            </Field>
          </>
        );
      })()}
    </Section>
  );
}
