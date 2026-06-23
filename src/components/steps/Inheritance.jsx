import { Field, NumberInput, Segmented, Select, Section } from "../atoms/index.jsx";
import { LOCATIONS, inheritanceRulesForPlace } from "../../retirementData.js";
import { propEcon } from "../../calculatorCore.js";
import { C, inputStyle } from "../theme.js";
import { usd0 } from "../format.js";

const PLACE_OPTIONS = LOCATIONS.map((l) => l.name).sort((a, b) => a.localeCompare(b));

/**
 * Real Estate step — an editable list of inherited/owned properties in any location.
 * Add, remove, edit, and toggle properties; the sale/rent/live economics derive from each
 * property's location via inheritanceRulesForPlace().
 *
 * @param {{ s: object, addProperty: function, removeProperty: function, setProperty: function }} props
 */
export function Inheritance({ s, addProperty, removeProperty, setProperty }) {
  const properties = s.properties || [];
  const liveCount = properties.filter((p) => p.on && p.strategy === "live").length;

  return (
    <Section eyebrow="Step six" title="Real estate">
      <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5, marginBottom: 14 }}>
        Homes you own or may inherit, in any location. Set each property's location, value, year,
        and what you'd do with it — the tax math (US basis step-up vs. foreign transfer/gains taxes)
        and the impact on your plan update live.
      </div>

      {properties.length === 0 && (
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          No properties yet. Add one to model an inherited or owned home.
        </div>
      )}

      {properties.map((p, idx) => {
        const value = Number(p.value) || 0;
        const e = propEcon(p.place, value);
        const rules = inheritanceRulesForPlace(p.place);
        return (
          <div key={p.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", marginBottom: 12, background: "#FCFAF4" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input
                aria-label="Property name"
                value={p.label}
                onChange={(ev) => setProperty(idx, "label")(ev.target.value)}
                style={{ ...inputStyle, fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13.5, flex: 1 }}
              />
              <button
                type="button"
                aria-label="Remove property"
                onClick={() => removeProperty(idx)}
                style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel, color: C.slate, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <Field label="Location" hint={`${rules.foreign ? "Foreign property — transfer/gains taxes apply; inheritance over $100k may need IRS Form 3520." : "US property — basis step-up generally limits capital-gains tax on a near-term sale."}`}>
              <Select aria-label="Property location" value={p.place} onChange={setProperty(idx, "place")} options={PLACE_OPTIONS} />
            </Field>

            <Field label="Include this property">
              <Segmented value={p.on} onChange={setProperty(idx, "on")} options={[{ label: "Include", value: true }, { label: "Skip", value: false }]} />
            </Field>

            {p.on && (
              <>
                <div className="rc-inputs">
                  <Field label="Value today"><NumberInput value={p.value} onChange={setProperty(idx, "value")} prefix="$" /></Field>
                  <Field label="Year received"><NumberInput value={p.year} onChange={setProperty(idx, "year")} /></Field>
                </div>
                <Field label="What would you do with it?">
                  <Segmented value={p.strategy} onChange={setProperty(idx, "strategy")} options={[{ label: "Sell", value: "sell" }, { label: "Rent", value: "rent" }, { label: "Live in", value: "live" }]} />
                </Field>
                <div role="note" style={{ fontSize: 11, color: C.mut, lineHeight: 1.45 }}>
                  At {rules.place}: sell nets ~{usd0(e.sell)} · rent ~{usd0(e.rent)}/yr · live in ~{usd0(e.live)}/yr.
                </div>
              </>
            )}
          </div>
        );
      })}

      {liveCount > 1 && (
        <div role="note" style={{ fontSize: 11.5, color: C.clay, lineHeight: 1.45, marginBottom: 10 }}>
          You've set {liveCount} properties to "Live in" — only the first counts as your residence in the model (you can live in one home at a time).
        </div>
      )}

      <button
        type="button"
        onClick={addProperty}
        style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, borderRadius: 9, padding: "10px", color: C.slate, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        + Add property
      </button>
    </Section>
  );
}
