import { Field, NumberInput, Segmented, Select, Section } from "../atoms/index.jsx";
import { C, inputStyle } from "../theme.js";

const RISK_OPTIONS = [
  { label: "Conservative", value: "conservative" },
  { label: "Moderate", value: "moderate" },
  { label: "Aggressive", value: "aggressive" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { label: "401(k)", value: "401k" },
  { label: "403(b)", value: "403b" },
  { label: "Traditional IRA", value: "traditional_ira" },
  { label: "Roth IRA", value: "roth_ira" },
  { label: "Taxable brokerage", value: "taxable" },
  { label: "HSA", value: "hsa" },
];

/**
 * Step eleven — Investments. Risk tolerance and an optional accredited-investor
 * self-attestation (aggressive tier only) drive which curated funds the report
 * recommends; the account list drives the per-account allocation breakdown.
 * Everything here is optional — an empty account list still produces allocation
 * guidance in the report, just without a per-account table.
 *
 * @param {{ s: object, set: function, addAccount: function, removeAccount: function, setAccount: function }} props
 */
export function Investments({ s, set, addAccount, removeAccount, setAccount }) {
  const accounts = s.investmentAccounts || [];

  return (
    <Section eyebrow="Step eleven" title="Investments">
      <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5, marginBottom: 14 }}>
        Risk tolerance and your account list drive the curated fund recommendations in the
        report — a separate set for while you're still working and for once you've retired.
      </div>

      <Field label="Risk tolerance" hint="Aggressive unlocks growth/tech funds and, with accreditation, private-market options.">
        <Segmented aria-label="Risk tolerance" value={s.riskTolerance} onChange={set("riskTolerance")} options={RISK_OPTIONS} />
      </Field>

      {s.riskTolerance === "aggressive" && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 12.5, color: C.slate, cursor: "pointer" }}>
          <input
            type="checkbox"
            aria-label="I'm an accredited investor"
            checked={!!s.accreditedInvestor}
            onChange={(e) => set("accreditedInvestor")(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer" }}
          />
          I'm an accredited investor ($1M net worth excluding primary residence, or $200k+ income)
        </label>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Investment accounts (optional)</div>

      {accounts.length === 0 && (
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          No accounts yet. Add one to see a per-account allocation breakdown in the report.
        </div>
      )}

      {accounts.map((a, idx) => (
        <div key={a.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", marginBottom: 12, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              aria-label="Account name"
              value={a.name}
              onChange={(ev) => setAccount(idx, "name")(ev.target.value)}
              style={{ ...inputStyle, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13.5, flex: 1 }}
            />
            <button
              type="button"
              aria-label="Remove account"
              onClick={() => removeAccount(idx)}
              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.slate, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div className="rc-inputs">
            <Field label="Account type">
              <Select aria-label="Account type" value={a.type} onChange={setAccount(idx, "type")} options={ACCOUNT_TYPE_OPTIONS} />
            </Field>
            <Field label="Balance">
              <NumberInput aria-label="Account balance" value={a.balance} onChange={setAccount(idx, "balance")} prefix="$" min={0} />
            </Field>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addAccount}
        style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, borderRadius: 9, padding: "10px", color: C.slate, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        + Add account
      </button>

      <p style={{ fontSize: 11, color: C.mut, lineHeight: 1.5, margin: "14px 0 0" }}>
        Educational only — not financial advice. Return figures are historical and cited in the
        report; past performance does not guarantee future results.
      </p>
    </Section>
  );
}
