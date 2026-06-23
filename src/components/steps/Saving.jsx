import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { vehicleLimit } from "../../finance/contributions.js";

const VEHICLES = ["401k", "ira", "hsaSelf", "hsaFamily"];
const OWNERS = ["A", "B"];

/**
 * Saving — contributions & salary growth step.
 *
 * Simple mode: a single annual contribution number (today's control, now labeled
 * "Annual contribution") split by the bucket-split percentages.
 * Detailed mode: a per-vehicle stream table with 2026 IRS limits, an employer-match
 * row, and a real-raise slider.
 *
 * Accessible labels: "Contribution mode", "Annual contribution", "Real raise",
 *   "Add contribution stream", "Vehicle", "Employer match %".
 *
 * @param {{ s: object, set: function }} props
 */
export function Saving({ s, set }) {
  const mode = s.contribMode ?? "simple";
  const streams = s.contribStreams ?? [];
  const match = s.employerMatch ?? { pct: 0, capPct: 0 };
  const realRaise = s.realRaise ?? 0;
  const split = s.bucketSplit ?? { mode: "pct", deferredPct: 70, taxablePct: 30, rothPct: 0 };

  const setMatch = (field) => (v) =>
    set("employerMatch")({ ...match, [field]: Number(v) || 0 });

  const addStream = () =>
    set("contribStreams")([
      ...streams,
      { id: crypto.randomUUID(), vehicle: "401k", owner: "B", amount: 0, roth: false },
    ]);

  const removeStream = (id) =>
    set("contribStreams")(streams.filter((s) => s.id !== id));

  const updateStream = (id, field, value) =>
    set("contribStreams")(
      streams.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );

  const ageForOwner = (owner) => (owner === "A" ? s.ageA : s.ageB) ?? 0;

  return (
    <Section eyebrow="Saving" title="Contributions & salary growth">
      <Field label="Contribution mode">
        <Segmented
          value={mode}
          onChange={set("contribMode")}
          options={[
            { value: "simple",   label: "Simple" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
      </Field>

      {mode === "simple" && (
        <>
          <Field label="Annual contribution" hint="Total household savings per year (401k, IRA, etc.)">
            <NumberInput
              value={s.contrib ?? 0}
              onChange={set("contrib")}
              prefix="$"
              min={0}
              step={500}
            />
          </Field>
          <Field label="Pre-tax share (%)" hint="Portion going into tax-deferred accounts (matches the deferred split below)">
            <NumberInput
              value={split.deferredPct ?? 70}
              onChange={(v) =>
                set("bucketSplit")({
                  ...split,
                  mode: "pct",
                  deferredPct: Number(v) || 0,
                  taxablePct: Math.max(0, 100 - (Number(v) || 0) - (split.rothPct ?? 0)),
                })
              }
              suffix="%"
              min={0}
              max={100}
              step={5}
            />
          </Field>
        </>
      )}

      {mode === "detailed" && (
        <>
          <div style={{ marginBottom: 12 }}>
            {streams.length === 0 && (
              <p style={{ fontSize: 13, color: C.mut, margin: "0 0 10px" }}>
                No contribution streams yet. Add one below.
              </p>
            )}
            {streams.map((st) => {
              const lim = vehicleLimit(st.vehicle, ageForOwner(st.owner));
              const pct = lim === Infinity ? null : Math.min(100, Math.round((st.amount / lim) * 100));
              return (
                <div key={st.id} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 120px" }}>
                      <Field label="Vehicle">
                        <select
                          value={st.vehicle}
                          onChange={(e) => updateStream(st.id, "vehicle", e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.ink, background: C.panel }}
                        >
                          {VEHICLES.map((v) => (
                            <option key={v} value={v}>{v.toUpperCase()}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div style={{ flex: "0 0 70px" }}>
                      <Field label="Owner">
                        <select
                          value={st.owner}
                          onChange={(e) => updateStream(st.id, "owner", e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: C.ink, background: C.panel }}
                        >
                          {OWNERS.map((o) => (
                            <option key={o} value={o}>Spouse {o}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div style={{ flex: "1 1 130px" }}>
                      <Field label="Amount">
                        <NumberInput
                          value={st.amount}
                          onChange={(v) => updateStream(st.id, "amount", Number(v) || 0)}
                          prefix="$"
                          min={0}
                          step={500}
                        />
                      </Field>
                    </div>
                    <div style={{ flex: "0 0 80px", paddingTop: 20 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.ink, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={!!st.roth}
                          onChange={(e) => updateStream(st.id, "roth", e.target.checked)}
                          aria-label="Roth"
                        />
                        Roth
                      </label>
                    </div>
                    <div style={{ flex: "0 0 auto", paddingTop: 18 }}>
                      <button
                        onClick={() => removeStream(st.id)}
                        style={{ padding: "6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, background: "none", color: C.clay, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {lim !== Infinity && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11.5, color: C.mut, marginBottom: 3 }}>
                        2026 limit: ${lim.toLocaleString()} {pct != null && `(${pct}% used)`}
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: C.line, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, pct ?? 0)}%`, background: (pct ?? 0) >= 100 ? C.clay : C.viridian, transition: "width .2s" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={addStream}
              aria-label="Add contribution stream"
              style={{ width: "100%", padding: "9px", border: `1px dashed ${C.brass}`, borderRadius: 8, background: "none", color: C.brassDeep, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", marginBottom: 10 }}
            >
              + Add contribution stream
            </button>
          </div>

          <Field label="Employer match %" hint="Match percentage on employee contributions">
            <NumberInput
              value={match.pct}
              onChange={setMatch("pct")}
              suffix="%"
              min={0}
              max={100}
              step={5}
            />
          </Field>
          <Field label="Match cap (% of salary)" hint="Employer matches up to this % of salary">
            <NumberInput
              value={match.capPct}
              onChange={setMatch("capPct")}
              suffix="%"
              min={0}
              max={20}
              step={1}
            />
          </Field>
        </>
      )}

      <Field label="Real raise" hint="Annual salary growth above inflation — on top of inflation (e.g. 2 = 2%/yr real)">
        <NumberInput
          id="saving-real-raise"
          aria-label="Real raise"
          value={Math.round(realRaise * 1000) / 10}
          onChange={(v) => set("realRaise")((Number(v) || 0) / 100)}
          suffix="%"
          min={0}
          max={10}
          step={0.5}
        />
      </Field>
    </Section>
  );
}
