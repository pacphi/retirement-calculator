import { C } from "../theme.js";
import { Field, NumberInput, Segmented, Section } from "../atoms/index.jsx";
import { SOURCES } from "../../retirementData.js";

/**
 * Retirement spending strategy step — smile curve shape selector.
 *
 * Exposes three modes via a Segmented control:
 *   "flat"   — constant real spending (default; smile multiplier = 1)
 *   "smile"  — Blanchett retirement spending smile (default parameters)
 *   "custom" — user-set earlyDecline rate and upturnAge
 *
 * C2 (lifestyle steps) rows will be inserted below the marked comment.
 *
 * @param {{ s: object, set: function, setProp: function }} props
 */
export function SpendingStrategy({ s, setProp }) {
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

      {/* C2 (lifestyle steps): insert lifestyle-step rows here */}
    </Section>
  );
}
