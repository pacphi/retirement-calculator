import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Stepper } from "./Stepper.jsx";
import { C, FONTS } from "../components/theme.js";

/**
 * WizardShell — renders the input wizard: a Stepper of all steps, the single active step,
 * and a Back / Next footer. The last step swaps Next for a primary "Generate report".
 *
 * Props:
 *   steps — [{ id, num, title, eyebrow, render: () => ReactNode }]
 *   nav   — useWizardNav() result
 */
export function WizardShell({ steps, nav }) {
  const active = steps.find((st) => st.id === nav.currentStepId) || steps[0];
  const btn = (primary) => ({
    display: "inline-flex", alignItems: "center", gap: 8,
    cursor: "pointer", minHeight: 40, padding: "9px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    fontFamily: FONTS.body,
    color: primary ? "var(--header-ink)" : C.ink,
    background: primary ? "var(--header-bg)" : C.panel,
    border: `1px solid ${primary ? "var(--header-bg)" : C.line}`,
  });

  return (
    <div>
      <Stepper
        ariaLabel="Input steps"
        items={steps.map((st) => ({ id: st.id, num: st.num, title: st.title }))}
        activeId={nav.currentStepId}
        completedIds={nav.completedStepIds}
        onSelect={nav.goToStep}
        breakAfter={[5]}
      />

      <div className="nn-card" style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: "24px 24px 10px", marginBottom: 20 }}>
        {active.render()}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <button type="button" onClick={nav.prev} disabled={nav.isFirst} style={{ ...btn(false), opacity: nav.isFirst ? 0.45 : 1, cursor: nav.isFirst ? "default" : "pointer" }}>
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" /> Back
        </button>
        <span style={{ fontSize: 12.5, color: C.mut, fontVariantNumeric: "tabular-nums" }}>Step {active.num} of {steps.length} · {active.title}</span>
        {nav.isLast
          ? <button type="button" onClick={nav.goToReport} style={btn(true)}>Generate report <FileText size={15} strokeWidth={1.75} aria-hidden="true" /></button>
          : <button type="button" onClick={nav.next} style={btn(true)}>Next <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" /></button>}
      </div>
    </div>
  );
}
