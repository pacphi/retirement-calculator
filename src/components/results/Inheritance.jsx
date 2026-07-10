import { C } from "../theme.js";
import { propEcon } from "../../calculatorCore.js";
import { inheritanceRulesForPlace } from "../../retirementData.js";
import { usd0 } from "../format.js";

function PropCard({ p, idx, setProperty }) {
  const value = Number(p.value) || 0;
  const e = propEcon(p.place, value);
  const rules = inheritanceRulesForPlace(p.place);
  const opts = [["sell", "Sell"], ["rent", "Rent out"], ["live", "Live in"]];
  const chosen = p.strategy;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 15px", marginBottom: 12, background: "var(--surface-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <h4 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 17, color: C.ink }}>{p.label}</h4>
        <span style={{ fontSize: 11, color: C.mut }}>arrives {p.year}</span>
      </div>
      <div style={{ fontSize: 11, color: C.slate, marginBottom: 10 }}>{p.place}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {opts.map(([v, lab]) => {
          const on = chosen === v;
          const num = v === "sell" ? e.sell : v === "rent" ? e.rent : e.live;
          const unit = v === "sell" ? "net" : "/yr";
          return (
            <button key={v} onClick={() => setProperty(idx, "strategy")(v)} style={{ flex: 1, textAlign: "left", border: `1.5px solid ${on ? C.brass : C.line}`, background: on ? "var(--surface)" : "transparent", borderRadius: 9, padding: "9px 10px", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: on ? C.brassDeep : C.slate, marginBottom: 3 }}>{lab}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: num < 0 ? C.clay : C.ink }}>{usd0(num)}<span style={{ fontSize: 10, color: C.mut, fontWeight: 400 }}>{unit}</span></div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.5, background: "var(--track)", borderRadius: 8, padding: "8px 10px" }}>
        <b style={{ color: C.ink }}>{chosen === "sell" ? "If sold:" : chosen === "rent" ? "If rented:" : "If you live in it:"}</b> {rules.notes[chosen]}
      </div>
    </div>
  );
}

/**
 * Real Estate result panel — what to do with each property.
 *
 * @param {{ s: object, setProperty: function }} props
 */
export function Inheritance({ s, setProperty }) {
  const properties = (s.properties || []);
  const active = properties.map((p, idx) => ({ p, idx })).filter(({ p }) => p.on);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>The estate</div>
      <h3 style={{ margin: "2px 0 4px", fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 20 }}>What to do with each property</h3>
      <p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
        Any home you own or expect to inherit sits outside your investment portfolio, and each one comes with its own
        location-specific tax rules and carrying costs (property tax, transfer/inheritance tax, capital gains on sale).
        This section prices out your three options for each property so you can compare them on equal after-tax footing:
      </p>
      <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 12.5, color: C.slate, lineHeight: 1.6 }}>
        <li><b style={{ color: C.ink }}>Sell</b> — a one-time net cash windfall that gets added to your investment portfolio the year it arrives, growing (or drawing down) with the rest of your savings from then on.</li>
        <li><b style={{ color: C.ink }}>Rent out</b> — an ongoing rental income stream, taxed annually, that shows up alongside Social Security and pension income on the Income tab for every year you keep it.</li>
        <li><b style={{ color: C.ink }}>Live in</b> — you move in and stop paying your modeled retirement-location housing cost; the property's own (usually lower) carrying cost replaces it instead.</li>
      </ul>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.slate, lineHeight: 1.5 }}>
        Pick a strategy per card below — the highlighted figure is that option's after-tax outcome — and the choice flows
        straight into the Income, Portfolio, and Taxes &amp; Location tabs.
      </p>
      {active.map(({ p, idx }) => <PropCard key={p.id} p={p} idx={idx} setProperty={setProperty} />)}
      {active.length === 0 && <div style={{ fontSize: 12.5, color: C.mut }}>No active properties. Add or include one in the Real Estate step to model it.</div>}
    </div>
  );
}
