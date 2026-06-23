import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { SOURCES, GUARDRAIL_DEFAULTS } from "../../retirementData.js";

/**
 * Step seven — Retirement spending strategy — smile curve shape selector + lifestyle steps
 * + opt-in Guyton-Klinger guardrails (Wave 3 Task 6).
 *
 * Exposes three modes via a Segmented control:
 *   "flat"   — constant real spending (default; smile multiplier = 1)
 *   "smile"  — Blanchett retirement spending smile (default parameters)
 *   "custom" — user-set earlyDecline rate and upturnAge
 *
 * Spending strategy (opt-in):
 *   "fixed"      — deterministic fixed need (default; no guardrail multiplier)
 *   "guardrails" — Guyton-Klinger bands; multiplier trims/raises discretionary only
 *
 * Also renders the C2 lifestyle step-change rows (permanent real-dollar deltas).
 *
 * @param {{ s: object, set: function, setProp: function,
 *            addLifestyleStep: function, removeLifestyleStep: function,
 *            setLifestyleStep: function }} props
 */
export function SpendingStrategy({ s, set, setProp, addLifestyleStep, removeLifestyleStep, setLifestyleStep }) {
  const shape = s.spendingShape ?? { mode: "flat" };
  const strategy = s.spendingStrategy ?? "fixed";
  const guardrails = s.guardrails ?? GUARDRAIL_DEFAULTS;

  return (
    <Section eyebrow="Step seven" title="Retirement spending">
      {/* Task 6: Guyton-Klinger guardrail strategy toggle */}
      <Field label="Spending strategy" hint="Guardrails trim or raise discretionary spending when the withdrawal rate breaches the target band">
        <Segmented
          aria-label="Spending strategy"
          value={strategy}
          onChange={(v) => set((prev) => ({ ...prev, spendingStrategy: v }))}
          options={[
            { value: "fixed",      label: "Fixed need" },
            { value: "guardrails", label: "Guardrails" },
          ]}
        />
      </Field>

      {strategy === "guardrails" && (
        <>
          <div className="rc-inputs">
            <Field label="Upper guardrail %" hint="Cut spending when withdrawal rate exceeds SWR × (1 + upper%)">
              <NumberInput
                value={guardrails.upperPct ?? GUARDRAIL_DEFAULTS.upperPct}
                onChange={(v) => set((prev) => ({ ...prev, guardrails: { ...(prev.guardrails ?? GUARDRAIL_DEFAULTS), upperPct: Number(v) || 0 } }))}
                step={1} min={1} max={50} suffix="%"
              />
            </Field>
            <Field label="Lower guardrail %" hint="Raise spending when withdrawal rate falls below SWR × (1 − lower%)">
              <NumberInput
                value={guardrails.lowerPct ?? GUARDRAIL_DEFAULTS.lowerPct}
                onChange={(v) => set((prev) => ({ ...prev, guardrails: { ...(prev.guardrails ?? GUARDRAIL_DEFAULTS), lowerPct: Number(v) || 0 } }))}
                step={1} min={1} max={50} suffix="%"
              />
            </Field>
            <Field label="Spending cut %" hint="Reduce discretionary spending by this % when the upper band is breached">
              <NumberInput
                value={guardrails.cutPct ?? GUARDRAIL_DEFAULTS.cutPct}
                onChange={(v) => set((prev) => ({ ...prev, guardrails: { ...(prev.guardrails ?? GUARDRAIL_DEFAULTS), cutPct: Number(v) || 0 } }))}
                step={1} min={1} max={30} suffix="%"
              />
            </Field>
            <Field label="Spending raise %" hint="Increase discretionary spending by this % when the lower band is breached">
              <NumberInput
                value={guardrails.raisePct ?? GUARDRAIL_DEFAULTS.raisePct}
                onChange={(v) => set((prev) => ({ ...prev, guardrails: { ...(prev.guardrails ?? GUARDRAIL_DEFAULTS), raisePct: Number(v) || 0 } }))}
                step={1} min={1} max={30} suffix="%"
              />
            </Field>
          </div>
          <p style={{ fontSize: 11.5, color: C.slate, lineHeight: 1.5, margin: "0 0 10px" }}>
            Guardrails trade a higher starting spend for variability — each band is a percentile
            of realized spending across 1,000 paths. Discretionary only; housing and healthcare
            are never trimmed.{" "}
            <a href={SOURCES.kitcesGuardrails} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
              Kitces
            </a>
            {" / "}
            <a href={SOURCES.morningstarGuardrails} target="_blank" rel="noreferrer" style={{ color: C.brassDeep }}>
              Morningstar
            </a>
            .
          </p>
        </>
      )}

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
