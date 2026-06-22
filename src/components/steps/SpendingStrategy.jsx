import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { SOURCES } from "../../retirementData.js";

/**
 * Retirement spending strategy step — smile curve shape selector + lifestyle steps.
 *
 * Exposes three modes via a Segmented control:
 *   "flat"   — constant real spending (default; smile multiplier = 1)
 *   "smile"  — Blanchett retirement spending smile (default parameters)
 *   "custom" — user-set earlyDecline rate and upturnAge
 *
 * Also renders the C2 lifestyle step-change rows (permanent real-dollar deltas).
 *
 * @param {{ s: object, set: function, setProp: function,
 *            addLifestyleStep: function, removeLifestyleStep: function,
 *            setLifestyleStep: function }} props
 */
export function SpendingStrategy({ s, setProp, addLifestyleStep, removeLifestyleStep, setLifestyleStep }) {
  const shape = s.spendingShape ?? { mode: "flat" };

  return (
    <Section eyebrow="Optional" title="Retirement spending">
      <Field label="Spending shape">
        <Segmented
          value={shape.mode}
          onChange={setProp("spendingShape", "mode")}
          options={[
            { value: "flat",   label: "Flat" },
            { value: "smile",  label: "Spending smile" },
            { value: "custom", label: "Custom" },
          ]}
        />
      </Field>

      {shape.mode === "smile" && (
        <p style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.5, margin: "0 0 10px" }}>
          Real discretionary spending declines ~1%/yr through the active years, bottoms at a
          75% floor, then drifts back up from age 85 as healthcare rises.{" "}
          <a href={SOURCES.smileRR} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
            Blanchett / Retirement Researcher
          </a>
          .
        </p>
      )}

      {shape.mode === "custom" && (
        <>
          <div className="rc-inputs">
            <Field label="Early real decline (%/yr)" hint="Real spending drop per year in retirement (e.g. 1 = 1%/yr)">
              <NumberInput
                value={shape.earlyDecline != null ? Math.round(shape.earlyDecline * 1000) / 10 : 1}
                onChange={(v) => setProp("spendingShape", "earlyDecline")((Number(v) || 0) / 100)}
                step={0.1}
                min={0}
                max={5}
                suffix="%"
              />
            </Field>
            <Field label="Late-life upturn age" hint="Age at which spending begins to drift back up">
              <NumberInput
                value={shape.upturnAge ?? 85}
                onChange={(v) => setProp("spendingShape", "upturnAge")(Number(v) || 85)}
                step={1}
                min={65}
                max={100}
              />
            </Field>
          </div>
          <p style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.5, margin: "0 0 10px" }}>
            Real spending scales the non-housing base only; healthcare is added on top.{" "}
            <a href={SOURCES.smileRR} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
              Blanchett / Retirement Researcher
            </a>
            .
          </p>
        </>
      )}

      {/* C2 lifestyle step-change rows */}
      {(s.lifestyleSteps || []).map((st, idx) => (
        <div key={st.id} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px 12px", marginBottom: 10, background: C.panel }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Lifestyle change {idx + 1}</span>
            <button type="button" aria-label={`Remove lifestyle change ${idx + 1}`} onClick={() => removeLifestyleStep(idx)}
              style={{ border: "none", background: "none", color: C.clay, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "end" }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: .5, textTransform: "uppercase", color: C.slate, fontWeight: 700, marginBottom: 4 }}>From year</div>
              <NumberInput
                value={st.fromYear}
                aria-label="lifestyle change year"
                onChange={setLifestyleStep(idx, "fromYear")}
                step={1}
                min={2026}
              />
            </div>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: .5, textTransform: "uppercase", color: C.slate, fontWeight: 700, marginBottom: 4 }}>Annual delta</div>
              <NumberInput
                value={st.deltaAnnual}
                aria-label="lifestyle change amount"
                onChange={setLifestyleStep(idx, "deltaAnnual")}
                prefix="$"
                step={1000}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" aria-label="Add a lifestyle change" onClick={addLifestyleStep}
        style={{ marginTop: 4, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "none", color: C.viridian, border: `1px solid ${C.viridian}`, borderRadius: 6 }}>
        + Add a lifestyle change
      </button>
    </Section>
  );
}
