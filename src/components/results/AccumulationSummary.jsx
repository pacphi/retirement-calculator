import { C, FIGURE, FONTS } from "../theme.js";
import { usd0 } from "../format.js";

/**
 * Accumulation summary card — working-years read-out, symmetric to Headline.
 * Shown only while yearsToRet > 0 (caller gates rendering).
 *
 * Rendered as a paper card with a brass ledger rule (the inverted pine panel is
 * reserved for the one pinned verdict), so the report page keeps a single focal
 * point.
 *
 * @param {{ accumulation: object, retYear: number }} props
 */
export function AccumulationSummary({ accumulation, retYear }) {
  const { totalContrib, totalGrowth, balAtRet, blendedReturn, workingYears } = accumulation;

  return (
    <div
      className="rc-stat"
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderTop: "3px double var(--accent)",
        borderRadius: 14,
        padding: "20px 24px",
        color: C.ink,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: C.brassDeep,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Accumulation through retirement ({workingYears} working year{workingYears !== 1 ? "s" : ""})
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ ...FIGURE, fontSize: 40, color: C.ink }}>{usd0(balAtRet)}</div>
        <div style={{ fontSize: 13, color: C.mut }}>at retirement · today's dollars</div>
      </div>

      <div style={{ marginTop: 8, fontSize: 13.5, color: C.slate }}>
        Projected balance at retirement around {retYear}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          fontSize: 13,
          color: C.slate,
          borderTop: `1px solid ${C.line}`,
          paddingTop: 10,
        }}
      >
        <div>
          <span style={{ color: C.brassDeep, fontWeight: 600 }}>Total contributed</span>
          <span style={{ marginLeft: 8, fontFamily: FONTS.mono, color: C.ink }}>
            {usd0(totalContrib)}
          </span>
        </div>
        <div>
          <span style={{ color: C.brassDeep, fontWeight: 600 }}>Total growth</span>
          <span style={{ marginLeft: 8, fontFamily: FONTS.mono, color: C.ink }}>
            {usd0(totalGrowth)}
          </span>
        </div>
        <div>
          <span style={{ color: C.brassDeep, fontWeight: 600 }}>Blended return</span>
          <span style={{ marginLeft: 8, fontFamily: FONTS.mono, color: C.ink }}>
            {(blendedReturn * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: C.mut, lineHeight: 1.55, maxWidth: "72ch" }}>
        Contributions and portfolio growth summed over years while at least one spouse is still working.
        Blended return is a geometric estimate over the accumulation period — not a guarantee.
      </div>
    </div>
  );
}
