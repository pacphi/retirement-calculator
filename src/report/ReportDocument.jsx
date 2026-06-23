import { Children, Fragment, isValidElement } from "react";
import { C } from "../components/theme.js";

/**
 * ReportDocument — the print composition of the report. Renders the pinned verdict once at
 * the top, then every report section in order. Reuses the SAME section render functions as
 * the on-screen ReportShell, so charts and tables are identical.
 *
 * To keep a section heading from being stranded at the bottom of a page (its first panel
 * pushed to the next), the eyebrow is grouped with the section's FIRST panel inside a single
 * `.report-keep` block (which `@media print` marks `break-inside: avoid`). Remaining panels
 * render normally — each also break-inside:avoid — so charts never split from their headings.
 *
 * @param {{ verdict: React.ReactNode, sections: Array<{id,num,title,render}> }} props
 */
export function ReportDocument({ verdict, sections }) {
  return (
    <div className="report-root" style={{ width: "100%", background: "#fff", padding: "0 4px" }}>
      <header style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700 }}>
          Retirement planner · 2026 figures
        </div>
        <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 400, fontSize: 30, lineHeight: 1.1, margin: "6px 0 2px", color: C.ink }}>
          Nest &amp; Next — Retirement Report
        </h1>
        <p style={{ margin: 0, fontSize: 12.5, color: C.slate }}>This is about your money, your home, and what comes next.</p>
      </header>

      <div className="report-block">{verdict}</div>

      {sections.map((sec) => {
        const rendered = sec.render();
        // Section render() returns either a fragment of panels or a single panel.
        const blocks = isValidElement(rendered) && rendered.type === Fragment
          ? Children.toArray(rendered.props.children)
          : Children.toArray(rendered);
        const [first, ...rest] = blocks;
        const eyebrow = (
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.brassDeep, fontWeight: 700, marginBottom: 6 }}>
            {sec.num}. {sec.title}
          </div>
        );
        return (
          <section key={sec.id} className="report-section" style={{ paddingTop: 8 }}>
            <div className="report-keep">
              {eyebrow}
              {first}
            </div>
            {rest}
          </section>
        );
      })}
    </div>
  );
}
