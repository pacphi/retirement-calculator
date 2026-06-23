import { C } from "../theme.js";
import { Field, NumberInput, Section } from "../atoms/index.jsx";
import { US_STATE_TAX } from "../../retirementData.js";

/**
 * Step five — Where you'll retire & local taxes.
 *
 * Work-state / retirement-state jurisdiction split + manual stateRate override
 * for power users.
 *
 * Sets `workLoc` (US_STATE_TAX key, default "WA"), `relocationYear` (the year the
 * household moves to the retirement jurisdiction), `stateCode` (US_STATE_TAX key or
 * "" for the retirement state), and optionally `stateRate` (explicit override that
 * bypasses both location addlTaxRate and the typed profile).
 *
 * Accessible labels: "Where you live and earn now", "Relocation year", "Retirement state"
 *
 * @param {{ s: object, set: function }} props
 */
export function LocationTax({ s, set }) {
  const workProfile = s.workLoc ? US_STATE_TAX[s.workLoc] : null;
  const profile = s.stateCode ? US_STATE_TAX[s.stateCode] : null;

  // Plain-language summary for the work state (wage-tax face only).
  function workProfileNote(p, name) {
    if (!p) return null;
    if (p.wageRate === 0) return `${name}: no wage income tax while working here.`;
    return `${name}: ~${(p.wageRate * 100).toFixed(2)}% state wage tax applied to employment income before retirement.`;
  }

  // Plain-language summary of the selected state's retirement-income treatment.
  function profileNote(p, name) {
    if (!p) return null;
    if (p.retireRate === 0) {
      return `${name}: no state income tax — SS, pension, and withdrawals are state-tax-free.`;
    }
    const parts = [];
    if (!p.taxesSS) parts.push("SS exempt");
    if (p.pensionExclusion === "full") parts.push("pension fully exempt");
    else if (p.pensionExclusion > 0) parts.push(`first $${(p.pensionExclusion / 1000).toFixed(0)}k pension exempt`);
    if (!p.taxesTradWithdrawal) parts.push("IRA/401(k) withdrawals exempt");
    const exemptions = parts.length ? ` (${parts.join(", ")})` : "";
    return `${name}: ~${(p.retireRate * 100).toFixed(2)}% effective state income tax on retirement income${exemptions}.`;
  }

  const workNote = workProfile ? workProfileNote(workProfile, workProfile.name) : null;
  const note = profile ? profileNote(profile, profile.name) : null;
  // Manual override is active when stateRate is not null/empty.
  const overrideActive = s.stateRate != null && s.stateRate !== "";

  const selectStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 11px",
    border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 15,
    fontFamily: "'Inter', sans-serif", fontWeight: 600, color: C.ink,
    background: C.panel, outline: "none", cursor: "pointer",
  };

  return (
    <Section eyebrow="Step five" title="Where you'll retire & local taxes">
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

      <Field
        label="Relocation year"
        hint="The calendar year you move to your retirement jurisdiction. Work-state tax applies before this year; retirement-state tax applies from this year on."
      >
        <NumberInput
          aria-label="Relocation year"
          value={s.relocationYear ?? 2046}
          onChange={set("relocationYear")}
          min={2026}
          max={2070}
          step={1}
        />
      </Field>

      <div
        role="note"
        style={{
          fontSize: 11.5, color: C.mut, lineHeight: 1.5, marginBottom: 14,
          padding: "7px 10px", background: "#F1EEE5", borderRadius: 8,
        }}
      >
        This is when the tax and cost basis switches to your retirement jurisdiction.
        The transition year is simplified — see disclaimer. Real residency turns on the
        183-day rule and is professional territory; once you have moved, the federal{" "}
        <a
          href="https://www.law.cornell.edu/uscode/text/4/114"
          target="_blank"
          rel="noreferrer"
          style={{ color: C.brassDeep, fontWeight: 700 }}
        >
          Pension Source Tax Act
        </a>{" "}
        bars your former work state from taxing your retirement income.
      </div>

      <Field
        label="Retirement state"
        hint="Select your US retirement state for income-type-aware state tax. Leave blank for the international location rate."
      >
        <select
          aria-label="Retirement state"
          value={s.stateCode ?? ""}
          onChange={(e) => set("stateCode")(e.target.value || null)}
          style={selectStyle}
        >
          <option value="">— International / use location rate —</option>
          {Object.entries(US_STATE_TAX).map(([code, p]) => (
            <option key={code} value={code}>{p.name}</option>
          ))}
        </select>
      </Field>

      {note && (
        <div
          role="note"
          style={{
            fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 14,
            padding: "8px 10px", background: "#F6F2E8", borderRadius: 8,
          }}
        >
          {note}
        </div>
      )}

      <Field
        label="State rate override"
        hint="Overrides both the state picker and location rate. Enter 0 to remove the override. Leave blank to use the state picker or location default."
      >
        <NumberInput
          aria-label="State rate override"
          value={s.stateRate ?? ""}
          onChange={(v) => set("stateRate")(v === "" ? null : v)}
          suffix="%"
          min={0}
          max={25}
          step={0.5}
        />
      </Field>

      {overrideActive && (
        <div
          role="note"
          style={{
            fontSize: 11.5, color: C.mut, lineHeight: 1.5, marginBottom: 10,
            padding: "7px 10px", background: "#F1EEE5", borderRadius: 8,
          }}
        >
          Rate override active — applied as a flat percentage on federal taxable income,
          bypassing the typed state rules. Clear to use the state picker or location default.
        </div>
      )}

      <p style={{ fontSize: 11.5, color: C.mut, lineHeight: 1.5, margin: "0 0 4px" }}>
        Rates are planning-grade effective approximations — state tax varies by county
        and income level. Roth withdrawals are always state-tax-free. Source:{" "}
        <a
          href="https://www.kiplinger.com/retirement/601819/states-that-wont-tax-your-pension"
          target="_blank"
          rel="noreferrer"
          style={{ color: C.brassDeep, fontWeight: 700 }}
        >
          Kiplinger state tax guide
        </a>
        .
      </p>
    </Section>
  );
}
