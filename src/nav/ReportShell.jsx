import { Stepper } from "./Stepper.jsx";
import { C } from "../components/theme.js";

/**
 * ReportShell — the generated report (stage 2). A top bar with "Edit inputs" and the export
 * actions, the pinned verdict (always visible regardless of section), a Stepper of report
 * sections, and the single active section.
 *
 * Props:
 *   sections      — [{ id, num, title, eyebrow, render: () => ReactNode }]
 *   nav           — useWizardNav() result
 *   pinnedVerdict — ReactNode shown above every section (the headline verdict)
 *   onPrint       — () => void (optional); opens the browser print dialog (Save as PDF)
 */
export function ReportShell({ sections, nav, pinnedVerdict, onPrint }) {
  const active = sections.find((sec) => sec.id === nav.reportSectionId) || sections[0];
  const barBtn = {
    cursor: "pointer", padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif", color: C.ink, background: C.panel, border: `1px solid ${C.line}`,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" onClick={nav.goToWizard} style={barBtn}>← Edit inputs</button>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            title="Opens your browser's print dialog — choose Save as PDF and the paper size there"
            style={{ ...barBtn, display: "inline-flex", alignItems: "center", gap: 7, color: "#fff", background: C.ink, border: `1px solid ${C.ink}` }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1M4 10h8v4H4z"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Print
          </button>
        )}
      </div>

      {pinnedVerdict}

      <Stepper
        ariaLabel="Report sections"
        items={sections.map((sec) => ({ id: sec.id, num: sec.num, title: sec.title }))}
        activeId={nav.reportSectionId}
        completedIds={sections.map((sec) => sec.id)}
        onSelect={nav.goToSection}
      />

      <div>{active.render()}</div>
    </div>
  );
}
