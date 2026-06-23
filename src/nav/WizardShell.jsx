import { Stepper } from "./Stepper.jsx";
import { C } from "../components/theme.js";

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
    cursor: "pointer", padding: "9px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: primary ? "#fff" : C.ink,
    background: primary ? C.ink : C.panel,
    border: `1px solid ${primary ? C.ink : C.line}`,
  });

  return (
    <div>
      <Stepper
        ariaLabel="Input steps"
        items={steps.map((st) => ({ id: st.id, num: st.num, title: st.title }))}
        activeId={nav.currentStepId}
        completedIds={nav.completedStepIds}
        onSelect={nav.goToStep}
      />

      <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px 20px 6px", marginBottom: 16 }}>
        {active.render()}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <button type="button" onClick={nav.prev} disabled={nav.isFirst} style={{ ...btn(false), opacity: nav.isFirst ? 0.4 : 1, cursor: nav.isFirst ? "default" : "pointer" }}>
          ← Back
        </button>
        <span style={{ fontSize: 12, color: C.mut }}>Step {active.num} of {steps.length} · {active.title}</span>
        {nav.isLast
          ? <button type="button" onClick={nav.goToReport} style={btn(true)}>Generate report →</button>
          : <button type="button" onClick={nav.next} style={btn(true)}>Next →</button>}
      </div>
    </div>
  );
}
