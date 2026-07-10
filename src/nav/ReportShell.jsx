import { ArrowLeft, Printer } from "lucide-react";
import { Stepper } from "./Stepper.jsx";
import { C, FONTS } from "../components/theme.js";

/**
 * ReportShell — the generated report (stage 2). A top bar with "Edit inputs" and the export
 * actions, the pinned verdict (always visible regardless of section), a Stepper of report
 * sections, and the single active section.
 *
 * Props:
 *   sections      — [{ id, num, title, eyebrow, icon?, render: () => ReactNode }]
 *   nav           — useWizardNav() result
 *   pinnedVerdict — ReactNode shown above every section (the headline verdict)
 *   onPrint       — () => void (optional); opens the browser print dialog (Save as PDF)
 */
export function ReportShell({ sections, nav, pinnedVerdict, onPrint }) {
  const active = sections.find((sec) => sec.id === nav.reportSectionId) || sections[0];
  const barBtn = {
    display: "inline-flex", alignItems: "center", gap: 7,
    cursor: "pointer", minHeight: 38, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
    fontFamily: FONTS.body, color: C.ink, background: C.panel, border: `1px solid ${C.line}`,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={nav.goToWizard} style={barBtn}>
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> Edit inputs
        </button>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            title="Opens your browser's print dialog — choose Save as PDF and the paper size there"
            style={{ ...barBtn, color: "var(--header-ink)", background: "var(--header-bg)", border: "1px solid var(--header-bg)" }}
          >
            <Printer size={14} strokeWidth={1.75} aria-hidden="true" />
            Print
          </button>
        )}
      </div>

      {pinnedVerdict}

      <Stepper
        ariaLabel="Report sections"
        items={sections.map((sec) => ({ id: sec.id, num: sec.num, title: sec.title, icon: sec.icon }))}
        activeId={nav.reportSectionId}
        completedIds={[]}
        onSelect={nav.goToSection}
      />

      <div>{active.render()}</div>
    </div>
  );
}
