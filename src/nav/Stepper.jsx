import { Fragment } from "react";
import { Check } from "lucide-react";
import { C, FONTS } from "../components/theme.js";

/**
 * Stepper — a reusable horizontal breadcrumb of numbered bubbles, used for BOTH the input
 * wizard and the report-section navigation. Every bubble is a real <button>, so jumps are
 * non-linear and the control is keyboard- and test-reachable.
 *
 * Props:
 *   items        — [{ id, num, title, icon? }]  (icon: optional Lucide component)
 *   activeId     — id of the active bubble (filled pine chip)
 *   completedIds — Set<string> | array of ids to mark visited (checkmark)
 *   onSelect     — (id: string) => void
 *   ariaLabel    — accessible label for the nav landmark (default "Steps")
 *   breakAfter   — optional row sizes, e.g. [5] to force a line break after the 5th pill
 *                  (leaving the remainder on the next line), instead of relying on the
 *                  browser's natural flex-wrap, which can strand a single trailing pill
 *                  alone on its own row. A narrow viewport may still wrap earlier within
 *                  a row; this only caps how many pills can share a row, never forces more.
 */
export function Stepper({ items, activeId, completedIds, onSelect, ariaLabel = "Steps", breakAfter }) {
  const done = completedIds instanceof Set ? completedIds : new Set(completedIds || []);
  // Convert row sizes (e.g. [5]) into the 0-based item indices after which to force a
  // line break, skipping a break after the last item (nothing to wrap onto).
  const breakPoints = new Set();
  if (breakAfter?.length) {
    let cumulative = 0;
    for (const size of breakAfter) {
      cumulative += size;
      if (cumulative < items.length) breakPoints.add(cumulative - 1);
    }
  }
  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, padding: "4px 2px 12px",
      }}
    >
      {items.map((it, idx) => {
        const isActive = it.id === activeId;
        const isDone = done.has(it.id) && !isActive;
        const Icon = it.icon;
        return (
          <Fragment key={it.id}>
          <button
            type="button"
            onClick={() => onSelect(it.id)}
            aria-current={isActive ? "step" : undefined}
            title={it.title}
            style={{
              flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6,
              cursor: "pointer", minHeight: 34, padding: "5px 11px 5px 7px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              fontFamily: FONTS.body,
              color: isActive ? "var(--header-ink)" : (isDone ? C.ink : C.slate),
              background: isActive ? "var(--header-bg)" : "transparent",
              border: `1px solid ${isActive ? "var(--header-bg)" : C.line}`,
              transition: "background .15s, color .15s, border-color .15s",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                fontFamily: FONTS.mono,
                color: isActive ? "var(--header-accent)" : (isDone ? "var(--surface)" : C.slate),
                background: isActive ? "color-mix(in srgb, var(--header-accent) 18%, transparent)" : (isDone ? C.viridian : "var(--track)"),
              }}
            >
              {Icon
                ? <Icon size={12} strokeWidth={2} />
                : (isDone ? <Check size={12} strokeWidth={2.5} /> : it.num)}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{it.title}</span>
          </button>
          {breakPoints.has(idx) && <span aria-hidden="true" style={{ flexBasis: "100%", width: 0, height: 0 }} />}
          </Fragment>
        );
      })}
    </nav>
  );
}
