import { C } from "../components/theme.js";

/**
 * Stepper — a reusable horizontal breadcrumb of numbered bubbles, used for BOTH the input
 * wizard and the report-section navigation. Every bubble is a real <button>, so jumps are
 * non-linear and the control is keyboard- and test-reachable.
 *
 * Props:
 *   items        — [{ id, num, title }]
 *   activeId     — id of the active bubble (ring + filled)
 *   completedIds — Set<string> | array of ids to mark visited (checkmark)
 *   onSelect     — (id: string) => void
 *   ariaLabel    — accessible label for the nav landmark (default "Steps")
 */
export function Stepper({ items, activeId, completedIds, onSelect, ariaLabel = "Steps" }) {
  const done = completedIds instanceof Set ? completedIds : new Set(completedIds || []);
  return (
    <nav
      aria-label={ariaLabel}
      style={{
        display: "flex", gap: 8, overflowX: "auto", padding: "4px 2px 10px",
        scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((it) => {
        const isActive = it.id === activeId;
        const isDone = done.has(it.id) && !isActive;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSelect(it.id)}
            aria-current={isActive ? "step" : undefined}
            title={it.title}
            style={{
              flex: "0 0 auto", scrollSnapAlign: "start", display: "inline-flex", alignItems: "center", gap: 7,
              cursor: "pointer", padding: "6px 12px 6px 8px", borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: isActive ? "#fff" : (isDone ? C.ink : C.slate),
              background: isActive ? C.ink : (isDone ? "#F1ECDD" : C.panel),
              border: `1px solid ${isActive ? C.ink : (isDone ? C.brass : C.line)}`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 999, fontSize: 11, fontWeight: 700,
                color: isActive ? C.ink : "#fff",
                background: isActive ? C.brass : (isDone ? C.viridian : C.mut),
              }}
            >
              {isDone ? "✓" : it.num}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{it.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
